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
      <div className="bg-white border border-fog rounded-[12px] p-4">
        <h3 className="text-[13px] font-body font-semibold text-ink mb-3">Application Status</h3>
        <div className="space-y-2">
          {[
            { label: 'Applied', key: 'applied', color: 'bg-blue-500' },
            { label: 'Shortlisted', key: 'shortlisted', color: 'bg-purple-500' },
            { label: 'Interview', key: 'interview', color: 'bg-orange-500' },
            { label: 'Offered', key: 'offered', color: 'bg-green-500' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between text-[13px] font-body">
              <div className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full', item.color)} />
                <span className="text-mid">{item.label}</span>
              </div>
              <span className="font-semibold text-ink">{statusCounts[item.key] ?? 0}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-fog flex justify-between text-[13px] font-body">
          <span className="text-mid">Total</span>
          <span className="font-semibold text-ink">{totalCount}</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="bg-white border border-fog rounded-[12px] p-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onFilterChange(tab.value)}
              className={cn(
                'px-3 py-1 rounded-full text-[12px] font-body font-semibold transition-colors border',
                activeFilter === tab.value
                  ? 'bg-moss/10 border-moss text-moss'
                  : 'bg-white border-fog text-mid hover:border-mid',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Saved Jobs */}
      <div className="bg-white border border-fog rounded-[12px] p-4">
        <h3 className="text-[13px] font-body font-semibold text-ink mb-3 flex items-center gap-1.5">
          <Bookmark className="w-3.5 h-3.5 text-hay" />
          Saved Jobs
        </h3>
        {savedJobs.length === 0 ? (
          <div>
            <p className="text-[13px] font-body text-mid">No saved jobs.</p>
            <p className="text-[12px] font-body text-light mt-0.5">Bookmark a job to save it for later.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {savedJobs.map((sj) => (
              <div key={sj.job_id} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    to={`/jobs/${sj.job_id}`}
                    className="text-[13px] font-body font-semibold text-ink hover:text-moss transition-colors truncate block"
                  >
                    {sj.title}
                  </Link>
                  <p className="text-[11px] font-body text-light truncate">{sj.farm_name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveSavedJob(sj.job_id)}
                  className="text-hay hover:text-red flex-shrink-0 mt-0.5"
                  aria-label="Remove saved job"
                >
                  <Bookmark className="w-3.5 h-3.5 fill-hay" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Profile Strength Nudge */}
      <div className="bg-white border border-fog rounded-[12px] p-4">
        <h3 className="text-[13px] font-body font-semibold text-ink mb-2">Profile Strength</h3>
        <div className="w-full h-2 bg-fog rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${profileStrength}%`,
              background:
                profileStrength >= 80
                  ? 'var(--color-moss)'
                  : profileStrength >= 50
                    ? 'var(--color-hay)'
                    : 'var(--color-red)',
            }}
          />
        </div>
        <p className="text-[12px] font-body text-mid">
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
