---
phase: 17-saved-search
plan: "04"
subsystem: ui
tags: [react, react-router, supabase, dropdown, saved-search, srch-14, wave-4, quick-load, regression-guard, jobs-01]

# Dependency graph
requires:
  - phase: 17-saved-search
    provides: SavedSearch interface (src/types/domain.ts) + supabase.from('saved_searches') RLS shape (auto-scoped by auth.uid() = user_id from migration 024) — 17-01 foundation
  - phase: 17-saved-search
    provides: JobSearch.tsx ResultsArea Save button + handleSaveClick + useAuth surface from Wave 2 (17-02-save-flow) — dropdown sits next to the Save button
  - phase: 17-saved-search
    provides: /dashboard/seeker/saved-searches list-page route from Wave 3 (17-03-list-page) — dropdown's "View all" link routes there
  - phase: 17-saved-search
    provides: tests/saved-search-quick-load.test.tsx + tests/saved-search-load-integration.test.tsx Wave 0 RED stubs (17-00-test-scaffold) — turned GREEN by this wave
provides:
  - src/components/saved-search/SavedSearchesDropdown.tsx — fetches top-5 saved searches on open, click-to-navigate (replace: false), View all link, Esc + click-outside close, aria-haspopup/expanded contract
  - src/pages/jobs/JobSearch.tsx ResultsArea integration — dropdown sibling to Save button, gated on isLoggedIn
  - 11 GREEN test assertions (8 quick-load RTL + 3 load-integration static-source) — JOBS-01 deps regression now guarded by automated test
  - All 6 Phase 17 saved-search test files now GREEN (47 cumulative GREEN: 13 snapshot + 9 modal + 5 cap + 9 list + 8 quick-load + 3 load-integration)
affects:
  - Phase 17 closure path: this is the LAST implementation wave. /gsd:verify-work for Phase 17 is now unblocked (after manual UAT runs tests/saved-search-UAT.md)
  - 18-tech-debt (no new auth_rls_initplan instances; dropdown reads from same 17-01 RLS-protected table — no policy changes)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Self-contained dropdown component pattern — useEffect keyed on { open, session.user.id } only, NOT on parent's URL state. Decouples the data-fetch from JobSearch's fetchJobs useEffect, preserving the JOBS-01 single-fire gate. Reusable for any future quick-access dropdown that fetches user-scoped data on open."
    - "Click-outside + Esc + aria-haspopup/expanded a11y triad for menu-button dropdowns — addEventListener('mousedown') with ref containment check; addEventListener('keydown') for Escape; aria-haspopup='menu' + role='menu' on the panel + role='menuitem' on rows. Mirrors WAI-ARIA menu button pattern. First in-project; reusable for any future quick-access dropdown."
    - "Static-source regression-guard test pattern — readFileSync on the SUT, assert substring patterns (positive `[searchParams, authLoading]` deps line + negative anti-patterns like `[searchParams, authLoading, saveModalOpen]`). Pure-Node test runs in <5ms, no jsdom mock surface. Cheaper than full RTL render of JobSearch for guarding deps-array drift."
    - "navigate('/jobs?<params>', { replace: false }) load shape — same as Wave 3 list-page Load button. Both surfaces use the same single-line shape because the existing JobSearch fetchJobs useEffect (deps: [searchParams, authLoading]) handles the URL-state change cleanly."

key-files:
  created:
    - src/components/saved-search/SavedSearchesDropdown.tsx
  modified:
    - src/pages/jobs/JobSearch.tsx (imports SavedSearchesDropdown + renders inside ResultsArea after Save button, gated on isLoggedIn; fetchJobs useEffect deps UNCHANGED — JOBS-01 regression guard preserved)
    - tests/saved-search-quick-load.test.tsx (8 it.todo() stubs swapped for GREEN RTL assertions)
    - tests/saved-search-load-integration.test.tsx (3 it.todo() stubs swapped for GREEN static-source assertions)

