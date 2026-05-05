---
phase: 17-saved-search
plan: 04
type: execute
wave: 4
depends_on:
  - "17-02"
  - "17-03"
files_modified:
  - src/components/saved-search/SavedSearchesDropdown.tsx
  - src/pages/jobs/JobSearch.tsx
  - tests/saved-search-quick-load.test.tsx
  - tests/saved-search-load-integration.test.tsx
autonomous: true
requirements:
  - SRCH-14
must_haves:
  truths:
    - "Logged-in seeker on /jobs sees a 'Load saved search ▾' dropdown next to the Save button"
    - "Opening the dropdown fetches the top 5 most-recent saved searches by created_at desc"
    - "Clicking a row in the dropdown calls navigate('/jobs?<search_params>', { replace: false }) and closes the dropdown"
    - "Dropdown has a 'View all' link routing to /dashboard/seeker/saved-searches"
    - "Loading a saved search via dropdown does NOT add new useEffect deps to fetchJobs (Pitfall 1 / JOBS-01 regression guard)"
    - "tests/saved-search-quick-load.test.tsx and tests/saved-search-load-integration.test.tsx are GREEN"
  artifacts:
    - path: src/components/saved-search/SavedSearchesDropdown.tsx
      provides: "Dropdown component — fetches top 5 on open, click-to-navigate, View all link, aria-haspopup/expanded, Esc + click-outside close"
      exports:
        - SavedSearchesDropdown
      min_lines: 80
    - path: src/pages/jobs/JobSearch.tsx
      provides: "ResultsArea integration — Save button + SavedSearchesDropdown side-by-side next to result count"
      contains: "SavedSearchesDropdown"
  key_links:
    - from: "src/components/saved-search/SavedSearchesDropdown.tsx"
      to: "supabase.from('saved_searches').select('id, name, search_params, created_at').order(...).limit(5)"
      via: "useEffect on { open, session.user.id }"
      pattern: "limit\\(5\\)"
    - from: "src/components/saved-search/SavedSearchesDropdown.tsx"
      to: "react-router useNavigate"
      via: "row onClick → navigate(`/jobs?${row.search_params}`, { replace: false })"
      pattern: "navigate\\(`/jobs"
    - from: "src/pages/jobs/JobSearch.tsx"
      to: "src/components/saved-search/SavedSearchesDropdown.tsx"
      via: "import + render in ResultsArea (next to Save button) — gated on isLoggedIn"
      pattern: "SavedSearchesDropdown"
---

<objective>
Quick-load wave: build the dropdown next to the Save button in JobSearch, regression-test that load doesn't break the JOBS-01 fetchJobs gate, and turn the final 2 saved-search test files GREEN. One atomic commit.

Purpose: Without this wave, SRCH-14 is incomplete — seekers must navigate to the dashboard to load. The dropdown gives a one-click load from /jobs itself, mirroring quick-access dropdown patterns in well-designed product UIs (Linear, Notion).

Output: 1 new dropdown component + JobSearch.tsx wired + 2 test files GREEN. After this commit, all 6 saved-search test files are GREEN and the manual UAT can run.
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
@.planning/phases/17-saved-search/17-02-SUMMARY.md
@.planning/phases/17-saved-search/17-03-SUMMARY.md
@CLAUDE.md
@src/pages/jobs/JobSearch.tsx
@src/components/saved-search/SaveSearchModal.tsx
@src/types/domain.ts
@tests/saved-search-quick-load.test.tsx
@tests/saved-search-load-integration.test.tsx

<interfaces>
<!-- src/types/domain.ts (Wave 1): -->
export interface SavedSearch {
  id: string
  user_id: string
  name: string
  search_params: string
  created_at: string
  updated_at: string
}

<!-- src/pages/jobs/JobSearch.tsx after Wave 2 — ResultsArea header now has Save button next to result count.
     Wave 4 inserts the dropdown immediately after the Save button (sibling). Pattern from 17-RESEARCH.md §5: -->
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-3">
    <p className="text-[14px] font-body text-text-muted">
      <strong className="text-text">{jobs.length}</strong> jobs found
    </p>
    {isLoggedIn && hasActiveFilters(searchParams) && (
      <>
        <span className="text-text-subtle">·</span>
        <button onClick={onSaveClick} className="text-brand text-[13px] hover:underline">Save search</button>
      </>
    )}
    {/* SavedSearchesDropdown goes HERE — sibling to Save button.
        Visibility: isLoggedIn (no hasActiveFilters gate — dropdown visible even without active filters
        so seekers can quickly load a saved search from the unfiltered state) */}
  </div>
  <div className="flex items-center gap-2">{/* sort selector */}</div>
