import { MapPin, Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MatchCircle } from '@/components/ui/MatchCircle'
import { VerificationBadge } from '@/components/ui/VerificationBadge'
import { Tag } from '@/components/ui/Tag'
import { ExpandableCardTabs } from '@/components/ui/ExpandableCardTabs'
import type {
  JobListing,
  MatchScore,
  EmployerVerification,
  TrustLevel,
  ApplicationStatus,
} from '@/types/domain'
import { APPLICATION_STATUS_LABELS, COMPLETED_STATUSES } from '@/types/domain'

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
  appliedStatus?: ApplicationStatus | null
  onApply?: (coverNote: string) => Promise<void>
  isSaved?: boolean
  onSaveToggle?: () => void
}

function formatSalaryRange(min?: number, max?: number): string | null {
  if (!min && !max) return null
  const fmt = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n.toLocaleString()}`)
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
  appliedStatus = null,
  onApply,
  isSaved = false,
  onSaveToggle,
}: SearchJobCardProps) {
  const isTerminalApplication = appliedStatus !== null && COMPLETED_STATUSES.includes(appliedStatus)
  const appliedBadgeLabel =
    appliedStatus === null
      ? null
      : isTerminalApplication
        ? `Applied · ${APPLICATION_STATUS_LABELS[appliedStatus]}`
        : 'Applied'
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
        'bg-surface border-border rounded-[12px] border',
        'hover:border-brand/30 transition-colors',
        isExpanded && 'border-brand/30',
      )}
    >
      {/* Card header — clickable to toggle accordion */}
      <button
        type="button"
        onClick={onToggle}
        className="focus-visible:ring-brand w-full rounded-[12px] p-4 text-left focus:outline-none focus-visible:ring-2"
      >
        <div className="flex items-start gap-4">
          {/* Left: content */}
          <div className="min-w-0 flex-1">
            {/* Title */}
            <h3 className="font-body text-text truncate text-[15px] leading-snug font-semibold">
              {job.title}
            </h3>

            {/* Farm name + verification badge */}
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="font-body text-text-muted text-sm">
                {job.employer_profiles?.farm_name}
              </span>
              {verifications.length > 0 && (
                <VerificationBadge
                  verifications={verifications}
                  trustLevel={trustLevel}
                  expandable={false}
                />
              )}
              {appliedBadgeLabel !== null && (
                <span
                  className="font-body inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{
                    backgroundColor: isTerminalApplication
                      ? 'var(--color-border)'
                      : 'var(--color-brand)',
                    color: isTerminalApplication
                      ? 'var(--color-text-muted)'
                      : 'var(--color-brand-900)',
                  }}
                >
                  {appliedBadgeLabel}
                </span>
              )}
            </div>

            {/* Tags row */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {/* Region */}
              <Tag variant="grey">
                <MapPin className="mr-0.5 inline-block h-3 w-3" />
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
              {accommodationAvailable && <Tag variant="green">Accommodation</Tag>}

              {/* Visa sponsorship */}
              {job.visa_sponsorship && <Tag variant="blue">Visa sponsorship</Tag>}

              {/* Couples welcome */}
              {job.couples_welcome && <Tag variant="warn">Couples welcome</Tag>}
            </div>

            {/* Salary */}
            {salary && <p className="font-body text-text-muted mt-2 text-sm">{salary}</p>}
          </div>

          {/* Right: bookmark + match score */}
          <div className="flex flex-shrink-0 flex-col items-center gap-2">
            {/* Bookmark icon */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSaveToggle?.()
              }}
              className={cn(
                'flex-shrink-0',
                isSaved ? 'text-warn' : 'text-text-muted hover:text-warn',
              )}
              aria-label={isSaved ? 'Job saved' : 'Save this job'}
            >
              <Bookmark className={cn('h-4 w-4', isSaved && 'fill-warn')} />
            </button>

            {/* Match circle */}
            <div className="flex w-[52px] flex-col items-center justify-center">
              {matchScore !== null && matchScore !== undefined ? (
                <MatchCircle score={matchScore.total_score} size="md" />
              ) : (
                /* Subtle placeholder for visitors */
                <div className="border-border bg-surface-2 flex h-[50px] w-[50px] items-center justify-center rounded-full border-[1.5px]">
                  <span className="font-body text-text-subtle text-[16px]">?</span>
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
          appliedStatus={appliedStatus}
          onApply={onApply ?? (async () => {})}
        />
      </div>
    </div>
  )
}