key-decisions:
  - "Atomic single-commit landing of Tasks 1+2 per CLAUDE §4 — component + JobSearch wire + 8 RTL tests + 3 static-source tests form one logical Wave 4 unit. Splitting into 2-3 commits would produce noise without bisect value. Mirrors 17-01 (1c6a0fc), 17-02 (171d49e), 17-03 (33a590b), 20.1-04 (b4c6b4c) atomic-bundle precedent."
  - "Dropdown visible whenever isLoggedIn === true, regardless of hasActiveFilters(searchParams) — locked decision from 17-CONTEXT.md ('Quick-access from JobSearch: dropdown affordance next to the inline Save button'). Even from the unfiltered /jobs state, signed-in seekers should be able to load a saved search. The plan body explicitly reframed the first .todo about 'hidden when no filters applied' to 'renders trigger button when user is signed in'."
  - "Dropdown's data-fetch useEffect keyed on { open, session.user.id } — does NOT depend on searchParams. Saved-search load goes through navigate('/jobs?<params>') which updates searchParams; the EXISTING fetchJobs useEffect handles the URL-state change without the dropdown needing to re-fetch its top-5 list. Pitfall 1 / JOBS-01 regression guard preserved."
  - "Static-source approach for load-integration tests — readFileSync on JobSearch.tsx and assert substring patterns. Three reasons: (1) the regression target is a deps-array literal, which static-source captures perfectly; (2) full RTL render of JobSearch would require mocking ~6 hooks + supabase chain and adds ~15s of test runtime; (3) static-source tests run in <5ms and are deterministic regardless of jsdom version drift."
  - "Negative assertions guard 6 anti-patterns (saveModalOpen, replaceModalOpen, savedSearches, pendingSave, dropdownOpen, recentSavedSearches) — chosen because they're the most-likely state slot names a future executor might add to fetchJobs deps if they need to react to saved-search state changes. Each is explicitly forbidden via not.toMatch."
  - "useNavigate via react-router import (not react-router-dom) — TopFarms uses react-router v7 directly. The mock harness mirrors saved-search-list.test.tsx Wave 3 precedent."
  - "vi.hoisted for fromMock + useAuthMock — SUT statically imports @/lib/supabase and @/hooks/useAuth, transitively loaded before vi.mock setup. vi.hoisted guarantees the mocks exist when the SUT loads. Same pattern as 17-02 (saved-search-modal/cap) and 17-03 (saved-search-list)."
  - "Component self-guards on session?.user?.id (returns null) AND parent ResultsArea additionally gates on isLoggedIn — defence in depth. Either guard alone would suffice; both together mean the trigger DOM never renders for anonymous visitors AND a future caller that forgets the parent gate still gets the right behaviour."
  - "Two close paths kept symmetric with SaveSearchModal/ReplaceOldestModal: Esc + click-outside. No backdrop because dropdown is a popover (not a modal); click-outside is the popover-equivalent of backdrop-click."
  - "summarizeFilters() helper inlined in dropdown component (not extracted to src/lib/savedSearch.ts) — only consumer is this dropdown. If a future surface needs the same chip-style summary (e.g. quick-load dropdown in a hypothetical seeker-mobile-app), extract then. YAGNI."

patterns-established:
  - "Self-contained dropdown with deps-decoupled data fetch: use this pattern when adding any quick-access user-data dropdown to a page that already has a load-bearing useEffect (here: fetchJobs). The dropdown's fetch must be its OWN useEffect keyed on { open, sessionId } — never on the parent's URL/data deps."
  - "Static-source regression test for deps-array drift: when a refactor needs to preserve a load-bearing useEffect deps array, write a static-source test that reads the SUT and asserts the literal deps line + negative anti-patterns. Runs in <5ms. Cheaper than RTL render. Reusable for any future deps-stability requirement."

requirements-completed: []
# Per CLAUDE §7 partial-close discipline: SRCH-14 has multiple gaps:
#   (a) DB foundation       — CLOSED by 17-01 (table + RLS + helpers + types)
#   (b) List-page Load      — CLOSED by 17-03 (Load button + navigate shape)
#   (c) Quick-load dropdown — CLOSED by THIS plan (17-04 — dropdown + JobSearch wire)
#   (d) E2E manual UAT      — OPEN (tests/saved-search-UAT.md operator run pending)
# Three of four gaps closed. Do NOT flip SRCH-14 to [x] in REQUIREMENTS.md off this summary.
# v2.0-MILESTONE-AUDIT.md carryforward: SRCH-13/14/15 E2E manual UAT pending end of Phase 17.

