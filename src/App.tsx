import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useProfile } from './hooks/useProfile'
import { useGames } from './hooks/useGames'
import { AuthScreen } from './components/AuthScreen'
import { UsernameSetup } from './components/UsernameSetup'
import { GameList } from './components/GameList'
import { GameScreen } from './components/GameScreen'

export default function App() {
  const { user, loading: authLoading, sendOtp, verifyOtp, signOut } = useAuth()
  const { profile, loading: profileLoading, setUsername, needsUsername } = useProfile(user?.id)
  const { games, createGame, refetch, requestNotificationPermission } = useGames(user?.id)

  // Request notification permission on first load
  useEffect(() => {
    if (user) requestNotificationPermission()
  }, [user, requestNotificationPermission])

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <AuthScreen onSendOtp={sendOtp} onVerifyOtp={verifyOtp} />
  }

  if (needsUsername) {
    return <UsernameSetup onSetUsername={setUsername} />
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <GameList
            games={games}
            profile={profile}
            userId={user.id}
            onCreateGame={createGame}
            onSignOut={signOut}
            onRefresh={refetch}
          />
        }
      />
      <Route
        path="/game/:gameId"
        element={<GameScreen userId={user.id} />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
