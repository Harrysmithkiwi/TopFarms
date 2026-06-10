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
        const { data, error: fnError } = await supabase.functions.invoke(
          'generate-candidate-summary',
          {
            body: { application_id: applicationId, job_id: jobId, seeker_id: seekerId },
          },
        )
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
      className="mb-4 rounded-[12px] border p-4"
      style={{ backgroundColor: 'var(--color-ai-bg)', borderColor: 'rgba(108, 52, 131, 0.2)' }}
    >
      <p
        className="font-body mb-2 text-[11px] font-semibold tracking-wide uppercase"
        style={{ color: 'var(--color-ai)' }}
      >
        AI Summary
      </p>
      {loading && (
        <div className="space-y-2">
          <div
            className="h-3 animate-pulse rounded"
            style={{ backgroundColor: 'rgba(108, 52, 131, 0.1)' }}
          />
          <div
            className="h-3 w-4/5 animate-pulse rounded"
            style={{ backgroundColor: 'rgba(108, 52, 131, 0.1)' }}
          />
          <div
            className="h-3 w-3/5 animate-pulse rounded"
            style={{ backgroundColor: 'rgba(108, 52, 131, 0.1)' }}
          />
          <p className="font-body mt-1 text-[12px]" style={{ color: 'var(--color-ai)' }}>
            Analyzing candidate fit...
          </p>
        </div>
      )}
      {error && (
        <p className="font-body text-text-muted text-[13px]">
          Summary unavailable. Expand this panel again to retry.
        </p>
      )}
      {summary && !loading && (
        <p className="font-body text-text text-[13px] leading-relaxed">{summary}</p>
      )}
    </div>
  )
}
