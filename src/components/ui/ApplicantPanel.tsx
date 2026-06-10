import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Tag } from '@/components/ui/Tag'
import { MatchCircle } from '@/components/ui/MatchCircle'
import { Select } from '@/components/ui/Select'
import { AICandidateSummary } from '@/components/ui/AICandidateSummary'
import { MatchBreakdown } from '@/components/ui/MatchBreakdown'
import { ApplicantDocuments } from '@/components/ui/ApplicantDocuments'
import { DocumentsVerifiedBadge } from '@/components/ui/DocumentsVerifiedBadge'
import { supabase } from '@/lib/supabase'
import type { ApplicationStatus, MatchScore, SeekerContact } from '@/types/domain'
import { VALID_TRANSITIONS, APPLICATION_STATUS_LABELS } from '@/types/domain'

type TagVariant = 'green' | 'warn' | 'blue' | 'grey' | 'orange' | 'purple' | 'red'

const STATUS_TAG_VARIANT: Record<ApplicationStatus, TagVariant> = {
  applied: 'blue',
  review: 'warn',
  interview: 'orange',
  shortlisted: 'purple',
  offered: 'green',
  hired: 'green',
  declined: 'red',
  withdrawn: 'grey',
}

interface SeekerProfile {
  id: string
  user_id?: string
  region?: string
  years_experience?: number
  sector_pref?: string[]
  visa_status?: string
  dairynz_level?: string
  couples_seeking?: boolean
  accommodation_needed?: boolean
  shed_types_experienced?: string[]
  herd_sizes_worked?: string[]
}

interface SeekerSkill {
  skill_id: string
  proficiency: string
  skills: { name: string; category: string }
}

interface ApplicantPanelApplication {
  id: string
  status: ApplicationStatus
  cover_note?: string
  created_at: string
  seeker_profiles: SeekerProfile
  seeker_skills?: SeekerSkill[]
  application_notes?: string
}

interface ApplicantPanelProps {
  application: ApplicantPanelApplication
  matchScore?: MatchScore | null
  contacts?: SeekerContact | null
  onTransition: (applicationId: string, newStatus: ApplicationStatus, note?: string) => void
  expanded: boolean
  onToggle: () => void
  isSelected?: boolean
  onSelect?: (id: string) => void
  aiSummary?: string | null
  onAiSummaryLoaded?: (appId: string, summary: string) => void
  jobId: string
}

const PROFICIENCY_VARIANT: Record<string, TagVariant> = {
  basic: 'grey',
  intermediate: 'warn',
  advanced: 'green',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-NZ', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getMatchHighlights(score: MatchScore, profile: SeekerProfile): string[] {
  const highlights: string[] = []
  const bd = score.breakdown

  if (bd.shed_type > 15) highlights.push('Rotary/herringbone shed experience')
  if (bd.location >= 16)
    highlights.push(profile.region ? `Same region (${profile.region})` : 'Location match')
  else if (bd.location > 0) highlights.push('Open to relocation')
  if (bd.accommodation > 15) highlights.push('Accommodation needs match')
  if (bd.visa > 0) highlights.push('Eligible to work in NZ')
  if (bd.skills > 20) highlights.push('Strong skill alignment')
  if (bd.salary > 0) highlights.push('Salary expectations compatible')

  return highlights.slice(0, 3)
}

