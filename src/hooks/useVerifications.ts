import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { EmployerVerification, TrustLevel } from '@/types/domain'

interface UseVerificationsReturn {
  verifications: EmployerVerification[]
  loading: boolean
  trustLevel: TrustLevel
  refresh: () => Promise<void>
}

/**
 * Computes aggregate trust level from a list of employer verifications.
 * - unverified: no verifications with status='verified'
 * - basic: email verified
 * - verified: email + (nzbn OR document) verified
 * - fully_verified: email + (nzbn OR document) + farm_photo all verified
 *
 * Phone was dropped from the ladder on 2026-08-17, operator decision, for two reasons.
 *
 * It was UNEARNABLE: phone auth is disabled project-wide, so `updateUser({ phone })` returns
 * 500 "Unable to get SMS provider" for every employer. Because both upper tiers required it,
 * EVERY employer was capped at `basic` — including one who had confirmed email, submitted a
 * real NZBN, uploaded an ownership deed and added farm photos. They showed workers the
 * weakest badge while having supplied the strongest evidence.
 *
 * And it was the WRONG SIGNAL. An NZBN is a government business-registry number and a
 * lease/ownership deed is a legal document; both are real evidence a farm exists and that
 * this person runs it. A confirmed mobile proves someone held a phone for thirty seconds.
 * Gating the top tiers on the weakest evidence inverted the hierarchy — so identity is now
 * what promotes an employer to `verified`, which is what the badge was always meant to say.
 */
// Exported for tests. The ladder is the badge workers judge an employer by, and it had no
// coverage at all until the phone tier was removed — nothing failed when it changed.
export function computeTrustLevel(verifications: EmployerVerification[]): TrustLevel {
  const verified = new Set(
    verifications.filter((v) => v.status === 'verified').map((v) => v.method),
  )

  if (verified.size === 0) return 'unverified'

  const hasEmail = verified.has('email')
  const hasIdentity = verified.has('nzbn') || verified.has('document')
  const hasPhoto = verified.has('farm_photo')

  if (hasEmail && hasIdentity && hasPhoto) return 'fully_verified'
  if (hasEmail && hasIdentity) return 'verified'
  if (hasEmail) return 'basic'

  return 'unverified'
}

/**
 * Loads and refreshes employer verifications from Supabase.
 * Returns the list of verifications plus computed trust level.
 */
export function useVerifications(employerId: string | null): UseVerificationsReturn {
  const [verifications, setVerifications] = useState<EmployerVerification[]>([])
  const [loading, setLoading] = useState(false)

  const fetchVerifications = useCallback(async () => {
    if (!employerId) {
      setVerifications([])
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('employer_verifications')
        .select('id, employer_id, method, status, verified_at, created_at')
        .eq('employer_id', employerId)

      if (error) {
        console.error('useVerifications: failed to load verifications', error)
        return
      }

      setVerifications((data as EmployerVerification[]) ?? [])
    } finally {
      setLoading(false)
    }
  }, [employerId])

  useEffect(() => {
    fetchVerifications()
  }, [fetchVerifications])

  return {
    verifications,
    loading,
    trustLevel: computeTrustLevel(verifications),
    refresh: fetchVerifications,
  }
}
