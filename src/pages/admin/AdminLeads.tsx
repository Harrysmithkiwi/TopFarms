import { useState } from 'react'
import { DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { AdminTable } from '@/components/admin/AdminTable'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { LeadsFunnel } from '@/components/admin/LeadsFunnel'
import { DrawerShell, DrawerSection } from '@/components/admin/DrawerShell'
import { ContactGlyphs, LeadContactCard, type LeadContact } from '@/components/admin/LeadContact'
import { Tag } from '@/components/ui/Tag'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

/**
 * /admin/leads — the pipeline view (L0, PHASE-LEADS-DESIGN §6).
 * Two axes (design 2026-06-16): status = lifecycle (new/contacted/onboarded/dead
 * /follow_up); category = classification (domestic/overseas). Park-with-reason-
 * and-when via admin_lead_categorise. Conversion linking (L4) unchanged.
 *
 * v2: folded into the shared admin design system — DrawerShell detail (was an
 * inline border-2 panel), Tag/Button instead of emoji + bare buttons, cells-only
 * rows inside a carded AdminTable — so it matches Staging/Outreach.
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
  contact: LeadContact | null
  notes: string | null
  status: 'new' | 'contacted' | 'onboarded' | 'dead' | 'follow_up'
  status_changed_at: string
  converted_user_id: string | null
  category: 'domestic' | 'overseas'
  follow_up_date: string | null
  salary_text: string | null
  summary: string | null
  advertiser_name: string | null
  is_recruiter: boolean
  // Lane-A outreach (migration 064)
  drafted_email: { subject: string; body: string } | null
  draft_model: string | null
  contacted_at: string | null
}

const inputCls =
  'border-border bg-surface rounded-[8px] border px-2 py-1 text-sm outline-none focus:border-brand'

// Quick lifecycle buttons. follow_up is set via the categorise form (it needs a
// date), so it's not a one-click button here.
const STATUSES: LeadRow['status'][] = ['new', 'contacted', 'onboarded', 'dead']

interface Suggestion {
  lead_id: string
  candidate_user_id: string
  candidate_email: string
  match: 'email' | 'farm_name'
}

/**
 * Park-with-reason-and-when. One gate-guarded call (admin_lead_categorise) sets
 * category + follow-up date + notes; entering a follow-up date parks the lead
 * (status='follow_up'); clearing it wipes the date. Mounted with key={lead.id}
 * so its state resets per selection — no useEffect.
 */
function CategoriseForm({ lead, onSaved }: { lead: LeadRow; onSaved: () => void }) {
  const [category, setCategory] = useState<LeadRow['category']>(lead.category)
  const [followUp, setFollowUp] = useState(lead.follow_up_date ?? '')
  const [notes, setNotes] = useState(lead.notes ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const clearing = !followUp && !!lead.follow_up_date
    const { error } = await supabase.rpc('admin_lead_categorise', {
      p_lead_id: lead.id,
      p_status: followUp ? 'follow_up' : null, // a follow-up date parks the lead
      p_category: category,
      p_follow_up_date: followUp || null,
      p_notes: notes.trim() || null,
      p_clear_follow_up_date: clearing,
    })
    setSaving(false)
    if (error) {
      toast.error(`Save failed: ${error.message}`)
      return
    }
    toast.success('Lead updated')
    onSaved()
  }

  return (
    <DrawerSection label="Park / categorise">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1.5">
          Category
          <select
            className={inputCls}
            value={category}
            onChange={(e) => setCategory(e.target.value as LeadRow['category'])}
          >
            <option value="domestic">domestic</option>
            <option value="overseas">overseas</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          Follow-up
          <input
            type="date"
            className={inputCls}
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
          />
        </label>
        {followUp && (
          <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
            → parks as <span className="font-semibold">follow_up</span>
          </span>
        )}
      </div>
      <textarea
        className={`${inputCls} mt-2 h-16 w-full`}
        placeholder="Notes — why parked / context for when you pick this up"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <Button size="sm" disabled={saving} onClick={save} className="mt-2">
        {saving ? 'Saving…' : 'Save categorisation'}
      </Button>
    </DrawerSection>
  )
}

/**
 * Lane-A outreach loop (v2 #1): draft → edit → copy/open → mark contacted, for
 * leads that carry a contact email. Mirrors Lane B's send loop. Keyed by lead id
 * so state resets per selection.
 */
function DraftOutreach({ lead, onContacted }: { lead: LeadRow; onContacted: () => void }) {
  const email = lead.contact?.email
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(
    lead.drafted_email ?? null,
  )
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!email) return null // Lane A only — no email means Lane B / the outreach queue.

  async function generate() {
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('lead-draft-email', {
      body: { lead_id: lead.id },
    })
    setBusy(false)
    if (error) {
      toast.error(`Draft failed: ${error.message}`)
      return
    }
    const d = data as { subject: string; body: string; model: string }
    setDraft({ subject: d.subject, body: d.body })
    toast.success(`Drafted (${d.model})`)
  }

  async function save() {
    if (!draft) return
    setSaving(true)
    const { error } = await supabase.rpc('admin_lead_save_draft', {
      p_lead_id: lead.id,
      p_draft: draft,
    })
    setSaving(false)
    if (error) {
      toast.error(`Save failed: ${error.message}`)
      return
    }
    toast.success('Draft saved')
  }

  function copyOpen() {
    if (!draft) return
    void navigator.clipboard?.writeText(draft.body).catch(() => {})
    const mailto = `mailto:${email}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`
    window.open(mailto, '_blank')
    toast.success('Body copied + email opened')
  }

  async function markContacted() {
    const { error } = await supabase.rpc('admin_lead_mark_contacted', { p_lead_id: lead.id })
    if (error) {
      toast.error(`Failed: ${error.message}`)
      return
    }
    toast.success('Marked contacted')
    onContacted()
  }

  return (
    <DrawerSection label="Outreach email">
      {lead.contacted_at && (
        <Tag variant="green">
          Contacted {new Date(lead.contacted_at).toLocaleDateString('en-NZ')}
        </Tag>
      )}
      {!draft ? (
        <Button variant="outline" size="sm" disabled={busy} onClick={generate}>
          {busy ? 'Drafting…' : 'Draft email'}
        </Button>
      ) : (
        <div className="space-y-2">
          <input
            className={`${inputCls} w-full`}
            value={draft.subject}
            onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            placeholder="Subject"
          />
          <textarea
            className={`${inputCls} h-48 w-full`}
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={copyOpen}>
              Copy &amp; open email
            </Button>
            <Button variant="outline" size="sm" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : 'Save draft'}
            </Button>
            <Button variant="ghost" size="sm" disabled={busy} onClick={generate}>
              {busy ? 'Drafting…' : 'Redraft'}
            </Button>
            <Button variant="ghost" size="sm" onClick={markContacted}>
              Mark contacted
            </Button>
          </div>
        </div>
      )}
    </DrawerSection>
  )
}

