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
      <div className="bg-white border border-fog rounded-[12px] p-4">
        <h3 className="text-[13px] font-body font-semibold text-ink mb-3">Quick Facts</h3>
        <ul className="space-y-2.5 mb-4">
          {job.contract_type && (
            <li className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-light flex-shrink-0" />
              <span className="text-[13px] font-body text-mid capitalize">{job.contract_type}</span>
            </li>
          )}
          {farm.region && (
            <li className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-light flex-shrink-0" />
              <span className="text-[13px] font-body text-mid">{farm.region}</span>
            </li>
          )}
          {(job.salary_min || job.salary_max) && (
            <li className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-light flex-shrink-0" />
              <span className="text-[13px] font-body text-mid">
                {formatSalaryShort(job.salary_min, job.salary_max)}
              </span>
            </li>
          )}
          {job.start_date && (
            <li className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-light flex-shrink-0" />
              <span className="text-[13px] font-body text-mid">
                Starts {formatDateShort(job.start_date)}
              </span>
            </li>
          )}
        </ul>

        {/* Save / Share buttons */}
        <div className="flex items-center gap-2 pt-3 border-t border-fog">
          <button
            type="button"
            onClick={onSaveToggle}
            aria-label={isSaved ? 'Job saved' : 'Save this job'}
            className={cn(
              'flex items-center gap-1.5 text-[13px] font-body font-medium transition-colors',
              isSaved ? 'text-hay' : 'text-mid hover:text-hay',
            )}
          >
            <Bookmark
              className={cn('w-4 h-4', isSaved ? 'fill-hay text-hay' : '')}
            />
            {isSaved ? 'Saved' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onShare}
            aria-label="Share this job"
            className="flex items-center gap-1.5 text-[13px] font-body font-medium text-mid hover:text-moss transition-colors ml-auto"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>

      {/* Section 2: Deadline notice */}
      {job.expires_at && (
        <div className="bg-hay-lt rounded-[12px] p-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-hay flex-shrink-0" />
          <span className="text-[13px] font-body text-ink">
            Applications close {formatDateShort(job.expires_at)}
          </span>
        </div>
      )}

      {/* Section 3: Similar Jobs card */}
      {similarJobs.length > 0 && (
        <div className="bg-white border border-fog rounded-[12px] p-4">
          <h3 className="text-[13px] font-body font-semibold text-ink mb-3">Similar Jobs</h3>
          <ul className="space-y-3">
            {similarJobs.slice(0, 3).map((sj) => (
              <li key={sj.id}>
                <Link
                  to={`/jobs/${sj.id}`}
                  className="flex items-start justify-between gap-2 group"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-body font-semibold text-ink group-hover:text-moss transition-colors leading-snug truncate">
                      {sj.title}
                    </p>
                    <p className="text-[12px] font-body text-mid truncate">
                      {sj.farm_name}
                      {sj.region ? ` · ${sj.region}` : ''}
                    </p>
                    {(sj.salary_min || sj.salary_max) && (
                      <p className="text-[12px] font-body text-light">
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
      <div className="border border-fog rounded-[12px] overflow-hidden">
        {/* Header */}
        <div className="bg-soil px-4 py-3 rounded-t-[12px]">
          <h3 className="text-[16px] font-display font-semibold text-white leading-snug">
            {farm.farm_name}
          </h3>
          {farm.region && (
            <p className="text-[12px] font-body text-white/70 mt-0.5">{farm.region}</p>
          )}
        </div>

        {/* Body */}
        <div className="bg-white px-4 py-4 space-y-3">
          {/* Stats grid */}
          {(farm.total_jobs !== undefined || farm.herd_size !== undefined || farm.total_hires !== undefined) && (
            <div className="grid grid-cols-3 gap-2 pb-3 border-b border-fog">
              {farm.total_jobs !== undefined && (
                <div className="text-center">
                  <p className="text-[15px] font-body font-semibold text-ink">{farm.total_jobs}</p>
                  <p className="text-[11px] font-body text-light">Jobs</p>
                </div>
              )}
              {farm.herd_size !== undefined && (
                <div className="text-center">
                  <p className="text-[15px] font-body font-semibold text-ink">{farm.herd_size.toLocaleString()}</p>
                  <p className="text-[11px] font-body text-light">Herd Size</p>
                </div>
              )}
              {farm.total_hires !== undefined && (
                <div className="text-center">
                  <p className="text-[15px] font-body font-semibold text-ink">{farm.total_hires}</p>
                  <p className="text-[11px] font-body text-light">Hires</p>
                </div>
              )}
            </div>
          )}

          {/* Tags row */}
          {(farm.farm_type || farm.region) && (
            <div className="flex flex-wrap gap-1.5">
              {farm.farm_type && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-mist text-[11px] font-body text-mid capitalize">
                  {farm.farm_type}
                </span>
              )}
              {farm.region && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-mist text-[11px] font-body text-mid">
                  {farm.region}
                </span>
              )}
            </div>
          )}

          {/* Star rating */}
          {farm.rating !== undefined && (
            <StarRating value={farm.rating} size={14} />
          )}

          {/* View farm profile link */}
          <Link
            to={`/farms/${farm.id}`}
            className="block text-[13px] font-body font-medium text-moss hover:text-fern transition-colors"
          >
            View Farm Profile
          </Link>
        </div>
      </div>
    </div>
  )
}
