/**
 * Candidate Home — the seeker's default signed-in surface.
 *
 * 2026-08-28 redesign (candidate-UX brief): the old page was an account
 * summary — profile card, three stat tiles, recent applications. This one is
 * built around "what should I do next": search at the top, one profile
 * action card, then a single tabbed strip (For you / Saved / Applied) that
 * puts jobs — not statistics — at the centre. The "Profile Views 0" tile is
 * gone: a statistic nobody records is a fabrication, not a metric.
 *
 * Structure reference is the ZEIL candidate home (persistent search,
 * personalised welcome, restrained action cards, one job-state tab strip);
 * every visual value is TopFarms canon (docs/_canonical/Brand_and_Design.md).
 *
 * §1.4 discipline: "For you" rows show MatchBand words, never numeric scores.
 *
 * Waitlist mode is preserved exactly: keyed on the LIVE JOB COUNT, not a
 * flag, so it retires itself the day real inventory lands.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { UserRound, Search, MapPin, Bookmark } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { TrainingDemandCard } from '@/components/ui/TrainingDemandCard'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ApplicationCard } from '@/components/ui/ApplicationCard'
import { MatchBand } from '@/components/ui/MatchBand'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { NZ_REGIONS } from '@/lib/constants'
import { computeProfileStrength } from '@/lib/profileStrength'
import type { Application, ApplicationStatus, JobListing, JobStatus } from '@/types/domain'
import { ACTIVE_STATUSES, visaLabel } from '@/types/domain'
import { ErrorState } from '@/components/ui/ErrorState'
import { SectionSkeleton } from '@/components/ui/Skeleton'

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

interface RecommendedJob {
  job_id: string
  total_score: number
  jobs: {
    id: string
    title: string
    region: string
    status: JobStatus
    contract_type: string
    employer_profiles: { farm_name: string } | null
  }
}

interface SavedJobEntry {
  job_id: string
  created_at: string
  jobs: {
    id: string
    title: string
    region: string
    status: JobStatus
    employer_profiles: { farm_name: string } | null
  } | null
}

const CONTRACT_LABELS: Record<string, string> = {
  permanent: 'Permanent',
  contract: 'Contract',
  casual: 'Casual',
}

/** Compact job row for the home tabs — title, farm, match word. */
function JobRow({
  to,
  title,
  subtitle,
  right,
}: {
  to: string
  title: string
  subtitle: string
  right?: React.ReactNode
}) {
  return (
    <li className="border-border flex items-center justify-between gap-3 border-b py-3 last:border-b-0">
      <div className="min-w-0">
        <Link
          to={to}
          className="font-body text-text hover:text-brand-hover text-[15px] font-semibold"
        >
          {title}
        </Link>
        <p className="text-text-muted mt-0.5 truncate text-[13px]">{subtitle}</p>
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </li>
  )
}

type HomeTab = 'foryou' | 'saved' | 'applied'

