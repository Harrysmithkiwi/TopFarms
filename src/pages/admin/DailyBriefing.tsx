import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Tag } from '@/components/ui/Tag'
import { StatsStrip } from '@/components/ui/StatsStrip'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface DailyBriefingPayload {
  signups_yesterday: number
  jobs_posted_yesterday: number
  applications_yesterday: number
  placements_acked_yesterday: number
  revenue_snapshot: {
    placements_acked_this_month: number
    placements_confirmed_this_month: number
  }
  resend_stats:
    | { unavailable: true }
    | { stale: true; cached_at: string; value: { rate: number; total: number } }
    | { fresh: true; cached_at: string; value: { rate: number; total: number } }
}

interface SystemAlertsPayload {
  webhook_failures: Array<{
    id: string
    status_code: number | null
    error_body: string
    created: string
  }>
  cron_health: Array<{
    jobname: string
    last_status: string | null
    last_message: string | null
    last_start: string | null
    last_end: string | null
  }>
}

/**
 * ResendIndicator — renders the Resend delivery-rate stat from the cached
 * admin_metrics_cache row exposed by admin_get_daily_briefing.
 *
 * Three branches per UI-SPEC §"Resend delivery-rate approach":
 *   - unavailable → honest copy "Delivery data unavailable. Check Resend dashboard."
 *     This is the visible side of the MAIL-02 carryforward (CONTEXT.md item 1).
 *   - stale     → rate + "Stale · Last checked …"
 *   - fresh     → rate + "Last checked …"
 *
 * Tag variant follows UI-SPEC §Color semantic mapping:
 *   >=95% green, 80-94% warn, <80% red.
 */
function ResendIndicator({ resend }: { resend: DailyBriefingPayload['resend_stats'] }) {
  if ('unavailable' in resend) {
    return (
      <div className="text-[13px]" style={{ color: 'var(--color-text-subtle)' }}>
        Delivery data unavailable. Check Resend dashboard.
      </div>
    )
  }
  const rate = resend.value?.rate ?? 0
  const ratePct = Math.round(rate * 100)
  const variant: 'green' | 'warn' | 'red' =
    ratePct >= 95 ? 'green' : ratePct >= 80 ? 'warn' : 'red'
  const isStale = 'stale' in resend
  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2">
        <span
          className="text-[24px] font-semibold"
          style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}
        >
          {ratePct}%
        </span>
        <Tag variant={variant}>{`${ratePct}% delivery rate`}</Tag>
      </div>
      <div className="text-[13px]" style={{ color: 'var(--color-text-subtle)' }}>
        {isStale ? 'Stale · ' : ''}Last checked {new Date(resend.cached_at).toLocaleString()}
      </div>
    </div>
  )
}

/**
 * DailyBriefing — `/admin` landing page.
 *
 * Layout (UI-SPEC §"Daily briefing card layout"):
 *   1. <StatsStrip> — yesterday's signups / jobs posted / applications / placements acked
 *   2. Two-column md:grid:
 *        Left  — System Alerts card (webhook failures table, max 5 rows on briefing)
 *        Right — Email Delivery card (ResendIndicator) + Revenue card stacked
 *   3. Single-column on mobile (<768px)
 *
 * Data sources (RPCs from migration 023):
 *   - admin_get_daily_briefing  → counts + revenue + Resend cache snapshot
 *   - admin_get_system_alerts   → webhook_failures + cron_health
 *
 * On error, surfaces a sonner toast + inline error copy per UI-SPEC error-state contract.
 */
