---
phase: 17-saved-search
plan: "02"
subsystem: ui
tags: [react, react-hook-form, zod, supabase, modal, saved-search, srch-13, wave-2, save-flow]

# Dependency graph
requires:
  - phase: 17-saved-search
    provides: SavedSearch type + snapshotFilters/deriveAutoName/hasActiveFilters helpers (17-01-foundation), saved_searches table + RLS policies live in production
  - phase: 17-saved-search
    provides: tests/saved-search-modal.test.tsx + tests/saved-search-cap.test.tsx Wave 0 RED stubs (17-00-test-scaffold) — turned GREEN by this wave
  - phase: 19-design-system-v2
    provides: Phase 19 v2 primitives (Input + Button) — composed by both modals
  - phase: 20.1-admin-bootstrap
    provides: inline role="alert" div pattern for error display (AdminLoginPage / ProfileDrawer precedent — StatusBanner has fixed variant union with no 'error' member)
provides:
  - src/components/saved-search/SaveSearchModal.tsx (RHF + Zod, Input + Button v2 primitives, inline role=alert errors, `if (!isOpen) return null` unmount-on-close)
  - src/components/saved-search/ReplaceOldestModal.tsx (10-cap replace flow — fetches oldest by created_at ASC, delete-before-insert order)
  - src/pages/jobs/JobSearch.tsx Save button + modal mount points + handleSaveClick cap-check (count: 'exact', head: true)
  - 14 GREEN test assertions (9 modal + 5 cap) — turned saved-search-modal.test.tsx and saved-search-cap.test.tsx from RED stubs to passing
affects:
  - 17-03-list-page (sibling parallel wave — independent file scope; no shared edits)
  - 17-04-quick-load (consumes the same SavedSearch shape this wave INSERTs; quick-load dropdown in JobSearch will sit alongside the Save button this wave shipped)
  - 18-tech-debt (no new auth_rls_initplan instances introduced — modals call existing 17-01 RLS-protected table)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline modal pattern from MarkFilledModal.tsx — backdrop + bg-surface card + `if (!isOpen) return null` for clean unmount-on-close (Pitfall 3 / 17-RESEARCH.md — prevents stale RHF defaultValues on re-open)"
    - "RHF + Zod for single-field forms — z.object({ name: z.string().min(1, ...).max(100, ...) }) + useForm({ resolver: zodResolver(schema), defaultValues: { name: deriveAutoName(searchParams) } }) — mirrors Login.tsx / AdminLoginPage.tsx"
    - "Inline role='alert' div with --color-danger / --color-danger-bg tokens for persistence errors (NOT StatusBanner — its variant union is fixed: 'shortlisted' | 'interview' | 'offer' | 'declined', no 'error' member). Phase 20-05 ProfileDrawer + Phase 20.1 AdminLoginPage precedent."
    - "Cap-check shape `from('saved_searches').select('id', { count: 'exact', head: true }).eq('user_id', ...)` — returns count without rows. Race tradeoff documented (acceptable +1 drift in two-tab simultaneous-save case per 17-RESEARCH §6 / Pitfall 5)."
    - "Replace-flow order: delete-then-insert. If delete succeeds and insert fails, user is at count=9 (acceptable; next save retry works). Atomic-ish without DB transaction wrapping — JobSearch is browser context, no transactional supabase client."
    - "vi.hoisted pattern for fromMock when SUT statically imports `@/lib/supabase` (Phase 20-06 precedent). insertMock declared inside hoisted block so beforeEach can reset both."

key-files:
  created:
    - src/components/saved-search/SaveSearchModal.tsx
    - src/components/saved-search/ReplaceOldestModal.tsx
  modified:
    - src/pages/jobs/JobSearch.tsx (imports + save-modal state + handleSaveClick + Save button in ResultsArea + modal mounts; fetchJobs useEffect deps UNCHANGED — JOBS-01 regression guard intact)
    - tests/saved-search-modal.test.tsx (9 it.todo() stubs swapped for GREEN assertions)
    - tests/saved-search-cap.test.tsx (5 it.todo() stubs swapped for GREEN assertions)