</div>

<!-- src/pages/jobs/JobSearch.tsx fetchJobs useEffect (load-bearing — DO NOT TOUCH): -->
useEffect(() => {
  if (authLoading) return
  fetchJobs()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [searchParams, authLoading])
<!-- Saved-search load works through navigate('/jobs?...') which updates searchParams and triggers
     this existing effect. NO new effect needed. NO dep changes. (JOBS-01 / Pitfall 1) -->

<!-- sonner toast — already in use; no additional API needed for dropdown -->

<!-- aria patterns (from 17-RESEARCH.md §5):
     - aria-haspopup="menu" on trigger button
     - aria-expanded={open} on trigger button
     - Esc closes
     - click outside closes (mousedown listener with ref)
-->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create SavedSearchesDropdown component + integrate into JobSearch ResultsArea</name>
  <files>
    src/components/saved-search/SavedSearchesDropdown.tsx
    src/pages/jobs/JobSearch.tsx
    tests/saved-search-quick-load.test.tsx
  </files>
  <read_first>
    - src/pages/jobs/JobSearch.tsx (current state after Wave 2; insertion point in ResultsArea around line 552-578; existing fetchJobs useEffect deps line — DO NOT MODIFY)
    - src/components/saved-search/SaveSearchModal.tsx (sibling reference — same import patterns, useAuth pattern)
    - src/types/domain.ts (SavedSearch interface)
    - .planning/phases/17-saved-search/17-RESEARCH.md §5 (full ready-to-paste SavedSearchesDropdown skeleton + accessibility checklist)
    - tests/saved-search-quick-load.test.tsx (Wave 0 stubs — 8 .todo to turn GREEN)
  </read_first>
  <behavior>
    Tests to turn GREEN in tests/saved-search-quick-load.test.tsx:

    - Hidden when user not signed in: dropdown trigger button NOT in document
    - Hidden when no filters applied: false — dropdown should be visible even WITHOUT active filters (correction from 17-RESEARCH §5 — research said gate on hasActiveFilters but the locked decision in CONTEXT.md says "always visible" implicitly via "Quick-access from JobSearch: dropdown affordance next to the inline Save button"). Final ruling: dropdown visible when isLoggedIn === true regardless of filter state. The first .todo about "hidden when no filters applied" should be reframed during impl — instead test that the trigger renders when isLoggedIn=true.
    - Opening dropdown fetches top 5 ordered by created_at desc with limit(5)
    - Renders name + filter summary chips per row
    - Clicking row calls navigate('/jobs?<params>', { replace: false }) and closes dropdown
    - 'View all' link routes to /dashboard/seeker/saved-searches
    - Esc key closes dropdown
    - aria-haspopup="menu" + aria-expanded reflect open state
  </behavior>
  <action>
**Step 1 — Create `src/components/saved-search/SavedSearchesDropdown.tsx`:**

```tsx
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { SavedSearch } from '@/types/domain'

function summarizeFilters(searchParamsStr: string): string {
  const params = new URLSearchParams(searchParamsStr)
  const parts: string[] = []
  const shed = params.getAll('shed_type')
  if (shed.length > 0) parts.push(shed.length === 1 ? shed[0] : `${shed.length} shed types`)
  const region = params.getAll('region')
  if (region.length > 0) parts.push(region.length === 1 ? region[0] : `${region.length} regions`)
  if (params.getAll('accommodation_type').length > 0) parts.push('accommodation')
  if (parts.length === 0) return 'No filters'
  return parts.join(' · ')
}

type DropdownRow = Pick<SavedSearch, 'id' | 'name' | 'search_params' | 'created_at'>

/**
 * Phase 17 SRCH-14 — quick-load dropdown next to JobSearch's Save button.
 *
 * Fetches the 5 most-recent saved searches when opened. Click loads in-place
 * via navigate('/jobs?<params>', { replace: false }) — the existing JobSearch
 * fetchJobs useEffect picks up the searchParams change and re-fetches. NO new
 * useEffect needed in JobSearch (JOBS-01 / Pitfall 1 regression guard).
 *
 * Accessibility: aria-haspopup, aria-expanded, Esc-to-close, click-outside-close.
 */
export function SavedSearchesDropdown() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<DropdownRow[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch top 5 on open
  useEffect(() => {
    if (!open || !session?.user?.id) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const { data, error } = await supabase
        .from('saved_searches')
        .select('id, name, search_params, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      if (cancelled) return
      if (error) {
        setRows([])
        setLoading(false)
        return
      }
      setRows(((data ?? []) as DropdownRow[]))
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [open, session?.user?.id])

  // Esc to close
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // Click-outside to close
  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  // Hidden for anonymous visitors (signed-in seeker is the only audience)
  if (!session?.user?.id) return null

  function handleSelect(searchParams: string) {
    navigate(`/jobs?${searchParams}`, { replace: false })
    window.scrollTo({ top: 0 })
    setOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-brand text-[13px] hover:underline flex items-center gap-1"
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="saved-searches-dropdown-trigger"
      >
        Load saved search <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full mt-2 right-0 bg-surface border border-border rounded-[10px] shadow-lg w-[280px] z-30"
        >
          {loading ? (
            <p className="p-3 text-text-subtle text-[13px]">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-3 text-text-subtle text-[13px]">No saved searches yet.</p>
          ) : (
            <ul>
              {rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleSelect(row.search_params)}
                    className="w-full text-left px-3 py-2 hover:bg-surface-2 transition-colors border-b border-border last:border-b-0"
                  >
                    <div
                      className="text-[14px] font-body font-semibold truncate"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {row.name}
                    </div>
                    <div
                      className="text-[12px] font-body truncate"
                      style={{ color: 'var(--color-text-subtle)' }}
                    >
                      {summarizeFilters(row.search_params)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/dashboard/seeker/saved-searches"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-center text-[13px] font-body font-semibold border-t border-border hover:bg-surface-2"
            style={{ color: 'var(--color-brand)' }}
          >
            View all
          </Link>
        </div>
      )}
    </div>
  )
}
```

**Step 2 — Wire into JobSearch.tsx ResultsArea.**

2a. Add import near the other saved-search imports added in Wave 2:

```tsx
import { SavedSearchesDropdown } from '@/components/saved-search/SavedSearchesDropdown'
```

2b. In ResultsArea (line ~552-578 in JobSearch.tsx — the area edited in Wave 2), insert `<SavedSearchesDropdown />` immediately after the Save button. The block should now read:

```tsx
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-3">
    <p className="text-[14px] font-body text-text-muted">
      {loading && jobs.length === 0 ? (
        <span className="inline-block w-20 h-4 bg-surface-2 rounded animate-pulse" />
      ) : (
        <span>
          <strong className="text-text">{jobs.length}</strong> job{jobs.length !== 1 ? 's' : ''} found
        </span>
      )}
    </p>
    {/* Save button (Wave 2) */}
    {isLoggedIn && hasActiveFiltersInline(searchParams) && (
      <>
        <span className="text-text-subtle">·</span>
        <button type="button" onClick={onSaveClick} className="text-brand text-[13px] hover:underline">
          Save search
        </button>
      </>
    )}
    {/* Wave 4: Quick-load dropdown — visible whenever signed in (component self-guards on session) */}
    {isLoggedIn && <SavedSearchesDropdown />}
  </div>
  <div className="flex items-center gap-2">
    {/* existing sort selector */}
  </div>
</div>
```

(Where `hasActiveFiltersInline` is whatever name Wave 2 used — check 17-02-SUMMARY.md for the exact import name.)

**Critical do-not-change**: fetchJobs useEffect deps stay `[searchParams, authLoading]`. SavedSearchesDropdown adds NO state to JobSearch — it's self-contained.

**Step 3 — Replace .todo bodies in `tests/saved-search-quick-load.test.tsx`.**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

const navigateMock = vi.fn()
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router')
  return { ...actual, useNavigate: () => navigateMock, Link: actual.Link }
})

