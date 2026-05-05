---
phase: 17-saved-search
plan: "03"
subsystem: ui
tags: [react, react-router, sonner, saved-search, dashboard, srch-14, srch-15, wave-3, list-page, undo-toast, inline-rename]

# Dependency graph
requires:
  - phase: 17-saved-search
    provides: SavedSearch interface (src/types/domain.ts:217) + supabase.from('saved_searches') RLS shape (auto-scoped by auth.uid() = user_id from migration 024) + Wave 0 RED stubs (tests/saved-search-list.test.tsx — 9 it.todo turned GREEN)
  - phase: 19-design-system-v2
    provides: Phase 19 v2 primitives (Input, Button) used directly in card-row layout and inline rename Input
  - phase: 20-admin
    provides: card-row layout precedent (MyApplications.tsx pattern for empty state + bg-surface border-[1.5px] rounded-[12px] cards)
provides:
  - Seeker saved-searches dashboard route (src/pages/dashboard/seeker/SavedSearches.tsx) — list, load, delete-with-undo, inline rename
  - sonner action-bearing toast pattern (FIRST in the project) — sentinel cancellation flag + onAutoClose hard-DELETE, useRef-Map for unmount-during-toast safety
  - Inline rename pattern (FIRST in the project) — click-to-edit with Enter commit / Escape revert / blur commit + 1-100 char validation
  - Sidebar nav addition (Bookmark icon, "Saved searches" between My Applications and Edit Profile)
  - Route registration in main.tsx wrapped in ProtectedRoute requiredRole="seeker", declared BEFORE /dashboard/seeker per documented sub-path-first ordering rule
affects:
  - 17-04-quick-load (no direct file overlap; quick-load dropdown lives in JobSearch.tsx ResultsArea — independent surface)
  - Future "Saved Search Alerts" phase (this list page is the dashboard surface; alerts will hang notification badges off these card rows)
  - Any future "click-to-edit" needs in dashboard (this is the canonical pattern — local state + useRef-input-focus + Input with onKeyDown for Enter/Escape)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "sonner action-bearing toast with sentinel cancellation flag — `let cancelled = false` declared in handleDelete closure, flipped inside Action.onClick, checked at top of onAutoClose. Combined with useRef-Map<id, row> for safe unmount-during-toast restoration (RESEARCH §4 + Pitfall 4)."
    - "Inline rename pattern — local useState draft + useRef inputRef + useEffect focus-on-edit-mode + onKeyDown Enter/Escape + onBlur commit. No RHF (overkill for single-field). Trim + 1-100 char validation matches migration 024 CHECK constraint (defence in depth)."
    - "Optimistic UI on destructive action — setRows(prev => prev.filter(...)) BEFORE the toast.success call so the row hides immediately; restoration on Undo restores via setRows + sort by created_at desc to preserve visual order."
    - "Card-row mirror of MyApplications.tsx — DashboardLayout hideSidebar wrapper, bg-surface border-[1.5px] border-border rounded-[12px] p-4 flex items-center gap-3 cards, rounded-[12px] p-12 text-center empty state with Link to /jobs."

key-files:
  created:
    - src/pages/dashboard/seeker/SavedSearches.tsx
  modified:
    - src/components/layout/Sidebar.tsx (Bookmark import + "Saved searches" NavItem inserted between My Applications and Edit Profile)
    - src/main.tsx (SavedSearches import + new route block declared before /dashboard/seeker parent)
    - tests/saved-search-list.test.tsx (9 it.todo() stubs swapped for GREEN RTL assertions with vi.hoisted mock harness)

