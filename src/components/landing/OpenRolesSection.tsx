import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { supabase } from '@/lib/supabase'

// v13 open roles (comp section 5). Supersedes FeaturedListings; the DATA PATH
// is ported verbatim (featured tier first, recent fallback, employer join) and
// all three states survive: loading skeletons, empty state, populated rows.
//
// Truth pass 2026-07-09, preserved: NO match scores here. A score needs a
// signed-in seeker to compute against; the comp's sample scores were comp
// devices and do not ship to production (directive 1.15).
//
// Search entry (directive 1.13): SECONDARY entry point, lives here where it
// has inventory to act on, never in the hero. Submits to /jobs?q= (q wired
// into JobSearch in this same stage). Sector names are plain labels, not
// links: a chip row linking into an empty board proves the emptiness (Test 3).

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
  employer_profiles: { farm_name: string; region: string; id: string }
}

const SELECT =
  'id, title, region, contract_type, salary_min, salary_max, listing_tier, created_at, shed_type, accommodation, visa_sponsorship, couples_welcome, employer_profiles:marketplace_employer_profiles!inner(farm_name, region, id)'

function formatSalary(min: number | null, max: number | null): string {
  if (min && max) return `$${(min / 1000).toFixed(0)}k to $${(max / 1000).toFixed(0)}k`
  if (min) return `From $${(min / 1000).toFixed(0)}k`
  if (max) return `To $${(max / 1000).toFixed(0)}k`
  return 'Salary negotiable'
}

// Facts chips from REAL columns only; absent fields render nothing.
function facts(job: FeaturedJob): string[] {
  const out: string[] = []
  if (job.contract_type) out.push(job.contract_type)
  if (job.shed_type) out.push(job.shed_type)
  if (job.accommodation && Object.keys(job.accommodation).length > 0) out.push('accommodation')
  if (job.couples_welcome) out.push('couple-friendly')
  if (job.visa_sponsorship) out.push('visa sponsorship')
  out.push(formatSalary(job.salary_min, job.salary_max))
  return out
}

const SECTORS = ['Dairy', 'Sheep and beef', 'Cropping', 'Machinery', 'Farm ops', 'Management']

export function OpenRolesSection() {
  const [jobs, setJobs] = useState<FeaturedJob[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchJobs() {
      const { data: featuredData } = await supabase
        .from('jobs')
        .select(SELECT)
        .eq('status', 'active')
        // 2=featured, 3=premium; listing_tier is int (HOMEBUG-02: int array, not strings)
        .in('listing_tier', [2, 3])
        .order('created_at', { ascending: false })
        .limit(6)

      if (featuredData && featuredData.length > 0) {
        setJobs(featuredData as unknown as FeaturedJob[])
        setLoading(false)
        return
      }

      const { data: fallbackData } = await supabase
        .from('jobs')
        .select(SELECT)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(3)

      setJobs((fallbackData as unknown as FeaturedJob[]) ?? [])
      setLoading(false)
    }
    fetchJobs()
  }, [])

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = q.trim()
    navigate(trimmed ? `/jobs?q=${encodeURIComponent(trimmed)}` : '/jobs')
  }

  return (
    <section aria-labelledby="roles-h2" className="mx-auto max-w-[1440px] px-3 pt-14 sm:px-5 md:pt-16">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <h2 id="roles-h2" className="text-4xl font-extrabold tracking-[-.04em] md:text-5xl">
          Open <i className="text-green font-normal">roles</i>
        </h2>
        <Link
          to="/jobs"
          className="border-ink hover:bg-ink hover:text-cream inline-flex min-h-11 items-center rounded-full border-[1.5px] px-5 text-[15px] font-semibold transition-colors"
        >
          See all open roles
        </Link>
      </div>

      <div className="bg-card border-line mt-5 rounded-3xl border px-5 pt-5 pb-6 sm:px-8">
        {/* Search: secondary entry point (1.13). Visible label, no placeholder-as-label. */}
        <form onSubmit={submit} role="search" className="border-line flex flex-wrap items-end gap-3 border-b pb-5">
          <div className="min-w-0 flex-1 basis-60">
            <label htmlFor="roles-q" className="text-ink-60 mb-1.5 block text-[13px] font-semibold">
              Search open roles
            </label>
            <input
              id="roles-q"
              name="q"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="border-line bg-cream text-ink w-full rounded-full border px-4 py-2.5 text-[15px]"
            />
          </div>
          <button
            type="submit"
            className="bg-green hover:bg-green-2 inline-flex min-h-11 cursor-pointer items-center rounded-full px-5 text-[15px] font-semibold text-white transition-colors"
          >
            Search
          </button>
        </form>

        {/* Sector labels: breadth, not navigation (Test 3) */}
        <div className="text-ink-40 mt-4 flex flex-wrap gap-x-3.5 gap-y-1 text-[12.5px] font-medium">
          {SECTORS.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>

        {loading ? (
          <div className="mt-4" aria-label="Loading open roles" role="status">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-cream-2 mt-2.5 h-[72px] animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-9 text-center">
            <h3 className="text-lg font-bold tracking-[-.02em]">No open roles listed right now.</h3>
            <p className="text-ink-60 mx-auto mt-1.5 max-w-[44ch] text-sm">
              Post the first one and it will be listed and match-scored. First listing free.
            </p>
            <Link
              to="/signup?role=employer"
              className="bg-green hover:bg-green-2 mt-5 inline-flex min-h-11 items-center rounded-full px-5 text-[15px] font-semibold text-white transition-colors"
            >
              I'm hiring
            </Link>
          </div>
        ) : (
          <div>
            {jobs.map((job) => (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className="border-line hover:bg-cream grid items-center gap-2 rounded-2xl border-b px-3.5 py-4 transition-colors last:border-b-0 md:grid-cols-[.8fr_2fr_auto] md:gap-6"
              >
                <div>
                  <h3 className="text-[18px] font-bold tracking-[-.02em]">{job.title}</h3>
                  <p className="text-ink-40 mt-0.5 text-[13px] font-medium">
                    {job.employer_profiles?.farm_name ?? 'Farm'}
                    {' · '}
                    {job.employer_profiles?.region ?? job.region}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {facts(job).map((f) => (
                    <span
                      key={f}
                      className="bg-cream-2 text-ink-60 rounded-full px-2.5 py-1 text-[12.5px] font-medium whitespace-nowrap capitalize"
                    >
                      {f}
                    </span>
                  ))}
                </div>
                <span className="text-green text-[15px] font-semibold md:text-right" aria-hidden="true">
                  &#8599;
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
