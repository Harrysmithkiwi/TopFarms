import { useState } from 'react'
import { toast } from 'sonner'
import { Link2, ClipboardPaste, Ban } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { CONTRACT_TYPE_PREFS } from '@/lib/constants'
import { AdminTable } from '@/components/admin/AdminTable'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { KpiCard } from '@/components/admin/KpiCard'
import { DrawerShell, DrawerSection } from '@/components/admin/DrawerShell'
import { PasteCapture } from '@/components/admin/PasteCapture'
import { Button } from '@/components/ui/Button'
import { Tag } from '@/components/ui/Tag'

/**
 * Seeker staging — the captured-job-seeker queue.
 *
 * A sibling route rather than a filter on Lead Staging: the two lanes share the
 * `lead_staging` table and the same dedupe, but a filter changes WHICH ROWS you see
 * while this changes what the table IS (different columns, different decision). The
 * employer queue asks "is this a real farm hiring"; this one asks "is this someone
 * worth messaging". Volumes diverge too — the seeker lane is the one aiming at four
 * figures.
 *
 * ponytail: a list, not the triage stream. The stream (one post at a time, copy-DM,
 * one keystroke) is what makes 1000 tractable — this gets the data visible and
 * measurable first. Upgrade when the queue stops fitting on a screen.
 */

interface SeekerDetail {
  roles_sought?: string[]
  /** DB tokens from `CONTRACT_TYPES` — the terms they want. Mirrors migration 090. */
  contract_type_pref?: string[]
  skills?: string[]
  licences?: string[]
  sheds_experienced?: string[]
  availability?: string | null
  accommodation_needed?: string | null
  household?: string | null
  couple_seeking?: boolean
  location_constraint?: string | null
  training_wanted?: string[]
}

type SeekerStagingRow = {
  id: string
  created_at: string
  source: string | null
  source_ref: string | null
  raw_excerpt: string | null
  confidence: number
  dedupe_status: 'unique' | 'suspect_duplicate' | 'exact_duplicate'
  outreach_status: string | null
  sent_at: string | null
  responded_at: string | null
  /** Attribution: this captured post produced an account. See migration 082. */
  signed_up: boolean
  structured: {
    display_name?: string | null
    region?: string | null
    locality?: string | null
    role_or_category?: string | null
    contact?: { email?: string; phone?: string; url?: string; name?: string; notes?: string } | null
    seeker?: SeekerDetail | null
  }
}

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'where', label: 'Region · Locality', sortKey: 'region' },
  { key: 'roles', label: 'Roles sought' },
  { key: 'skills', label: 'Skills' },
  { key: 'training', label: 'Training wanted' },
  { key: 'captured', label: 'Captured', sortKey: 'captured' },
  { key: 'status', label: 'Status' },
  { key: 'link', label: 'Link' },
]

// px-4 matches AdminTable's own <th> padding — a different value here puts every cell
// out of step with its header.
const cell = 'px-4 align-middle text-[13px]'

/**
 * The signup link to DM this person. Built here rather than by hand: a hand-typed URL
 * with an empty or wrong `ref` silently loses the attribution — the signup still
 * works, so nothing ever tells you it was lost.
 *
 * The ref is the first 8 hex characters of the staging row id, not the full UUID. A
 * 36-character tracking token in a cold Facebook DM reads as spam to exactly the
 * person you are trying to earn trust from, and 8 hex is a 4.3-billion space — no
 * collisions across the current queue, and none plausible at any size this reaches.
 *
 * www, not the apex: the apex 308s, and a redirect can drop the query string.
 */
function outreachLink(stagingId: string): string {
  return `https://www.topfarms.co.nz/signup?role=seeker&ref=${stagingId.slice(0, 8)}`
}

