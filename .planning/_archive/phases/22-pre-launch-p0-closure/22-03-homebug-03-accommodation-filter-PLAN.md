---
phase: 22-pre-launch-p0-closure
plan: "03"
type: execute
wave: 1
depends_on: ["22-00"]
files_modified:
  - src/pages/jobs/JobSearch.tsx
autonomous: true
requirements: [HOMEBUG-03]
must_haves:
  truths:
    - "JobSearch.tsx declares an ACCOMMODATION_FILTER_TO_DB lookup constant mapping URL param values (lowercase/snake_case) to DB Title Case strings"
    - "fetchJobs remaps incoming `accommodation_type` URL params through ACCOMMODATION_FILTER_TO_DB before passing to .overlaps('employer_profiles.accommodation_extras', ...)"
    - "PostgREST GET /rest/v1/jobs?...accommodation_extras=ov.{Couples+welcome,Pets+allowed,...} returns 200 (not 400 / empty)"
    - "House and cottage filter values (TYPE column, not EXTRAS) are NOT remapped — they fall through and are simply not present in the lookup table; documented as Claude's discretion per research §Open Question 1"
    - "Wave 0 test tests/jobsearch-accommodation-remap.test.ts flips from RED to GREEN"
  artifacts:
    - path: "src/pages/jobs/JobSearch.tsx"
      provides: "ACCOMMODATION_FILTER_TO_DB lookup constant + remap wired into fetchJobs accommodation_type handler"
      contains: "ACCOMMODATION_FILTER_TO_DB"
  key_links:
    - from: "src/pages/jobs/JobSearch.tsx fetchJobs accommodation handler (~lines 273-279)"
      to: "Postgres employer_profiles.accommodation_extras text[] column (Title Case values from migration 013)"
      via: "lookup-table remap before PostgREST .overlaps() call"
      pattern: "ACCOMMODATION_FILTER_TO_DB\\["
---

<objective>
Close HOMEBUG-03: FilterSidebar Couples + Accommodation filters trigger backend errors on `/jobs`. Root cause (per `22-RESEARCH.md §Pattern 3`, HIGH confidence): a 3-layer mismatch.
- **Layer 1 (UI emission):** `FilterSidebar.tsx:43-49` emits URL param values `couples`, `family`, `pet_friendly` (lowercase, snake_case)
- **Layer 2 (handler):** `JobSearch.tsx:276-279` passes raw URL values straight to PostgREST `.overlaps(...)` 
- **Layer 3 (DB):** `employer_profiles.accommodation_extras` stores Title Case values (`'Couples welcome'`, `'Family welcome'`, `'Pets allowed'`) per migration `013_phase8_wizard_fields.sql:30-37` and `src/types/domain.ts:327-336`

Fix: **Layer 2 remap** (research-recommended; minimum cross-cutting impact). Add a module-level `ACCOMMODATION_FILTER_TO_DB` constant in `JobSearch.tsx` mapping the 3 extras values; remap incoming `accommodation_type` URL params through it before the `.overlaps()` call.

**Open Question (research §Open Q1):** `house` and `cottage` values from FilterSidebar map to `employer_profiles.accommodation_type` (singular column, text) — NOT `accommodation_extras` (array column). Planner decision per `<plan_specific_guidance>`: **DO NOT remap `house` / `cottage` in this plan.** They will fall through ACCOMMODATION_FILTER_TO_DB (lookup returns undefined → filtered by `.filter(Boolean)`) and effectively become no-ops for the extras filter. If a future plan adds a separate `accommodation_type` (TYPE) filter handler, it would target the singular column directly — that is OUT OF SCOPE for HOMEBUG-03.

Per CLAUDE §3 (diagnose before fix), Task 1 captures the DevTools Network 400/empty response when the filter is toggled, confirming the Layer 2 mismatch before applying the Layer 2 fix. Task 2 lands the constant + wires the remap.

Purpose: Top-of-funnel breaker — seekers using the accommodation filter (a key differentiator for ag jobs) see a broken/empty search. Fix unblocks job search conversion for the accommodation-sensitive seeker segment.

