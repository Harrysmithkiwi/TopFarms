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
 * - verified: email + phone both verified
 * - fully_verified: email + phone + (nzbn OR document) + farm_photo all verified
 */
function computeTrustLevel(verifications: EmployerVerification[]): TrustLevel {
  const verified = new Set(
    verifications.filter((v) => v.status === 'verified').map((v) => v.method),
  )

  if (verified.size === 0) return 'unverified'

  const hasEmail = verified.has('email')
  const hasPhone = verified.has('phone')
  const hasIdentity = verified.has('nzbn') || verified.has('document')
  const hasPhoto = verified.has('farm_photo')

  if (hasEmail && hasPhone && hasIdentity && hasPhoto) return 'fully_verified'
  if (hasEmail && hasPhone) return 'verified'
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
        .select('*')
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
