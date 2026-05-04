import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface AICandidateSummaryProps {
  applicationId: string
  jobId: string
  seekerId: string
  cachedSummary: string | null
  onSummaryLoaded: (summary: string) => void
  isExpanded: boolean
}

export function AICandidateSummary({
  applicationId,
  jobId,
  seekerId,
  cachedSummary,
  onSummaryLoaded,
  isExpanded,
}: AICandidateSummaryProps) {
  const [summary, setSummary] = useState<string | null>(cachedSummary)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!isExpanded || summary || loading) return

    async function generate() {
      setLoading(true)
      setError(false)
      try {
        const { data, error: fnError } = await supabase.functions.invoke('generate-candidate-summary', {
          body: { application_id: applicationId, job_id: jobId, seeker_id: seekerId },
        })
        if (fnError) throw fnError
        if (data?.summary) {
          setSummary(data.summary)
          onSummaryLoaded(data.summary)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    generate()
  }, [isExpanded])

  if (!isExpanded) return null

  return (
    <div
      className="border rounded-[12px] p-4 mb-4"
      style={{ backgroundColor: 'var(--color-ai-bg)', borderColor: 'rgba(108, 52, 131, 0.2)' }}
    >
      <p
        className="text-[11px] font-body font-semibold uppercase tracking-wide mb-2"
        style={{ color: 'var(--color-ai)' }}
      >
        AI Summary
      </p>
      {loading && (
        <div className="space-y-2">
          <div className="h-3 rounded animate-pulse" style={{ backgroundColor: 'rgba(108, 52, 131, 0.1)' }} />
          <div className="h-3 rounded animate-pulse w-4/5" style={{ backgroundColor: 'rgba(108, 52, 131, 0.1)' }} />
          <div className="h-3 rounded animate-pulse w-3/5" style={{ backgroundColor: 'rgba(108, 52, 131, 0.1)' }} />
          <p className="text-[12px] font-body mt-1" style={{ color: 'var(--color-ai)' }}>
            Analyzing candidate fit...
          </p>
        </div>
      )}
      {error && (
        <p className="text-[13px] font-body text-text-muted">
          Summary unavailable. Expand this panel again to retry.
        </p>
      )}
      {summary && !loading && (
        <p className="text-[13px] font-body text-text leading-relaxed">{summary}</p>
      )}
    </div>
  )
}
