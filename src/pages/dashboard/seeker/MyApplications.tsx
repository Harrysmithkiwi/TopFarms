import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ApplicationCard } from '@/components/ui/ApplicationCard'
import { MyApplicationsSidebar } from '@/components/ui/MyApplicationsSidebar'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useSavedJobs } from '@/hooks/useSavedJobs'
import type { Application, ApplicationStatus, MatchScore, JobListing } from '@/types/domain'
import { ACTIVE_STATUSES, COMPLETED_STATUSES } from '@/types/domain'

type ApplicationWithJob = Application & {
  jobs: JobListing & { employer_profiles: { farm_name: string; region: string } }
} & { viewed_at?: string | null }

function SkeletonCard() {
  return (
    <div className="bg-white border-[1.5px] border-fog rounded-[12px] p-4 animate-pulse">
      <div className="flex gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-fog rounded w-3/4" />
          <div className="h-3 bg-fog rounded w-1/2" />
          <div className="h-3 bg-fog rounded w-1/3" />
        </div>
        <div className="w-9 h-9 bg-fog rounded-full flex-shrink-0" />
      </div>
    </div>
  )
}

export function MyApplications() {
  const { session } = useAuth()
  const { toggleSave } = useSavedJobs(session?.user?.id ?? null)

  const [applications, setApplications] = useState<ApplicationWithJob[]>([])
  const [scoreMap, setScoreMap] = useState<Map<string, MatchScore>>(new Map())
  const [loading, setLoading] = useState(true)
  const [sidebarFilter, setSidebarFilter] = useState('all')
  const [savedJobDetails, setSavedJobDetails] = useState<{ job_id: string; title: string; farm_name: string }[]>([])
  const [profileStrength, setProfileStrength] = useState(0)

  useEffect(() => {
    async function loadData() {
      if (!session?.user) {
        setLoading(false)
        return
      }

      // Get seeker profile ID
      const { data: profileData, error: profileError } = await supabase
        .from('seeker_profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (profileError || !profileData) {
        setLoading(false)
        return
      }

      const profileId = profileData.id

      // Load applications with job details
      const { data, error } = await supabase
        .from('applications')
        .select('*, jobs(*, employer_profiles(farm_name, region))')
        .eq('seeker_id', profileId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('MyApplications: failed to load applications', error)
        setLoading(false)
        return
      }

      const apps = (data ?? []) as ApplicationWithJob[]
      setApplications(apps)

      // Fetch batch match scores for all unique job IDs
      if (apps.length > 0) {
        const jobIds = [...new Set(apps.map((a) => a.job_id))]
        const { data: scores } = await supabase
          .from('match_scores')
          .select('job_id, total_score, breakdown')
          .eq('seeker_id', profileId)
          .in('job_id', jobIds)

        if (scores && Array.isArray(scores)) {
          const map = new Map<string, MatchScore>()
          for (const row of scores as { job_id: string; total_score: number; breakdown: MatchScore['breakdown'] }[]) {
            map.set(row.job_id, { total_score: row.total_score, breakdown: row.breakdown })
          }
          setScoreMap(map)
        }
      }

      // Fetch saved jobs with titles for sidebar
      const { data: savedData } = await supabase
        .from('saved_jobs')
        .select('job_id, jobs(title, employer_profiles(farm_name))')
        .eq('user_id', session.user.id)
      setSavedJobDetails((savedData ?? []).map((s: any) => ({
        job_id: s.job_id,
        title: s.jobs?.title ?? 'Unknown',
        farm_name: s.jobs?.employer_profiles?.farm_name ?? '',
      })))

      // Profile strength: count non-null key fields on seeker_profiles
      const { data: profileRow } = await supabase
        .from('seeker_profiles')
        .select('region, years_experience, dairynz_level, sector_pref, shed_types_experienced, accommodation_needed')
        .eq('user_id', session.user.id)
        .single()
      if (profileRow) {
        const fields = ['region', 'years_experience', 'dairynz_level', 'sector_pref', 'shed_types_experienced', 'accommodation_needed']
        const filled = fields.filter(f => {
          const val = (profileRow as any)[f]
          return val !== null && val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0)
        }).length
        setProfileStrength(Math.round((filled / fields.length) * 100))
      }

      setLoading(false)
    }

    loadData()
  }, [session?.user?.id])

  async function handleWithdraw(applicationId: string) {
    const { error } = await supabase
      .from('applications')
      .update({ status: 'withdrawn' })
      .eq('id', applicationId)

    if (error) {
      toast.error('Failed to withdraw application')
      return
    }

    toast.success('Application withdrawn')
    setApplications((prev) =>
      prev.map((a) =>
        a.id === applicationId ? { ...a, status: 'withdrawn' as ApplicationStatus } : a,
      ),
    )
  }

  async function handleAcceptInterview(applicationId: string) {
    toast.success('Interview accepted — the employer will be in touch shortly.')
  }

  async function handleDeclineInterview(applicationId: string) {
    const { error } = await supabase
      .from('applications')
      .update({ status: 'declined' })
      .eq('id', applicationId)

    if (error) {
      toast.error('Failed to decline interview')
      return
    }

    toast.success('Interview declined')
    setApplications((prev) =>
      prev.map((a) =>
        a.id === applicationId ? { ...a, status: 'declined' as ApplicationStatus } : a,
      ),
    )
  }

  // Compute status counts
  const statusCounts: Record<string, number> = {}
  for (const app of applications) {
    statusCounts[app.status] = (statusCounts[app.status] ?? 0) + 1
  }

  // Filter applications by sidebar filter
  const filteredApplications = applications.filter((app) => {
    if (sidebarFilter === 'all') return true
    if (sidebarFilter === 'active') return ACTIVE_STATUSES.includes(app.status)
    if (sidebarFilter === 'shortlisted') return app.status === 'shortlisted'
    if (sidebarFilter === 'closed') return COMPLETED_STATUSES.includes(app.status)
    return true
  })

  return (
    <DashboardLayout hideSidebar>
      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <h1
              className="font-display text-3xl font-semibold"
              style={{ color: 'var(--color-soil)' }}
            >
              My Applications
            </h1>
            {!loading && applications.length > 0 && (
              <span
                className="px-2.5 py-1 rounded-full text-[12px] font-body font-semibold"
                style={{ backgroundColor: 'var(--color-fog)', color: 'var(--color-mid)' }}
              >
                {applications.length}
              </span>
            )}
          </div>

          {/* Loading state */}
          {loading && (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}

          {/* Empty state */}
          {!loading && applications.length === 0 && (
            <div
              className="rounded-[12px] p-12 text-center"
              style={{ backgroundColor: 'var(--color-mist)' }}
            >
              <p className="text-base font-body font-semibold mb-2" style={{ color: 'var(--color-ink)' }}>
                You haven't applied to any jobs yet.
              </p>
              <p className="text-sm mb-4" style={{ color: 'var(--color-mid)' }}>
                Browse open roles to find your next farm position.
              </p>
              <Link
                to="/jobs"
                className="text-sm font-body font-semibold text-moss hover:underline"
              >
                Browse jobs
              </Link>
            </div>
          )}

          {/* Application list */}
          {!loading && filteredApplications.length > 0 && (
            <div className="space-y-3">
              {filteredApplications.map((app) => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  matchScore={scoreMap.get(app.job_id) ?? null}
                  onWithdraw={handleWithdraw}
                  onAcceptInterview={handleAcceptInterview}
                  onDeclineInterview={handleDeclineInterview}
                />
              ))}
            </div>
          )}

          {/* Filtered empty state (when filter active but no matches) */}
          {!loading && applications.length > 0 && filteredApplications.length === 0 && (
            <div
              className="rounded-[12px] p-8 text-center"
              style={{ backgroundColor: 'var(--color-mist)' }}
            >
              <p className="text-sm font-body text-mid">No applications match this filter.</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <MyApplicationsSidebar
          statusCounts={statusCounts}
          totalCount={applications.length}
          activeFilter={sidebarFilter}
          onFilterChange={setSidebarFilter}
          savedJobs={savedJobDetails}
          profileStrength={profileStrength}
          onRemoveSavedJob={(jobId) => {
            toggleSave(jobId)
            setSavedJobDetails(prev => prev.filter(sj => sj.job_id !== jobId))
          }}
        />
      </div>
    </DashboardLayout>
  )
}
