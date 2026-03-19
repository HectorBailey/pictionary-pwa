import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Turn, Stroke } from '../lib/types'
import { getRandomWordOptions } from '../lib/words'

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

  // Realtime subscription for turn changes
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
    const options = getRandomWordOptions(3)
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

  const submitGuess = async (guess: string) => {
    if (!turn || !turn.word) return
    const correct = guess.toLowerCase().trim() === turn.word.toLowerCase().trim()
    const { error } = await supabase
      .from('turns')
      .update({
        guess,
        guessed_correctly: correct,
        phase: 'complete',
      })
      .eq('id', turn.id)
    if (!error) await fetchTurn()
    return { error, correct }
  }

  const createNextTurn = async () => {
    if (!turn || !userId || !gameId) return
    // Swap drawer and guesser
    const { error } = await supabase
      .from('turns')
      .insert({
        game_id: gameId,
        turn_number: turn.turn_number + 1,
        drawer_id: turn.guesser_id,
        guesser_id: turn.drawer_id,
        word: null,
        word_options: [],
        strokes: [],
        guess: null,
        guessed_correctly: null,
        phase: 'picking',
      })
    if (!error) await fetchTurn()
    return { error }
  }

  const isDrawer = turn?.drawer_id === userId
  const isGuesser = turn?.guesser_id === userId

  return {
    turn,
    loading,
    isDrawer,
    isGuesser,
    pickWord,
    generateWordOptions,
    submitDrawing,
    submitGuess,
    createNextTurn,
    refetch: fetchTurn,
  }
}
