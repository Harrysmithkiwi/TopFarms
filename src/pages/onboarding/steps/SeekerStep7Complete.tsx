import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MatchCircle } from '@/components/ui/MatchCircle'
import { supabase } from '@/lib/supabase'
import type { SeekerProfileData } from '@/types/domain'

interface SeekerStep7CompleteProps {
  profileData?: Partial<SeekerProfileData>
  seekerProfileId?: string
}

const CHECKLIST_ITEMS = [
  { label: 'Farm type preferences set', key: 'sector_pref' },
  { label: 'Experience added', key: 'years_experience' },
  { label: 'Qualifications complete', key: 'dairynz_level' },
  { label: 'Life situation details added', key: 'accommodation_needed' },
]

interface MatchedJob {
  total_score: number
  jobs: {
    id: string
    title: string
    region: string
    salary_min: number | null
    salary_max: number | null
    // Nullable: embedded via marketplace_employer_profiles view; an employer
    // with no listed jobs yields null (same edge as JobDetail).
    employer_profiles: {
      farm_name: string
    } | null
  }
}

function useMatchScoresPoll(seekerProfileId: string | null) {
  const [matches, setMatches] = useState<MatchedJob[]>([])
  const [loading, setLoading] = useState(true)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (!seekerProfileId) return

    let attempts = 0
    const MAX_ATTEMPTS = 10 // 10 × 3s = 30s

    const poll = async () => {
      attempts++
      // !inner on jobs: RLS policy 'jobs: authenticated users view active' (status='active')
      // hides non-active jobs from the embed, returning the parent row with jobs=null. !inner
      // drops those rows server-side instead — prevents null-crash in render. See Phase 18 cleanup.
      // employer_profiles embeds through the marketplace view: seekers can't read
      // employer_profiles under RLS (a direct embed returns null and crashed this
      // screen — UAT 2026-07-23). Same pattern as JobSearch/JobDetail (RLS-MKT-01).
      const { data } = await supabase
        .from('match_scores')
        .select(
          `
          total_score,
          jobs!inner (
            id, title, region, salary_min, salary_max,
            employer_profiles:marketplace_employer_profiles ( farm_name )
          )
        `,
        )
        .eq('seeker_id', seekerProfileId)
        .order('total_score', { ascending: false })
        .limit(3)

      if (data && data.length > 0) {
        setMatches(data as unknown as MatchedJob[])
        setLoading(false)
        clearInterval(interval)
        return
      }
      if (attempts >= MAX_ATTEMPTS) {
        setTimedOut(true)
        setLoading(false)
        clearInterval(interval)
      }
    }

    // First poll immediately
    poll()
    const interval = setInterval(poll, 3000)

    return () => clearInterval(interval)
  }, [seekerProfileId])

  return { matches, loading, timedOut }
}

export function SeekerStep7Complete({ profileData, seekerProfileId }: SeekerStep7CompleteProps) {
  const navigate = useNavigate()
  const { matches, loading: matchesLoading, timedOut } = useMatchScoresPoll(seekerProfileId ?? null)

  function isItemComplete(key: string): boolean {
    if (!profileData) return false
    const val = profileData[key as keyof SeekerProfileData]
    if (Array.isArray(val)) return val.length > 0
    return val !== undefined && val !== null && val !== ''
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Left column — success + checklist + match loading + CTAs */}
      <div className="space-y-6">
        {/* Success icon + heading */}
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
              Your profile is ready!
            </h2>
            <p className="font-body mt-1 text-[16px]" style={{ color: 'var(--color-text-muted)' }}>
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

        {/* Your matches — polling state */}
        <div className="border-border bg-surface-2 rounded-[10px] border p-4">
          <p className="font-body text-[16px] font-semibold" style={{ color: 'var(--color-text)' }}>
            Your matches
          </p>

          {matchesLoading ? (
            <div className="mt-2 flex items-center gap-2">
              <div
                className="h-5 w-5 animate-spin rounded-full border-[2px] border-t-transparent"
                style={{ borderColor: 'var(--color-brand-hover)', borderTopColor: 'transparent' }}
              />
              <p className="font-body text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                We're calculating your matches
              </p>
            </div>
          ) : timedOut && matches.length === 0 ? (
            <div className="mt-2">
              <p className="font-body text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                We're calculating your matches — check back soon!
              </p>
              <button
                type="button"
                onClick={() => navigate('/jobs')}
                className="font-body mt-2 text-[13px] font-semibold underline"
                style={{ color: 'var(--color-brand)' }}
              >
                Browse Jobs
              </button>
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {matches.map((match) => (
                <li
                  key={match.jobs.id}
                  className="bg-surface border-border hover:border-brand flex cursor-pointer items-center gap-3 rounded-[10px] border p-3 transition-colors"
                  onClick={() => navigate(`/jobs/${match.jobs.id}`)}
                >
                  <MatchCircle score={match.total_score} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p
                      className="font-body truncate text-[14px] font-semibold"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {match.jobs.title}
                    </p>
                    <p
                      className="font-body text-[12px]"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {match.jobs.employer_profiles?.farm_name
                        ? `${match.jobs.employer_profiles.farm_name} · ${match.jobs.region}`
                        : match.jobs.region}
                    </p>
                    {(match.jobs.salary_min || match.jobs.salary_max) && (
                      <p
                        className="font-body text-[12px]"
                        style={{ color: 'var(--color-text-subtle)' }}
                      >
                        {match.jobs.salary_min && match.jobs.salary_max
                          ? `$${(match.jobs.salary_min / 1000).toFixed(0)}k - $${(match.jobs.salary_max / 1000).toFixed(0)}k`
                          : match.jobs.salary_min
                            ? `From $${(match.jobs.salary_min / 1000).toFixed(0)}k`
                            : `Up to $${((match.jobs.salary_max ?? 0) / 1000).toFixed(0)}k`}
                      </p>
                    )}
                  </div>
                </li>
              ))}
              {matches.length > 0 && matches.length < 3 && (
                <li>
                  <button
                    type="button"
                    onClick={() => navigate('/jobs')}
                    className="font-body text-[13px] font-semibold underline"
                    style={{ color: 'var(--color-brand)' }}
                  >
                    Browse all jobs
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <Button variant="primary" size="lg" className="w-full" onClick={() => navigate('/jobs')}>
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
        <div className="border-border bg-surface overflow-hidden rounded-[14px] border">
          <div className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: 'var(--color-surface-2)' }}
              >
                <span
                  className="font-body text-[16px] font-semibold"
                  style={{ color: 'var(--color-brand)' }}
                >
                  S
                </span>
              </div>
              <div>
                <p
                  className="font-body text-[16px] font-semibold"
                  style={{ color: 'var(--color-text)' }}
                >
                  Seeker Profile
                </p>
                <p className="font-body text-[13px]" style={{ color: 'var(--color-text-subtle)' }}>
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
                    className="border-border font-body rounded-full border px-2 py-0.5 text-[11px]"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            {/* Experience */}
            {profileData?.years_experience !== undefined && (
              <p className="font-body text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                {profileData.years_experience}+ years experience
              </p>
            )}

            {/* Accommodation badge */}
            {profileData?.accommodation_needed && (
              <span
                className="border-brand-hover font-body inline-block rounded-full border px-2 py-0.5 text-[11px]"
                style={{ color: 'var(--color-brand-hover)' }}
              >
                Needs accommodation
              </span>
            )}

            {/* Visa */}
            {profileData?.visa_status && (
              <p className="font-body text-[12px]" style={{ color: 'var(--color-text-subtle)' }}>
                {profileData.visa_status.replace(/_/g, ' ')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
