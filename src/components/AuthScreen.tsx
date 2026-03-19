import { useState } from 'react'

interface AuthScreenProps {
  onSendOtp: (email: string) => Promise<{ error: unknown }>
  onVerifyOtp: (email: string, token: string) => Promise<{ error: unknown }>
}

export function AuthScreen({ onSendOtp, onVerifyOtp }: AuthScreenProps) {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSending(true)
    const { error } = await onSendOtp(email)
    setSending(false)
    if (error) {
      setError(String(error))
    } else {
      setStep('otp')
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSending(true)
    const { error } = await onVerifyOtp(email, otp)
    setSending(false)
    if (error) {
      setError(String(error))
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white tracking-tight">Pictionary</h1>
          <p className="mt-2 text-slate-400">Draw and guess with your partner</p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={sending}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
            >
              {sending ? 'Sending...' : 'Send login code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-sm text-slate-400 text-center">
              Check your email for a 6-digit code
            </p>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter code"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              required
              autoFocus
              maxLength={6}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-center text-2xl tracking-[0.5em] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={sending}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
            >
              {sending ? 'Verifying...' : 'Log in'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('email'); setOtp(''); setError('') }}
              className="w-full py-2 text-slate-400 hover:text-white text-sm transition-colors"
            >
              Use a different email
            </button>
          </form>
        )}

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}
      </div>
    </div>
  )
}
