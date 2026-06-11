import { useState } from 'react'
import { toast } from 'sonner'
import { AdminTable } from '@/components/admin/AdminTable'
import { supabase } from '@/lib/supabase'

/**
 * /admin/leads — the pipeline view (L0, PHASE-LEADS-DESIGN §6).
 * Approved leads with status new -> contacted -> onboarded -> dead.
 * Conversion linking (converted_user_id suggestion flow) lands in L4.
 */

interface LeadRow extends Record<string, unknown> {
  id: string
  created_at: string
  type: 'employer' | 'seeker'
  display_name: string
  region: string | null
  role_or_category: string | null
  source: string
  source_ref: string | null
  contact: { email?: string; phone?: string; url?: string } | null
  notes: string | null
  status: 'new' | 'contacted' | 'onboarded' | 'dead'
  status_changed_at: string
  converted_user_id: string | null
}

const STATUSES: LeadRow['status'][] = ['new', 'contacted', 'onboarded', 'dead']

export function AdminLeads() {
  const [selected, setSelected] = useState<LeadRow | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  async function setStatus(status: LeadRow['status']) {
    if (!selected) return
    const { error } = await supabase.rpc('admin_lead_set_status', {
      p_lead_id: selected.id,
      p_status: status,
    })
    if (error) {
      toast.error(`Status change failed: ${error.message}`)
      return
    }
    toast.success(`Marked ${status}`)
    setSelected(null)
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="space-y-6">
      <h1
        className="text-[20px] leading-7 font-semibold"
        style={{ color: 'var(--color-text)', letterSpacing: '-0.01em' }}
      >
        Leads Pipeline
      </h1>
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Approved leads only — everything here passed your staging review. Click a row to change
        status.
      </p>

      {selected && (
        <div className="bg-surface border-brand rounded-[12px] border-2 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 text-sm">
              <p className="font-semibold">{selected.display_name}</p>
              <p style={{ color: 'var(--color-text-muted)' }}>
                {selected.type} · {selected.region ?? 'no region'} · currently{' '}
                <span className="font-semibold">{selected.status}</span>
                {selected.contact?.url && (
                  <>
                    {' · '}
                    <a
                      className="text-brand underline"
                      href={selected.contact.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      contact
                    </a>
                  </>
                )}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {STATUSES.filter((s) => s !== selected.status).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className="border-border hover:bg-surface-2 rounded-[8px] border px-3 py-1.5 text-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <AdminTable<LeadRow>
        key={refreshKey}
        rpc="admin_leads_list"
        searchable
        searchPlaceholder="Search by name, region, status, source…"
        emptyHeading="No leads yet"
        emptyBody="Approve captures from the staging queue to build the pipeline."
        errorCopy="Failed to load leads. Refresh the page."
        onRowClick={(row) => setSelected(row)}
        columns={[
          { key: 'display_name', label: 'Name / business' },
          { key: 'type', label: 'Type' },
          { key: 'region', label: 'Region' },
          { key: 'source', label: 'Source' },
          { key: 'status', label: 'Status' },
          { key: 'status_changed_at', label: 'Updated' },
        ]}
        renderRow={(row, onClick) => (
          <tr
            key={row.id}
            onClick={onClick}
            className="border-border hover:bg-surface-2/50 h-[52px] cursor-pointer border-t"
          >
            <td className="px-3 font-medium">{row.display_name}</td>
            <td className="px-3">{row.type}</td>
            <td className="px-3">{row.region ?? '—'}</td>
            <td className="px-3">{row.source}</td>
            <td className="px-3 font-semibold">{row.status}</td>
            <td className="px-3">{new Date(row.status_changed_at).toLocaleDateString('en-NZ')}</td>
          </tr>
        )}
      />
    </div>
  )
}
