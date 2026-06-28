import { useEffect, useState } from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { Card } from '@/components/tremor/Card'
import { AreaChart } from '@/components/tremor/AreaChart'
import { Tag } from '@/components/ui/Tag'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface DailyBriefingPayload {
  signups_yesterday: number
  signups_prior: number
  jobs_posted_yesterday: number
  jobs_posted_prior: number
  applications_yesterday: number
  applications_prior: number
  placements_acked_yesterday: number
  placements_acked_prior: number
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
 * DailyBriefing — `/admin` landing page and the Phase-0 reference screen for the
 * admin UI uplift (Tremor Raw cards + chart, all reading our @theme tokens). The
 * pattern here (KPI cards with delta pills, a token-green AreaChart, eyebrow+title
 * carded panels, soft --shadow-card elevation) is what every other admin screen
 * adopts next.
 *
 * Data sources (RPCs from migration 023):
 *   - admin_get_daily_briefing  → counts + revenue + Resend cache snapshot
 *   - admin_get_system_alerts   → webhook_failures + cron_health
 */

/** Eyebrow + title header, consistent across every admin card. */
function CardHeading({
  eyebrow,
  title,
  right,
}: {
  eyebrow: string
  title: string
  right?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div
          className="text-text-subtle text-[11px] font-semibold uppercase"
          style={{ letterSpacing: '0.04em' }}
        >
          {eyebrow}
        </div>
        <div className="text-text mt-0.5 text-[15px] font-semibold">{title}</div>
      </div>
      {right}
    </div>
  )
}

/**
 * Percentage change yesterday vs the prior day. Null when the prior day was 0 —
 * there's no baseline to divide by, so we render an honest "—" rather than a
 * fabricated "∞%". Exported for unit coverage of the divide-by-zero branch.
 */
export function pctDelta(today: number, prior: number): number | null {
  if (!prior) return null // 0 / undefined / NaN → no baseline, render "—"
  return Math.round(((today - prior) / prior) * 100)
}

/**
 * Delta vs prior day. Null → honest "—" (no baseline); a number lights up the
 * coloured ↑/↓ pill.
 */
function DeltaPill({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="text-text-subtle text-[11px]" title="Prior-day delta not wired yet">
        vs prior day —
      </span>
    )
  }
  const up = delta >= 0
  return (
    <Tag variant={up ? 'green' : 'red'} className="gap-0.5">
      {up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
      {Math.abs(delta)}%
    </Tag>
  )
}

function KpiCard({
  label,
  value,
  delta,
}: {
  label: string
  value: number
  delta: number | null
}) {
  return (
    // h-full + grid stretch = equal-height cards; mt-auto pins the number row to
    // the bottom so numbers stay aligned even when a label wraps to two lines.
    <Card className="flex h-full flex-col">
      <div
        className="text-text-subtle text-[11px] font-semibold uppercase"
        style={{ letterSpacing: '0.04em' }}
      >
        {label}
      </div>
      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <span
          className="text-text text-[28px] leading-none font-semibold"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {value}
        </span>
        <DeltaPill delta={delta} />
      </div>
    </Card>
  )
}

const TREND_DAYS = 14

/** One day in the signups timeseries from admin_get_signups_trend (ISO date + count). */
interface SignupsTrendRow {
  date: string // 'YYYY-MM-DD' (UTC calendar day)
  signups: number
}

/** Map RPC rows to the AreaChart shape: short day label + capitalised category. */
export function formatTrend(rows: SignupsTrendRow[]): { date: string; Signups: number }[] {
  return rows.map((r) => ({
    // append T00:00:00 so the ISO date parses as local midnight, not UTC —
    // keeps the day label from drifting a day under NZ's UTC+12/13 offset.
    date: new Date(r.date + 'T00:00:00').toLocaleDateString('en-NZ', {
      day: '2-digit',
      month: 'short',
    }),
    Signups: r.signups,
  }))
}

/**
 * ResendIndicator — Resend delivery-rate stat from admin_metrics_cache.
 * Branches: unavailable → honest copy; stale/fresh → rate + last-checked.
 * Tag variant: >=95% green, 80-94% warn, <80% red.
 */
function ResendIndicator({ resend }: { resend: DailyBriefingPayload['resend_stats'] }) {
  if ('unavailable' in resend) {
    return (
      <div className="text-text-subtle text-[13px]">Delivery data unavailable. Check Resend dashboard.</div>
    )
  }
  const rate = resend.value?.rate ?? 0
  const ratePct = Math.round(rate * 100)
  const variant: 'green' | 'warn' | 'red' = ratePct >= 95 ? 'green' : ratePct >= 80 ? 'warn' : 'red'
  const isStale = 'stale' in resend
  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2">
        <span
          className="text-text text-[24px] font-semibold"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {ratePct}%
        </span>
        <Tag variant={variant}>{`${ratePct}% delivery rate`}</Tag>
      </div>
      <div className="text-text-subtle text-[13px]">
        {isStale ? 'Stale · ' : ''}Last checked {new Date(resend.cached_at).toLocaleString()}
      </div>
    </div>
  )
}

