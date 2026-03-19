import { useState } from 'react'
import type { Stroke } from '../lib/types'
import { DrawingPlayback } from './DrawingPlayback'

interface GuessInputProps {
  strokes: Stroke[]
  onGuess: (guess: string) => Promise<{ error?: unknown; correct?: boolean }>
}

export function GuessInput({ strokes, onGuess }: GuessInputProps) {
  const [guess, setGuess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guess.trim()) return
    setSubmitting(true)
    await onGuess(guess.trim())
    setSubmitting(false)
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="bg-slate-800 px-4 py-3 text-center border-b border-slate-700">
        <p className="text-lg font-bold text-white">What is this?</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <DrawingPlayback strokes={strokes} />
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-slate-800 space-y-3">
        <input
          type="text"
          placeholder="Type your guess..."
          value={guess}
          onChange={e => setGuess(e.target.value)}
          autoFocus
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={submitting || !guess.trim()}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
        >
          {submitting ? 'Checking...' : 'Guess'}
        </button>
      </form>
    </div>
  )
}