Output: 1 file modified (`src/pages/jobs/JobSearch.tsx`); Wave 0 spec GREEN; ready for Wave 2 prod UAT (Step 3 of `tests/p0-prod-smoke-UAT.md`).
</objective>

<execution_context>
@/Users/harrysmith/.claude/get-shit-done/workflows/execute-plan.md
@/Users/harrysmith/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/REQUIREMENTS.md
@.planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md
@.planning/phases/22-pre-launch-p0-closure/22-VALIDATION.md
@CLAUDE.md

# File modified
@src/pages/jobs/JobSearch.tsx

# UI emission layer (DO NOT MODIFY — we fix Layer 2, not Layer 1)
@src/components/ui/FilterSidebar.tsx

# DB shape source-of-truth (DO NOT MODIFY)
@src/types/domain.ts
@supabase/migrations/013_phase8_wizard_fields.sql

# Wave 0 spec to flip GREEN
@tests/jobsearch-accommodation-remap.test.ts

<interfaces>
src/components/ui/FilterSidebar.tsx:43-49 — Layer 1 (UI emission), DO NOT MODIFY:
```typescript
const ACCOMMODATION_OPTIONS = [
  { value: 'house', label: 'House' },
  { value: 'cottage', label: 'Cottage' },
  { value: 'pet_friendly', label: 'Pet-friendly' },
  { value: 'couples', label: 'Couples welcome' },
  { value: 'family', label: 'Family-friendly' },
]
```
Each toggle dispatches `toggleMultiValue('accommodation_type', value)` which sets URL params like `?accommodation_type=couples&accommodation_type=pet_friendly`.

src/pages/jobs/JobSearch.tsx:273-279 — Layer 2 (handler), THE DEFECT SITE:
```typescript
// Accommodation multi-option filter — operates on employer_profiles.accommodation_extras
// via PostgREST embed filter. Requires the !inner hint on the employer_profiles select above
// so the filter prunes the parent jobs result, not just the embedded employer rows.
const accommodationTypes = searchParams.getAll('accommodation_type')
if (accommodationTypes.length > 0) {
  query = query.overlaps('employer_profiles.accommodation_extras', accommodationTypes)  // <-- raw URL values passed directly
}
```

src/types/domain.ts:327-336 — DB-stored values (Title Case, source-of-truth for accommodation_extras column):
```typescript
export const ACCOMMODATION_EXTRAS_OPTIONS: { value: string; label: string }[] = [
  { value: 'Pets allowed',        label: 'Pets allowed' },
  { value: 'Couples welcome',     label: 'Couples welcome' },
  { value: 'Family welcome',      label: 'Family welcome' },
  { value: 'Utilities included',  label: 'Utilities included' },
  { value: 'Furnished',           label: 'Furnished' },
  { value: 'Garden',              label: 'Garden' },
  { value: 'Garage',              label: 'Garage' },
  { value: 'Internet included',   label: 'Internet included' },
]
```

supabase/migrations/013_phase8_wizard_fields.sql:30-37 — Title Case writer (source of DB values):
```sql
UPDATE public.employer_profiles SET accommodation_extras = ARRAY[]::text[]
  || CASE WHEN accommodation_couples = true THEN ARRAY['Couples welcome'] ELSE ARRAY[]::text[] END
  || CASE WHEN accommodation_family = true THEN ARRAY['Family welcome'] ELSE ARRAY[]::text[] END
  || CASE WHEN accommodation_pets = true THEN ARRAY['Pets allowed'] ELSE ARRAY[]::text[] END
  ...
```