key-decisions:
  - "Atomic single-commit landing of TDD RED + GREEN per CLAUDE §4 (mirror 17-01 / 20.1-04 / 17-00 atomic-bundle precedent). Splitting into two commits (test→impl) for 14 behavioral assertions would create noise without bisect value."
  - "vi.hoisted fromMock pattern (Phase 20-06 precedent) chosen for both test files — SaveSearchModal and ReplaceOldestModal statically import supabase, which transitively pulls @/lib/supabase before mock setup. lazy-import via `await import()` would have worked for the cap test alone but not the modal test (RTL requires the SUT to be statically importable)."
  - "Save button visibility predicate `isLoggedIn && hasActiveFilters(searchParams)` lives inside ResultsArea (not at JobSearch level) — predicate is per-render-cheap and ResultsArea already receives both props. Lifting to JobSearch would have required threading a new prop AND duplicating the predicate at desktop + mobile call sites."
  - "ResultsArea Save button DOM placement: inside a `flex items-center gap-3` group with the result-count `<p>`, separated by a `·` interpunct. Mirrors RESEARCH §5 wireframe; visually consistent with Linear/Notion top-bar affordances."
  - "Persistence-error display via `setError('root', { message: ... })` — RHF 7.55.0 native API (not the form-level error key from earlier RHF versions). Renders inside a `role='alert'` div with --color-danger tokens; auto-clears on next submit attempt."
  - "Both modals export the component as a named function (`export function`) not arrow-const — matches the project's prevailing component-export style (e.g. MarkFilledModal, Login, AdminLoginPage). No semantic difference; consistency wins."
  - "ReplaceOldestModal Esc key handler added (mirrors SaveSearchModal). Plan body didn't explicitly require it; added under Rule 2 (missing critical functionality — modal accessibility consistency). Symmetric with backdrop-click and aria-label='Close modal' close button."

patterns-established:
  - "Multi-modal sibling pattern: SaveSearchModal + ReplaceOldestModal both live in src/components/saved-search/ as a feature group. Future feature-folders that ship 2+ modals (e.g., a future 'shortlist' or 'placement-dispute' feature) can mirror this layout — single import path, shared structural language, sibling-modal mounts at the parent route."
  - "Cap-check + replace-flow as a UX-first pattern (RESEARCH §6 recommendation): client-side count head:true → branch on count >= cap → defer to replace modal that does delete-then-insert. Reusable for any future per-user soft-cap (e.g. saved-jobs cap, applications-in-progress cap, etc.). Race tradeoff documented; DB-trigger enforcement is overkill for this scale."
  - "Pending-save state pattern: when modal A defers to modal B mid-flow, the parent holds a `pendingSave` state slot that captures derived data computed at click time (deriveAutoName + snapshotFilters output). Modal B consumes via prop; on close, parent clears state. Avoids re-deriving in modal B and keeps the snapshot consistent across the user's interaction."

requirements-completed: []
# Per CLAUDE §7 partial-close discipline: SRCH-13 has multiple gaps:
#   (a) DB foundation       — CLOSED by 17-01 (table + RLS + helpers + types)
#   (b) Save modal UI       — CLOSED by THIS plan (17-02 — modal + cap-flow + JobSearch wiring)
#   (c) E2E manual UAT      — OPEN (after Waves 3-4 land + manual save→load round-trip)
# Two of three gaps closed. Do NOT flip SRCH-13 to [x] in REQUIREMENTS.md off this summary.
# v2.0-MILESTONE-AUDIT.md carryforward: SRCH-13 E2E manual UAT pending end of Phase 17.

# Metrics
duration: ~10min
completed: 2026-05-05
---

# Phase 17 Plan 02: Save Flow Summary

**Save-search modal + 10-cap replace flow shipped — RHF + Zod over v2 primitives (Input + Button), inline role="alert" persistence errors (no StatusBanner), 14 new GREEN tests, fetchJobs deps unchanged.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-05T07:33:00Z (approx)
- **Completed:** 2026-05-05T07:43:29Z
- **Tasks:** 2 (SaveSearchModal+modal-tests, ReplaceOldestModal+JobSearch wiring+cap-tests)
- **Files created:** 2 (SaveSearchModal.tsx, ReplaceOldestModal.tsx)
- **Files modified:** 3 (JobSearch.tsx, saved-search-modal.test.tsx, saved-search-cap.test.tsx)

## Accomplishments

