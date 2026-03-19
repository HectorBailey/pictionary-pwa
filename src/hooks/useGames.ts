import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Game, Turn, GameScores } from '../lib/types'

function notifyYourTurn(opponentName: string) {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  if (document.visibilityState === 'visible') return

  new Notification('Sketchy', {
    body: `${opponentName} has taken their turn!`,
    icon: '/sketchy/icon-192.png',
  })
}

export function useGames(userId: string | undefined) {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  const fetchGames = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('games')
      .select(`
        *,
        player1:profiles!games_player1_id_fkey(*),
        player2:profiles!games_player2_id_fkey(*)
      `)
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (data) {
      const gameIds = data.map(g => g.id)
      // Fetch all turns for score calculation + latest turn
      const { data: turns } = await supabase
        .from('turns')
        .select('*')
        .in('game_id', gameIds)
        .order('turn_number', { ascending: false })

      const latestTurnByGame = new Map<string, Turn>()
      const scoresByGame = new Map<string, GameScores>()

      for (const turn of (turns ?? [])) {
        if (!latestTurnByGame.has(turn.game_id)) {
          latestTurnByGame.set(turn.game_id, turn)
        }
        // Tally scores - both drawer and guesser can earn points
        if (turn.phase === 'complete') {
          const scores = scoresByGame.get(turn.game_id) ?? { player1_wins: 0, player2_wins: 0 }
          const game = data.find(g => g.id === turn.game_id)
          const gPts = turn.guesser_points || 0
          const dPts = turn.drawer_points || 0
          if (game) {
            if (turn.guesser_id === game.player1_id) {
              scores.player1_wins += gPts
              scores.player2_wins += dPts
            } else {
              scores.player2_wins += gPts
              scores.player1_wins += dPts
            }
            scoresByGame.set(turn.game_id, scores)
          }
        }
      }

      const gamesWithTurns = data.map(game => ({
        ...game,
        latest_turn: latestTurnByGame.get(game.id) ?? undefined,
        scores: scoresByGame.get(game.id) ?? { player1_wins: 0, player2_wins: 0 },
      }))
      setGames(gamesWithTurns)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchGames()
  }, [fetchGames])

  // Track previous "your turn" state for notifications
  const prevYourTurnIds = useRef<Set<string>>(new Set())

  const checkForNotifications = useCallback((newGames: Game[]) => {
    const newYourTurnIds = new Set<string>()
    for (const game of newGames) {
      const turn = game.latest_turn
      if (!turn || turn.phase === 'complete') continue
      const isYourTurn =
        ((turn.phase === 'picking' || turn.phase === 'drawing') && turn.drawer_id === userId) ||
        (turn.phase === 'guessing' && turn.guesser_id === userId)
      if (isYourTurn) {
        newYourTurnIds.add(game.id)
        if (!prevYourTurnIds.current.has(game.id)) {
          const opponent = game.player1_id === userId ? game.player2 : game.player1
          notifyYourTurn(opponent?.username || opponent?.display_name || 'Your partner')
        }
      }
    }
    prevYourTurnIds.current = newYourTurnIds
  }, [userId])

  // Realtime subscription for games
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('games-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'games',
      }, () => {
        fetchGames()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'turns',
      }, () => {
        fetchGames()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, fetchGames])

  // Refetch when app comes back to foreground
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchGames()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetchGames])

  // Trigger notifications when games change
  useEffect(() => {
    checkForNotifications(games)
  }, [games, checkForNotifications])

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  const createGame = async (joinCode: string) => {
    if (!userId) return { error: new Error('Not logged in') }

    // Find opponent by join code
    const { data: opponent, error: findError } = await supabase
      .from('profiles')
      .select('id')
      .eq('join_code', joinCode.toUpperCase().trim())
      .single()

    if (findError || !opponent) {
      return { error: new Error('No player found with that join code') }
    }

    if (opponent.id === userId) {
      return { error: new Error("You can't play against yourself!") }
    }

    // Check for existing active game between these players
    const { data: existing } = await supabase
      .from('games')
      .select('id')
      .eq('status', 'active')
      .or(
        `and(player1_id.eq.${userId},player2_id.eq.${opponent.id}),and(player1_id.eq.${opponent.id},player2_id.eq.${userId})`
      )

    if (existing && existing.length > 0) {
      return { error: new Error('You already have an active game with this player') }
    }

    // Create game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({ player1_id: userId, player2_id: opponent.id, status: 'active' })
      .select()
      .single()

    if (gameError) return { error: gameError }

    // Create first turn
    const { error: turnError } = await supabase
      .from('turns')
      .insert({
        game_id: game.id,
        turn_number: 1,
        drawer_id: userId,
        guesser_id: opponent.id,
        word: null,
        word_options: [],
        strokes: [],
        guess: null,
        guesses: [],
        guesses_remaining: 3,
        guessed_correctly: null,
        phase: 'picking',
      })

    if (turnError) return { error: turnError }

    await fetchGames()
    return { error: null, gameId: game.id }
  }

  return { games, loading, createGame, refetch: fetchGames, requestNotificationPermission }
}
