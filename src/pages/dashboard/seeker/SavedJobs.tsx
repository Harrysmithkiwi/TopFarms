/**
 * Saved jobs list — /dashboard/seeker/saved.
 *
 * Jobs could be SAVED from search and detail pages since Phase 9, but there
 * was nowhere to see them: the only list lived in the MyApplications sidebar,
 * which phones never render. This page makes the bookmark half of the
 * discover → save → apply loop real.
 *
 * Layout and interaction mirror SavedSearches.tsx deliberately (same
 * DashboardLayout wrapper, same card rows, same optimistic delete with a 5s
 * undo toast) — the two surfaces sit behind the same "Saved" nav item and
 * must feel like one place. SavedTabs links between them.
 *
 * RLS note: `jobs` joins through the public read policy, which only exposes
 * live listings. A saved job that has since been filled or expired comes back
 * with `jobs: null` — rendered honestly as no longer available rather than
 * silently dropped, so the seeker learns the fate of a job they were
 * watching instead of wondering where it went.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { SavedTabs } from '@/components/ui/SavedTabs'
import { Tag } from '@/components/ui/Tag'
import { ErrorState } from '@/components/ui/ErrorState'
import { supabase } from '@/lib/supabase'
import { reportError } from '@/lib/observability'
import { useAuth } from '@/hooks/useAuth'
import type { JobStatus } from '@/types/domain'

interface SavedJobRow {
  job_id: string
  created_at: string
  jobs: {
    id: string
    title: string
    region: string
    status: JobStatus
    contract_type: string
    employer_profiles: { farm_name: string } | null
  } | null
}

function SkeletonCard() {
  return (
    <div className="bg-surface border-border animate-pulse rounded-12 border-[1.5px] p-4">
      <div className="space-y-2">
        <div className="bg-surface-2 h-4 w-1/2 rounded" />
        <div className="bg-surface-2 h-3 w-3/4 rounded" />
      </div>
    </div>
  )
}

function savedDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
}

export function SavedJobs() {
  const { session } = useAuth()

  const [rows, setRows] = useState<SavedJobRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadNonce, setReloadNonce] = useState(0)

  useEffect(() => {
    const userId = session?.user?.id
    async function load() {
      setLoadError(false)
      if (!userId) {
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('saved_jobs')
        .select(
          'job_id, created_at, jobs(id, title, region, status, contract_type, employer_profiles:marketplace_employer_profiles(farm_name))',
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        reportError('saved jobs: load', error)
        setLoadError(true)
        setLoading(false)
        return
      }
      setRows((data ?? []) as unknown as SavedJobRow[])
      setLoading(false)
    }
    load()
  }, [session?.user?.id, reloadNonce])

  // Delete-first with an undo that re-inserts. The commit-on-onAutoClose
  // pattern (SavedSearches' original) silently loses the delete whenever the
  // toast ends any way other than timing out — manual close, another toast
  // pushing it past sonner's visible cap, a refresh — leaving a row the UI
  // says is gone alive in the DB.
  const handleRemove = useCallback(
    async (row: SavedJobRow) => {
      const userId = session?.user?.id
      if (!userId) return
      setRows((prev) => prev.filter((r) => r.job_id !== row.job_id))

      const restore = () =>
        setRows((prev) =>
          [row, ...prev].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          ),
        )

      const { error } = await supabase
        .from('saved_jobs')
        .delete()
        .eq('user_id', userId)
        .eq('job_id', row.job_id)
      if (error) {
        toast.error('Could not remove saved job')
        restore()
        return
      }

      toast.success(`"${row.jobs?.title ?? 'Saved job'}" removed`, {
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: async () => {
            const { error: undoError } = await supabase
              .from('saved_jobs')
              .insert({ user_id: userId, job_id: row.job_id })
            if (undoError) {
              toast.error('Could not restore saved job')
              return
            }
            restore()
          },
        },
      })
    },
    [session?.user?.id],
  )

  return (
    <DashboardLayout hideSidebar>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-brand-900 text-[36px] leading-[44px] font-medium">
            Saved jobs
          </h1>
          {!loadError && !loading && rows.length > 0 && (
            <span className="font-body bg-surface-2 text-text-muted rounded-full px-2.5 py-1 text-xs font-semibold">
              {rows.length}
            </span>
          )}
        </div>

        <SavedTabs />

        {loadError && (
          <ErrorState
            message="We could not load your saved jobs"
            onRetry={() => {
              setLoadError(false)
              setReloadNonce((n) => n + 1)
            }}
          />
        )}

        {!loadError && loading && (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {!loadError && !loading && rows.length === 0 && (
          <div className="bg-surface-2 rounded-12 p-12 text-center">
            <p className="font-body text-text mb-2 text-base font-semibold">
              You haven't saved any jobs yet.
            </p>
            <p className="text-text-muted mb-4 text-sm">
              Tap the bookmark on any job to keep it here and come back to it later.
            </p>
            <Link
              to="/jobs"
              className="font-body text-brand-hover text-sm font-semibold hover:underline"
            >
              Find work
            </Link>
          </div>
        )}

        {!loadError && !loading && rows.length > 0 && (
          <ul className="space-y-3">
            {rows.map((row) => {
              const job = row.jobs
              const gone = !job || job.status !== 'active'
              return (
                <li
                  key={row.job_id}
                  className="bg-surface border-border rounded-12 border-[1.5px] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {job ? (
                        <Link
                          to={`/jobs/${job.id}`}
                          className="font-body text-text hover:text-brand-hover text-base font-semibold"
                        >
                          {job.title}
                        </Link>
                      ) : (
                        <p className="font-body text-text-muted text-base font-semibold">
                          This listing has been removed
                        </p>
                      )}
                      <p className="text-text-muted mt-0.5 text-label">
                        {job
                          ? [job.employer_profiles?.farm_name, job.region]
                              .filter(Boolean)
                              .join(' · ')
                          : 'The employer has taken this job down.'}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {gone && job && <Tag variant="grey">No longer live</Tag>}
                        <span className="text-text-subtle text-xs">
                          Saved {savedDateLabel(row.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      {job && !gone && (
                        <Link
                          to={`/jobs/${job.id}`}
                          className="font-body bg-brand-hover hover:bg-brand-900 text-text-on-brand inline-flex min-h-9 items-center justify-center rounded-8 px-3 text-[13px] font-semibold transition-colors"
                        >
                          View job
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemove(row)}
                        className="text-text-muted hover:bg-surface-2 hover:text-danger-text-on-bg inline-flex h-9 w-9 items-center justify-center rounded-8 transition-colors"
                        aria-label={`Remove ${job?.title ?? 'saved job'} from saved jobs`}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </DashboardLayout>
  )
}