function LeadDrawer({
  lead,
  suggestions,
  onClose,
  onSetStatus,
  onLoadSuggestions,
  onLinkUser,
  onSaved,
}: {
  lead: LeadRow
  suggestions: Suggestion[] | null
  onClose: () => void
  onSetStatus: (s: LeadRow['status']) => void
  onLoadSuggestions: (leadId: string) => void
  onLinkUser: (userId: string) => void
  onSaved: () => void
}) {
  return (
    <DrawerShell label="Lead" onClose={onClose}>
      {/* Header */}
      <div className="space-y-2">
        <h2
          className="text-[20px] leading-7 font-semibold"
          style={{ color: 'var(--color-text)', letterSpacing: '-0.01em' }}
          title={lead.display_name}
        >
          {lead.display_name}
        </h2>
        <div className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
          {lead.type} · {lead.region ?? 'no region'} · currently{' '}
          <span className="font-semibold">{lead.status}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {lead.category === 'overseas' && <Tag variant="grey">Overseas</Tag>}
          {lead.is_recruiter && (
            <Tag variant="grey" title={lead.advertiser_name ?? 'agency-placed'}>
              Recruiter-placed{lead.advertiser_name ? ` · ${lead.advertiser_name}` : ''}
            </Tag>
          )}
          {lead.status === 'follow_up' && lead.follow_up_date && (
            <Tag variant="blue">Follow-up {lead.follow_up_date}</Tag>
          )}
        </div>
      </div>

      {/* Role + salary */}
      {(lead.role_or_category || lead.salary_text) && (
        <DrawerSection label="Role">
          {lead.role_or_category && (
            <div className="text-[14px] font-medium" style={{ color: 'var(--color-text)' }}>
              {lead.role_or_category}
            </div>
          )}
          {lead.salary_text && (
            <div
              className="flex items-center gap-1.5 text-[13px]"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <DollarSign size={14} />
              {lead.salary_text}
            </div>
          )}
        </DrawerSection>
      )}

      {/* Contact — the work-the-lead target. Shared card with staging. */}
      <DrawerSection label="Contact">
        <LeadContactCard contact={lead.contact} />
      </DrawerSection>

      {/* Lane-A outreach loop — draft/send/track for contactable leads (v2 #1). */}
      <DraftOutreach key={lead.id} lead={lead} onContacted={onSaved} />

      {lead.summary && (
        <DrawerSection label="Notes">
          <p className="text-[13px] leading-5" style={{ color: 'var(--color-text-muted)' }}>
            {lead.summary}
          </p>
        </DrawerSection>
      )}

      {/* Change status — quick lifecycle actions (were bare buttons on a panel). */}
      <DrawerSection label="Change status">
        <div className="flex flex-wrap gap-2">
          {STATUSES.filter((s) => s !== lead.status).map((s) => (
            <Button key={s} variant="outline" size="sm" onClick={() => onSetStatus(s)}>
              {s}
            </Button>
          ))}
        </div>
      </DrawerSection>

      {/* Park / categorise — keyed by lead id so local state resets per selection. */}
      <CategoriseForm key={lead.id} lead={lead} onSaved={onSaved} />

      {/* Conversion linking (L4) */}
      <DrawerSection label="Account link">
        {lead.converted_user_id ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Linked to account <span className="font-mono">{lead.converted_user_id}</span>.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => onLoadSuggestions(lead.id)}
            >
              Find account matches
            </Button>
            {suggestions !== null &&
              (suggestions.length === 0 ? (
                <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                  No matching accounts (exact contact email or similar farm name).
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {suggestions.map((sug) => (
                    <Button
                      key={sug.candidate_user_id}
                      variant="outline"
                      size="sm"
                      className="w-fit gap-2"
                      onClick={() => onLinkUser(sug.candidate_user_id)}
                    >
                      <span>{sug.candidate_email}</span>
                      <span className="text-[11px] opacity-60">match: {sug.match}</span>
                    </Button>
                  ))}
                </div>
              ))}
          </div>
        )}
      </DrawerSection>
    </DrawerShell>
  )
}

