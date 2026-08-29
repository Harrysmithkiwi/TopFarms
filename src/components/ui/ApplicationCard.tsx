import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { Tag } from '@/components/ui/Tag'
import { MatchBand } from '@/components/ui/MatchBand'
import { StatusBanner } from '@/components/ui/StatusBanner'
import { FarmResponseIndicator } from '@/components/ui/FarmResponseIndicator'
import { Button } from '@/components/ui/Button'
import type {
  Application,
  ApplicationEvent,
  ApplicationStatus,
  MatchScore,
  JobListing,
} from '@/types/domain'
import { ApplicationTimeline } from '@/components/ui/ApplicationTimeline'
import { ACTIVE_STATUSES } from '@/types/domain'

type TagVariant = 'green' | 'warn' | 'blue' | 'grey' | 'purple' | 'red'

const STATUS_TAG_VARIANT: Record<ApplicationStatus, TagVariant> = {
  applied: 'blue',
  review: 'warn',
  interview: 'warn', // was 'orange' (1.93:1, below AA) — 'warn' uses --color-warn-text-on-bg (6.37:1)
  shortlisted: 'purple',
  offered: 'green',
  hired: 'green',
  declined: 'red',
  withdrawn: 'grey',
}

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: 'Applied',
  review: 'Under Review',
  interview: 'Interview',
  shortlisted: 'Shortlisted',
  offered: 'Offered',
  hired: 'Hired',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
}

const STATUS_TO_BANNER: Partial<
  Record<ApplicationStatus, { variant: 'shortlisted' | 'interview' | 'offer' | 'declined' }>
> = {
  shortlisted: { variant: 'shortlisted' },
  interview: { variant: 'interview' },
  offered: { variant: 'offer' },
  declined: { variant: 'declined' },
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
  /** application_events rows for this application (migration 107). When
   *  present, a quiet History disclosure renders under the card body. */
  events?: ApplicationEvent[]
  onWithdraw?: (applicationId: string) => void
  onAcceptInterview?: (applicationId: string) => void
  onDeclineInterview?: (applicationId: string) => void
}

export function ApplicationCard({
  application,
  matchScore,
  events,
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
    if (
      window.confirm(
        `Withdraw your application for ${job?.title ?? 'this job'}? The employer will no longer see it. You can re-apply later if you change your mind.`,
      )
    ) {
      onWithdraw?.(application.id)
    }
  }

  return (
    <div
      className={cn(
        'bg-surface border-border overflow-hidden rounded-12 border-[1.5px]',
        !isActive && 'opacity-75',
      )}
    >
      {/* StatusBanner at top */}
      {bannerConfig && (
        <div className="mb-4">
          <StatusBanner
            variant={bannerConfig.variant}
            actions={
              application.status === 'interview' ? (
                application.interview_accepted_at ? (
                  // Persisted by accept_interview() — survives refresh, and the
                  // employer sees the same acceptance on their side.
                  <p className="font-body text-text text-sm font-semibold">
                    ✓ Interview accepted — the employer will be in touch to arrange a time.
                  </p>
                ) : onAcceptInterview && onDeclineInterview ? (
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onAcceptInterview(application.id)}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeclineInterview(application.id)}
                    >
                      Decline
                    </Button>
                  </div>
                ) : undefined
              ) : undefined
            }
          />
        </div>
      )}

      {/* Card body */}
      <div className="flex gap-3 p-4">
        {/* Main content */}
        <div className="min-w-0 flex-1">
          {/* Title row + status tag */}
          <div className="flex items-start justify-between gap-2">
            <Link
              to={`/jobs/${application.job_id}`}
              className="font-body text-text hover:text-brand-hover truncate text-[15px] font-semibold transition-colors"
            >
              {job?.title ?? 'Job Listing'}
            </Link>
            <Tag variant={tagVariant} className="flex-shrink-0">
              {label}
            </Tag>
          </div>

          {/* Farm + region */}
          <p className="font-body text-text-muted mt-0.5 text-sm">
            {farmName}
            {region ? ` — ${region}` : ''}
          </p>

          {/* Applied date */}
          <p className="font-body text-text-subtle mt-1 text-xs">
            {formatAppliedDate(application.created_at)}
          </p>

          {/* Farm response indicator */}
          <FarmResponseIndicator viewedAt={application.viewed_at ?? null} />

          {/* Withdraw button */}
          {isActive && onWithdraw && (
            <button
              type="button"
              onClick={handleWithdraw}
              className="font-body text-danger mt-2 text-sm hover:underline"
            >
              Withdraw
            </button>
          )}

          {/* History — real backend events only (application_events). Native
              disclosure: keyboard- and screen-reader-correct for free. */}
          {events && events.length > 0 && (
            <details className="mt-3">
              <summary className="font-body text-text-muted hover:text-text cursor-pointer text-label font-semibold">
                History ({events.length})
              </summary>
              <ApplicationTimeline events={events} />
            </details>
          )}
        </div>

        {/* Match circle */}
        {matchScore != null && (
          <div className="flex-shrink-0 self-start">
            <MatchBand score={matchScore.total_score} />
          </div>
        )}
      </div>
    </div>
  )
}
