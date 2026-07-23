import { Eye, Pencil, Pause, Play, Archive, CheckCircle, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import type { JobListing, JobStatus } from '@/types/domain'

interface JobCardProps {
  job: JobListing
  onPause?: () => void
  onEdit?: () => void
  onArchive?: () => void
  onMarkFilled?: () => void
  onDuplicate?: () => void
  className?: string
}

const STATUS_CONFIG: Record<JobStatus, { label: string; bgClass: string; textClass: string }> = {
  active: { label: 'Active', bgClass: 'bg-[rgba(74,124,47,0.12)]', textClass: 'text-brand' },
  paused: {
    label: 'Paused',
    bgClass: 'bg-[rgba(217,150,45,0.12)]',
    textClass: 'text-warn-text-on-bg',
  },
  draft: { label: 'Draft', bgClass: 'bg-surface-2', textClass: 'text-text-muted' },
  expired: { label: 'Expired', bgClass: 'bg-[rgba(220,53,69,0.10)]', textClass: 'text-danger' },
  filled: { label: 'Filled', bgClass: 'bg-[rgba(59,130,246,0.10)]', textClass: 'text-[#2563eb]' },
  archived: { label: 'Archived', bgClass: 'bg-surface-2', textClass: 'text-text-subtle' },
}

function formatSalary(min?: number, max?: number): string | null {
  if (!min && !max) return null
  const fmt = (n: number) => `$${n.toLocaleString()}`
  if (min && max) return `${fmt(min)} – ${fmt(max)} pa`
  if (min) return `From ${fmt(min)} pa`
  if (max) return `Up to ${fmt(max)} pa`
  return null
}

function getDaysRemaining(expiresAt?: string): number | null {
  if (!expiresAt) return null
  const diffMs = new Date(expiresAt).getTime() - Date.now()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Dashboard job listing card.
 * Shows title, region, salary, contract type, status badge, days remaining, and action buttons.
 * Action buttons are conditional on job status.
 */
export function JobCard({
  job,
  onPause,
  onEdit,
  onArchive,
  onMarkFilled,
  onDuplicate,
  className,
}: JobCardProps) {
  const statusCfg = STATUS_CONFIG[job.status]
  const salary = formatSalary(job.salary_min, job.salary_max)
  const daysLeft = getDaysRemaining(job.expires_at)

  const canPause = job.status === 'active'
  const canResume = job.status === 'paused'
  const canEdit = job.status === 'draft' || job.status === 'active' || job.status === 'paused'
  const canArchive = job.status !== 'archived'
  const canMarkFilled =
    job.status === 'active' || job.status === 'paused' || job.status === 'expired'
  const canDuplicate = job.status !== 'draft'

  return (
    <div
      className={cn(
        'bg-surface border-border flex flex-col gap-4 rounded-[12px] border-[1.5px] p-5',
        className,
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-body text-text truncate text-[15px] font-bold">{job.title}</h3>
          <p className="font-body text-text-muted mt-0.5 text-[12px]">{job.region}</p>
        </div>

        {/* Status badge */}
        <span
          className={cn(
            'font-body flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold',
            statusCfg.bgClass,
            statusCfg.textClass,
          )}
        >
          {statusCfg.label}
        </span>
      </div>

      {/* Job meta */}
      <div className="font-body text-text-muted flex flex-wrap gap-3 text-[12px]">
        {salary && <span>{salary}</span>}
        <span className="capitalize">{job.contract_type}</span>
        {job.views_count > 0 && (
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {job.views_count} {job.views_count === 1 ? 'view' : 'views'}
          </span>
        )}
      </div>

      {/* Days remaining indicator for active listings */}
      {job.status === 'active' && daysLeft !== null && (
        <p
          className={cn(
            'font-body text-[12px]',
            daysLeft <= 7 ? 'text-danger font-medium' : 'text-text-muted',
          )}
        >
          {daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining` : 'Expired today'}
        </p>
      )}

      {/* Action buttons */}
      <div className="border-border flex flex-wrap gap-2 border-t pt-1">
        {canEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit} className="flex items-center gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}

        {canPause && (
          <Button variant="ghost" size="sm" onClick={onPause} className="flex items-center gap-1.5">
            <Pause className="h-3.5 w-3.5" />
            Pause
          </Button>
        )}

        {canResume && (
          <Button variant="ghost" size="sm" onClick={onPause} className="flex items-center gap-1.5">
            <Play className="h-3.5 w-3.5" />
            Resume
          </Button>
        )}

        {canMarkFilled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkFilled}
            className="flex items-center gap-1.5"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Mark as Filled
          </Button>
        )}

        {canDuplicate && onDuplicate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDuplicate}
            className="flex items-center gap-1.5"
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </Button>
        )}

        {canArchive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onArchive}
            className="text-text-subtle hover:text-text-muted flex items-center gap-1.5"
          >
            <Archive className="h-3.5 w-3.5" />
            Archive
          </Button>
        )}
      </div>
    </div>
  )
}
