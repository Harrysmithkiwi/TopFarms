---
phase: 17-saved-search
plan: 03
type: execute
wave: 3
depends_on:
  - "17-01"
files_modified:
  - src/pages/dashboard/seeker/SavedSearches.tsx
  - src/components/layout/Sidebar.tsx
  - src/main.tsx
  - tests/saved-search-list.test.tsx
autonomous: true
requirements:
  - SRCH-14
  - SRCH-15
must_haves:
  truths:
    - "Logged-in seeker can navigate to /dashboard/seeker/saved-searches and see their saved searches as card-rows mirroring MyApplications"
    - "Empty state copy 'You haven't saved any searches yet' renders with a primary link to /jobs"
    - "Each row has a Load button that calls navigate(`/jobs?<search_params>`, { replace: false })"
    - "Each row has a Delete button that shows a sonner toast with 'Undo' action; row hidden client-side; hard DELETE fires onAutoClose if not cancelled"
    - "Click on row name enters inline edit mode; Enter commits via supabase.update({name, updated_at}); Escape reverts"
    - "Sidebar nav has 'Saved searches' item under existing seeker items"
    - "Route /dashboard/seeker/saved-searches is registered in main.tsx wrapped in <ProtectedRoute requiredRole='seeker'>"
    - "tests/saved-search-list.test.tsx is GREEN"
  artifacts:
    - path: src/pages/dashboard/seeker/SavedSearches.tsx
      provides: "Seeker saved-searches dashboard route — list, load, delete (with undo), inline rename"
      exports:
        - SavedSearches
      min_lines: 150
    - path: src/components/layout/Sidebar.tsx
      provides: "Updated seekerItems array with 'Saved searches' nav entry"
      contains: "/dashboard/seeker/saved-searches"
    - path: src/main.tsx
      provides: "Route registration for /dashboard/seeker/saved-searches wrapped in ProtectedRoute requiredRole='seeker'"
      contains: "/dashboard/seeker/saved-searches"
  key_links:
    - from: "src/pages/dashboard/seeker/SavedSearches.tsx"
      to: "supabase.from('saved_searches').select"
      via: "useEffect on mount with session.user.id"
      pattern: "from\\('saved_searches'\\).select"
    - from: "src/pages/dashboard/seeker/SavedSearches.tsx"
      to: "react-router useNavigate"
      via: "Load button onClick → navigate(`/jobs?${row.search_params}`, { replace: false })"
      pattern: "navigate\\(`/jobs"
    - from: "src/components/layout/Sidebar.tsx"
      to: "src/main.tsx /dashboard/seeker/saved-searches route"
      via: "NavLink to '/dashboard/seeker/saved-searches'"
      pattern: "/dashboard/seeker/saved-searches"
    - from: "src/main.tsx ProtectedRoute requiredRole='seeker'"
      to: "src/pages/dashboard/seeker/SavedSearches.tsx"
      via: "element prop in router config"
      pattern: "<SavedSearches"
---

<objective>
List page wave: build the dashboard route, register it, add the Sidebar nav item, and turn `tests/saved-search-list.test.tsx` GREEN. Mirrors `MyApplications.tsx` card-row layout. Adds inline rename + 5s sonner-undo delete pattern (introduces the FIRST sonner action-bearing toast in the project).

Purpose: Without this wave, SRCH-14 (load) and SRCH-15 (delete) are unsatisfied — the seeker has nowhere to view, load, or delete their saved searches.

Parallelism: This plan and Plan 02 (save flow) both depend on Plan 01 only — they could execute in parallel. They modify disjoint files (Plan 02: JobSearch + 2 new modal components; this plan: SavedSearches + Sidebar + main.tsx). No file conflicts.

Output: 1 new dashboard route + Sidebar nav + main.tsx registration + 1 test file GREEN.
</objective>

<execution_context>
@/Users/harrysmith/.claude/get-shit-done/workflows/execute-plan.md
@/Users/harrysmith/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/17-saved-search/17-CONTEXT.md
@.planning/phases/17-saved-search/17-RESEARCH.md
@.planning/phases/17-saved-search/17-VALIDATION.md
@.planning/phases/17-saved-search/17-01-SUMMARY.md
@CLAUDE.md
@src/pages/dashboard/seeker/MyApplications.tsx
@src/components/layout/Sidebar.tsx
@src/main.tsx
@src/components/ui/Input.tsx
@src/components/ui/Button.tsx
@src/lib/savedSearch.ts
@src/types/domain.ts
@tests/saved-search-list.test.tsx
@tests/admin-employer-list.test.ts

