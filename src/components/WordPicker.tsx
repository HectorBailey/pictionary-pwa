import { useEffect } from 'react'

interface WordPickerProps {
  options: string[]
  onPick: (word: string) => void
  onGenerateOptions: () => void
}

export function WordPicker({ options, onPick, onGenerateOptions }: WordPickerProps) {
  useEffect(() => {
    if (options.length === 0) {
      onGenerateOptions()
    }
  }, [options.length, onGenerateOptions])

  if (options.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900">
        <p className="text-slate-400">Loading words...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-900 px-4 gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Pick a word to draw</h2>
        <p className="text-slate-400 mt-1">Choose one of these three options</p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        {options.map(word => (
          <button
            key={word}
            onClick={() => onPick(word)}
            className="w-full py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-indigo-500 text-white text-lg font-medium rounded-xl transition-all"
          >
            {word}
          </button>
        ))}
      </div>
    </div>
  )
}
