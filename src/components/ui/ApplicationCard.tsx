import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { Tag } from '@/components/ui/Tag'
import { MatchCircle } from '@/components/ui/MatchCircle'
import type { Application, ApplicationStatus, MatchScore, JobListing } from '@/types/domain'
import { ACTIVE_STATUSES } from '@/types/domain'

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

function formatAppliedDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `Applied ${date.toLocaleDateString('en-NZ', { month: 'long', day: 'numeric', year: 'numeric' })}`
}

interface ApplicationCardProps {
  application: Application & {
    jobs: JobListing & { employer_profiles: { farm_name: string; region: string } }
  }
  matchScore?: MatchScore | null
  onWithdraw?: (applicationId: string) => void
}

export function ApplicationCard({ application, matchScore, onWithdraw }: ApplicationCardProps) {
  const tagVariant = STATUS_TAG_VARIANT[application.status]
  const label = STATUS_LABELS[application.status]
  const isActive = ACTIVE_STATUSES.includes(application.status)
  const job = application.jobs
  const farmName = job?.employer_profiles?.farm_name ?? ''
  const region = job?.employer_profiles?.region ?? job?.region ?? ''

  function handleWithdraw() {
    if (window.confirm('Withdraw your application?')) {
      onWithdraw?.(application.id)
    }
  }

  return (
    <div
      className={cn(
        'bg-white border-[1.5px] border-fog rounded-[12px] p-4 flex gap-3',
        !isActive && 'opacity-75',
      )}
    >
      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Title row + status tag */}
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/jobs/${application.job_id}`}
            className="text-[15px] font-body font-semibold text-ink hover:text-moss transition-colors truncate"
          >
            {job?.title ?? 'Job Listing'}
          </Link>
          <Tag variant={tagVariant} className="flex-shrink-0">
            {label}
          </Tag>
        </div>

        {/* Farm + region */}
        <p className="text-sm font-body text-mid mt-0.5">
          {farmName}{region ? ` — ${region}` : ''}
        </p>

        {/* Applied date */}
        <p className="text-xs font-body text-light mt-1">
          {formatAppliedDate(application.created_at)}
        </p>

        {/* Withdraw button */}
        {isActive && onWithdraw && (
          <button
            type="button"
            onClick={handleWithdraw}
            className="mt-2 text-sm font-body text-red hover:underline"
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
  )
}
