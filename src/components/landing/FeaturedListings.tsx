import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '@/lib/supabase'

interface FeaturedJob {
  id: string
  title: string
  region: string
  contract_type: string
  salary_min: number | null
  salary_max: number | null
  listing_tier: string | number
  created_at: string
  shed_type?: string | null
  accommodation?: Record<string, unknown> | null
  visa_sponsorship?: boolean
  couples_welcome?: boolean
  employer_profiles: {
    farm_name: string
    region: string
    id: string
  }
}

function formatSalary(min: number | null, max: number | null): string {
  if (!min && !max) return 'Salary negotiable'
  if (min && max) return `$${(min / 1000).toFixed(0)}k–$${(max / 1000).toFixed(0)}k`
  if (min) return `From $${(min / 1000).toFixed(0)}k`
  if (max) return `To $${(max / 1000).toFixed(0)}k`
  return 'Salary negotiable'
}

function getTierBadge(tier: string | number): { label: string; color: string; bg: string } | null {
  const t = String(tier)
  if (t === '3' || t === 'premium')
    return { label: 'Premium', color: 'var(--color-warn)', bg: 'rgba(245,158,11,0.12)' }
  if (t === '2' || t === 'featured')
    return { label: 'Featured', color: 'var(--color-brand)', bg: 'rgba(122,175,63,0.1)' }
  return null
}

// Truth pass 2026-07-09: no fabricated match scores. A match score needs a logged-in
// seeker to compute against — it is meaningless (and was invented) on the public landing.
interface JobCardProps {
  job: FeaturedJob
}

function JobCard({ job }: JobCardProps) {
  const badge = getTierBadge(job.listing_tier)
  const farmName = job.employer_profiles?.farm_name ?? 'Farm'
  const region = job.employer_profiles?.region ?? job.region

  return (
    <Link
      to={`/jobs/${job.id}`}
      className="relative block rounded-2xl p-5 transition-shadow hover:shadow-md"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Badge row */}
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0 flex-1 pr-14">
          <h3
            className="font-display mb-0.5 truncate text-base leading-snug font-semibold"
            style={{ color: 'var(--color-brand-900)' }}
          >
            {job.title}
          </h3>
          <p className="truncate text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {farmName}
          </p>
        </div>
        {badge && (
          <span
            className="ml-2 flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ color: badge.color, backgroundColor: badge.bg }}
          >
            {badge.label}
          </span>
        )}
      </div>

      {/* Tags row */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{ backgroundColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          {region}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-medium capitalize"
          style={{ backgroundColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          {job.contract_type}
        </span>
      </div>

      {/* Salary */}
      <p className="text-sm font-semibold" style={{ color: 'var(--color-brand-900)' }}>
        {formatSalary(job.salary_min, job.salary_max)}
      </p>
    </Link>
  )
}

export function FeaturedListings() {
  const [featuredJobs, setFeaturedJobs] = useState<FeaturedJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchJobs() {
      // First try featured/premium jobs
      const { data: featuredData } = await supabase
        .from('jobs')
        .select(
          'id, title, region, contract_type, salary_min, salary_max, listing_tier, created_at, shed_type, accommodation, visa_sponsorship, couples_welcome, employer_profiles:marketplace_employer_profiles!inner(farm_name, region, id)',
        )
        .eq('status', 'active')
        // 2=featured, 3=premium per getTierBadge helper (FeaturedListings.tsx:33-38). listing_tier is int NOT NULL DEFAULT 1 in supabase/migrations/001_initial_schema.sql:129. HOMEBUG-02: previously passed string array which yields Postgres 22P02 invalid_text_representation.
        .in('listing_tier', [2, 3])
        .order('created_at', { ascending: false })
        .limit(6)

      if (featuredData && featuredData.length > 0) {
        setFeaturedJobs(featuredData as unknown as FeaturedJob[])
        setLoading(false)
        return
      }

      // Fallback: show up to 3 most recent active jobs of any tier
      const { data: fallbackData } = await supabase
        .from('jobs')
        .select(
          'id, title, region, contract_type, salary_min, salary_max, listing_tier, created_at, shed_type, accommodation, visa_sponsorship, couples_welcome, employer_profiles:marketplace_employer_profiles!inner(farm_name, region, id)',
        )
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(3)

      setFeaturedJobs((fallbackData as unknown as FeaturedJob[]) ?? [])
      setLoading(false)
    }

    fetchJobs()
  }, [])

  return (
    <section className="px-4 py-20" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="mx-auto max-w-6xl">
        {/* Header row */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            {/* Eyebrow */}
            <div className="mb-3 flex items-center gap-3">
              <div className="h-px w-8" style={{ backgroundColor: 'var(--color-brand)' }} />
              <p
                className="text-xs font-bold tracking-widest uppercase"
                style={{ color: 'var(--color-brand)' }}
              >
                Live Listings
              </p>
            </div>
            <h2
              className="font-display text-4xl font-bold md:text-5xl"
              style={{ color: 'var(--color-brand-900)' }}
            >
              Featured{' '}
              <em style={{ color: 'var(--color-brand)', fontStyle: 'italic' }}>Opportunities</em>
            </h2>
          </div>
          <Link
            to="/jobs"
            className="hidden items-center gap-1 text-sm font-semibold transition-colors hover:opacity-70 sm:inline-flex"
            style={{ color: 'var(--color-brand-900)' }}
          >
            View all jobs
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-2xl"
                style={{ backgroundColor: 'var(--color-border)' }}
              />
            ))}
          </div>
        ) : featuredJobs.length === 0 ? (
          /* Empty state */
          <div className="flex justify-center">
            <div
              className="max-w-sm rounded-2xl p-10 text-center"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="mb-4 text-4xl">🌾</div>
              <h3
                className="font-display mb-2 text-lg font-semibold"
                style={{ color: 'var(--color-brand-900)' }}
              >
                Be the first to post a featured job
              </h3>
              <p className="mb-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Get your farm in front of top candidates across New Zealand.
              </p>
              <Link
                to="/signup?role=employer"
                className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: 'var(--color-brand-900)',
                  color: 'var(--color-text-on-brand)',
                }}
              >
                Post a Job
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {featuredJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>

            {/* Mobile view all link */}
            <div className="mt-8 text-center sm:hidden">
              <Link
                to="/jobs"
                className="inline-flex items-center gap-1 text-sm font-semibold"
                style={{ color: 'var(--color-brand-900)' }}
              >
                View all jobs →
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
