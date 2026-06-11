import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ApplicationCard } from '@/components/ui/ApplicationCard'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Application, ApplicationStatus, JobListing } from '@/types/domain'
import { ACTIVE_STATUSES } from '@/types/domain'

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

      const { data: profileData, error: profileError } = await supabase
        .from('seeker_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('SeekerDashboard: failed to load profile', profileError)
      }

      if (profileData) {
        setProfile(profileData as SeekerProfile)

        if (profileData.onboarding_complete) {
          // Load recent applications (last 3)
          const { data: appsData } = await supabase
            .from('applications')
            .select('*, jobs(title, region, employer_profiles:marketplace_employer_profiles(farm_name))')
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
  }, [session?.user?.id])

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

  const isOnboardingComplete = profile?.onboarding_complete ?? false
  const onboardingStep = profile?.onboarding_step ?? 0
  const onboardingProgress = Math.round((onboardingStep / 7) * 100)

  const profileStrength = profile && isOnboardingComplete ? computeProfileStrength(profile) : 0

  const activeApplicationCount = ACTIVE_STATUSES.reduce(
    (sum, status) => sum + (applicationCounts[status] ?? 0),
    0,
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Onboarding prompt (only if not complete) */}
        {!isOnboardingComplete && (
          <>
            <div>
              <h1
                className="font-display text-3xl font-semibold"
                style={{ color: 'var(--color-brand-900)' }}
              >
                Welcome to TopFarms
              </h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Your job seeker dashboard
              </p>
            </div>

            <Card className="p-6">
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div
                  className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl text-3xl"
                  style={{ backgroundColor: 'var(--color-brand-50)' }}
                >
                  🧑‍🌾
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="mb-1 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                    Complete your profile to start matching with jobs
                  </h2>
                  <p className="mb-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Tell us about your experience, skills, and what you're looking for to get
                    matched with the best roles
                  </p>
                  <ProgressBar progress={onboardingProgress} className="mb-2" />
                  <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                    {onboardingStep} of 7 steps completed
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Link
                    to="/onboarding/seeker"
                    className={cn(
                      'font-body inline-flex items-center justify-center rounded-[8px] font-bold transition-all duration-200',
                      'bg-brand hover:bg-brand-hover text-white',
                      'px-4 py-2 text-[13px]',
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
                className="font-display text-3xl font-semibold"
                style={{ color: 'var(--color-brand-900)' }}
              >
                Welcome back{profile?.region ? ` — ${profile.region}` : ''}
              </h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Your job seeker dashboard
              </p>
            </div>

            {/* Profile summary card */}
            <Card className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
                      Your Profile
                    </h2>
                    <Link
                      to="/onboarding/seeker"
                      className="font-body text-sm font-semibold"
                      style={{ color: 'var(--color-brand)' }}
                    >
                      Edit Profile
                    </Link>
                  </div>
                  <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {profile?.years_experience != null && (
                      <div>
                        <p
                          className="text-[11px] font-semibold tracking-wide uppercase"
                          style={{ color: 'var(--color-text-subtle)' }}
                        >
                          Experience
                        </p>
                        <p
                          className="mt-0.5 text-sm font-semibold"
                          style={{ color: 'var(--color-text)' }}
                        >
                          {profile.years_experience}y
                        </p>
                      </div>
                    )}
                    {profile?.dairynz_level && profile.dairynz_level !== 'none' && (
                      <div>
                        <p
                          className="text-[11px] font-semibold tracking-wide uppercase"
                          style={{ color: 'var(--color-text-subtle)' }}
                        >
                          DairyNZ
                        </p>
                        <p
                          className="mt-0.5 text-sm font-semibold capitalize"
                          style={{ color: 'var(--color-text)' }}
                        >
                          {profile.dairynz_level.replace('_', ' ')}
                        </p>
                      </div>
                    )}
                    {profile?.region && (
                      <div>
                        <p
                          className="text-[11px] font-semibold tracking-wide uppercase"
                          style={{ color: 'var(--color-text-subtle)' }}
                        >
                          Region
                        </p>
                        <p
                          className="mt-0.5 text-sm font-semibold"
                          style={{ color: 'var(--color-text)' }}
                        >
                          {profile.region}
                        </p>
                      </div>
                    )}
                    {profile?.visa_status && (
                      <div>
                        <p
                          className="text-[11px] font-semibold tracking-wide uppercase"
                          style={{ color: 'var(--color-text-subtle)' }}
                        >
                          Visa
                        </p>
                        <p
                          className="mt-0.5 text-sm font-semibold capitalize"
                          style={{ color: 'var(--color-text)' }}
                        >
                          {profile.visa_status.replace(/_/g, ' ')}
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        Profile strength
                      </p>
                      <p className="text-xs font-semibold" style={{ color: 'var(--color-brand)' }}>
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
                  className="font-body mb-1 text-[12px] font-semibold tracking-wide uppercase"
                  style={{ color: 'var(--color-text-subtle)' }}
                >
                  Active Applications
                </p>
                <p
                  className="font-display text-3xl font-semibold"
                  style={{ color: 'var(--color-brand-900)' }}
                >
                  {activeApplicationCount}
                </p>
              </Card>
              <Card className="p-5">
                <p
                  className="font-body mb-1 text-[12px] font-semibold tracking-wide uppercase"
                  style={{ color: 'var(--color-text-subtle)' }}
                >
                  Profile Views
                </p>
                <p
                  className="font-display text-3xl font-semibold"
                  style={{ color: 'var(--color-brand-900)' }}
                >
                  0
                </p>
              </Card>
              <Card className="p-5">
                <p
                  className="font-body mb-1 text-[12px] font-semibold tracking-wide uppercase"
                  style={{ color: 'var(--color-text-subtle)' }}
                >
                  Profile Strength
                </p>
                <p
                  className="font-display text-3xl font-semibold"
                  style={{ color: 'var(--color-brand-900)' }}
                >
                  {profileStrength}%
                </p>
              </Card>
            </div>

            {/* Recent Applications */}
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
                  Recent Applications
                </h2>
                <Link
                  to="/dashboard/seeker/applications"
                  className="font-body text-sm font-semibold"
                  style={{ color: 'var(--color-brand)' }}
                >
                  View all
                </Link>
              </div>

              {recentApplications.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="mb-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    No applications yet
                  </p>
                  <Link
                    to="/jobs"
                    className={cn(
                      'font-body inline-flex items-center justify-center rounded-[8px] font-bold transition-all duration-200',
                      'bg-brand hover:bg-brand-hover text-white',
                      'px-4 py-2 text-[13px]',
                    )}
                  >
                    Browse jobs
                  </Link>
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
