import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/tremor/Card'
import { BarChart } from '@/components/tremor/BarChart'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'

/**
 * Founder analytics dashboard at /admin/analytics (PHASE-ANALYTICS-DESIGN.md,
 * approved 2026-06-11; access tier: existing admin role).
 *
 * Renders the four read-only admin_analytics_* RPCs (migration 039) —
 * aggregates only, no row-level records. Panels are honest about volume:
 * revenue shows a pre-launch caption while billing is gated (PEND-01),
 * match quality warns under 30 completed applications, cohorts note the
 * sign-in/action proxy limitation (no analytics_events stream yet).
 */

// ─── RPC payload shapes (mirror migration 039 jsonb) ──────────────────────────

interface FunnelPayload {
  range: { from: string | null; to: string | null }
  seekers: { signed_up: number; onboarded: number; applied_ever: number; hired: number }
  employers: { signed_up: number; onboarded: number; posted_job: number; filled_job: number }
  pipeline: Record<string, number>
  placements_confirmed: number
}

interface CohortRow {
  cohort_month: string
  role: 'seeker' | 'employer'
  size: number
  active_30d: number
  active_90d: number
  acted_m1: number
  acted_m2: number
  acted_m3: number
}

interface CohortsPayload {
  note: string
  cohorts: CohortRow[]
}

interface MatchBand {
  band: string
  applications: number
  hired: number
  placement_rate: number | null
}

interface MatchQualityPayload {
  completed_total: number
  low_n_warning: boolean
  mean_score_hired: number | null
  mean_score_declined: number | null
  bands: MatchBand[]
}

interface RevenuePayload {
  range: { from: string | null; to: string | null }
  listing_fees: {
    monthly: { month: string; payments: number; total_nzd: number }[]
    by_tier: { tier: number; payments: number; total_nzd: number }[]
  }
  placement_fees: {
    monthly: { month: string; confirmed: number; total_nzd: number }[]
    by_region: { region: string; confirmed: number; total_nzd: number }[]
    by_tier: { fee_tier: string | null; confirmed: number; total_nzd: number }[]
  }
  pipeline: { acknowledged_unconfirmed: number; value_nzd: number }
}

// Pipeline display order = the real state machine (domain.ts VALID_TRANSITIONS).
const PIPELINE_ORDER = [
  'applied',
  'review',
  'interview',
  'shortlisted',
  'offered',
  'hired',
  'declined',
  'withdrawn',
]

const nzd = (cents: number) => `$${(cents / 100).toLocaleString('en-NZ')}`
const pct = (num: number, den: number) => (den > 0 ? `${Math.round((num / den) * 100)}%` : '—')

// ─── Shared bits ──────────────────────────────────────────────────────────────

