import { useState } from 'react'

interface UsernameSetupProps {
  onSetUsername: (username: string) => Promise<{ error: unknown }>
}

export function UsernameSetup({ onSetUsername }: UsernameSetupProps) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = username.trim()
    if (!name) return
    if (name.length < 2) {
      setError('Username must be at least 2 characters')
      return
    }

    setError('')
    setSaving(true)
    const { error } = await onSetUsername(name)
    setSaving(false)
    if (error) {
      setError(String(error))
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white tracking-tight">Welcome!</h1>
          <p className="mt-2 text-slate-400">Pick a username to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            autoFocus
            maxLength={20}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={saving || !username.trim()}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
          >
            {saving ? 'Saving...' : 'Continue'}
          </button>
        </form>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}
      </div>
    </div>
  )
}
