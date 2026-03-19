import { useCallback, useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTurn } from '../hooks/useTurn'
import { SABOTAGE_LABELS } from '../lib/types'
import { WordPicker } from './WordPicker'
import { DrawingCanvas } from './DrawingCanvas'
import { GuessInput } from './GuessInput'
import { DrawingPlayback } from './DrawingPlayback'
import { SabotageSpin } from './SabotageSpin'

interface GameScreenProps {
  userId: string
}

export function GameScreen({ userId }: GameScreenProps) {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const {
    turn, loading, isDrawer, isGuesser, guesserHasPendingSabotage,
    pickWord, generateWordOptions, submitDrawing, submitGuess, giveUp, createNextTurn,
  } = useTurn(gameId, userId)
  const [showSabotageSpin, setShowSabotageSpin] = useState(true)
  const lastSeenTurnId = useRef<string | null>(null)

  // Reset sabotage spin when turn changes
  useEffect(() => {
    if (turn && turn.id !== lastSeenTurnId.current) {
      lastSeenTurnId.current = turn.id
      setShowSabotageSpin(true)
    }
  }, [turn])

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

  // Show sabotage spin when drawer first sees a sabotaged turn
  if (isDrawer && turn.sabotage && turn.phase === 'picking' && showSabotageSpin) {
    return (
      <SabotageSpin
        result={turn.sabotage}
        onDone={() => setShowSabotageSpin(false)}
      />
    )
  }

  // DRAWER flow
  if (isDrawer) {
    if (turn.phase === 'picking') {
      return withHeader(
        <WordPicker
          options={turn.word_options}
          onPick={pickWord}
          onGenerateOptions={handleGenerateOptions}
        />,
        turn.sabotage ? `Your turn — ${SABOTAGE_LABELS[turn.sabotage]}` : 'Your turn to draw'
      )
    }

    if (turn.phase === 'drawing') {
      return withHeader(
        <DrawingCanvas word={turn.word!} onSubmit={submitDrawing} sabotage={turn.sabotage} />,
        turn.sabotage ? SABOTAGE_LABELS[turn.sabotage] : 'Drawing'
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
            {turn.sabotage && (
              <p className="text-red-400 text-xs mt-1">Sabotaged: {SABOTAGE_LABELS[turn.sabotage]}</p>
            )}
            {turn.guesses.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-slate-500 text-xs">Their guesses so far:</p>
                {turn.guesses.map((g, i) => (
                  <span key={i} className="inline-block text-sm bg-red-900/30 text-red-400 px-3 py-1 rounded-full mx-1">
                    {g}
                  </span>
                ))}
              </div>
            )}
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
          guesses={turn.guesses}
          guessesRemaining={turn.guesses_remaining}
          hasPendingSabotage={guesserHasPendingSabotage}
          onGuess={async (guess, elapsedSeconds, duringAnimation) => {
            const result = await submitGuess(guess, elapsedSeconds, duringAnimation)
            return { error: result?.error, correct: result?.correct, remaining: result?.remaining }
          }}
          onTimeUp={giveUp}
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
          {turn.guessed_correctly && turn.guess_time_seconds != null && (
            <p className="text-indigo-400 mt-1 text-sm font-medium">
              Guessed in {turn.guess_time_seconds}s
              {turn.guesses.length > 1 && ` (${turn.guesses.length} attempts)`}
            </p>
          )}
          {/* Points breakdown */}
          {turn.guessed_correctly && (
            <div className="mt-3 flex gap-4 justify-center text-sm">
              <span className="text-green-400">
                Guesser: +{turn.guesser_points}
              </span>
              <span className={turn.drawer_points > 0 ? 'text-green-400' : 'text-slate-500'}>
                Drawer: +{turn.drawer_points}
                {turn.sabotage && turn.drawer_points > 0 && ' (sabotage bonus!)'}
              </span>
            </div>
          )}
          {turn.triggers_sabotage && !turn.sabotage_target_id && (
            <p className="text-red-400 mt-2 text-sm font-bold">
              Sabotage triggered!
            </p>
          )}
          {turn.sabotage_target_id && turn.guessed_correctly && turn.guess_time_seconds != null && turn.guess_time_seconds < 5 && turn.sabotage_target_id === turn.guesser_id && (
            <p className="text-yellow-400 mt-2 text-sm font-bold">
              Sabotage deflected!
            </p>
          )}
          {turn.sabotage_target_id && turn.sabotage_target_id === turn.guesser_id && (!turn.guessed_correctly || (turn.guess_time_seconds != null && turn.guess_time_seconds >= 5)) && (
            <p className="text-red-400 mt-2 text-sm font-bold">
              Failed to deflect — sabotage incoming!
            </p>
          )}
          {turn.guesses.length > 0 && (
            <div className="mt-2 flex gap-2 flex-wrap justify-center">
              {turn.guesses.map((g, i) => (
                <span key={i} className={`text-sm px-3 py-1 rounded-full ${
                  g.toLowerCase().trim() === turn.word?.toLowerCase().trim()
                    ? 'bg-green-900/30 text-green-400'
                    : 'bg-red-900/30 text-red-400 line-through'
                }`}>
                  {g}
                </span>
              ))}
            </div>
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
