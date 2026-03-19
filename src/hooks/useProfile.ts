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

  const updateDisplayName = async (displayName: string) => {
    if (!userId) return
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', userId)
    if (!error) {
      setProfile(prev => prev ? { ...prev, display_name: displayName } : null)
    }
    return { error }
  }

  return { profile, loading, updateDisplayName, refetch: fetchProfile }
}
