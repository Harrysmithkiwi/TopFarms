import { useState } from 'react'
import { toast } from 'sonner'
import { MapPin, ExternalLink, AlertTriangle } from 'lucide-react'
import { AdminTable } from '@/components/admin/AdminTable'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { DrawerShell, DrawerSection } from '@/components/admin/DrawerShell'
import { LeadContactCard, type LeadContact } from '@/components/admin/LeadContact'
import { Button } from '@/components/ui/Button'
import { Tag } from '@/components/ui/Tag'
import { supabase } from '@/lib/supabase'
import { formatLeadName, regionLocalityLabel, sourceLabel } from '@/lib/leadDisplay'

/**
 * /admin/leads/outreach — Lane B work surface (PHASE-1-SPEC §E).
 * Lane B = no contact in the FB post → the only route is a comment/PM from your
 * account. Each row carries a Claude-drafted reply (A4); you edit, approve, copy,
 * and send it MANUALLY on Facebook, then mark sent. No automated posting.
 *
 * State machine (outreach_status):
 *   drafted ─[Approve]→ approved ─[Copy & mark sent]→ sent ─[Mark responded]→ responded
 *      └─[Skip]→ skipped              (Phase 2: responded → add contact → approve → lead)
 */

interface OutreachStructured {
  display_name?: string | null
  region?: string | null
  locality?: string | null // P-8 — populated by the GATE-2 lead-intake change
  role_or_category?: string | null
  contact?: LeadContact | null
  shed_type?: string | null
  herd_details?: string | null
  application_method?: string | null
  source_group?: string | null
  post_timestamp?: string | null
  lane?: 'a' | 'b'
}

interface OutreachRow extends Record<string, unknown> {
  id: string
  created_at: string
  source: string
  source_ref: string | null
  raw_excerpt: string | null
  structured: OutreachStructured
  drafted_reply: string | null
  draft_model: string | null
  outreach_status: 'drafted' | 'approved' | 'sent' | 'responded'
  sent_at: string | null
  responded_at: string | null
}

const STATUS_TAG: Record<
  OutreachRow['outreach_status'],
  { label: string; variant: 'purple' | 'blue' | 'green' }
> = {
  // drafted = an AI-drafted reply awaiting your review → the AI/purple token
  // (real badge, was a flat grey pill). Progresses blue (in flight) → green (replied).
  drafted: { label: 'Drafted', variant: 'purple' },
  approved: { label: 'Approved', variant: 'blue' },
  sent: { label: 'Sent', variant: 'blue' },
  responded: { label: 'Responded', variant: 'green' },
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-[13px]">
      <span
        className="shrink-0 text-xs font-semibold uppercase"
        style={{ color: 'var(--color-text-subtle)', letterSpacing: '0.04em', lineHeight: '1.4rem' }}
      >
        {label}
      </span>
      <span style={{ color: 'var(--color-text)' }}>{children}</span>
    </div>
  )
}

/**
 * The draft editor + state actions. Keyed by row id so local draft text resets
 * per selection without a useEffect.
 */
function DraftPanel({ row, onDone }: { row: OutreachRow; onDone: () => void }) {
  const [draft, setDraft] = useState(row.drafted_reply ?? '')
  const [busy, setBusy] = useState(false)
  const status = row.outreach_status

  // PromiseLike (not Promise): supabase's query builder is a thenable, not a full
  // Promise — it lacks .catch/.finally. Typing the param as PromiseLike accepts the
  // builder directly (and real Promises), so the admin_outreach_* RPC calls below
  // need no cast. (These RPCs live in migration 047, Studio-applied, so they're not
  // in supabase-js's generated function union — but awaiting them is well-typed.)
  async function call(fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) {
    setBusy(true)
    const { error } = await fn()
    setBusy(false)
    if (error) {
      toast.error(error.message)
      return false
    }
    toast.success(ok)
    onDone()
    return true
  }

  const saveDraft = (next: 'drafted' | 'approved') =>
    call(
      () =>
        supabase.rpc('admin_outreach_update_draft', {
          p_staging_id: row.id,
          p_draft: draft,
          p_status: next,
        }),
      next === 'approved' ? 'Draft approved' : 'Draft saved',
    )

  async function copyAndSend() {
    try {
      await navigator.clipboard.writeText(draft)
      toast.message('Reply copied — paste it into Facebook')
    } catch {
      toast.error('Clipboard blocked — copy the text manually')
    }
    await call(() => supabase.rpc('admin_outreach_mark_sent', { p_staging_id: row.id }), 'Marked sent')
  }

  const markResponded = () =>
    call(() => supabase.rpc('admin_outreach_mark_responded', { p_staging_id: row.id }), 'Marked responded')

  const skip = () =>
    call(() => supabase.rpc('admin_outreach_skip', { p_staging_id: row.id, p_reason: null }), 'Skipped')

  const isPlaceholder = draft.startsWith('[Draft pending') || draft.startsWith('[Outreach config')

  return (
    <DrawerSection label="Drafted reply — you send this manually on Facebook">
      {isPlaceholder && (
        <p className="text-warn flex items-start gap-1.5 text-[12px]">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          Placeholder — reply drafting goes live once the outreach config (do-not rules + voice +
          template) is set.
        </p>
      )}
      <textarea
        className="border-border bg-surface h-40 w-full rounded-[8px] border px-3 py-2 text-sm outline-none focus:border-brand"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      {/* One primary per state; secondary actions are outline/ghost. */}
      <div className="flex flex-wrap items-center gap-2">
        {(status === 'drafted' || status === 'approved') && (
          <>
            <Button
              variant="primary"
              size="sm"
              disabled={busy || isPlaceholder}
              onClick={copyAndSend}
              title={isPlaceholder ? 'Set the outreach config before sending placeholder text' : ''}
            >
              Copy reply &amp; mark sent
            </Button>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => saveDraft('drafted')}>
              Save edit
            </Button>
            {status === 'drafted' && (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => saveDraft('approved')}
              >
                Approve draft
              </Button>
            )}
            <Button variant="ghost" size="sm" disabled={busy} onClick={skip}>
              Skip
            </Button>
          </>
        )}
        {status === 'sent' && (
          <Button variant="primary" size="sm" disabled={busy} onClick={markResponded}>
            Mark responded
          </Button>
        )}
        {status === 'responded' && (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Responded — add their contact in Lead Staging and approve to a contactable lead (Phase 2).
          </p>
        )}
      </div>
    </DrawerSection>
  )
}