<interfaces>
<!-- Page layout shape (extracted from src/pages/dashboard/seeker/MyApplications.tsx): -->
<!-- - Wrapped in <DashboardLayout hideSidebar> ... </DashboardLayout> -->
<!-- - Two-column flex: main + sidebar (this page can OMIT the right rail since saved searches are simpler — single column is fine) -->
<!-- - Empty state: rounded-[12px] p-12 bg-surface-2; <p font-semibold> + Link to /jobs -->
<!-- - List: space-y-3 of card rows; each card-row uses bg-surface border-[1.5px] border-border rounded-[12px] -->

<!-- Sidebar.tsx existing pattern (lines 25-30): -->
const seekerItems: NavItem[] = [
  { to: '/dashboard/seeker', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/jobs', label: 'Find Jobs', icon: Search },
  { to: '/dashboard/seeker/applications', label: 'My Applications', icon: FileText },
  { to: '/onboarding/seeker', label: 'Edit Profile', icon: User },
]
<!-- Add a new entry. lucide-react Bookmark icon is available; or Star/Heart. Bookmark fits "saved searches" semantically. -->

<!-- main.tsx route registration pattern (lines 163-178): -->
<!-- /dashboard/seeker/applications wrapped in <ProtectedRoute requiredRole="seeker"><MyApplications /></ProtectedRoute> -->
<!-- IMPORTANT: declare /dashboard/seeker/saved-searches BEFORE /dashboard/seeker (matching the existing /applications-before-/seeker ordering rule documented at line 161) -->

<!-- src/lib/savedSearch.ts (Wave 1): -->
export function snapshotFilters(searchParams: URLSearchParams): string

<!-- src/types/domain.ts (Wave 1): -->
export interface SavedSearch { id, user_id, name, search_params, created_at, updated_at }

<!-- sonner Action interface (verified via node_modules/sonner/dist/index.d.ts): -->
toast.success(msg, {
  duration: 5000,                     // ms
  action: { label: 'Undo', onClick: (e) => {...} },
  onAutoClose: (toast) => {...},      // fires when timer expires (NOT when user clicks action)
  onDismiss: (toast) => {...},        // fires when user dismisses or action clicked
})
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create SavedSearches.tsx dashboard route with list/load/delete-undo/rename</name>
  <files>
    src/pages/dashboard/seeker/SavedSearches.tsx
    tests/saved-search-list.test.tsx
  </files>
  <read_first>
    - src/pages/dashboard/seeker/MyApplications.tsx (canonical card-row list, empty state, useEffect data load with session.user.id, DashboardLayout wrap)
    - src/components/ui/Input.tsx (inline rename uses controlled Input with onKeyDown for Enter/Escape)
    - src/components/ui/Button.tsx (variants 'primary' | 'outline' | 'ghost' | 'warn')
    - src/lib/savedSearch.ts (no imports needed for list page itself; load handler simply concatenates row.search_params into URL)
    - src/types/domain.ts (SavedSearch interface)
    - tests/saved-search-list.test.tsx (Wave 0 stubs — 9 .todo to turn GREEN)
    - .planning/phases/17-saved-search/17-RESEARCH.md §4 (sonner undo pattern with cancellation flag), §7 (inline rename pattern with Enter/Escape handlers + useRef focus)
  </read_first>
  <behavior>
    Tests to turn GREEN in tests/saved-search-list.test.tsx:

    - Empty state: render with mocked supabase returning [] → empty-state copy "You haven't saved any searches yet" visible + Link to /jobs visible
    - List render: render with mocked rows → each row shows name + filter chips (or summary text from search_params) + Load + Delete buttons
    - Load: click Load → navigate called with `/jobs?<search_params>`, replace: false
    - Delete shows undo toast: click Delete → toast.success called with action.label === 'Undo' and duration === 5000
    - Cancellation flag: clicking Undo within timer skips the actual DELETE call (verify via supabase mock not called with delete after click)
    - DELETE on auto-close: simulate 5s timer expiry → supabase.from('saved_searches').delete().eq('id', row.id) called once
    - Inline rename enter mode: click on name → Input replaces heading, autofocus
    - Enter commits rename: type new name + Enter → supabase.from('saved_searches').update({ name, updated_at }).eq('id', id) called
    - Escape reverts: type new name + Escape → no update call; original name visible again
  </behavior>
  <action>
**Step 1 — Create `src/pages/dashboard/seeker/SavedSearches.tsx`:**

```tsx
import { useEffect, useState, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router'
import { Trash2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { SavedSearch } from '@/types/domain'

function summarizeFilters(searchParamsStr: string): string {
  // Quick summary for list-row chips: top 3 distinctive keys
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

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  // Sync local draft when row.name changes externally
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
      setRows(((data ?? []) as SavedSearch[]))
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
    // Sentinel — flipped if user clicks Undo
    let cancelled = false

    // Optimistic UI: hide row
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
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
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
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            ),
          )
        }
      },
    })
  }, [])

  const handleRename = useCallback(async (id: string, newName: string) => {
    const { error } = await supabase
      .from('saved_searches')
      .update({ name: newName, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      toast.error('Could not rename saved search')
      return
    }
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, name: newName, updated_at: new Date().toISOString() } : r)),
    )
  }, [])

  return (
    <DashboardLayout hideSidebar>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl font-semibold" style={{ color: 'var(--color-brand-900)' }}>
            Saved searches
          </h1>
          {!loading && rows.length > 0 && (
            <span
              className="px-2.5 py-1 rounded-full text-[12px] font-body font-semibold"
              style={{ backgroundColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
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
          <div className="rounded-[12px] p-12 text-center" style={{ backgroundColor: 'var(--color-surface-2)' }}>
            <p className="text-base font-body font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
              You haven't saved any searches yet.
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
              Save your filters on the job search page to come back to them later.
            </p>
            <Link
              to="/jobs"
              className="inline-flex items-center gap-1.5 text-sm font-body font-semibold text-brand hover:underline"
            >
              <Search className="w-4 h-4" />
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
```

**Step 2 — Replace .todo bodies in `tests/saved-search-list.test.tsx`.** Reference structure:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

const navigateMock = vi.fn()
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router')
  return { ...actual, useNavigate: () => navigateMock, Link: actual.Link }
})

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ session: { user: { id: 'user-123' } }, role: 'seeker', loading: false }),
}))

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: toastMock }))

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: fromMock } }))

