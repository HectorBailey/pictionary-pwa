import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Turn, Stroke, SabotageType } from '../lib/types'
import { ALL_SABOTAGES } from '../lib/types'
import { getRandomWordOptions } from '../lib/words'

function randomSabotage(): SabotageType {
  return ALL_SABOTAGES[Math.floor(Math.random() * ALL_SABOTAGES.length)]
}

export function useTurn(gameId: string | undefined, userId: string | undefined) {
  const [turn, setTurn] = useState<Turn | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchTurn = useCallback(async () => {
    if (!gameId) return
    const { data } = await supabase
      .from('turns')
      .select('*')
      .eq('game_id', gameId)
      .order('turn_number', { ascending: false })
      .limit(1)
      .single()

    setTurn(data)
    setLoading(false)
  }, [gameId])

  useEffect(() => {
    fetchTurn()
  }, [fetchTurn])

  useEffect(() => {
    if (!gameId) return

    const channel = supabase
      .channel(`turn-${gameId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'turns',
        filter: `game_id=eq.${gameId}`,
      }, () => {
        fetchTurn()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, fetchTurn])

  const pickWord = async (word: string) => {
    if (!turn) return
    const { error } = await supabase
      .from('turns')
      .update({ word, phase: 'drawing' })
      .eq('id', turn.id)
    if (!error) await fetchTurn()
    return { error }
  }

  const generateWordOptions = async () => {
    if (!turn) return
    const isHardWord = turn.sabotage === 'hard_word'
    const options = getRandomWordOptions(3, isHardWord)
    const { error } = await supabase
      .from('turns')
      .update({ word_options: options })
      .eq('id', turn.id)
    if (!error) await fetchTurn()
    return { error }
  }

  const submitDrawing = async (strokes: Stroke[]) => {
    if (!turn) return
    const { error } = await supabase
      .from('turns')
      .update({ strokes, phase: 'guessing' })
      .eq('id', turn.id)
    if (!error) await fetchTurn()
    return { error }
  }

  // Sabotage flow:
  // - sabotage_target_id: player who has a pending sabotage against them
  // - When that player is the GUESSER, they see "deflect challenge"
  //   - If they guess <5s: sabotage deflects to the OTHER player (the drawer)
  //   - Otherwise: sabotage sticks, applies when target next draws
  // - When that player is the DRAWER and sabotage is set: they draw with the handicap

  const submitGuess = async (guess: string, elapsedSeconds?: number, duringAnimation?: boolean) => {
    if (!turn || !turn.word) return
    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '').trim()
    const correct = normalize(guess) === normalize(turn.word)
    const newGuesses = [...turn.guesses, guess]
    const remaining = turn.guesses_remaining - 1
    const isComplete = correct || remaining <= 0

    let guesserPts = 0
    let drawerPts = 0
    let triggersSabotage = false

    if (correct && elapsedSeconds != null) {
      if (elapsedSeconds < 5) {
        guesserPts = 15
        drawerPts = 10
        triggersSabotage = true
      } else if (duringAnimation || elapsedSeconds <= 10) {
        guesserPts = 15
        drawerPts = 10
      } else {
        guesserPts = 10
        drawerPts = 0
      }

      // Sabotage bonus: drawer gets +10 if drew under sabotage and guesser got it right
      if (turn.sabotage) {
        drawerPts += 10
      }
    }

    // Determine sabotage target for next turn
    // 1. Fresh sabotage trigger: target = the drawer of THIS turn
    // 2. Pending sabotage against the guesser who just guessed <5s: deflected to drawer
    // 3. Pending sabotage against the guesser who didn't guess <5s: carries forward (sticks)
    // 4. Pending sabotage against the drawer: already applied this turn, clear it
    let nextSabotageTarget: string | null = null

    if (correct) {
      const pendingTarget = turn.sabotage_target_id

      if (pendingTarget === turn.guesser_id) {
        // Guesser had a pending sabotage against them
        if (elapsedSeconds != null && elapsedSeconds < 5) {
          // Deflected! Bounce to the drawer instead
          nextSabotageTarget = turn.drawer_id
        } else {
          // Failed to deflect — sabotage sticks against guesser, carry forward
          nextSabotageTarget = turn.guesser_id
        }
      } else if (pendingTarget === turn.drawer_id && !turn.sabotage) {
        // Pending against drawer but wasn't applied yet (shouldn't happen normally), carry forward
        nextSabotageTarget = pendingTarget
      }
      // If sabotage was applied this turn (turn.sabotage is set), it's been used up — don't carry

      // Fresh sabotage trigger (only if no pending deflection shenanigans)
      if (triggersSabotage && !nextSabotageTarget) {
        nextSabotageTarget = turn.drawer_id
      }
    } else if (!correct && isComplete) {
      // Failed to guess — carry forward any pending sabotage
      nextSabotageTarget = turn.sabotage_target_id
    }

    const updateData: Record<string, unknown> = {
      guess,
      guesses: newGuesses,
      guesses_remaining: remaining,
      guessed_correctly: isComplete ? correct : null,
      phase: isComplete ? 'complete' : 'guessing',
    }

    if (isComplete && correct) {
      if (elapsedSeconds != null) updateData.guess_time_seconds = elapsedSeconds
      updateData.guesser_points = guesserPts
      updateData.drawer_points = drawerPts
      updateData.points = guesserPts
      updateData.triggers_sabotage = triggersSabotage
    }

    const { error } = await supabase
      .from('turns')
      .update(updateData)
      .eq('id', turn.id)
    if (!error) await fetchTurn()
    return { error, correct, remaining, nextSabotageTarget }
  }

  const giveUp = async () => {
    if (!turn) return
    const { error } = await supabase
      .from('turns')
      .update({
        guesses_remaining: 0,
        guessed_correctly: false,
        phase: 'complete',
      })
      .eq('id', turn.id)
    if (!error) await fetchTurn()
    return { error }
  }

  const createNextTurn = async () => {
    if (!turn || !userId || !gameId) return

    const nextDrawerId = turn.guesser_id
    const nextGuesserId = turn.drawer_id

    // Resolve sabotage for next turn
    // Check: is there a pending sabotage target? If the target is the next drawer, apply it.
    const pendingTarget = turn.sabotage_target_id

    // Fresh trigger from this turn
    const freshTarget = turn.triggers_sabotage ? turn.drawer_id : null

    // Figure out effective target — deflection may have happened
    // We look at whether the guesser (who had pending sabotage) guessed <5s
    let effectiveTarget = pendingTarget
    if (pendingTarget === turn.guesser_id && turn.guessed_correctly && turn.guess_time_seconds != null && turn.guess_time_seconds < 5) {
      // Deflected to drawer
      effectiveTarget = turn.drawer_id
    }
    // Fresh trigger
    if (!effectiveTarget && freshTarget) {
      effectiveTarget = freshTarget
    }
    // If guesser failed entirely, carry forward
    if (!turn.guessed_correctly && pendingTarget) {
      effectiveTarget = pendingTarget
    }

    // Apply sabotage if next drawer is the target
    let sabotage: SabotageType | null = null
    let carryTarget: string | null = null
    if (effectiveTarget && nextDrawerId === effectiveTarget) {
      sabotage = randomSabotage()
      // Sabotage applied, don't carry forward
    } else if (effectiveTarget) {
      // Target isn't drawing next, carry forward
      carryTarget = effectiveTarget
    }

    const { error } = await supabase
      .from('turns')
      .insert({
        game_id: gameId,
        turn_number: turn.turn_number + 1,
        drawer_id: nextDrawerId,
        guesser_id: nextGuesserId,
        word: null,
        word_options: [],
        strokes: [],
        guess: null,
        guesses: [],
        guesses_remaining: 3,
        guessed_correctly: null,
        phase: 'picking',
        sabotage,
        sabotage_target_id: carryTarget,
        triggers_sabotage: false,
        drawer_points: 0,
        guesser_points: 0,
      })
    if (!error) {
      // Clear strokes from the completed turn to save storage
      await supabase
        .from('turns')
        .update({ strokes: [], word_options: [] })
        .eq('id', turn.id)
      await fetchTurn()
    }
    return { error }
  }

  const isDrawer = turn?.drawer_id === userId
  const isGuesser = turn?.guesser_id === userId

  // Is there a pending sabotage against the current guesser?
  const guesserHasPendingSabotage = turn?.sabotage_target_id === turn?.guesser_id

  return {
    turn,
    loading,
    isDrawer,
    isGuesser,
    guesserHasPendingSabotage,
    pickWord,
    generateWordOptions,
    submitDrawing,
    submitGuess,
    giveUp,
    createNextTurn,
    refetch: fetchTurn,
  }
}