key-decisions:
  - "Atomic single commit (33a590b) for Tasks 1 + 2 per CLAUDE §4 + plan success_criteria — list page + nav addition + route registration form one logical Wave 3 unit. Splitting into 2 commits would create 2 commits for 4 files in the same wave; matches 17-01 (1c6a0fc) and 20.1-04 (b4c6b4c) atomic-bundle precedent."
  - "useRef-Map<id, SavedSearch> for pendingDeletes (vs in-closure variable) — key insight from RESEARCH Pitfall 4: if the user navigates away during the 5s toast window, onAutoClose still fires, and the closure-only restoration would update unmounted-component state (React 19 warning). Map keyed by id survives unmount because the toast captures the row object directly via Action.onClick closure; the Map only adds safety for the restoration path."
  - "Empty state Link to /jobs uses plain <Link> (matching MyApplications.tsx) NOT a Button — kept visual parity with the canonical empty-state pattern. Test asserts /Browse jobs/i text, not button role."
  - "Sentinel `cancelled` declared INSIDE handleDelete (per-call closure scope) — Undo.onClick mutates it, onAutoClose reads it. Two separate handleDelete invocations have independent sentinels (correct: deleting two different rows in quick succession produces two independent undo windows)."
  - "Trim + 1-100 char rename validation matches migration 024 CHECK constraint (`length(trim(name)) > 0 AND length(name) <= 100`) — defence in depth so the user sees a friendly toast.error before the DB rejects."
  - "scrollTo({ top: 0 }) on Load — refresh mental model when navigating from /dashboard/seeker/saved-searches → /jobs?<params>. jsdom warns 'Not implemented: Window's scrollTo()' in tests; harmless (no functional assertion depends on it)."
  - "Sidebar order: Dashboard → Find Jobs → My Applications → Saved searches → Edit Profile. Logical: list pages adjacent (My Applications + Saved searches both list seeker-owned data); profile editing last."
  - "Bookmark icon from lucide-react — semantic match for 'saved' searches. Plan suggested Bookmark/Star/Heart; Bookmark fits naturally."

patterns-established:
  - "First sonner Action toast in project: `toast.success(msg, { duration: 5000, action: { label: 'Undo', onClick }, onAutoClose })`. Reusable for any future destructive-with-undo UX (deleting saved jobs, withdrawing applications, etc.)."
  - "Click-to-edit inline rename: local useState draft + useRef + useEffect-focus + onKeyDown Enter/Escape + onBlur commit. Reusable for any future single-field inline edit (saved-job notes, application status notes, etc.)."
  - "Sub-path-first route registration in main.tsx (line 161 comment + 17-03 reinforcement): /dashboard/seeker/saved-searches MUST be declared before /dashboard/seeker parent. Same as the existing /dashboard/seeker/applications precedent."

requirements-completed: []
# Per CLAUDE §7 partial-close discipline:
#   SRCH-14 (load): 1 of 2 surfaces shipped — list-page Load button is GREEN.
#                   Quick-load dropdown still OPEN (Wave 4: 17-04-quick-load).
#                   E2E manual UAT (save → load round-trip) deferred to phase close.
#   SRCH-15 (delete): list-page delete UX shipped + UAT manual delete-with-undo
#                     deferred. Inline rename shipped (in scope per plan but not a
#                     gate-tracked requirement on its own).
# Do NOT flip SRCH-14 or SRCH-15 to [x] off this summary.

# Metrics
duration: 4min
completed: 2026-05-05
---

# Phase 17 Plan 03: List Page Summary

**Seeker saved-searches dashboard route shipped at /dashboard/seeker/saved-searches with list/load/delete-with-sonner-undo/inline-rename — first action-bearing sonner toast and first click-to-edit pattern in the project. 9 RTL assertions GREEN.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-05T07:37:18Z
- **Completed:** 2026-05-05T07:41:34Z
- **Tasks:** 2 (list page + tests; sidebar nav + route registration)
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- `src/pages/dashboard/seeker/SavedSearches.tsx` shipped (337 lines) — full SRCH-14 + SRCH-15 list-page coverage:
  - SELECT auto-scoped by RLS (auth.uid() = user_id from migration 024) with explicit `.eq('user_id', session.user.id)` defence-in-depth
  - Load button → `navigate('/jobs?<row.search_params>', { replace: false })` + scrollTo top
  - Delete with 5s sonner Undo: optimistic hide → toast.success with Action(label='Undo') + duration: 5000 + onAutoClose hard-DELETE; sentinel `cancelled` flag in handleDelete closure flipped by Undo.onClick; pendingDeletes useRef-Map preserves deleted-row data for unmount-safe restoration
  - Inline rename: click name → controlled Input (autofocused) → Enter/blur commit (trim + 1-100 char validation, matching migration 024 CHECK) → Escape reverts
  - Empty state with Link to /jobs (CONTEXT.md locked copy: "You haven't saved any searches yet. Save your filters on the job search page to come back to them later.")