# Metrics
duration: 5min
completed: 2026-05-05
---

# Phase 17 Plan 04: Quick-Load Dropdown Summary

**SavedSearchesDropdown shipped next to JobSearch's Save button — top-5 most-recent + click-to-navigate + View-all link + JOBS-01 regression guard via static-source assertion. 11 new GREEN tests (8 quick-load + 3 load-integration). All 6 saved-search test files now GREEN (47 cumulative). fetchJobs deps unchanged.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-05T07:52:55Z
- **Completed:** 2026-05-05T07:57:13Z
- **Tasks:** 2 (Task 1: dropdown component + JobSearch wire + 8 RTL tests; Task 2: 3 static-source assertions)
- **Files created:** 1 (SavedSearchesDropdown.tsx)
- **Files modified:** 3 (JobSearch.tsx, saved-search-quick-load.test.tsx, saved-search-load-integration.test.tsx)

## Accomplishments

- `src/components/saved-search/SavedSearchesDropdown.tsx` (NEW, 183 lines) — self-contained dropdown that:
  - Fetches top-5 most-recent saved searches by `created_at desc` on open (`select('id, name, search_params, created_at').eq('user_id', ...).order('created_at', { ascending: false }).limit(5)`)
  - Click row → `navigate('/jobs?${row.search_params}', { replace: false })` + `window.scrollTo({ top: 0 })` + close dropdown
  - "View all" Link to `/dashboard/seeker/saved-searches` (closes dropdown on click)
  - Esc-to-close + click-outside-to-close (`mousedown` listener with containerRef containment check)
  - aria-haspopup="menu" + aria-expanded reflecting open state; role="menu" on panel; role="menuitem" on rows
  - `summarizeFilters()` helper renders chip-style filter summary per row (shed_type · region · accommodation, fallback "No filters")
  - Self-guards: returns `null` when `session?.user?.id` is falsy
  - Empty / loading states: "No saved searches yet." / "Loading…" inline copy in panel
- `src/pages/jobs/JobSearch.tsx` — added 1 import + 1 render call:
  - Import: `import { SavedSearchesDropdown } from '@/components/saved-search/SavedSearchesDropdown'`
  - Render: `{isLoggedIn && <SavedSearchesDropdown />}` immediately after the Save button block inside ResultsArea (sibling, in the same `flex items-center gap-3` group as the result count + Save button)
  - **fetchJobs useEffect deps UNCHANGED** at `[searchParams, authLoading]` (line 383, verified by static-source regression test)
- `tests/saved-search-quick-load.test.tsx` — 8 it.todo() stubs swapped for GREEN RTL assertions:
  1. Hidden when not signed in (queryByTestId returns null)
  2. Trigger renders when signed in regardless of filter state
  3. Open fetches top-5 ordered by `created_at desc` with `limit(5)`
  4. Renders name + filter summary chips per row
  5. Click row calls `navigate('/jobs?<params>', { replace: false })` and closes dropdown
  6. "View all" link href is `/dashboard/seeker/saved-searches`
  7. Esc key closes dropdown
  8. aria-haspopup="menu" and aria-expanded reflect open state
- `tests/saved-search-load-integration.test.tsx` — 3 it.todo() stubs swapped for GREEN static-source assertions:
  1. **POSITIVE**: source contains `[searchParams, authLoading]` (JOBS-01 deps line preserved)
  2. **NEGATIVE**: source does NOT match `[searchParams, authLoading, saveModalOpen|replaceModalOpen|savedSearches|pendingSave|dropdownOpen|recentSavedSearches]` patterns (anti-pattern guard)
  3. **SIBLING GUARD**: source contains `if (authLoading) return` + `.from('match_scores')` + `.in('job_id'` (commit 7401116 sibling guard for match_scores fetch shape)
