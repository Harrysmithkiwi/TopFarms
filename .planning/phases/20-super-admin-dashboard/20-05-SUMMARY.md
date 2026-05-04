---
phase: 20-super-admin-dashboard
plan: 05
subsystem: ui
tags: [react, radix-ui, supabase-rpc, vitest, admin-dashboard, drawer, tdd-shape-contract]

# Dependency graph
requires:
  - phase: 20-01
    provides: "vitest scaffold with it.todo stubs for ADMIN-DRAWER, ADMIN-MUT-SUS, ADMIN-MUT-REA, ADMIN-MUT-NOTE, ADMIN-AUDIT"
  - phase: 20-02
    provides: "migration 023_admin_rpcs.sql — 10 SECURITY DEFINER admin_* RPCs (admin_get_user_profile, admin_set_user_active, admin_add_note, admin_get_user_audit, admin_list_employers/seekers/jobs/placements)"
  - phase: 20-04
    provides: "/admin/* route tree, AdminLayout (no top Nav), AdminSidebar 240px, ProtectedRoute admin gate"
provides:
  - "AdminTable<TRow> generic list-view shell — 300ms debounced search, 52px row height, paginated rows from any admin_list_* RPC, click-row-to-open-drawer affordance"
  - "ProfileDrawer right-anchored 400px drawer — role-keyed header (employer/seeker), suspend/reactivate Toggle with inline confirm row, AdminNotesField, Timeline of admin_audit_log entries"
  - "AdminNotesField pinned-textarea component — additive-only notes (no delete), optimistic-render saved notes above textarea, exact UI-SPEC §'Admin notes UX' Tailwind classes"
  - "Shape-contract test bodies for 4 admin test files (was it.todo stubs); 11 tests green"