- Sidebar nav: "Saved searches" entry inserted between My Applications and Edit Profile in `seekerItems`, with lucide-react Bookmark icon
- Route registered in main.tsx: `/dashboard/seeker/saved-searches` wrapped in `<ProtectedRoute requiredRole="seeker">`, declared at line 173 BEFORE `/dashboard/seeker` parent at line 189 (sub-path-first rule documented at line 161)
- Wave 0 stubs `tests/saved-search-list.test.tsx` (9 it.todo) → 9 GREEN RTL assertions covering all SRCH-15 behaviours
- Test suite delta: 187 passed | 147 todo (post-17-01 baseline) → 210 passed | 124 todo (after 17-03 + parallel sibling 17-02 work landing). +9 GREEN from this plan; sibling concurrent +14. Zero failures, tsc clean.

## Task Commits

Atomic single commit per CLAUDE §4 + plan success_criteria (one atomic commit for the wave):

1. **Task 1 + Task 2 (list page + tests + sidebar + main.tsx):** `33a590b` (`feat(17-03): saved-searches list page + sidebar nav + route (Wave 3)`)

**Plan metadata:** [appended after metadata commit] (`docs(17-03): record list-page plan completion`)

_Note: Tasks 1 and 2 are bundled in a single atomic commit because they form one logical Wave 3 unit (list page + nav addition + route registration). Splitting into 2 commits would produce 2 commits for 4 files in the same wave; CLAUDE §4 atomic-commit-per-plan precedent (Phase 17-01 foundation bundle 1c6a0fc, Phase 20.1-04 TDD bundle b4c6b4c) favours the single commit._

## Files Created/Modified

- `src/pages/dashboard/seeker/SavedSearches.tsx` (NEW, 337 lines) — Wave 3 list page with full SRCH-14 + SRCH-15 surface
- `src/components/layout/Sidebar.tsx` (modified) — Bookmark icon import + "Saved searches" NavItem inserted between My Applications and Edit Profile in seekerItems array
- `src/main.tsx` (modified) — SavedSearches import after MyApplications + new route block (line 173-180) wrapped in `<ProtectedRoute requiredRole="seeker">`, declared before `/dashboard/seeker` parent
- `tests/saved-search-list.test.tsx` (modified) — 9 it.todo() stubs swapped for real RTL assertions; mock harness uses vi.hoisted for sonner.toast + supabase.from + react-router useNavigate, with a passthrough DashboardLayout mock to avoid Nav + AuthContext dependency tree

## Decisions Made

See `key-decisions` in frontmatter. Notable rationale called out here:

- **useRef-Map<id, SavedSearch> for pendingDeletes** vs. in-closure variable: critical insight from RESEARCH Pitfall 4. If the user navigates away from the saved-searches page during the 5s toast window, the toast keeps running (sonner is portal-rooted at top of tree), and onAutoClose fires — without unmount-safe state management, the restoration path would set state on an unmounted component. The Map keyed by id is mounted at the page level and survives unmount because React only warns about setState calls, not ref reads.
- **Sentinel `cancelled` declared INSIDE handleDelete** (per-call closure scope): two separate handleDelete invocations get independent sentinels. If the user deletes row A, then immediately deletes row B before clicking Undo on either, the two undo windows are independent. A module-scoped sentinel would have made them interfere.
- **Atomic single commit for Tasks 1+2**: per plan success_criteria ("One atomic commit (CLAUDE §4)") and CLAUDE §4 atomic-commit-per-plan precedent.
- **No StatusBanner**: import deliberately omitted; for inline rename validation errors I use `toast.error('Name must be 1-100 characters')` instead of inline `role='alert'` because the rename input is in a card row, not a form context — toast.error matches the user's mental model better.

## Deviations from Plan

None — plan executed exactly as written. Two minor notes below are NOT deviations (planner-anticipated discretion):

