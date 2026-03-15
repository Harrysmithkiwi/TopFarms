import { Eye, Pencil, Pause, Play, Archive, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import type { JobListing, JobStatus } from '@/types/domain'

interface JobCardProps {
  job: JobListing
  onPause?: () => void
  onEdit?: () => void
  onArchive?: () => void
  onMarkFilled?: () => void
  className?: string
}

const STATUS_CONFIG: Record<
  JobStatus,
  { label: string; bgClass: string; textClass: string }
> = {
  active: { label: 'Active', bgClass: 'bg-[rgba(74,124,47,0.12)]', textClass: 'text-moss' },
  paused: {
    label: 'Paused',
    bgClass: 'bg-[rgba(217,150,45,0.12)]',
    textClass: 'text-[#9a6c1a]',
  },
  draft: { label: 'Draft', bgClass: 'bg-fog', textClass: 'text-mid' },
  expired: { label: 'Expired', bgClass: 'bg-[rgba(220,53,69,0.10)]', textClass: 'text-red' },
  filled: { label: 'Filled', bgClass: 'bg-[rgba(59,130,246,0.10)]', textClass: 'text-[#2563eb]' },
  archived: { label: 'Archived', bgClass: 'bg-fog', textClass: 'text-light' },
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
export function JobCard({ job, onPause, onEdit, onArchive, onMarkFilled, className }: JobCardProps) {
  const statusCfg = STATUS_CONFIG[job.status]
  const salary = formatSalary(job.salary_min, job.salary_max)
  const daysLeft = getDaysRemaining(job.expires_at)

  const canPause = job.status === 'active'
  const canResume = job.status === 'paused'
  const canEdit = job.status === 'draft' || job.status === 'active' || job.status === 'paused'
  const canArchive = job.status !== 'archived'
  const canMarkFilled =
    job.status === 'active' || job.status === 'paused' || job.status === 'expired'

  return (
    <div
      className={cn(
        'bg-white border-[1.5px] border-fog rounded-[12px] p-5 flex flex-col gap-4',
        className,
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-body font-bold text-ink truncate">{job.title}</h3>
          <p className="text-[12px] font-body text-mid mt-0.5">{job.region}</p>
        </div>

        {/* Status badge */}
        <span
          className={cn(
            'flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-body font-semibold',
            statusCfg.bgClass,
            statusCfg.textClass,
          )}
        >
          {statusCfg.label}
        </span>
      </div>

      {/* Job meta */}
      <div className="flex flex-wrap gap-3 text-[12px] font-body text-mid">
        {salary && <span>{salary}</span>}
        <span className="capitalize">{job.contract_type}</span>
        {job.views_count > 0 && (
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {job.views_count} {job.views_count === 1 ? 'view' : 'views'}
          </span>
        )}
      </div>

      {/* Days remaining indicator for active listings */}
      {job.status === 'active' && daysLeft !== null && (
        <p
          className={cn(
            'text-[12px] font-body',
            daysLeft <= 7 ? 'text-red font-medium' : 'text-mid',
          )}
        >
          {daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining` : 'Expired today'}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-fog">
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="flex items-center gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Button>
        )}

        {canPause && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onPause}
            className="flex items-center gap-1.5"
          >
            <Pause className="w-3.5 h-3.5" />
            Pause
          </Button>
        )}

        {canResume && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onPause}
            className="flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
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
            <CheckCircle className="w-3.5 h-3.5" />
            Mark as Filled
          </Button>
        )}

        {canArchive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onArchive}
            className="flex items-center gap-1.5 text-light hover:text-mid"
          >
            <Archive className="w-3.5 h-3.5" />
            Archive
          </Button>
        )}
      </div>
    </div>
  )
}
