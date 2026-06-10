import { Bookmark, Share2, Clock, MapPin, Briefcase, DollarSign } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { StarRating } from '@/components/ui/StarRating'
import { MatchCircle } from '@/components/ui/MatchCircle'
import type { JobListing } from '@/types/domain'

interface SimilarJob {
  id: string
  title: string
  farm_name: string
  region: string
  salary_min?: number
  salary_max?: number
  matchScore?: number
}

interface FarmProfile {
  id: string
  farm_name: string
  region: string
  farm_type?: string
  herd_size?: number
  rating?: number
  total_jobs?: number
  total_hires?: number
}

interface JobDetailSidebarProps {
  job: JobListing
  farm: FarmProfile
  similarJobs: SimilarJob[]
  isSaved: boolean
  onSaveToggle: () => void
  onShare: () => void
}

function formatSalaryShort(min?: number, max?: number): string {
  if (!min && !max) return 'Negotiable'
  const fmt = (n: number) => `$${Math.round(n / 1000)}k`
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `From ${fmt(min)}`
  if (max) return `Up to ${fmt(max)}`
  return 'Negotiable'
}

function formatDateShort(dateStr?: string): string | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function JobDetailSidebar({
  job,
  farm,
  similarJobs,
  isSaved,
  onSaveToggle,
  onShare,
}: JobDetailSidebarProps) {
  return (
    <div className="space-y-4">
      {/* Section 1: Quick Facts card */}
      <div className="bg-surface border-border rounded-[12px] border p-4">
        <h3 className="font-body text-text mb-3 text-[13px] font-semibold">Quick Facts</h3>
        <ul className="mb-4 space-y-2.5">
          {job.contract_type && (
            <li className="flex items-center gap-2">
              <Briefcase className="text-text-subtle h-4 w-4 flex-shrink-0" />
              <span className="font-body text-text-muted text-[13px] capitalize">
                {job.contract_type}
              </span>
            </li>
          )}
          {farm.region && (
            <li className="flex items-center gap-2">
              <MapPin className="text-text-subtle h-4 w-4 flex-shrink-0" />
              <span className="font-body text-text-muted text-[13px]">{farm.region}</span>
            </li>
          )}
          {(job.salary_min || job.salary_max) && (
            <li className="flex items-center gap-2">
              <DollarSign className="text-text-subtle h-4 w-4 flex-shrink-0" />
              <span className="font-body text-text-muted text-[13px]">
                {formatSalaryShort(job.salary_min, job.salary_max)}
              </span>
            </li>
          )}
          {job.start_date && (
            <li className="flex items-center gap-2">
              <Clock className="text-text-subtle h-4 w-4 flex-shrink-0" />
              <span className="font-body text-text-muted text-[13px]">
                Starts {formatDateShort(job.start_date)}
              </span>
            </li>
          )}
        </ul>

        {/* Save / Share buttons */}
        <div className="border-border flex items-center gap-2 border-t pt-3">
          <button
            type="button"
            onClick={onSaveToggle}
            aria-label={isSaved ? 'Job saved' : 'Save this job'}
            className={cn(
              'font-body flex items-center gap-1.5 text-[13px] font-medium transition-colors',
              isSaved ? 'text-warn' : 'text-text-muted hover:text-warn',
            )}
          >
            <Bookmark className={cn('h-4 w-4', isSaved ? 'fill-warn text-warn' : '')} />
            {isSaved ? 'Saved' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onShare}
            aria-label="Share this job"
            className="font-body text-text-muted hover:text-brand ml-auto flex items-center gap-1.5 text-[13px] font-medium transition-colors"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </div>
      </div>

      {/* Section 2: Deadline notice */}
      {job.expires_at && (
        <div className="bg-warn-bg flex items-center gap-2 rounded-[12px] p-3">
          <Clock className="text-warn h-4 w-4 flex-shrink-0" />
          <span className="font-body text-text text-[13px]">
            Applications close {formatDateShort(job.expires_at)}
          </span>
        </div>
      )}

      {/* Section 3: Similar Jobs card */}
      {similarJobs.length > 0 && (
        <div className="bg-surface border-border rounded-[12px] border p-4">
          <h3 className="font-body text-text mb-3 text-[13px] font-semibold">Similar Jobs</h3>
          <ul className="space-y-3">
            {similarJobs.slice(0, 3).map((sj) => (
              <li key={sj.id}>
                <Link
                  to={`/jobs/${sj.id}`}
                  className="group flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-body text-text group-hover:text-brand truncate text-[13px] leading-snug font-semibold transition-colors">
                      {sj.title}
                    </p>
                    <p className="font-body text-text-muted truncate text-[12px]">
                      {sj.farm_name}
                      {sj.region ? ` · ${sj.region}` : ''}
                    </p>
                    {(sj.salary_min || sj.salary_max) && (
                      <p className="font-body text-text-subtle text-[12px]">
                        {formatSalaryShort(sj.salary_min, sj.salary_max)}
                      </p>
                    )}
                  </div>
                  {sj.matchScore !== undefined && (
                    <div className="flex-shrink-0">
                      <MatchCircle score={sj.matchScore} size="sm" />
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Section 4: Farm Profile card */}
      <div className="border-border overflow-hidden rounded-[12px] border">
        {/* Header */}
        <div className="bg-brand-900 rounded-t-[12px] px-4 py-3">
          <h3 className="font-display text-[16px] leading-snug font-semibold text-white">
            {farm.farm_name}
          </h3>
          {farm.region && (
            <p className="font-body mt-0.5 text-[12px] text-white/70">{farm.region}</p>
          )}
        </div>

        {/* Body */}
        <div className="bg-surface space-y-3 px-4 py-4">
          {/* Stats grid */}
          {(farm.total_jobs !== undefined ||
            farm.herd_size !== undefined ||
            farm.total_hires !== undefined) && (
            <div className="border-border grid grid-cols-3 gap-2 border-b pb-3">
              {farm.total_jobs !== undefined && (
                <div className="text-center">
                  <p className="font-body text-text text-[15px] font-semibold">{farm.total_jobs}</p>
                  <p className="font-body text-text-subtle text-[11px]">Jobs</p>
                </div>
              )}
              {farm.herd_size !== undefined && (
                <div className="text-center">
                  <p className="font-body text-text text-[15px] font-semibold">
                    {farm.herd_size.toLocaleString()}
                  </p>
                  <p className="font-body text-text-subtle text-[11px]">Herd Size</p>
                </div>
              )}
              {farm.total_hires !== undefined && (
                <div className="text-center">
                  <p className="font-body text-text text-[15px] font-semibold">
                    {farm.total_hires}
                  </p>
                  <p className="font-body text-text-subtle text-[11px]">Hires</p>
                </div>
              )}
            </div>
          )}

          {/* Tags row */}
          {(farm.farm_type || farm.region) && (
            <div className="flex flex-wrap gap-1.5">
              {farm.farm_type && (
                <span className="bg-surface-2 font-body text-text-muted inline-flex items-center rounded-full px-2 py-0.5 text-[11px] capitalize">
                  {farm.farm_type}
                </span>
              )}
              {farm.region && (
                <span className="bg-surface-2 font-body text-text-muted inline-flex items-center rounded-full px-2 py-0.5 text-[11px]">
                  {farm.region}
                </span>
              )}
            </div>
          )}

          {/* Star rating */}
          {farm.rating !== undefined && <StarRating value={farm.rating} size={14} />}

          {/* View farm profile link */}
          <Link
            to={`/farms/${farm.id}`}
            className="font-body text-brand hover:text-brand-hover block text-[13px] font-medium transition-colors"
          >
            View Farm Profile
          </Link>
        </div>
      </div>
    </div>
  )
}
