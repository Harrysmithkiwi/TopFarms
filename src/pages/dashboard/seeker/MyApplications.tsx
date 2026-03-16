import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ApplicationCard } from '@/components/ui/ApplicationCard'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Application, ApplicationStatus, MatchScore, JobListing } from '@/types/domain'
import { ACTIVE_STATUSES, COMPLETED_STATUSES } from '@/types/domain'

type ApplicationWithJob = Application & {
  jobs: JobListing & { employer_profiles: { farm_name: string; region: string } }
}

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

  const [applications, setApplications] = useState<ApplicationWithJob[]>([])
  const [scoreMap, setScoreMap] = useState<Map<string, MatchScore>>(new Map())
  const [loading, setLoading] = useState(true)

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
    // Move application from active to completed in local state
    setApplications((prev) =>
      prev.map((a) =>
        a.id === applicationId ? { ...a, status: 'withdrawn' as ApplicationStatus } : a,
      ),
    )
  }

  const activeApplications = applications.filter((a) => ACTIVE_STATUSES.includes(a.status))
  const completedApplications = applications.filter((a) => COMPLETED_STATUSES.includes(a.status))

  return (
    <DashboardLayout>
      <div className="space-y-6">
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
              No applications yet
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--color-mid)' }}>
              Start applying to farm jobs to track your progress here
            </p>
            <Link
              to="/jobs"
              className="text-sm font-body font-semibold text-moss hover:underline"
            >
              Browse jobs
            </Link>
          </div>
        )}

        {/* Active Applications section */}
        {!loading && activeApplications.length > 0 && (
          <div>
            <h2
              className="text-base font-body font-bold mb-3"
              style={{ color: 'var(--color-ink)' }}
            >
              Active Applications
              <span
                className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ backgroundColor: 'var(--color-fog)', color: 'var(--color-mid)' }}
              >
                {activeApplications.length}
              </span>
            </h2>
            <div className="space-y-3">
              {activeApplications.map((app) => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  matchScore={scoreMap.get(app.job_id) ?? null}
                  onWithdraw={handleWithdraw}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed section */}
        {!loading && completedApplications.length > 0 && (
          <div>
            <h2
              className="text-base font-body font-bold mb-3"
              style={{ color: 'var(--color-ink)' }}
            >
              Completed
              <span
                className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ backgroundColor: 'var(--color-fog)', color: 'var(--color-mid)' }}
              >
                {completedApplications.length}
              </span>
            </h2>
            <div className="space-y-3 opacity-80">
              {completedApplications.map((app) => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  matchScore={scoreMap.get(app.job_id) ?? null}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
