import { useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTurn } from '../hooks/useTurn'
import { WordPicker } from './WordPicker'
import { DrawingCanvas } from './DrawingCanvas'
import { GuessInput } from './GuessInput'
import { DrawingPlayback } from './DrawingPlayback'

interface GameScreenProps {
  userId: string
}

export function GameScreen({ userId }: GameScreenProps) {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const {
    turn, loading, isDrawer, isGuesser,
    pickWord, generateWordOptions, submitDrawing, submitGuess, createNextTurn,
  } = useTurn(gameId, userId)

  const handleGenerateOptions = useCallback(() => {
    generateWordOptions()
  }, [generateWordOptions])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }

  if (!turn) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-900 gap-4">
        <p className="text-slate-400">Turn not found</p>
        <button onClick={() => navigate('/')} className="text-indigo-400 hover:text-indigo-300">
          Back to games
        </button>
      </div>
    )
  }

  // Back button header wrapper
  const withHeader = (content: React.ReactNode, title?: string) => (
    <div className="flex flex-col h-full">
      <div className="bg-slate-900 px-4 py-3 flex items-center gap-3 border-b border-slate-800">
        <button
          onClick={() => navigate('/')}
          className="text-slate-400 hover:text-white transition-colors"
        >
          &larr; Back
        </button>
        {title && <span className="text-slate-500 text-sm">{title}</span>}
      </div>
      <div className="flex-1 min-h-0">{content}</div>
    </div>
  )

  // DRAWER flow
  if (isDrawer) {
    if (turn.phase === 'picking') {
      return withHeader(
        <WordPicker
          options={turn.word_options}
          onPick={pickWord}
          onGenerateOptions={handleGenerateOptions}
        />,
        'Your turn to draw'
      )
    }

    if (turn.phase === 'drawing') {
      return withHeader(
        <DrawingCanvas word={turn.word!} onSubmit={submitDrawing} />,
        'Drawing'
      )
    }

    // Drawing submitted, waiting for guesser
    if (turn.phase === 'guessing') {
      return withHeader(
        <div className="flex flex-col items-center justify-center h-full bg-slate-900 gap-4 px-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">Drawing sent!</p>
            <p className="text-slate-400 mt-2">Waiting for them to guess...</p>
            <p className="text-slate-500 mt-1 text-sm">Word: {turn.word}</p>
          </div>
          <div className="w-full max-w-sm">
            <DrawingPlayback strokes={turn.strokes} />
          </div>
        </div>,
        'Waiting'
      )
    }
  }

  // GUESSER flow
  if (isGuesser) {
    if (turn.phase === 'picking' || turn.phase === 'drawing') {
      return withHeader(
        <div className="flex flex-col items-center justify-center h-full bg-slate-900 gap-2">
          <p className="text-2xl font-bold text-white">Their turn to draw</p>
          <p className="text-slate-400">Waiting for the drawing...</p>
        </div>,
        'Waiting'
      )
    }

    if (turn.phase === 'guessing') {
      return withHeader(
        <GuessInput
          strokes={turn.strokes}
          onGuess={async (guess) => {
            const result = await submitGuess(guess)
            return { error: result?.error, correct: result?.correct }
          }}
        />,
        'Your turn to guess'
      )
    }
  }

  // COMPLETE phase - both players see result
  if (turn.phase === 'complete') {
    return withHeader(
      <div className="flex flex-col items-center justify-center h-full bg-slate-900 gap-6 px-4">
        <div className="text-center">
          {turn.guessed_correctly ? (
            <>
              <p className="text-5xl mb-4">&#127881;</p>
              <p className="text-2xl font-bold text-green-400">Correct!</p>
            </>
          ) : (
            <>
              <p className="text-5xl mb-4">&#128533;</p>
              <p className="text-2xl font-bold text-red-400">Not quite</p>
            </>
          )}
          <p className="text-slate-400 mt-2">
            The word was <span className="text-white font-medium">{turn.word}</span>
          </p>
          {turn.guess && (
            <p className="text-slate-500 mt-1">
              Guessed: <span className="text-slate-300">{turn.guess}</span>
            </p>
          )}
        </div>

        <div className="w-full max-w-sm">
          <DrawingPlayback strokes={turn.strokes} />
        </div>

        <button
          onClick={createNextTurn}
          className="w-full max-w-sm py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors"
        >
          Next turn
        </button>
      </div>,
      `Turn ${turn.turn_number}`
    )
  }

  return null
}