export function ApplicantPanel({
  application,
  matchScore,
  contacts,
  onTransition,
  expanded,
  onToggle,
  isSelected,
  onSelect,
  aiSummary,
  onAiSummaryLoaded,
  jobId,
}: ApplicantPanelProps) {
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | ''>('')
  const [transitionNote, setTransitionNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [activeTab, setActiveTab] = useState<'cv' | 'match' | 'interview' | 'notes'>('cv')
  const [notes, setNotes] = useState(application.application_notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  // Phase 21 plan 21-08 — Track B "Documents Verified" badge predicate.
  // Lightweight head-count query (status='approved' filter, limit 1) — we only need the boolean,
  // not the rows. ApplicantDocuments still does its own fetch for the document list; this is
  // a separate one-row check scoped to the panel header so the badge surfaces without expanding.
  // PRIV-02 baseline preserved: no identity-document filtering needed here (status='approved' is
  // orthogonal to document_type; the identity-exclusion lives in ApplicantDocuments / Edge fn).
  const [hasVerifiedDocuments, setHasVerifiedDocuments] = useState(false)

  const seeker = application.seeker_profiles

  useEffect(() => {
    const seekerId = application.seeker_profiles?.id
    if (!seekerId) return
    let cancelled = false
    supabase
      .from('seeker_documents')
      .select('id', { head: true, count: 'exact' })
      .eq('seeker_id', seekerId)
      .eq('status', 'approved')
      .limit(1)
      .then(({ count }) => {
        if (!cancelled) setHasVerifiedDocuments((count ?? 0) > 0)
      })
    return () => {
      cancelled = true
    }
  }, [application.seeker_profiles?.id])
  const validNext = VALID_TRANSITIONS[application.status]
  const isFinalStage = validNext.length === 0

  const transitionOptions = validNext.map((s) => ({
    value: s,
    label:
      s === 'shortlisted' ? 'Shortlist — unlocks contact details' : APPLICATION_STATUS_LABELS[s],
  }))

  const seekerLabel = [
    seeker.region ? `Seeker from ${seeker.region}` : 'Seeker',
    seeker.years_experience != null ? `${seeker.years_experience}yr experience` : null,
  ]
    .filter(Boolean)
    .join(' - ')

  function handleUpdateStatus() {
    if (!selectedStatus) return
    onTransition(application.id, selectedStatus as ApplicationStatus, transitionNote || undefined)
    setSelectedStatus('')
    setTransitionNote('')
    setShowNote(false)
  }

  const highlights = matchScore ? getMatchHighlights(matchScore, seeker) : []

  return (
    <div className="bg-surface border-border overflow-hidden rounded-[12px] border-[1.5px]">
      {/* Collapsed row */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'hover:bg-surface-2/40 flex w-full items-center gap-4 p-4 text-left transition-colors',
          expanded && 'border-border border-b',
        )}
      >
        {/* Checkbox for bulk selection */}
        {onSelect && (
          <input
            type="checkbox"
            checked={isSelected ?? false}
            onChange={() => onSelect?.(application.id)}
            onClick={(e) => e.stopPropagation()}
            className="border-border text-brand focus:ring-brand h-4 w-4 flex-shrink-0 rounded"
          />
        )}

        {/* Seeker label */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-body text-text truncate text-[14px] font-semibold">{seekerLabel}</p>
            {/* Phase 21 plan 21-08 — Track B: visible to employer when seeker has ≥1 approved doc. */}
            <DocumentsVerifiedBadge hasVerifiedDocuments={hasVerifiedDocuments} />
          </div>
          {application.seeker_skills && application.seeker_skills.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {application.seeker_skills.slice(0, 3).map((sk) => (
                <Tag key={sk.skill_id} variant="grey" className="px-2 py-0.5 text-[10px]">
                  {sk.skills.name}
                </Tag>
              ))}
            </div>
          )}
        </div>

        {/* Match circle */}
        {matchScore != null && (
          <MatchCircle score={matchScore.total_score} size="sm" className="flex-shrink-0" />
        )}

        {/* Applied date + status tag */}
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <Tag variant={STATUS_TAG_VARIANT[application.status]}>
            {APPLICATION_STATUS_LABELS[application.status]}
          </Tag>
          <span className="font-body text-text-subtle text-[11px]">
            {formatDate(application.created_at)}
          </span>
        </div>

        {/* Chevron */}
        <div className="text-text-muted flex-shrink-0">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="space-y-4 p-4">
          {/* AI Summary */}
          <AICandidateSummary
            applicationId={application.id}
            jobId={jobId}
            seekerId={application.seeker_profiles?.id ?? ''}
            cachedSummary={aiSummary ?? null}
            onSummaryLoaded={(summary) => onAiSummaryLoaded?.(application.id, summary)}
            isExpanded={expanded}
          />

          {/* Tab bar */}
          <div className="border-border flex border-b">
            {(['cv', 'match', 'interview', 'notes'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'font-body px-4 py-2 text-[13px] font-semibold capitalize transition-colors',
                  activeTab === tab
                    ? 'text-brand border-brand border-b-2'
                    : 'text-text-muted hover:text-text',
                )}
              >
                {tab === 'cv'
                  ? 'CV'
                  : tab === 'match'
                    ? 'Match Breakdown'
                    : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* CV tab — existing content */}
          {activeTab === 'cv' && (
            <div className="space-y-5">
              {/* Match highlights */}
              {highlights.length > 0 && (
                <div>
                  <p
                    className="font-body mb-2 text-[11px] font-semibold tracking-wide uppercase"
                    style={{ color: 'var(--color-text-subtle)' }}
                  >
                    Match Highlights
                  </p>
                  <ul className="space-y-1">
                    {highlights.map((h) => (
                      <li
                        key={h}
                        className="font-body text-text-muted flex items-center gap-2 text-[13px]"
                      >
                        <span className="bg-brand h-1.5 w-1.5 flex-shrink-0 rounded-full" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Seeker profile details */}
              <div>
                <p
                  className="font-body mb-2 text-[11px] font-semibold tracking-wide uppercase"
                  style={{ color: 'var(--color-text-subtle)' }}
                >
                  Seeker Profile
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {seeker.region && (
                    <div>
                      <span className="font-body text-text-subtle text-[11px]">Region</span>
                      <p className="font-body text-text text-[13px]">{seeker.region}</p>
                    </div>
                  )}
                  {seeker.years_experience != null && (
                    <div>
                      <span className="font-body text-text-subtle text-[11px]">Experience</span>
                      <p className="font-body text-text text-[13px]">
                        {seeker.years_experience} years
                      </p>
                    </div>
                  )}
                  {seeker.visa_status && (
                    <div>
                      <span className="font-body text-text-subtle text-[11px]">Visa Status</span>
                      <p className="font-body text-text text-[13px] capitalize">
                        {seeker.visa_status.replace(/_/g, ' ')}
                      </p>
                    </div>
                  )}
                  {seeker.dairynz_level && (
                    <div>
                      <span className="font-body text-text-subtle text-[11px]">DairyNZ Level</span>
                      <p className="font-body text-text text-[13px] capitalize">
                        {seeker.dairynz_level.replace(/_/g, ' ')}
                      </p>
                    </div>
                  )}
                  {seeker.shed_types_experienced && seeker.shed_types_experienced.length > 0 && (
                    <div>
                      <span className="font-body text-text-subtle text-[11px]">Shed Types</span>
                      <p className="font-body text-text text-[13px] capitalize">
                        {seeker.shed_types_experienced.join(', ')}
                      </p>
                    </div>
                  )}
                  {seeker.herd_sizes_worked && seeker.herd_sizes_worked.length > 0 && (
                    <div>
                      <span className="font-body text-text-subtle text-[11px]">Herd Sizes</span>
                      <p className="font-body text-text text-[13px]">
                        {seeker.herd_sizes_worked.join(', ')}
                      </p>
                    </div>
                  )}
                  {seeker.couples_seeking != null && (
                    <div>
                      <span className="font-body text-text-subtle text-[11px]">
                        Couples Seeking
                      </span>
                      <p className="font-body text-text text-[13px]">
                        {seeker.couples_seeking ? 'Yes' : 'No'}
                      </p>
                    </div>
                  )}
                  {seeker.accommodation_needed != null && (
                    <div>
                      <span className="font-body text-text-subtle text-[11px]">
                        Accommodation Needed
                      </span>
                      <p className="font-body text-text text-[13px]">
                        {seeker.accommodation_needed ? 'Yes' : 'No'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Skills section */}
              {application.seeker_skills && application.seeker_skills.length > 0 && (
                <div>
                  <p
                    className="font-body mb-2 text-[11px] font-semibold tracking-wide uppercase"
                    style={{ color: 'var(--color-text-subtle)' }}
                  >
                    Skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {application.seeker_skills.map((sk) => (
                      <div key={sk.skill_id} className="flex items-center gap-1.5">
                        <span className="font-body text-text text-[12px]">{sk.skills.name}</span>
                        <Tag
                          variant={PROFICIENCY_VARIANT[sk.proficiency] ?? 'grey'}
                          className="text-[10px]"
                        >
                          {sk.proficiency}
                        </Tag>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents — visible to employer for any application status.
                  Identity exclusion enforced at three layers: Edge Function +
                  listing query filter + bucketing loop. See ApplicantDocuments. */}
              <ApplicantDocuments
                applicationId={application.id}
                seekerId={application.seeker_profiles.id}
              />

              {/* Contact Details — only shown for shortlisted/offered/hired */}
              {['shortlisted', 'offered', 'hired'].includes(application.status) && (
                <div>
                  <p
                    className="font-body mb-2 text-[11px] font-semibold tracking-wide uppercase"
                    style={{ color: 'var(--color-text-subtle)' }}
                  >
                    Contact Details
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    <div>
                      <span className="font-body text-text-subtle text-[11px]">Phone</span>
                      {contacts ? (
                        contacts.phone ? (
                          <p className="font-body text-text text-[13px]">{contacts.phone}</p>
                        ) : (
                          <p className="font-body text-text-subtle text-[13px] italic">
                            Not provided
                          </p>
                        )
                      ) : (
                        <p className="text-text-muted font-mono text-[13px] blur-sm select-none">
                          ••• ••• ••••
                        </p>
                      )}
                    </div>
                    <div>
                      <span className="font-body text-text-subtle text-[11px]">Email</span>
                      {contacts ? (
                        <p className="font-body text-text text-[13px]">{contacts.email}</p>
                      ) : (
                        <p className="text-text-muted font-mono text-[13px] blur-sm select-none">
                          j•••@gmail.com
                        </p>
                      )}
                    </div>
                  </div>
                  {!contacts && (
                    <p className="font-body text-text-subtle mt-2 text-[11px] tracking-wide uppercase italic">
                      Contact details unlock when you shortlist this candidate.
                    </p>
                  )}
                </div>
              )}

              {/* Cover note */}
              {application.cover_note && (
                <div>
                  <p
                    className="font-body mb-2 text-[11px] font-semibold tracking-wide uppercase"
                    style={{ color: 'var(--color-text-subtle)' }}
                  >
                    Cover Note
                  </p>
                  <blockquote className="border-border font-body text-text-muted border-l-[3px] pl-3 text-[13px] italic">
                    {application.cover_note}
                  </blockquote>
                </div>
              )}

              {/* Pipeline stage */}
              <div>
                <p
                  className="font-body mb-2 text-[11px] font-semibold tracking-wide uppercase"
                  style={{ color: 'var(--color-text-subtle)' }}
                >
                  Pipeline Stage
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Tag variant={STATUS_TAG_VARIANT[application.status]}>
                    {APPLICATION_STATUS_LABELS[application.status]}
                  </Tag>
                </div>

                {isFinalStage ? (
                  <p className="font-body text-text-subtle mt-2 text-[13px] italic">Final stage</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    <Select
                      label="Move to"
                      placeholder="Select next stage..."
                      options={transitionOptions}
                      value={selectedStatus}
                      onValueChange={(v) => setSelectedStatus(v as ApplicationStatus)}
                    />

                    <button
                      type="button"
                      onClick={() => setShowNote((p) => !p)}
                      className="font-body text-text-muted hover:text-text text-[12px] transition-colors"
                    >
                      {showNote ? 'Hide note' : '+ Add transition note'}
                    </button>

                    {showNote && (
                      <textarea
                        rows={2}
                        placeholder="Optional note..."
                        value={transitionNote}
                        onChange={(e) => setTransitionNote(e.target.value)}
                        className="border-border font-body text-text bg-surface-2 focus:border-brand-hover w-full resize-none rounded-[8px] border-[1.5px] px-3 py-2 text-[13px] focus:outline-none"
                      />
                    )}

                    <button
                      type="button"
                      onClick={handleUpdateStatus}
                      disabled={!selectedStatus}
                      className={cn(
                        'font-body rounded-[8px] px-4 py-2 text-[13px] font-semibold transition-colors',
                        selectedStatus
                          ? 'bg-brand hover:bg-brand-hover text-white'
                          : 'bg-surface-2 text-text-subtle cursor-not-allowed',
                      )}
                    >
                      Update Status
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Match Breakdown tab */}
          {activeTab === 'match' && matchScore && <MatchBreakdown score={matchScore} />}
          {activeTab === 'match' && !matchScore && (
            <p className="font-body text-text-subtle text-[13px] italic">
              No match score available for this applicant.
            </p>
          )}

          {/* Interview tab */}
          {activeTab === 'interview' && (
            <p className="font-body text-text-muted py-4 text-[14px]">
              Interview scheduling is coming in a future release.
            </p>
          )}

          {/* Notes tab */}
          {activeTab === 'notes' && (
            <div className="space-y-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add private notes about this applicant..."
                rows={4}
                className="border-border font-body text-text bg-surface focus:border-brand w-full resize-none rounded-[8px] border-[1.5px] px-3 py-2 text-[13px] focus:outline-none"
              />
              <button
                type="button"
                onClick={async () => {
                  setSavingNotes(true)
                  await supabase
                    .from('applications')
                    .update({ application_notes: notes })
                    .eq('id', application.id)
                  setSavingNotes(false)
                  toast.success('Notes saved')
                }}
                disabled={savingNotes}
                className={cn(
                  'font-body rounded-[8px] px-3 py-1.5 text-[12px] font-semibold transition-colors',
                  'bg-brand hover:bg-brand-hover text-white disabled:opacity-50',
                )}
              >
                {savingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
