import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export function useSavedJobs(userId: string | null) {
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    supabase
      .from('saved_jobs')
      .select('job_id')
      .eq('user_id', userId)
      .then(({ data }) => {
        setSavedJobIds(new Set((data ?? []).map((r: { job_id: string }) => r.job_id)))
        setLoading(false)
      })
  }, [userId])

  const toggleSave = useCallback(async (jobId: string) => {
    if (!userId) return
    const wasSaved = savedJobIds.has(jobId)
    // Optimistic update
    setSavedJobIds(prev => {
      const next = new Set(prev)
      wasSaved ? next.delete(jobId) : next.add(jobId)
      return next
    })
    try {
      if (wasSaved) {
        await supabase.from('saved_jobs').delete().eq('user_id', userId).eq('job_id', jobId)
      } else {
        await supabase.from('saved_jobs').insert({ user_id: userId, job_id: jobId })
      }
    } catch {
      // Revert
      setSavedJobIds(prev => {
        const next = new Set(prev)
        wasSaved ? next.add(jobId) : next.delete(jobId)
        return next
      })
      toast.error('Could not save job \u2014 please try again')
    }
  }, [userId, savedJobIds])

  const isSaved = useCallback((jobId: string) => savedJobIds.has(jobId), [savedJobIds])

  return { savedJobIds, isSaved, toggleSave, loading }
}