async function copyOutreachLink(stagingId: string, name: string | null | undefined) {
  try {
    await navigator.clipboard.writeText(outreachLink(stagingId))
    toast.success(`Signup link copied${name ? ` for ${name}` : ''}`)
  } catch {
    toast.error('Could not copy — your browser blocked clipboard access.')
  }
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function regionLocality(s: SeekerStagingRow['structured']): string {
  return [s.region, s.locality].filter(Boolean).join(' · ') || '—'
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '' || value === false) return null
  return (
    <div className="flex gap-3 py-1 text-[13px]">
      <span className="w-[150px] shrink-0" style={{ color: 'var(--color-text-subtle)' }}>
        {label}
      </span>
      <span className="text-text">{value}</span>
    </div>
  )
}

function list(v?: string[] | null): string | null {
  return v && v.length ? v.join(', ') : null
}

/**
 * DB tokens → the words farmers use, borrowed from `CONTRACT_TYPE_PREFS`. Showing the raw
 * token would put "casual" in front of a reviewer reading a post that says "relief only",
 * and relief is the word that actually appears in 9 of the 23 corpus posts.
 */
const CONTRACT_LABELS: Record<string, string> = Object.fromEntries(
  CONTRACT_TYPE_PREFS.map((c) => [c.value, c.label]),
)

function terms(v?: string[] | null): string | null {
  return v && v.length ? v.map((t) => CONTRACT_LABELS[t] ?? t).join(' · ') : null
}

/** Where a seeker sits in the funnel. Signed up wins — it is the only outcome. */
function statusOf(row: SeekerStagingRow): { label: string; variant: 'green' | 'warn' | 'grey' } {
  if (row.signed_up) return { label: 'Signed up', variant: 'green' }
  if (row.responded_at) return { label: 'Replied', variant: 'warn' }
  if (row.sent_at) return { label: 'Messaged', variant: 'grey' }
  return { label: 'To review', variant: 'grey' }
}

/**
 * Record that a seeker asked not to be contacted.
 *
 * This screen had no such control at all. 087 closed the gap for PROMOTED leads
 * (`admin_lead_suppress` + a button on Leads), but the seeker lane never promotes — outreach
 * state lives on `lead_staging` and the only action here was "copy link". So a reply of
 * "stop" to a DM had nowhere to go, which is the failure UEMA 2007 actually cares about.
 *
 * `admin_lead_reject` already accepted `p_suppress`; it just had no caller on this screen.
 * Migration 092 makes the suppression it writes hold across a second Facebook handle.
 *
 * Two-step rather than a confirm dialog: a browser modal blocks the extension driving this
 * page, and suppression is not reversible from any UI.
 */
