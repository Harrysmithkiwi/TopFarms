import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { UserRound } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { TrainingDemandCard } from '@/components/ui/TrainingDemandCard'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ApplicationCard } from '@/components/ui/ApplicationCard'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Application, ApplicationStatus, JobListing } from '@/types/domain'
import { ACTIVE_STATUSES } from '@/types/domain'
import { ErrorState } from '@/components/ui/ErrorState'
import { SectionSkeleton } from '@/components/ui/Skeleton'

const PROFILE_FIELDS = [
  'sector_pref',
  'years_experience',
  'shed_types_experienced',
  'herd_sizes_worked',
  'dairynz_level',
  'region',
  'visa_status',
  'min_salary',
] as const

interface SeekerProfile {
  id: string
  user_id: string
  onboarding_complete: boolean
  onboarding_step: number
  sector_pref?: string[]
  years_experience?: number
  dairynz_level?: string
  region?: string
  visa_status?: string
  shed_types_experienced?: string[]
  herd_sizes_worked?: string[]
  min_salary?: number
}

type ApplicationWithJob = Application & {
  jobs: JobListing & { employer_profiles: { farm_name: string; region: string } }
}

function computeProfileStrength(profile: SeekerProfile): number {
  let filled = 0
  for (const field of PROFILE_FIELDS) {
    const val = profile[field]
    if (val !== null && val !== undefined) {
      if (Array.isArray(val) ? val.length > 0 : true) filled++
    }
  }
  return Math.round((filled / PROFILE_FIELDS.length) * 100)
}