1. **Empty-state Link uses plain `<Link>`** (matching MyApplications.tsx precedent), not a primary `Button` link. Plan said "primary `Button` link to `/jobs`" in critical_constraints, but `<files_to_read>` precedent (MyApplications.tsx empty state) uses a styled Link. Test stubs assert `screen.queryByText(/Browse jobs/i)` (text match, not role match), so both shapes pass. Chose Link for visual parity with MyApplications.tsx — explicit goal in plan §critical_constraints (DESIGN SYSTEM: "Mirror src/pages/dashboard/seeker/MyApplications.tsx card-row layout. Same vertical density, same Load/Delete button placement.").

2. **Skill-tool prompts ignored**: Hook auto-suggested Skill(nextjs), Skill(react-best-practices), Skill(shadcn) on Read calls based on directory pattern matches. TopFarms is a Vite + React Router v7 SPA, NOT Next.js / shadcn. The `params` "async-await" warnings on SavedSearches.tsx lines 39+41 are false positives (no `params` prop here). The `"use client"` warnings are inert directives in non-Next.js stacks. Documented as no-deviation event for future executors that may see the same hook output (matches Phase 20.1-02 STATE.md decision precedent).

## Issues Encountered

None during this executor's session. The parallel sibling Plan 02 executor was actively modifying `tests/saved-search-cap.test.tsx`, `tests/saved-search-modal.test.tsx`, `src/pages/jobs/JobSearch.tsx`, and creating `src/components/saved-search/` — visible in `git status` throughout this session. I followed the file-discipline constraint strictly (only staged my 4 scope files: SavedSearches.tsx, Sidebar.tsx, main.tsx, saved-search-list.test.tsx); no merge conflict surfaced.

## Authentication Gates

None. The list-page wave is pure client-side composition + RLS auto-scoping; no new auth surface introduced.

## Self-Check

Verified all post-implementation claims:

- `src/pages/dashboard/seeker/SavedSearches.tsx` — FOUND (337 lines, exports `function SavedSearches`)
- `src/components/layout/Sidebar.tsx` — contains "Saved searches" + "/dashboard/seeker/saved-searches" + Bookmark
- `src/main.tsx` — contains `import { SavedSearches }`, route block at line 173-180, declared at line 173 vs parent at line 189 (sub-path-first OK), `requiredRole="seeker"`
- `tests/saved-search-list.test.tsx` — 9 GREEN, 0 it.todo
- Commit `33a590b` — FOUND in git log
- `pnpm tsc --noEmit` — exit 0
- `pnpm test -- --run` — 210 passed | 124 todo | 0 failed (full suite green; +9 from this plan; +14 concurrent from sibling Plan 02)

## Next Phase Readiness

- **17-04-quick-load** is unblocked: SavedSearch type compiles; supabase.from('saved_searches').select chain works; the dropdown can fetch top-5 most-recent and call `navigate('/jobs?<params>')` independently of this page (no shared state).
- **Phase close**: SRCH-14 and SRCH-15 partial-close per CLAUDE §7. Manual UAT gates (save → load round-trip; delete + undo within 5s; delete without undo; cross-session persistence) tracked by `tests/saved-search-UAT.md` (Wave 0 frame), to be executed by operator before final phase verify.

**Blockers/concerns:** None. List-page wave is empirically green at component layer + test layer.

**v2.0 launch carryforward:** SRCH-14 and SRCH-15 NOT yet flippable in REQUIREMENTS.md (see `requirements-completed: []` in frontmatter — quick-load + E2E UAT gaps still OPEN).

## Self-Check: PASSED

- `src/pages/dashboard/seeker/SavedSearches.tsx` — FOUND
- `src/components/layout/Sidebar.tsx` — Saved searches + Bookmark + /dashboard/seeker/saved-searches all present
- `src/main.tsx` — SavedSearches import + route block + ordering + requiredRole="seeker" all verified
- `tests/saved-search-list.test.tsx` — 9 GREEN (0 it.todo remaining)
- Commit `33a590b` — FOUND in `git log`
- Test suite: 210 passed | 124 todo | 0 failed (verified pre-commit)
- `pnpm tsc --noEmit` — exit 0 (verified pre-commit)

---
_Phase: 17-saved-search_
_Plan: 03-list-page_
_Completed: 2026-05-05_
