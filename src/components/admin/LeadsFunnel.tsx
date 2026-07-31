import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ErrorState } from '@/components/ui/ErrorState'

/**
 * LeadsFunnel — pipeline visibility on /admin/leads (Admin Portal v2 #4).
 * Reuses the existing admin_analytics_leads RPC (no new migration): shows the
 * lifecycle progression New → Contacted → Onboarded with proportion bars, plus
 * Dead + pending-review as side stats. Turns the leads table from a filing
 * cabinet into a readable pipeline.
 */

interface Analytics {
  total: number
  by_status: { new: number; contacted: number; onboarded: number; dead: number }
  converted: number
  pending_review: number
}

const STAGES: { key: 'new' | 'contacted' | 'onboarded'; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'onboarded', label: 'Onboarded' },
]

export function LeadsFunnel({ refreshKey }: { refreshKey?: number }) {
  const [data, setData] = useState<Analytics | null>(null)
  // Phase 5.6: without this the widget renders nothing and reads as "no leads".
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let live = true
    void supabase.rpc('admin_analytics_leads' as never).then(({ data, error }) => {
      if (!live) return
      if (error) {
        console.error('admin_analytics_leads failed', error)
        setLoadError(true)
        return
      }
      setData(data as unknown as Analytics)
    })
    return () => {
      live = false
    }
  }, [refreshKey])

  if (loadError)
    return <ErrorState message="Could not load the leads funnel" onRetry={() => setLoadError(false)} compact />
  if (!data) return null
  // Bar width is relative to the largest stage so the funnel shape reads at a glance.
  const peak = Math.max(1, data.by_status.new, data.by_status.contacted, data.by_status.onboarded)

  return (
    <div
      className="rounded-lg border p-4"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className="text-xs font-semibold uppercase"
          style={{ color: 'var(--color-text-subtle)', letterSpacing: '0.04em' }}
        >
          Pipeline
        </span>
        <span className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
          {data.total} leads · {data.converted} converted · {data.pending_review} in review · {data.by_status.dead} dead
        </span>
      </div>
      <div className="flex items-stretch gap-2">
        {STAGES.map((s, i) => {
          const n = data.by_status[s.key]
          return (
            <div key={s.key} className="flex flex-1 items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                    {s.label}
                  </span>
                  <span
                    className="text-[18px] font-semibold"
                    style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {n}
                  </span>
                </div>
                <div
                  className="mt-1 h-1.5 rounded-full"
                  style={{ backgroundColor: 'var(--color-surface-2)' }}
                >
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${Math.round((n / peak) * 100)}%`,
                      backgroundColor: 'var(--color-brand)',
                    }}
                  />
                </div>
              </div>
              {i < STAGES.length - 1 && (
                <ChevronRight size={16} style={{ color: 'var(--color-text-subtle)' }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
