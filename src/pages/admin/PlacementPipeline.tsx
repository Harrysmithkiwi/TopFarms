import { AdminTable } from '@/components/admin/AdminTable'
import { Tag } from '@/components/ui/Tag'

interface PlacementRow {
  id: string
  employer_id: string
  employer_name: string | null
  acknowledged_at: string
  days_since_ack: number
  is_overdue: boolean
  confirmed_at: string | null
  stripe_customer_id: string | null
  stripe_invoice_id: string | null
  fee_tier: 'entry' | 'experienced' | 'senior' | null
}

/**
 * Stripe URL builder — no mode prefix per RESEARCH.md Pitfall 6.
 *
 * Stripe routes test/live based on the dashboard's last-active mode, so the
 * no-prefix form (https://dashboard.stripe.com/{customers,invoices}/<id>)
 * works in both environments without coupling the frontend to which mode is
 * currently active. Hard-coding a mode-specific path would 404 once Stripe
 * is swapped to live (Phase 18 carryforward #13).
 *
 * Prefer the invoice link when available — operator's most common
 * destination is the invoice itself; fall back to the customer page when no
 * invoice has been issued yet.
 */
function stripeUrl(row: PlacementRow): string | null {
  if (row.stripe_invoice_id) {
    return `https://dashboard.stripe.com/invoices/${row.stripe_invoice_id}`
  }
  if (row.stripe_customer_id) {
    return `https://dashboard.stripe.com/customers/${row.stripe_customer_id}`
  }
  return null
}

/**
 * PlacementPipeline — `/admin/placements`.
 *
 * Composes <AdminTable rpc="admin_list_placements"> for the read-only
 * placement-fee pipeline. RPC returns rows where acknowledged_at IS NOT NULL
 * AND confirmed_at IS NULL (in-flight placements only); >14d ack age flagged
 * is_overdue=true server-side.
 *
 * Drawer is NOT wired here — placements are not people. Per CONTEXT.md MVP
 * scope item 6, drawer is wired on views 2/3/4 (employers, seekers, jobs);
 * placements (view 5) is the lone read-only pipeline view with click-through
 * to Stripe instead of a profile drawer.
 *
 * searchable={false} matches the RPC signature (admin_list_placements takes
 * only p_limit + p_offset; no p_search arg per migration 023).
 *
 * Copy locked by UI-SPEC §"Per-view primary actions and states" — Placement
 * pipeline.
 */
export function PlacementPipeline() {
  return (
    <div className="space-y-6">
      <h1
        className="text-[20px] font-semibold leading-7"
        style={{ color: 'var(--color-text)', letterSpacing: '-0.01em' }}
      >
        Placement Pipeline
      </h1>

      <AdminTable<PlacementRow>
        rpc="admin_list_placements"
        searchable={false}
        emptyHeading="No placements yet"
        emptyBody="Ack'd placements will appear here."
        errorCopy="Failed to load placements. Refresh the page or check your connection."
        columns={[
          { key: 'employer', label: 'Employer' },
          { key: 'acked', label: "Ack'd" },
          { key: 'days_since', label: 'Days since ack' },
          { key: 'hired', label: 'Hired' },
          { key: 'invoice', label: 'Invoice' },
        ]}
        renderRow={(row) => {
          const link = stripeUrl(row)
          return (
            <>
              <td
                className="px-4 py-3 text-[15px]"
                style={{ color: 'var(--color-text)' }}
              >
                {row.employer_name ?? '—'}
              </td>
              <td
                className="px-4 py-3 text-[13px]"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {new Date(row.acknowledged_at).toLocaleDateString('en-NZ', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </td>
              <td className="px-4 py-3">
                {row.is_overdue ? (
                  <Tag variant="warn">{`Overdue · ${row.days_since_ack}d`}</Tag>
                ) : (
                  <span
                    className="text-[15px]"
                    style={{
                      color: 'var(--color-text)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {row.days_since_ack}
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                {row.confirmed_at ? (
                  <Tag variant="green">Hired</Tag>
                ) : (
                  <Tag variant="grey">Pending</Tag>
                )}
              </td>
              <td className="px-4 py-3">
                {link ? (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] underline"
                    style={{ color: 'var(--color-brand)' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    View in Stripe
                  </a>
                ) : (
                  <span
                    className="text-[13px]"
                    style={{ color: 'var(--color-text-subtle)' }}
                  >
                    —
                  </span>
                )}
              </td>
            </>
          )
        }}
      />
    </div>
  )
}
