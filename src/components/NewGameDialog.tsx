import { useState } from 'react'

interface NewGameDialogProps {
  onClose: () => void
  onCreateGame: (emojiCode: string) => Promise<{ error: Error | null }>
}

export function NewGameDialog({ onClose, onCreateGame }: NewGameDialogProps) {
  const [emojiCode, setEmojiCode] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = emojiCode.trim()
    if (!code) return

    setError('')
    setCreating(true)
    const { error } = await onCreateGame(code)
    setCreating(false)
    if (error) {
      setError(error.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
        <h2 className="text-xl font-bold text-white">New game</h2>
        <p className="text-sm text-slate-400">
          Enter your partner's emoji code to start a game
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Paste emoji code"
            value={emojiCode}
            onChange={e => setEmojiCode(e.target.value)}
            required
            autoFocus
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-center text-2xl placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !emojiCode.trim()}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
            >
              {creating ? 'Creating...' : 'Start'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
