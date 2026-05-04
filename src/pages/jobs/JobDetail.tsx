import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router'
import * as Dialog from '@radix-ui/react-dialog'
import {
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
import { useAuth } from '@/hooks/useAuth'
import { VerificationBadge } from '@/components/ui/VerificationBadge'
import { MatchBreakdown } from '@/components/ui/MatchBreakdown'
import { MatchCircle } from '@/components/ui/MatchCircle'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { StatsStrip } from '@/components/ui/StatsStrip'
import { Timeline } from '@/components/ui/Timeline'
import { JobDetailSidebar } from '@/components/ui/JobDetailSidebar'
import { MapPlaceholder } from '@/components/ui/MapPlaceholder'
import { useSavedJobs } from '@/hooks/useSavedJobs'
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

// Blurred visitor teaser — realistic-looking placeholder match
const VISITOR_TEASER_SCORE: MatchScore = {
  total_score: 78,
  breakdown: {
    shed_type: 20,
    location: 16,
    accommodation: 15,
    skills: 14,
    salary: 8,
    visa: 5,
    couples: 0,
  },
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
  if (min && max) return `${fmt(min)} – ${fmt(max)} per year`
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
 * - Visitors (not logged in): see full listing + sticky signup CTA bar + blurred match teaser
 * - Seekers: see full listing + match score breakdown + "Apply Now" modal
 * - Employer (own listing): see full listing + "Edit Listing" button
 * - Employer (not own): see full listing, no CTA
 * - Archived/not-found jobs: show "no longer available" message
 * - Draft jobs: only visible to owning employer
 */
export function JobDetail() {
  const { id: jobId } = useParams<{ id: string }>()
  const { session, role, loading: authLoading } = useAuth()

  const [job, setJob] = useState<JobDetailData | null>(null)
  const [skills, setSkills] = useState<JobSkill[]>([])
  const [verifications, setVerifications] = useState<EmployerVerification[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Seeker-specific state
  const [matchScore, setMatchScore] = useState<MatchScore | null>(null)
  const [seekerProfileId, setSeekerProfileId] = useState<string | null>(null)
  const [hasApplied, setHasApplied] = useState(false)
  const [applyModalOpen, setApplyModalOpen] = useState(false)
  const [coverNote, setCoverNote] = useState('')
  const [applying, setApplying] = useState(false)

  // New: similar jobs and application count
  const [similarJobs, setSimilarJobs] = useState<SimilarJob[]>([])
  const [applicationCount, setApplicationCount] = useState(0)

  const { isSaved, toggleSave } = useSavedJobs(session?.user?.id ?? null)

  useEffect(() => {
    if (!jobId) {
      setNotFound(true)
      setLoading(false)
      return
    }

    async function loadJob() {
      setLoading(true)

      // 1. Load job with employer profile
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select(
          `*,
          employer_profiles(*)`,
        )
        .eq('id', jobId)
        .single()

      if (jobError || !jobData) {
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
          .select('*')
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
        .select('id, title, salary_min, salary_max, employer_profiles(farm_name, region)')
        .eq('status', 'active')
        .eq('region', loadedJob.region ?? '')
        .neq('id', jobId)
        .limit(3)
      setSimilarJobs(
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
            supabase.functions.invoke('generate-match-explanation', {
              body: { seeker_id: profile.id, job_id: jobId },
            }).catch(() => {}) // fire-and-forget, no error handling needed
          }

          // Check if already applied
          const { data: existingApp } = await supabase
            .from('applications')
            .select('id')
            .eq('job_id', jobId)
            .eq('seeker_id', profile.id)
            .maybeSingle()
          if (existingApp) setHasApplied(true)
        }
      }

      setLoading(false)
    }

    loadJob()
  }, [jobId, session, role])

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

  // Loading state
  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <p className="text-sm" style={{ color: 'var(--color-text-subtle)' }}>
          Loading listing...
        </p>
      </div>
    )
  }

  // Not found / archived
  if (notFound || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="text-center max-w-md px-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
            style={{ backgroundColor: 'var(--color-border)' }}
          >
            📋
          </div>
          <h1
            className="font-display text-2xl font-semibold mb-2"
            style={{ color: 'var(--color-brand-900)' }}
          >
            Listing not available
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
            This job listing is no longer available. It may have been filled, expired, or removed.
          </p>
          <Link
            to="/jobs"
            className={cn(
              'font-body font-bold rounded-[8px] transition-all duration-200 inline-flex items-center justify-center',
              'bg-brand text-white hover:bg-brand-hover',
              'px-4 py-2 text-[13px]',
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
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
          <div className="text-center max-w-md px-4">
            <h1 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--color-brand-900)' }}>
              Listing not available
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
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
  const isOwnerEmployer =
    session && role === 'employer' // Simplified — in Phase 2 all employers see edit for any job (ownership check deferred)

  const isFeatured = job.listing_tier === 2
  const isPremium = job.listing_tier === 3

  // ─── Apply handler ──────────────────────────────────────────────────────────

  async function handleApply() {
    if (!seekerProfileId || !jobId) return
    setApplying(true)
    const { error } = await supabase.from('applications').insert({
      job_id: jobId,
      seeker_id: seekerProfileId,
      cover_note: coverNote || null,
      status: 'applied',
    })
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
    toast.success('Application submitted!')
  }

  // ─── Main render ────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen pb-24"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {/* Breadcrumb bar — replaces old minimal nav */}
      <div className="sticky top-0 z-30">
        <Breadcrumb
          items={[
            { label: 'Jobs', href: '/jobs' },
            { label: job.title },
          ]}
          onSave={() => jobId && toggleSave(jobId)}
          onShare={() => {
            navigator.clipboard.writeText(window.location.href)
            toast.success('Link copied to clipboard')
          }}
        />
      </div>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="lg:grid lg:grid-cols-[1fr_320px] gap-8">
          {/* Left column — all content sections */}
          <div className="space-y-8">

            {/* Header section */}
            <section>
              {/* Tier badge */}
              {(isFeatured || isPremium) && (
                <div className="mb-3">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-body font-semibold',
                      isPremium
                        ? 'bg-[rgba(180,83,9,0.10)] text-[#b45309]'
                        : 'bg-[rgba(59,130,246,0.10)] text-[#2563eb]',
                    )}
                  >
                    <Star className="w-3 h-3" />
                    {isPremium ? 'Premium Listing' : 'Featured Listing'}
                  </span>
                </div>
              )}

              <h1
                className="font-display text-3xl font-semibold leading-tight mb-3"
                style={{ color: 'var(--color-brand-900)' }}
              >
                {job.title}
              </h1>

              {/* Farm name + trust badge */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="text-base font-body font-semibold" style={{ color: 'var(--color-text)' }}>
                  {employer?.farm_name}
                </span>
                <VerificationBadge
                  verifications={verifications}
                  trustLevel={trustLevel}
                  expandable={true}
                />
              </div>

              {/* Key metadata */}
              <div className="flex flex-wrap gap-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {employer?.region && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    {employer.region}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 flex-shrink-0" />
                  {formatSalary(job.salary_min, job.salary_max)}
                </span>
                <span className="flex items-center gap-1.5 capitalize">
                  <Briefcase className="w-4 h-4 flex-shrink-0" />
                  {job.contract_type}
                </span>
                {job.start_date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    Starts {formatDate(job.start_date)}
                  </span>
                )}
              </div>
            </section>

            {/* Stats strip (JDET-02) */}
            <StatsStrip stats={[
              { label: 'Applications', value: applicationCount },
              { label: 'Views', value: '-' },
              { label: 'Salary', value: formatSalary(job.salary_min, job.salary_max) },
              { label: 'Posted', value: formatDate(job.created_at) ?? '-' },
            ]} />

            {/* Description sections */}
            {(job.description_overview ||
              job.description_daytoday ||
              job.description_offer ||
              job.description_ideal) && (
              <section>
                <div className="bg-surface border-[1.5px] border-border rounded-[12px] p-6 space-y-6">
                  {job.description_overview && (
                    <div>
                      <h2
                        className="text-[15px] font-body font-bold mb-2"
                        style={{ color: 'var(--color-text)' }}
                      >
                        Role Overview
                      </h2>
                      <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-text-muted)' }}>
                        {job.description_overview}
                      </p>
                    </div>
                  )}
                  {/* Day-to-day: bulleted list with meadow dots (JDET-03) */}
                  {job.description_daytoday && (
                    <div>
                      <h2
                        className="text-[15px] font-body font-bold mb-2"
                        style={{ color: 'var(--color-text)' }}
                      >
                        Day-to-Day
                      </h2>
                      <ul className="space-y-1.5">
                        {job.description_daytoday.split('\n').filter(Boolean).map((line, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--color-brand)' }} />
                            {line.replace(/^[-*]\s*/, '')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {job.description_offer && (
                    <div>
                      <h2
                        className="text-[15px] font-body font-bold mb-2"
                        style={{ color: 'var(--color-text)' }}
                      >
                        What We Offer
                      </h2>
                      <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-text-muted)' }}>
                        {job.description_offer}
                      </p>
                    </div>
                  )}
                  {job.description_ideal && (
                    <div>
                      <h2
                        className="text-[15px] font-body font-bold mb-2"
                        style={{ color: 'var(--color-text)' }}
                      >
                        Ideal Candidate
                      </h2>
                      <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-text-muted)' }}>
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
                  className="text-[17px] font-body font-bold mb-1"
                  style={{ color: 'var(--color-text)' }}
                >
                  Skills
                </h2>
                <p className="text-xs mb-4" style={{ color: 'var(--color-text-subtle)' }}>
                  {requiredCount > 0 && `${requiredCount} required`}
                  {requiredCount > 0 && preferredCount > 0 && ', '}
                  {preferredCount > 0 && `${preferredCount} preferred`}
                </p>

                <div className="bg-surface border-[1.5px] border-border rounded-[12px] p-6">
                  {/* Legend row (JDET-04) */}
                  <div className="flex items-center gap-4 mb-4 pb-3 border-b border-border">
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-body">
                      <span className="w-2 h-2 rounded-full bg-brand" /> Required
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-body">
                      <span className="w-2 h-2 rounded-full bg-surface-2" /> Preferred
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-body">
                      <span className="w-2 h-2 rounded-full bg-warn" /> Bonus
                    </span>
                  </div>

                  {/* 2-column skills grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
                      <div key={category}>
                        <p
                          className="text-[11px] font-body font-semibold uppercase tracking-wide mb-2"
                          style={{ color: 'var(--color-text-subtle)' }}
                        >
                          {category}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {categorySkills.map((s) => (
                            <span
                              key={s.skill_id}
                              className={cn(
                                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-body font-semibold',
                                s.requirement_level === 'required'
                                  ? 'bg-[rgba(74,124,47,0.12)] text-brand'
                                  : 'bg-surface-2 text-text-muted',
                              )}
                            >
                              {s.skills?.name}
                              <span
                                className={cn(
                                  'text-[10px]',
                                  s.requirement_level === 'required' ? 'text-brand/70' : 'text-text-subtle',
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
                className="text-[17px] font-body font-bold mb-4"
                style={{ color: 'var(--color-text)' }}
              >
                Application Timeline
              </h2>
              <Timeline entries={[
                { title: 'Job posted', date: formatDate(job.created_at) ?? undefined },
                { title: 'Applications open' },
                { title: 'Review period' },
                { title: 'Interviews' },
                { title: 'Offers extended' },
              ]} />
            </section>

            {/* Location / Map (JDET-06) */}
            <section>
              <h2
                className="text-[17px] font-body font-bold mb-4"
                style={{ color: 'var(--color-text)' }}
              >
                Location
              </h2>
              <MapPlaceholder region={employer?.region} />
            </section>

            {/* Compensation & Benefits */}
            {(job.salary_min || job.salary_max || (job.benefits && job.benefits.length > 0)) && (
              <section>
                <h2
                  className="text-[17px] font-body font-bold mb-4"
                  style={{ color: 'var(--color-text)' }}
                >
                  Compensation &amp; Benefits
                </h2>
                <div className="bg-surface border-[1.5px] border-border rounded-[12px] p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                    <span className="text-sm font-body font-semibold" style={{ color: 'var(--color-text)' }}>
                      {formatSalary(job.salary_min, job.salary_max)}
                    </span>
                  </div>
                  {job.benefits && job.benefits.length > 0 && (
                    <ul className="space-y-1.5 pl-6">
                      {job.benefits.map((benefit, i) => (
                        <li key={i} className="text-sm flex items-start gap-2" style={{ color: 'var(--color-text-muted)' }}>
                          <span className="text-brand mt-0.5">•</span>
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
                  className="text-[17px] font-body font-bold mb-4"
                  style={{ color: 'var(--color-text)' }}
                >
                  Accommodation
                </h2>
                <div className="bg-surface border-[1.5px] border-border rounded-[12px] p-6 space-y-3">
                  {employer.accommodation_type && (
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                      <span className="text-sm" style={{ color: 'var(--color-text)' }}>
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
                          <span key={chip} className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            <Icon className="w-4 h-4" />
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
            {employer && (employer.farm_type || employer.shed_type || employer.herd_size || employer.culture_description) && (
              <section>
                <h2
                  className="text-[17px] font-body font-bold mb-4"
                  style={{ color: 'var(--color-text)' }}
                >
                  Farm Details
                </h2>
                <div className="bg-surface border-[1.5px] border-border rounded-[12px] p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {employer.farm_type && (
                      <div>
                        <p className="text-[11px] font-body font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-text-subtle)' }}>
                          Farm Type
                        </p>
                        <p className="text-sm capitalize" style={{ color: 'var(--color-text)' }}>
                          {employer.farm_type}
                        </p>
                      </div>
                    )}
                    {employer.shed_type && (
                      <div>
                        <p className="text-[11px] font-body font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-text-subtle)' }}>
                          Shed Type
                        </p>
                        <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                          {employer.shed_type}
                        </p>
                      </div>
                    )}
                    {employer.herd_size && (
                      <div>
                        <p className="text-[11px] font-body font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-text-subtle)' }}>
                          Herd Size
                        </p>
                        <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                          {employer.herd_size.toLocaleString()} head
                        </p>
                      </div>
                    )}
                    {employer.region && (
                      <div>
                        <p className="text-[11px] font-body font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-text-subtle)' }}>
                          Region
                        </p>
                        <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                          {employer.region}
                        </p>
                      </div>
                    )}
                  </div>
                  {employer.culture_description && (
                    <div>
                      <p className="text-[11px] font-body font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-subtle)' }}>
                        Culture &amp; Team
                      </p>
                      <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-text-muted)' }}>
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
                <MatchBreakdown score={VISITOR_TEASER_SCORE} blurred={true} />
              </div>
            )}
          </div>

          {/* Right column — match breakdown + full sidebar (JDET-07/08/09) */}
          <div className="hidden lg:block">
            <div className="sticky top-20 space-y-4">
              {/* Match breakdown for seekers */}
              {isSeeker && matchScore && <MatchBreakdown score={matchScore} />}
              {isVisitor && <MatchBreakdown score={VISITOR_TEASER_SCORE} blurred={true} />}

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
                onSaveToggle={() => jobId && toggleSave(jobId)}
                onShare={() => {
                  navigator.clipboard.writeText(window.location.href)
                  toast.success('Link copied to clipboard')
                }}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Sticky CTA bar — visitor */}
      {isVisitor && (
        <div
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-border shadow-lg"
          style={{ backgroundColor: 'white' }}
        >
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <p className="text-sm font-body font-semibold" style={{ color: 'var(--color-text)' }}>
              Sign up to see how you match and apply
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                to="/login"
                className={cn(
                  'font-body font-bold rounded-[8px] transition-all duration-200 inline-flex items-center justify-center',
                  'bg-surface border border-brand text-brand hover:bg-surface-2',
                  'px-3 py-2 text-[13px]',
                )}
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className={cn(
                  'font-body font-bold rounded-[8px] transition-all duration-200 inline-flex items-center justify-center',
                  'bg-brand text-white hover:bg-brand-hover',
                  'px-4 py-2 text-[13px]',
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
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-border shadow-lg"
          style={{ backgroundColor: 'white' }}
        >
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
            {matchScore && (
              <div className="flex items-center gap-2 lg:hidden">
                <MatchCircle score={matchScore.total_score} size="sm" />
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Match</span>
              </div>
            )}
            <button
              type="button"
              disabled={hasApplied || !seekerProfileId}
              onClick={() => {
                if (!seekerProfileId) {
                  toast.info('Complete your profile before applying')
                  return
                }
                setApplyModalOpen(true)
              }}
              className={cn(
                'font-body font-bold rounded-[8px] transition-all duration-200 inline-flex items-center justify-center ml-auto',
                hasApplied || !seekerProfileId
                  ? 'bg-surface-2 text-text-muted cursor-not-allowed'
                  : 'bg-brand text-white hover:bg-brand-hover',
                'px-6 py-2.5 text-[14px]',
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
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-[16px] p-6 w-full max-w-md z-50 shadow-xl">
            <Dialog.Title
              className="font-display text-xl font-semibold mb-1"
              style={{ color: 'var(--color-brand-900)' }}
            >
              Apply to {job.title}
            </Dialog.Title>
            <Dialog.Description
              className="text-sm mb-4"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Your profile will be shared with {employer?.farm_name}. Add an optional note below.
            </Dialog.Description>
            <textarea
              value={coverNote}
              onChange={e => setCoverNote(e.target.value)}
              placeholder="Add a cover note (optional)..."
              rows={4}
              maxLength={500}
              className="w-full rounded-[8px] border border-border p-3 text-sm resize-none focus:border-brand focus:outline-none"
            />
            <p className="text-[11px] text-right mt-1" style={{ color: 'var(--color-text-subtle)' }}>
              {coverNote.length}/500
            </p>
            <div className="flex gap-3 mt-4">
              <Dialog.Close asChild>
                <button
                  className="flex-1 font-body font-bold rounded-[8px] border border-border px-4 py-2 text-[13px] hover:bg-surface-2 transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                onClick={handleApply}
                disabled={applying}
                className="flex-1 font-body font-bold rounded-[8px] bg-brand text-white hover:bg-brand-hover px-4 py-2 text-[13px] transition-colors disabled:opacity-50"
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