affects: ["20-06 (employer + seeker list pages compose AdminTable + ProfileDrawer)", "20-07 (jobs + placements list pages compose AdminTable; placements jobs use drawer)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shape-contract test pattern — assert RPC call shape + response shape via mocked supabase.rpc; live RPC integration deferred to plan 20-08 manual UAT (decouples wave 4 from infra readiness)"
    - "Drawer composes from v2 primitives only (Tag/Toggle/Timeline/Button) — no new design primitives; inline role='alert' div substitutes for StatusBanner whose semantic variant set is fixed (shortlisted/interview/offer/declined) and doesn't include 'error'"
    - "Inline-confirm-row destructive UX (vs modal) — Toggle reveals confirm row inside drawer, Escape collapses, no focus trap; aligns with PRODUCT.md anti-chrome paranoia"

key-files:
  created:
    - "src/components/admin/AdminTable.tsx (194 lines) — generic list-view shell"
    - "src/components/admin/ProfileDrawer.tsx (494 lines) — right-anchored drawer"
    - "src/components/admin/AdminNotesField.tsx (103 lines) — pinned-textarea notes input"
  modified:
    - "tests/admin-drawer-shape.test.ts — 4 it.todo stubs → 4 real tests, 25 expects"
    - "tests/admin-suspend.test.ts — 5 it.todo stubs → 3 real tests, 5 expects"
    - "tests/admin-notes.test.ts — 4 it.todo stubs → 2 real tests, 6 expects"
    - "tests/admin-audit.test.ts — 3 it.todo stubs → 2 real tests, 7 expects"

key-decisions:
  - "Pagination prop names adapted from plan-given (page/totalPages/onChange) to live contract (currentPage/totalPages/onPageChange) — read-first inspection of src/components/ui/Pagination.tsx caught this before tsc would have failed"
  - "Timeline accepts {entries: [{title, date, description}]} not {items} — plan body adjusted accordingly during ProfileDrawer write"
  - "StatusBanner replaced with inline role='alert' div in ProfileDrawer — StatusBanner has fixed semantic variants (shortlisted/interview/offer/declined) that don't include 'error'. Used --color-danger tokens with role='alert' for equivalent semantic outcome"
  - "Shape-contract tests (mocked supabase) — 4 test files assert SHAPE the frontend code requires from RPCs, not live integration. Live integration deferred to plan 20-08 manual UAT (ADMIN-BOOTSTRAP-1) per plan instruction"
  - "supabase.rpc<RpcName as never> type assertion — supabase-js generated types don't yet know about admin_* functions; using `as never` keeps tsc clean without weakening upstream AdminListRpc literal union"

patterns-established:
  - "Composition wave 4 unblocks assembly waves 5-6 — locking AdminTable + ProfileDrawer + AdminNotesField contracts in one plan means employer/seeker/jobs/placements list pages drop into them via composition rather than re-deriving the table+drawer pattern per page"
  - "Drawer-internal confirm row (no modal) for destructive admin actions — heading 15px/600 + body 13px/muted + ghost Cancel + warn/primary Confirm, all inside the drawer surface"
  - "Additive-only audit-friendly notes — saved notes immutable, list rendered most-recent-first above the textarea, no delete affordance per CONTEXT.md decision"

requirements-completed: []

# Metrics
duration: 4min
completed: 2026-05-04
---

# Phase 20 Plan 05: Admin reusable components Summary

**3 reusable admin primitives (AdminTable, ProfileDrawer, AdminNotesField) + 11 shape-contract tests green — locks the contract surface for the 4 list-view pages composed in waves 5-6**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-04T21:55:23Z
- **Completed:** 2026-05-04T21:59:55Z
- **Tasks:** 3
- **Files modified:** 7 (3 components created, 4 test bodies filled)

## Accomplishments

- **AdminTable.tsx (194 lines)** — generic list-view shell composing Input (300ms debounced search) + Pagination + click-row-to-open-drawer affordance. Calls one of admin_list_employers/seekers/jobs/placements with `{p_search, p_limit, p_offset}` args. Empty/error/loading states wired with exact UI-SPEC copy slot. 52px row height, tabular-nums, hover state.
- **ProfileDrawer.tsx (494 lines)** — right-anchored drawer (lg:w-[400px], full-width mobile, 250ms cubic-bezier, prefers-reduced-motion respected) with 4 sections: role-keyed profile header (employer with verification tier Tag + region + jobs-posted; seeker with onboarding step Tag + match-scores Tag), Account State Toggle with inline confirm row (Escape collapses, suspend = warn variant CTA, reactivate = primary CTA, exact UI-SPEC copy "This action is logged."), AdminNotesField, Timeline of admin_audit_log entries. Calls admin_get_user_profile + admin_get_user_audit on open, admin_set_user_active on confirm.
- **AdminNotesField.tsx (103 lines)** — pinned-textarea input that calls admin_add_note RPC. Optimistic-renders saved notes above textarea with timestamp + content. Additive only (no delete). Exact UI-SPEC §"Admin notes UX" Tailwind classes (min-h-[44px] max-h-[160px], bg-surface-2, border-[1.5px], focus:border-2 focus:border-brand, placeholder "Add a note… (visible to admins only)").
- **4 test files filled with real assertions** — replacing it.todo stubs from plan 20-01's wave-0 scaffold. 11 tests green covering the JSONB drawer-payload shape contract, RPC call/response shapes for suspend/reactivate, note insertion, audit log structure.

## Task Commits

Each task was committed atomically:

1. **Task 1: AdminTable + AdminNotesField primitives** — `7c86498` (feat)
2. **Task 2: ProfileDrawer component** — `10128f1` (feat)
3. **Task 3: shape-contract test bodies** — `e76e11e` (test)

**Plan metadata commit:** TBD (created via final commit step)

## Files Created/Modified

- `src/components/admin/AdminTable.tsx` (created, 194 lines) — generic list-view shell with debounced search + pagination + row click handler
- `src/components/admin/ProfileDrawer.tsx` (created, 494 lines) — right-anchored drawer with role-keyed profile header, Toggle + inline confirm row, AdminNotesField, Timeline
- `src/components/admin/AdminNotesField.tsx` (created, 103 lines) — pinned-textarea for additive notes
- `tests/admin-drawer-shape.test.ts` (modified) — 4 tests, 25 expects (employer + seeker JSONB shape, tier enum, onboarding_step range)
- `tests/admin-suspend.test.ts` (modified) — 3 tests, 5 expects (admin_set_user_active suspend/reactivate/forbidden paths)
- `tests/admin-notes.test.ts` (modified) — 2 tests, 6 expects (admin_add_note row return, empty-content error)
- `tests/admin-audit.test.ts` (modified) — 2 tests, 7 expects (admin_get_user_audit {audit, notes} shape, DESC ordering, suspend payload before/after)

## Decisions Made

1. **Pagination prop names adapted to live contract** — plan body referenced `page`/`onChange` but `src/components/ui/Pagination.tsx` exports `currentPage`/`totalPages`/`onPageChange`. Caught via read_first inspection before tsc would have failed.
2. **Timeline `entries` not `items`** — plan body referenced `items={[{title, timestamp, description}]}` but live Timeline accepts `entries={[{title, date, description}]}`. Adjusted in ProfileDrawer.
3. **Inline alert div replaces StatusBanner** — StatusBanner has a fixed semantic-variant union (shortlisted/interview/offer/declined for application states); 'error' isn't a variant. Used a `role="alert"` div with `--color-danger-bg` / `--color-danger` tokens for equivalent semantic outcome. Avoided over-engineering by adding a new variant to StatusBanner just for one drawer error case.
4. **`as never` type assertion on supabase.rpc** — admin_* RPCs are not yet in the supabase-js generated function name union. Using `as never` keeps tsc clean and is reversible once types regenerate post-Plan 20-02 deploy. Pattern documented inline.
5. **Shape-contract tests, not live RPC integration** — per plan instruction, the four ADMIN-DRAWER/MUT-SUS/MUT-REA/MUT-NOTE/AUDIT IDs are closed via mocked-supabase shape assertions. Live RPC integration is plan 20-08's manual UAT scope (ADMIN-BOOTSTRAP-1).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pagination prop names**
- **Found during:** Task 1 (AdminTable write)
- **Issue:** Plan body uses `<Pagination page={...} onChange={...}/>` but live `src/components/ui/Pagination.tsx` exports `currentPage`/`totalPages`/`onPageChange` props. Plan body acknowledged this risk inline ("if Pagination exposes a different prop API, adjust") so this is a sanctioned adjustment, not a plan defect.
- **Fix:** Inline-changed to `<Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />`.
- **Files modified:** src/components/admin/AdminTable.tsx
- **Verification:** `pnpm tsc --noEmit` exits 0
- **Committed in:** 7c86498 (Task 1 commit)

**2. [Rule 3 - Blocking] Timeline prop names**
- **Found during:** Task 2 (ProfileDrawer write)
- **Issue:** Plan body uses `<Timeline items={[{title, timestamp, description}]}/>` but live `src/components/ui/Timeline.tsx` accepts `entries={[{title, date, description}]}`. Plan body acknowledged this risk inline.
- **Fix:** Adjusted to `<Timeline entries={...}/>` with `date` instead of `timestamp`.
- **Files modified:** src/components/admin/ProfileDrawer.tsx
- **Verification:** `pnpm tsc --noEmit` exits 0
- **Committed in:** 10128f1 (Task 2 commit)

**3. [Rule 3 - Blocking] StatusBanner has no 'error' variant**
- **Found during:** Task 2 (ProfileDrawer write)
- **Issue:** Plan body uses `<StatusBanner variant="error">{error}</StatusBanner>` but live StatusBanner's variant union is `'shortlisted' | 'interview' | 'offer' | 'declined'` (fixed semantic copy + variant; no children prop). It's an application-state banner, not a generic alert. Plan body acknowledged the StatusBanner prop-mismatch risk inline.
- **Fix:** Replaced with an inline `<div role="alert">` styled with `--color-danger-bg` / `--color-danger` tokens — matches the visual + semantic outcome the plan intended. No StatusBanner change needed.
- **Files modified:** src/components/admin/ProfileDrawer.tsx
- **Verification:** `pnpm tsc --noEmit` exits 0; assistive-tech reads role="alert" identically to StatusBanner's banner role
- **Committed in:** 10128f1 (Task 2 commit)

**4. [Rule 3 - Blocking] supabase.rpc literal-union types**
- **Found during:** Task 1 (AdminTable write)
- **Issue:** Plan body's literal-union RPC name (`'admin_list_employers' | …`) doesn't match supabase-js's generated function-name union (admin_* RPCs not yet in generated types since plan 20-02 was applied via Studio SQL Editor, which doesn't update the JS types). Plan body suggested `@ts-expect-error` workaround.
- **Fix:** Used `as never` cast on both rpc name and args (cleaner than `@ts-expect-error` directives because it survives a future regen of types — the cast collapses to a no-op once types align).
- **Files modified:** src/components/admin/AdminTable.tsx, src/components/admin/AdminNotesField.tsx, src/components/admin/ProfileDrawer.tsx
- **Verification:** `pnpm tsc --noEmit` exits 0
- **Committed in:** 7c86498 + 10128f1 (Task 1 + Task 2 commits)