function Panel({
  eyebrow,
  title,
  caption,
  children,
}: {
  eyebrow: string
  title: string
  caption?: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <div
        className="text-text-subtle text-[11px] font-semibold uppercase"
        style={{ letterSpacing: '0.04em' }}
      >
        {eyebrow}
      </div>
      <div className="text-text mt-0.5 text-[15px] font-semibold">{title}</div>
      {caption && <p className="text-text-muted mt-1 text-[12px]">{caption}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  )
}

function StageRow({ label, value, rate }: { label: string; value: number; rate?: string }) {
  return (
    <div className="flex items-baseline justify-between py-1 text-sm">
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
          {value}
        </span>
        {rate && (
          <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
            {rate}
          </span>
        )}
      </span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface LeadsPayload {
  total: number
  by_status: { new: number; contacted: number; onboarded: number; dead: number }
  by_type: { employer: number; seeker: number }
  converted: number
  pending_review: number
}

export function AdminAnalytics() {
  const [funnel, setFunnel] = useState<FunnelPayload | null>(null)
  const [cohorts, setCohorts] = useState<CohortsPayload | null>(null)
  const [match, setMatch] = useState<MatchQualityPayload | null>(null)
  const [revenue, setRevenue] = useState<RevenuePayload | null>(null)
  const [leads, setLeads] = useState<LeadsPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [f, c, m, r, ld] = await Promise.all([
        supabase.rpc('admin_analytics_funnel', { p_from: null, p_to: null }),
        supabase.rpc('admin_analytics_cohorts'),
        supabase.rpc('admin_analytics_match_quality'),
        supabase.rpc('admin_analytics_revenue', { p_from: null, p_to: null }),
        supabase.rpc('admin_analytics_leads'),
      ])
      const firstError = f.error ?? c.error ?? m.error ?? r.error ?? ld.error
      if (firstError) {
        setError(firstError.message)
      } else {
        setFunnel(f.data as unknown as FunnelPayload)
        setCohorts(c.data as unknown as CohortsPayload)
        setMatch(m.data as unknown as MatchQualityPayload)
        setRevenue(r.data as unknown as RevenuePayload)
        setLeads(ld.data as unknown as LeadsPayload)
      }
      setLoading(false)
    }
    load()
  }, [])

  const revenueIsEmpty =
    revenue &&
    revenue.listing_fees.monthly.length === 0 &&
    revenue.placement_fees.monthly.length === 0 &&
    revenue.pipeline.acknowledged_unconfirmed === 0

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Overview"
        title="Founder Analytics"
        description="Funnel, retention, match quality and revenue — aggregates only, all-time range."
      />

      {loading && (
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Loading analytics…
        </p>
      )}
      {error && (
        <p className="text-danger text-sm">Failed to load analytics: {error}. Refresh the page.</p>
      )}

      {!loading && !error && funnel && cohorts && match && revenue && leads && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* ── Funnel ── */}
          <Panel
            eyebrow="Acquisition"
            title="Funnel"
            caption="Snapshot — the pipeline has no transition timestamps yet, so time-in-stage is not shown (design §2.1)."
          >
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[12px] font-semibold tracking-wide uppercase opacity-60">
                  Seekers
                </p>
                <StageRow label="Signed up" value={funnel.seekers.signed_up} />
                <StageRow
                  label="Onboarded"
                  value={funnel.seekers.onboarded}
                  rate={pct(funnel.seekers.onboarded, funnel.seekers.signed_up)}
                />
                <StageRow
                  label="Applied (ever)"
                  value={funnel.seekers.applied_ever}
                  rate={pct(funnel.seekers.applied_ever, funnel.seekers.onboarded)}
                />
                <StageRow
                  label="Hired"
                  value={funnel.seekers.hired}
                  rate={pct(funnel.seekers.hired, funnel.seekers.applied_ever)}
                />
              </div>
              <div>
                <p className="text-[12px] font-semibold tracking-wide uppercase opacity-60">
                  Employers
                </p>
                <StageRow label="Signed up" value={funnel.employers.signed_up} />
                <StageRow
                  label="Onboarded"
                  value={funnel.employers.onboarded}
                  rate={pct(funnel.employers.onboarded, funnel.employers.signed_up)}
                />
                <StageRow
                  label="Posted a job"
                  value={funnel.employers.posted_job}
                  rate={pct(funnel.employers.posted_job, funnel.employers.onboarded)}
                />
                <StageRow
                  label="Filled a job"
                  value={funnel.employers.filled_job}
                  rate={pct(funnel.employers.filled_job, funnel.employers.posted_job)}
                />
              </div>
            </div>
            <div className="border-border mt-4 border-t pt-3">
              <p className="text-[12px] font-semibold tracking-wide uppercase opacity-60">
                Application pipeline (current statuses)
              </p>
              {PIPELINE_ORDER.map((s) => (
                <StageRow key={s} label={s} value={funnel.pipeline[s] ?? 0} />
              ))}
              <StageRow label="Placements confirmed ($)" value={funnel.placements_confirmed} />
            </div>
          </Panel>

          {/* ── Cohorts ── */}
          <Panel
            eyebrow="Retention"
            title="Cohort retention"
            caption="Proxies: sign-in recency + took-an-action in months 1–3 after joining. True retention curves need event instrumentation (design §2.2)."
          >
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[12px] uppercase opacity-60">
                  <th className="py-1 font-semibold">Cohort</th>
                  <th className="font-semibold">Role</th>
                  <th className="text-right font-semibold">Size</th>
                  <th className="text-right font-semibold">Active ≤30d</th>
                  <th className="text-right font-semibold">Active ≤90d</th>
                  <th className="text-right font-semibold">Acted M+1</th>
                  <th className="text-right font-semibold">M+2</th>
                  <th className="text-right font-semibold">M+3</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.cohorts.map((c) => (
                  <tr key={`${c.cohort_month}-${c.role}`} className="border-border border-t">
                    <td className="py-1.5">{c.cohort_month}</td>
                    <td>{c.role}</td>
                    <td className="text-right font-semibold">{c.size}</td>
                    <td className="text-right">{pct(c.active_30d, c.size)}</td>
                    <td className="text-right">{pct(c.active_90d, c.size)}</td>
                    <td className="text-right">{pct(c.acted_m1, c.size)}</td>
                    <td className="text-right">{pct(c.acted_m2, c.size)}</td>
                    <td className="text-right">{pct(c.acted_m3, c.size)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cohorts.cohorts.length < 3 && (
              <p className="mt-3 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                Trend lines need ~3 months of signups — early days.
              </p>
            )}
          </Panel>

          {/* ── Match quality ── */}
          <Panel
            eyebrow="Quality"
            title="Match quality"
            caption="Do higher match scores convert to hires? Completed applications only (hired/declined)."
          >
            {match.low_n_warning && (
              <p className="text-warn mb-3 text-[12px]">
                Low volume — {match.completed_total} completed application
                {match.completed_total === 1 ? '' : 's'}; needs ~30 for signal.
              </p>
            )}
            {match.bands.length > 0 && (
              <BarChart
                className="mb-4 h-48"
                data={match.bands.map((b) => ({
                  band: b.band,
                  Applications: b.applications,
                  Hired: b.hired,
                }))}
                index="band"
                categories={['Applications', 'Hired']}
                colors={['brand', 'brandLight']}
                showLegend
              />
            )}
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[12px] uppercase opacity-60">
                  <th className="py-1 font-semibold">Score band</th>
                  <th className="text-right font-semibold">Applications</th>
                  <th className="text-right font-semibold">Hired</th>
                  <th className="text-right font-semibold">Placement rate</th>
                </tr>
              </thead>
              <tbody>
                {match.bands.map((b) => (
                  <tr key={b.band} className="border-border border-t">
                    <td className="py-1.5">{b.band}</td>
                    <td className="text-right">{b.applications}</td>
                    <td className="text-right">{b.hired}</td>
                    <td className="text-right">
                      {b.placement_rate != null ? `${Math.round(b.placement_rate * 100)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div
              className="mt-3 flex gap-6 text-[12px]"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <span>Mean score (hired): {match.mean_score_hired ?? '—'}</span>
              <span>Mean score (declined): {match.mean_score_declined ?? '—'}</span>
            </div>
          </Panel>

          {/* ── Revenue ── */}
          <Panel
            eyebrow="Revenue"
            title="Revenue"
            caption={
              revenueIsEmpty
                ? 'Pre-launch — no live billing yet (PEND-01). Zeros below are real, not placeholders.'
                : 'Listing fees (Stripe webhook) + placement fees, NZD.'
            }
          >
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-[12px] font-semibold tracking-wide uppercase opacity-60">
                  Listing fees by month
                </p>
                {revenue.listing_fees.monthly.length === 0 ? (
                  <p className="py-1" style={{ color: 'var(--color-text-muted)' }}>
                    No payments recorded.
                  </p>
                ) : (
                  revenue.listing_fees.monthly.map((m) => (
                    <StageRow
                      key={m.month}
                      label={`${m.month} (${m.payments})`}
                      value={m.total_nzd}
                      rate={nzd(m.total_nzd)}
                    />
                  ))
                )}
              </div>
              <div>
                <p className="text-[12px] font-semibold tracking-wide uppercase opacity-60">
                  Placement fees by month
                </p>
                {revenue.placement_fees.monthly.length === 0 ? (
                  <p className="py-1" style={{ color: 'var(--color-text-muted)' }}>
                    No confirmed placements.
                  </p>
                ) : (
                  revenue.placement_fees.monthly.map((m) => (
                    <StageRow
                      key={m.month}
                      label={`${m.month} (${m.confirmed})`}
                      value={m.total_nzd}
                      rate={nzd(m.total_nzd)}
                    />
                  ))
                )}
              </div>
            </div>
            <div className="border-border mt-4 border-t pt-3 text-sm">
              <StageRow
                label="Acknowledged, unconfirmed (pipeline)"
                value={revenue.pipeline.acknowledged_unconfirmed}
                rate={nzd(revenue.pipeline.value_nzd)}
              />
            </div>
          </Panel>

          {/* ── Leads (top-of-funnel; L4 wiring) ── */}
          <Panel
            eyebrow="Top of funnel"
            title="Leads"
            caption="Top-of-funnel pipeline from discovery → signup. Approved leads only; staging awaits review."
          >
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[12px] font-semibold tracking-wide uppercase opacity-60">
                  By status
                </p>
                <StageRow label="New" value={leads.by_status.new} />
                <StageRow label="Contacted" value={leads.by_status.contacted} />
                <StageRow
                  label="Onboarded (converted)"
                  value={leads.by_status.onboarded}
                  rate={pct(leads.converted, leads.total)}
                />
                <StageRow label="Dead" value={leads.by_status.dead} />
              </div>
              <div>
                <p className="text-[12px] font-semibold tracking-wide uppercase opacity-60">Mix</p>
                <StageRow label="Employers" value={leads.by_type.employer} />
                <StageRow label="Seekers" value={leads.by_type.seeker} />
                <StageRow label="Total leads" value={leads.total} />
                <StageRow label="Pending review (staging)" value={leads.pending_review} />
              </div>
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}
