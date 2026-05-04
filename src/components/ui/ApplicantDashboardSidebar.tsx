import { cn } from '@/lib/utils'

interface JobOption {
  id: string
  title: string
  applicant_count: number
}

interface ApplicantDashboardSidebarProps {
  farmName: string
  jobs: JobOption[]
  selectedJobId: string
  onJobSelect: (jobId: string) => void
  stats: { applied: number; shortlisted: number; hired: number }
}

export function ApplicantDashboardSidebar({
  farmName,
  jobs,
  selectedJobId,
  onJobSelect,
  stats,
}: ApplicantDashboardSidebarProps) {
  return (
    <aside className={cn('w-[260px] flex-shrink-0 space-y-4')}>
      {/* Farm header */}
      <div className="rounded-[12px] overflow-hidden">
        <div className="bg-brand-900 text-white px-4 py-3">
          <h2 className="font-display text-[16px] font-semibold">{farmName}</h2>
        </div>
        {/* Listing selector */}
        <div className="bg-surface border border-border border-t-0 rounded-b-[12px] p-3">
          <label className="text-[11px] font-body font-semibold uppercase tracking-wide text-text-subtle block mb-1.5">
            Listing
          </label>
          <select
            value={selectedJobId}
            onChange={(e) => onJobSelect(e.target.value)}
            className="w-full text-[13px] font-body text-text border border-border rounded-[6px] px-2 py-1.5 bg-surface focus:outline-none focus:border-brand cursor-pointer"
          >
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} ({job.applicant_count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick stats */}
      <div className="bg-surface border border-border rounded-[12px] p-4">
        <h3 className="text-[11px] font-body font-semibold uppercase tracking-wide text-text-subtle mb-3">
          Quick Stats
        </h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Applied', value: stats.applied },
            { label: 'Shortlisted', value: stats.shortlisted },
            { label: 'Hired', value: stats.hired },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-[16px] font-body font-semibold text-text">{stat.value}</p>
              <p className="text-[11px] font-body text-text-subtle">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
