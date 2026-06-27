import { useState } from 'react'
import { toast } from 'sonner'
import { AdminTable } from '@/components/admin/AdminTable'
import { LeadContactCard, type LeadContact } from '@/components/admin/LeadContact'
import { supabase } from '@/lib/supabase'

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

/**
 * The draft editor + state actions. Keyed by row id so local draft text resets
 * per selection without a useEffect (CategoriseForm precedent in AdminLeads).
 */
function DraftPanel({ row, onDone }: { row: OutreachRow; onDone: () => void }) {
  const [draft, setDraft] = useState(row.drafted_reply ?? '')
  const [busy, setBusy] = useState(false)
  const status = row.outreach_status

  async function call(fn: () => Promise<{ error: { message: string } | null }>, ok: string) {
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
    <div className="border-border mt-4 border-t pt-3">
      <p
        className="text-[11px] font-semibold tracking-wide uppercase"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Drafted reply — you send this manually on Facebook
      </p>
      {isPlaceholder && (
        <p className="text-warn mt-1 text-[12px]">
          ⚠ Placeholder — reply drafting goes live once the outreach config (do-not rules + voice +
          template) is set.
        </p>
      )}
      <textarea
        className="border-border bg-surface mt-2 h-32 w-full rounded-[8px] border px-2 py-1.5 text-sm outline-none focus:border-brand"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {(status === 'drafted' || status === 'approved') && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => saveDraft('drafted')}
              className="border-border hover:bg-surface-2 rounded-[8px] border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Save edit
            </button>
            {status === 'drafted' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => saveDraft('approved')}
                className="border-border hover:bg-surface-2 rounded-[8px] border px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Approve draft
              </button>
            )}
            <button
              type="button"
              disabled={busy || isPlaceholder}
              onClick={copyAndSend}
              title={isPlaceholder ? 'Set the outreach config before sending placeholder text' : ''}
              className="bg-brand rounded-[8px] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Copy reply &amp; mark sent
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={skip}
              className="text-warn hover:bg-surface-2 rounded-[8px] px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Skip
            </button>
          </>
        )}
        {status === 'sent' && (
          <button
            type="button"
            disabled={busy}
            onClick={markResponded}
            className="bg-brand rounded-[8px] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Mark responded
          </button>
        )}
        {status === 'responded' && (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Responded — add their contact in Lead Staging and approve to a contactable lead (Phase 2).
          </p>
        )}
      </div>
    </div>
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
      <h1
        className="text-[20px] leading-7 font-semibold"
        style={{ color: 'var(--color-text)', letterSpacing: '-0.01em' }}
      >
        Lane B Outreach
      </h1>
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        FB posts with no contact — reach out from your own account. Edit the drafted reply, approve,
        copy it, and send it manually on Facebook, then mark it sent.
      </p>

      {selected && (
        <div className="bg-surface border-brand rounded-[12px] border-2 p-5">
          <div className="text-sm">
            <p className="font-semibold">{selected.structured.display_name ?? '(unnamed)'}</p>
            <p style={{ color: 'var(--color-text-muted)' }}>
              {selected.structured.region ?? 'no region'} · {selected.source} · status{' '}
              <span className="font-semibold">{selected.outreach_status}</span>
              {selected.source_ref && (
                <>
                  {' · '}
                  <a
                    href={selected.source_ref}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand underline"
                  >
                    open post ↗
                  </a>
                </>
              )}
            </p>

            {selected.structured.role_or_category && (
              <p className="mt-1 text-[13px] font-medium">{selected.structured.role_or_category}</p>
            )}
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
              {selected.structured.shed_type && <span>🥛 {selected.structured.shed_type}</span>}
              {selected.structured.herd_details && <span>🐄 {selected.structured.herd_details}</span>}
              {selected.structured.source_group && (
                <span style={{ color: 'var(--color-text-muted)' }}>
                  group: {selected.structured.source_group}
                </span>
              )}
            </p>
            {selected.structured.application_method && (
              <p className="mt-1 text-[13px]">
                <span style={{ color: 'var(--color-text-muted)' }}>Apply: </span>
                {selected.structured.application_method}
              </p>
            )}

            {/* contact is usually empty for Lane B (that's why it's Lane B) */}
            <LeadContactCard contact={selected.structured.contact ?? null} />

            {selected.raw_excerpt && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                  Original post
                </summary>
                <p className="mt-1 text-[13px] leading-5 whitespace-pre-wrap" style={{ color: 'var(--color-text-muted)' }}>
                  {selected.raw_excerpt}
                </p>
              </details>
            )}
          </div>

          <DraftPanel key={selected.id} row={selected} onDone={refresh} />
        </div>
      )}

      <AdminTable<OutreachRow>
        key={refreshKey}
        rpc="admin_outreach_list"
        searchable
        searchPlaceholder="Search by name or region…"
        emptyHeading="No outreach in flight"
        emptyBody="Paste a Lane B (no-contact) FB post in Lead Staging — it lands here with a drafted reply."
        errorCopy="Failed to load outreach. Refresh the page."
        onRowClick={(row) => setSelected(row)}
        columns={[
          { key: 'display_name', label: 'Name / business' },
          { key: 'region', label: 'Region' },
          { key: 'outreach_status', label: 'Outreach' },
          { key: 'created_at', label: 'Captured' },
        ]}
        renderRow={(row, onClick) => (
          <tr
            key={row.id}
            onClick={onClick}
            className="border-border hover:bg-surface-2/50 h-[52px] cursor-pointer border-t"
          >
            <td className="px-3 font-medium">
              <div className="max-w-[220px] truncate" title={row.structured.display_name ?? ''}>
                {row.structured.display_name ?? '(unnamed)'}
              </div>
            </td>
            <td className="px-3">{row.structured.region ?? '—'}</td>
            <td className="px-3">
              <span className="font-semibold">{row.outreach_status}</span>
            </td>
            <td className="px-3">{new Date(row.created_at).toLocaleDateString('en-NZ')}</td>
          </tr>
        )}
      />
    </div>
  )
}
