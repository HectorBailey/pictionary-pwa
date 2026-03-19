import { useEffect, useState } from 'react'

interface WordPickerProps {
  options: string[]
  onPick: (word: string) => void
  onGenerateOptions: () => void
}

export function WordPicker({ options, onPick, onGenerateOptions }: WordPickerProps) {
  const [customWord, setCustomWord] = useState('')
  const [showCustom, setShowCustom] = useState(false)

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

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const word = customWord.trim().toLowerCase()
    if (word) onPick(word)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-900 px-4 gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Pick a word to draw</h2>
        <p className="text-slate-400 mt-1">Choose one or write your own</p>
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

        {showCustom ? (
          <form onSubmit={handleCustomSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Your word..."
              value={customWord}
              onChange={e => setCustomWord(e.target.value)}
              autoFocus
              maxLength={30}
              className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!customWord.trim()}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
            >
              Go
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowCustom(true)}
            className="w-full py-4 border border-dashed border-slate-600 hover:border-indigo-500 text-slate-400 hover:text-white text-lg rounded-xl transition-all"
          >
            Write your own...
          </button>
        )}
      </div>
    </div>
  )
}
