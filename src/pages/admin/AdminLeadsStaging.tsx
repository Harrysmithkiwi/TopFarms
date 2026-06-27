import { useState } from 'react'
import { toast } from 'sonner'
import { AdminTable } from '@/components/admin/AdminTable'
import { ContactGlyphs, LeadContactCard, type LeadContact } from '@/components/admin/LeadContact'
import { supabase } from '@/lib/supabase'
import { NZ_REGIONS } from '@/lib/constants'

/**
 * /admin/leads/staging — capture form + the approval queue (L0,
 * PHASE-LEADS-DESIGN §6). The approval gate here IS the privacy checkpoint:
 * nothing reaches the live leads table except through admin_lead_approve.
 * L1 swaps the field-by-field capture form for paste-post -> Claude Haiku.
 */

interface StagingRow extends Record<string, unknown> {
  id: string
  created_at: string
  source: string
  source_ref: string | null
  raw_excerpt: string | null
  structured: {
    type?: string
    display_name?: string
    region?: string
    role_or_category?: string
    contact?: LeadContact | null
    salary_text?: string | null
    summary?: string | null
    advertiser_name?: string | null
    is_recruiter?: boolean
    company_profile_url?: string | null
    // FB triage (Phase 1): lane computed in the Edge Fn; FB extract fields.
    lane?: 'a' | 'b'
    shed_type?: string | null
    herd_details?: string | null
    application_method?: string | null
    source_group?: string | null
  }
  confidence: number
  missing_fields: string[]
  dedupe_status: 'unique' | 'suspect_duplicate' | 'exact_duplicate'
  dedupe_match_id: string | null
}

const SOURCE_LABELS: Record<string, string> = {
  seek: 'Seek',
  trademe: 'TradeMe',
  fb_own_group: 'FB (own group)',
  fb_manual_capture: 'FB (manual capture)',
  nzfarmingjobs: 'NZ Farming Jobs',
}

function PastePanel({ onCaptured }: { onCaptured: () => void }) {
  const [source, setSource] = useState('fb_own_group')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  // L1 batch lane (§9.2): paste one or MANY posts; lead-intake structures
  // them with Claude Haiku server-side (degrades to confidence-0 staging
  // rows until ANTHROPIC_API_KEY is set in Edge secrets).
  async function submit() {
    if (!text.trim()) return
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('lead-intake', {
      body: { source, items: [{ raw_text: text }] },
    })
    setBusy(false)
    if (error) {
      toast.error(`Intake failed: ${error.message}`)
      return
    }
    const r = (data as { results?: Record<string, number>; structuring?: string }) ?? {}
    toast.success(
      `Staged ${r.results?.inserted ?? 0} (dupes ${r.results?.exact_duplicate ?? 0}, suppressed ${r.results?.suppressed ?? 0}) — ${r.structuring ?? ''}`,
    )
    setText('')
    onCaptured()
  }

  const inputCls =
    'border-border bg-surface w-full rounded-[8px] border px-3 py-2 text-sm outline-none focus:border-brand'

  return (
    <div className="bg-surface border-border rounded-[12px] border p-5">
      <h2 className="text-[15px] font-semibold" style={{ color: 'var(--color-text)' }}>
        Paste posts (batch)
      </h2>
      <p className="mt-0.5 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
        Paste one or many posts — structuring, dedupe and suppression run automatically; results
        land in the staging queue for your approval.
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <select
          className={`${inputCls} sm:w-56`}
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="fb_own_group">FB (own group)</option>
          <option value="fb_manual_capture">FB (manual capture)</option>
        </select>
        <button
          type="button"
          disabled={busy || !text.trim()}
          onClick={submit}
          className="bg-brand rounded-[8px] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Structuring…' : 'Stage batch'}
        </button>
      </div>
      <textarea
        className={`${inputCls} mt-3 h-32`}
        placeholder="Paste post text here — multiple posts in one paste is fine"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </div>
  )
}

