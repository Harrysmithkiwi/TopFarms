import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router'
import { Plus, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { JobCard } from '@/components/ui/JobCard'
import { VerificationBadge } from '@/components/ui/VerificationBadge'
import { Button } from '@/components/ui/Button'
import { MarkFilledModal } from '@/pages/jobs/MarkFilledModal'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useVerifications } from '@/hooks/useVerifications'
import type { JobListing, JobStatus } from '@/types/domain'

const TOTAL_STEPS = 8

type FilterTab = 'all' | 'active' | 'drafts' | 'paused' | 'filled_expired'

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'drafts', label: 'Drafts' },
  { id: 'paused', label: 'Paused' },
  { id: 'filled_expired', label: 'Filled / Expired' },
]

function filterJobs(jobs: JobListing[], tab: FilterTab): JobListing[] {
  switch (tab) {
    case 'active':
      return jobs.filter((j) => j.status === 'active')
    case 'drafts':
      return jobs.filter((j) => j.status === 'draft')
    case 'paused':
      return jobs.filter((j) => j.status === 'paused')
    case 'filled_expired':
      return jobs.filter((j) => j.status === 'filled' || j.status === 'expired')
    default:
      return jobs
  }
}

interface EmployerProfile {
  id: string
  farm_name: string
  onboarding_step: number
  onboarding_complete: boolean
}