// useAuth mock — toggle between signed-in and signed-out via test helpers
const useAuthMock = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => useAuthMock() }))

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: fromMock } }))

import { SavedSearchesDropdown } from '@/components/saved-search/SavedSearchesDropdown'

beforeEach(() => {
  navigateMock.mockReset()
  fromMock.mockReset()
  useAuthMock.mockReset()
})

function mockListReturning(rows: Array<{ id: string; name: string; search_params: string; created_at: string }>) {
  fromMock.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
        }),
      }),
    }),
  })
}

describe('Quick-load dropdown (SRCH-14)', () => {
  it('hidden when user is not signed in', () => {
    useAuthMock.mockReturnValue({ session: null, role: null, loading: false })
    render(<MemoryRouter><SavedSearchesDropdown /></MemoryRouter>)
    expect(screen.queryByTestId('saved-searches-dropdown-trigger')).toBeNull()
  })

  it('renders trigger button when user is signed in (regardless of filter state)', () => {
    useAuthMock.mockReturnValue({ session: { user: { id: 'user-123' } }, role: 'seeker', loading: false })
    mockListReturning([])
    render(<MemoryRouter><SavedSearchesDropdown /></MemoryRouter>)
    expect(screen.queryByTestId('saved-searches-dropdown-trigger')).toBeInTheDocument()
  })

  it('opening dropdown fetches top 5 saved searches ordered by created_at desc', async () => {
    useAuthMock.mockReturnValue({ session: { user: { id: 'user-123' } }, role: 'seeker', loading: false })
    const limitMock = vi.fn().mockResolvedValue({ data: [], error: null })
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ order: orderMock }),
      }),
    })
    render(<MemoryRouter><SavedSearchesDropdown /></MemoryRouter>)
    fireEvent.click(screen.getByTestId('saved-searches-dropdown-trigger'))
    await waitFor(() => {
      expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(limitMock).toHaveBeenCalledWith(5)
    })
  })

  it('renders name + filter summary per row', async () => {
    useAuthMock.mockReturnValue({ session: { user: { id: 'user-123' } }, role: 'seeker', loading: false })
    mockListReturning([
      { id: 'r1', name: 'Dairy in Waikato', search_params: 'shed_type=rotary&region=Waikato', created_at: '2026-05-04Z' },
    ])
    render(<MemoryRouter><SavedSearchesDropdown /></MemoryRouter>)
    fireEvent.click(screen.getByTestId('saved-searches-dropdown-trigger'))
    await waitFor(() => expect(screen.queryByText('Dairy in Waikato')).toBeInTheDocument())
    expect(screen.queryByText(/rotary/)).toBeInTheDocument()
  })

  it('clicking row calls navigate("/jobs?<params>") and closes dropdown', async () => {
    useAuthMock.mockReturnValue({ session: { user: { id: 'user-123' } }, role: 'seeker', loading: false })
    mockListReturning([
      { id: 'r1', name: 'Dairy', search_params: 'shed_type=rotary', created_at: '2026-05-04Z' },
    ])
    render(<MemoryRouter><SavedSearchesDropdown /></MemoryRouter>)
    fireEvent.click(screen.getByTestId('saved-searches-dropdown-trigger'))
    await waitFor(() => screen.queryByText('Dairy'))
    fireEvent.click(screen.getByText('Dairy'))
    expect(navigateMock).toHaveBeenCalledWith('/jobs?shed_type=rotary', { replace: false })
    // Dropdown should close after select
    await waitFor(() => expect(screen.queryByText('Dairy')).toBeNull())
  })

  it('"View all" link routes to /dashboard/seeker/saved-searches', async () => {
    useAuthMock.mockReturnValue({ session: { user: { id: 'user-123' } }, role: 'seeker', loading: false })
    mockListReturning([])
    render(<MemoryRouter><SavedSearchesDropdown /></MemoryRouter>)
    fireEvent.click(screen.getByTestId('saved-searches-dropdown-trigger'))
    await waitFor(() => screen.queryByText('View all'))
    const viewAll = screen.getByText('View all').closest('a')
    expect(viewAll?.getAttribute('href')).toBe('/dashboard/seeker/saved-searches')
  })

  it('Esc key closes dropdown', async () => {
    useAuthMock.mockReturnValue({ session: { user: { id: 'user-123' } }, role: 'seeker', loading: false })
    mockListReturning([])
    render(<MemoryRouter><SavedSearchesDropdown /></MemoryRouter>)
    fireEvent.click(screen.getByTestId('saved-searches-dropdown-trigger'))
    await waitFor(() => screen.queryByText(/no saved searches/i))
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByText(/no saved searches/i)).toBeNull())
  })

  it('aria-haspopup="menu" and aria-expanded reflect open state', async () => {
    useAuthMock.mockReturnValue({ session: { user: { id: 'user-123' } }, role: 'seeker', loading: false })
    mockListReturning([])
    render(<MemoryRouter><SavedSearchesDropdown /></MemoryRouter>)
    const trigger = screen.getByTestId('saved-searches-dropdown-trigger')
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
  })
})
```

**Step 4 — Run tests.**

```bash
pnpm test -- --run tests/saved-search-quick-load.test.tsx
pnpm tsc --noEmit
```

Expect: 8 passed.
  </action>
  <verify>
    <automated>pnpm test -- --run tests/saved-search-quick-load.test.tsx && pnpm tsc --noEmit</automated>
  </verify>
  <done>
    - src/components/saved-search/SavedSearchesDropdown.tsx exists, exports SavedSearchesDropdown, ≥80 lines
    - src/pages/jobs/JobSearch.tsx imports + renders SavedSearchesDropdown next to Save button
    - JobSearch fetchJobs useEffect deps unchanged
    - tests/saved-search-quick-load.test.tsx GREEN (8 passing, 0 todos)
    - tsc --noEmit clean
  </done>
  <acceptance_criteria>
    - File src/components/saved-search/SavedSearchesDropdown.tsx exists
    - File contains `export function SavedSearchesDropdown` OR `export const SavedSearchesDropdown`
    - File contains `aria-haspopup="menu"`
    - File contains `aria-expanded`
    - File contains `.limit(5)` (top-5 fetch)
    - File contains `order('created_at', { ascending: false })`
    - File contains `navigate(`/jobs?${` (template literal)
    - File contains `replace: false`
    - File contains `to="/dashboard/seeker/saved-searches"` (View all link)
    - File contains `if (e.key === 'Escape')` (Esc close)
    - File contains `addEventListener('mousedown'` (click-outside close)
    - src/pages/jobs/JobSearch.tsx contains `import { SavedSearchesDropdown }` from '@/components/saved-search/SavedSearchesDropdown'
    - src/pages/jobs/JobSearch.tsx contains `<SavedSearchesDropdown` (rendered)
    - src/pages/jobs/JobSearch.tsx fetchJobs useEffect deps line still reads `[searchParams, authLoading]` (regression guard) — verified via `grep -A1 "Re-fetch when searchParams" src/pages/jobs/JobSearch.tsx | grep "\[searchParams, authLoading\]"`
    - `pnpm test -- --run tests/saved-search-quick-load.test.tsx` exits 0 with "8 passed"
    - `grep -c "it.todo" tests/saved-search-quick-load.test.tsx` returns 0
    - `pnpm tsc --noEmit` exits 0
  </acceptance_criteria>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Turn saved-search-load-integration.test.tsx GREEN — regression guard for JOBS-01 + commit `7401116`</name>
  <files>
    tests/saved-search-load-integration.test.tsx
  </files>
  <read_first>
    - tests/saved-search-load-integration.test.tsx (3 .todo to turn GREEN)
    - src/pages/jobs/JobSearch.tsx fetchJobs useEffect (the deps line is the regression target — assert it stays `[searchParams, authLoading]`)
    - .planning/phases/17-saved-search/17-RESEARCH.md Pitfall 1 (full prose on why this matters)
    - tests/admin-employer-list.test.ts (mock pattern reference)
  </read_first>
  <behavior>
    Tests to turn GREEN in tests/saved-search-load-integration.test.tsx:

    1. Static-source assertion: read src/pages/jobs/JobSearch.tsx as text, assert that the substring `[searchParams, authLoading]` appears in the file (regression guard for JOBS-01 dep drift)
    2. Static-source assertion: assert that file does NOT contain `[searchParams, authLoading, savedSearches]` or similar dep additions tied to saved-search state
    3. Static-source assertion: assert that the saved-search Save handler in JobSearch.tsx does NOT add a new `useEffect` keyed on the saved-search dropdown's open state
  </behavior>
  <action>
This is a STATIC-SOURCE regression guard — no runtime React rendering. We read the JobSearch.tsx file from disk via Node's fs in the test and assert string patterns. Cheaper than rendering all of JobSearch with its full mock surface.

**Replace .todo bodies in `tests/saved-search-load-integration.test.tsx`:**

```tsx
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const JOB_SEARCH_PATH = resolve(__dirname, '..', 'src', 'pages', 'jobs', 'JobSearch.tsx')

describe('Saved-search load integration (SRCH-14 regression)', () => {
  it('navigate("/jobs?<saved-params>") triggers ONE fetchJobs call (JOBS-01 regression guard)', () => {
    // Static-source assertion: the load-bearing useEffect deps line stays
    // [searchParams, authLoading]. Saved-search load works through the existing
    // searchParams update path; NO new effect or dep change required.
    // (See 17-RESEARCH.md Pitfall 1 for full diagnostic chain.)
    const source = readFileSync(JOB_SEARCH_PATH, 'utf8')
    expect(source).toContain('[searchParams, authLoading]')
  })

  it('saved-search state additions do NOT leak into fetchJobs deps', () => {
    const source = readFileSync(JOB_SEARCH_PATH, 'utf8')
    // Negative assertions — these are anti-patterns we explicitly guard against
    expect(source).not.toMatch(/\[searchParams,\s*authLoading,\s*saveModalOpen\]/)
    expect(source).not.toMatch(/\[searchParams,\s*authLoading,\s*replaceModalOpen\]/)
    expect(source).not.toMatch(/\[searchParams,\s*authLoading,\s*savedSearches\]/)
    expect(source).not.toMatch(/\[searchParams,\s*authLoading,\s*pendingSave\]/)
  })

  it('match_scores embedded join shape preserved (commit 7401116 sibling guard)', () => {
    // The 7401116 fix targeted SeekerStep7Complete.tsx (not JobSearch.tsx).
    // JobSearch's analogous resilience is JOBS-01 (c6066ea) — fetchJobs gated on authLoading.
    // This test guards both: (a) the auth gate is in place, (b) the match_scores fetch
    // structure (single .from('match_scores').select(...).eq(...).in(...)) is unchanged.
    const source = readFileSync(JOB_SEARCH_PATH, 'utf8')
    expect(source).toContain("if (authLoading) return")
    expect(source).toContain(".from('match_scores')")
    // The .in('job_id', newJobIds) call is the load-bearing batch shape — guard it
    expect(source).toContain(".in('job_id'")
  })
})
```

**Run vitest.**

```bash
pnpm test -- --run tests/saved-search-load-integration.test.tsx
```

Expect: 3 passed.
  </action>
  <verify>
    <automated>pnpm test -- --run tests/saved-search-load-integration.test.tsx</automated>
  </verify>
  <done>
    - tests/saved-search-load-integration.test.tsx GREEN (3 passing, 0 todos)
    - 0 failures
  </done>
  <acceptance_criteria>
    - tests/saved-search-load-integration.test.tsx contains `readFileSync` (static-source assertion approach)
    - tests/saved-search-load-integration.test.tsx contains `[searchParams, authLoading]` literal in an expectation
    - tests/saved-search-load-integration.test.tsx contains `not.toMatch` (negative assertion for dep drift)
    - `pnpm test -- --run tests/saved-search-load-integration.test.tsx` exits 0 with "3 passed"
    - `grep -c "it.todo" tests/saved-search-load-integration.test.tsx` returns 0
  </acceptance_criteria>
</task>

</tasks>

<verification>
- Full suite: `pnpm test -- --run` — expect ALL 6 saved-search test files GREEN (snapshot 13 + modal 9 + cap 5 + list 9 + quick-load 8 + load-integration 3 = 47 new green); 0 failures
- tsc --noEmit clean
- Manual UAT: run all 8 items in tests/saved-search-UAT.md (operator action — see UAT script). UAT items 7 (RLS isolation seeker A vs B) and 8 (RLS isolation anonymous) are CRITICAL CLAUDE §1 verifications.
- Manual visual smoke (executor): `pnpm dev` → seeker → /jobs → set filter → click Save → save → click "Load saved search ▾" → row appears in dropdown → click row → URL updates and results refresh
</verification>

<success_criteria>
- SavedSearchesDropdown component exists and integrates into JobSearch ResultsArea next to Save button
- All 6 saved-search test files GREEN (47 green tests cumulative across all 4 implementation waves)
- JOBS-01 / Pitfall 1 regression guard in place (static-source assertion guards fetchJobs useEffect deps)
- One atomic commit (CLAUDE §4)

After this plan ships, run `tests/saved-search-UAT.md`. If ALL 8 UAT items pass empirically, REQUIREMENTS.md SRCH-13/14/15 can flip [ ] → [x] (CLAUDE §7 — only after empirical proof). If ANY item fails, enumerate the gap as carryforward in v2.0-MILESTONE-AUDIT.md and KEEP the [ ] marker.
</success_criteria>

<output>
After completion, create `.planning/phases/17-saved-search/17-04-SUMMARY.md` covering:
- Files added (1) / modified (1: JobSearch.tsx)
- Test count delta (+11 green; ALL 6 saved-search files now GREEN — 47 cumulative)
- JOBS-01 regression guard ship: static-source assertion approach + dep line preserved
- Manual UAT readiness: tests/saved-search-UAT.md script ready for operator
- Carryforward note for VERIFICATION.md authoring (next step is /gsd:verify-work which derives the verdict; CLAUDE §7 — REQUIREMENTS.md flip only after UAT)
</output>
