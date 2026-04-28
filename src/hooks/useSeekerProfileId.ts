import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

/**
 * Returns the current seeker's seeker_profiles.id.
 *
 * - Returns null while loading or when the user is not signed in
 * - Returns null if the user is signed in but has no seeker_profile row
 *   (e.g. employer-role users)
 * - Re-fetches when session.user.id changes
 */
export function useSeekerProfileId(): string | null {
  const { session } = useAuth()
  const [seekerProfileId, setSeekerProfileId] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.user?.id) {
      setSeekerProfileId(null)
      return
    }
    let cancelled = false
    supabase
      .from('seeker_profiles')
      .select('id')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('useSeekerProfileId: lookup failed', error)
          setSeekerProfileId(null)
          return
        }
        setSeekerProfileId(data?.id ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [session?.user?.id])

  return seekerProfileId
}