POST-FIX target shape (from 22-RESEARCH.md §Example 3):
```typescript
// Module-level (top of file, near other module-level consts):
const ACCOMMODATION_FILTER_TO_DB: Record<string, string> = {
  couples: 'Couples welcome',
  family: 'Family welcome',
  pet_friendly: 'Pets allowed',
  // Note: 'house' and 'cottage' are accommodation TYPES (employer_profiles.accommodation_type — singular column),
  // not extras. They intentionally do NOT appear in this lookup; they will be filtered out by .filter(Boolean)
  // and become no-ops for the extras filter. A future plan could add a separate handler for the TYPE column.
}

// In fetchJobs (replacing the existing handler at lines 273-279):
// Accommodation multi-option filter — operates on employer_profiles.accommodation_extras
// via PostgREST embed filter. URL params use lowercase/snake_case (e.g. 'couples', 'pet_friendly');
// DB stores Title Case ('Couples welcome', 'Pets allowed') per migration 013_phase8_wizard_fields.sql
// and src/types/domain.ts:327-336. Remap via ACCOMMODATION_FILTER_TO_DB before .overlaps().
const accommodationTypes = searchParams.getAll('accommodation_type')
if (accommodationTypes.length > 0) {
  const dbValues = accommodationTypes
    .map((v) => ACCOMMODATION_FILTER_TO_DB[v])
    .filter(Boolean)
  if (dbValues.length > 0) {
    query = query.overlaps('employer_profiles.accommodation_extras', dbValues)
  }
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Diagnostic — capture DevTools Network evidence for accommodation filter Layer 2 mismatch</name>
  <files>.planning/phases/22-pre-launch-p0-closure/22-03-DIAGNOSIS.md</files>
  <read_first>
    - src/pages/jobs/JobSearch.tsx (lines 273-279 — the defect site)
    - src/components/ui/FilterSidebar.tsx (lines 43-49 — Layer 1 values; do not modify)
    - src/types/domain.ts:327-336 (Title Case DB values — Layer 3 reference)
    - supabase/migrations/013_phase8_wizard_fields.sql lines 17-44 (DB writer that establishes the Title Case convention)
    - .planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md §Pattern 3 + §Pitfall 4 (PostgREST diagnostic discipline) + §Open Question 1 (house/cottage TYPE-vs-EXTRAS scope decision)
    - CLAUDE.md §3 (diagnose before fix)
  </read_first>
  <action>
    Per CLAUDE §3 + research §Pattern 3, capture three things:
    1. The Layer 1 emission (what URL params FilterSidebar dispatches when Couples is toggled)
    2. The Layer 2 PostgREST request (what the .overlaps() call generates with raw URL values)
    3. The Layer 3 column state (what values are actually stored in `employer_profiles.accommodation_extras` in prod)

    All three are read-only diagnostics.

    **Option A (browser DevTools, against live prod or dev):**
    1. Open `https://top-farms.vercel.app/jobs` (or `localhost:5173/jobs` if testing local)
    2. DevTools → Network → preserve log ON, filter "jobs?"
    3. Open FilterSidebar → toggle "Couples welcome" checkbox
    4. Capture the URL change: `?accommodation_type=couples`
    5. Capture the PostgREST request URL — look for `employer_profiles.accommodation_extras=ov.%7Bcouples%7D` (URL-encoded `ov.{couples}`)
    6. Capture the response — should be 400 OR 200 with empty result (depending on Postgres array operator behavior with mismatched-case strings)
    7. Toggle additional "Pet-friendly" — capture combined URL `?accommodation_type=couples&accommodation_type=pet_friendly` and the PostgREST `ov.{couples,pet_friendly}`

    **Option B (Supabase MCP, read-only — verifies Layer 3 column state):**
    ```sql
    -- Confirm column type + sample values
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employer_profiles'
      AND column_name = 'accommodation_extras';
    -- Expected: text[]

    -- Sample real values stored in the column
    SELECT DISTINCT unnest(accommodation_extras) AS extra
    FROM public.employer_profiles
    WHERE accommodation_extras IS NOT NULL
      AND array_length(accommodation_extras, 1) > 0
    ORDER BY extra
    LIMIT 30;
    -- Expected: Title Case strings: 'Couples welcome', 'Family welcome', 'Pets allowed', etc.
    -- Confirms Layer 3 stores Title Case, not lowercase.

    -- Test the failing query shape (what the current handler generates)
    -- Use the embed shape PostgREST would generate
    SELECT j.id, j.title, ep.accommodation_extras
    FROM public.jobs j
    INNER JOIN public.employer_profiles ep ON ep.id = j.employer_id
    WHERE j.status = 'active'
      AND ep.accommodation_extras && ARRAY['couples']::text[]  -- raw URL value (lowercase, no "welcome" suffix)
    LIMIT 5;
    -- Expected: 0 rows (array overlap is case-sensitive — 'couples' ≠ 'Couples welcome')

    -- Test the fix shape
    SELECT j.id, j.title, ep.accommodation_extras
    FROM public.jobs j
    INNER JOIN public.employer_profiles ep ON ep.id = j.employer_id
    WHERE j.status = 'active'
      AND ep.accommodation_extras && ARRAY['Couples welcome']::text[]  -- remapped value
    LIMIT 5;
    -- Expected: rows return for any employer profile that wrote 'Couples welcome' to accommodation_extras
    ```

    **Output:** create `.planning/phases/22-pre-launch-p0-closure/22-03-DIAGNOSIS.md` with this template:

    ```markdown
    # HOMEBUG-03 — Accommodation Filter Layer 2 Mismatch Diagnosis

    **Date:** 2026-05-{DD}
    **Method:** {A / B}
    **Operator:** {name}

    ## Layer 1 — UI Emission (FilterSidebar.tsx:43-49)

    Confirmed values dispatched on toggle:
    - `couples` → URL param `?accommodation_type=couples`
    - `family` → URL param `?accommodation_type=family`
    - `pet_friendly` → URL param `?accommodation_type=pet_friendly`
    - `house` → URL param `?accommodation_type=house` (TYPE column, out of scope for this fix)
    - `cottage` → URL param `?accommodation_type=cottage` (TYPE column, out of scope)

    ## Layer 2 — Current Handler Behavior (JobSearch.tsx:273-279)

    Raw URL values pass through to PostgREST .overlaps():
    ```
    GET /rest/v1/jobs?...&employer_profiles.accommodation_extras=ov.%7Bcouples%2Cpet_friendly%7D
    ```
    Response: {status / body — 400 OR 200-with-empty-results}

    ## Layer 3 — DB Column State (employer_profiles.accommodation_extras)

    Column type: `text[]`. Sample distinct values from prod:
    ```
    Couples welcome
    Family welcome
    Furnished
    Garden
    Internet included
    Pets allowed
    Utilities included
    ```

    Confirms DB stores Title Case (matching `src/types/domain.ts:327-336`), not lowercase.

    ## Verdict

    Layer 1 emits lowercase; Layer 3 stores Title Case; Layer 2 passes raw Layer 1 values to Layer 3. Mismatch confirmed. Fix at Layer 2 (research-recommended; isolated to JobSearch.tsx).

    **Scope decision (research §Open Q1):** `house` and `cottage` map to `employer_profiles.accommodation_type` (singular column, NOT in `accommodation_extras` array). They will NOT be remapped in ACCOMMODATION_FILTER_TO_DB; they fall through `.filter(Boolean)` and become no-ops for the extras filter. A future plan can add a separate handler for the TYPE column.
    ```
  </action>
  <verify>
    <automated>test -f .planning/phases/22-pre-launch-p0-closure/22-03-DIAGNOSIS.md && grep -E "Title Case" .planning/phases/22-pre-launch-p0-closure/22-03-DIAGNOSIS.md && grep -E "Layer 2" .planning/phases/22-pre-launch-p0-closure/22-03-DIAGNOSIS.md</automated>
  </verify>
  <acceptance_criteria>
    - `test -f .planning/phases/22-pre-launch-p0-closure/22-03-DIAGNOSIS.md` exits 0
    - `grep -E "Layer 1" .planning/phases/22-pre-launch-p0-closure/22-03-DIAGNOSIS.md` returns ≥1 match
    - `grep -E "Layer 2" .planning/phases/22-pre-launch-p0-closure/22-03-DIAGNOSIS.md` returns ≥1 match
    - `grep -E "Layer 3" .planning/phases/22-pre-launch-p0-closure/22-03-DIAGNOSIS.md` returns ≥1 match
    - `grep -E "Couples welcome|Family welcome|Pets allowed" .planning/phases/22-pre-launch-p0-closure/22-03-DIAGNOSIS.md` returns ≥3 matches (sample DB values cited)
    - `grep -E "Verdict" .planning/phases/22-pre-launch-p0-closure/22-03-DIAGNOSIS.md` returns ≥1 match
    - `grep -E "house|cottage" .planning/phases/22-pre-launch-p0-closure/22-03-DIAGNOSIS.md` returns ≥2 matches (scope decision documented)
  </acceptance_criteria>
  <done>
    Diagnostic document records: Layer 1 emission shape (lowercase URL params), Layer 2 PostgREST behavior (raw pass-through), Layer 3 DB column state (Title Case array). Scope decision for `house`/`cottage` (out of scope) documented. Ready for Task 2 fix.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Fix — add ACCOMMODATION_FILTER_TO_DB constant + wire remap in fetchJobs handler</name>
  <files>src/pages/jobs/JobSearch.tsx</files>
  <read_first>
    - src/pages/jobs/JobSearch.tsx (full file — find suitable location for module-level constant near other constants; find the accommodation handler at lines 273-279)
    - .planning/phases/22-pre-launch-p0-closure/22-03-DIAGNOSIS.md (Task 1 output)
    - tests/jobsearch-accommodation-remap.test.ts (Wave 0 RED spec — the assertion targets)
    - .planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md §Example 3 (verbatim fix shape) + §Pitfall 6 (Layer 3 column type already correct — DO NOT add a migration)
    - .planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md §Don't Hand-Roll table row 3 (use module-level const, not React state)
  </read_first>
  <behavior>
    - Test 1 (Wave 0 spec): JobSearch.tsx contains module-level `const ACCOMMODATION_FILTER_TO_DB: Record<string, string> = { ... }`.
    - Test 2 (Wave 0 spec): the lookup maps at minimum 3 keys: `couples → 'Couples welcome'`, `family → 'Family welcome'`, `pet_friendly → 'Pets allowed'`.
    - Test 3 (Wave 0 spec): `ACCOMMODATION_FILTER_TO_DB[` is referenced in fetchJobs (lookup wired, not dead code).
    - Test 4 (Wave 0 spec): NO raw `.overlaps('employer_profiles.accommodation_extras', accommodationTypes)` pattern remains (the direct pass-through is gone).
  </behavior>
  <action>
    Use the Edit tool to make TWO additions to `src/pages/jobs/JobSearch.tsx`:

    **Edit 1: Add module-level constant near other top-of-file constants**

    Read the top of `JobSearch.tsx` to find a good anchor — typically constants live between imports and the component function. Pick a location near other domain-related constants (e.g., near where `useSearchParams` is destructured, or near the top of the function, or just below the existing imports). The constant MUST be module-level (top of file, OUTSIDE any function) so it doesn't allocate per render.

    Anchor: look for an existing top-of-file constant or the start of the JobSearch component. Insert ABOVE the JobSearch component declaration:

    ```typescript
    /**
     * Maps FilterSidebar URL param values (lowercase/snake_case from
     * src/components/ui/FilterSidebar.tsx:43-49 ACCOMMODATION_OPTIONS) to the
     * Title Case strings stored in employer_profiles.accommodation_extras
     * (per supabase/migrations/013_phase8_wizard_fields.sql:30-37 and
     * src/types/domain.ts:327-336 ACCOMMODATION_EXTRAS_OPTIONS).
     *
     * `house` and `cottage` are accommodation TYPES (employer_profiles.accommodation_type,
     * singular column) — NOT extras — and intentionally absent from this lookup.
     * They fall through .filter(Boolean) below and become no-ops for the extras filter.
     * Closes HOMEBUG-03 via Layer 2 remap (research §Pattern 3, §Example 3).
     */
    const ACCOMMODATION_FILTER_TO_DB: Record<string, string> = {
      couples: 'Couples welcome',
      family: 'Family welcome',
      pet_friendly: 'Pets allowed',
    }
    ```

    **Edit 2: Update the accommodation handler in fetchJobs (lines 273-279)**

    BEFORE (lines 273-279):
    ```typescript
        // Accommodation multi-option filter — operates on employer_profiles.accommodation_extras
        // via PostgREST embed filter. Requires the !inner hint on the employer_profiles select above
        // so the filter prunes the parent jobs result, not just the embedded employer rows.
        const accommodationTypes = searchParams.getAll('accommodation_type')
        if (accommodationTypes.length > 0) {
          query = query.overlaps('employer_profiles.accommodation_extras', accommodationTypes)
        }
    ```

    AFTER:
    ```typescript
        // Accommodation multi-option filter — operates on employer_profiles.accommodation_extras
        // via PostgREST embed filter. Requires the !inner hint on the employer_profiles select above
        // so the filter prunes the parent jobs result, not just the embedded employer rows.
        // URL params use lowercase/snake_case (FilterSidebar ACCOMMODATION_OPTIONS); DB stores
        // Title Case (per migration 013 + domain.ts ACCOMMODATION_EXTRAS_OPTIONS).
        // Remap via ACCOMMODATION_FILTER_TO_DB lookup before .overlaps(). HOMEBUG-03 fix.
        const accommodationTypes = searchParams.getAll('accommodation_type')
        if (accommodationTypes.length > 0) {
          const dbValues = accommodationTypes
            .map((v) => ACCOMMODATION_FILTER_TO_DB[v])
            .filter(Boolean)
          if (dbValues.length > 0) {
            query = query.overlaps('employer_profiles.accommodation_extras', dbValues)
          }
        }
    ```

    Key invariants:
    - The constant is module-level (OUTSIDE the component function — verify after edit via grep that it's not nested inside a `function` or `const X = () =>` block).
    - The handler now branches on `dbValues.length > 0` AFTER the remap+filter — this prevents calling `.overlaps()` with an empty array if all URL values were TYPE values (house/cottage).
    - The `accommodationTypes` declaration is retained for the typeof guard at the outer `if`.
    - The `!inner` hint on the employer_profiles select clause (referenced in the comment) is UNCHANGED — that lives upstream in the `.select()` call at ~line 215 and is not part of this fix.
  </action>
  <verify>
    <automated>pnpm test tests/jobsearch-accommodation-remap.test.ts --run 2>&1 | tail -15 — expect all 4 assertions PASS (Wave 0 RED → GREEN); pnpm exec tsc -b 2>&1 | grep "JobSearch.tsx" — expect no new TS errors; pnpm test tests/saved-search-load-integration.test.tsx --run — expect existing JOBS-01 regression guard tests still PASS (no fetchJobs deps array change)</automated>
  </verify>
  <acceptance_criteria>
    - `grep -cE "ACCOMMODATION_FILTER_TO_DB" src/pages/jobs/JobSearch.tsx` returns at least `2` (1 declaration + ≥1 use)
    - `grep -E "const ACCOMMODATION_FILTER_TO_DB: Record<string, string> = \\{" src/pages/jobs/JobSearch.tsx` returns exactly `1` match (declaration)
    - `grep -E "couples: 'Couples welcome'" src/pages/jobs/JobSearch.tsx` returns 1 match
    - `grep -E "family: 'Family welcome'" src/pages/jobs/JobSearch.tsx` returns 1 match
    - `grep -E "pet_friendly: 'Pets allowed'" src/pages/jobs/JobSearch.tsx` returns 1 match
    - `grep -E "\\.overlaps\\('employer_profiles\\.accommodation_extras', accommodationTypes\\)" src/pages/jobs/JobSearch.tsx` returns 0 matches (raw pass-through gone)
    - `grep -E "\\.overlaps\\('employer_profiles\\.accommodation_extras', dbValues\\)" src/pages/jobs/JobSearch.tsx` returns 1 match (remapped values used)
    - `grep -E "house|cottage" src/pages/jobs/JobSearch.tsx | grep -i "ACCOMMODATION_FILTER_TO_DB"` returns 0 matches — house/cottage NOT in the lookup, only in the explanatory comment
    - `pnpm test tests/jobsearch-accommodation-remap.test.ts --run` — all 4 assertions PASS
    - `pnpm test tests/saved-search-load-integration.test.tsx --run` — JOBS-01 regression guards still PASS (`[searchParams, authLoading]` deps unchanged; no fetchJobs-loop regression introduced)
    - `pnpm exec tsc -b 2>&1 | grep "src/pages/jobs/JobSearch.tsx"` — zero NEW TypeScript errors
  </acceptance_criteria>
  <done>
    `src/pages/jobs/JobSearch.tsx` has module-level `ACCOMMODATION_FILTER_TO_DB` constant with 3 mappings (couples/family/pet_friendly → Title Case) + fetchJobs handler remaps via the lookup before `.overlaps()`. Wave 0 spec fully GREEN. JOBS-01 regression guard intact. Ready for Wave 2 prod UAT.
  </done>
</task>

</tasks>

<verification>
After all 2 tasks complete:

```bash
# Diagnosis captured
test -f .planning/phases/22-pre-launch-p0-closure/22-03-DIAGNOSIS.md
grep -E "Title Case" .planning/phases/22-pre-launch-p0-closure/22-03-DIAGNOSIS.md

# Constant + remap landed
grep -nE "ACCOMMODATION_FILTER_TO_DB" src/pages/jobs/JobSearch.tsx
# Expected:
#  - 1 line: const declaration
#  - ≥1 line: lookup use inside fetchJobs

# Raw pass-through is gone
grep -E "\.overlaps\('employer_profiles\.accommodation_extras', accommodationTypes\)" src/pages/jobs/JobSearch.tsx
# Expected: 0 matches

# Wave 0 spec GREEN
pnpm test tests/jobsearch-accommodation-remap.test.ts --run

# JOBS-01 regression guard preserved (CRITICAL — fetchJobs useEffect deps array MUST NOT change)
pnpm test tests/saved-search-load-integration.test.tsx --run

# Full suite + typecheck
pnpm test --run 2>&1 | tail -5
pnpm exec tsc -b 2>&1 | grep "JobSearch.tsx" | grep -v "node_modules"
```

**Atomic commit per CLAUDE §4:** Tasks 1 + 2 land as ONE commit (diagnosis doc + code fix). 

Commit message format: `fix(22-03): HOMEBUG-03 — Layer 2 remap accommodation filter URL params to DB Title Case`

Includes:
- `src/pages/jobs/JobSearch.tsx` (constant + handler edit)
- `.planning/phases/22-pre-launch-p0-closure/22-03-DIAGNOSIS.md` (3-layer evidence)

After Wave 2 deploys + UAT Step 3 confirms 200 in prod, HOMEBUG-03 can move to closed state in `REQUIREMENTS.md` (handled in plan 22-04 — not here).
</verification>

<success_criteria>
- `tests/jobsearch-accommodation-remap.test.ts` Wave 0 RED → fully GREEN (all 4 assertions pass)
- `ACCOMMODATION_FILTER_TO_DB` declared at module level with 3 minimum mappings
- fetchJobs accommodation handler wires the lookup via `.map(v => ACCOMMODATION_FILTER_TO_DB[v]).filter(Boolean)`
- Raw `accommodationTypes` array NO LONGER passed directly to `.overlaps()`
- `house` and `cottage` intentionally NOT in lookup (out-of-scope per research §Open Q1; documented in code comment)
- JOBS-01 regression guard (saved-search-load-integration.test.tsx) still PASSES (fetchJobs deps array unchanged)
- Zero regression in vitest full suite or TypeScript build
- Single atomic commit covers diagnosis + fix
</success_criteria>

<output>
After completion, create `.planning/phases/22-pre-launch-p0-closure/22-03-homebug-03-accommodation-filter-SUMMARY.md` documenting:
- Diagnosis (Task 1) — 3-layer evidence, Layer 2 mismatch confirmed
- Fix (Task 2) — module-level constant + handler remap, Wave 0 spec RED→GREEN evidence
- Scope decision: house/cottage out of scope (TYPE column, not extras) — documented per research §Open Q1
- Atomic commit SHA
- Carryforward: Wave 2 plan 22-04 Step 3 must verify 200 in production
- Future-work flag: if `house`/`cottage` filtering becomes important post-launch, add a separate handler for `employer_profiles.accommodation_type` (singular column)
</output>
