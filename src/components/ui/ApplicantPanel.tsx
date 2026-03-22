import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Tag } from '@/components/ui/Tag'
import { MatchCircle } from '@/components/ui/MatchCircle'
import { Select } from '@/components/ui/Select'
import { AICandidateSummary } from '@/components/ui/AICandidateSummary'
import { MatchBreakdown } from '@/components/ui/MatchBreakdown'
import { supabase } from '@/lib/supabase'
import type { ApplicationStatus, MatchScore, SeekerContact } from '@/types/domain'
import { VALID_TRANSITIONS, APPLICATION_STATUS_LABELS } from '@/types/domain'

type TagVariant = 'green' | 'hay' | 'blue' | 'grey' | 'orange' | 'purple' | 'red'

const STATUS_TAG_VARIANT: Record<ApplicationStatus, TagVariant> = {
  applied:     'blue',
  review:      'hay',
  interview:   'orange',
  shortlisted: 'purple',
  offered:     'green',
  hired:       'green',
  declined:    'red',
  withdrawn:   'grey',
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
  basic:        'grey',
  intermediate: 'hay',
  advanced:     'green',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-NZ', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getMatchHighlights(score: MatchScore, profile: SeekerProfile): string[] {
  const highlights: string[] = []
  const bd = score.breakdown

  if (bd.shed_type > 15) highlights.push('Rotary/herringbone shed experience')
  if (bd.location >= 16) highlights.push(profile.region ? `Same region (${profile.region})` : 'Location match')
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

  const seeker = application.seeker_profiles
  const validNext = VALID_TRANSITIONS[application.status]
  const isFinalStage = validNext.length === 0

  const transitionOptions = validNext.map((s) => ({
    value: s,
    label: s === 'shortlisted' ? 'Shortlist — unlocks contact details' : APPLICATION_STATUS_LABELS[s],
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
    <div className="bg-white border-[1.5px] border-fog rounded-[12px] overflow-hidden">
      {/* Collapsed row */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-4 p-4 text-left hover:bg-mist/40 transition-colors',
          expanded && 'border-b border-fog',
        )}
      >
        {/* Checkbox for bulk selection */}
        {onSelect && (
          <input
            type="checkbox"
            checked={isSelected ?? false}
            onChange={() => onSelect?.(application.id)}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-fog text-moss focus:ring-moss flex-shrink-0"
          />
        )}

        {/* Seeker label */}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-body font-semibold text-ink truncate">{seekerLabel}</p>
          {application.seeker_skills && application.seeker_skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {application.seeker_skills.slice(0, 3).map((sk) => (
                <Tag key={sk.skill_id} variant="grey" className="text-[10px] py-0.5 px-2">
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
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <Tag variant={STATUS_TAG_VARIANT[application.status]}>
            {APPLICATION_STATUS_LABELS[application.status]}
          </Tag>
          <span className="text-[11px] font-body text-light">{formatDate(application.created_at)}</span>
        </div>

        {/* Chevron */}
        <div className="flex-shrink-0 text-mid">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="p-4 space-y-4">
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
          <div className="flex border-b border-fog">
            {(['cv', 'match', 'interview', 'notes'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-2 text-[13px] font-body font-semibold capitalize transition-colors',
                  activeTab === tab
                    ? 'text-moss border-b-2 border-moss'
                    : 'text-mid hover:text-ink',
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
                    className="text-[11px] font-body font-semibold uppercase tracking-wide mb-2"
                    style={{ color: 'var(--color-light)' }}
                  >
                    Match Highlights
                  </p>
                  <ul className="space-y-1">
                    {highlights.map((h) => (
                      <li key={h} className="flex items-center gap-2 text-[13px] font-body text-mid">
                        <span className="w-1.5 h-1.5 rounded-full bg-moss flex-shrink-0" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Seeker profile details */}
              <div>
                <p
                  className="text-[11px] font-body font-semibold uppercase tracking-wide mb-2"
                  style={{ color: 'var(--color-light)' }}
                >
                  Seeker Profile
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {seeker.region && (
                    <div>
                      <span className="text-[11px] font-body text-light">Region</span>
                      <p className="text-[13px] font-body text-ink">{seeker.region}</p>
                    </div>
                  )}
                  {seeker.years_experience != null && (
                    <div>
                      <span className="text-[11px] font-body text-light">Experience</span>
                      <p className="text-[13px] font-body text-ink">{seeker.years_experience} years</p>
                    </div>
                  )}
                  {seeker.visa_status && (
                    <div>
                      <span className="text-[11px] font-body text-light">Visa Status</span>
                      <p className="text-[13px] font-body text-ink capitalize">
                        {seeker.visa_status.replace(/_/g, ' ')}
                      </p>
                    </div>
                  )}
                  {seeker.dairynz_level && (
                    <div>
                      <span className="text-[11px] font-body text-light">DairyNZ Level</span>
                      <p className="text-[13px] font-body text-ink capitalize">
                        {seeker.dairynz_level.replace(/_/g, ' ')}
                      </p>
                    </div>
                  )}
                  {seeker.shed_types_experienced && seeker.shed_types_experienced.length > 0 && (
                    <div>
                      <span className="text-[11px] font-body text-light">Shed Types</span>
                      <p className="text-[13px] font-body text-ink capitalize">
                        {seeker.shed_types_experienced.join(', ')}
                      </p>
                    </div>
                  )}
                  {seeker.herd_sizes_worked && seeker.herd_sizes_worked.length > 0 && (
                    <div>
                      <span className="text-[11px] font-body text-light">Herd Sizes</span>
                      <p className="text-[13px] font-body text-ink">{seeker.herd_sizes_worked.join(', ')}</p>
                    </div>
                  )}
                  {seeker.couples_seeking != null && (
                    <div>
                      <span className="text-[11px] font-body text-light">Couples Seeking</span>
                      <p className="text-[13px] font-body text-ink">{seeker.couples_seeking ? 'Yes' : 'No'}</p>
                    </div>
                  )}
                  {seeker.accommodation_needed != null && (
                    <div>
                      <span className="text-[11px] font-body text-light">Accommodation Needed</span>
                      <p className="text-[13px] font-body text-ink">
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
                    className="text-[11px] font-body font-semibold uppercase tracking-wide mb-2"
                    style={{ color: 'var(--color-light)' }}
                  >
                    Skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {application.seeker_skills.map((sk) => (
                      <div key={sk.skill_id} className="flex items-center gap-1.5">
                        <span className="text-[12px] font-body text-ink">{sk.skills.name}</span>
                        <Tag variant={PROFICIENCY_VARIANT[sk.proficiency] ?? 'grey'} className="text-[10px]">
                          {sk.proficiency}
                        </Tag>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Details — only shown for shortlisted/offered/hired */}
              {['shortlisted', 'offered', 'hired'].includes(application.status) && (
                <div>
                  <p
                    className="text-[11px] font-body font-semibold uppercase tracking-wide mb-2"
                    style={{ color: 'var(--color-light)' }}
                  >
                    Contact Details
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    <div>
                      <span className="text-[11px] font-body text-light">Phone</span>
                      {contacts ? (
                        contacts.phone ? (
                          <p className="text-[13px] font-body text-ink">{contacts.phone}</p>
                        ) : (
                          <p className="text-[13px] font-body text-light italic">Not provided</p>
                        )
                      ) : (
                        <p className="font-mono text-[13px] text-mid select-none blur-sm">••• ••• ••••</p>
                      )}
                    </div>
                    <div>
                      <span className="text-[11px] font-body text-light">Email</span>
                      {contacts ? (
                        <p className="text-[13px] font-body text-ink">{contacts.email}</p>
                      ) : (
                        <p className="font-mono text-[13px] text-mid select-none blur-sm">j•••@gmail.com</p>
                      )}
                    </div>
                  </div>
                  {!contacts && (
                    <p className="mt-2 text-[11px] font-body uppercase tracking-wide text-light italic">
                      Contact details unlock when you shortlist this candidate.
                    </p>
                  )}
                </div>
              )}

              {/* Cover note */}
              {application.cover_note && (
                <div>
                  <p
                    className="text-[11px] font-body font-semibold uppercase tracking-wide mb-2"
                    style={{ color: 'var(--color-light)' }}
                  >
                    Cover Note
                  </p>
                  <blockquote className="border-l-[3px] border-fog pl-3 text-[13px] font-body text-mid italic">
                    {application.cover_note}
                  </blockquote>
                </div>
              )}

              {/* Pipeline stage */}
              <div>
                <p
                  className="text-[11px] font-body font-semibold uppercase tracking-wide mb-2"
                  style={{ color: 'var(--color-light)' }}
                >
                  Pipeline Stage
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <Tag variant={STATUS_TAG_VARIANT[application.status]}>
                    {APPLICATION_STATUS_LABELS[application.status]}
                  </Tag>
                </div>

                {isFinalStage ? (
                  <p className="mt-2 text-[13px] font-body text-light italic">Final stage</p>
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
                      className="text-[12px] font-body text-mid hover:text-ink transition-colors"
                    >
                      {showNote ? 'Hide note' : '+ Add transition note'}
                    </button>

                    {showNote && (
                      <textarea
                        rows={2}
                        placeholder="Optional note..."
                        value={transitionNote}
                        onChange={(e) => setTransitionNote(e.target.value)}
                        className="w-full border-[1.5px] border-fog rounded-[8px] px-3 py-2 text-[13px] font-body text-ink bg-mist focus:outline-none focus:border-fern resize-none"
                      />
                    )}

                    <button
                      type="button"
                      onClick={handleUpdateStatus}
                      disabled={!selectedStatus}
                      className={cn(
                        'px-4 py-2 rounded-[8px] text-[13px] font-body font-semibold transition-colors',
                        selectedStatus
                          ? 'bg-moss text-white hover:bg-fern'
                          : 'bg-fog text-light cursor-not-allowed',
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
          {activeTab === 'match' && matchScore && (
            <MatchBreakdown score={matchScore} />
          )}
          {activeTab === 'match' && !matchScore && (
            <p className="text-[13px] font-body text-light italic">
              No match score available for this applicant.
            </p>
          )}

          {/* Interview tab */}
          {activeTab === 'interview' && (
            <p className="text-[14px] font-body text-mid py-4">
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
                className="w-full border-[1.5px] border-fog rounded-[8px] px-3 py-2 text-[13px] font-body text-ink bg-white focus:outline-none focus:border-moss resize-none"
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
                  'px-3 py-1.5 rounded-[8px] text-[12px] font-body font-semibold transition-colors',
                  'bg-moss text-white hover:bg-fern disabled:opacity-50',
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
