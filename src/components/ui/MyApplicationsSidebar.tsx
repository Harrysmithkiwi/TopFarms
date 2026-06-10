import { Link } from 'react-router'
import { Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SavedJob {
  job_id: string
  title: string
  farm_name: string
}

interface MyApplicationsSidebarProps {
  statusCounts: Record<string, number>
  totalCount: number
  activeFilter: string
  onFilterChange: (filter: string) => void
  savedJobs: SavedJob[]
  profileStrength: number // 0-100
  onRemoveSavedJob: (jobId: string) => void
}

const FILTER_TABS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'closed', label: 'Closed' },
]

export function MyApplicationsSidebar({
  statusCounts,
  totalCount,
  activeFilter,
  onFilterChange,
  savedJobs,
  profileStrength,
  onRemoveSavedJob,
}: MyApplicationsSidebarProps) {
  return (
    <aside className="w-[260px] flex-shrink-0 space-y-4">
      {/* Status Summary */}
      <div className="bg-surface border-border rounded-[12px] border p-4">
        <h3 className="font-body text-text mb-3 text-[13px] font-semibold">Application Status</h3>
        <div className="space-y-2">
          {[
            { label: 'Applied', key: 'applied', color: 'bg-blue-500' },
            { label: 'Shortlisted', key: 'shortlisted', color: 'bg-purple-500' },
            { label: 'Interview', key: 'interview', color: 'bg-orange-500' },
            { label: 'Offered', key: 'offered', color: 'bg-green-500' },
          ].map((item) => (
            <div key={item.key} className="font-body flex items-center justify-between text-[13px]">
              <div className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full', item.color)} />
                <span className="text-text-muted">{item.label}</span>
              </div>
              <span className="text-text font-semibold">{statusCounts[item.key] ?? 0}</span>
            </div>
          ))}
        </div>
        <div className="border-border font-body mt-3 flex justify-between border-t pt-3 text-[13px]">
          <span className="text-text-muted">Total</span>
          <span className="text-text font-semibold">{totalCount}</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="bg-surface border-border rounded-[12px] border p-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onFilterChange(tab.value)}
              className={cn(
                'font-body rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors',
                activeFilter === tab.value
                  ? 'bg-brand/10 border-brand text-brand'
                  : 'bg-surface border-border text-text-muted hover:border-border-strong',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Saved Jobs */}
      <div className="bg-surface border-border rounded-[12px] border p-4">
        <h3 className="font-body text-text mb-3 flex items-center gap-1.5 text-[13px] font-semibold">
          <Bookmark className="text-warn h-3.5 w-3.5" />
          Saved Jobs
        </h3>
        {savedJobs.length === 0 ? (
          <div>
            <p className="font-body text-text-muted text-[13px]">No saved jobs.</p>
            <p className="font-body text-text-subtle mt-0.5 text-[12px]">
              Bookmark a job to save it for later.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {savedJobs.map((sj) => (
              <div key={sj.job_id} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    to={`/jobs/${sj.job_id}`}
                    className="font-body text-text hover:text-brand block truncate text-[13px] font-semibold transition-colors"
                  >
                    {sj.title}
                  </Link>
                  <p className="font-body text-text-subtle truncate text-[11px]">{sj.farm_name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveSavedJob(sj.job_id)}
                  className="text-warn hover:text-danger mt-0.5 flex-shrink-0"
                  aria-label="Remove saved job"
                >
                  <Bookmark className="fill-warn h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Profile Strength Nudge */}
      <div className="bg-surface border-border rounded-[12px] border p-4">
        <h3 className="font-body text-text mb-2 text-[13px] font-semibold">Profile Strength</h3>
        <div className="bg-border mb-2 h-2 w-full overflow-hidden rounded-full">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${profileStrength}%`,
              background:
                profileStrength >= 80
                  ? 'var(--color-brand)'
                  : profileStrength >= 50
                    ? 'var(--color-warn)'
                    : 'var(--color-danger)',
            }}
          />
        </div>
        <p className="font-body text-text-muted text-[12px]">
          {profileStrength >= 80
            ? 'Your profile is looking great!'
            : profileStrength >= 50
              ? 'Add more details to improve your match scores.'
              : 'Complete your profile to get better matches.'}
        </p>
      </div>
    </aside>
  )
}
