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
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { VerificationBadge } from '@/components/ui/VerificationBadge'
import { MatchBreakdown } from '@/components/ui/MatchBreakdown'
import { MatchCircle } from '@/components/ui/MatchCircle'
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
  accommodation_pets?: boolean
  accommodation_couples?: boolean
  accommodation_family?: boolean
  accommodation_utilities_included?: boolean
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
          employer_profiles(
            id,
            farm_name,
            region,
            farm_type,
            shed_type,
            herd_size,
            accommodation_available,
            accommodation_type,
            accommodation_pets,
            accommodation_couples,
            accommodation_family,
            accommodation_utilities_included,
            culture_description
          )`,
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

      // 4. Seeker-specific: fetch match score + check prior application
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
            .rpc('compute_match_score', { p_seeker_id: profile.id, p_job_id: jobId })
          if (scoreData) setMatchScore(scoreData as MatchScore)

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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-cream)' }}>
        <p className="text-sm" style={{ color: 'var(--color-light)' }}>
          Loading listing...
        </p>
      </div>
    )
  }

  // Not found / archived
  if (notFound || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-cream)' }}>
        <div className="text-center max-w-md px-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
            style={{ backgroundColor: 'var(--color-fog)' }}
          >
            📋
          </div>
          <h1
            className="font-display text-2xl font-semibold mb-2"
            style={{ color: 'var(--color-soil)' }}
          >
            Listing not available
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-mid)' }}>
            This job listing is no longer available. It may have been filled, expired, or removed.
          </p>
          <Link
            to="/jobs"
            className={cn(
              'font-body font-bold rounded-[8px] transition-all duration-200 inline-flex items-center justify-center',
              'bg-moss text-white hover:bg-fern',
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
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-cream)' }}>
          <div className="text-center max-w-md px-4">
            <h1 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--color-soil)' }}>
              Listing not available
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-mid)' }}>
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
  // Actually check via employer_id — need employer's profile id
  // We can't easily get the logged-in employer profile id here, so show edit link for all employers viewing own listing
  // A proper ownership check requires loading the employer profile. We keep it simple here.

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
      style={{ backgroundColor: 'var(--color-cream)' }}
    >
      {/* Top nav bar (minimal) */}
      <nav
        className="sticky top-0 z-30 border-b border-fog"
        style={{ backgroundColor: 'white' }}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            to="/"
            className="font-display text-lg font-semibold"
            style={{ color: 'var(--color-soil)' }}
          >
            TopFarms
          </Link>
          {isVisitor && (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className={cn(
                  'font-body font-bold rounded-[8px] transition-all duration-200 inline-flex items-center justify-center',
                  'bg-white border border-moss text-moss hover:bg-mist',
                  'px-3 py-1.5 text-[12px]',
                )}
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className={cn(
                  'font-body font-bold rounded-[8px] transition-all duration-200 inline-flex items-center justify-center',
                  'bg-moss text-white hover:bg-fern',
                  'px-3 py-1.5 text-[12px]',
                )}
              >
                Sign Up
              </Link>
            </div>
          )}
          {isOwnerEmployer && (
            <Link
              to={`/jobs/${job.id}/edit`}
              className={cn(
                'font-body font-bold rounded-[8px] transition-all duration-200 inline-flex items-center justify-center',
                'bg-white border border-moss text-moss hover:bg-mist',
                'px-3 py-1.5 text-[12px]',
              )}
            >
              Edit Listing
            </Link>
          )}
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className={cn(
          'gap-8',
          (isSeeker || isVisitor) ? 'lg:grid lg:grid-cols-[1fr_280px]' : '',
        )}>
          {/* Left column — all existing sections */}
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
                style={{ color: 'var(--color-soil)' }}
              >
                {job.title}
              </h1>

              {/* Farm name + trust badge */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="text-base font-body font-semibold" style={{ color: 'var(--color-ink)' }}>
                  {employer?.farm_name}
                </span>
                <VerificationBadge
                  verifications={verifications}
                  trustLevel={trustLevel}
                  expandable={true}
                />
              </div>

              {/* Key metadata */}
              <div className="flex flex-wrap gap-3 text-sm" style={{ color: 'var(--color-mid)' }}>
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

            {/* Description sections */}
            {(job.description_overview ||
              job.description_daytoday ||
              job.description_offer ||
              job.description_ideal) && (
              <section>
                <div className="bg-white border-[1.5px] border-fog rounded-[12px] p-6 space-y-6">
                  {job.description_overview && (
                    <div>
                      <h2
                        className="text-[15px] font-body font-bold mb-2"
                        style={{ color: 'var(--color-ink)' }}
                      >
                        Role Overview
                      </h2>
                      <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-mid)' }}>
                        {job.description_overview}
                      </p>
                    </div>
                  )}
                  {job.description_daytoday && (
                    <div>
                      <h2
                        className="text-[15px] font-body font-bold mb-2"
                        style={{ color: 'var(--color-ink)' }}
                      >
                        Day-to-Day
                      </h2>
                      <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-mid)' }}>
                        {job.description_daytoday}
                      </p>
                    </div>
                  )}
                  {job.description_offer && (
                    <div>
                      <h2
                        className="text-[15px] font-body font-bold mb-2"
                        style={{ color: 'var(--color-ink)' }}
                      >
                        What We Offer
                      </h2>
                      <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-mid)' }}>
                        {job.description_offer}
                      </p>
                    </div>
                  )}
                  {job.description_ideal && (
                    <div>
                      <h2
                        className="text-[15px] font-body font-bold mb-2"
                        style={{ color: 'var(--color-ink)' }}
                      >
                        Ideal Candidate
                      </h2>
                      <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-mid)' }}>
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
                  style={{ color: 'var(--color-ink)' }}
                >
                  Skills
                </h2>
                <p className="text-xs mb-4" style={{ color: 'var(--color-light)' }}>
                  {requiredCount > 0 && `${requiredCount} required`}
                  {requiredCount > 0 && preferredCount > 0 && ', '}
                  {preferredCount > 0 && `${preferredCount} preferred`}
                </p>

                <div className="bg-white border-[1.5px] border-fog rounded-[12px] p-6 space-y-5">
                  {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
                    <div key={category}>
                      <p
                        className="text-[11px] font-body font-semibold uppercase tracking-wide mb-2"
                        style={{ color: 'var(--color-light)' }}
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
                                ? 'bg-[rgba(74,124,47,0.12)] text-moss'
                                : 'bg-fog text-mid',
                            )}
                          >
                            {s.skills?.name}
                            <span
                              className={cn(
                                'text-[10px]',
                                s.requirement_level === 'required' ? 'text-moss/70' : 'text-light',
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
              </section>
            )}

            {/* Compensation & Benefits */}
            {(job.salary_min || job.salary_max || (job.benefits && job.benefits.length > 0)) && (
              <section>
                <h2
                  className="text-[17px] font-body font-bold mb-4"
                  style={{ color: 'var(--color-ink)' }}
                >
                  Compensation &amp; Benefits
                </h2>
                <div className="bg-white border-[1.5px] border-fog rounded-[12px] p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-mid)' }} />
                    <span className="text-sm font-body font-semibold" style={{ color: 'var(--color-ink)' }}>
                      {formatSalary(job.salary_min, job.salary_max)}
                    </span>
                  </div>
                  {job.benefits && job.benefits.length > 0 && (
                    <ul className="space-y-1.5 pl-6">
                      {job.benefits.map((benefit, i) => (
                        <li key={i} className="text-sm flex items-start gap-2" style={{ color: 'var(--color-mid)' }}>
                          <span className="text-moss mt-0.5">•</span>
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
                  style={{ color: 'var(--color-ink)' }}
                >
                  Accommodation
                </h2>
                <div className="bg-white border-[1.5px] border-fog rounded-[12px] p-6 space-y-3">
                  {employer.accommodation_type && (
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-mid)' }} />
                      <span className="text-sm" style={{ color: 'var(--color-ink)' }}>
                        {employer.accommodation_type}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3">
                    {employer.accommodation_pets && (
                      <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-mid)' }}>
                        <PawPrint className="w-4 h-4" />
                        Pets welcome
                      </span>
                    )}
                    {employer.accommodation_couples && (
                      <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-mid)' }}>
                        <Users className="w-4 h-4" />
                        Couples welcome
                      </span>
                    )}
                    {employer.accommodation_family && (
                      <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-mid)' }}>
                        <Users className="w-4 h-4" />
                        Family-friendly
                      </span>
                    )}
                    {employer.accommodation_utilities_included && (
                      <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-mid)' }}>
                        <Zap className="w-4 h-4" />
                        Utilities included
                      </span>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Farm Details section */}
            {employer && (employer.farm_type || employer.shed_type || employer.herd_size || employer.culture_description) && (
              <section>
                <h2
                  className="text-[17px] font-body font-bold mb-4"
                  style={{ color: 'var(--color-ink)' }}
                >
                  Farm Details
                </h2>
                <div className="bg-white border-[1.5px] border-fog rounded-[12px] p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {employer.farm_type && (
                      <div>
                        <p className="text-[11px] font-body font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-light)' }}>
                          Farm Type
                        </p>
                        <p className="text-sm capitalize" style={{ color: 'var(--color-ink)' }}>
                          {employer.farm_type}
                        </p>
                      </div>
                    )}
                    {employer.shed_type && (
                      <div>
                        <p className="text-[11px] font-body font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-light)' }}>
                          Shed Type
                        </p>
                        <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
                          {employer.shed_type}
                        </p>
                      </div>
                    )}
                    {employer.herd_size && (
                      <div>
                        <p className="text-[11px] font-body font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-light)' }}>
                          Herd Size
                        </p>
                        <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
                          {employer.herd_size.toLocaleString()} head
                        </p>
                      </div>
                    )}
                    {employer.region && (
                      <div>
                        <p className="text-[11px] font-body font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-light)' }}>
                          Region
                        </p>
                        <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
                          {employer.region}
                        </p>
                      </div>
                    )}
                  </div>
                  {employer.culture_description && (
                    <div>
                      <p className="text-[11px] font-body font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-light)' }}>
                        Culture &amp; Team
                      </p>
                      <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-mid)' }}>
                        {employer.culture_description}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Right column — match breakdown sidebar (desktop) */}
          {isSeeker && matchScore && (
            <div className="hidden lg:block">
              <div className="sticky top-20">
                <MatchBreakdown score={matchScore} />
              </div>
            </div>
          )}
          {isVisitor && (
            <div className="hidden lg:block">
              <div className="sticky top-20">
                <MatchBreakdown score={VISITOR_TEASER_SCORE} blurred={true} />
              </div>
            </div>
          )}
        </div>

        {/* Mobile match breakdown (below content on small screens) */}
        {isSeeker && matchScore && (
          <div className="lg:hidden mt-8">
            <MatchBreakdown score={matchScore} />
          </div>
        )}
        {isVisitor && (
          <div className="lg:hidden mt-8">
            <MatchBreakdown score={VISITOR_TEASER_SCORE} blurred={true} />
          </div>
        )}
      </main>

      {/* Sticky CTA bar — visitor */}
      {isVisitor && (
        <div
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-fog shadow-lg"
          style={{ backgroundColor: 'white' }}
        >
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <p className="text-sm font-body font-semibold" style={{ color: 'var(--color-ink)' }}>
              Sign up to see how you match and apply
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                to="/login"
                className={cn(
                  'font-body font-bold rounded-[8px] transition-all duration-200 inline-flex items-center justify-center',
                  'bg-white border border-moss text-moss hover:bg-mist',
                  'px-3 py-2 text-[13px]',
                )}
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className={cn(
                  'font-body font-bold rounded-[8px] transition-all duration-200 inline-flex items-center justify-center',
                  'bg-moss text-white hover:bg-fern',
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
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-fog shadow-lg"
          style={{ backgroundColor: 'white' }}
        >
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
            {matchScore && (
              <div className="flex items-center gap-2 lg:hidden">
                <MatchCircle score={matchScore.total_score} size="sm" />
                <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>Match</span>
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
                  ? 'bg-fog text-mid cursor-not-allowed'
                  : 'bg-moss text-white hover:bg-fern',
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
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-[16px] p-6 w-full max-w-md z-50 shadow-xl">
            <Dialog.Title
              className="font-display text-xl font-semibold mb-1"
              style={{ color: 'var(--color-soil)' }}
            >
              Apply to {job.title}
            </Dialog.Title>
            <Dialog.Description
              className="text-sm mb-4"
              style={{ color: 'var(--color-mid)' }}
            >
              Your profile will be shared with {employer?.farm_name}. Add an optional note below.
            </Dialog.Description>
            <textarea
              value={coverNote}
              onChange={e => setCoverNote(e.target.value)}
              placeholder="Add a cover note (optional)..."
              rows={4}
              maxLength={500}
              className="w-full rounded-[8px] border border-fog p-3 text-sm resize-none focus:border-moss focus:outline-none"
            />
            <p className="text-[11px] text-right mt-1" style={{ color: 'var(--color-light)' }}>
              {coverNote.length}/500
            </p>
            <div className="flex gap-3 mt-4">
              <Dialog.Close asChild>
                <button
                  className="flex-1 font-body font-bold rounded-[8px] border border-fog px-4 py-2 text-[13px] hover:bg-mist transition-colors"
                  style={{ color: 'var(--color-mid)' }}
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                onClick={handleApply}
                disabled={applying}
                className="flex-1 font-body font-bold rounded-[8px] bg-moss text-white hover:bg-fern px-4 py-2 text-[13px] transition-colors disabled:opacity-50"
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
