import { useState, useEffect, useRef, useCallback } from 'react'
import type { Stroke } from '../lib/types'
import { DrawingPlayback } from './DrawingPlayback'

interface GuessInputProps {
  strokes: Stroke[]
  guesses: string[]
  guessesRemaining: number
  hasPendingSabotage: boolean
  onGuess: (guess: string, elapsedSeconds: number, duringAnimation: boolean) => Promise<{ error?: unknown; correct?: boolean; remaining?: number }>
  onTimeUp: () => void
}

const TIMER_SECONDS = 60

export function GuessInput({ strokes, guesses, guessesRemaining, hasPendingSabotage, onGuess, onTimeUp }: GuessInputProps) {
  const [guess, setGuess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [wrongGuesses, setWrongGuesses] = useState<string[]>(guesses)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [timerActive, setTimerActive] = useState(false)
  const [animationDone, setAnimationDone] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(Date.now())

  const getElapsed = () => {
    return Math.round((Date.now() - startTimeRef.current) / 100) / 10
  }

  const handleAnimationComplete = useCallback(() => {
    setAnimationDone(true)
    setSecondsLeft(TIMER_SECONDS)
    setTimerActive(true)
  }, [])

  // Countdown (only starts after animation)
  useEffect(() => {
    if (!timerActive) return
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          onTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [timerActive, onTimeUp])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guess.trim() || guessesRemaining <= 0) return
    setSubmitting(true)
    const elapsed = getElapsed()
    const result = await onGuess(guess.trim(), elapsed, !animationDone)
    setSubmitting(false)
    if (!result.correct) {
      setWrongGuesses(prev => [...prev, guess.trim()])
      setGuess('')
    }
  }

  const timerColor = secondsLeft !== null && secondsLeft <= 10
    ? 'text-red-400'
    : secondsLeft !== null && secondsLeft <= 30
    ? 'text-yellow-400'
    : 'text-slate-400'

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {hasPendingSabotage && (
        <div className="bg-red-900/40 border-b border-red-500/30 px-4 py-2 text-center">
          <p className="text-red-400 text-sm font-bold">Sabotage incoming! Guess under 5s to deflect it back!</p>
        </div>
      )}
      <div className="bg-slate-800 px-4 py-3 flex items-center justify-between border-b border-slate-700">
        <p className="text-lg font-bold text-white">What is this?</p>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">
            {guessesRemaining} guess{guessesRemaining !== 1 ? 'es' : ''} left
          </span>
          {!animationDone && (
            <span className="text-sm font-medium text-yellow-400">2x</span>
          )}
          {secondsLeft !== null && (
            <span className={`text-sm font-mono font-bold ${timerColor}`}>
              {secondsLeft}s
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <DrawingPlayback strokes={strokes} onAnimationComplete={handleAnimationComplete} />
      </div>

      {/* Previous wrong guesses */}
      {wrongGuesses.length > 0 && (
        <div className="px-4 flex gap-2 flex-wrap">
          {wrongGuesses.map((g, i) => (
            <span key={i} className="text-sm bg-red-900/30 text-red-400 px-3 py-1 rounded-full line-through">
              {g}
            </span>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-slate-800 space-y-3">
        <input
          type="text"
          placeholder={guessesRemaining > 0 ? 'Type your guess...' : 'No guesses left'}
          value={guess}
          onChange={e => setGuess(e.target.value)}
          disabled={guessesRemaining <= 0 || secondsLeft === 0}
          autoFocus
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={submitting || !guess.trim() || guessesRemaining <= 0 || secondsLeft === 0}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
        >
          {submitting ? 'Checking...' : `Guess (${guessesRemaining} left)`}
        </button>
      </form>
    </div>
  )
}
