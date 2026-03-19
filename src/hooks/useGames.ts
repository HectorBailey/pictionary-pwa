import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Game, Turn } from '../lib/types'

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
      // Fetch latest turn for each game
      const gameIds = data.map(g => g.id)
      const { data: turns } = await supabase
        .from('turns')
        .select('*')
        .in('game_id', gameIds)
        .order('turn_number', { ascending: false })

      const latestTurnByGame = new Map<string, Turn>()
      for (const turn of (turns ?? [])) {
        if (!latestTurnByGame.has(turn.game_id)) {
          latestTurnByGame.set(turn.game_id, turn)
        }
      }

      const gamesWithTurns = data.map(game => ({
        ...game,
        latest_turn: latestTurnByGame.get(game.id) ?? undefined,
      }))
      setGames(gamesWithTurns)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchGames()
  }, [fetchGames])

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

  const createGame = async (opponentEmojiCode: string) => {
    if (!userId) return { error: new Error('Not logged in') }

    // Find opponent by emoji code
    const { data: opponent, error: findError } = await supabase
      .from('profiles')
      .select('id')
      .eq('emoji_code', opponentEmojiCode)
      .single()

    if (findError || !opponent) {
      return { error: new Error('No player found with that emoji code') }
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

    // Create first turn - game creator draws first
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
        guessed_correctly: null,
        phase: 'picking',
      })

    if (turnError) return { error: turnError }

    await fetchGames()
    return { error: null, gameId: game.id }
  }

  return { games, loading, createGame, refetch: fetchGames }
}
