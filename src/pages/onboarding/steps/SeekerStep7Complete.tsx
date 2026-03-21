import { useNavigate } from 'react-router'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { SeekerProfileData } from '@/types/domain'

interface SeekerStep7CompleteProps {
  profileData?: Partial<SeekerProfileData>
}

const CHECKLIST_ITEMS = [
  { label: 'Farm type preferences set', key: 'sector_pref' },
  { label: 'Experience added', key: 'years_experience' },
  { label: 'Qualifications complete', key: 'dairynz_level' },
  { label: 'Life situation details added', key: 'accommodation_needed' },
]

export function SeekerStep7Complete({ profileData }: SeekerStep7CompleteProps) {
  const navigate = useNavigate()

  function isItemComplete(key: string): boolean {
    if (!profileData) return false
    const val = profileData[key as keyof SeekerProfileData]
    if (Array.isArray(val)) return val.length > 0
    return val !== undefined && val !== null && val !== ''
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left column — success + checklist + match loading + CTAs */}
      <div className="space-y-6">
        {/* Success icon + heading */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-hay-lt)' }}
          >
            <CheckCircle className="w-6 h-6" style={{ color: 'var(--color-fern)' }} />
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold" style={{ color: 'var(--color-soil)' }}>
              Your profile is ready!
            </h2>
            <p className="text-[16px] font-body mt-1" style={{ color: 'var(--color-mid)' }}>
              We're finding your best matches
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
                  className={`w-5 h-5 rounded-full flex items-center justify-center ${complete ? 'bg-fern' : 'bg-fog'}`}
                >
                  {complete && (
                    <svg
                      className="w-3 h-3 text-white"
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
                  className="text-[13px] font-body"
                  style={{ color: complete ? 'var(--color-ink)' : 'var(--color-light)' }}
                >
                  {item.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Match pool loading state (Phase 11 wires real data) */}
        <div className="p-4 rounded-[10px] border border-fog bg-mist">
          <p className="text-[16px] font-semibold font-body" style={{ color: 'var(--color-ink)' }}>
            Your matches
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div
              className="w-5 h-5 rounded-full border-[2px] border-t-transparent animate-spin"
              style={{ borderColor: 'var(--color-fern)', borderTopColor: 'transparent' }}
            />
            <p className="text-[13px] font-body" style={{ color: 'var(--color-mid)' }}>
              We're calculating your matches
            </p>
          </div>
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => navigate('/jobs')}
          >
            Browse Jobs
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => navigate('/onboarding/seeker')}
          >
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Right column — mini candidate card preview */}
      <div className="hidden md:block">
        <div className="rounded-[14px] border border-fog overflow-hidden bg-white">
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-mist)' }}
              >
                <span
                  className="text-[16px] font-semibold font-body"
                  style={{ color: 'var(--color-moss)' }}
                >
                  S
                </span>
              </div>
              <div>
                <p className="text-[16px] font-semibold font-body" style={{ color: 'var(--color-ink)' }}>
                  Seeker Profile
                </p>
                <p className="text-[13px] font-body" style={{ color: 'var(--color-light)' }}>
                  {profileData?.region ?? 'Location not set'}
                </p>
              </div>
            </div>

            {/* Sector tags */}
            {profileData?.sector_pref && profileData.sector_pref.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {profileData.sector_pref.map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 text-[11px] rounded-full border border-fog font-body"
                    style={{ color: 'var(--color-mid)' }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            {/* Experience */}
            {profileData?.years_experience !== undefined && (
              <p className="text-[13px] font-body" style={{ color: 'var(--color-mid)' }}>
                {profileData.years_experience}+ years experience
              </p>
            )}

            {/* Accommodation badge */}
            {profileData?.accommodation_needed && (
              <span
                className="inline-block px-2 py-0.5 text-[11px] rounded-full border border-fern font-body"
                style={{ color: 'var(--color-fern)' }}
              >
                Needs accommodation
              </span>
            )}

            {/* Visa */}
            {profileData?.visa_status && (
              <p className="text-[12px] font-body" style={{ color: 'var(--color-light)' }}>
                {profileData.visa_status.replace(/_/g, ' ')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
