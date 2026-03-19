import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Game, Profile } from '../lib/types'
import { NewGameDialog } from './NewGameDialog'

interface GameListProps {
  games: Game[]
  profile: Profile | null
  userId: string
  onCreateGame: (joinCode: string) => Promise<{ error: Error | null; gameId?: string }>
  onSignOut: () => void
  onRefresh: () => Promise<void>
}

export function GameList({ games, profile, userId, onCreateGame, onSignOut, onRefresh }: GameListProps) {
  const [showNewGame, setShowNewGame] = useState(false)
  const [pulling, setPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const PULL_THRESHOLD = 80

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY
      setPulling(true)
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling) return
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.5, 120))
    }
  }, [pulling])

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= PULL_THRESHOLD) {
      setRefreshing(true)
      await onRefresh()
      setRefreshing(false)
    }
    setPulling(false)
    setPullDistance(0)
  }, [pullDistance, onRefresh])
  const [copied, setCopied] = useState(false)
  const navigate = useNavigate()

  const copyJoinCode = () => {
    if (!profile) return
    navigator.clipboard.writeText(profile.join_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getOpponent = (game: Game): Profile | undefined => {
    return game.player1_id === userId ? game.player2 : game.player1
  }

  const getMyScore = (game: Game): number => {
    if (!game.scores) return 0
    return game.player1_id === userId ? game.scores.player1_wins : game.scores.player2_wins
  }

  const getTheirScore = (game: Game): number => {
    if (!game.scores) return 0
    return game.player1_id === userId ? game.scores.player2_wins : game.scores.player1_wins
  }

  const isYourTurn = (game: Game): boolean => {
    const turn = game.latest_turn
    if (!turn) return false
    if (turn.phase === 'complete') return false
    if ((turn.phase === 'picking' || turn.phase === 'drawing') && turn.drawer_id === userId) return true
    if (turn.phase === 'guessing' && turn.guesser_id === userId) return true
    return false
  }

  const getTurnLabel = (game: Game): string => {
    const turn = game.latest_turn
    if (!turn) return ''
    if (turn.phase === 'complete') {
      return turn.guessed_correctly ? 'Guessed it!' : 'Not quite...'
    }
    if (isYourTurn(game)) {
      if (turn.phase === 'picking') return 'Pick a word'
      if (turn.phase === 'drawing') return 'Your turn to draw'
      if (turn.phase === 'guessing') return 'Your turn to guess'
    }
    return 'Waiting for them...'
  }

  return (
    <div
      ref={scrollRef}
      className="min-h-full bg-slate-900 overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div
          className="flex items-center justify-center text-slate-400 text-sm transition-all overflow-hidden"
          style={{ height: refreshing ? 40 : pullDistance }}
        >
          {refreshing ? 'Refreshing...' : pullDistance >= PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-white">Sketchy</h1>
          <button
            onClick={onSignOut}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Profile card */}
        {profile && (
          <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{profile.username || profile.display_name}</p>
                <p className="text-slate-400 text-sm">Join code</p>
              </div>
              <button
                onClick={copyJoinCode}
                className="font-mono text-lg bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-xl transition-colors text-white tracking-wider"
              >
                {copied ? 'Copied!' : profile.join_code}
              </button>
            </div>
            <p className="text-xs text-slate-500">Share your join code so others can start a game with you</p>
          </div>
        )}

        {/* New game button */}
        <button
          onClick={() => setShowNewGame(true)}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors"
        >
          New game
        </button>

        {/* Game list */}
        {games.length === 0 ? (
          <p className="text-center text-slate-500 py-8">
            No games yet. Start one by sharing your join code!
          </p>
        ) : (
          <div className="space-y-2">
            {games.map(game => {
              const opponent = getOpponent(game)
              const yourTurn = isYourTurn(game)
              const myScore = getMyScore(game)
              const theirScore = getTheirScore(game)
              return (
                <button
                  key={game.id}
                  onClick={() => navigate(`/game/${game.id}`)}
                  className="w-full bg-slate-800 hover:bg-slate-750 rounded-2xl p-4 flex items-center gap-4 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {opponent?.username || opponent?.display_name || 'Unknown'}
                    </p>
                    <p className={`text-sm ${yourTurn ? 'text-indigo-400 font-medium' : 'text-slate-400'}`}>
                      {getTurnLabel(game)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono text-white">
                      <span className="text-green-400">{myScore}</span>
                      <span className="text-slate-500"> - </span>
                      <span className="text-red-400">{theirScore}</span>
                    </p>
                  </div>
                  {yourTurn && (
                    <div className="w-3 h-3 bg-indigo-500 rounded-full shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {showNewGame && (
        <NewGameDialog
          onClose={() => setShowNewGame(false)}
          onCreateGame={async (code) => {
            const result = await onCreateGame(code)
            if (!result.error && result.gameId) {
              setShowNewGame(false)
              navigate(`/game/${result.gameId}`)
            }
            return result
          }}
        />
      )}
    </div>
  )
}