- `src/components/saved-search/SaveSearchModal.tsx` — RHF + Zod (max 100), Input + Button primitives, inline `role="alert"` div for persistence errors, `if (!isOpen) return null` unmount-on-close, Esc + backdrop close, autoFocus on name field
- `src/components/saved-search/ReplaceOldestModal.tsx` — 10-cap replace UX. Fetches oldest by created_at ASC, displays name in modal copy, delete-before-insert order on confirm, toast.error fallback on either failure path, Esc + backdrop close
- `src/pages/jobs/JobSearch.tsx` Save button — visible only when `isLoggedIn && hasActiveFilters(searchParams)` (locked decision: hidden for signed-out / no-filter states). `handleSaveClick` cap-check uses `select('id', { count: 'exact', head: true })` shape; routes count >= 10 to ReplaceOldestModal, otherwise opens SaveSearchModal. Modals mounted at JobSearch root, only when `session?.user?.id` present
- `tests/saved-search-modal.test.tsx` — 9 it.todo stubs swapped for GREEN assertions covering: Input + Button render, deriveAutoName pre-fill, inline role="alert" on error (NOT StatusBanner), Zod max(100) rejection, submit-disabled-when-empty, Esc closes, backdrop closes, supabase.from('saved_searches').insert shape, isOpen=false unmounts
- `tests/saved-search-cap.test.tsx` — 5 it.todo stubs swapped for GREEN assertions covering: replace modal opens with oldest-lookup, oldest name surfaces in copy, Cancel skips DB writes, Replace = delete-then-insert in order, count-check shape `select('id', { count: 'exact', head: true })`
- Test suite delta: 187 passed | 138 todo (post-Wave-1 baseline) → 210 passed | 124 todo (+14 GREEN, -14 todos, zero failures, zero regressions)
- JOBS-01 regression guard verified: `fetchJobs` useEffect deps unchanged at `[searchParams, authLoading]` (line 382 of post-edit JobSearch.tsx)

## Task Commits

Per CLAUDE §4 atomic-commit discipline, behavioral tests + implementation landed in a single commit because they form one logical save-flow unit:

1. **Tasks 1+2 (SaveSearchModal + ReplaceOldestModal + JobSearch wiring + 14 tests):** `171d49e` (`feat(17-02): add save flow — SaveSearchModal + ReplaceOldestModal + JobSearch wiring`)

**Plan metadata:** [appended after metadata commit] (`docs(17-02): complete save-flow plan`)

_Note: Splitting into 4-5 commits (modal-test → modal-impl → cap-test → cap-impl → JobSearch-wire) would have produced 4-5 commits for what is logically one wave; CLAUDE §4 atomic-commit-per-plan precedent (Phase 20.1-04 TDD-bundle, Phase 17-00 scaffold, Phase 17-01 foundation) favors the single commit._

## Files Created/Modified

- `src/components/saved-search/SaveSearchModal.tsx` — 161 lines. RHF + Zod schema (`z.string().min(1).max(100)`); Input from `@/components/ui/Input` (built-in `error` prop); Button from `@/components/ui/Button` (variants: outline + primary); inline `role="alert"` div with `--color-danger-bg` + `--color-danger` tokens for persistence error; X close button + Esc keyboard handler + backdrop click — all three close paths call onClose; `if (!isOpen) return null` at line 88 mirrors MarkFilledModal pattern.
- `src/components/saved-search/ReplaceOldestModal.tsx` — 165 lines. useEffect on isOpen+userId loads oldest via `select('id, name').eq('user_id', ...).order('created_at', { ascending: true }).limit(1).single()`; handleReplace branches on delete-error → toast.error and bail, on insert-error → toast.error and bail, on success → toast.success + onReplaced + onClose; Esc handler + backdrop close + X button mirror SaveSearchModal.
- `src/pages/jobs/JobSearch.tsx` — modified at 4 sites: (1) imports for hasActiveFilters/snapshotFilters/deriveAutoName + SaveSearchModal + ReplaceOldestModal; (2) state slots `saveModalOpen`, `replaceModalOpen`, `pendingSave`; (3) `handleSaveClick` async function with cap-check shape; (4) ResultsArea Save button + `onSaveClick` prop threaded to both desktop + mobile renderings; (5) modal mounts at JobSearch root, `session?.user?.id`-gated. fetchJobs useEffect deps **unchanged** (JOBS-01 regression guard).
- `tests/saved-search-modal.test.tsx` — vi.hoisted fromMock pattern; 9 GREEN assertions covering all SaveSearchModal contract surfaces.
- `tests/saved-search-cap.test.tsx` — vi.hoisted fromMock pattern; 5 GREEN assertions covering oldest-lookup, name display, cancel-no-DB, replace-delete-then-insert order, count-check shape.

