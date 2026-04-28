import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ApplicationStatus } from '@/types/domain'

/**
 * Batches a single applications query for the current seeker over the
 * provided jobIds and returns Map<jobId, latestStatus>.
 *
 * - Returns an empty Map while loading, when seekerProfileId is null,
 *   or when jobIds is empty
 * - "Latest" is the most recent row per job by created_at descending
 *   (a seeker may have re-applied after a withdrawal, etc.)
 */
export function useAppliedStatuses(
  jobIds: string[],
  seekerProfileId: string | null,
): Map<string, ApplicationStatus> {
  const [statuses, setStatuses] = useState<Map<string, ApplicationStatus>>(new Map())

  // Stable join key for the effect dep array (sorted to be deterministic)
  const jobIdKey = [...jobIds].sort().join(',')

  useEffect(() => {
    if (!seekerProfileId || jobIds.length === 0) {
      setStatuses(new Map())
      return
    }
    let cancelled = false
    supabase
      .from('applications')
      .select('job_id, status, created_at')
      .eq('seeker_id', seekerProfileId)
      .in('job_id', jobIds)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('useAppliedStatuses: query failed', error)
          setStatuses(new Map())
          return
        }
        // Build Map keeping the FIRST encounter per job_id (rows are
        // ordered DESC, so first = latest)
        const map = new Map<string, ApplicationStatus>()
        for (const row of data ?? []) {
          if (!map.has(row.job_id)) {
            map.set(row.job_id, row.status as ApplicationStatus)
          }
        }
        setStatuses(map)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekerProfileId, jobIdKey])

  return statuses
}
