import { useState } from 'react'
import { toast } from 'sonner'
import { ClipboardPaste, DollarSign, MapPin, ExternalLink, AlertTriangle } from 'lucide-react'
import { AdminTable } from '@/components/admin/AdminTable'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { DrawerShell, DrawerSection } from '@/components/admin/DrawerShell'
import { ContactGlyphs, LeadContactCard, type LeadContact } from '@/components/admin/LeadContact'
import { Button } from '@/components/ui/Button'
import { Tag } from '@/components/ui/Tag'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { supabase } from '@/lib/supabase'
import { NZ_REGIONS } from '@/lib/constants'
import {
  formatLeadName,
  regionLocalityLabel,
  leadLocality,
  matchSnippet,
  highlightParts,
  sourceLabel,
  SOURCE_LABELS,
} from '@/lib/leadDisplay'

/**
 * /admin/leads/staging — the approval queue (primary) with capture demoted
 * behind one button (Phase 28). The approval gate here IS the privacy
 * checkpoint: nothing reaches the live leads table except through
 * admin_lead_approve. Pasting FB posts is the most frequent GTM action, so the
 * "Capture / Paste post" button stays one obvious click away.
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
    locality?: string | null // P-8 — populated by the GATE-2 lead-intake change
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
    // Leads v2 segmentation (migration 061 backfill + lead-intake forward extraction).
    applications_close?: string | null // ISO date; drives the "Likely expired" badge.
    geo_scope?: 'nz' | 'intl' | 'unknown'
  }
  confidence: number
  missing_fields: string[]
  dedupe_status: 'unique' | 'suspect_duplicate' | 'exact_duplicate'
  dedupe_match_id: string | null
}

const inputCls =
  'border-border bg-surface w-full rounded-[8px] border px-3 py-2 text-sm outline-none focus:border-brand'

/** Paste-batch capture — the primary, most-frequent path. Text OR screenshot. */
function PasteCapture({ onCaptured }: { onCaptured: () => void }) {
  // Default to manual-capture: most pastes are other people's groups (NZ Dairy
  // Jobs etc.), not our own group. fb_own_group is the exception, selectable below.
  const [source, setSource] = useState('fb_manual_capture')
  const [text, setText] = useState('')
  const [image, setImage] = useState<{ data: string; mediaType: string; name: string } | null>(null)
  const [busy, setBusy] = useState(false)

  // Read a dropped/selected screenshot into base64 (no data: prefix) for the
  // Leads v2 vision lane. A screenshot is rarely from your own FB group, so it
  // defaults the source to Manual / screenshot.
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result)
      setImage({
        data: result.slice(result.indexOf(',') + 1),
        mediaType: file.type || 'image/png',
        name: file.name,
      })
      setSource('manual_paste')
    }
    reader.readAsDataURL(file)
  }

  // L1 batch lane (§9.2): paste one or MANY posts, and/or a screenshot;
  // lead-intake structures them with Claude (vision for the image) server-side.
  async function submit() {
    if (!text.trim() && !image) return
    setBusy(true)
    const item: Record<string, unknown> = {}
    if (text.trim()) item.raw_text = text
    if (image) {
      item.image = image.data
      item.image_media_type = image.mediaType
    }
    const { data, error } = await supabase.functions.invoke('lead-intake', {
      body: { source, items: [item] },
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
    setImage(null)
    onCaptured()
  }

  return (
    <DrawerSection label="Paste posts or drop a screenshot">
      <p className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
        Paste one or many posts, or add a screenshot of a listing — structuring, dedupe and
        suppression run automatically; results land in the queue for your approval.
      </p>
      <select className={inputCls} value={source} onChange={(e) => setSource(e.target.value)}>
        <option value="fb_own_group">FB (own group)</option>
        <option value="fb_manual_capture">FB (manual capture)</option>
        <option value="manual_paste">Manual / screenshot</option>
      </select>
      <textarea
        className={`${inputCls} h-40`}
        placeholder="Paste post text here — multiple posts in one paste is fine (or just add a screenshot below)"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="border-border text-brand hover:bg-surface-2 cursor-pointer rounded-[8px] border px-3 py-2 text-[13px] font-semibold">
          <input type="file" accept="image/*" className="hidden" onChange={onFile} />
          {image ? 'Change screenshot' : 'Add screenshot'}
        </label>
        {image && (
          <>
            <span
              className="max-w-[160px] truncate text-[12px]"
              style={{ color: 'var(--color-text-muted)' }}
              title={image.name}
            >
              {image.name}
            </span>
            <button
              type="button"
              className="text-[12px] underline"
              style={{ color: 'var(--color-text-subtle)' }}
              onClick={() => setImage(null)}
            >
              Remove
            </button>
          </>
        )}
      </div>
      <Button
        variant="primary"
        size="sm"
        disabled={busy || (!text.trim() && !image)}
        onClick={submit}
      >
        {busy ? 'Structuring…' : 'Stage batch'}
      </Button>
    </DrawerSection>
  )
}

/** Manual field-by-field capture — the secondary path. */
function ManualCapture({ onCaptured }: { onCaptured: () => void }) {
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
      toast.success('Captured — pending your approval in the queue')
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

  return (
    <DrawerSection label="Manual capture">
      <p className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
        You read it, you file it. Captures land in the queue — not the live pipeline — until you
        approve them.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          className={`${inputCls} sm:col-span-2`}
          placeholder="Post / listing permalink"
          value={sourceRef}
          onChange={(e) => setSourceRef(e.target.value)}
        />
      </div>
      <textarea
        className={`${inputCls} h-20`}
        placeholder="Raw post text (optional context for review — purged with staging, never stored on the lead)"
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
      />
      <Button variant="outline" size="sm" disabled={submitting} onClick={submit}>
        {submitting ? 'Capturing…' : 'Capture lead'}
      </Button>
    </DrawerSection>
  )
}

/**
 * Compact lane badge for the staging row (T-1). Mirrors the drawer's semantics:
 * A = contactable (green), B = no contact → Outreach (blue). Unknown → muted dash.
 * Full meaning sits in the title; the column stays narrow to honour T-3's no-wrap.
 */
function LaneTag({ lane }: { lane?: 'a' | 'b' }) {
  if (lane === 'a')
    return (
      <Tag variant="green" title="Lane A · contactable">
        A
      </Tag>
    )
  if (lane === 'b')
    return (
      <Tag variant="blue" title="Lane B · no contact → Outreach">
        B
      </Tag>
    )
  // Unknown lane → blank, not a dash (a dash reads as a failed load).
  return null
}

/** YYYY-MM-DD string compare (timezone-proof) — the ad's close date is past. */
function isLikelyExpired(closeDate?: string | null): boolean {
  return !!closeDate && closeDate < new Date().toLocaleDateString('en-CA')
}

/** Detail rows: small uppercase label + value (replaces emoji-prefixed fields). */
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

function StagingDrawer({
  row,
  acting,
  onAct,
  onClose,
}: {
  row: StagingRow
  acting: boolean
  onAct: (kind: 'approve' | 'reject' | 'reject_suppress') => void
  onClose: () => void
}) {
  const s = row.structured
  const locality = leadLocality(s)
  const hasDetailFields = s.shed_type || s.herd_details || s.application_method || s.source_group

  return (
    <DrawerShell
      label="Lead"
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={acting}
            onClick={() => onAct('reject_suppress')}
          >
            Reject + suppress
          </Button>
          <Button variant="outline" size="sm" disabled={acting} onClick={() => onAct('reject')}>
            Reject
          </Button>
          <Button variant="primary" size="sm" disabled={acting} onClick={() => onAct('approve')}>
            {acting ? 'Working…' : 'Approve'}
          </Button>
        </div>
      }
    >
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
          {s.type ?? 'lead'} · {sourceLabel(row.source)} · confidence{' '}
          {Math.round(row.confidence * 100)}%
        </div>
        {(s.region || locality) && (
          <div
            className="flex items-center gap-1.5 text-[13px]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <MapPin size={14} />
            {regionLocalityLabel(s)}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {s.lane === 'b' ? (
            <Tag variant="blue">Lane B · no contact → Outreach</Tag>
          ) : s.lane === 'a' ? (
            <Tag variant="green">Lane A · contactable</Tag>
          ) : null}
          {s.is_recruiter && (
            <Tag variant="grey">
              Recruiter-placed{s.advertiser_name ? ` · ${s.advertiser_name}` : ''}
            </Tag>
          )}
          {row.dedupe_status === 'suspect_duplicate' && (
            <Tag variant="warn">Possible duplicate</Tag>
          )}
          {isLikelyExpired(s.applications_close) && (
            <Tag variant="warn" title={`Applications closed ${s.applications_close}`}>
              Likely expired
            </Tag>
          )}
          {s.geo_scope === 'intl' && <Tag variant="grey">International</Tag>}
        </div>
      </div>

      {/* Role + salary */}
      {(s.role_or_category || s.salary_text) && (
        <DrawerSection label="Role">
          {s.role_or_category && (
            <div className="text-[14px] font-medium" style={{ color: 'var(--color-text)' }}>
              {s.role_or_category}
            </div>
          )}
          {s.salary_text && (
            <div
              className="flex items-center gap-1.5 text-[13px]"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <DollarSign size={14} />
              {s.salary_text}
            </div>
          )}
        </DrawerSection>
      )}

      {/* FB extract fields */}
      {hasDetailFields && (
        <DrawerSection label="Details">
          {s.shed_type && <DetailRow label="Shed">{s.shed_type}</DetailRow>}
          {s.herd_details && <DetailRow label="Herd">{s.herd_details}</DetailRow>}
          {s.application_method && <DetailRow label="Apply">{s.application_method}</DetailRow>}
          {s.source_group && <DetailRow label="Group">{s.source_group}</DetailRow>}
        </DrawerSection>
      )}

      {/* Contact — the work-the-lead target */}
      <DrawerSection label="Contact">
        <LeadContactCard contact={s.contact} />
        {s.company_profile_url && (
          <a
            className="text-brand inline-flex items-center gap-1 text-[13px] underline"
            href={s.company_profile_url}
            target="_blank"
            rel="noreferrer"
          >
            Employer profile <ExternalLink size={13} />
          </a>
        )}
      </DrawerSection>

      {/* Summary / notes */}
      {(s.summary ||
        row.missing_fields.length > 0 ||
        row.dedupe_status === 'suspect_duplicate') && (
        <DrawerSection label="Notes">
          {s.summary && (
            <p className="text-[13px] leading-5" style={{ color: 'var(--color-text-muted)' }}>
              {s.summary}
            </p>
          )}
          {row.dedupe_status === 'suspect_duplicate' && (
            <p className="text-warn flex items-start gap-1.5 text-[12px]">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              Possible duplicate of an existing lead — approve only if genuinely distinct.
            </p>
          )}
          {row.missing_fields.length > 0 && (
            <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
              Missing: {row.missing_fields.join(', ')}
            </p>
          )}
        </DrawerSection>
      )}

      {/* Raw post */}
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
    </DrawerShell>
  )
}

type SourceFilter = 'mine' | 'harvested' | 'all'
// Leads v2: NZ + unknown are the actionable queue; intl is parked for future
// expansion. 'nz_unknown' is the default so overseas listings don't clutter it.
type GeoFilter = 'nz_unknown' | 'intl' | 'all'

export function AdminLeadsStaging() {
  const [selected, setSelected] = useState<StagingRow | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [acting, setActing] = useState(false)
  // Default to MY hand-captures — the work the founder chases — not the harvested
  // wall. (T-2; the RPC defaults to 'all', so this front-end default is what makes
  // "Mine" the morning view.)
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('mine')
  // Leads v2 segmentation. Default: NZ + unknown, expired shown (badged, not hidden).
  const [geoFilter, setGeoFilter] = useState<GeoFilter>('nz_unknown')
  const [hideExpired, setHideExpired] = useState(false)

  const bumpRefresh = () => setRefreshKey((k) => k + 1)

  // Filter-aware empty state. With Mine as the default, a quiet morning shows the
  // "mine" slice empty — which must NOT read as "the whole queue is empty" when
  // harvested rows are still sitting under Harvested/All.
  const emptyCopy = {
    mine: {
      heading: 'No hand-captured leads waiting',
      body: 'Your captures land here for approval. Switch to Harvested or All to see collected leads — or use Capture / Paste post to add one.',
    },
    harvested: {
      heading: 'No harvested leads waiting',
      body: 'Harvested listings (e.g. NZ Farming Jobs) appear here. Switch to Mine or All to see the rest.',
    },
    all: {
      heading: 'Staging queue is empty',
      body: 'Captured and collected leads appear here for your approval. Use Capture / Paste post to add some.',
    },
  }[sourceFilter]

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
    bumpRefresh()
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Leads"
        title="Lead Staging"
        description="Review captured leads and approve them into the pipeline. Nothing goes live until you approve it here."
        action={
          <Button
            variant="primary"
            size="sm"
            className="gap-1.5"
            onClick={() => setCapturing(true)}
          >
            <ClipboardPaste size={15} />
            Capture / Paste post
          </Button>
        }
      />

      <AdminTable<StagingRow>
        key={refreshKey}
        rpc="admin_leads_staging_list"
        inCard
        searchable
        searchPlaceholder="Search staging by name, region, locality, source…"
        extraArgs={{ p_source: sourceFilter, p_geo: geoFilter, p_hide_expired: hideExpired }}
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl<SourceFilter>
              aria-label="Filter leads by source"
              value={sourceFilter}
              onChange={setSourceFilter}
              options={[
                { value: 'mine', label: 'Mine' },
                { value: 'harvested', label: 'Harvested' },
                { value: 'all', label: 'All' },
              ]}
            />
            <SegmentedControl<GeoFilter>
              aria-label="Filter leads by location"
              value={geoFilter}
              onChange={setGeoFilter}
              options={[
                { value: 'nz_unknown', label: 'NZ' },
                { value: 'intl', label: 'International' },
                { value: 'all', label: 'All' },
              ]}
            />
            <label
              className="flex cursor-pointer items-center gap-1.5 text-[13px]"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <input
                type="checkbox"
                checked={hideExpired}
                onChange={(e) => setHideExpired(e.target.checked)}
              />
              Hide expired
            </label>
          </div>
        }
        emptyHeading={emptyCopy.heading}
        emptyBody={emptyCopy.body}
        errorCopy="Failed to load the staging queue. Refresh the page."
        onRowClick={(row) => setSelected(row)}
        // T-1: triage the queue at a glance. Lane (was drawer-only) + Captured +
        // Confidence join the row, and the four triage dimensions are sortable
        // server-side (the queue spans pages, so a client sort would only order
        // the loaded slice). Added columns are narrow + nowrap to keep T-3's
        // no-wrap promise. Dedupe stays a glanceable inline Tag under the name.
        defaultSort={{ key: 'captured', dir: 'desc' }}
        columns={[
          { key: 'display_name', label: 'Name / business' },
          { key: 'lane', label: 'Lane', sortKey: 'lane' },
          { key: 'contact', label: 'Contact' },
          { key: 'region', label: 'Region · locality', sortKey: 'region' },
          { key: 'captured', label: 'Captured', sortKey: 'captured' },
          { key: 'confidence', label: 'Confidence', sortKey: 'confidence' },
          { key: 'source', label: 'Source' },
        ]}
        renderRow={(row, _onClick, search) => {
          // P-10 — when the search matched hidden raw-post text (e.g. a locality
          // not shown in any column), surface why the row matched.
          const visible = `${row.structured.display_name ?? ''} ${row.structured.region ?? ''} ${regionLocalityLabel(row.structured)}`
          const snippet =
            search && !visible.toLowerCase().includes(search.toLowerCase().trim())
              ? matchSnippet(row.raw_excerpt, search)
              : null
          // Return cells only — AdminTable provides the <tr> (hover/click/height).
          return (
            <>
              <td className="px-4 font-medium">
                <div className="flex max-w-[260px] items-center gap-2">
                  <span className="truncate" title={row.structured.display_name ?? ''}>
                    {formatLeadName(row.structured.display_name)}
                  </span>
                  {/* Only actionable dedupe signal stays glanceable; the rest is in the drawer. */}
                  {row.dedupe_status === 'suspect_duplicate' && (
                    <Tag variant="warn" className="shrink-0">
                      possible duplicate
                    </Tag>
                  )}
                  {isLikelyExpired(row.structured.applications_close) && (
                    <Tag variant="warn" className="shrink-0">
                      expired
                    </Tag>
                  )}
                  {row.structured.geo_scope === 'intl' && (
                    <Tag variant="grey" className="shrink-0">
                      intl
                    </Tag>
                  )}
                </div>
                {snippet && (
                  <div
                    className="max-w-[260px] truncate text-[12px]"
                    style={{ color: 'var(--color-text-subtle)' }}
                    title={row.raw_excerpt ?? ''}
                  >
                    matched:{' '}
                    {highlightParts(snippet, search).map((p, i) =>
                      p.match ? (
                        <strong key={i} style={{ color: 'var(--color-text)', fontWeight: 600 }}>
                          {p.text}
                        </strong>
                      ) : (
                        <span key={i}>{p.text}</span>
                      ),
                    )}
                  </div>
                )}
              </td>
              <td className="px-4">
                <LaneTag lane={row.structured.lane} />
              </td>
              <td className="px-4">
                <ContactGlyphs contact={row.structured.contact} />
              </td>
              <td className="px-4 text-[13px] whitespace-nowrap">
                {regionLocalityLabel(row.structured)}
              </td>
              <td
                className="px-4 text-[13px] whitespace-nowrap"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {new Date(row.created_at).toLocaleDateString('en-NZ', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </td>
              <td
                className="px-4 text-[13px] whitespace-nowrap"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {Math.round(row.confidence * 100)}%
              </td>
              <td className="px-4 text-[13px] whitespace-nowrap">{sourceLabel(row.source)}</td>
            </>
          )
        }}
      />

      {capturing && (
        <DrawerShell label="Capture lead" onClose={() => setCapturing(false)}>
          <PasteCapture onCaptured={bumpRefresh} />
          <ManualCapture onCaptured={bumpRefresh} />
        </DrawerShell>
      )}

      {selected && (
        <StagingDrawer
          row={selected}
          acting={acting}
          onAct={act}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
