import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router'
import * as Dialog from '@radix-ui/react-dialog'
import { SlidersHorizontal, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { FilterSidebar } from '@/components/ui/FilterSidebar'
import { SearchJobCard } from '@/components/ui/SearchJobCard'
import { Button } from '@/components/ui/Button'
import type { JobListing, MatchScore, EmployerVerification, TrustLevel } from '@/types/domain'

// ─── Types ────────────────────────────────────────────────────────────────────

type JobWithEmployer = JobListing & {
  employer_profiles: { farm_name: string; region: string; id: string }
}

type BatchScoreRow = {
  job_id: string
  total_score: number
  breakdown: MatchScore['breakdown']
}

type EmployerVerificationMap = {
  verifications: EmployerVerification[]
  trustLevel: TrustLevel
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12
const SALARY_MIN_BOUND = 30000
const SALARY_MAX_BOUND = 120000

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeTrustLevel(verifications: EmployerVerification[]): TrustLevel {
  const verified = verifications.filter((v) => v.status === 'verified').map((v) => v.method)
  if (verified.length === 0) return 'unverified'
  const hasEmail = verified.includes('email')
  const hasPhone = verified.includes('phone')
  const hasBusinessOrDoc = verified.includes('nzbn') || verified.includes('document')
  const hasPhoto = verified.includes('farm_photo')
  if (hasEmail && hasPhone && hasBusinessOrDoc && hasPhoto) return 'fully_verified'
  if (hasEmail && hasPhone) return 'verified'
  if (hasEmail) return 'basic'
  return 'unverified'
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white border border-fog rounded-[12px] p-4 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-fog rounded w-3/5" />
          <div className="h-3 bg-fog rounded w-2/5" />
          <div className="flex gap-2 mt-2">
            <div className="h-5 bg-fog rounded-full w-16" />
            <div className="h-5 bg-fog rounded-full w-20" />
          </div>
          <div className="h-3 bg-fog rounded w-1/4 mt-2" />
        </div>
        <div className="w-[50px] h-[50px] rounded-full bg-fog flex-shrink-0" />
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function JobSearch() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { session, role } = useAuth()

  const [jobs, setJobs] = useState<JobWithEmployer[]>([])
  const [scores, setScores] = useState<Map<string, MatchScore>>(new Map())
  const [employerVerifications, setEmployerVerifications] = useState<
    Map<string, EmployerVerificationMap>
  >(new Map())
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // ─── Filter change handler ──────────────────────────────────────────────────
  const handleFilterChange = useCallback(
    (key: string, value: string | string[] | null) => {
      setPage(0)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)

          // Special case: atomic salary update
          if (key === '__salary__' && Array.isArray(value)) {
            const [min, max] = value
            if (Number(min) === SALARY_MIN_BOUND) {
              next.delete('salary_min')
            } else {
              next.set('salary_min', min)
            }
            if (Number(max) === SALARY_MAX_BOUND) {
              next.delete('salary_max')
            } else {
              next.set('salary_max', max)
            }
            return next
          }

          if (value === null || (Array.isArray(value) && value.length === 0)) {
            next.delete(key)
          } else if (Array.isArray(value)) {
            next.delete(key)
            value.forEach((v) => next.append(key, v))
          } else {
            next.set(key, value)
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  // ─── Data fetching ──────────────────────────────────────────────────────────
  const fetchJobs = useCallback(
    async (pageNum: number) => {
      setLoading(true)
      try {
        const from = pageNum * PAGE_SIZE
        const to = from + PAGE_SIZE - 1

        let query = supabase
          .from('jobs')
          .select('*, employer_profiles(id, farm_name, region)')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .range(from, to)

        // Apply filters from URL params
        const shedTypes = searchParams.getAll('shed_type')
        if (shedTypes.length > 0) {
          query = query.overlaps('shed_type', shedTypes)
        }

        const regions = searchParams.getAll('region')
        if (regions.length === 1) {
          query = query.eq('region', regions[0])
        } else if (regions.length > 1) {
          query = query.in('region', regions)
        }

        const contractTypes = searchParams.getAll('contract_type')
        if (contractTypes.length === 1) {
          query = query.eq('contract_type', contractTypes[0])
        } else if (contractTypes.length > 1) {
          query = query.in('contract_type', contractTypes)
        }

        const salaryMin = searchParams.get('salary_min')
        if (salaryMin) {
          // Job's salary_max must be >= seeker's minimum
          query = query.gte('salary_max', Number(salaryMin))
        }

        const salaryMax = searchParams.get('salary_max')
        if (salaryMax) {
          // Job's salary_min must be <= seeker's maximum
          query = query.lte('salary_min', Number(salaryMax))
        }

        const herdSizes = searchParams.getAll('herd_size')
        if (herdSizes.length > 0) {
          // Convert buckets to herd size range filters using .or()
          const conditions = herdSizes
            .map((bucket) => {
              if (bucket === '<200') return 'herd_size_min.lte.200'
              if (bucket === '200-500') return 'herd_size_min.lte.500,herd_size_max.gte.200'
              if (bucket === '500-1000') return 'herd_size_min.lte.1000,herd_size_max.gte.500'
              if (bucket === '1000+') return 'herd_size_max.gte.1000'
              return null
            })
            .filter(Boolean)
          if (conditions.length > 0) {
            query = query.or(conditions.join(','))
          }
        }

        const accommodation = searchParams.get('accommodation')
        if (accommodation === 'true') {
          query = query.contains('accommodation', { available: true })
        }

        const couples = searchParams.get('couples')
        if (couples === 'true') {
          query = query.eq('couples_welcome', true)
        }

        const visa = searchParams.get('visa')
        if (visa === 'true') {
          query = query.eq('visa_sponsorship', true)
        }

        const { data, error } = await query

        if (error) {
          console.error('JobSearch: query error', error)
          return
        }

        const fetchedJobs = (data ?? []) as JobWithEmployer[]
        setHasMore(fetchedJobs.length === PAGE_SIZE)

        // Append or replace
        const allJobs = pageNum === 0 ? fetchedJobs : [...jobs, ...fetchedJobs]

        // Fetch match scores for logged-in seekers
        if (session?.user && role === 'seeker' && fetchedJobs.length > 0) {
          const { data: profileData } = await supabase
            .from('seeker_profiles')
            .select('id')
            .eq('user_id', session.user.id)
            .single()

          if (profileData?.id) {
            const newJobIds = fetchedJobs.map((j) => j.id)
            const { data: scoreData } = await supabase
              .from('match_scores')
              .select('job_id, total_score, breakdown')
              .eq('seeker_id', profileData.id)
              .in('job_id', newJobIds)

            const newScores = new Map(scores)
            ;(scoreData as BatchScoreRow[] | null)?.forEach((row) => {
              newScores.set(row.job_id, {
                total_score: row.total_score,
                breakdown: row.breakdown,
              })
            })
            setScores(newScores)

            // Sort with match scores: best first, then by recency
            allJobs.sort((a, b) => {
              const scoreA = newScores.get(a.id)?.total_score ?? -1
              const scoreB = newScores.get(b.id)?.total_score ?? -1
              if (scoreB !== scoreA) return scoreB - scoreA
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            })
          }
        }

        // Fetch employer verifications for all jobs
        const employerIds = [...new Set(fetchedJobs.map((j) => j.employer_profiles?.id).filter(Boolean))]
        if (employerIds.length > 0) {
          const { data: verificationData } = await supabase
            .from('employer_verifications')
            .select('*')
            .in('employer_id', employerIds)

          const newVerificationMap = new Map(employerVerifications)
          employerIds.forEach((empId) => {
            const empVerifications = (verificationData ?? []).filter(
              (v: EmployerVerification) => v.employer_id === empId,
            )
            newVerificationMap.set(empId, {
              verifications: empVerifications,
              trustLevel: computeTrustLevel(empVerifications),
            })
          })
          setEmployerVerifications(newVerificationMap)
        }

        setJobs(allJobs)
      } finally {
        setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams, session, role],
  )

  // Re-fetch when searchParams change
  useEffect(() => {
    fetchJobs(0)
    setPage(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  function handleLoadMore() {
    const nextPage = page + 1
    setPage(nextPage)
    fetchJobs(nextPage)
  }

  const sortParam = searchParams.get('sort') ?? 'match'

  return (
    <div className="min-h-screen bg-mist">
      <div className="max-w-[1200px] mx-auto px-4 py-6">

        {/* Mobile: sticky header with filter icon */}
        <div className="md:hidden flex items-center justify-between mb-4 sticky top-0 bg-mist z-10 py-2">
          <h1 className="text-[18px] font-display font-bold text-soil">Find Farm Jobs</h1>
          <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-2 border border-fog rounded-[8px] bg-white text-[13px] font-body text-mid hover:border-mid transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </button>
            </Dialog.Trigger>

            {/* Mobile bottom drawer */}
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
              <Dialog.Content
                className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[16px] max-h-[85vh] flex flex-col overflow-hidden"
                aria-describedby={undefined}
              >
                <Dialog.Title className="sr-only">Job Filters</Dialog.Title>
                <FilterSidebar
                  searchParams={searchParams}
                  onFilterChange={handleFilterChange}
                  resultCount={jobs.length}
                  onClose={() => setDrawerOpen(false)}
                  isMobile={true}
                />
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>

        {/* Desktop: two-column grid */}
        <div className="hidden md:grid grid-cols-[280px_1fr] gap-6">
          {/* Sidebar */}
          <aside>
            <FilterSidebar
              searchParams={searchParams}
              onFilterChange={handleFilterChange}
              resultCount={jobs.length}
            />
          </aside>

          {/* Results */}
          <main>
            <ResultsArea
              jobs={jobs}
              scores={scores}
              employerVerifications={employerVerifications}
              loading={loading}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
              sortParam={sortParam}
              onSortChange={(sort) => handleFilterChange('sort', sort)}
            />
          </main>
        </div>

        {/* Mobile: full-width results */}
        <div className="md:hidden">
          <ResultsArea
            jobs={jobs}
            scores={scores}
            employerVerifications={employerVerifications}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            sortParam={sortParam}
            onSortChange={(sort) => handleFilterChange('sort', sort)}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Results Area Sub-component ───────────────────────────────────────────────

interface ResultsAreaProps {
  jobs: JobWithEmployer[]
  scores: Map<string, MatchScore>
  employerVerifications: Map<string, EmployerVerificationMap>
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
  sortParam: string
  onSortChange: (sort: string) => void
}

function ResultsArea({
  jobs,
  scores,
  employerVerifications,
  loading,
  hasMore,
  onLoadMore,
  sortParam,
  onSortChange,
}: ResultsAreaProps) {
  return (
    <div>
      {/* Header: count + sort */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[14px] font-body text-mid">
          {loading && jobs.length === 0 ? (
            <span className="inline-block w-20 h-4 bg-fog rounded animate-pulse" />
          ) : (
            <span>
              <strong className="text-ink">{jobs.length}</strong> job{jobs.length !== 1 ? 's' : ''} found
            </span>
          )}
        </p>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-body text-light">Sort:</span>
          <select
            value={sortParam}
            onChange={(e) => onSortChange(e.target.value)}
            className="text-[12px] font-body text-ink border border-fog rounded-[6px] px-2 py-1 bg-white focus:outline-none focus:border-moss cursor-pointer"
          >
            <option value="match">Match Score</option>
            <option value="recent">Most Recent</option>
          </select>
        </div>
      </div>

      {/* Loading state */}
      {loading && jobs.length === 0 && (
        <div className="flex flex-col gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Empty state */}
      {!loading && jobs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-[72px] h-[72px] rounded-full bg-fog flex items-center justify-center mb-4">
            <X className="w-8 h-8 text-light" />
          </div>
          <h3 className="text-[17px] font-body font-semibold text-ink mb-2">
            No jobs match your filters
          </h3>
          <p className="text-[14px] font-body text-mid max-w-[280px]">
            Try adjusting your filters to see more results
          </p>
        </div>
      )}

      {/* Job cards */}
      {jobs.length > 0 && (
        <div className="flex flex-col gap-3">
          {jobs.map((job) => {
            const empData = employerVerifications.get(job.employer_profiles?.id)
            return (
              <SearchJobCard
                key={job.id}
                job={job}
                matchScore={scores.get(job.id) ?? null}
                verifications={empData?.verifications ?? []}
                trustLevel={empData?.trustLevel ?? 'unverified'}
              />
            )
          })}
        </div>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <div className="flex justify-center mt-6">
          <Button variant="outline" size="md" onClick={onLoadMore}>
            Load more jobs
          </Button>
        </div>
      )}

      {/* Loading more indicator */}
      {loading && jobs.length > 0 && (
        <div className="flex justify-center mt-6">
          <div className="w-6 h-6 border-2 border-moss border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