function OutreachDrawer({ row, onDone, onClose }: { row: OutreachRow; onDone: () => void; onClose: () => void }) {
  const s = row.structured
  const tag = STATUS_TAG[row.outreach_status]
  const hasDetailFields = s.shed_type || s.herd_details || s.application_method || s.source_group

  return (
    <DrawerShell label="Outreach" onClose={onClose}>
      {/* Header */}
      <div className="space-y-2">
        <h2
          className="text-[20px] leading-7 font-semibold"
          style={{ color: 'var(--color-text)', letterSpacing: '-0.01em' }}
          title={s.display_name ?? ''}
        >
          {formatLeadName(s.display_name)}
        </h2>
        <div className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
          {sourceLabel(row.source)}
        </div>
        {(s.region || s.locality) && (
          <div
            className="flex items-center gap-1.5 text-[13px]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <MapPin size={14} />
            {regionLocalityLabel(s)}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Tag variant={tag.variant}>{tag.label}</Tag>
          {row.source_ref && (
            <a
              href={row.source_ref}
              target="_blank"
              rel="noreferrer"
              className="text-brand inline-flex items-center gap-1 text-[13px] underline"
            >
              Open post <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>

      {s.role_or_category && (
        <DrawerSection label="Role">
          <div className="text-[14px] font-medium" style={{ color: 'var(--color-text)' }}>
            {s.role_or_category}
          </div>
        </DrawerSection>
      )}

      {hasDetailFields && (
        <DrawerSection label="Details">
          {s.shed_type && <DetailRow label="Shed">{s.shed_type}</DetailRow>}
          {s.herd_details && <DetailRow label="Herd">{s.herd_details}</DetailRow>}
          {s.application_method && <DetailRow label="Apply">{s.application_method}</DetailRow>}
          {s.source_group && <DetailRow label="Group">{s.source_group}</DetailRow>}
        </DrawerSection>
      )}

      {/* Contact is usually empty for Lane B (that's why it's Lane B) */}
      <DrawerSection label="Contact">
        <LeadContactCard contact={s.contact ?? null} />
      </DrawerSection>

      {row.raw_excerpt && (
        <DrawerSection label="Original post">
          <p
            className="bg-surface-2 max-h-40 overflow-y-auto rounded-[8px] p-3 text-[12px] leading-5 whitespace-pre-wrap"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {row.raw_excerpt}
          </p>
        </DrawerSection>
      )}

      <DraftPanel key={row.id} row={row} onDone={onDone} />
    </DrawerShell>
  )
}

export function AdminLeadsOutreach() {
  const [selected, setSelected] = useState<OutreachRow | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  function refresh() {
    setSelected(null)
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Leads"
        title="Outreach"
        description="FB posts with no listed contact — reach out from your own account. Edit the drafted reply, approve, copy it, send it manually on Facebook, then mark it sent."
      />

      <AdminTable<OutreachRow>
        key={refreshKey}
        rpc="admin_outreach_list"
        inCard
        searchable
        searchPlaceholder="Search by name or region…"
        emptyHeading="No outreach in flight"
        emptyBody="Paste a no-contact FB post in Lead Staging — it lands here with a drafted reply."
        errorCopy="Failed to load outreach. Refresh the page."
        onRowClick={(row) => setSelected(row)}
        columns={[
          { key: 'display_name', label: 'Name / business' },
          { key: 'region', label: 'Region · locality' },
          { key: 'outreach_status', label: 'Status' },
          { key: 'created_at', label: 'Captured' },
        ]}
        renderRow={(row) => {
          const tag = STATUS_TAG[row.outreach_status]
          // Return cells only — AdminTable provides the <tr> (hover/click/height).
          return (
            <>
              <td className="px-4 font-medium">
                <div className="max-w-[240px] truncate" title={row.structured.display_name ?? ''}>
                  {formatLeadName(row.structured.display_name)}
                </div>
              </td>
              <td className="px-4 text-[13px]">{regionLocalityLabel(row.structured)}</td>
              <td className="px-4">
                <Tag variant={tag.variant}>{tag.label}</Tag>
              </td>
              <td className="px-4 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                {new Date(row.created_at).toLocaleDateString('en-NZ')}
              </td>
            </>
          )
        }}
      />

      {selected && <OutreachDrawer row={selected} onDone={refresh} onClose={() => setSelected(null)} />}
    </div>
  )
}
