---
phase: 17-saved-search
plan: 00
type: execute
wave: 0
depends_on: []
files_modified:
  - tests/saved-search-modal.test.tsx
  - tests/saved-search-snapshot.test.ts
  - tests/saved-search-cap.test.tsx
  - tests/saved-search-list.test.tsx
  - tests/saved-search-quick-load.test.tsx
  - tests/saved-search-load-integration.test.tsx
  - tests/saved-search-UAT.md
autonomous: true
requirements:
  - SRCH-13
  - SRCH-14
  - SRCH-15
must_haves:
  truths:
    - "All 6 vitest stub files exist with red `it.todo()` placeholders for every behavior in 17-VALIDATION.md per-task map"
    - "Manual UAT script exists with all 8 manual-only verification steps from 17-VALIDATION.md §Manual-Only Verifications"
    - "Stubs run without import errors (vitest collection passes; bodies are .todo so red is expected)"
  artifacts:
    - path: tests/saved-search-modal.test.tsx
      provides: "RED stubs for SRCH-13 modal render + Zod validation"
      contains: "describe('Save search modal"
    - path: tests/saved-search-snapshot.test.ts
      provides: "RED stubs for snapshotFilters + deriveAutoName pure functions"
      contains: "describe('snapshotFilters"
    - path: tests/saved-search-cap.test.tsx
      provides: "RED stubs for 10-cap replace flow"
      contains: "describe('10-cap replace"
    - path: tests/saved-search-list.test.tsx
      provides: "RED stubs for SavedSearches list page (load/delete/undo/rename)"
      contains: "describe('SavedSearches"
    - path: tests/saved-search-quick-load.test.tsx
      provides: "RED stubs for quick-load dropdown"
      contains: "describe('Quick-load dropdown"
    - path: tests/saved-search-load-integration.test.tsx
      provides: "RED stub for stale-match-scores regression guard"
      contains: "describe('Saved-search load integration"
    - path: tests/saved-search-UAT.md
      provides: "Manual UAT script for 8 verification steps"
      contains: "RLS isolation"
  key_links:
    - from: "tests/saved-search-*.test.{ts,tsx}"
      to: "tests/setup.ts (jest-dom + cleanup)"
      via: "vitest auto-loaded via vitest.config.ts"
      pattern: "import.*from 'vitest'"
---

<objective>
Wave 0 test scaffold. Create 6 vitest stub files + 1 UAT markdown that mirror the per-task verification map in 17-VALIDATION.md. Bodies use `it.todo()` so vitest reports todos rather than fails — provides a visible scaffolding signal, mirrors Phase 20-01 Wave 0 precedent.

Purpose: Subsequent waves turn red stubs green. Without this scaffold, Wave 1+ tasks have no `<verify>` target — they would create test files alongside production code, doubling per-task scope and breaking the Nyquist sampling contract.

Output: 6 test files (red stubs) + 1 UAT markdown. No production code. One atomic commit (CLAUDE §4).
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
@CLAUDE.md
@tests/admin-employer-list.test.ts
@tests/setup.ts
@vitest.config.ts

<interfaces>
<!-- Existing test infrastructure (no extraction needed — pattern is well-established): -->
<!-- - vitest 3.1.1 globals (describe, it, expect, vi, beforeEach) -->
<!-- - @testing-library/react 16.3.0 (render, screen, fireEvent, waitFor) -->
<!-- - jsdom 29.0.0 environment -->
<!-- - vi.hoisted pattern for hoisted mocks (Phase 20-06 precedent) -->
<!-- - it.todo() reports a third state — neither pass nor fail; vitest CLI shows it explicitly -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create 6 vitest test stubs + 1 UAT markdown for Phase 17</name>
  <files>
    tests/saved-search-modal.test.tsx
    tests/saved-search-snapshot.test.ts
    tests/saved-search-cap.test.tsx
    tests/saved-search-list.test.tsx
    tests/saved-search-quick-load.test.tsx
    tests/saved-search-load-integration.test.tsx
    tests/saved-search-UAT.md
  </files>
  <read_first>
    - .planning/phases/17-saved-search/17-VALIDATION.md (per-task map, manual UAT list — verbatim source for stub names)
    - .planning/phases/17-saved-search/17-RESEARCH.md §8 (Test Coverage Strategy — file purposes + tests-per-file list)
    - tests/admin-employer-list.test.ts (canonical supabase mock pattern — copy structure; phase 20-06 vi.hoisted precedent)
    - tests/setup.ts (test setup — confirm jest-dom + cleanup are global)
    - vitest.config.ts (confirm tests/**/*.test.{ts,tsx} include glob)
  </read_first>
  <action>