import { SavedSearches } from '@/pages/dashboard/seeker/SavedSearches'

const FAKE_ROWS = [
  { id: 'r1', user_id: 'user-123', name: 'Dairy in Waikato', search_params: 'shed_type=rotary&region=Waikato', created_at: '2026-05-04T00:00:00Z', updated_at: '2026-05-04T00:00:00Z' },
  { id: 'r2', user_id: 'user-123', name: 'Sheep & Beef',     search_params: 'role_type=sheep_and_beef',         created_at: '2026-05-03T00:00:00Z', updated_at: '2026-05-03T00:00:00Z' },
]

beforeEach(() => {
  fromMock.mockReset()
  toastMock.success.mockReset()
  toastMock.error.mockReset()
  navigateMock.mockReset()
})

function mockSelectReturning(data: typeof FAKE_ROWS | []) {
  fromMock.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data, error: null }),
      }),
    }),
    delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
  })
}

describe('SavedSearches list page (SRCH-15)', () => {
  it('renders empty-state copy when no saved searches', async () => {
    mockSelectReturning([])
    render(<MemoryRouter><SavedSearches /></MemoryRouter>)
    await waitFor(() =>
      expect(screen.queryByText(/You haven't saved any searches yet/i)).toBeInTheDocument(),
    )
    expect(screen.queryByText(/Browse jobs/i)).toBeInTheDocument()
  })

  it('renders card-row per saved search with name + filter chips + Load + Delete', async () => {
    mockSelectReturning(FAKE_ROWS)
    render(<MemoryRouter><SavedSearches /></MemoryRouter>)
    await waitFor(() => expect(screen.queryByText('Dairy in Waikato')).toBeInTheDocument())
    expect(screen.queryByText('Sheep & Beef')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^load$/i })).toHaveLength(2)
  })

  it('Load button calls navigate("/jobs?<search_params>", { replace: false })', async () => {
    mockSelectReturning(FAKE_ROWS)
    render(<MemoryRouter><SavedSearches /></MemoryRouter>)
    await waitFor(() => screen.queryByText('Dairy in Waikato'))
    fireEvent.click(screen.getAllByRole('button', { name: /^load$/i })[0])
    expect(navigateMock).toHaveBeenCalledWith(
      '/jobs?shed_type=rotary&region=Waikato',
      { replace: false },
    )
  })

  it('Delete button shows sonner toast with Undo action and 5000ms duration', async () => {
    mockSelectReturning(FAKE_ROWS)
    render(<MemoryRouter><SavedSearches /></MemoryRouter>)
    await waitFor(() => screen.queryByText('Dairy in Waikato'))
    fireEvent.click(screen.getAllByRole('button', { name: /^delete dairy in waikato$/i })[0])
    expect(toastMock.success).toHaveBeenCalledWith(
      expect.stringContaining('Dairy in Waikato'),
      expect.objectContaining({
        duration: 5000,
        action: expect.objectContaining({ label: 'Undo' }),
      }),
    )
  })

  // ... (cancellation flag, onAutoClose, rename Enter, rename Escape)
})
```

The executor refines the remaining 5 tests (cancellation flag, onAutoClose calling delete, rename Enter, rename Escape, click on name → input mode) using the same mock harness.

**Step 3 — Run tests.**

```bash
pnpm test -- --run tests/saved-search-list.test.tsx
pnpm tsc --noEmit
```

Expect: 9 passed.
  </action>
  <verify>
    <automated>pnpm test -- --run tests/saved-search-list.test.tsx && pnpm tsc --noEmit</automated>
  </verify>
  <done>
    - src/pages/dashboard/seeker/SavedSearches.tsx exists, exports SavedSearches, ≥150 lines
    - tests/saved-search-list.test.tsx GREEN (9 passing, 0 todos)
    - tsc --noEmit clean
  </done>
  <acceptance_criteria>
    - File src/pages/dashboard/seeker/SavedSearches.tsx exists
    - File contains `export function SavedSearches`
    - File contains `from('saved_searches').select`
    - File contains `from('saved_searches').delete()`
    - File contains `from('saved_searches').update`
    - File contains `navigate(`/jobs?${` (template literal for load)
    - File contains `replace: false`
    - File contains `duration: 5000`
    - File contains `label: 'Undo'`
    - File contains `onAutoClose`
    - File contains `if (e.key === 'Enter')` (rename commit)
    - File contains `if (e.key === 'Escape')` (rename revert)
    - File contains `You haven't saved any searches yet`
    - File imports `useAuth` from '@/hooks/useAuth'
    - File imports `DashboardLayout` from '@/components/layout/DashboardLayout'
    - File imports `Input` from '@/components/ui/Input'
    - File imports `Button` from '@/components/ui/Button'
    - File does NOT import `StatusBanner`
    - File imports type `SavedSearch` from '@/types/domain'
    - `pnpm test -- --run tests/saved-search-list.test.tsx` exits 0 with "9 passed"
    - `grep -c "it.todo" tests/saved-search-list.test.tsx` returns 0
    - `pnpm tsc --noEmit` exits 0
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: Add 'Saved searches' nav item to Sidebar.tsx + register route in main.tsx</name>
  <files>
    src/components/layout/Sidebar.tsx
    src/main.tsx
  </files>
  <read_first>
    - src/components/layout/Sidebar.tsx (full file — 84 lines; seekerItems const at line 25-30 is the insertion target)
    - src/main.tsx (full file — 266 lines; existing seeker dashboard routes at line 163-186; ordering rule documented at line 161 — sub-paths declared BEFORE parent)
    - Phase 20.1-04 SUMMARY.md mentions Sidebar Sign Out structure (mt-auto + LogOut icon) — already applied; do not touch the footer
  </read_first>
  <action>
**Step 1 — Add 'Saved searches' to seekerItems in `src/components/layout/Sidebar.tsx`.**

Use the Edit tool with surrounding context. Insert a new entry between `My Applications` and `Edit Profile` so the order is: Dashboard → Find Jobs → My Applications → Saved searches → Edit Profile (logical: list pages before profile editing).

Add `Bookmark` to the lucide-react import at line 2-8:

```tsx
import {
  LayoutDashboard,
  Search,
  FileText,
  User,
  LogOut,
  Bookmark,
} from 'lucide-react'
```

Update the `seekerItems` const (lines 25-30):

```tsx
const seekerItems: NavItem[] = [
  { to: '/dashboard/seeker', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/jobs', label: 'Find Jobs', icon: Search },
  { to: '/dashboard/seeker/applications', label: 'My Applications', icon: FileText },
  { to: '/dashboard/seeker/saved-searches', label: 'Saved searches', icon: Bookmark },
  { to: '/onboarding/seeker', label: 'Edit Profile', icon: User },
]
```

DO NOT touch `employerItems`, the JSX body, or the Sign Out footer.

**Step 2 — Register the route in `src/main.tsx`.**

2a. Add the import for SavedSearches near existing seeker page imports (around line 29-30):

```tsx
import { SavedSearches } from '@/pages/dashboard/seeker/SavedSearches'
```

2b. Add the route entry. Per the ordering rule documented at line 161 (`/dashboard/seeker/applications MUST be before /dashboard/seeker`), the new sub-path must also come before `/dashboard/seeker`. Insert after the `/dashboard/seeker/applications` block (around line 169) and before `/dashboard/seeker/documents`:

```tsx
  {
    path: '/dashboard/seeker/saved-searches',
    element: (
      <ProtectedRoute requiredRole="seeker">
        <SavedSearches />
      </ProtectedRoute>
    ),
  },
```

DO NOT touch any other route blocks.

**Step 3 — Verify routing + sidebar.**

```bash
pnpm tsc --noEmit
pnpm test -- --run
```

Manual check (executor): start `pnpm dev`, sign in as seeker, click 'Saved searches' in the dashboard sidebar — page should render (empty state visible since DB is empty).
  </action>
  <verify>
    <automated>pnpm tsc --noEmit && pnpm test -- --run</automated>
  </verify>
  <done>
    - src/components/layout/Sidebar.tsx contains 'Saved searches' label and imports Bookmark
    - src/main.tsx imports SavedSearches and registers route /dashboard/seeker/saved-searches before /dashboard/seeker
    - tsc --noEmit clean
    - Full vitest suite still green (no regression)
  </done>
  <acceptance_criteria>
    - `grep -q "Saved searches" src/components/layout/Sidebar.tsx` exits 0
    - `grep -q "/dashboard/seeker/saved-searches" src/components/layout/Sidebar.tsx` exits 0
    - `grep -q "Bookmark" src/components/layout/Sidebar.tsx` exits 0
    - `grep -q "import { SavedSearches }" src/main.tsx` exits 0
    - `grep -q "/dashboard/seeker/saved-searches" src/main.tsx` exits 0
    - `grep -q "<SavedSearches" src/main.tsx` exits 0
    - In src/main.tsx, the line containing `path: '/dashboard/seeker/saved-searches'` appears BEFORE the line containing `path: '/dashboard/seeker',` (verify via `awk '/path: .\/dashboard\/seeker\/saved-searches/{print NR; found=1} /path: .\/dashboard\/seeker.,/ && found{print NR; exit}' src/main.tsx` — first number must be smaller)
    - In src/main.tsx, the route element wraps in `<ProtectedRoute requiredRole="seeker">` (regression: not "admin", not "employer")
    - `pnpm tsc --noEmit` exits 0
    - `pnpm test -- --run` exits 0 (full suite green; no regression)
  </acceptance_criteria>
</task>

</tasks>

<verification>
- Full suite: `pnpm test -- --run` — expect Wave 0 + 1 + 2 + new Wave 3 = ≈ 9 new green for list (28 phase-17 green total); 0 failures; quick-load + load-integration files still red (Wave 4)
- tsc --noEmit clean
- Manual smoke (executor): `pnpm dev` → seeker → /dashboard/seeker → click sidebar 'Saved searches' → empty state visible
- Optional: from /jobs → save a search via Plan 02 → navigate to saved-searches list → row visible
</verification>

<success_criteria>
- /dashboard/seeker/saved-searches route exists, gated by ProtectedRoute requiredRole="seeker"
- Sidebar nav has 'Saved searches' entry between My Applications and Edit Profile
- SavedSearches.tsx renders list, load, delete-with-undo, inline rename mirroring MyApplications pattern
- saved-search-list test file GREEN (3 of 6 saved-search files now GREEN)
- One atomic commit (CLAUDE §4)
</success_criteria>

<output>
After completion, create `.planning/phases/17-saved-search/17-03-SUMMARY.md` covering:
- Files added (1) / modified (2: Sidebar + main.tsx)
- Pattern compliance (MyApplications card-row mirror; first action-bearing sonner toast in project)
- Test count delta (+9 green; 3 of 6 saved-search files now GREEN)
- Manual visual smoke result (empty state OK; if Plan 02 was already shipped, save→load round-trip OK)
</output>
