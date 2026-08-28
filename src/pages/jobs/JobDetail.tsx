import { useEffect, useId, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { track } from '@vercel/analytics'
import * as Dialog from '@radix-ui/react-dialog'
import {
  ClipboardList,
  MapPin,
  Calendar,
  Briefcase,
  DollarSign,
  Home,
  PawPrint,
  Users,
  Zap,
  Star,
  Tag,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { reportError } from '@/lib/observability'
import { useAuth } from '@/hooks/useAuth'
// Aliased: lucide-react also exports a `Tag`, used at the bottom of this file as the
// fallback chip icon. Both are wanted, so the component takes the qualified name.
import { Tag as StatusTag } from '@/components/ui/Tag'
import { VerificationBadge } from '@/components/ui/VerificationBadge'
import { MatchBreakdown } from '@/components/ui/MatchBreakdown'
import { MatchBand } from '@/components/ui/MatchBand'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { StatsStrip } from '@/components/ui/StatsStrip'
import { Timeline } from '@/components/ui/Timeline'
import { JobDetailSidebar } from '@/components/ui/JobDetailSidebar'
import { MapPlaceholder } from '@/components/ui/MapPlaceholder'
import { useSavedJobs } from '@/hooks/useSavedJobs'
import { storeReturnTo } from '@/lib/returnTo'
import { ErrorState } from '@/components/ui/ErrorState'
import { RouteSkeleton } from '@/components/ui/Skeleton'
import type {
  JobListing,
  EmployerVerification,
  TrustLevel,
  VerificationMethod,
  MatchScore,
} from '@/types/domain'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmployerProfile {
  id: string
  farm_name: string
  region: string
  farm_type?: string
  shed_type?: string
  herd_size?: number
  accommodation_available?: boolean
  accommodation_type?: string
  accommodation_extras?: string[]
  culture_description?: string
}

interface JobSkill {
  skill_id: string
  requirement_level: string
  skills: {
    id: string
    name: string
    category: string
  }
}

interface SimilarJob {
  id: string
  title: string
  farm_name: string
  region: string
  salary_min?: number
  salary_max?: number
  matchScore?: number
}

interface JobDetailData extends JobListing {
  employer_profiles: EmployerProfile
}

/**
 * Visitor prompt. Replaces a blurred, fabricated 78% "teaser match" that was
 * shipped to every signed-out visitor.
 *
 * Two things were wrong with it. It was invented data presented as a preview of
 * the reader's own fit — nobody had been scored, because nobody was signed in.
 * And blur is not concealment: the numbers sat in the DOM and the bundle, so the
 * fabrication was readable by anyone who looked. The call to action works
 * without pretending to know something about a stranger.
 */
function MatchTeaser({ jobPath }: { jobPath: string }) {
  return (
    <div className="bg-surface border-border flex flex-col items-center rounded-12 border p-6 text-center">
      <p className="font-body text-[15px] font-semibold" style={{ color: 'var(--color-text)' }}>
        See how you match
      </p>
      <p
        className="font-body mt-1 max-w-xs text-[13px]"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Sign up and we&rsquo;ll show you how this job lines up with your experience, region and
        the kind of work you&rsquo;re after.
      </p>
      <Link
        to={`/signup?role=seeker&next=${encodeURIComponent(jobPath)}`}
        className="font-body bg-brand-hover text-text-on-brand hover:bg-brand-900 focus-visible:outline-brand mt-4 inline-flex items-center justify-center rounded-8 px-4 py-2 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Sign up free
      </Link>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeTrustLevel(verifications: EmployerVerification[]): TrustLevel {
  const verified = new Set(
    verifications.filter((v) => v.status === 'verified').map((v) => v.method),
  )
  if (verified.size === 0) return 'unverified'
  const hasEmail = verified.has('email' as VerificationMethod)
  const hasPhone = verified.has('phone' as VerificationMethod)
  const hasIdentity =
    verified.has('nzbn' as VerificationMethod) || verified.has('document' as VerificationMethod)
  const hasPhoto = verified.has('farm_photo' as VerificationMethod)
  if (hasEmail && hasPhone && hasIdentity && hasPhoto) return 'fully_verified'
  if (hasEmail && hasPhone) return 'verified'
  if (hasEmail) return 'basic'
  return 'unverified'
}

function formatSalary(min?: number, max?: number): string {
  if (!min && !max) return 'Salary negotiable'
  const fmt = (n: number) => `$${n.toLocaleString()}`
  if (min && max) return `${fmt(min)} to ${fmt(max)} per year`
  if (min) return `From ${fmt(min)} per year`
  if (max) return `Up to ${fmt(max)} per year`
  return 'Salary negotiable'
}

function formatDate(dateStr?: string): string | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-NZ', { year: 'numeric', month: 'long', day: 'numeric' })
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Public job detail page.
 * - Visitors (not logged in): see full listing + sticky signup CTA bar + a sign-up prompt
 *   (no fabricated match — see MatchTeaser)
 * - Seekers: see full listing + match score breakdown + "Apply Now" modal
 * - Employer (own listing): see full listing + "Edit Listing" button
 * - Employer (not own): see full listing, no CTA
 * - Archived/not-found jobs: show "no longer available" message
 * - Draft jobs: only visible to owning employer
 */
/**
 * What the /jobs/:id route loader can hand this page so the FIRST paint is the
 * listing rather than a skeleton (v13 stage 3b, directive 1.18). Exactly the
 * three fetches that decide the above-the-fold render: the job, its skills, and
 * the employer verifications the trust badge is computed from.
 *
 * Absent (client-only navigation, or a job the anon loader cannot see — drafts,
 * archived, expired) the page behaves exactly as it did before: skeleton, then
 * the client fetch below fills everything in.
 */
export interface JobDetailSeed {
  job: JobDetailData
  skills: JobSkill[]
  verifications: EmployerVerification[]
}

export function JobDetail({ seed }: { seed?: JobDetailSeed | null } = {}) {
  const { id: jobId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { session, role, loading: authLoading } = useAuth()

  const [job, setJob] = useState<JobDetailData | null>(seed?.job ?? null)
  const [skills, setSkills] = useState<JobSkill[]>(seed?.skills ?? [])
  const [verifications, setVerifications] = useState<EmployerVerification[]>(
    seed?.verifications ?? [],
  )
  const [loading, setLoading] = useState(!seed?.job)
  const [notFound, setNotFound] = useState(false)
  // Phase 5.6 — distinct from notFound. A 404 has no retry; a failure needs one.
  const [loadError, setLoadError] = useState(false)
  const [reloadNonce, setReloadNonce] = useState(0)

  // Seeker-specific state
  const [matchScore, setMatchScore] = useState<MatchScore | null>(null)
  const [seekerProfileId, setSeekerProfileId] = useState<string | null>(null)
  const [hasApplied, setHasApplied] = useState(false)
  const [applyModalOpen, setApplyModalOpen] = useState(false)
  const [coverNote, setCoverNote] = useState('')
  const coverNoteId = useId()
  const coverNoteCountId = `${coverNoteId}-count`
  const [applying, setApplying] = useState(false)

  // New: similar jobs and application count
  const [similarJobs, setSimilarJobs] = useState<SimilarJob[]>([])
  const [applicationCount, setApplicationCount] = useState(0)

  const { isSaved, toggleSave } = useSavedJobs(session?.user?.id ?? null)

  useEffect(() => {
    // TF-008 — reject malformed ids before querying so garbage URLs don't
    // fire a doomed request (Supabase returns 400 on non-UUID eq filters).
    if (!jobId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)) {
      setNotFound(true)
      setLoading(false)
      return
    }

    // Funnel: a valid job-detail visit, whether or not the fetch succeeds.
    track('job_view', { jobId })

    async function loadJob() {
      setLoadError(false)
      setLoading(true)

      // 1. Load job with employer profile — via the marketplace view
      // (RLS-MKT-01, migration 038) so visitors get farm info too. The view
      // exposes exactly the EmployerProfile interface fields and only for
      // employers with a non-draft, non-archived job. Known edge: an employer
      // previewing their OWN draft (no listed jobs yet) gets null farm info
      // here — the wizard's Step 6 preview is the draft-preview surface.
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select(
          `*,
          employer_profiles:marketplace_employer_profiles(*)`,
        )
        .eq('id', jobId)
        .single()

      // Phase 5.6: a dropped request is not a missing job. Rendering the 404
      // for a network failure tells the seeker the role was taken down, and
      // there is no way back from a 404 -- it has no retry.
      if (jobError && jobError.code !== 'PGRST116') {
        reportError('job detail: load job', jobError)
        setLoadError(true)
        setLoading(false)
        return
      }
      if (!jobData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const loadedJob = jobData as unknown as JobDetailData

      // Archived jobs are unavailable to everyone
      if (loadedJob.status === 'archived') {
        setNotFound(true)
        setLoading(false)
        return
      }

      // Draft jobs are only visible to the owning employer
      // We check ownership after auth loads — handled in render gate below
      setJob(loadedJob)

      // 2. Load job skills
      const { data: skillsData } = await supabase
        .from('job_skills')
        .select('skill_id, requirement_level, skills(id, name, category)')
        .eq('job_id', jobId)

      setSkills((skillsData as unknown as JobSkill[]) ?? [])

      // 3. Load employer verifications
      if (loadedJob.employer_profiles?.id) {
        const { data: verifData } = await supabase
          .from('employer_verifications')
          .select('id, employer_id, method, status, verified_at, created_at')
          .eq('employer_id', loadedJob.employer_profiles.id)

        setVerifications((verifData as EmployerVerification[]) ?? [])
      }

      // 4. Application count for this job
      const { count: appCount } = await supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('job_id', jobId)
      setApplicationCount(appCount ?? 0)

      // 5. Similar jobs: 3 active jobs in same region, excluding current
      const { data: similarData } = await supabase
        .from('jobs')
        .select(
          'id, title, salary_min, salary_max, employer_profiles:marketplace_employer_profiles(farm_name, region)',
        )
        .eq('status', 'active')
        .eq('region', loadedJob.region ?? '')
        .neq('id', jobId)
        .limit(3)
      setSimilarJobs(
        // Untyped nested-join shape; `any` goes away with generated DB types
        // (audit task 2.3).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((similarData ?? []) as any[]).map((j) => ({
          id: j.id,
          title: j.title,
          farm_name: j.employer_profiles?.farm_name ?? '',
          region: j.employer_profiles?.region ?? '',
          salary_min: j.salary_min,
          salary_max: j.salary_max,
        })),
      )

      // 6. Seeker-specific: fetch match score + check prior application
      if (session && role === 'seeker') {
        const { data: profile } = await supabase
          .from('seeker_profiles')
          .select('id')
          .eq('user_id', session.user.id)
          .single()

        if (profile) {
          setSeekerProfileId(profile.id)

          // Fetch match score
          const { data: scoreData } = await supabase
            .from('match_scores')
            .select('total_score, breakdown, explanation')
            .eq('seeker_id', profile.id)
            .eq('job_id', jobId)
            .maybeSingle()
          if (scoreData) setMatchScore(scoreData as MatchScore)

          // Trigger async AI explanation if score exists but explanation is missing
          if (scoreData && !scoreData.explanation) {
            supabase.functions
              .invoke('generate-match-explanation', {
                body: { seeker_id: profile.id, job_id: jobId },
              })
              .catch(() => {}) // fire-and-forget, no error handling needed
          }

          // Check if already applied — a withdrawn application doesn't count
          // (apply upserts over it, so the seeker can re-apply)
          const { data: existingApp } = await supabase
            .from('applications')
            .select('id, status')
            .eq('job_id', jobId)
            .eq('seeker_id', profile.id)
            .maybeSingle()
          if (existingApp && existingApp.status !== 'withdrawn') setHasApplied(true)
        }
      }

      setLoading(false)
    }

    loadJob()
  }, [jobId, session, role, reloadNonce])

  // Group skills by category
  const skillsByCategory = skills.reduce<Record<string, JobSkill[]>>((acc, skill) => {
    const cat = skill.skills?.category ?? 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(skill)
    return acc
  }, {})

  const requiredCount = skills.filter((s) => s.requirement_level === 'required').length
  const preferredCount = skills.filter((s) => s.requirement_level === 'preferred').length

  const trustLevel = computeTrustLevel(verifications)

  // Loading state. Skipped entirely when the route loader seeded this render:
  // the content is already here, and `authLoading` is ALWAYS true on the server
  // (the session resolves in an effect, which never runs there), so gating on it
  // would server-render the skeleton and defeat the loader. Client-only
  // navigation is unseeded and behaves exactly as before.
  if (!seed?.job && (loading || authLoading)) {
    return (
      <div className="bg-bg">
        <RouteSkeleton label="Loading listing" />
      </div>
    )
  }

  // Failed — checked BEFORE notFound, which is a dead end with no retry.
  if (loadError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-bg">
        <ErrorState
          message="We could not load this listing"
          onRetry={() => setReloadNonce((n) => n + 1)}
        />
      </div>
    )
  }

  // Not found / archived
  if (notFound || !job) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center bg-bg"
      >
        <div className="max-w-md px-4 text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-16 bg-border"
          >
            <ClipboardList
              className="h-8 w-8 text-text-muted"
              aria-hidden="true"
            />
          </div>
          <h1
            className="mb-2 text-2xl font-semibold text-brand-900"
          >
            Listing not available
          </h1>
          <p className="mb-6 text-sm text-text-muted">
            This job listing is no longer available. It may have been filled, expired, or removed.
          </p>
          <Link
            to="/jobs"
            className={cn(
              'inline-flex items-center justify-center rounded-8 font-bold transition-all duration-200',
              'bg-brand-hover hover:bg-brand-900 text-white',
              'px-4 py-2 text-label',
            )}
          >
            Browse Jobs
          </Link>
        </div>
      </div>
    )
  }

  // Draft: only owning employer can view
  if (job.status === 'draft') {
    // If not logged in or not employer, redirect to 404-style
    if (!session || role !== 'employer') {
      return (
        <div
          className="flex min-h-[60vh] items-center justify-center bg-bg"
        >
          <div className="max-w-md px-4 text-center">
            <h1
              className="mb-2 text-2xl font-semibold text-brand-900"
            >
              Listing not available
            </h1>
            <p className="text-sm text-text-muted">
              This job listing is no longer available.
            </p>
          </div>
        </div>
      )
    }
    // The owning employer can see drafts (we trust the employer route — no ownership check needed in Phase 2)
  }

  const employer = job.employer_profiles

  // Determine CTA type
  const isVisitor = !session
  const isSeeker = session && role === 'seeker'
  const jobPath = `/jobs/${jobId ?? ''}`
  // Save-intent for visitors: instead of the bookmark silently no-oping
  // (useSavedJobs returns early with no user), route through login with this
  // job as the return target — sign in, land back here, save for real.
  const handleSaveIntent = () => {
    if (!jobId) return
    if (!session) {
      navigate(`/login?next=${encodeURIComponent(jobPath)}`)
      return
    }
    toggleSave(jobId)
  }
  const isFeatured = job.listing_tier === 2
  const isPremium = job.listing_tier === 3

  // ─── Apply handler ──────────────────────────────────────────────────────────

  async function handleApply() {
    if (!seekerProfileId || !jobId) return
    setApplying(true)
    // Upsert so re-applying after a withdrawal reactivates the same row
    // (UNIQUE (job_id, seeker_id) otherwise blocks the insert forever).
    const { error } = await supabase.from('applications').upsert(
      {
        job_id: jobId,
        seeker_id: seekerProfileId,
        cover_note: coverNote || null,
        status: 'applied',
      },
      { onConflict: 'job_id,seeker_id' },
    )
    setApplying(false)
    if (error) {
      if (error.code === '23505') {
        // unique violation = already applied
        toast.error('You have already applied to this job')
        setHasApplied(true)
      } else {
        toast.error('Failed to submit application. Please try again.')
      }
      return
    }
    setHasApplied(true)
    setApplyModalOpen(false)
    track('apply_submit', { jobId })
    toast.success('Application submitted!')
  }

  // ─── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="pb-24 bg-bg">
      {/* Breadcrumb bar — replaces old minimal nav */}
      <div className="sticky top-0 z-30">
        <Breadcrumb
          items={[{ label: 'Jobs', href: '/jobs' }, { label: job.title }]}
          onSave={handleSaveIntent}
          onShare={() => {
            navigator.clipboard.writeText(window.location.href)
            toast.success('Link copied to clipboard')
          }}
        />
      </div>

      {/* Main content. A div, not <main>: every route that renders JobDetail
          wraps it in PublicShell, which already provides the page's only <main>
          landmark. Unlike /pricing this route IS server-rendered, so the nested
          landmark went into the raw HTML a job-seeking crawler indexes. */}
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="gap-8 lg:grid lg:grid-cols-[1fr_320px]">
          {/* Left column — all content sections */}
          <div className="space-y-8">
            {/* Header section */}
            <section>
              {/* Tier badge */}
              {(isFeatured || isPremium) && (
                <div className="mb-3">
                  {/* Was two hand-rolled pills built from arbitrary Tailwind values: an
                      amber-700 and a blue-600 over 10%-alpha fills of the same hues. Neither
                      colour is in any token set, and neither pairing had ever been through
                      scripts/contrast.mjs. Tag carries the same two roles with tints whose
                      text partners are gated by name — warn 6.37:1, info 6.59:1. Hand-rolling
                      a pill is how the 1.93:1 `orange` variant shipped and had to be deleted
                      in July (Brand_and_Design.md, two badge families). */}
                  <StatusTag variant={isPremium ? 'warn' : 'blue'} className="gap-1.5">
                    <Star className="h-3 w-3" />
                    {isPremium ? 'Premium Listing' : 'Featured Listing'}
                  </StatusTag>
                </div>
              )}

              <h1
                className="mb-3 text-3xl leading-tight font-semibold text-brand-900"
              >
                {job.title}
              </h1>

              {/* Farm name + trust badge */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className="text-base font-semibold text-text"
                >
                  {employer?.farm_name}
                </span>
                <VerificationBadge
                  verifications={verifications}
                  trustLevel={trustLevel}
                  expandable={true}
                />
              </div>

              {/* Key metadata */}
              <div
                className="flex flex-wrap gap-3 text-sm text-text-muted"
              >
                {employer?.region && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    {employer.region}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 flex-shrink-0" />
                  {formatSalary(job.salary_min, job.salary_max)}
                </span>
                <span className="flex items-center gap-1.5 capitalize">
                  <Briefcase className="h-4 w-4 flex-shrink-0" />
                  {job.contract_type}
                </span>
                {job.start_date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    Starts {formatDate(job.start_date)}
                  </span>
                )}
              </div>
            </section>

            {/* Stats strip (JDET-02) */}
            <StatsStrip
              stats={[
                { label: 'Applications', value: applicationCount },
                { label: 'Views', value: '-' },
                { label: 'Salary', value: formatSalary(job.salary_min, job.salary_max) },
                { label: 'Posted', value: formatDate(job.created_at) ?? '-' },
              ]}
            />

            {/* Description sections */}
            {(job.description_overview ||
              job.description_daytoday ||
              job.description_offer ||
              job.description_ideal) && (
              <section>
                <div className="bg-surface border-border space-y-6 rounded-12 border-[1.5px] p-6">
                  {job.description_overview && (
                    <div>
                      <h2
                        className="mb-2 text-base font-bold text-text"
                      >
                        Role Overview
                      </h2>
                      <p
                        className="text-sm leading-relaxed whitespace-pre-line text-text-muted"
                      >
                        {job.description_overview}
                      </p>
                    </div>
                  )}
                  {/* Day-to-day: bulleted list with meadow dots (JDET-03) */}
                  {job.description_daytoday && (
                    <div>
                      <h2
                        className="mb-2 text-base font-bold text-text"
                      >
                        Day-to-Day
                      </h2>
                      <ul className="space-y-1.5">
                        {job.description_daytoday
                          .split('\n')
                          .filter(Boolean)
                          .map((line, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm leading-relaxed text-text-muted"
                            >
                              <span
                                className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand"
                              />
                              {line.replace(/^[-*]\s*/, '')}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                  {job.description_offer && (
                    <div>
                      <h2
                        className="mb-2 text-base font-bold text-text"
                      >
                        What We Offer
                      </h2>
                      <p
                        className="text-sm leading-relaxed whitespace-pre-line text-text-muted"
                      >
                        {job.description_offer}
                      </p>
                    </div>
                  )}
                  {job.description_ideal && (
                    <div>
                      <h2
                        className="mb-2 text-base font-bold text-text"
                      >
                        Ideal Candidate
                      </h2>
                      <p
                        className="text-sm leading-relaxed whitespace-pre-line text-text-muted"
                      >
                        {job.description_ideal}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Skills section */}
            {skills.length > 0 && (
              <section>
                <h2
                  className="mb-1 text-lg font-bold text-text"
                >
                  Skills
                </h2>
                <p className="mb-4 text-xs text-text-muted">
                  {requiredCount > 0 && `${requiredCount} required`}
                  {requiredCount > 0 && preferredCount > 0 && ', '}
                  {preferredCount > 0 && `${preferredCount} preferred`}
                </p>

                <div className="bg-surface border-border rounded-12 border-[1.5px] p-6">
                  {/* Legend row (JDET-04) */}
                  <div className="border-border mb-4 flex items-center gap-4 border-b pb-3">
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span className="bg-brand h-2 w-2 rounded-full" /> Required
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span className="bg-surface-2 h-2 w-2 rounded-full" /> Preferred
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span className="bg-warn h-2 w-2 rounded-full" /> Bonus
                    </span>
                  </div>

                  {/* 2-column skills grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
                      <div key={category}>
                        <p
                          className="mb-2 text-micro font-semibold tracking-wide uppercase text-text-muted"
                        >
                          {category}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {categorySkills.map((s) => (
                            <span
                              key={s.skill_id}
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                                s.requirement_level === 'required'
                                  ? 'text-success-text-on-bg bg-success-bg'
                                  : 'bg-surface-2 text-text-muted',
                              )}
                            >
                              {s.skills?.name}
                              <span
                                className={cn(
                                  'text-micro',
                                  s.requirement_level === 'required'
                                    ? 'text-success-text-on-bg'
                                    : 'text-text-muted',
                                )}
                              >
                                {s.requirement_level === 'required' ? 'required' : 'preferred'}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Application Timeline (JDET-05) */}
            <section>
              <h2
                className="mb-4 text-lg font-bold text-text"
              >
                Application Timeline
              </h2>
              <Timeline
                entries={[
                  { title: 'Job posted', date: formatDate(job.created_at) ?? undefined },
                  { title: 'Applications open' },
                  { title: 'Review period' },
                  { title: 'Interviews' },
                  { title: 'Offers extended' },
                ]}
              />
            </section>

            {/* Location / Map (JDET-06) */}
            <section>
              <h2
                className="mb-4 text-lg font-bold text-text"
              >
                Location
              </h2>
              <MapPlaceholder region={employer?.region} />
            </section>

            {/* Compensation & Benefits */}
            {(job.salary_min || job.salary_max || (job.benefits && job.benefits.length > 0)) && (
              <section>
                <h2
                  className="mb-4 text-lg font-bold text-text"
                >
                  Compensation &amp; Benefits
                </h2>
                <div className="bg-surface border-border space-y-3 rounded-12 border-[1.5px] p-6">
                  <div className="flex items-center gap-2">
                    <DollarSign
                      className="h-4 w-4 flex-shrink-0 text-text-muted"
                    />
                    <span
                      className="text-sm font-semibold text-text"
                    >
                      {formatSalary(job.salary_min, job.salary_max)}
                    </span>
                  </div>
                  {job.benefits && job.benefits.length > 0 && (
                    <ul className="space-y-1.5 pl-6">
                      {job.benefits.map((benefit, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-text-muted"
                        >
                          <span className="text-brand-900 mt-0.5">•</span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            )}

            {/* Accommodation section */}
            {employer?.accommodation_available && (
              <section>
                <h2
                  className="mb-4 text-lg font-bold text-text"
                >
                  Accommodation
                </h2>
                <div className="bg-surface border-border space-y-3 rounded-12 border-[1.5px] p-6">
                  {employer.accommodation_type && (
                    <div className="flex items-center gap-2">
                      <Home
                        className="h-4 w-4 flex-shrink-0 text-text-muted"
                      />
                      <span className="text-sm text-text">
                        {employer.accommodation_type}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3">
                    {(() => {
                      const ICON_MAP: Record<string, typeof PawPrint> = {
                        'Pets allowed': PawPrint,
                        'Couples welcome': Users,
                        'Family welcome': Users,
                        'Utilities included': Zap,
                      }
                      return (employer.accommodation_extras ?? []).map((chip) => {
                        const Icon = ICON_MAP[chip] ?? Tag
                        return (
                          <span
                            key={chip}
                            className="flex items-center gap-1.5 text-sm text-text-muted"
                          >
                            <Icon className="h-4 w-4" />
                            {chip}
                          </span>
                        )
                      })
                    })()}
                  </div>
                </div>
              </section>
            )}

            {/* Farm Details section */}
            {employer &&
              (employer.farm_type ||
                employer.shed_type ||
                employer.herd_size ||
                employer.culture_description) && (
                <section>
                  <h2
                    className="mb-4 text-lg font-bold text-text"
                  >
                    Farm Details
                  </h2>
                  <div className="bg-surface border-border space-y-4 rounded-12 border-[1.5px] p-6">
                    <div className="grid grid-cols-2 gap-4">
                      {employer.farm_type && (
                        <div>
                          <p
                            className="mb-0.5 text-micro font-semibold tracking-wide uppercase text-text-muted"
                          >
                            Farm Type
                          </p>
                          <p className="text-sm capitalize text-text">
                            {employer.farm_type}
                          </p>
                        </div>
                      )}
                      {employer.shed_type && (
                        <div>
                          <p
                            className="mb-0.5 text-micro font-semibold tracking-wide uppercase text-text-muted"
                          >
                            Shed Type
                          </p>
                          <p className="text-sm text-text">
                            {employer.shed_type}
                          </p>
                        </div>
                      )}
                      {employer.herd_size && (
                        <div>
                          <p
                            className="mb-0.5 text-micro font-semibold tracking-wide uppercase text-text-muted"
                          >
                            Herd Size
                          </p>
                          <p className="text-sm text-text">
                            {employer.herd_size.toLocaleString()} head
                          </p>
                        </div>
                      )}
                      {employer.region && (
                        <div>
                          <p
                            className="mb-0.5 text-micro font-semibold tracking-wide uppercase text-text-muted"
                          >
                            Region
                          </p>
                          <p className="text-sm text-text">
                            {employer.region}
                          </p>
                        </div>
                      )}
                    </div>
                    {employer.culture_description && (
                      <div>
                        <p
                          className="mb-1 text-micro font-semibold tracking-wide uppercase text-text-muted"
                        >
                          Culture &amp; Team
                        </p>
                        <p
                          className="text-sm leading-relaxed whitespace-pre-line text-text-muted"
                        >
                          {employer.culture_description}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )}

            {/* Mobile match breakdown (below main content) */}
            {isSeeker && matchScore && (
              <div className="lg:hidden">
                <MatchBreakdown score={matchScore} />
              </div>
            )}
            {isVisitor && (
              <div className="lg:hidden">
                <MatchTeaser jobPath={jobPath} />
              </div>
            )}
          </div>

          {/* Right column — match breakdown + full sidebar (JDET-07/08/09) */}
          <div className="hidden lg:block">
            <div className="sticky top-20 space-y-4">
              {/* Match breakdown for seekers */}
              {isSeeker && matchScore && <MatchBreakdown score={matchScore} />}
              {isVisitor && <MatchTeaser jobPath={jobPath} />}

              {/* Sidebar: quick facts, similar jobs, farm profile */}
              <JobDetailSidebar
                job={job}
                farm={{
                  id: employer?.id ?? '',
                  farm_name: employer?.farm_name ?? '',
                  region: employer?.region ?? '',
                  farm_type: employer?.farm_type,
                  herd_size: employer?.herd_size,
                }}
                similarJobs={similarJobs}
                isSaved={jobId ? isSaved(jobId) : false}
                onSaveToggle={handleSaveIntent}
                onShare={() => {
                  navigator.clipboard.writeText(window.location.href)
                  toast.success('Link copied to clipboard')
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky CTA bar — visitor. DELIBERATE: /jobs/:id renders in bare
          PublicShell (no MobileBottomNav) because the fixed apply/signup CTA
          owns the bottom edge on this route. If anyone swaps in
          JobSearchLayout, the z-40 bottom nav will sit on top of this z-30
          bar for signed-in seekers — don't. */}
      {isVisitor && (
        <div
          className="border-border fixed right-0 bottom-0 left-0 z-30 border-t shadow-lg bg-white"
        >
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
            <p className="text-sm font-semibold text-text">
              Sign up to see how you match and apply
            </p>
            <div className="flex flex-shrink-0 items-center gap-2">
              <Link
                to={`/login?next=${encodeURIComponent(jobPath)}`}
                className={cn(
                  'inline-flex items-center justify-center rounded-8 font-bold transition-all duration-200',
                  'bg-surface border-brand text-brand-900 hover:bg-surface-2 border',
                  'px-3 py-2 text-label',
                )}
              >
                Log In
              </Link>
              <Link
                to={`/signup?role=seeker&next=${encodeURIComponent(jobPath)}`}
                className={cn(
                  'inline-flex items-center justify-center rounded-8 font-bold transition-all duration-200',
                  'bg-brand-hover hover:bg-brand-900 text-white',
                  'px-4 py-2 text-label',
                )}
              >
                Sign Up Free
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Sticky CTA bar — seeker */}
      {isSeeker && (
        <div
          className="border-border fixed right-0 bottom-0 left-0 z-30 border-t shadow-lg bg-white"
        >
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
            {matchScore && (
              <div className="flex items-center gap-2 lg:hidden">
                <MatchBand score={matchScore.total_score} />
                <span className="text-sm font-semibold text-text">
                  Match
                </span>
              </div>
            )}
            {/* Only a real "already applied" disables the button. A missing
                profile used to disable it too, which meant the guidance toast
                in onClick could never fire — an un-onboarded seeker saw a dead
                grey button with no explanation and no way forward. Now the
                click routes them into onboarding with this job parked as the
                return target (src/lib/returnTo.ts). */}
            <button
              type="button"
              disabled={hasApplied}
              onClick={() => {
                if (!seekerProfileId) {
                  storeReturnTo(jobPath)
                  toast.info("Finish your profile to apply — we'll bring you back to this job")
                  navigate('/onboarding/seeker')
                  return
                }
                setApplyModalOpen(true)
              }}
              className={cn(
                'ml-auto inline-flex items-center justify-center rounded-8 font-bold transition-all duration-200',
                hasApplied
                  ? 'bg-surface-2 text-text-muted cursor-not-allowed'
                  : 'bg-brand-hover hover:bg-brand-900 text-white',
                'px-6 py-2.5 text-sm',
              )}
            >
              {hasApplied ? 'Applied' : 'Apply Now'}
            </button>
          </div>
        </div>
      )}

      {/* Apply modal */}
      <Dialog.Root open={applyModalOpen} onOpenChange={setApplyModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content className="bg-surface fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-16 p-6 shadow-xl">
            <Dialog.Title
              className="mb-1 text-xl font-semibold text-brand-900"
            >
              Apply to {job.title}
            </Dialog.Title>
            <Dialog.Description
              className="mb-4 text-sm text-text-muted"
            >
              Your profile will be shared with {employer?.farm_name}. Add an optional note below.
            </Dialog.Description>
            {/* The only thing naming this box was its placeholder, which vanishes on the
                first keystroke - the apply form's one input announced as unlabelled.
                Found by the pre-launch UAT design pass, 2026-08-25 (axe: label). */}
            <label htmlFor={coverNoteId} className="mb-1 block text-sm font-medium text-text-muted">
              Cover note (optional)
            </label>
            <textarea
              id={coverNoteId}
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
              placeholder="Add a cover note (optional)..."
              rows={4}
              maxLength={500}
              aria-describedby={coverNoteCountId}
              className="border-border focus:border-brand w-full resize-none rounded-8 border p-3 text-sm"
            />
            <p
              id={coverNoteCountId}
              className="mt-1 text-right text-micro text-text-muted"
            >
              {coverNote.length}/500
            </p>
            <div className="mt-4 flex gap-3">
              <Dialog.Close asChild>
                <button
                  className="border-border hover:bg-surface-2 flex-1 rounded-8 border px-4 py-2 text-label font-bold transition-colors text-text-muted"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                onClick={handleApply}
                disabled={applying}
                className="bg-brand-hover hover:bg-brand-900 flex-1 rounded-8 px-4 py-2 text-label font-bold text-white transition-colors disabled:opacity-50"
              >
                {applying ? 'Submitting...' : 'Confirm Application'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