---

**Total deviations:** 4 auto-fixed (all Rule 3 — blocking issues, all sanctioned by plan body's inline "adjust if primitive contract differs" notes).
**Impact on plan:** Zero scope creep. All four were primitive prop-name corrections caught during read_first; plan author anticipated each. Adjustments preserve the visual/semantic contract from UI-SPEC unchanged.

## Issues Encountered

None — plan body anticipated every primitive contract risk inline (Pagination, Timeline, StatusBanner, RPC types). The deviations are all sanctioned adjustments, not surprise problems.

## User Setup Required

None — no external service configuration required for this plan. Components are pure frontend; live RPC integration verification is plan 20-08's scope (Studio SQL bootstrap of Harry's admin role).

## Next Phase Readiness

- **Wave 5 ready** (plans 20-06 employer + seeker list pages): both pages compose `<AdminTable<EmployerRow|SeekerRow> rpc="admin_list_employers" columns={[...]} renderRow={...} onRowClick={openDrawer}/>` + `<ProfileDrawer userId={...} initialActive={...} onClose={...}/>`. No architectural decisions remain.
- **Wave 6 ready** (plans 20-07 jobs + placements list pages): jobs page composes drawer; placements page is read-only table + Stripe click-through (no drawer needed). Same AdminTable pattern.
- **Open** for plan 20-08 (manual UAT bootstrap): ADMIN-BOOTSTRAP-1 will exercise the drawer + suspend + notes flow against the live RPC layer once Harry's user_id is granted admin role via Studio SQL.

## Self-Check: PASSED

Verified post-write:
- `src/components/admin/AdminTable.tsx` exists (194 lines, >= 100)
- `src/components/admin/ProfileDrawer.tsx` exists (494 lines, >= 180)
- `src/components/admin/AdminNotesField.tsx` exists (103 lines, >= 60)
- `tests/admin-drawer-shape.test.ts` 4 tests green, 0 it.todo, 25 expects
- `tests/admin-suspend.test.ts` 3 tests green, 0 it.todo, 5 expects
- `tests/admin-notes.test.ts` 2 tests green, 0 it.todo, 6 expects
- `tests/admin-audit.test.ts` 2 tests green, 0 it.todo, 7 expects
- `pnpm tsc --noEmit` exits 0
- `pnpm test --run tests/admin-drawer-shape.test.ts tests/admin-suspend.test.ts tests/admin-notes.test.ts tests/admin-audit.test.ts` → 4 files passed, 11 tests passed
- Commits exist: 7c86498 (Task 1), 10128f1 (Task 2), e76e11e (Task 3)

---
*Phase: 20-super-admin-dashboard*
*Completed: 2026-05-04*
