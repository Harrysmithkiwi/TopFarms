/**
 * Phase 17 SRCH-14 + SRCH-15 — Saved searches dashboard list page.
 *
 * Mirrors MyApplications.tsx card-row layout:
 *   - DashboardLayout hideSidebar wrapper
 *   - rounded-[12px] empty state with Link to /jobs
 *   - bg-surface border-[1.5px] border-border rounded-[12px] card rows
 *
 * Introduces the FIRST sonner action-bearing toast in the project:
 *   delete → optimistic hide → 5s undo toast → onAutoClose fires hard DELETE
 *   (sentinel `cancelled` flag flipped by Undo onClick — see RESEARCH §4).
 *
 * Inline rename: click name → controlled Input with Enter (commit) /
 * Escape (revert) / blur (commit). Validation: trim non-empty, ≤100 chars
 * (CHECK constraint in migration 024).
 *
 * RLS: supabase.from('saved_searches') queries are auto-scoped by
 * `auth.uid() = user_id` policy from migration 024 — explicit `.eq('user_id', ...)`
 * on the SELECT is defence-in-depth and matches MyApplications precedent.
 */
import { useEffect, useState, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { SavedSearch } from '@/types/domain'

/**
 * Quick filter summary for list-row chips: top distinctive keys.
 * Returns "No filters" when search_params is empty.
 */
function summarizeFilters(searchParamsStr: string): string {
  const params = new URLSearchParams(searchParamsStr)
  const parts: string[] = []
  const shed = params.getAll('shed_type')
  if (shed.length > 0) parts.push(shed.length === 1 ? shed[0] : `${shed.length} shed types`)
  const region = params.getAll('region')
  if (region.length > 0) parts.push(region.length === 1 ? region[0] : `${region.length} regions`)
  if (params.getAll('accommodation_type').length > 0) parts.push('accommodation')
  if (params.get('visa') === 'true') parts.push('visa')
  if (parts.length === 0) return 'No filters'
  return parts.join(' · ')
}

function SkeletonCard() {
  return (
    <div className="bg-surface border-[1.5px] border-border rounded-[12px] p-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 bg-surface-2 rounded w-1/2" />
        <div className="h-3 bg-surface-2 rounded w-3/4" />
      </div>
    </div>
  )
}

interface SavedSearchRowProps {
  row: SavedSearch
  onLoad: (params: string) => void
  onDelete: (row: SavedSearch) => void
  onRename: (id: string, newName: string) => Promise<void>
}

function SavedSearchRow({ row, onLoad, onDelete, onRename }: SavedSearchRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(row.name)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when entering edit mode
  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  // Sync local draft when row.name changes externally (e.g. parent re-fetch)
  useEffect(() => {
    setDraft(row.name)
  }, [row.name])

  async function commit() {
    const trimmed = draft.trim()
    if (trimmed === row.name) {
      setEditing(false)
      return
    }
    if (trimmed.length === 0 || trimmed.length > 100) {
      toast.error('Name must be 1-100 characters')
      setDraft(row.name)
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onRename(row.id, trimmed)
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  return (
    <div className="bg-surface border-[1.5px] border-border rounded-[12px] p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0 space-y-1">
        {editing ? (
          <Input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commit()
              }
              if (e.key === 'Escape') {
                e.preventDefault()
                setDraft(row.name)
                setEditing(false)
              }
            }}
            disabled={saving}
            aria-label="Edit saved search name"
            maxLength={100}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-left text-[15px] font-body font-semibold hover:underline truncate w-full"
            style={{ color: 'var(--color-text)' }}
            aria-label={`Rename ${row.name}`}
          >
            {row.name}
          </button>
        )}
        <p className="text-[13px] font-body" style={{ color: 'var(--color-text-muted)' }}>
          {summarizeFilters(row.search_params)}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Button variant="primary" size="sm" onClick={() => onLoad(row.search_params)}>
          Load
        </Button>
        <button
          type="button"
          onClick={() => onDelete(row)}
          className="w-9 h-9 flex items-center justify-center rounded-[8px] hover:bg-surface-2 transition-colors"
          aria-label={`Delete ${row.name}`}
        >
          <Trash2 className="w-4 h-4 text-text-muted" />
        </button>
      </div>
    </div>
  )
}

