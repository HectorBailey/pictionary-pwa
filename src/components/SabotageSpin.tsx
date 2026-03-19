import { useState, useEffect } from 'react'
import { ALL_SABOTAGES, SABOTAGE_LABELS, SABOTAGE_DESCRIPTIONS } from '../lib/types'
import type { SabotageType } from '../lib/types'

interface SabotageSpinProps {
  result: SabotageType
  onDone: () => void
}

export function SabotageSpin({ result, onDone }: SabotageSpinProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [spinning, setSpinning] = useState(true)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!spinning) return

    // Fast spin for ~1.5s, then decelerate and land in ~0.5s
    const baseSpeed = 60 // ms between ticks
    const slowAfter = 1500

    const delay = elapsed < slowAfter
      ? baseSpeed
      : baseSpeed + (elapsed - slowAfter) * 0.8

    if (delay > 350) {
      setSpinning(false)
      setCurrentIndex(ALL_SABOTAGES.indexOf(result))
      return
    }

    const timer = setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % ALL_SABOTAGES.length)
      setElapsed(prev => prev + delay)
    }, delay)

    return () => clearTimeout(timer)
  }, [spinning, currentIndex, elapsed, result])

  const current = ALL_SABOTAGES[currentIndex]

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-sm text-center space-y-6">
        <p className="text-red-400 text-sm font-bold uppercase tracking-widest">
          Sabotaged!
        </p>

        <div className={`py-6 rounded-xl transition-colors ${spinning ? 'bg-slate-700' : 'bg-red-900/40 border border-red-500/50'}`}>
          <p className="text-3xl font-bold text-white">
            {SABOTAGE_LABELS[current]}
          </p>
          {!spinning && (
            <p className="text-slate-400 text-sm mt-2">
              {SABOTAGE_DESCRIPTIONS[current]}
            </p>
          )}
        </div>

        {!spinning && (
          <button
            onClick={onDone}
            autoFocus
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors"
          >
            Got it
          </button>
        )}
      </div>
    </div>
  )
}
