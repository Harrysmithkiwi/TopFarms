import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tag } from '@/components/ui/Tag'
import { MatchCircle } from '@/components/ui/MatchCircle'
import { Select } from '@/components/ui/Select'
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
}

interface ApplicantPanelProps {
  application: ApplicantPanelApplication
  matchScore?: MatchScore | null
  contacts?: SeekerContact | null
  onTransition: (applicationId: string, newStatus: ApplicationStatus, note?: string) => void
  expanded: boolean
  onToggle: () => void
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
}: ApplicantPanelProps) {
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | ''>('')
  const [transitionNote, setTransitionNote] = useState('')
  const [showNote, setShowNote] = useState(false)

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
        <div className="p-4 space-y-5">

          {/* Match highlights */}
          {highlights.length > 0 && (
            <div>
              <p className="text-[11px] font-body font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-light)' }}>
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
            <p className="text-[11px] font-body font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-light)' }}>
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
                  <p className="text-[13px] font-body text-ink capitalize">{seeker.visa_status.replace(/_/g, ' ')}</p>
                </div>
              )}
              {seeker.dairynz_level && (
                <div>
                  <span className="text-[11px] font-body text-light">DairyNZ Level</span>
                  <p className="text-[13px] font-body text-ink capitalize">{seeker.dairynz_level.replace(/_/g, ' ')}</p>
                </div>
              )}
              {seeker.shed_types_experienced && seeker.shed_types_experienced.length > 0 && (
                <div>
                  <span className="text-[11px] font-body text-light">Shed Types</span>
                  <p className="text-[13px] font-body text-ink capitalize">{seeker.shed_types_experienced.join(', ')}</p>
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
                  <p className="text-[13px] font-body text-ink">{seeker.accommodation_needed ? 'Yes' : 'No'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Skills section */}
          {application.seeker_skills && application.seeker_skills.length > 0 && (
            <div>
              <p className="text-[11px] font-body font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-light)' }}>
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
              <p className="text-[11px] font-body font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-light)' }}>
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
              <p className="text-[11px] font-body font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-light)' }}>
                Cover Note
              </p>
              <blockquote className="border-l-[3px] border-fog pl-3 text-[13px] font-body text-mid italic">
                {application.cover_note}
              </blockquote>
            </div>
          )}

          {/* Stage transition */}
          <div>
            <p className="text-[11px] font-body font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-light)' }}>
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
    </div>
  )
}
