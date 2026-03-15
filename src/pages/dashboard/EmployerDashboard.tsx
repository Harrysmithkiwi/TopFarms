import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

const TOTAL_STEPS = 8

interface OnboardingStatus {
  onboarding_step: number
  onboarding_complete: boolean
}

export function EmployerDashboard() {
  const { session } = useAuth()
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  useEffect(() => {
    async function loadOnboardingStatus() {
      if (!session?.user) {
        setLoadingStatus(false)
        return
      }

      const { data, error } = await supabase
        .from('employer_profiles')
        .select('onboarding_step, onboarding_complete')
        .eq('user_id', session.user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading onboarding status:', error)
      }

      if (data) {
        setOnboarding({
          onboarding_step: data.onboarding_step ?? 0,
          onboarding_complete: data.onboarding_complete ?? false,
        })
      } else {
        setOnboarding({ onboarding_step: 0, onboarding_complete: false })
      }

      setLoadingStatus(false)
    }

    loadOnboardingStatus()
  }, [session?.user?.id])

  const onboardingProgress = onboarding
    ? Math.round((onboarding.onboarding_step / TOTAL_STEPS) * 100)
    : 0

  const isOnboardingComplete = onboarding?.onboarding_complete ?? false

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page title */}
        <div>
          <h1
            className="font-display text-3xl font-semibold"
            style={{ color: 'var(--color-soil)' }}
          >
            Welcome to TopFarms
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-mid)' }}>
            Your employer dashboard
          </p>
        </div>

        {/* Onboarding prompt (only if not complete) */}
        {!loadingStatus && !isOnboardingComplete && (
          <Card className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-3xl"
                style={{ backgroundColor: 'var(--color-hay-lt)' }}
              >
                🌾
              </div>
              <div className="flex-1 min-w-0">
                <h2
                  className="text-lg font-semibold mb-1"
                  style={{ color: 'var(--color-ink)' }}
                >
                  Complete your farm profile to start posting jobs
                </h2>
                <p className="text-sm mb-4" style={{ color: 'var(--color-mid)' }}>
                  Set up your farm details, verification, and team culture to attract the best
                  candidates
                </p>
                <ProgressBar progress={onboardingProgress} className="mb-2" />
                <p className="text-xs" style={{ color: 'var(--color-light)' }}>
                  {onboarding?.onboarding_step ?? 0} of {TOTAL_STEPS} steps completed
                </p>
              </div>
              <div className="flex-shrink-0">
                <Link
                  to="/onboarding/employer"
                  className={cn(
                    'font-body font-bold rounded-[8px] transition-all duration-200 inline-flex items-center justify-center',
                    'bg-moss text-white hover:bg-fern',
                    'px-4 py-2 text-[13px]',
                  )}
                >
                  {(onboarding?.onboarding_step ?? 0) > 0 ? 'Continue Setup' : 'Get Started'}
                </Link>
              </div>
            </div>
          </Card>
        )}

        {/* Post-onboarding: Post first job CTA */}
        {!loadingStatus && isOnboardingComplete && (
          <Card className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-3xl"
                style={{ backgroundColor: 'var(--color-hay-lt)' }}
              >
                📌
              </div>
              <div className="flex-1 min-w-0">
                <h2
                  className="text-lg font-semibold mb-1"
                  style={{ color: 'var(--color-ink)' }}
                >
                  Post your first job listing
                </h2>
                <p className="text-sm" style={{ color: 'var(--color-mid)' }}>
                  Your farm profile is complete — start finding great farm workers today
                </p>
              </div>
              <div className="flex-shrink-0">
                <Link
                  to="/jobs/new"
                  className={cn(
                    'font-body font-bold rounded-[8px] transition-all duration-200 inline-flex items-center justify-center',
                    'bg-moss text-white hover:bg-fern',
                    'px-4 py-2 text-[13px]',
                  )}
                >
                  Post a Job
                </Link>
              </div>
            </div>
          </Card>
        )}

        {/* Empty state cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recent Applications */}
          <Card className="p-5">
            <h3
              className="text-sm font-semibold mb-3"
              style={{ color: 'var(--color-ink)' }}
            >
              Recent Applications
            </h3>
            <div
              className="flex flex-col items-center justify-center py-8 rounded-lg"
              style={{ backgroundColor: 'var(--color-mist)' }}
            >
              <span className="text-2xl mb-2">📋</span>
              <p className="text-xs text-center" style={{ color: 'var(--color-light)' }}>
                No applications yet
              </p>
            </div>
          </Card>

          {/* Active Listings */}
          <Card className="p-5">
            <h3
              className="text-sm font-semibold mb-3"
              style={{ color: 'var(--color-ink)' }}
            >
              Active Listings
            </h3>
            <div
              className="flex flex-col items-center justify-center py-8 rounded-lg"
              style={{ backgroundColor: 'var(--color-mist)' }}
            >
              <span className="text-2xl mb-2">📌</span>
              <p className="text-xs text-center" style={{ color: 'var(--color-light)' }}>
                No listings posted yet
              </p>
            </div>
          </Card>

          {/* Quick Stats */}
          <Card className="p-5">
            <h3
              className="text-sm font-semibold mb-3"
              style={{ color: 'var(--color-ink)' }}
            >
              Quick Stats
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Total Listings', value: '0' },
                { label: 'Total Applications', value: '0' },
                { label: 'Profile Views', value: '0' },
              ].map((stat) => (
                <div key={stat.label} className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--color-mid)' }}>
                    {stat.label}
                  </span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