Create 6 vitest stub files (one per row in 17-VALIDATION.md per-task map) plus 1 UAT markdown. Use `it.todo()` for unimplemented assertions per Phase 20-01 precedent — Wave 1+ replaces `.todo` with real bodies as production code lands.

**File 1: `tests/saved-search-snapshot.test.ts`** (covers SRCH-13 pure functions)

```typescript
import { describe, it } from 'vitest'

describe('snapshotFilters', () => {
  it.todo('round-trips a typical filter set lossless via URLSearchParams')
  it.todo('excludes the page param even when present')
  it.todo('preserves multi-valued params (shed_type=rotary&shed_type=herringbone)')
  it.todo('preserves sort param (user-meaningful)')
  it.todo('returns empty string when no filter keys are set')
})

describe('deriveAutoName', () => {
  it.todo('returns shed-type label when single shed_type set ("Rotary")')
  it.todo('returns "in <region>" qualifier when single region set')
  it.todo('joins shed_type + region as "Rotary in Waikato"')
  it.todo('appends "+ accommodation" when accommodation_type set')
  it.todo('appends "+ visa sponsorship" when visa=true')
  it.todo('falls back to "Saved search YYYY-MM-DD" when no filters set')
  it.todo('truncates output to 50 chars with ellipsis when concat exceeds')
  it.todo('handles multi-valued shed_type as "<N> shed types"')
})
```

**File 2: `tests/saved-search-modal.test.tsx`** (covers SRCH-13 save modal RHF+Zod)

```tsx
import { describe, it } from 'vitest'

describe('Save search modal (SRCH-13)', () => {
  it.todo('renders Input + Button primitives, NOT StatusBanner')
  it.todo('pre-fills name field with deriveAutoName output')
  it.todo('shows inline role="alert" div when name is empty (NOT StatusBanner)')
  it.todo('rejects names exceeding 100 chars via Zod max constraint')
  it.todo('disables Submit button when name field empty')
  it.todo('Esc key closes the modal')
  it.todo('clicking backdrop closes the modal')
  it.todo('submits supabase.from("saved_searches").insert({user_id, name, search_params}) on Save')
  it.todo('unmounts fully on close (mirrors MarkFilledModal `if (!isOpen) return null` pattern)')
})
```

**File 3: `tests/saved-search-cap.test.tsx`** (covers SRCH-13 10-cap replace flow)

```tsx
import { describe, it } from 'vitest'

describe('10-cap replace flow (SRCH-13 edge case)', () => {
  it.todo('attempting 11th save when count=10 opens replace modal')
  it.todo('replace modal displays the OLDEST saved search name')
  it.todo('clicking Cancel closes modal without DB writes')
  it.todo('clicking Replace deletes oldest then inserts new (DB count remains 10)')
  it.todo('handleSaveAttempt issues `select count(*) head:true` before insert')
})
```

**File 4: `tests/saved-search-list.test.tsx`** (covers SRCH-15 + inline rename)

```tsx
import { describe, it } from 'vitest'

describe('SavedSearches list page (SRCH-15)', () => {
  it.todo('renders empty-state copy when no saved searches')
  it.todo('renders card-row per saved search with name + filter chips + Load + Delete')
  it.todo('Load button calls navigate("/jobs?<search_params>", { replace: false })')
  it.todo('Delete button shows sonner toast with Undo action and 5000ms duration')
  it.todo('Clicking Undo within 5s flips cancellation flag and skips DELETE')
  it.todo('onAutoClose fires supabase.from("saved_searches").delete().eq("id", id) when not cancelled')
  it.todo('Click on name enters inline edit mode (Input replaces heading)')
  it.todo('Enter key commits rename via supabase.from("saved_searches").update({name, updated_at})')
  it.todo('Escape key reverts draft to original name')
})
```

**File 5: `tests/saved-search-quick-load.test.tsx`** (covers SRCH-14 dropdown)

