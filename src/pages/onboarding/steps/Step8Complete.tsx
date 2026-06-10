import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Step8CompleteProps {
  profileData?: {
    farm_name?: string
    region?: string
    farm_types?: string[]
    accommodation_available?: boolean
    about_farm?: string
  }
  // ONBOARD-EMP-CTA-01: fires once on mount to flip
  // employer_profiles.onboarding_complete=true via the parent's
  // handleStepComplete(payload, 7) path. Without this, the user reaches the
  // completion screen but the DB flag stays false, and PostJob.tsx's gate
  // ('Complete your farm profile first') traps them in a soft loop.
  onComplete?: () => void
}

const CHECKLIST_ITEMS = [
  { label: 'Farm details complete', key: 'farm_name' },
  { label: 'Accommodation details added', key: 'accommodation_available' },
  { label: 'About your farm written', key: 'about_farm' },
]

export function Step8Complete({ profileData, onComplete }: Step8CompleteProps) {
  const navigate = useNavigate()

  // ONBOARD-EMP-CTA-01 finalize. Ref guard prevents double-fire under React
  // StrictMode dev re-mount + any future re-render of the parent that would
  // remount this subtree.
  const finalizedRef = useRef(false)
  useEffect(() => {
    if (finalizedRef.current) return
    finalizedRef.current = true
    onComplete?.()
  }, [onComplete])

  function isItemComplete(key: string): boolean {
    if (!profileData) return false
    return !!profileData[key as keyof typeof profileData]
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Left column — success + checklist + CTAs */}
      <div className="space-y-6">
        {/* Success icon */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: 'var(--color-warn-bg)' }}
          >
            <CheckCircle className="h-6 w-6" style={{ color: 'var(--color-brand-hover)' }} />
          </div>
          <div>
            <h2
              className="font-display text-2xl font-semibold"
              style={{ color: 'var(--color-brand-900)' }}
            >
              Your farm profile is complete!
            </h2>
            <p className="font-body mt-1 text-[16px]" style={{ color: 'var(--color-text-muted)' }}>
              You're ready to post your first job and start finding workers
            </p>
          </div>
        </div>

        {/* Profile completeness checklist */}
        <div className="space-y-3">
          {CHECKLIST_ITEMS.map((item) => {
            const complete = isItemComplete(item.key)
            return (
              <div key={item.key} className="flex items-center gap-3">
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full ${complete ? 'bg-brand-hover' : 'bg-surface-2'}`}
                >
                  {complete && (
                    <svg
                      className="h-3 w-3 text-white"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M2 6l3 3 5-5" />
                    </svg>
                  )}
                </div>
                <span
                  className="font-body text-[13px]"
                  style={{ color: complete ? 'var(--color-text)' : 'var(--color-text-subtle)' }}
                >
                  {item.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => navigate('/jobs/new')}
          >
            Post Your First Job
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => navigate('/dashboard/employer')}
          >
            Go to Dashboard
          </Button>
          <button
            onClick={() => navigate('/onboarding/employer')}
            className="font-body mx-auto block text-[14px]"
            style={{ color: 'var(--color-brand)' }}
          >
            Edit Profile
          </button>
        </div>
      </div>

      {/* Right column — mini farm profile preview */}
      <div className="hidden md:block">
        <div className="border-border bg-surface overflow-hidden rounded-[14px] border">
          <div
            className="flex h-16 items-end px-4 pb-2"
            style={{ backgroundColor: 'var(--color-brand-900)' }}
          >
            <p className="font-body text-[16px] font-semibold text-white">
              {profileData?.farm_name ?? 'Your Farm'}
            </p>
          </div>
          <div className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <span className="font-body text-[12px]" style={{ color: 'var(--color-text-subtle)' }}>
                {profileData?.region ?? 'Region'}
              </span>
            </div>
            {profileData?.farm_types && profileData.farm_types.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {profileData.farm_types.map((ft) => (
                  <span
                    key={ft}
                    className="border-border font-body rounded-full border px-2 py-0.5 text-[11px]"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {ft}
                  </span>
                ))}
              </div>
            )}
            {profileData?.accommodation_available && (
              <span
                className="border-brand-hover font-body inline-block rounded-full border px-2 py-0.5 text-[11px]"
                style={{ color: 'var(--color-brand-hover)' }}
              >
                Accommodation
              </span>
            )}
            <p
              className="font-body line-clamp-3 text-[12px]"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {profileData?.about_farm ?? 'Complete your profile to see preview'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