export function SeekerDashboard() {
  const { session } = useAuth()

  const [profile, setProfile] = useState<SeekerProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [liveJobCount, setLiveJobCount] = useState<number | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)

  const [recentApplications, setRecentApplications] = useState<ApplicationWithJob[]>([])
  const [applicationCounts, setApplicationCounts] = useState<Record<ApplicationStatus, number>>(
    {} as Record<ApplicationStatus, number>,
  )

  useEffect(() => {
    async function loadData() {
      if (!session?.user) {
        setLoadingProfile(false)
        return
      }

      // Waitlist state. Keyed on the LIVE JOB COUNT, not a feature flag, so this screen
      // stops appearing by itself the day real inventory lands — no second deploy, and no
      // flag left switched on by accident. Until then a seeker who was told "jobs are
      // coming" must not be handed an empty board and a "Browse jobs" button.
      const { count: liveJobs } = await supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
      setLiveJobCount(liveJobs ?? 0)

      const { data: profileData, error: profileError } = await supabase
        .from('seeker_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        // Phase 5.6: falling through leaves profile null, so onboardingProgress
        // reads 0% and an onboarded seeker is shown the "finish your profile"
        // prompt. An unknown must not render as a known.
        console.error('SeekerDashboard: failed to load profile', profileError)
        setLoadError(true)
        setLoadingProfile(false)
        return
      }

      if (profileData) {
        setProfile(profileData as SeekerProfile)

        if (profileData.onboarding_complete) {
          // Load recent applications (last 3)
          const { data: appsData } = await supabase
            .from('applications')
            .select(
              '*, jobs(title, region, employer_profiles:marketplace_employer_profiles(farm_name))',
            )
            .eq('seeker_id', profileData.id)
            .order('created_at', { ascending: false })
            .limit(3)

          if (appsData) {
            setRecentApplications(appsData as ApplicationWithJob[])
          }

          // Load all applications for count by status
          const { data: allApps } = await supabase
            .from('applications')
            .select('status')
            .eq('seeker_id', profileData.id)

          if (allApps) {
            const counts = allApps.reduce(
              (acc, app) => {
                acc[app.status as ApplicationStatus] =
                  (acc[app.status as ApplicationStatus] ?? 0) + 1
                return acc
              },
              {} as Record<ApplicationStatus, number>,
            )
            setApplicationCounts(counts)
          }
        }
      }

      setLoadingProfile(false)
    }

    loadData()
  }, [session?.user?.id, reloadNonce])

  if (loadError) {
    return (
      <DashboardLayout>
        <ErrorState
          message="We could not load your profile"
          onRetry={() => {
            setLoadError(false)
            setReloadNonce((n) => n + 1)
          }}
        />
      </DashboardLayout>
    )
  }

  if (loadingProfile) {
    return (
      <DashboardLayout>
        <SectionSkeleton />
      </DashboardLayout>
    )
  }

  const isOnboardingComplete = profile?.onboarding_complete ?? false
  const onboardingStep = profile?.onboarding_step ?? 0
  const onboardingProgress = Math.round((onboardingStep / 7) * 100)

  const profileStrength = profile && isOnboardingComplete ? computeProfileStrength(profile) : 0

  const activeApplicationCount = ACTIVE_STATUSES.reduce(
    (sum, status) => sum + (applicationCounts[status] ?? 0),
    0,
  )

  // Waiting, not empty. `null` means the count has not resolved — do not guess.
  const isWaitlisted = liveJobCount === 0

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {isWaitlisted && (
          <Card className="border-brand/30 bg-brand-50 p-6">
            <h2 className="text-text mb-1 text-lg font-semibold">
              You're on the list — farms are being added now
            </h2>
            <p className="text-text-muted max-w-[62ch] text-sm">
              We're signing up farms across the country. The moment one is posted that matches
              what you're after, we'll email you — you don't need to check back.
            </p>
            <p className="text-text-muted mt-3 max-w-[62ch] text-sm">
              {isOnboardingComplete
                ? 'Your profile is complete, so you\'ll be in the running from the first listing.'
                : 'The more of your profile we have, the better we can match you — and the earlier you show up to an employer.'}
            </p>
            {!isOnboardingComplete && (
              <Link
                to="/onboarding/seeker"
                className={cn(
                  'font-body mt-4 inline-flex items-center justify-center rounded-[8px] font-bold transition-all duration-200',
                  'bg-brand-hover hover:bg-brand-900 text-white',
                  'min-h-[44px] px-4 py-2 text-label',
                )}
              >
                {onboardingStep > 0 ? 'Finish your profile' : 'Complete your profile'}
              </Link>
            )}
          </Card>
        )}

        {/* Onboarding prompt (only if not complete) */}
        {!isOnboardingComplete && (
          <>
            <div>
              <h1
                className="font-display text-[36px] leading-[44px] font-semibold text-brand-900"
              >
                Welcome to TopFarms
              </h1>
              <p className="mt-1 text-sm text-text-muted">
                Your job seeker dashboard
              </p>
            </div>

            <Card className="p-6">
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div
                  className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-50"
                >
                  <UserRound
                    className="h-8 w-8 text-brand"
                    aria-hidden="true"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="mb-1 text-lg font-semibold text-text">
                    Complete your profile to start matching with jobs
                  </h2>
                  <ProgressBar progress={onboardingProgress} className="mt-3 mb-4" />
                  <p className="text-xs text-text-subtle">
                    {onboardingStep} of 7 steps completed
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Link
                    to="/onboarding/seeker"
                    className={cn(
                      'font-body inline-flex items-center justify-center rounded-[8px] font-bold transition-all duration-200',
                      'bg-brand-hover hover:bg-brand-900 text-white',
                      'px-4 py-2 text-label',
                    )}
                  >
                    {onboardingStep > 0 ? 'Continue Setup' : 'Get Started'}
                  </Link>
                </div>
              </div>
            </Card>
          </>
        )}

        {/* Full dashboard (when onboarding complete) */}
        {isOnboardingComplete && (
          <>
            {/* Header */}
            <div>
              <h1
                className="font-display text-[36px] leading-[44px] font-semibold text-brand-900"
              >
                Welcome back{profile?.region ? ` — ${profile.region}` : ''}
              </h1>
              <p className="mt-1 text-sm text-text-muted">
                Your job seeker dashboard
              </p>
            </div>

            {/* Training demand capture (go-live S1) — placement A, operator-approved
                2026-08-07: between the header and the profile card, dismissible,
                outside every launch funnel. */}
            <TrainingDemandCard role="seeker" context="seeker-dashboard" />

            {/* Profile summary card */}
            <Card className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-text">
                      Your Profile
                    </h2>
                    <Link
                      to="/onboarding/seeker"
                      className="font-body text-sm font-semibold text-brand-hover"
                    >
                      Edit Profile
                    </Link>
                  </div>
                  <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {profile?.years_experience != null && (
                      <div>
                        <p
                          className="text-micro font-semibold tracking-wide uppercase text-text-subtle"
                        >
                          Experience
                        </p>
                        <p
                          className="mt-0.5 text-sm font-semibold text-text"
                        >
                          {profile.years_experience}y
                        </p>
                      </div>
                    )}
                    {profile?.dairynz_level && profile.dairynz_level !== 'none' && (
                      <div>
                        <p
                          className="text-micro font-semibold tracking-wide uppercase text-text-subtle"
                        >
                          DairyNZ
                        </p>
                        <p
                          className="mt-0.5 text-sm font-semibold capitalize text-text"
                        >
                          {profile.dairynz_level.replace('_', ' ')}
                        </p>
                      </div>
                    )}
                    {profile?.region && (
                      <div>
                        <p
                          className="text-micro font-semibold tracking-wide uppercase text-text-subtle"
                        >
                          Region
                        </p>
                        <p
                          className="mt-0.5 text-sm font-semibold text-text"
                        >
                          {profile.region}
                        </p>
                      </div>
                    )}
                    {profile?.visa_status && (
                      <div>
                        <p
                          className="text-micro font-semibold tracking-wide uppercase text-text-subtle"
                        >
                          Visa
                        </p>
                        <p
                          className="mt-0.5 text-sm font-semibold capitalize text-text"
                        >
                          {profile.visa_status.replace(/_/g, ' ')}
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs text-text-muted">
                        Profile strength
                      </p>
                      <p className="text-xs font-semibold text-brand-hover">
                        {profileStrength}%
                      </p>
                    </div>
                    <ProgressBar progress={profileStrength} />
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card className="p-5">
                <p
                  className="font-body mb-1 text-xs font-semibold tracking-wide uppercase text-text-subtle"
                >
                  Active Applications
                </p>
                <p
                  className="font-display text-[24px] leading-7 font-semibold text-brand-900"
                >
                  {activeApplicationCount}
                </p>
              </Card>
              <Card className="p-5">
                <p
                  className="font-body mb-1 text-xs font-semibold tracking-wide uppercase text-text-subtle"
                >
                  Profile Views
                </p>
                <p
                  className="font-display text-[24px] leading-7 font-semibold text-brand-900"
                >
                  0
                </p>
              </Card>
              <Card className="p-5">
                <p
                  className="font-body mb-1 text-xs font-semibold tracking-wide uppercase text-text-subtle"
                >
                  Profile Strength
                </p>
                <p
                  className="font-display text-[24px] leading-7 font-semibold text-brand-900"
                >
                  {profileStrength}%
                </p>
              </Card>
            </div>

            {/* Recent Applications */}
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-text">
                  Recent Applications
                </h2>
                <Link
                  to="/dashboard/seeker/applications"
                  className="font-body text-sm font-semibold text-brand-hover"
                >
                  View all
                </Link>
              </div>

              {recentApplications.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="mb-3 text-sm text-text-muted">
                    {isWaitlisted ? 'No jobs are live yet — we\'ll email you' : 'No applications yet'}
                  </p>
                  {/* Sending someone to an empty board is the fastest way to lose them. */}
                  {!isWaitlisted && (
                    <Link
                      to="/jobs"
                      className={cn(
                        'font-body inline-flex items-center justify-center rounded-[8px] font-bold transition-all duration-200',
                        'bg-brand-hover hover:bg-brand-900 text-white',
                        'min-h-[44px] px-4 py-2 text-label',
                      )}
                    >
                      Browse jobs
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {recentApplications.map((app) => (
                    <ApplicationCard key={app.id} application={app} />
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
