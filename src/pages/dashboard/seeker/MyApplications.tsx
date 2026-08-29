import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { SlidersHorizontal } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ApplicationCard } from '@/components/ui/ApplicationCard'
import { MyApplicationsSidebar } from '@/components/ui/MyApplicationsSidebar'
import { supabase } from '@/lib/supabase'
import { reportError } from '@/lib/observability'
import { useAuth } from '@/hooks/useAuth'
import { useSavedJobs } from '@/hooks/useSavedJobs'
import { computeProfileStrength, PROFILE_STRENGTH_SELECT } from '@/lib/profileStrength'
import type {
  Application,
  ApplicationEvent,
  ApplicationStatus,
  MatchScore,
  JobListing,
} from '@/types/domain'
import { ACTIVE_STATUSES, COMPLETED_STATUSES } from '@/types/domain'
import { ErrorState } from '@/components/ui/ErrorState'

type ApplicationWithJob = Application & {
  jobs: JobListing & { employer_profiles: { farm_name: string; region: string } }
} & { viewed_at?: string | null }

function SkeletonCard() {
  return (
    <div className="bg-surface border-border animate-pulse rounded-12 border-[1.5px] p-4">
      <div className="flex gap-3">
        <div className="flex-1 space-y-2">
          <div className="bg-surface-2 h-4 w-3/4 rounded" />
          <div className="bg-surface-2 h-3 w-1/2 rounded" />
          <div className="bg-surface-2 h-3 w-1/3 rounded" />
        </div>
        <div className="bg-surface-2 h-9 w-9 flex-shrink-0 rounded-full" />
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
  // Phase 5.6 — failed is not empty.
  const [loadError, setLoadError] = useState(false)
  const [reloadNonce, setReloadNonce] = useState(0)
  const [sidebarFilter, setSidebarFilter] = useState('all')
  const [sidebarSheetOpen, setSidebarSheetOpen] = useState(false)
  const [eventsMap, setEventsMap] = useState<Map<string, ApplicationEvent[]>>(new Map())
  const [savedJobDetails, setSavedJobDetails] = useState<
    { job_id: string; title: string; farm_name: string }[]
  >([])
  const [profileStrength, setProfileStrength] = useState(0)

  useEffect(() => {
    async function loadData() {
      setLoadError(false)
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

      if (profileError && profileError.code !== 'PGRST116') {
        reportError('seeker applications: load profile', profileError)
        setLoadError(true)
        setLoading(false)
        return
      }
      if (!profileData) {
        setLoading(false)
        return
      }

      const profileId = profileData.id

      // Load applications with job details
      const { data, error } = await supabase
        .from('applications')
        .select('*, jobs(*, employer_profiles:marketplace_employer_profiles(farm_name, region))')
        .eq('seeker_id', profileId)
        .order('created_at', { ascending: false })

      if (error) {
        reportError('seeker applications: load applications', error)
        setLoadError(true)
        setLoading(false)
        return
      }

      const apps = (data ?? []) as ApplicationWithJob[]
      setApplications(apps)

      // Timeline: the append-only application_events rows (migration 107),
      // batched in one query and grouped per application.
      if (apps.length > 0) {
        const { data: eventRows } = await supabase
          .from('application_events')
          .select('id, application_id, event_type, from_status, to_status, actor, created_at')
          .in('application_id', apps.map((a) => a.id))
          .order('created_at', { ascending: true })
        if (eventRows) {
          const map = new Map<string, ApplicationEvent[]>()
          for (const ev of eventRows as ApplicationEvent[]) {
            const list = map.get(ev.application_id) ?? []
            list.push(ev)
            map.set(ev.application_id, list)
          }
          setEventsMap(map)
        }
      }

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
          for (const row of scores as {
            job_id: string
            total_score: number
            breakdown: MatchScore['breakdown']
          }[]) {
            map.set(row.job_id, { total_score: row.total_score, breakdown: row.breakdown })
          }
          setScoreMap(map)
        }
      }

      // Fetch saved jobs with titles for sidebar
      const { data: savedData } = await supabase
        .from('saved_jobs')
        .select('job_id, jobs(title, employer_profiles:marketplace_employer_profiles(farm_name))')
        .eq('user_id', session.user.id)
      // Untyped nested-join shape; `any` goes away with generated DB types
      // (audit task 2.3).
      setSavedJobDetails(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (savedData ?? []).map((s: any) => ({
          job_id: s.job_id,
          title: s.jobs?.title ?? 'Unknown',
          farm_name: s.jobs?.employer_profiles?.farm_name ?? '',
        })),
      )

      // Profile strength: shared formula (src/lib/profileStrength.ts). This page
      // used to count 6 fields while the dashboard counted 8, so the same seeker
      // read two different percentages on two screens.
      const { data: profileRow } = await supabase
        .from('seeker_profiles')
        .select(PROFILE_STRENGTH_SELECT)
        .eq('user_id', session.user.id)
        .single()
      if (profileRow) {
        setProfileStrength(computeProfileStrength(profileRow as unknown as Record<string, unknown>))
      }

      setLoading(false)
    }

    loadData()
  }, [session?.user?.id, reloadNonce])

  async function handleWithdraw(applicationId: string) {
    // Confirmation is handled by ApplicationCard before this fires.
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
    // accept_interview() (migration 107) validates ownership + status server-side,
    // stamps interview_accepted_at, and writes the timeline event. Idempotent.
    const { data, error } = await supabase.rpc('accept_interview', {
      p_application_id: applicationId,
    })

    if (error) {
      toast.error('Could not accept the interview — please try again')
      return
    }

    const acceptedAt = (data as string | null) ?? new Date().toISOString()
    toast.success('Interview accepted — the employer will be in touch shortly.')
    setApplications((prev) =>
      prev.map((a) => (a.id === applicationId ? { ...a, interview_accepted_at: acceptedAt } : a)),
    )
    // Refetch this application's events so the timeline shows the acceptance
    // as the server recorded it (not a client-side fabrication).
    const { data: eventRows } = await supabase
      .from('application_events')
      .select('id, application_id, event_type, from_status, to_status, actor, created_at')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: true })
    if (eventRows) {
      setEventsMap((prev) => {
        const next = new Map(prev)
        next.set(applicationId, eventRows as ApplicationEvent[])
        return next
      })
    }
  }

  async function handleDeclineInterview(applicationId: string) {
    // Declining an interview is the CANDIDATE stepping away, so it maps to the
    // seeker's own edge in the state machine: -> withdrawn. The old handler
    // wrote status='declined' — an employer-only transition that migration
    // 097's trigger has been rejecting since it shipped, so this button
    // errored for every seeker who pressed it.
    const app = applications.find((a) => a.id === applicationId)
    if (
      !window.confirm(
        `Decline this interview? This withdraws your application for ${app?.jobs?.title ?? 'this job'}. You can re-apply later if you change your mind.`,
      )
    ) {
      return
    }
    const { error } = await supabase
      .from('applications')
      .update({ status: 'withdrawn' })
      .eq('id', applicationId)

    if (error) {
      toast.error('Failed to decline interview')
      return
    }

    toast.success('Interview declined — application withdrawn')
    setApplications((prev) =>
      prev.map((a) =>
        a.id === applicationId ? { ...a, status: 'withdrawn' as ApplicationStatus } : a,
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
        <div className="min-w-0 flex-1 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <h1
              className="font-display text-[36px] leading-[44px] font-medium text-brand-900"
            >
              My Applications
            </h1>
            {!loading && applications.length > 0 && (
              <span
                className="font-body bg-border text-text-muted rounded-full px-2.5 py-1 text-xs font-semibold"
              >
                {applications.length}
              </span>
            )}

            {/* Mobile: status filters + saved jobs live in a bottom sheet
                (Phase 4.2, same pattern as JobSearch's filter drawer) */}
            <div className="ml-auto md:hidden">
              <Dialog.Root open={sidebarSheetOpen} onOpenChange={setSidebarSheetOpen}>
                <Dialog.Trigger asChild>
                  <button
                    type="button"
                    className="border-border bg-surface font-body text-text-muted hover:border-border-strong flex min-h-11 items-center gap-2 rounded-8 border px-3 py-2 text-label transition-colors"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters &amp; saved
                  </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
                  <Dialog.Content
                    className="bg-surface fixed right-0 bottom-0 left-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-16 p-4"
                    aria-describedby={undefined}
                  >
                    <Dialog.Title className="sr-only">Filters and saved jobs</Dialog.Title>
                    <MyApplicationsSidebar
                      className="w-full"
                      statusCounts={statusCounts}
                      totalCount={applications.length}
                      activeFilter={sidebarFilter}
                      onFilterChange={(filter) => {
                        setSidebarSheetOpen(false)
                        setSidebarFilter(filter)
                      }}
                      savedJobs={savedJobDetails}
                      profileStrength={profileStrength}
                      onRemoveSavedJob={(jobId) => {
                        toggleSave(jobId)
                        setSavedJobDetails((prev) => prev.filter((sj) => sj.job_id !== jobId))
                      }}
                    />
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            </div>
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
          {!loading && loadError && (
            <ErrorState
              message="We could not load your applications"
              onRetry={() => setReloadNonce((n) => n + 1)}
            />
          )}

          {!loading && !loadError && applications.length === 0 && (
            <div
              className="rounded-12 p-12 text-center bg-surface-2"
            >
              <p
                className="font-body mb-2 text-base font-semibold text-text"
              >
                You haven't applied to any jobs yet.
              </p>
              <p className="mb-4 text-sm text-text-muted">
                Browse open roles to find your next farm position.
              </p>
              <Link
                to="/jobs"
                className="font-body text-brand-hover text-sm font-semibold hover:underline"
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
                  events={eventsMap.get(app.id)}
                  onWithdraw={handleWithdraw}
                  onAcceptInterview={handleAcceptInterview}
                  onDeclineInterview={handleDeclineInterview}
                />
              ))}
            </div>
          )}

          {/* Filtered empty state (when filter active but no matches) */}
          {!loading && !loadError && applications.length > 0 && filteredApplications.length === 0 && (
            <div
              className="rounded-12 p-8 text-center bg-surface-2"
            >
              <p className="font-body text-text-muted text-sm">
                No applications match this filter.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar — desktop only; mobile uses the bottom sheet (Phase 4.2) */}
        <MyApplicationsSidebar
          className="hidden md:block"
          statusCounts={statusCounts}
          totalCount={applications.length}
          activeFilter={sidebarFilter}
          onFilterChange={setSidebarFilter}
          savedJobs={savedJobDetails}
          profileStrength={profileStrength}
          onRemoveSavedJob={(jobId) => {
            toggleSave(jobId)
            setSavedJobDetails((prev) => prev.filter((sj) => sj.job_id !== jobId))
          }}
        />
      </div>
    </DashboardLayout>
  )
}