export function EmployerDashboard() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<EmployerProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  const [jobs, setJobs] = useState<JobListing[]>([])
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [appCountMap, setAppCountMap] = useState<Map<string, number>>(new Map())

  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null)

  const [markFilledJobId, setMarkFilledJobId] = useState<string | null>(null)
  const [isMarkFilledOpen, setIsMarkFilledOpen] = useState(false)

  // Load verifications only once profile.id is known
  const { verifications, trustLevel } = useVerifications(profile?.id ?? null)

  // Load employer profile on mount
  useEffect(() => {
    async function loadProfile() {
      if (!session?.user) {
        setLoadingProfile(false)
        return
      }

      const { data, error } = await supabase
        .from('employer_profiles')
        .select('id, farm_name, onboarding_step, onboarding_complete')
        .eq('user_id', session.user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('EmployerDashboard: failed to load profile', error)
      }

      if (data) {
        setProfile({
          id: data.id,
          farm_name: data.farm_name ?? 'Your Farm',
          onboarding_step: data.onboarding_step ?? 0,
          onboarding_complete: data.onboarding_complete ?? false,
        })
      } else {
        setProfile({ id: '', farm_name: '', onboarding_step: 0, onboarding_complete: false })
      }

      setLoadingProfile(false)
    }

    loadProfile()
  }, [session?.user?.id])

  // Load jobs when profile is ready and onboarding complete
  const loadJobs = useCallback(async () => {
    if (!profile?.id || !profile.onboarding_complete) return

    setLoadingJobs(true)
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('employer_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('EmployerDashboard: failed to load jobs', error)
        return
      }

      const jobList = (data as JobListing[]) ?? []
      setJobs(jobList)

      // Load application counts per job
      const jobIds = jobList.map((j) => j.id)
      if (jobIds.length > 0) {
        const { data: appCounts } = await supabase
          .from('applications')
          .select('job_id, id')
          .in('job_id', jobIds)

        if (appCounts) {
          const countMap = new Map<string, number>()
          for (const row of appCounts) {
            countMap.set(row.job_id, (countMap.get(row.job_id) ?? 0) + 1)
          }
          setAppCountMap(countMap)
        }
      }
    } finally {
      setLoadingJobs(false)
    }
  }, [profile?.id, profile?.onboarding_complete])

  useEffect(() => {
    loadJobs()
  }, [loadJobs])

  const onboardingProgress = profile
    ? Math.round((profile.onboarding_step / TOTAL_STEPS) * 100)
    : 0

  const isOnboardingComplete = profile?.onboarding_complete ?? false

  // Quick stats
  const activeCount = jobs.filter((j) => j.status === 'active').length
  const draftCount = jobs.filter((j) => j.status === 'draft').length
  const totalViews = jobs.reduce((sum, j) => sum + (j.views_count ?? 0), 0)

  // Filter jobs for the selected tab (exclude drafts from main list — they go in Drafts section)
  const filteredJobs = filterJobs(jobs, activeTab)
  const draftJobs = jobs.filter((j) => j.status === 'draft')

  // Action handlers
  async function handlePauseResume(job: JobListing) {
    const newStatus: JobStatus = job.status === 'active' ? 'paused' : 'active'
    const { error } = await supabase
      .from('jobs')
      .update({ status: newStatus })
      .eq('id', job.id)

    if (error) {
      toast.error('Failed to update listing status')
      console.error('handlePauseResume error', error)
      return
    }

    toast.success(newStatus === 'active' ? 'Listing resumed' : 'Listing paused')
    loadJobs()
  }

  async function handleArchive(jobId: string) {
    setConfirmArchiveId(null)
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'archived' })
      .eq('id', jobId)

    if (error) {
      toast.error('Failed to archive listing')
      console.error('handleArchive error', error)
      return
    }

    toast.success('Listing archived')
    loadJobs()
  }

  function handleMarkFilled(jobId: string) {
    setMarkFilledJobId(jobId)
    setIsMarkFilledOpen(true)
  }

  if (loadingProfile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <p className="text-sm" style={{ color: 'var(--color-text-subtle)' }}>
            Loading...
          </p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Onboarding prompt (only if not complete) */}
        {!isOnboardingComplete && (
          <Card className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-3xl"
                style={{ backgroundColor: 'var(--color-warn-bg)' }}
              >
                🌾
              </div>
              <div className="flex-1 min-w-0">
                <h2
                  className="text-lg font-semibold mb-1"
                  style={{ color: 'var(--color-text)' }}
                >
                  Complete your farm profile to start posting jobs
                </h2>
                <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
                  Set up your farm details, verification, and team culture to attract the best
                  candidates
                </p>
                <ProgressBar progress={onboardingProgress} className="mb-2" />
                <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                  {profile?.onboarding_step ?? 0} of {TOTAL_STEPS} steps completed
                </p>
              </div>
              <div className="flex-shrink-0">
                <Link
                  to="/onboarding/employer"
                  className={cn(
                    'font-body font-bold rounded-[8px] transition-all duration-200 inline-flex items-center justify-center',
                    'bg-brand text-white hover:bg-brand-hover',
                    'px-4 py-2 text-[13px]',
                  )}
                >
                  {(profile?.onboarding_step ?? 0) > 0 ? 'Continue Setup' : 'Get Started'}
                </Link>
              </div>
            </div>
          </Card>
        )}

        {/* Full dashboard (when onboarding complete) */}
        {isOnboardingComplete && (
          <>
            {/* Header row */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1
                  className="font-display text-3xl font-semibold"
                  style={{ color: 'var(--color-brand-900)' }}
                >
                  Welcome back, {profile?.farm_name || 'Your Farm'}
                </h1>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Manage your job listings and applications
                </p>
              </div>
              <Link
                to="/jobs/new"
                className={cn(
                  'font-body font-bold rounded-[8px] transition-all duration-200 inline-flex items-center justify-center gap-1.5',
                  'bg-brand text-white hover:bg-brand-hover',
                  'px-4 py-2 text-[13px] flex-shrink-0',
                )}
              >
                <Plus className="w-4 h-4" />
                Post a Job
              </Link>
            </div>

            {/* Verification nudge card (if not fully verified) */}
            {trustLevel !== 'fully_verified' && (
              <Card className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-body font-semibold" style={{ color: 'var(--color-text)' }}>
                          Boost your trust level
                        </p>
                        <VerificationBadge
                          verifications={verifications}
                          trustLevel={trustLevel}
                          expandable={false}
                        />
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        Complete your verification to attract more candidates
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/dashboard/employer/verification"
                    className={cn(
                      'font-body font-bold rounded-[8px] transition-all duration-200 inline-flex items-center justify-center',
                      'bg-surface border border-brand text-brand hover:bg-surface-2',
                      'px-4 py-2 text-[13px] flex-shrink-0',
                    )}
                  >
                    Improve Trust Level
                  </Link>
                </div>
              </Card>
            )}

            {/* Quick Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-5">
                <p className="text-[12px] font-body font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-subtle)' }}>
                  Active Listings
                </p>
                <p className="text-3xl font-display font-semibold" style={{ color: 'var(--color-brand-900)' }}>
                  {activeCount}
                </p>
              </Card>
              <Card className="p-5">
                <p className="text-[12px] font-body font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-subtle)' }}>
                  Draft Listings
                </p>
                <p className="text-3xl font-display font-semibold" style={{ color: 'var(--color-brand-900)' }}>
                  {draftCount}
                </p>
              </Card>
              <Card className="p-5">
                <p className="text-[12px] font-body font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-subtle)' }}>
                  Total Views
                </p>
                <p className="text-3xl font-display font-semibold" style={{ color: 'var(--color-brand-900)' }}>
                  {totalViews}
                </p>
              </Card>
            </div>

            {/* Job Listings section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-body font-bold" style={{ color: 'var(--color-text)' }}>
                  Job Listings
                </h2>
              </div>

              {/* Filter tabs */}
              <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-body font-semibold transition-all duration-150',
                      activeTab === tab.id
                        ? 'bg-brand text-white'
                        : 'bg-surface-2 text-text-muted hover:bg-brand/10 hover:text-brand',
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Jobs grid */}
              {loadingJobs ? (
                <p className="text-sm py-8 text-center" style={{ color: 'var(--color-text-subtle)' }}>
                  Loading listings...
                </p>
              ) : filteredJobs.length === 0 && activeTab === 'all' ? (
                // Empty state — no jobs at all
                <Card className="p-10 text-center">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
                    style={{ backgroundColor: 'var(--color-warn-bg)' }}
                  >
                    📌
                  </div>
                  <h3 className="text-base font-body font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    No job listings yet
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
                    Post your first job to start finding great farm workers
                  </p>
                  <Link
                    to="/jobs/new"
                    className={cn(
                      'font-body font-bold rounded-[8px] transition-all duration-200 inline-flex items-center justify-center gap-1.5',
                      'bg-brand text-white hover:bg-brand-hover',
                      'px-4 py-2 text-[13px]',
                    )}
                  >
                    <Plus className="w-4 h-4" />
                    Post Your First Job
                  </Link>
                </Card>
              ) : filteredJobs.filter((j) => j.status !== 'draft').length === 0 && activeTab !== 'drafts' ? (
                // Empty state for current filter
                <div
                  className="rounded-[12px] py-10 text-center"
                  style={{ backgroundColor: 'var(--color-surface-2)' }}
                >
                  <p className="text-sm" style={{ color: 'var(--color-text-subtle)' }}>
                    No listings in this category
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredJobs
                    .filter((j) => (activeTab === 'drafts' ? true : j.status !== 'draft'))
                    .map((job) => {
                      const appCount = appCountMap.get(job.id) ?? 0
                      return (
                        <div key={job.id}>
                          <JobCard
                            job={job}
                            onPause={() => handlePauseResume(job)}
                            onEdit={() => navigate(`/jobs/${job.id}/edit`)}
                            onArchive={() => setConfirmArchiveId(job.id)}
                            onMarkFilled={() => handleMarkFilled(job.id)}
                          />
                          {appCount > 0 && (
                            <div className="mt-1.5 px-1">
                              <Link
                                to={`/dashboard/employer/jobs/${job.id}/applicants`}
                                className="text-sm font-body font-semibold hover:underline"
                                style={{ color: 'var(--color-brand)' }}
                              >
                                View Applicants ({appCount})
                              </Link>
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              )}
            </div>

            {/* Drafts section (shown separately when not on drafts tab) */}
            {activeTab !== 'drafts' && draftJobs.length > 0 && (
              <div>
                <h2 className="text-lg font-body font-bold mb-4" style={{ color: 'var(--color-text)' }}>
                  Draft Listings
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {draftJobs.map((job) => (
                    <div
                      key={job.id}
                      className="bg-surface border-[1.5px] border-border rounded-[12px] p-5 flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-body font-bold text-text truncate">
                          {job.title}
                        </h3>
                        <p className="text-[12px] font-body text-text-muted mt-0.5">
                          {job.region} — Draft
                        </p>
                      </div>
                      <Link
                        to={`/jobs/${job.id}/edit`}
                        className={cn(
                          'font-body font-bold rounded-[8px] transition-all duration-200 inline-flex items-center justify-center flex-shrink-0',
                          'bg-surface border border-brand text-brand hover:bg-surface-2',
                          'px-3 py-1.5 text-[12px]',
                        )}
                      >
                        Continue editing
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Archive confirmation dialog */}
      {confirmArchiveId && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setConfirmArchiveId(null)}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-surface rounded-[16px] shadow-xl w-full max-w-sm border-[1.5px] border-border p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-[16px] font-body font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                Archive this listing?
              </h3>
              <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>
                Archived listings are hidden from job seekers and cannot be resumed. This cannot be
                undone.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setConfirmArchiveId(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleArchive(confirmArchiveId)}
                  className="flex-1 bg-red hover:bg-red/90 border-danger"
                  style={{ backgroundColor: '#dc3545' }}
                >
                  Archive
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Mark as Filled modal */}
      <MarkFilledModal
        jobId={markFilledJobId ?? ''}
        isOpen={isMarkFilledOpen}
        onClose={() => {
          setIsMarkFilledOpen(false)
          setMarkFilledJobId(null)
        }}
        onFilled={() => {
          loadJobs()
        }}
      />
    </DashboardLayout>
  )
}