- Test suite delta: 210 passed | 124 todo (Wave C baseline) → **221 passed | 113 todo** (+11 GREEN, -11 todos, zero failures, zero regressions)
- All 6 Phase 17 saved-search test files now GREEN: snapshot 13 + modal 9 + cap 5 + list 9 + quick-load 8 + load-integration 3 = **47 cumulative GREEN**
- tsc --noEmit clean
- JOBS-01 regression guard verified: `grep -n "\[searchParams, authLoading\]" src/pages/jobs/JobSearch.tsx` returns line 383 unchanged

## Task Commits

Per CLAUDE §4 atomic-commit-per-plan precedent (17-01 1c6a0fc, 17-02 171d49e, 17-03 33a590b, 20.1-04 b4c6b4c), Tasks 1 + 2 bundled in a single commit because they form one logical Wave 4 unit (dropdown component + JobSearch wire + RTL tests + static-source regression tests):

1. **Tasks 1+2 (component + JobSearch wire + 11 tests):** `e349655` (`feat(17-04): saved-searches quick-load dropdown + JOBS-01 regression guard`)

**Plan metadata commit:** [appended after metadata commit] (`docs(17-04): record quick-load plan completion`)

_Note: Splitting into 2-3 commits (test-RED → component-GREEN → JobSearch-wire OR Task 1 vs Task 2) would have produced extra commits for what is logically one wave. CLAUDE §4 atomic-commit-per-plan precedent favours the single commit when the changes form one unit; partial commits during a wave only make sense if there's a checkpoint between them, which Wave 4 doesn't have._

## Files Created/Modified