```tsx
import { describe, it } from 'vitest'

describe('Quick-load dropdown (SRCH-14)', () => {
  it.todo('button hidden when user is not signed in')
  it.todo('button hidden when no filters applied')
  it.todo('opening dropdown fetches top 5 saved searches ordered by created_at desc')
  it.todo('renders name + filter summary chips per row')
  it.todo('clicking row calls navigate("/jobs?<params>", { replace: false }) and closes dropdown')
  it.todo('"View all" link routes to /dashboard/seeker/saved-searches')
  it.todo('Esc key closes dropdown')
  it.todo('aria-haspopup="menu" and aria-expanded reflect open state')
})
```

**File 6: `tests/saved-search-load-integration.test.tsx`** (regression guard for JOBS-01 + commit `7401116`)

```tsx
import { describe, it } from 'vitest'

describe('Saved-search load integration (SRCH-14 regression)', () => {
  it.todo('navigate("/jobs?<saved-params>") triggers ONE fetchJobs call (JOBS-01 regression guard)')
  it.todo('match_scores embedded join uses jobs!inner shape; no null-joined crashes')
  it.todo('searchParams update does NOT add new useEffect deps to fetchJobs')
})
```

**File 7: `tests/saved-search-UAT.md`** (manual UAT script — copy from 17-VALIDATION.md §Manual-Only Verifications verbatim, reformatted as numbered steps)

```markdown
# Phase 17 — Manual UAT Script

> Run after Wave 4 ships and before `/gsd:verify-work`. Each item must PASS empirically.

## UAT Items

### 1. Save → load round-trip (SRCH-13 + SRCH-14)
**Why manual:** E2E URL-state restoration is jsdom-fragile.

Steps:
1. Sign in as seeker.
2. Navigate to `/jobs`. Set filters: `shed_type=rotary`, `region=Waikato`, `accommodation_type=couples`.
3. Click "Save search". Modal opens with auto-name pre-filled. Click Save.
4. Reload the browser tab.
5. Navigate to `/dashboard/seeker/saved-searches`. Confirm the new row exists with correct name + chips.
6. Click Load on the row. Confirm URL becomes `/jobs?shed_type=rotary&region=Waikato&accommodation_type=couples`.
7. Confirm result list reflects those filters (e.g., job count matches step 2).

**Pass:** URL params restored exactly; result list count matches step 2.

### 2. Delete with undo (SRCH-15)
**Why manual:** Sonner toast + 5s timer + DOM unmount-during-toast scenarios are timing-sensitive in jsdom.

Steps:
1. From `/dashboard/seeker/saved-searches`, click Delete on a row.
2. Click Undo within 5 seconds.
3. Open Supabase Studio SQL Editor: `select count(*) from saved_searches where id = '<id>'`.

**Pass:** Row reappears in list; SQL returns 1.

### 3. Delete without undo (SRCH-15)
**Why manual:** DB DELETE + RLS verification needs real Supabase connection.

Steps:
1. Click Delete on a row.
2. Wait 6 seconds without clicking Undo.
3. Run the same SQL count.

**Pass:** Row gone from list; SQL returns 0.

### 4. 10-cap replace (SRCH-13 UX)
**Why manual:** Multi-step modal flow + DB count assertion.

Steps:
1. Save 10 distinct searches (use varying filters or numeric suffixes).
2. Attempt 11th save.
3. Replace-oldest modal appears showing the OLDEST name.
4. Click Replace.
5. Open Supabase Studio: `select name, created_at from saved_searches where user_id = '<my_id>' order by created_at`.

**Pass:** Modal shows correct oldest name; after Replace, oldest is deleted and new is present; total count remains 10.

### 5. Cross-session persistence (SRCH-13 Roadmap criterion 4)
**Why manual:** Auth state + cross-session DB read.

Steps:
1. Save 2-3 searches as seeker A.
2. Sign out via Sidebar Sign Out button.
3. Sign back in as seeker A.
4. Navigate to `/dashboard/seeker/saved-searches`.

**Pass:** All saved searches still present.

### 6. Multi-tab race (SRCH-13 edge case, low priority)
**Why manual:** Cross-tab race condition cannot be simulated in jsdom.

Steps:
1. Sign in as seeker; ensure count = 9 saved.
2. Open two tabs both showing `/jobs` with filters applied.
3. Click Save in tab A and tab B as close to simultaneously as possible.

**Pass (acceptable):** Final count = 11 (acceptable +1 drift); no error toast fires.

### 7. RLS isolation seeker A vs seeker B (CLAUDE §1, ownership)
**Why manual:** Cannot mock RLS — needs two distinct authed users.

Steps:
1. Sign in as seeker A.
2. Open DevTools console: `await (await import('/src/lib/supabase')).supabase.from('saved_searches').select('*').eq('user_id', '<seeker_B_uuid>')`.

**Pass:** Returns empty array (RLS filters cross-user reads server-side).

### 8. RLS isolation anonymous (CLAUDE §1)
**Why manual:** Cannot mock RLS.

Steps:
1. Open incognito window (signed out).
2. Visit any TopFarms page so supabase client loads.
3. DevTools console: `await supabase.from('saved_searches').select('*')`.

**Pass:** Returns empty array regardless of seeker_id.

---

## Sign-off

- [ ] All 8 items PASS empirically
- [ ] Evidence captured (screenshots / SQL output) under `.planning/phases/17-saved-search/17-UAT-EVIDENCE/` if Item 7/8 surfaces drift
- [ ] If any item fails, ENUMERATE the gap as carryforward in v2.0-MILESTONE-AUDIT.md per CLAUDE §7 — do NOT flip REQUIREMENTS.md `[ ]` to `[x]` until ALL gaps closed.
```