export function DailyBriefing() {
  const [briefing, setBriefing] = useState<DailyBriefingPayload | null>(null)
  const [alerts, setAlerts] = useState<SystemAlertsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    setLoading(true)
    setErrored(false)
    void Promise.all([
      supabase.rpc('admin_get_daily_briefing' as never),
      supabase.rpc('admin_get_system_alerts' as never),
    ])
      .then(([briefingRes, alertsRes]) => {
        if (briefingRes.error) throw briefingRes.error
        if (alertsRes.error) throw alertsRes.error
        setBriefing(briefingRes.data as DailyBriefingPayload)
        setAlerts(alertsRes.data as SystemAlertsPayload)
      })
      .catch((e) => {
        console.error('DailyBriefing load failed', e)
        setErrored(true)
        toast.error('Failed to load daily briefing. Refresh the page.')
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <h1
        className="text-[20px] font-semibold leading-7"
        style={{ color: 'var(--color-text)', letterSpacing: '-0.01em' }}
      >
        Daily Briefing
      </h1>

      {loading && (
        <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Loading…
        </div>
      )}

      {errored && (
        <div className="text-sm" style={{ color: 'var(--color-danger)' }}>
          Failed to load daily briefing. Refresh the page or check your connection.
        </div>
      )}

      {!loading && !errored && briefing && (
        <>
          <StatsStrip
            stats={[
              { label: 'Signups yesterday', value: briefing.signups_yesterday },
              { label: 'Jobs posted yesterday', value: briefing.jobs_posted_yesterday },
              { label: 'Applications yesterday', value: briefing.applications_yesterday },
              { label: "Placements ack'd yesterday", value: briefing.placements_acked_yesterday },
            ]}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column — System Alerts */}
            <Card>
              <div className="space-y-3">
                <h2
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--color-text-subtle)', letterSpacing: '0.04em' }}
                >
                  System Alerts
                </h2>
                {alerts && alerts.webhook_failures.length === 0 ? (
                  <div className="text-[13px]" style={{ color: 'var(--color-text-subtle)' }}>
                    No system alerts in the last 24 hours
                  </div>
                ) : (
                  <table
                    className="w-full text-[13px]"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <th
                          className="text-left py-2 font-semibold uppercase text-xs"
                          style={{ color: 'var(--color-text-subtle)' }}
                        >
                          Endpoint
                        </th>
                        <th
                          className="text-left py-2 font-semibold uppercase text-xs"
                          style={{ color: 'var(--color-text-subtle)' }}
                        >
                          Status
                        </th>
                        <th
                          className="text-left py-2 font-semibold uppercase text-xs"
                          style={{ color: 'var(--color-text-subtle)' }}
                        >
                          When
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {alerts?.webhook_failures.slice(0, 5).map((f) => (
                        <tr key={f.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td
                            className="py-2 truncate max-w-[220px]"
                            style={{ color: 'var(--color-text)' }}
                          >
                            {f.error_body?.slice(0, 60) ?? '—'}
                          </td>
                          <td className="py-2">
                            <Tag variant="red">{String(f.status_code ?? 'failed')}</Tag>
                          </td>
                          <td className="py-2" style={{ color: 'var(--color-text-muted)' }}>
                            {new Date(f.created).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>

            {/* Right column — Resend + Revenue stack */}
            <div className="space-y-6">
              <Card>
                <div className="space-y-3">
                  <h2
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--color-text-subtle)', letterSpacing: '0.04em' }}
                  >
                    Email Delivery
                  </h2>
                  <ResendIndicator resend={briefing.resend_stats} />
                </div>
              </Card>

              <Card>
                <div className="space-y-3">
                  <h2
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--color-text-subtle)', letterSpacing: '0.04em' }}
                  >
                    Revenue
                  </h2>
                  <div
                    className="grid grid-cols-2 gap-4"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    <div>
                      <div className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                        Acked this month
                      </div>
                      <div
                        className="text-[24px] font-semibold"
                        style={{ color: 'var(--color-text)' }}
                      >
                        {briefing.revenue_snapshot.placements_acked_this_month}
                      </div>
                    </div>
                    <div>
                      <div className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                        Confirmed this month
                      </div>
                      <div
                        className="text-[24px] font-semibold"
                        style={{ color: 'var(--color-text)' }}
                      >
                        {briefing.revenue_snapshot.placements_confirmed_this_month}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