export function DailyBriefing() {
  const [briefing, setBriefing] = useState<DailyBriefingPayload | null>(null)
  const [alerts, setAlerts] = useState<SystemAlertsPayload | null>(null)
  const [trend, setTrend] = useState<SignupsTrendRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    setLoading(true)
    setErrored(false)
    void Promise.all([
      supabase.rpc('admin_get_daily_briefing' as never),
      supabase.rpc('admin_get_system_alerts' as never),
      supabase.rpc('admin_get_signups_trend' as never, { p_days: TREND_DAYS } as never),
    ])
      .then(([briefingRes, alertsRes, trendRes]) => {
        if (briefingRes.error) throw briefingRes.error
        if (alertsRes.error) throw alertsRes.error
        if (trendRes.error) throw trendRes.error
        setBriefing(briefingRes.data as DailyBriefingPayload)
        setAlerts(alertsRes.data as SystemAlertsPayload)
        setTrend(trendRes.data as SignupsTrendRow[])
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
        className="text-text text-[20px] leading-7 font-semibold"
        style={{ letterSpacing: '-0.01em' }}
      >
        Daily Briefing
      </h1>

      {loading && <div className="text-text-muted text-sm">Loading…</div>}

      {errored && (
        <div className="text-danger text-sm">
          Failed to load daily briefing. Refresh the page or check your connection.
        </div>
      )}

      {!loading && !errored && briefing && (
        <>
          {/* Four KPI cards — big tabular number + delta pill vs prior day. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Signups yesterday"
              value={briefing.signups_yesterday}
              delta={pctDelta(briefing.signups_yesterday, briefing.signups_prior)}
            />
            <KpiCard
              label="Jobs posted yesterday"
              value={briefing.jobs_posted_yesterday}
              delta={pctDelta(briefing.jobs_posted_yesterday, briefing.jobs_posted_prior)}
            />
            <KpiCard
              label="Applications yesterday"
              value={briefing.applications_yesterday}
              delta={pctDelta(briefing.applications_yesterday, briefing.applications_prior)}
            />
            <KpiCard
              label="Placements acknowledged yesterday"
              value={briefing.placements_acked_yesterday}
              delta={pctDelta(briefing.placements_acked_yesterday, briefing.placements_acked_prior)}
            />
          </div>

          {/* Signups trend — token-green AreaChart on live daily signups. */}
          <Card>
            <CardHeading eyebrow="Growth" title={`Signups, last ${TREND_DAYS} days`} />
            <AreaChart
              className="mt-4 h-56"
              data={formatTrend(trend)}
              index="date"
              categories={['Signups']}
              colors={['brand']}
              showLegend={false}
              startEndOnly
              fill="gradient"
            />
          </Card>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* System Alerts */}
            <Card>
              <CardHeading eyebrow="Monitoring" title="System Alerts" />
              <div className="mt-4">
                {alerts && alerts.webhook_failures.length === 0 ? (
                  <div className="text-text-subtle text-[13px]">
                    No system alerts in the last 24 hours
                  </div>
                ) : (
                  <table
                    className="w-full text-[13px]"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    <thead>
                      <tr className="border-border border-b">
                        {['Endpoint', 'Status', 'When'].map((h) => (
                          <th
                            key={h}
                            className="text-text-subtle px-2 py-2 text-left text-xs font-semibold uppercase first:pl-0"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {alerts?.webhook_failures.slice(0, 5).map((f) => (
                        <tr key={f.id} className="border-border border-b last:border-0">
                          <td className="text-text max-w-[220px] truncate px-2 py-2 pl-0">
                            {f.error_body?.slice(0, 60) ?? '—'}
                          </td>
                          <td className="px-2 py-2">
                            <Tag variant="red">{String(f.status_code ?? 'failed')}</Tag>
                          </td>
                          <td className="text-text-muted px-2 py-2">
                            {new Date(f.created).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>

            {/* Email Delivery + Revenue stacked */}
            <div className="space-y-6">
              <Card>
                <CardHeading eyebrow="Deliverability" title="Email Delivery" />
                <div className="mt-4">
                  <ResendIndicator resend={briefing.resend_stats} />
                </div>
              </Card>

              <Card>
                <CardHeading eyebrow="Revenue" title="Placements this month" />
                <div
                  className="mt-4 grid grid-cols-2 gap-4"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  <div>
                    <div className="text-text-muted text-[13px]">Acknowledged</div>
                    <div className="text-text text-[24px] font-semibold">
                      {briefing.revenue_snapshot.placements_acked_this_month}
                    </div>
                  </div>
                  <div>
                    <div className="text-text-muted text-[13px]">Invoiced</div>
                    <div className="text-text text-[24px] font-semibold">
                      {briefing.revenue_snapshot.placements_confirmed_this_month}
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