After writing all 7 files, run `pnpm test -- --run tests/saved-search-*.test.{ts,tsx}` and confirm vitest reports the expected todo count (≈ 38 todos across 6 files) with 0 failures.
  </action>
  <verify>
    <automated>pnpm test -- --run tests/saved-search-snapshot.test.ts tests/saved-search-modal.test.tsx tests/saved-search-cap.test.tsx tests/saved-search-list.test.tsx tests/saved-search-quick-load.test.tsx tests/saved-search-load-integration.test.tsx</automated>
  </verify>
  <done>
    - 6 stub test files exist
    - tests/saved-search-UAT.md exists with 8 numbered UAT steps + sign-off block
    - vitest reports 0 failures (todos are accepted state)
    - grep -c "it.todo" tests/saved-search-snapshot.test.ts returns ≥ 13
    - grep -c "it.todo" tests/saved-search-modal.test.tsx returns ≥ 9
    - grep -c "it.todo" tests/saved-search-cap.test.tsx returns ≥ 5
    - grep -c "it.todo" tests/saved-search-list.test.tsx returns ≥ 9
    - grep -c "it.todo" tests/saved-search-quick-load.test.tsx returns ≥ 8
    - grep -c "it.todo" tests/saved-search-load-integration.test.tsx returns ≥ 3
    - grep -q "RLS isolation" tests/saved-search-UAT.md
  </done>
  <acceptance_criteria>
    - tests/saved-search-snapshot.test.ts contains "describe('snapshotFilters'"
    - tests/saved-search-snapshot.test.ts contains "describe('deriveAutoName'"
    - tests/saved-search-modal.test.tsx contains "describe('Save search modal"
    - tests/saved-search-modal.test.tsx contains "role=\"alert\"" OR contains "inline role" comment OR has it.todo describing inline alert
    - tests/saved-search-cap.test.tsx contains "describe('10-cap replace"
    - tests/saved-search-list.test.tsx contains "describe('SavedSearches"
    - tests/saved-search-quick-load.test.tsx contains "describe('Quick-load dropdown"
    - tests/saved-search-load-integration.test.tsx contains "describe('Saved-search load integration"
    - tests/saved-search-UAT.md contains "Save → load round-trip"
    - tests/saved-search-UAT.md contains "10-cap replace"
    - tests/saved-search-UAT.md contains "RLS isolation"
    - `pnpm test -- --run tests/saved-search-*.test.{ts,tsx}` exits 0 (todos do not fail)
  </acceptance_criteria>
</task>

</tasks>

<verification>
Run `pnpm test -- --run tests/saved-search-*.test.{ts,tsx}` — expect green (todos OK, 0 failures, 0 passes for these files).

Run `pnpm test -- --run` (full suite) — expect 174 passed | <todos> | 0 failed; baseline preserved.

`tsc --noEmit` clean (test files use TS strict mode; type errors in stubs would fail the gate).
</verification>

<success_criteria>
- 6 stub test files exist on disk and import without errors
- 1 UAT markdown exists with 8 numbered steps
- vitest collection succeeds with 0 failures
- One atomic commit per CLAUDE §4
</success_criteria>

<output>
After completion, create `.planning/phases/17-saved-search/17-00-SUMMARY.md` covering:
- Files created (7)
- vitest todo count (≈ 47 across all 6 files)
- Confirmation that production-code-touching plans (01-04) now have `<verify>` targets
</output>
