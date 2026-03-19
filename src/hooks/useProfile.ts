import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const setUsername = async (username: string) => {
    if (!userId) return { error: new Error('Not logged in') }
    const { error } = await supabase
      .from('profiles')
      .update({ username, display_name: username })
      .eq('id', userId)
    if (!error) {
      setProfile(prev => prev ? { ...prev, username, display_name: username } : null)
    }
    return { error }
  }

  const needsUsername = !loading && profile && !profile.username

  return { profile, loading, setUsername, needsUsername, refetch: fetchProfile }
}