export function SeekerDashboard() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<SeekerProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [liveJobCount, setLiveJobCount] = useState<number | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)

  const [recentApplications, setRecentApplications] = useState<ApplicationWithJob[]>([])
  const [applicationCounts, setApplicationCounts] = useState<Record<ApplicationStatus, number>>(
    {} as Record<ApplicationStatus, number>,
  )
  const [recommended, setRecommended] = useState<RecommendedJob[]>([])
  const [savedJobs, setSavedJobs] = useState<SavedJobEntry[]>([])

  const [tab, setTab] = useState<HomeTab>('foryou')
  const [searchQ, setSearchQ] = useState('')
  const [searchRegion, setSearchRegion] = useState('')

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
          // The three tab data sets load together — each is capped small, and
          // the queries are all RLS-scoped to this user.
          const [appsRes, allAppsRes, recRes, savedRes] = await Promise.all([
            supabase
              .from('applications')
              .select(
                '*, jobs(title, region, employer_profiles:marketplace_employer_profiles(farm_name))',
              )
              .eq('seeker_id', profileData.id)
              .order('created_at', { ascending: false })
              .limit(3),
            supabase.from('applications').select('status').eq('seeker_id', profileData.id),
            // "For you": the seeker's own precomputed match scores against live
            // jobs, best first. Rendered as MatchBand words (§1.4 — never a
            // number for the worker). jobs!inner drops rows whose job is no
            // longer visible.
            supabase
              .from('match_scores')
              .select(
                'job_id, total_score, jobs!inner(id, title, region, status, contract_type, employer_profiles:marketplace_employer_profiles(farm_name))',
              )
              .eq('seeker_id', profileData.id)
              .eq('jobs.status', 'active')
              .order('total_score', { ascending: false })
              .limit(5),
            supabase
              .from('saved_jobs')
              .select(
                'job_id, created_at, jobs(id, title, region, status, employer_profiles:marketplace_employer_profiles(farm_name))',
              )
              .eq('user_id', session.user.id)
              .order('created_at', { ascending: false })
              .limit(5),
          ])

          if (appsRes.data) setRecentApplications(appsRes.data as ApplicationWithJob[])
          if (allAppsRes.data) {
            const counts = allAppsRes.data.reduce(
              (acc, app) => {
                acc[app.status as ApplicationStatus] =
                  (acc[app.status as ApplicationStatus] ?? 0) + 1
                return acc
              },
              {} as Record<ApplicationStatus, number>,
            )
            setApplicationCounts(counts)
          }
          if (recRes.data) setRecommended(recRes.data as unknown as RecommendedJob[])
          if (savedRes.data) setSavedJobs(savedRes.data as unknown as SavedJobEntry[])
        }
      }

      setLoadingProfile(false)
    }

    loadData()
  }, [session?.user?.id, reloadNonce])

  const profileStrength = useMemo(
    () => (profile && profile.onboarding_complete ? computeProfileStrength(profile) : 0),
    [profile],
  )

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchQ.trim()) params.set('q', searchQ.trim())
    if (searchRegion) params.set('region', searchRegion)
    const qs = params.toString()
    navigate(qs ? `/jobs?${qs}` : '/jobs')
  }

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

  const activeApplicationCount = ACTIVE_STATUSES.reduce(
    (sum, status) => sum + (applicationCounts[status] ?? 0),
    0,
  )

  // Waiting, not empty. `null` means the count has not resolved — do not guess.
  const isWaitlisted = liveJobCount === 0

  const savedCount = savedJobs.length

  const tabs: { key: HomeTab; label: string }[] = [
    { key: 'foryou', label: 'For you' },
    { key: 'saved', label: savedCount > 0 ? `Saved (${savedCount})` : 'Saved' },
    {
      key: 'applied',
      label: activeApplicationCount > 0 ? `Applied (${activeApplicationCount})` : 'Applied',
    },
  ]

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
                  'font-body mt-4 inline-flex items-center justify-center rounded-8 font-bold transition-all duration-200',
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
              <h1 className="font-display text-brand-900 text-[36px] leading-[44px] font-medium">
                Welcome to TopFarms
              </h1>
              <p className="text-text-muted mt-1 text-sm">Your job seeker dashboard</p>
            </div>

            <Card className="p-6">
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="bg-brand-50 flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-16">
                  <UserRound className="text-brand h-8 w-8" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-text mb-1 text-lg font-semibold">
                    Complete your profile to start matching with jobs
                  </h2>
                  <ProgressBar progress={onboardingProgress} className="mt-3 mb-4" />
                  <p className="text-text-subtle text-xs">
                    {onboardingStep} of 7 steps completed
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Link
                    to="/onboarding/seeker"
                    className={cn(
                      'font-body inline-flex items-center justify-center rounded-8 font-bold transition-all duration-200',
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

        {/* Candidate Home (when onboarding complete) */}
        {isOnboardingComplete && (
          <>
            {/* Header */}
            <div>
              <h1 className="font-display text-brand-900 text-[36px] leading-[44px] font-medium">
                Welcome back{profile?.region ? ` — ${profile.region}` : ''}
              </h1>
              <p className="text-text-muted mt-1 text-sm">
                {isWaitlisted
                  ? 'We\'ll email you the moment a matching farm goes live.'
                  : 'Here\'s where your job search is up to.'}
              </p>
            </div>

            {/* Search — the front door to the marketplace, always one step away.
                Submits into the real /jobs search, never a duplicate system. */}
            <Card className="p-4">
              <form
                onSubmit={handleSearch}
                role="search"
                aria-label="Job search"
                className="flex flex-col gap-3 sm:flex-row sm:items-center"
              >
                <div className="border-border focus-within:border-brand flex min-h-11 flex-1 items-center gap-2 rounded-8 border px-3">
                  <Search size={16} className="text-text-subtle flex-shrink-0" aria-hidden="true" />
                  <label htmlFor="home-search-q" className="sr-only">
                    Search jobs by title or keyword
                  </label>
                  <input
                    id="home-search-q"
                    type="search"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder="Job title or keyword"
                    className="font-body text-text placeholder:text-text-subtle w-full min-w-0 bg-transparent text-sm outline-none"
                  />
                </div>
                <div className="border-border focus-within:border-brand flex min-h-11 items-center gap-2 rounded-8 border px-3 sm:w-56">
                  <MapPin size={16} className="text-text-subtle flex-shrink-0" aria-hidden="true" />
                  <label htmlFor="home-search-region" className="sr-only">
                    Region
                  </label>
                  <select
                    id="home-search-region"
                    value={searchRegion}
                    onChange={(e) => setSearchRegion(e.target.value)}
                    className="font-body text-text w-full bg-transparent text-sm outline-none"
                  >
                    <option value="">All regions</option>
                    {NZ_REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className={cn(
                    'font-body inline-flex items-center justify-center rounded-8 font-bold transition-all duration-200',
                    'bg-brand-hover hover:bg-brand-900 text-white',
                    'min-h-11 px-5 text-label',
                  )}
                >
                  Find work
                </button>
              </form>
            </Card>

            {/* Training demand capture (go-live S1) — placement A, operator-approved
                2026-08-07: between the header and the profile card, dismissible,
                outside every launch funnel. */}
            <TrainingDemandCard role="seeker" context="seeker-dashboard" />

            {/* Profile summary card */}
            <Card className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-text text-base font-semibold">Your Profile</h2>
                    <Link
                      to="/dashboard/seeker/profile"
                      className="font-body text-brand-hover text-sm font-semibold"
                    >
                      Edit Profile
                    </Link>
                  </div>
                  <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {profile?.years_experience != null && (
                      <div>
                        <p className="text-micro text-text-subtle font-semibold tracking-wide uppercase">
                          Experience
                        </p>
                        <p className="text-text mt-0.5 text-sm font-semibold">
                          {profile.years_experience}y
                        </p>
                      </div>
                    )}
                    {profile?.dairynz_level && profile.dairynz_level !== 'none' && (
                      <div>
                        <p className="text-micro text-text-subtle font-semibold tracking-wide uppercase">
                          DairyNZ
                        </p>
                        <p className="text-text mt-0.5 text-sm font-semibold capitalize">
                          {profile.dairynz_level.replace('_', ' ')}
                        </p>
                      </div>
                    )}
                    {profile?.region && (
                      <div>
                        <p className="text-micro text-text-subtle font-semibold tracking-wide uppercase">
                          Region
                        </p>
                        <p className="text-text mt-0.5 text-sm font-semibold">{profile.region}</p>
                      </div>
                    )}
                    {profile?.visa_status && (
                      <div>
                        <p className="text-micro text-text-subtle font-semibold tracking-wide uppercase">
                          Visa
                        </p>
                        <p className="text-text mt-0.5 text-sm font-semibold">
                          {visaLabel(profile.visa_status)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-text-muted text-xs">Profile strength</p>
                      <p className="text-brand-hover text-xs font-semibold">{profileStrength}%</p>
                    </div>
                    <ProgressBar progress={profileStrength} />
                    {profileStrength < 100 && (
                      <p className="text-text-subtle mt-2 text-xs">
                        A fuller profile means better matches — and employers see you sooner.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* The job strip: one tabbed surface for discovery and tracking.
                Buttons + conditional panels, not routes — each tab has a
                "View all" link into its full page. */}
            <Card className="p-6">
              <div
                role="tablist"
                aria-label="Your jobs"
                className="border-border mb-4 flex gap-1.5 border-b pb-3"
              >
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      'font-body inline-flex min-h-9 items-center rounded-full px-3.5 text-[13px] font-semibold transition-colors',
                      tab === t.key
                        ? 'bg-brand-50 text-brand-900'
                        : 'text-text-muted hover:bg-surface-2 hover:text-text',
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* For you */}
              {tab === 'foryou' && (
                <div>
                  {isWaitlisted ? (
                    <div className="py-8 text-center">
                      <p className="text-text mb-1 text-sm font-semibold">
                        Matches are on their way
                      </p>
                      <p className="text-text-muted mx-auto max-w-[46ch] text-sm">
                        Farms are being added now. When a job matches your profile, it shows up
                        here — and we'll email you.
                      </p>
                    </div>
                  ) : recommended.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-text-muted mb-3 text-sm">
                        No matches yet — browse what's live or sharpen your profile.
                      </p>
                      <Link
                        to="/jobs"
                        className={cn(
                          'font-body inline-flex items-center justify-center rounded-8 font-bold transition-all duration-200',
                          'bg-brand-hover hover:bg-brand-900 text-white',
                          'min-h-[44px] px-4 py-2 text-label',
                        )}
                      >
                        Find work
                      </Link>
                    </div>
                  ) : (
                    <>
                      <ul>
                        {recommended.map((rec) => (
                          <JobRow
                            key={rec.job_id}
                            to={`/jobs/${rec.jobs.id}`}
                            title={rec.jobs.title}
                            subtitle={[
                              rec.jobs.employer_profiles?.farm_name,
                              rec.jobs.region,
                              CONTRACT_LABELS[rec.jobs.contract_type],
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                            right={<MatchBand score={rec.total_score} />}
                          />
                        ))}
                      </ul>
                      <Link
                        to="/jobs?sort=match"
                        className="font-body text-brand-hover mt-3 inline-block text-sm font-semibold"
                      >
                        See all matches
                      </Link>
                    </>
                  )}
                </div>
              )}

              {/* Saved */}
              {tab === 'saved' && (
                <div>
                  {savedJobs.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-text-muted mb-1 text-sm">
                        You haven't saved any jobs yet.
                      </p>
                      <p className="text-text-subtle mb-3 text-sm">
                        Tap the bookmark on any job to keep it here.
                      </p>
                      {!isWaitlisted && (
                        <Link
                          to="/jobs"
                          className="font-body text-brand-hover text-sm font-semibold"
                        >
                          Find work
                        </Link>
                      )}
                    </div>
                  ) : (
                    <>
                      <ul>
                        {savedJobs.map((sj) => (
                          <JobRow
                            key={sj.job_id}
                            to={sj.jobs ? `/jobs/${sj.jobs.id}` : '/dashboard/seeker/saved'}
                            title={sj.jobs?.title ?? 'This listing has been removed'}
                            subtitle={[sj.jobs?.employer_profiles?.farm_name, sj.jobs?.region]
                              .filter(Boolean)
                              .join(' · ')}
                            right={
                              <Bookmark
                                size={16}
                                className="text-warn fill-warn"
                                aria-hidden="true"
                              />
                            }
                          />
                        ))}
                      </ul>
                      <Link
                        to="/dashboard/seeker/saved"
                        className="font-body text-brand-hover mt-3 inline-block text-sm font-semibold"
                      >
                        View all saved jobs
                      </Link>
                    </>
                  )}
                </div>
              )}

              {/* Applied */}
              {tab === 'applied' && (
                <div>
                  {recentApplications.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-text-muted mb-3 text-sm">
                        {isWaitlisted
                          ? 'No jobs are live yet — we\'ll email you'
                          : 'No applications yet'}
                      </p>
                      {/* Sending someone to an empty board is the fastest way to lose them. */}
                      {!isWaitlisted && (
                        <Link
                          to="/jobs"
                          className={cn(
                            'font-body inline-flex items-center justify-center rounded-8 font-bold transition-all duration-200',
                            'bg-brand-hover hover:bg-brand-900 text-white',
                            'min-h-[44px] px-4 py-2 text-label',
                          )}
                        >
                          Find work
                        </Link>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {recentApplications.map((app) => (
                          <ApplicationCard key={app.id} application={app} />
                        ))}
                      </div>
                      <Link
                        to="/dashboard/seeker/applications"
                        className="font-body text-brand-hover mt-3 inline-block text-sm font-semibold"
                      >
                        View all applications
                      </Link>
                    </>
                  )}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
