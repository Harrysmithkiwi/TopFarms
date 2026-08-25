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
  // Phase 4.2: the page renders this twice — desktop rail (hidden md:block)
  // and inside the mobile bottom sheet (w-full), same as FilterSidebar.
  className?: string
}

export function ApplicantDashboardSidebar({
  farmName,
  jobs,
  selectedJobId,
  onJobSelect,
  stats,
  className,
}: ApplicantDashboardSidebarProps) {
  return (
    <aside className={cn('w-[260px] flex-shrink-0 space-y-4', className)}>
      {/* Farm header */}
      <div className="overflow-hidden rounded-12">
        <div className="bg-brand-900 px-4 py-3 text-white">
          {/* Card title at 16px — Inter 600, not the display face. See JobDetailSidebar. */}
          <h2 className="font-body text-[16px] font-semibold">{farmName}</h2>
        </div>
        {/* Listing selector */}
        <div className="bg-surface border-border rounded-b-12 border border-t-0 p-3">
          <label
            htmlFor="applicant-dashboard-listing"
            className="font-body text-text-subtle mb-1.5 block text-[11px] font-semibold tracking-wide uppercase"
          >
            Listing
          </label>
          <select
            id="applicant-dashboard-listing"
            value={selectedJobId}
            onChange={(e) => onJobSelect(e.target.value)}
            className="font-body text-text border-border bg-surface focus:border-brand w-full cursor-pointer rounded-8 border px-2 py-1.5 text-[13px]"
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
      <div className="bg-surface border-border rounded-12 border p-4">
        <h3 className="font-body text-text-subtle mb-3 text-[11px] font-semibold tracking-wide uppercase">
          Quick Stats
        </h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Active', value: stats.applied },
            { label: 'Shortlisted', value: stats.shortlisted },
            { label: 'Hired', value: stats.hired },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-body text-text text-[16px] font-semibold">{stat.value}</p>
              <p className="font-body text-text-subtle text-[11px]">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