export function SavedSearches() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState<SavedSearch[]>([])
  const [loading, setLoading] = useState(true)
  /** Holds rows soft-deleted client-side; restored on Undo. Keyed by id. */
  const pendingDeletes = useRef<Map<string, SavedSearch>>(new Map())

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('saved_searches')
        .select('id, user_id, name, search_params, created_at, updated_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      if (cancelled) return
      if (error) {
        toast.error('Could not load saved searches')
        setLoading(false)
        return
      }
      setRows((data ?? []) as SavedSearch[])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [session?.user?.id])

  const handleLoad = useCallback(
    (params: string) => {
      navigate(`/jobs?${params}`, { replace: false })
      window.scrollTo({ top: 0 })
    },
    [navigate],
  )

  const handleDelete = useCallback((row: SavedSearch) => {
    // Sentinel — flipped if user clicks Undo within the toast window
    let cancelled = false

    // Optimistic UI: hide row immediately
    setRows((prev) => prev.filter((r) => r.id !== row.id))
    pendingDeletes.current.set(row.id, row)

    toast.success(`"${row.name}" deleted`, {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          cancelled = true
          const restored = pendingDeletes.current.get(row.id)
          pendingDeletes.current.delete(row.id)
          if (restored) {
            setRows((prev) =>
              [restored, ...prev].sort(
                (a, b) =>
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
              ),
            )
          }
        },
      },
      onAutoClose: async () => {
        if (cancelled) return
        pendingDeletes.current.delete(row.id)
        const { error } = await supabase
          .from('saved_searches')
          .delete()
          .eq('id', row.id)
        if (error) {
          toast.error('Could not delete saved search')
          // Restore — DB rejected our optimistic remove
          setRows((prev) =>
            [row, ...prev].sort(
              (a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            ),
          )
        }
      },
    })
  }, [])

  const handleRename = useCallback(async (id: string, newName: string) => {
    const nowIso = new Date().toISOString()
    const { error } = await supabase
      .from('saved_searches')
      .update({ name: newName, updated_at: nowIso })
      .eq('id', id)
    if (error) {
      toast.error('Could not rename saved search')
      return
    }
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, name: newName, updated_at: nowIso } : r)),
    )
  }, [])

  return (
    <DashboardLayout hideSidebar>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h1
            className="font-display text-3xl font-semibold"
            style={{ color: 'var(--color-brand-900)' }}
          >
            Saved searches
          </h1>
          {!loading && rows.length > 0 && (
            <span
              className="px-2.5 py-1 rounded-full text-[12px] font-body font-semibold"
              style={{
                backgroundColor: 'var(--color-border)',
                color: 'var(--color-text-muted)',
              }}
            >
              {rows.length}
            </span>
          )}
        </div>

        {loading && (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div
            className="rounded-[12px] p-12 text-center"
            style={{ backgroundColor: 'var(--color-surface-2)' }}
          >
            <p
              className="text-base font-body font-semibold mb-2"
              style={{ color: 'var(--color-text)' }}
            >
              You haven't saved any searches yet.
            </p>
            <p
              className="text-sm mb-4"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Save your filters on the job search page to come back to them later.
            </p>
            <Link
              to="/jobs"
              className="text-sm font-body font-semibold text-brand hover:underline"
            >
              Browse jobs
            </Link>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="space-y-3">
            {rows.map((row) => (
              <SavedSearchRow
                key={row.id}
                row={row}
                onLoad={handleLoad}
                onDelete={handleDelete}
                onRename={handleRename}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
