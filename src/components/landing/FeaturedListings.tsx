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
  if (t === '3' || t === 'premium') return { label: 'Premium', color: 'var(--color-hay)', bg: 'rgba(212,168,67,0.12)' }
  if (t === '2' || t === 'featured') return { label: 'Featured', color: 'var(--color-meadow)', bg: 'rgba(122,175,63,0.1)' }
  return null
}

const MOCK_MATCH_SCORES = [94, 87, 91, 82]

interface JobCardProps {
  job: FeaturedJob
  matchScore: number
}

function JobCard({ job, matchScore }: JobCardProps) {
  const badge = getTierBadge(job.listing_tier)
  const farmName = job.employer_profiles?.farm_name ?? 'Farm'
  const region = job.employer_profiles?.region ?? job.region

  return (
    <Link
      to={`/jobs/${job.id}`}
      className="relative block rounded-2xl p-5 transition-shadow hover:shadow-md"
      style={{
        backgroundColor: 'var(--color-white)',
        border: '1px solid var(--color-fog)',
      }}
    >
      {/* Match score circle */}
      <div
        className="absolute top-3 right-3 w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
        style={{
          backgroundColor: 'rgba(122,175,63,0.2)',
          color: 'var(--color-meadow)',
          border: '2px solid var(--color-meadow)',
        }}
      >
        {matchScore}%
      </div>

      {/* Badge row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-14">
          <h3
            className="font-display font-semibold text-base leading-snug mb-0.5 truncate"
            style={{ color: 'var(--color-soil)' }}
          >
            {job.title}
          </h3>
          <p className="text-sm truncate" style={{ color: 'var(--color-mid)' }}>
            {farmName}
          </p>
        </div>
        {badge && (
          <span
            className="flex-shrink-0 ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ color: badge.color, backgroundColor: badge.bg }}
          >
            {badge.label}
          </span>
        )}
      </div>

      {/* Tags row */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span
          className="text-[11px] px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: 'var(--color-fog)', color: 'var(--color-mid)' }}
        >
          {region}
        </span>
        <span
          className="text-[11px] px-2 py-0.5 rounded-full font-medium capitalize"
          style={{ backgroundColor: 'var(--color-fog)', color: 'var(--color-mid)' }}
        >
          {job.contract_type}
        </span>
      </div>

      {/* Salary */}
      <p className="text-sm font-semibold" style={{ color: 'var(--color-soil)' }}>
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
          'id, title, region, contract_type, salary_min, salary_max, listing_tier, created_at, shed_type, accommodation, visa_sponsorship, couples_welcome, employer_profiles!inner(farm_name, region, id)'
        )
        .eq('status', 'active')
        .in('listing_tier', ['featured', 'premium'])
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
          'id, title, region, contract_type, salary_min, salary_max, listing_tier, created_at, shed_type, accommodation, visa_sponsorship, couples_welcome, employer_profiles!inner(farm_name, region, id)'
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
    <section className="py-20 px-4" style={{ backgroundColor: 'var(--color-cream)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header row */}
        <div className="flex items-end justify-between mb-10">
          <div>
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-px" style={{ backgroundColor: 'var(--color-meadow)' }} />
              <p
                className="text-xs font-bold tracking-widest uppercase"
                style={{ color: 'var(--color-meadow)' }}
              >
                Live Listings
              </p>
            </div>
            <h2
              className="font-display font-bold text-4xl md:text-5xl"
              style={{ color: 'var(--color-soil)' }}
            >
              Featured{' '}
              <em style={{ color: 'var(--color-moss)', fontStyle: 'italic' }}>Opportunities</em>
            </h2>
          </div>
          <Link
            to="/jobs"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold transition-colors hover:opacity-70"
            style={{ color: 'var(--color-soil)' }}
          >
            View all jobs
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl h-40 animate-pulse"
                style={{ backgroundColor: 'var(--color-fog)' }}
              />
            ))}
          </div>
        ) : featuredJobs.length === 0 ? (
          /* Empty state */
          <div className="flex justify-center">
            <div
              className="rounded-2xl p-10 text-center max-w-sm"
              style={{
                backgroundColor: 'var(--color-white)',
                border: '1px solid var(--color-fog)',
              }}
            >
              <div className="text-4xl mb-4">🌾</div>
              <h3
                className="font-display font-semibold text-lg mb-2"
                style={{ color: 'var(--color-soil)' }}
              >
                Be the first to post a featured job
              </h3>
              <p className="text-sm mb-6" style={{ color: 'var(--color-mid)' }}>
                Get your farm in front of top candidates across New Zealand.
              </p>
              <Link
                to="/signup?role=employer"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: 'var(--color-soil)',
                  color: 'var(--color-cream)',
                }}
              >
                Post a Job
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredJobs.map((job, index) => (
                <JobCard key={job.id} job={job} matchScore={MOCK_MATCH_SCORES[index % MOCK_MATCH_SCORES.length]} />
              ))}
            </div>

            {/* Mobile view all link */}
            <div className="mt-8 text-center sm:hidden">
              <Link
                to="/jobs"
                className="inline-flex items-center gap-1 text-sm font-semibold"
                style={{ color: 'var(--color-soil)' }}
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