function CaptureForm({ onCaptured }: { onCaptured: () => void }) {
  const [source, setSource] = useState('fb_manual_capture')
  const [type, setType] = useState<'employer' | 'seeker'>('employer')
  const [name, setName] = useState('')
  const [region, setRegion] = useState('')
  const [role, setRole] = useState('')
  const [contact, setContact] = useState('')
  const [sourceRef, setSourceRef] = useState('')
  const [rawText, setRawText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!name.trim()) {
      toast.error('Name / business is required')
      return
    }
    setSubmitting(true)
    const structured: Record<string, unknown> = {
      type,
      display_name: name.trim(),
      region: region || null,
      role_or_category: role.trim() || null,
      contact: contact.trim() ? { url: contact.trim() } : null,
    }
    const { data, error } = await supabase.rpc('admin_lead_capture', {
      p_source: source,
      p_source_ref: sourceRef.trim() || null,
      p_raw_excerpt: rawText.trim() || null,
      p_structured: structured,
    })
    setSubmitting(false)
    if (error) {
      toast.error(`Capture failed: ${error.message}`)
      return
    }
    const outcome = (data as { outcome?: string })?.outcome
    if (outcome === 'inserted') {
      toast.success('Captured — pending your approval below')
      setName('')
      setRole('')
      setContact('')
      setSourceRef('')
      setRawText('')
      onCaptured()
    } else if (outcome === 'suppressed') {
      toast.warning('Refused: this lead is on the suppression list (previously opted out/rejected)')
    } else {
      toast.warning('Skipped: already exists as a lead or pending review')
    }
  }

  const inputCls =
    'border-border bg-surface w-full rounded-[8px] border px-3 py-2 text-sm outline-none focus:border-brand'

  return (
    <div className="bg-surface border-border rounded-[12px] border p-5">
      <h2 className="text-[15px] font-semibold" style={{ color: 'var(--color-text)' }}>
        Capture a lead
      </h2>
      <p className="mt-0.5 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
        Manual capture (you read it, you file it). Captures land in the staging queue below — not
        the live pipeline — until you approve them.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <select className={inputCls} value={source} onChange={(e) => setSource(e.target.value)}>
          {Object.entries(SOURCE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          className={inputCls}
          value={type}
          onChange={(e) => setType(e.target.value as 'employer' | 'seeker')}
        >
          <option value="employer">Employer</option>
          <option value="seeker">Seeker</option>
        </select>
        <input
          className={inputCls}
          placeholder="Name / business *"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select className={inputCls} value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="">Region…</option>
          {NZ_REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <input
          className={inputCls}
          placeholder="Role / category"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
        <input
          className={inputCls}
          placeholder="Public contact / profile URL"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
        />
        <input
          className={`${inputCls} lg:col-span-2`}
          placeholder="Post / listing permalink"
          value={sourceRef}
          onChange={(e) => setSourceRef(e.target.value)}
        />
        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="bg-brand rounded-[8px] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'Capturing…' : 'Capture'}
        </button>
      </div>
      <textarea
        className={`${inputCls} mt-3 h-20`}
        placeholder="Raw post text (optional context for review — purged with staging, never stored on the lead)"
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
      />
    </div>
  )
}

export function AdminLeadsStaging() {
  const [selected, setSelected] = useState<StagingRow | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [acting, setActing] = useState(false)

  async function act(kind: 'approve' | 'reject' | 'reject_suppress') {
    if (!selected) return
    setActing(true)
    const { error } =
      kind === 'approve'
        ? await supabase.rpc('admin_lead_approve', { p_staging_id: selected.id, p_notes: null })
        : await supabase.rpc('admin_lead_reject', {
            p_staging_id: selected.id,
            p_suppress: kind === 'reject_suppress',
            p_reason: null,
          })
    setActing(false)
    if (error) {
      toast.error(`Action failed: ${error.message}`)
      return
    }
    toast.success(
      kind === 'approve'
        ? 'Approved — now in the leads pipeline'
        : kind === 'reject_suppress'
          ? 'Rejected + suppressed — cannot be re-captured'
          : 'Rejected',
    )
    setSelected(null)
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="space-y-6">
      <h1
        className="text-[20px] leading-7 font-semibold"
        style={{ color: 'var(--color-text)', letterSpacing: '-0.01em' }}
      >
        Lead Staging
      </h1>
      <PastePanel onCaptured={() => setRefreshKey((k) => k + 1)} />
      <CaptureForm onCaptured={() => setRefreshKey((k) => k + 1)} />

      {selected && (
        <div className="bg-surface border-brand rounded-[12px] border-2 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 text-sm">
              <p className="font-semibold">{selected.structured.display_name ?? '(unnamed)'}</p>
              <p style={{ color: 'var(--color-text-muted)' }}>
                {selected.structured.type} · {selected.structured.region ?? 'no region'} ·{' '}
                {SOURCE_LABELS[selected.source]} · confidence{' '}
                {Math.round(selected.confidence * 100)}%
              </p>

              {/* Lane (Phase 1): A = contactable directly; B = no contact, routed
                  to the outreach queue with a drafted reply. */}
              {selected.structured.lane && (
                <p className="mt-1">
                  {selected.structured.lane === 'b' ? (
                    <span className="border-warn text-warn rounded border px-1.5 py-0.5 text-[11px] font-semibold">
                      Lane B · no contact → Outreach
                    </span>
                  ) : (
                    <span className="border-brand text-brand rounded border px-1.5 py-0.5 text-[11px] font-semibold">
                      Lane A · contactable
                    </span>
                  )}
                </p>
              )}

              {/* FB extract fields (Phase 1) */}
              {(selected.structured.shed_type ||
                selected.structured.herd_details ||
                selected.structured.application_method ||
                selected.structured.source_group) && (
                <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                  {selected.structured.shed_type && <span>🥛 {selected.structured.shed_type}</span>}
                  {selected.structured.herd_details && (
                    <span>🐄 {selected.structured.herd_details}</span>
                  )}
                  {selected.structured.application_method && (
                    <span>
                      <span style={{ color: 'var(--color-text-muted)' }}>Apply: </span>
                      {selected.structured.application_method}
                    </span>
                  )}
                  {selected.structured.source_group && (
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      group: {selected.structured.source_group}
                    </span>
                  )}
                </p>
              )}

              <div className="mt-1 flex flex-wrap items-center gap-2">
                {selected.structured.role_or_category && (
                  <span className="text-[13px] font-medium">
                    {selected.structured.role_or_category}
                  </span>
                )}
                {selected.structured.salary_text && (
                  <span className="text-[13px]">💰 {selected.structured.salary_text}</span>
                )}
                {/* Recruiter flag (044) — colour-coded amber so a genuine agency
                    placement is unmissable. The board-guard in normalise() stops
                    the listing site itself triggering this. */}
                {selected.structured.is_recruiter && (
                  <span className="border-warn text-warn rounded border px-1.5 py-0.5 text-[11px] font-semibold">
                    Recruiter-placed
                    {selected.structured.advertiser_name
                      ? ` · ${selected.structured.advertiser_name}`
                      : ''}
                  </span>
                )}
              </div>

              {/* Contact is the point of the panel — most prominent block, right
                  under the role. Shared with the approved pipeline. */}
              <LeadContactCard contact={selected.structured.contact} />

              {selected.structured.summary && (
                <p className="mt-2 text-[13px] leading-5" style={{ color: 'var(--color-text-muted)' }}>
                  {selected.structured.summary}
                </p>
              )}

              {selected.structured.company_profile_url && (
                <p className="mt-1 text-[12px]">
                  <a
                    className="text-brand underline"
                    href={selected.structured.company_profile_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Employer profile ↗
                  </a>
                </p>
              )}

              {selected.dedupe_status === 'suspect_duplicate' && (
                <p className="text-warn mt-1 text-[12px]">
                  ⚠ Possible duplicate of an existing lead — approve only if genuinely distinct.
                </p>
              )}
              {selected.missing_fields.length > 0 && (
                <p className="mt-1 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                  Missing: {selected.missing_fields.join(', ')}
                </p>
              )}
              {selected.raw_excerpt && (
                <p
                  className="bg-surface-2 mt-2 max-h-24 overflow-y-auto rounded p-2 text-[12px]"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {selected.raw_excerpt}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <button
                type="button"
                disabled={acting}
                onClick={() => act('approve')}
                className="bg-brand rounded-[8px] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() => act('reject')}
                className="border-border rounded-[8px] border px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Reject
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() => act('reject_suppress')}
                className="text-danger border-danger rounded-[8px] border px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Reject + suppress
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminTable<StagingRow>
        key={refreshKey}
        rpc="admin_leads_staging_list"
        searchable
        searchPlaceholder="Search staging by name, region, source…"
        emptyHeading="Staging queue is empty"
        emptyBody="Captured and collected leads appear here for your approval."
        errorCopy="Failed to load the staging queue. Refresh the page."
        onRowClick={(row) => setSelected(row)}
        columns={[
          { key: 'display_name', label: 'Name / business' },
          { key: 'contact', label: 'Contact' },
          { key: 'region', label: 'Region' },
          { key: 'via', label: 'Via' },
          { key: 'source', label: 'Source' },
          { key: 'confidence', label: 'Confidence' },
          { key: 'dedupe_status', label: 'Dedupe' },
        ]}
        renderRow={(row, onClick) => (
          <tr
            key={row.id}
            onClick={onClick}
            className="border-border hover:bg-surface-2/50 h-[52px] cursor-pointer border-t"
          >
            {/* B3: truncate long names (e.g. Tautara Matawhaura…) so the column
                grid stays aligned; full name on hover. */}
            <td className="px-3 font-medium">
              <div className="max-w-[220px] truncate" title={row.structured.display_name ?? ''}>
                {row.structured.display_name ?? '(unnamed)'}
              </div>
            </td>
            {/* B1: contact-at-a-glance — triage who's workable without opening each. */}
            <td className="px-3">
              <ContactGlyphs contact={row.structured.contact} />
            </td>
            <td className="px-3">{row.structured.region ?? '—'}</td>
            {/* B2: recruiter flag in-row — direct vs agency-placed. */}
            <td className="px-3 text-[12px]">
              {row.structured.is_recruiter ? (
                <span className="text-warn" title={row.structured.advertiser_name ?? 'agency-placed'}>
                  agency
                </span>
              ) : (
                <span style={{ color: 'var(--color-text-muted)' }}>direct</span>
              )}
            </td>
            <td className="px-3">{SOURCE_LABELS[row.source] ?? row.source}</td>
            <td className="px-3">{Math.round(row.confidence * 100)}%</td>
            <td className="px-3">
              {row.dedupe_status === 'suspect_duplicate' ? (
                <span className="text-warn">suspect</span>
              ) : (
                'unique'
              )}
            </td>
          </tr>
        )}
      />
    </div>
  )
}