function OptOutControl({ row, onDone }: { row: SeekerStagingRow; onDone: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)

  async function suppress() {
    setSaving(true)
    const { error } = await supabase.rpc('admin_lead_reject', {
      p_staging_id: row.id,
      p_suppress: true,
      p_reason: 'opted_out',
    })
    setSaving(false)
    if (error) {
      toast.error(`Could not record the opt-out: ${error.message}`)
      return
    }
    toast.success('Opt-out recorded — they will not resurface on a re-capture')
    onDone()
  }

  if (!confirming) {
    return (
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setConfirming(true)}>
        <Ban size={14} aria-hidden="true" />
        They asked not to be contacted
      </Button>
    )
  }

  return (
    <div className="border-border space-y-2 rounded-8 border-[1.5px] p-3">
      <p className="text-[13px] leading-6" style={{ color: 'var(--color-text)' }}>
        Records the opt-out and removes them from the queue. Re-capturing this post — or the
        same post under a different handle — will be blocked from here on. This cannot be
        undone from the admin screens.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="sm" disabled={saving} onClick={() => void suppress()}>
          {saving ? 'Recording…' : 'Record opt-out'}
        </Button>
        <Button variant="outline" size="sm" disabled={saving} onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

export function AdminSeekerStaging() {
  const [rows, setRows] = useState<SeekerStagingRow[]>([])
  const [capturing, setCapturing] = useState(false)
  const [selected, setSelected] = useState<SeekerStagingRow | null>(null)
  // Remounts AdminTable so a fresh capture appears without a page reload — same
  // refreshKey pattern the employer queue uses.
  const [refreshKey, setRefreshKey] = useState(0)

  // Counted from the loaded page, not the whole queue — an honest page-level tally
  // beats a second round-trip while the volumes are small.
  const signedUp = rows.filter((r) => r.signed_up).length
  const messaged = rows.filter((r) => r.sent_at && !r.signed_up).length
  const toReview = rows.filter((r) => !r.sent_at && !r.signed_up).length

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Leads"
        title="Seeker staging"
        description="Captured job-seeker posts. Nothing goes live until you approve it here."
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="To review" value={toReview} />
        <KpiCard label="Messaged" value={messaged} />
        <KpiCard label="Replied" value={rows.filter((r) => r.responded_at).length} />
        <KpiCard label="Signed up" value={signedUp} />
      </div>

      <AdminTable<SeekerStagingRow>
        key={refreshKey}
        rpc="admin_leads_staging_list"
        inCard
        searchable
        onRowsChange={setRows}
        onRowClick={(row) => setSelected(row)}
        searchPlaceholder="Search seekers by name, region, locality, post text…"
        extraArgs={{ p_type: 'seeker', p_geo: 'all' }}
        columns={COLUMNS}
        defaultSort={{ key: 'captured', dir: 'desc' }}
        emptyHeading="No seeker posts captured yet"
        emptyBody="Use Capture / Paste post above to add a job-seeker post from a Facebook group."
        errorCopy="We could not load the seeker queue."
        renderRow={(row) => {
          const s = row.structured
          const d = s.seeker ?? {}
          const status = statusOf(row)
          const skills = d.skills ?? []
          const training = d.training_wanted ?? []
          // Cells only — AdminTable owns the <tr> (hover, click, height). Returning a
          // <tr> here nests one inside another; the browser hoists it out and every
          // column silently stops lining up with its header.
          return (
            <>
              <td className={cell}>
                <div className="flex items-center gap-2">
                  <span className="text-text font-medium">{s.display_name ?? '—'}</span>
                  {row.dedupe_status === 'suspect_duplicate' && (
                    <Tag variant="warn">Possible duplicate</Tag>
                  )}
                  {d.couple_seeking && <Tag variant="grey">Couple</Tag>}
                </div>
              </td>
              <td className={cell} style={{ color: 'var(--color-text-muted)' }}>
                {regionLocality(s)}
              </td>
              <td className={cell} style={{ color: 'var(--color-text-muted)' }}>
                {(d.roles_sought ?? []).join(', ') || '—'}
              </td>
              <td className={cell} style={{ color: 'var(--color-text-muted)' }}>
                {skills.length ? `${skills.length}` : '—'}
              </td>
              <td className={cell}>
                {/* The funding signal. Shown as words, not a count — the specific gap
                    is the thing worth reading at a glance. */}
                {training.length ? (
                  <span className="text-warn-text-on-bg">{training.join(', ')}</span>
                ) : (
                  <span style={{ color: 'var(--color-text-subtle)' }}>—</span>
                )}
              </td>
              <td className={cell} style={{ color: 'var(--color-text-muted)' }}>
                {fmtDate(row.created_at)}
              </td>
              <td className={cell}>
                <Tag variant={status.variant}>{status.label}</Tag>
              </td>
              <td className={cell} onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => void copyOutreachLink(row.id, s.display_name)}
                  className="border-border text-text hover:border-brand-hover focus-visible:outline-brand inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-8 border-[1.5px] px-2.5 py-1.5 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 md:min-h-[32px]"
                >
                  <Link2 size={13} aria-hidden="true" />
                  Copy link
                </button>
              </td>
            </>
          )
        }}
      />

      {selected && (
        <DrawerShell
          label={selected.structured.display_name ?? 'Seeker'}
          onClose={() => setSelected(null)}
        >
          {/* The post first, in full. Every extracted field below is a claim ABOUT this
              text — you cannot judge the extraction, or write a DM that sounds like a
              human read it, from a summary. */}
          <DrawerSection label="The post">
            <p
              className="text-[13px] leading-6 whitespace-pre-wrap"
              style={{ color: 'var(--color-text)' }}
            >
              {selected.raw_excerpt?.trim() || 'No post text was captured for this lead.'}
            </p>
          </DrawerSection>

          <DrawerSection label="Contact">
            <Field label="Email" value={selected.structured.contact?.email} />
            <Field label="Phone" value={selected.structured.contact?.phone} />
            <Field label="Profile" value={selected.structured.contact?.url} />
            <Field label="Notes" value={selected.structured.contact?.notes} />
            {!selected.structured.contact?.email &&
              !selected.structured.contact?.phone &&
              !selected.structured.contact?.url && (
                <p className="text-[13px]" style={{ color: 'var(--color-text-subtle)' }}>
                  No contact details in the post — reply to the post or DM them on the platform
                  you found it.
                </p>
              )}
          </DrawerSection>

          <DrawerSection label="What they're after">
            <Field label="Region · Locality" value={regionLocality(selected.structured)} />
            <Field label="Roles sought" value={list(selected.structured.seeker?.roles_sought)} />
            {/* Terms sit directly under the role because they are the pair that decides
                whether a job is even worth showing them — and terms are the more common
                statement of the two in these posts. */}
            <Field label="Terms" value={terms(selected.structured.seeker?.contract_type_pref)} />
            <Field label="Their words" value={selected.structured.role_or_category} />
            <Field label="Available" value={selected.structured.seeker?.availability} />
            <Field
              label="Accommodation"
              value={selected.structured.seeker?.accommodation_needed}
            />
            <Field label="Household" value={selected.structured.seeker?.household} />
            <Field
              label="Must stay near"
              value={selected.structured.seeker?.location_constraint}
            />
            <Field
              label="Partner also seeking"
              value={selected.structured.seeker?.couple_seeking ? 'Yes' : null}
            />
          </DrawerSection>

          <DrawerSection label="What they can do">
            <Field label="Skills" value={list(selected.structured.seeker?.skills)} />
            <Field label="Sheds worked" value={list(selected.structured.seeker?.sheds_experienced)} />
            <Field label="Licences" value={list(selected.structured.seeker?.licences)} />
            <Field
              label="Training wanted"
              value={
                selected.structured.seeker?.training_wanted?.length ? (
                  <span className="text-warn-text-on-bg">
                    {selected.structured.seeker.training_wanted.join(', ')}
                  </span>
                ) : null
              }
            />
          </DrawerSection>

          <DrawerSection label="Outreach">
            <Field label="Source" value={selected.source} />
            <Field label="Original post" value={selected.source_ref} />
            <Field label="Confidence" value={`${Math.round(selected.confidence * 100)}%`} />
            <div className="flex flex-col gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 self-start"
                onClick={() => void copyOutreachLink(selected.id, selected.structured.display_name)}
              >
                <Link2 size={14} />
                Copy signup link
              </Button>
              <OptOutControl
                row={selected}
                onDone={() => {
                  setSelected(null)
                  setRefreshKey((k) => k + 1)
                }}
              />
            </div>
          </DrawerSection>
        </DrawerShell>
      )}

      {capturing && (
        <DrawerShell label="Capture seeker post" onClose={() => setCapturing(false)}>
          {/* Same component as the employer queue: lead-intake classifies employer vs
              seeker itself, so a post pasted here still lands in the right queue —
              and one pasted on the employer screen lands here if it is a seeker. */}
          <PasteCapture
            onCaptured={() => setRefreshKey((k) => k + 1)}
            blurb="Paste a job-seeker post — someone describing what they can do and what they're after. Skills, tickets, housing needs and any training gaps are extracted automatically; nothing goes live until you approve it."
            placeholder="Paste the post here — e.g. “currently on the hunt for a fulltime Dairy Farm Assistant… 3-4 bedroom will be a must…”. Screenshots work too (Cmd/Ctrl+V)."
          />
        </DrawerShell>
      )}
    </div>
  )
}
