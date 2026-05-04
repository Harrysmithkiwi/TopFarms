import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { Tag } from '@/components/ui/Tag'
import { MatchCircle } from '@/components/ui/MatchCircle'
import { StatusBanner } from '@/components/ui/StatusBanner'
import { FarmResponseIndicator } from '@/components/ui/FarmResponseIndicator'
import { Button } from '@/components/ui/Button'
import type { Application, ApplicationStatus, MatchScore, JobListing } from '@/types/domain'
import { ACTIVE_STATUSES } from '@/types/domain'

type TagVariant = 'green' | 'warn' | 'blue' | 'grey' | 'orange' | 'purple' | 'red'

const STATUS_TAG_VARIANT: Record<ApplicationStatus, TagVariant> = {
  applied:     'blue',
  review:      'warn',
  interview:   'orange',
  shortlisted: 'purple',
  offered:     'green',
  hired:       'green',
  declined:    'red',
  withdrawn:   'grey',
}

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied:     'Applied',
  review:      'Under Review',
  interview:   'Interview',
  shortlisted: 'Shortlisted',
  offered:     'Offered',
  hired:       'Hired',
  declined:    'Declined',
  withdrawn:   'Withdrawn',
}

const STATUS_TO_BANNER: Partial<Record<ApplicationStatus, { variant: 'shortlisted' | 'interview' | 'offer' | 'declined' }>> = {
  shortlisted: { variant: 'shortlisted' },
  interview:   { variant: 'interview' },
  offered:     { variant: 'offer' },
  declined:    { variant: 'declined' },
}

function formatAppliedDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `Applied ${date.toLocaleDateString('en-NZ', { month: 'long', day: 'numeric', year: 'numeric' })}`
}

interface ApplicationCardProps {
  application: Application & {
    jobs: JobListing & { employer_profiles: { farm_name: string; region: string } }
  } & { viewed_at?: string | null }
  matchScore?: MatchScore | null
  onWithdraw?: (applicationId: string) => void
  onAcceptInterview?: (applicationId: string) => void
  onDeclineInterview?: (applicationId: string) => void
}

export function ApplicationCard({
  application,
  matchScore,
  onWithdraw,
  onAcceptInterview,
  onDeclineInterview,
}: ApplicationCardProps) {
  const tagVariant = STATUS_TAG_VARIANT[application.status]
  const label = STATUS_LABELS[application.status]
  const isActive = ACTIVE_STATUSES.includes(application.status)
  const job = application.jobs
  const farmName = job?.employer_profiles?.farm_name ?? ''
  const region = job?.employer_profiles?.region ?? job?.region ?? ''
  const bannerConfig = STATUS_TO_BANNER[application.status]

  function handleWithdraw() {
    if (window.confirm(`Withdraw your application for ${job?.title ?? 'this job'}? This cannot be undone.`)) {
      onWithdraw?.(application.id)
    }
  }

  return (
    <div
      className={cn(
        'bg-surface border-[1.5px] border-border rounded-[12px] overflow-hidden',
        !isActive && 'opacity-75',
      )}
    >
      {/* StatusBanner at top */}
      {bannerConfig && (
        <div className="mb-4">
          <StatusBanner
            variant={bannerConfig.variant}
            actions={
              application.status === 'interview' && onAcceptInterview && onDeclineInterview ? (
                <div className="flex gap-2 mt-2">
                  <Button variant="primary" size="sm" onClick={() => onAcceptInterview(application.id)}>Accept</Button>
                  <Button variant="ghost" size="sm" onClick={() => onDeclineInterview(application.id)}>Decline</Button>
                </div>
              ) : undefined
            }
          />
        </div>
      )}

      {/* Card body */}
      <div className="p-4 flex gap-3">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Title row + status tag */}
          <div className="flex items-start justify-between gap-2">
            <Link
              to={`/jobs/${application.job_id}`}
              className="text-[15px] font-body font-semibold text-text hover:text-brand transition-colors truncate"
            >
              {job?.title ?? 'Job Listing'}
            </Link>
            <Tag variant={tagVariant} className="flex-shrink-0">
              {label}
            </Tag>
          </div>

          {/* Farm + region */}
          <p className="text-sm font-body text-text-muted mt-0.5">
            {farmName}{region ? ` — ${region}` : ''}
          </p>

          {/* Applied date */}
          <p className="text-xs font-body text-text-subtle mt-1">
            {formatAppliedDate(application.created_at)}
          </p>

          {/* Farm response indicator */}
          <FarmResponseIndicator viewedAt={application.viewed_at ?? null} />

          {/* Withdraw button */}
          {isActive && onWithdraw && (
            <button
              type="button"
              onClick={handleWithdraw}
              className="mt-2 text-sm font-body text-danger hover:underline"
            >
              Withdraw
            </button>
          )}
        </div>

        {/* Match circle */}
        {matchScore != null && (
          <div className="flex-shrink-0 self-start">
            <MatchCircle score={matchScore.total_score} size="sm" />
          </div>
        )}
      </div>
    </div>
  )
}