export function AdminLeads() {
  const [selected, setSelected] = useState<LeadRow | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)

  // L4 conversion linking: suggestions surface candidate accounts (exact
  // contact-email or fuzzy farm_name); the human confirms the link.
  async function loadSuggestions(leadId: string) {
    setSuggestions(null)
    const { data, error } = await supabase.rpc('admin_lead_conversion_suggestions')
    if (error) {
      toast.error(`Could not load matches: ${error.message}`)
      return
    }
    setSuggestions(((data as Suggestion[] | null) ?? []).filter((s) => s.lead_id === leadId))
  }

  async function linkUser(userId: string) {
    if (!selected) return
    const { error } = await supabase.rpc('admin_lead_link_user', {
      p_lead_id: selected.id,
      p_user_id: userId,
    })
    if (error) {
      toast.error(`Link failed: ${error.message}`)
      return
    }
    toast.success('Linked to account — marked onboarded')
    setSelected(null)
    setSuggestions(null)
    setRefreshKey((k) => k + 1)
  }

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
      <AdminPageHeader
        eyebrow="Leads"
        title="Leads Pipeline"
        description="Approved leads only — everything here passed your staging review. Click a row to work it."
      />

      <LeadsFunnel refreshKey={refreshKey} />

      {selected && (
        <LeadDrawer
          lead={selected}
          suggestions={suggestions}
          onClose={() => {
            setSelected(null)
            setSuggestions(null)
          }}
          onSetStatus={setStatus}
          onLoadSuggestions={loadSuggestions}
          onLinkUser={linkUser}
          onSaved={() => {
            setSelected(null)
            setRefreshKey((k) => k + 1)
          }}
        />
      )}

      <AdminTable<LeadRow>
        key={refreshKey}
        rpc="admin_leads_list"
        inCard
        searchable
        searchPlaceholder="Search by name, region, status, source…"
        emptyHeading="No leads yet"
        emptyBody="Approve captures from the staging queue to build the pipeline."
        errorCopy="Failed to load leads. Refresh the page."
        onRowClick={(row) => {
          setSelected(row)
          setSuggestions(null)
        }}
        columns={[
          { key: 'display_name', label: 'Name / business' },
          { key: 'contact', label: 'Contact' },
          { key: 'type', label: 'Type' },
          { key: 'region', label: 'Region' },
          { key: 'status', label: 'Status' },
          { key: 'source', label: 'Source' },
          { key: 'status_changed_at', label: 'Updated' },
        ]}
        renderRow={(row) => (
          <>
            <td className="px-4 font-medium">
              <div className="max-w-[220px] truncate" title={row.display_name}>
                {row.display_name}
              </div>
            </td>
            {/* A2: contact-at-a-glance so the pipeline is workable from the list. */}
            <td className="px-4">
              <ContactGlyphs contact={row.contact} />
            </td>
            <td className="px-4">{row.type}</td>
            <td className="px-4">{row.region ?? '—'}</td>
            <td className="px-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold">{row.status}</span>
                {row.category === 'overseas' && <Tag variant="grey">Overseas</Tag>}
                {row.status === 'follow_up' && row.follow_up_date && (
                  <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                    {row.follow_up_date}
                  </span>
                )}
              </div>
            </td>
            <td className="px-4">{row.source}</td>
            <td className="px-4">
              {new Date(row.status_changed_at).toLocaleDateString('en-NZ', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </td>
          </>
        )}
      />
    </div>
  )
}
