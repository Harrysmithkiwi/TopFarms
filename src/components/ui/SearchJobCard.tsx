import { MapPin, Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MatchCircle } from '@/components/ui/MatchCircle'
import { VerificationBadge } from '@/components/ui/VerificationBadge'
import { Tag } from '@/components/ui/Tag'
import { ExpandableCardTabs } from '@/components/ui/ExpandableCardTabs'
import type { JobListing, MatchScore, EmployerVerification, TrustLevel } from '@/types/domain'

interface SearchJobCardProps {
  job: JobListing & {
    employer_profiles: { farm_name: string; region: string; id: string }
  }
  matchScore?: MatchScore | null
  verifications?: EmployerVerification[]
  trustLevel?: TrustLevel
  // Phase 9 accordion props:
  isExpanded?: boolean
  onToggle?: () => void
  isLoggedIn?: boolean
  hasApplied?: boolean
  onApply?: (coverNote: string) => Promise<void>
  isSaved?: boolean
  onSaveToggle?: () => void
}

function formatSalaryRange(min?: number, max?: number): string | null {
  if (!min && !max) return null
  const fmt = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n.toLocaleString()}`
  if (min && max) return `${fmt(min)} – ${fmt(max)} /yr`
  if (min) return `From ${fmt(min)} /yr`
  if (max) return `Up to ${fmt(max)} /yr`
  return null
}

const CONTRACT_LABELS: Record<string, string> = {
  permanent: 'Permanent',
  contract: 'Contract',
  casual: 'Casual',
}

const SHED_TYPE_LABELS: Record<string, string> = {
  rotary: 'Rotary',
  herringbone: 'Herringbone',
  other: 'Other shed',
}

export function SearchJobCard({
  job,
  matchScore,
  verifications = [],
  trustLevel = 'unverified',
  isExpanded = false,
  onToggle,
  isLoggedIn = false,
  hasApplied = false,
  onApply,
  isSaved = false,
  onSaveToggle,
}: SearchJobCardProps) {
  const salary = formatSalaryRange(job.salary_min, job.salary_max)
  const shedTypes: string[] = Array.isArray((job as unknown as Record<string, unknown>).shed_type)
    ? ((job as unknown as Record<string, unknown>).shed_type as string[])
    : []
  const accommodationAvailable =
    job.accommodation &&
    typeof job.accommodation === 'object' &&
    (job.accommodation as Record<string, unknown>).available === true

  return (
    <div
      className={cn(
        'bg-white border border-fog rounded-[12px]',
        'hover:border-moss/30 transition-colors',
        isExpanded && 'border-moss/30',
      )}
    >
      {/* Card header — clickable to toggle accordion */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-moss rounded-[12px]"
      >
        <div className="flex items-start gap-4">
          {/* Left: content */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className="text-[15px] font-body font-semibold text-soil truncate leading-snug">
              {job.title}
            </h3>

            {/* Farm name + verification badge */}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-sm font-body text-mid">
                {job.employer_profiles?.farm_name}
              </span>
              {verifications.length > 0 && (
                <VerificationBadge
                  verifications={verifications}
                  trustLevel={trustLevel}
                  expandable={false}
                />
              )}
            </div>

            {/* Tags row */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {/* Region */}
              <Tag variant="grey">
                <MapPin className="w-3 h-3 mr-0.5 inline-block" />
                {job.employer_profiles?.region || job.region}
              </Tag>

              {/* Contract type */}
              {job.contract_type && (
                <Tag variant="grey">{CONTRACT_LABELS[job.contract_type] ?? job.contract_type}</Tag>
              )}

              {/* Shed types */}
              {shedTypes.map((shedType) => (
                <Tag key={shedType} variant="green">
                  {SHED_TYPE_LABELS[shedType] ?? shedType}
                </Tag>
              ))}

              {/* Accommodation */}
              {accommodationAvailable && (
                <Tag variant="green">Accommodation</Tag>
              )}

              {/* Visa sponsorship */}
              {job.visa_sponsorship && (
                <Tag variant="blue">Visa sponsorship</Tag>
              )}

              {/* Couples welcome */}
              {job.couples_welcome && (
                <Tag variant="hay">Couples welcome</Tag>
              )}
            </div>

            {/* Salary */}
            {salary && (
              <p className="text-sm font-body text-mid mt-2">{salary}</p>
            )}
          </div>

          {/* Right: bookmark + match score */}
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            {/* Bookmark icon */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSaveToggle?.() }}
              className={cn('flex-shrink-0', isSaved ? 'text-hay' : 'text-mid hover:text-hay')}
              aria-label={isSaved ? 'Job saved' : 'Save this job'}
            >
              <Bookmark className={cn('w-4 h-4', isSaved && 'fill-hay')} />
            </button>

            {/* Match circle */}
            <div className="w-[52px] flex flex-col items-center justify-center">
              {matchScore !== null && matchScore !== undefined ? (
                <MatchCircle score={matchScore.total_score} size="md" />
              ) : (
                /* Subtle placeholder for visitors */
                <div className="w-[50px] h-[50px] rounded-full border-[1.5px] border-fog bg-mist flex items-center justify-center">
                  <span className="text-[16px] font-body text-light">?</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </button>

      {/* Expandable area — always rendered for CSS transition, controlled by max-h */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-out',
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <ExpandableCardTabs
          job={job}
          matchBreakdown={matchScore?.breakdown ?? null}
          totalScore={matchScore?.total_score ?? null}
          isLoggedIn={isLoggedIn}
          hasApplied={hasApplied}
          onApply={onApply ?? (async () => {})}
        />
      </div>
    </div>
  )
}