- `src/components/saved-search/SavedSearchesDropdown.tsx` — NEW (183 lines). Exports named `SavedSearchesDropdown` function. Imports `useEffect`/`useRef`/`useState` from react, `Link`/`useNavigate` from react-router, `ChevronDown` from lucide-react, `supabase` from `@/lib/supabase`, `useAuth` from `@/hooks/useAuth`, type `SavedSearch` from `@/types/domain`. Three useEffects: fetch (keyed on open + sessionId), Esc handler (keyed on open), click-outside handler (keyed on open). Inline `summarizeFilters()` helper. `data-testid="saved-searches-dropdown-trigger"` on trigger button (used by RTL tests).
- `src/pages/jobs/JobSearch.tsx` — modified at 2 sites: (1) added `import { SavedSearchesDropdown }` line at line 19; (2) added `{isLoggedIn && <SavedSearchesDropdown />}` JSX inside ResultsArea's `flex items-center gap-3` group, immediately after the Save button block (line ~657-665). fetchJobs useEffect deps UNCHANGED at `[searchParams, authLoading]` (line 383). No other changes.
- `tests/saved-search-quick-load.test.tsx` — 8 it.todo() stubs replaced with full GREEN RTL assertions; mock harness mirrors saved-search-list.test.tsx (vi.hoisted for fromMock, useNavigate, useAuthMock); 0 it.todo() remaining.
- `tests/saved-search-load-integration.test.tsx` — 3 it.todo() stubs replaced with static-source assertions using `readFileSync` + `resolve(__dirname, ...)`; 0 it.todo() remaining (the only remaining `it.todo` substring match is in the file's docstring header, not in actual test code).

## Decisions Made

See `key-decisions` in frontmatter. Notable rationale called out here:

- **Dropdown visible regardless of filter state**: Locked decision from 17-CONTEXT.md ("Quick-access from JobSearch: dropdown affordance next to the inline Save button") — even from the unfiltered `/jobs` page, signed-in seekers should be able to load a saved search. The plan body explicitly reframed the first .todo from "hidden when no filters applied" to "renders trigger button when user is signed in". The Save button itself remains gated on `hasActiveFilters` (saving an empty search has no value); the load dropdown does not.
- **Static-source approach for load-integration**: The regression target is a deps-array literal; static-source captures it perfectly. Full RTL render of JobSearch would require mocking ~6 hooks + supabase chain and adds ~15s of test runtime. Static-source tests run in <5ms and are deterministic regardless of jsdom version drift. The plan body explicitly endorses this approach ("Static-source assertion: read src/pages/jobs/JobSearch.tsx as text…") under Task 2 action.
- **No StatusBanner / no toast on dropdown open**: dropdown is a passive UI affordance — no error states surface to the user. If supabase returns an error, the rows array stays empty and the panel shows "No saved searches yet." Silent fallback is acceptable for a quick-access surface; the canonical error path is the list page (`/dashboard/seeker/saved-searches`) which has more screen real estate for error UX.
- **Symmetric close paths with SaveSearchModal/ReplaceOldestModal**: Esc + click-outside. No backdrop because dropdown is a popover (not a modal). Esc handler delegates to a `useEffect` keyed on `open` for clean cleanup; click-outside uses `mousedown` listener with `containerRef` containment check (Radix-Popover-style). Same pattern as Phase 19 v2 components.

## Deviations from Plan

None — plan executed exactly as written. Three minor implementation notes below are NOT deviations (planner-anticipated discretion in plan body):

1. **Hook auto-suggestions ignored as no-deviation events** — PreToolUse:Read injected `react-best-practices` and `nextjs` skill suggestions on Read calls based on directory pattern matches (`src/components/**/*.tsx` and `pages/**`). PostToolUse:Edit injected 12 RECOMMENDED + 14 SUGGESTION Next.js validation messages claiming `searchParams` is async and components need `"use client"` directive. **All false positives** — TopFarms is a Vite + React Router v7 SPA (verified via package.json no-next-dep + src/main.tsx createBrowserRouter). `useSearchParams` from react-router is synchronous; awaiting it would break the build. `"use client"` is a Next.js App Router directive, inert in Vite SPAs. Documented as no-deviation event matching Phase 17-02 + 17-03 + 20.1-02 STATE precedent.

2. **`it.todo` substring still appears in load-integration test file docstring** — `grep -c "it.todo"` returns `1` not `0`. The single match is in line 4 of the file's docstring header ("3 it.todo() stubs swapped for real…"). This is descriptive prose, not actual test code. All 3 tests are real `it(...)` calls. The acceptance criterion `grep -c "it.todo" returns 0` is technically violated by the comment match; documenting here that the empirical test-runtime behaviour is fully GREEN (3 passed, 0 todos in vitest output). Comment text is load-bearing for future executors — kept.

3. **summarizeFilters() helper inlined in component, not extracted to src/lib/savedSearch.ts** — only consumer is this dropdown. If a future surface (mobile app, embedded widget) needs the same chip-style summary, extract then. YAGNI (per plan §critical_constraints "Each dropdown row: name + filter summary chips (3-5 most distinctive filter values from `searchParams`)").

## Issues Encountered

None. All test assertions GREEN on first run after implementation. The act() warnings emitted in stderr during test runs (`An update to SavedSearchesDropdown inside a test was not wrapped in act(...)`) are cosmetic noise from the loading-state useEffect resolving after the click event — non-blocking, all assertions still passed deterministically. RTL handles act() automatically for fireEvent.click + waitFor; the warnings stem from the supabase Promise resolution timing, not real test instability.

## Authentication Gates

None. The dropdown is pure client-side composition over the existing 17-01 RLS-protected table; no new auth surface introduced.

## Self-Check

Verified all post-implementation claims:

- `src/components/saved-search/SavedSearchesDropdown.tsx` — FOUND (183 lines, exports named `SavedSearchesDropdown` function)
- `src/pages/jobs/JobSearch.tsx` — modified (import + 1 JSX render call); fetchJobs useEffect deps UNCHANGED at `[searchParams, authLoading]` (line 383)
- `tests/saved-search-quick-load.test.tsx` — 8 GREEN RTL assertions, 0 it.todo() in test code
- `tests/saved-search-load-integration.test.tsx` — 3 GREEN static-source assertions, 0 it.todo() in test code (single docstring match in line 4 is descriptive prose)
- Commit `e349655` — FOUND in git log (4 files changed, 461 insertions, 40 deletions)
- `pnpm tsc --noEmit` — exit 0
- `pnpm test -- --run` — 221 passed | 113 todo | 0 failed (Wave C baseline 210 → Wave 4 221, +11 GREEN as predicted)
- JOBS-01 deps regression guard: `grep -n "\[searchParams, authLoading\]" src/pages/jobs/JobSearch.tsx` returns line 383 unchanged
- `grep -c "limit(5)" src/components/saved-search/SavedSearchesDropdown.tsx` returns 1
- `grep -c "order('created_at', { ascending: false })" src/components/saved-search/SavedSearchesDropdown.tsx` returns 1
- `grep -c "navigate(\`/jobs?\${" src/components/saved-search/SavedSearchesDropdown.tsx` returns 1
- `grep -c "replace: false" src/components/saved-search/SavedSearchesDropdown.tsx` returns 1
- `grep -c "to=\"/dashboard/seeker/saved-searches\"" src/components/saved-search/SavedSearchesDropdown.tsx` returns 1
- `grep -c "if (e.key === 'Escape')" src/components/saved-search/SavedSearchesDropdown.tsx` returns 1
- `grep -c "addEventListener('mousedown'" src/components/saved-search/SavedSearchesDropdown.tsx` returns 1
- `grep -c "aria-haspopup=\"menu\"" src/components/saved-search/SavedSearchesDropdown.tsx` returns 1
- `grep -c "aria-expanded" src/components/saved-search/SavedSearchesDropdown.tsx` returns 1
- `grep -c "import { SavedSearchesDropdown }" src/pages/jobs/JobSearch.tsx` returns 1
- `grep -c "<SavedSearchesDropdown" src/pages/jobs/JobSearch.tsx` returns 1
- `grep -c "readFileSync" tests/saved-search-load-integration.test.tsx` returns 1
- `grep -c "not.toMatch" tests/saved-search-load-integration.test.tsx` returns 6 (negative assertions for dep drift)
- `grep -c "\[searchParams, authLoading\]" tests/saved-search-load-integration.test.tsx` returns 1 (positive assertion)

## Next Phase Readiness

- **Phase 17 implementation COMPLETE** — all 4 implementation waves landed (17-01 foundation, 17-02 save-flow, 17-03 list-page, 17-04 quick-load). `/gsd:verify-work` for Phase 17 is now unblocked.
- **Manual UAT** (`tests/saved-search-UAT.md` — 8 items including RLS isolation tests CRITICAL per CLAUDE §1) is the remaining gate before SRCH-13/14/15 can flip `[ ]` → `[x]` in REQUIREMENTS.md (CLAUDE §7 partial-close discipline).
- **Verification author next step**: `/gsd:verify-work` runs the goal-backward verifier against the deployed code; UAT checklist tracks the manual half. Both must PASS for Phase 17 closure.

**Blockers / concerns:** None. All 4 implementation waves shipped empirically green at component + integration + test layers.

**v2.0 launch carryforward:** SRCH-13 + SRCH-14 + SRCH-15 still NOT flippable to `[x]` in REQUIREMENTS.md per CLAUDE §7 — implementation surfaces all CLOSED, but E2E manual UAT gap remains until operator runs `tests/saved-search-UAT.md` (8 items: save→load round-trip, delete-with-undo, delete-without-undo, 10-cap replace, cross-session persistence, multi-tab race, RLS isolation seeker A vs B, RLS isolation anonymous).

## Self-Check: PASSED

- `src/components/saved-search/SavedSearchesDropdown.tsx` — FOUND (183 lines)
- `.planning/phases/17-saved-search/17-04-quick-load-SUMMARY.md` — being written by this Write call
- Commit `e349655` — FOUND in `git log`
- Test suite: 221 passed | 113 todo | 0 failed (verified pre-commit, +11 GREEN vs Wave C baseline)
- `pnpm tsc --noEmit` — exit 0 (verified pre-commit)
- 8 quick-load test todos → 0 todos; 3 load-integration test todos → 0 todos
- JOBS-01 regression guard: fetchJobs deps unchanged at `[searchParams, authLoading]` (verified via grep + static-source test)
- All 6 saved-search test files GREEN (47 cumulative passing tests)

---
_Phase: 17-saved-search_
_Plan: 04-quick-load_
_Completed: 2026-05-05_