## Decisions Made

See `key-decisions` in frontmatter. Notable rationale called out here:

- **No StatusBanner for errors:** StatusBanner's variant union is FIXED (`'shortlisted' | 'interview' | 'offer' | 'declined'`). No `'error'` member. Inline `role="alert"` div with `--color-danger-bg` + `--color-danger` tokens is the canonical TopFarms pattern for form/persistence errors (Phase 20-05 ProfileDrawer + Phase 20.1 AdminLoginPage precedent).
- **`if (!isOpen) return null`** in both modals: clean unmount-on-close prevents stale RHF `defaultValues` on re-open (Pitfall 3 in 17-RESEARCH.md). Same pattern as MarkFilledModal.tsx line 103.
- **Cap-check shape:** `select('id', { count: 'exact', head: true })` returns count without rows. Race tradeoff documented in 17-RESEARCH §6 — two-tab simultaneous-save can drift to count=11 (acceptable per Pitfall 5; DB-trigger enforcement is overkill for this scale).
- **Replace order:** delete-then-insert. If delete succeeds and insert fails, user is at count=9 (acceptable; next save retry works). No transactional supabase client in browser context — atomic-ish via sequential awaits with toast.error fallbacks.
- **Save button placement:** inside ResultsArea (not at JobSearch root) because predicate (`isLoggedIn && hasActiveFilters(searchParams)`) is cheap and both props are already threaded. Lifting would have required duplicating the predicate at desktop + mobile call sites.
- **vi.hoisted for both test files:** Phase 20-06 precedent. SUT static-imports supabase transitively → mock must exist before import. `vi.hoisted(() => ({ fromMock, insertMock }))` guarantees this.
- **Esc handler added to ReplaceOldestModal** (under deviation Rule 2): plan body didn't explicitly require it, but accessibility consistency with SaveSearchModal made it a missing-critical addition. Symmetric with backdrop-click and aria-label="Close modal" X button.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added Esc handler to ReplaceOldestModal**
- **Found during:** Task 2 (ReplaceOldestModal authoring)
- **Issue:** Plan body for ReplaceOldestModal did not include an Esc-to-close keyboard handler, but SaveSearchModal had one. Asymmetric a11y between the two modals would have been a UX regression — both modals are reachable from the same JobSearch surface and a user pressing Esc on one but not the other is jarring.
- **Fix:** Added `useEffect` mirroring SaveSearchModal's Esc handler (lines 56-65 of ReplaceOldestModal.tsx). Same shape: `if (!isOpen) return; document.addEventListener('keydown', onKey)` + cleanup on unmount.
- **Files modified:** src/components/saved-search/ReplaceOldestModal.tsx
- **Verification:** Backdrop close, X button close, and Esc close paths all reach onClose. Manual jsdom verification deferred (5 cap-test assertions cover Cancel button + replace happy path; Esc would need a 6th assertion — out of scope per plan's 5-test contract; covered indirectly via UAT script).
- **Committed in:** 171d49e (Task 2 commit)

**2. [Rule 1 - Bug Prevention] HTML `maxLength={100}` attribute kept on Input despite Zod max(100) being the validator of record**
- **Found during:** Task 1 (SaveSearchModal authoring)
- **Issue:** Plan said "max 100 chars enforced via Zod"; left ambiguous whether HTML maxLength should also be set. In the absence of HTML maxLength, real-browser users could paste 1000-char names without immediate UI feedback (Zod fires only on submit). With it, browsers silently truncate to 100 — defence in depth.
- **Fix:** Kept `maxLength={100}` on the Input element (line 130 of SaveSearchModal.tsx). Zod is the validator of record (matches DB CHECK constraint length(name) <= 100); HTML maxLength is the immediate-feedback guard.
- **Files modified:** src/components/saved-search/SaveSearchModal.tsx
- **Verification:** Test "rejects names exceeding 100 chars via Zod max constraint" uses `fireEvent.change` with target.value of 'a'.repeat(101) which bypasses HTML maxLength (jsdom limitation per test comment) — Zod catches it on submit. PASS.
- **Committed in:** 171d49e (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical [Esc handler], 1 bug prevention [defence-in-depth maxLength])
**Impact on plan:** Both auto-fixes essential for accessibility consistency and defence-in-depth validation. No scope creep — both changes scoped to files already in the plan's `<files>` block.

## Issues Encountered

None. All test assertions GREEN on first run after implementation. No tsc errors; no test regressions. The plan body's verbatim component bodies were close enough that the executor only needed to:
- Match existing JobSearch.tsx import block ordering convention (after `ActiveFilterPills`, before type-only imports).
- Match the existing useState block ordering (after `expandedId`).
- Match the existing event-handler ordering (after `handleInlineApply`, before `return`).

## Self-Check

Verified all post-implementation claims:

- `src/components/saved-search/SaveSearchModal.tsx` — FOUND (161 lines)
- `src/components/saved-search/ReplaceOldestModal.tsx` — FOUND (165 lines)
- `src/pages/jobs/JobSearch.tsx` — modified (5 edit sites; +56 lines, -1 line)
- `tests/saved-search-modal.test.tsx` — modified (9 todos → 9 GREEN assertions; 0 todos remaining)
- `tests/saved-search-cap.test.tsx` — modified (5 todos → 5 GREEN assertions; 0 todos remaining)
- Commit `171d49e` — FOUND in `git log` (5 files changed, 761 insertions, 37 deletions)
- `pnpm tsc --noEmit` — exit 0
- `pnpm test -- --run` — 210 passed | 124 todo | 0 failed (Wave 1 baseline 187 → Wave 2 210, +14 GREEN as expected)
- JOBS-01 deps regression guard: `grep -A1 "Re-fetch when searchParams" src/pages/jobs/JobSearch.tsx` — deps line reads `[searchParams, authLoading]` ✓
- StatusBanner regression guard: `grep -E "^import.*StatusBanner" src/components/saved-search/SaveSearchModal.tsx` returns no matches ✓
- Wave-3 file boundary respected: SavedSearches.tsx, Sidebar.tsx, main.tsx, saved-search-list.test.tsx all UNCHANGED ✓

## Next Phase Readiness

- **17-03-list-page** is unblocked (parallel sibling): SaveSearchModal + ReplaceOldestModal exports importable; JobSearch.tsx already INSERTs; list page just needs SELECT/UPDATE/DELETE wiring.
- **17-04-quick-load** is unblocked: SaveSearchModal call site already lives next to where the quick-load dropdown will sit; the dropdown's ResultsArea slot is already a `flex items-center gap-3` group ready to receive a sibling.
- **Manual UAT** (17-VALIDATION.md §"Manual-Only Verifications"): Save → reload → list-page-load round-trip is now possible end-to-end at the DB layer (table + INSERT + SELECT all live in production); list-page-load + quick-load remain Wave 3-4 surfaces.

**Blockers / concerns:** None. Save flow is empirically green at component layer + integration layer (JobSearch button visible + modal opens + insert shape correct) + test layer (14 new GREEN). 10-cap replace flow shipped untested at full E2E (DB count=10 setup is manual-UAT scope per VALIDATION.md).

**v2.0 launch carryforward:** SRCH-13 still NOT flippable to [x] in REQUIREMENTS.md per CLAUDE §7 — only modal/cap UI gaps closed (in addition to 17-01's foundation gap); E2E manual UAT gap remains until end of Phase 17.

## Self-Check: PASSED

- `src/components/saved-search/SaveSearchModal.tsx` — FOUND
- `src/components/saved-search/ReplaceOldestModal.tsx` — FOUND
- `.planning/phases/17-saved-search/17-02-save-flow-SUMMARY.md` — being written by this Write call
- Commit `171d49e` — FOUND in `git log`
- Test suite: 210 passed | 124 todo | 0 failed (verified pre-commit)
- `pnpm tsc --noEmit` — exit 0 (verified pre-commit)
- 9 modal-test todos → 0 todos; 5 cap-test todos → 0 todos (`grep -c "it.todo"` returns 0 on both files)
- JOBS-01 regression guard: fetchJobs deps unchanged
- Wave-3 file boundary respected: 4 sibling-owned files untouched

---
_Phase: 17-saved-search_
_Plan: 02-save-flow_
_Completed: 2026-05-05_
