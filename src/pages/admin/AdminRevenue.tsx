import { useEffect, useState } from 'react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { KpiCard } from '@/components/admin/KpiCard'
import { Card } from '@/components/tremor/Card'
import { Tag } from '@/components/ui/Tag'
import { supabase } from '@/lib/supabase'

interface RevenueSummary {
  placements_total: number
  invoiced_cents: number
  paid_cents: number
  outstanding_cents: number
  overdue_cents: number
  uncollectible_cents: number
  waived_count: number
  acknowledged_uninvoiced_cents: number
  listing_revenue_cents: number
}

interface RevenueRow {
  id: string
  farm_name: string | null
  job_title: string | null
  fee_tier: string | null
  amount_nzd: number | null
  discount_pct: number
  waived_reason: string | null
  acknowledged_at: string | null
  confirmed_at: string | null
  paid_at: string | null
  stripe_invoice_status: string | null
  stripe_invoice_id: string | null
  days_outstanding: number | null
}

const nzd = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  maximumFractionDigits: 0,
})

// All money in placement_fees / listing_fees is NZD CENTS (20000 = $200).
const fromCents = (cents: number) => nzd.format(cents / 100)

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusTag(row: RevenueRow) {
  if (row.paid_at) return <Tag variant="green">Paid</Tag>
  if (row.stripe_invoice_status === 'uncollectible') return <Tag variant="grey">Uncollectible</Tag>
  if (row.stripe_invoice_status === 'payment_failed') return <Tag variant="red">Payment failed</Tag>
  if (row.waived_reason || (row.confirmed_at && row.amount_nzd === 0))
    return <Tag variant="grey">Waived</Tag>
  if (row.confirmed_at && (row.days_outstanding ?? 0) > 14)
    return <Tag variant="warn">{`Overdue · ${row.days_outstanding}d`}</Tag>
  if (row.confirmed_at) return <Tag variant="blue">Invoiced</Tag>
  return <Tag variant="purple">Acknowledged</Tag>
}

/**
 * AdminRevenue — `/admin/revenue` (Phase 2 Task 2.4).
 *
 * Invoiced vs paid vs overdue, from admin_revenue_reconciliation() — the
 * "who owes us money?" question, answerable at a glance. Read-only; billing
 * actions happen in Stripe (click through on the invoice link).
 */
export function AdminRevenue() {
  const [summary, setSummary] = useState<RevenueSummary | null>(null)
  const [rows, setRows] = useState<RevenueRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void supabase.rpc('admin_revenue_reconciliation' as never).then(({ data, error }) => {
      setLoading(false)
      if (error) {
        console.error('revenue reconciliation load failed', error)
        setError('Failed to load revenue data. Refresh the page or check your connection.')
        return
      }
      const payload = data as unknown as { summary: RevenueSummary; rows: RevenueRow[] }
      setSummary(payload.summary)
      setRows(payload.rows ?? [])
    })
  }, [])

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Jobs & Revenue"
        title="Revenue"
        description="Net-14. Click through to Stripe to chase or write off."
      />

      {summary && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Invoiced" value={fromCents(summary.invoiced_cents)} />
            <KpiCard label="Paid" value={fromCents(summary.paid_cents)} />
            <KpiCard label="Outstanding" value={fromCents(summary.outstanding_cents)} />
            <KpiCard label="Overdue (>14d)" value={fromCents(summary.overdue_cents)} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard label="Placements facilitated" value={summary.placements_total} />
            <KpiCard
              label="Acknowledged, not yet invoiced"
              value={fromCents(summary.acknowledged_uninvoiced_cents)}
            />
            <KpiCard label="Listing revenue" value={fromCents(summary.listing_revenue_cents)} />
          </div>
        </>
      )}

      <Card className="overflow-x-auto p-0">
        {loading ? (
          <p className="text-text-muted p-6 text-[14px]">Loading…</p>
        ) : error ? (
          <p className="p-6 text-[14px]" style={{ color: 'var(--color-danger)' }}>
            {error}
          </p>
        ) : rows.length === 0 ? (
          <div className="p-6">
            <p className="text-text text-[15px] font-semibold">No placement fees yet</p>
            <p className="text-text-muted mt-1 text-[13px]">
              Acknowledged and invoiced placement fees will appear here.
            </p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-border border-b">
                {['Employer', 'Job', 'Amount', 'Status', 'Invoiced', 'Paid', 'Invoice'].map((h) => (
                  <th
                    key={h}
                    className="text-text-subtle px-4 py-3 text-[11px] font-semibold tracking-wide uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-border border-b last:border-b-0">
                  <td className="px-4 py-3 text-[15px]" style={{ color: 'var(--color-text)' }}>
                    {row.farm_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                    {row.job_title ?? '—'}
                    {row.fee_tier ? ` · ${row.fee_tier}` : ''}
                  </td>
                  <td
                    className="px-4 py-3 text-[15px]"
                    style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {row.amount_nzd != null ? fromCents(row.amount_nzd) : '—'}
                    {row.discount_pct > 0 && (
                      <span className="text-text-subtle ml-1 text-[11px]">
                        (−{row.discount_pct}%)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{statusTag(row)}</td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                    {fmtDate(row.confirmed_at)}
                  </td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                    {fmtDate(row.paid_at)}
                  </td>
                  <td className="px-4 py-3">
                    {row.stripe_invoice_id ? (
                      <a
                        href={`https://dashboard.stripe.com/invoices/${row.stripe_invoice_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] underline"
                        style={{ color: 'var(--color-brand)' }}
                      >
                        View in Stripe
                      </a>
                    ) : (
                      <span className="text-[13px]" style={{ color: 'var(--color-text-subtle)' }}>
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
