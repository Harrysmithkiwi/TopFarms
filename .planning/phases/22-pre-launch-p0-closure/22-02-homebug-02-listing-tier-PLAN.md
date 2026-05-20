---
phase: 22-pre-launch-p0-closure
plan: "02"
type: execute
wave: 1
depends_on: ["22-00"]
files_modified:
  - src/components/landing/FeaturedListings.tsx
autonomous: true
requirements: [HOMEBUG-02]
must_haves:
  truths:
    - "Home page featured listings query at FeaturedListings.tsx:133 passes integer tier values [2, 3] to .in('listing_tier', ...)"
    - "PostgREST GET /rest/v1/jobs?...listing_tier=in.(2,3) returns 200 (not 400 with SQLSTATE 22P02)"
    - "Featured/Premium badge rendering via getTierBadge helper remains intact for integer tier values"
    - "Wave 0 test tests/featured-listings-tier-type.test.ts flips from RED to GREEN"
  artifacts:
    - path: "src/components/landing/FeaturedListings.tsx"
      provides: "Integer-typed listing_tier filter at line 133 matching Postgres schema (int NOT NULL DEFAULT 1)"
      contains: "[2, 3]"
  key_links:
    - from: "src/components/landing/FeaturedListings.tsx fetchJobs"
      to: "Postgres jobs.listing_tier column (int)"
      via: "PostgREST .in() filter with int-typed array"
      pattern: "\\.in\\(\\s*'listing_tier'\\s*,\\s*\\[\\s*2"
---

<objective>
Close HOMEBUG-02: home page `jobs?select=...` query returns 400. Root cause (per `22-RESEARCH.md §Pattern 2`, HIGH confidence): `FeaturedListings.tsx:133` passes string values `['featured', 'premium']` to `.in('listing_tier', ...)` but the schema column is `int NOT NULL DEFAULT 1` (`supabase/migrations/001_initial_schema.sql:129`, verified). Postgres returns SQLSTATE `22P02` (invalid_text_representation): `invalid input syntax for type integer: "featured"`.

The fix is a 1-line change at line 133 ONLY. Line 147 is the FALLBACK query — it does NOT contain a `.in('listing_tier', ...)` call (it filters only by `status='active'` + order + limit). The research planning_guidance saying "same change at line 147" is INCORRECT for this codebase — line 147 has no defect to fix.

Per CLAUDE §3 (diagnose before fix), Task 1 captures the PostgREST 400 response body from prod/dev DevTools Network to confirm the SQLSTATE before changing code. Task 2 lands the int-form fix.

Purpose: Top-of-funnel breaker — home page featured listings section renders silently empty for ALL visitors. First impression of the site is broken. Fix unblocks homepage trust signal.

Output: 1 file modified (`src/components/landing/FeaturedListings.tsx`); Wave 0 spec GREEN; ready for Wave 2 prod UAT (Step 2 of `tests/p0-prod-smoke-UAT.md`).
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
@src/components/landing/FeaturedListings.tsx

# Schema source-of-truth (do not modify)
@supabase/migrations/001_initial_schema.sql

# Wave 0 spec to flip GREEN
@tests/featured-listings-tier-type.test.ts

<interfaces>
src/components/landing/FeaturedListings.tsx — CURRENT shape (lines 124-156):
```typescript
// Line 33-38 (getTierBadge helper — DO NOT MODIFY; handles BOTH int and string forms):
function getTierBadge(tier: string | number): { label: string; color: string; bg: string } | null {
  const t = String(tier)
  if (t === '3' || t === 'premium') return { label: 'Premium', ... }
  if (t === '2' || t === 'featured') return { label: 'Featured', ... }
  return null
}

// Line 124-135 (PRIMARY query — line 133 is the defect):
useEffect(() => {
  async function fetchJobs() {
    // First try featured/premium jobs
    const { data: featuredData } = await supabase
      .from('jobs')
      .select(
        'id, title, region, contract_type, salary_min, salary_max, listing_tier, created_at, shed_type, accommodation, visa_sponsorship, couples_welcome, employer_profiles!inner(farm_name, region, id)'
      )
      .eq('status', 'active')
      .in('listing_tier', ['featured', 'premium'])  // <-- LINE 133, the defect (strings to int column)
      .order('created_at', { ascending: false })
      .limit(6)
    ...
```

Line 144-151 (FALLBACK query — no listing_tier filter, only status/order/limit; DO NOT MODIFY):
```typescript
// Fallback: show up to 3 most recent active jobs of any tier
const { data: fallbackData } = await supabase
  .from('jobs')
  .select(
    'id, title, region, contract_type, salary_min, salary_max, listing_tier, created_at, shed_type, accommodation, visa_sponsorship, couples_welcome, employer_profiles!inner(farm_name, region, id)'
  )
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(3)
```

POST-FIX target shape — change ONLY line 133:
```typescript
.in('listing_tier', [2, 3])  // 2=featured, 3=premium per getTierBadge helper convention
```

Schema fact: `supabase/migrations/001_initial_schema.sql:129` declares `listing_tier int NOT NULL DEFAULT 1`. No subsequent migration (002-033) changes this type — verified via grep in research §Pattern 2.

Tier mapping convention (from getTierBadge):
- 1 = (default — no badge rendered)
- 2 = Featured
- 3 = Premium
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Diagnostic — capture PostgREST 400 SQLSTATE from prod DevTools Network</name>
  <files>.planning/phases/22-pre-launch-p0-closure/22-02-DIAGNOSIS.md</files>
  <read_first>
    - src/components/landing/FeaturedListings.tsx (lines 124-156 — full fetchJobs handler)
    - supabase/migrations/001_initial_schema.sql lines 125-135 (listing_tier column declaration)
    - .planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md §Pattern 2 + §Pitfall 4 (PostgREST 400 diagnostic discipline — capture SQLSTATE not just status code)
    - CLAUDE.md §3 (diagnose before fix discipline)
  </read_first>
  <action>
    Per CLAUDE §3 + research §Pitfall 4, capture the PostgREST 400 response body to confirm the SQLSTATE is `22P02` (invalid_text_representation) rather than `42703` (undefined_column) or `42501` (RLS rejection). Different SQLSTATE codes would mean different fixes.

    Two options for capture (operator's choice — both produce the same diagnostic evidence):

    **Option A (browser DevTools, against live prod):**
    1. Open `https://top-farms.vercel.app/` in a fresh incognito window
    2. Open DevTools → Network tab → preserve log ON
    3. Refresh the page
    4. Find the `jobs?select=...&status=eq.active&listing_tier=in.%28%22featured%22%2C%22premium%22%29...` request
    5. Click the request → Response tab → copy the response body
    6. Expected (per research): `{"code":"22P02","details":null,"hint":null,"message":"invalid input syntax for type integer: \"featured\""}` — or similar shape

    **Option B (curl against the same Supabase project):**
    ```bash
    curl -sS "https://inlagtgpynemhipnqvty.supabase.co/rest/v1/jobs?select=id%2Clisting_tier&status=eq.active&listing_tier=in.%28%22featured%22%2C%22premium%22%29&limit=6" \
      -H "apikey: $SUPABASE_ANON_KEY" \
      -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
      -w "\nHTTP_STATUS: %{http_code}\n"
    ```
    (Use `$SUPABASE_ANON_KEY` from `.env.local` or Vercel env vars.)

    **Option C (Supabase MCP, read-only):**
    ```sql
    -- Verify column type is int (rules out schema-drift hypothesis)
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jobs'
      AND column_name = 'listing_tier';
    ```
    Expected result: `listing_tier | integer | NO | 1`.

    Then test the failing query shape directly:
    ```sql
    SELECT id, listing_tier FROM jobs WHERE status='active' AND listing_tier IN ('featured', 'premium') LIMIT 6;
    ```
    Expected result: ERROR with SQLSTATE `22P02`, message `invalid input syntax for type integer: "featured"`.

    **Output:** create `.planning/phases/22-pre-launch-p0-closure/22-02-DIAGNOSIS.md` with this template:

    ```markdown
    # HOMEBUG-02 — PostgREST 400 Diagnosis

    **Date:** 2026-05-{DD}
    **Method:** {A / B / C — pick one}
    **Operator:** {name}

    ## Schema Confirmation

    Column `public.jobs.listing_tier`:
    - data_type: `integer`
    - is_nullable: `NO`
    - column_default: `1`

    Confirms research §Pattern 2: column is int, not text.

    ## Failing Query

    Failing PostgREST URL (from DevTools Network OR curl):
    ```
    GET /rest/v1/jobs?select=...&status=eq.active&listing_tier=in.%28%22featured%22%2C%22premium%22%29
    ```

    HTTP status: `400`

    Response body:
    ```json
    {
      "code": "22P02",
      "details": null,
      "hint": null,
      "message": "invalid input syntax for type integer: \"featured\""
    }
    ```

    ## Verdict

    SQLSTATE `22P02` (invalid_text_representation) confirms the bug is a type-mismatch at the application layer, NOT a missing column (would be `42703`) or RLS rejection (would be `42501`). Fix: change line 133 of `src/components/landing/FeaturedListings.tsx` from string array `['featured', 'premium']` to integer array `[2, 3]`. No schema migration required.
    ```

    If the diagnostic produces a DIFFERENT SQLSTATE (e.g., `42703` undefined_column), STOP and surface to operator — the planned fix is wrong and the plan needs revision.
  </action>
  <verify>
    <automated>test -f .planning/phases/22-pre-launch-p0-closure/22-02-DIAGNOSIS.md && grep -E "22P02" .planning/phases/22-pre-launch-p0-closure/22-02-DIAGNOSIS.md</automated>
  </verify>
  <acceptance_criteria>
    - `test -f .planning/phases/22-pre-launch-p0-closure/22-02-DIAGNOSIS.md` exits 0
    - `grep -E "22P02" .planning/phases/22-pre-launch-p0-closure/22-02-DIAGNOSIS.md` returns ≥1 match (SQLSTATE confirmation)
    - `grep -E "integer" .planning/phases/22-pre-launch-p0-closure/22-02-DIAGNOSIS.md` returns ≥1 match (schema confirmation)
    - `grep -E "Verdict" .planning/phases/22-pre-launch-p0-closure/22-02-DIAGNOSIS.md` returns ≥1 match
    - If SQLSTATE is anything OTHER than `22P02`, the executor MUST surface this to operator before proceeding to Task 2 — different SQLSTATE means a different fix
  </acceptance_criteria>
  <done>
    Diagnostic document records the schema state (int column), the failing query URL, the 400 response body with SQLSTATE `22P02`. Confirms research hypothesis. Ready for Task 2 fix.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Fix — change listing_tier filter from string array to integer array at line 133</name>
  <files>src/components/landing/FeaturedListings.tsx</files>
  <read_first>
    - src/components/landing/FeaturedListings.tsx (post-Task-1 state — unchanged; still the original code with line 133 defect)
    - .planning/phases/22-pre-launch-p0-closure/22-02-DIAGNOSIS.md (Task 1 output — confirms SQLSTATE 22P02)
    - tests/featured-listings-tier-type.test.ts (Wave 0 RED spec — the assertion target shape)
    - .planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md §Example 2 (verbatim fix shape)
  </read_first>
  <behavior>
    - Test 1 (Wave 0 spec): `FeaturedListings.tsx` contains `.in('listing_tier', [2, 3])` (positive assertion).
    - Test 2 (Wave 0 spec): does NOT contain `'featured'` or `'premium'` string literals INSIDE the `.in('listing_tier', [...])` call (negative assertion).
    - Test 3 (Wave 0 spec): `getTierBadge` helper still handles `t === '3'` and `t === '2'` (preserved — badge rendering still works).
  </behavior>
  <action>
    Use the Edit tool to change ONE LINE in `src/components/landing/FeaturedListings.tsx`. The change is line 133 ONLY — line 147 (fallback query) has NO `.in('listing_tier', ...)` filter and MUST NOT be modified.

    BEFORE (line 133):
    ```typescript
            .in('listing_tier', ['featured', 'premium'])
    ```

    AFTER (line 133):
    ```typescript
            .in('listing_tier', [2, 3])  // 2=featured, 3=premium per getTierBadge helper (FeaturedListings.tsx:33-38). listing_tier is int NOT NULL DEFAULT 1 in supabase/migrations/001_initial_schema.sql:129.
    ```

    No other lines change. The select clause, status filter, order clause, limit, and fallback query all remain untouched.

    Verification of file state pre-edit (use Edit tool's anchor text for safety):
    - Anchor line above edit: `.eq('status', 'active')` (line 132, unique within fetchJobs primary query)
    - Anchor line below edit: `.order('created_at', { ascending: false })` (line 134)

    Confirm via grep after edit that:
    - `.in('listing_tier', [2, 3])` appears EXACTLY 1 time in the file
    - `.in('listing_tier', ['featured', 'premium'])` appears 0 times
    - `getTierBadge` helper at lines 33-38 is unchanged (still references both string and int forms for defence-in-depth)
  </action>
  <verify>
    <automated>pnpm test tests/featured-listings-tier-type.test.ts --run 2>&1 | tail -10 — expect all 3 assertions PASS (Wave 0 RED → GREEN); pnpm exec tsc -b 2>&1 | grep "FeaturedListings" — expect no new TS errors</automated>
  </verify>
  <acceptance_criteria>
    - `grep -cE "\\.in\\('listing_tier', \\[2, 3\\]\\)" src/components/landing/FeaturedListings.tsx` returns exactly `1`
    - `grep -E "\\.in\\('listing_tier', \\['featured'" src/components/landing/FeaturedListings.tsx` returns 0 matches
    - `grep -E "\\.in\\('listing_tier'" src/components/landing/FeaturedListings.tsx` returns exactly `1` match (only the primary query, not the fallback)
    - `grep -E "'featured'" src/components/landing/FeaturedListings.tsx | grep -v "getTierBadge\\|t === 'featured'"` returns 0 matches OUTSIDE the helper (i.e., the only remaining `'featured'` literal is inside getTierBadge as `t === 'featured'`)
    - `pnpm test tests/featured-listings-tier-type.test.ts --run` — all 3 assertions PASS (positive `.in('listing_tier', [2, 3])` + negative anti-string-tier + helper preserved)
    - `pnpm exec tsc -b 2>&1 | grep "src/components/landing/FeaturedListings.tsx"` — zero NEW TypeScript errors (pre-existing project errors tolerated)
    - Full vitest suite: no regressions on FeaturedListings or sibling tests
  </acceptance_criteria>
  <done>
    `src/components/landing/FeaturedListings.tsx` line 133 changed from string array to int array. Inline comment documents the int→tier mapping convention. Wave 0 spec fully GREEN. Ready for Wave 2 prod UAT.
  </done>
</task>

</tasks>

<verification>
After all 2 tasks complete:

```bash
# Diagnosis captured
test -f .planning/phases/22-pre-launch-p0-closure/22-02-DIAGNOSIS.md
grep -E "22P02" .planning/phases/22-pre-launch-p0-closure/22-02-DIAGNOSIS.md  # SQLSTATE confirmation

# Fix applied at line 133 ONLY
grep -nE "listing_tier" src/components/landing/FeaturedListings.tsx
# Expected matches:
#  - 1 in getTierBadge (line ~33-38, both int and string handling preserved)
#  - 1 in primary select clause (line ~130)
#  - 1 in the .in() call at line 133 with [2, 3]
#  - 1 in fallback select clause (line ~147)
#  Total: 4 occurrences of "listing_tier"; only 1 inside a .in() call

# Wave 0 spec GREEN
pnpm test tests/featured-listings-tier-type.test.ts --run

# Zero regression
pnpm test --run 2>&1 | tail -5

# Typecheck clean (no new errors on this file)
pnpm exec tsc -b 2>&1 | grep "FeaturedListings.tsx" | grep -v "node_modules"
```

**Atomic commit per CLAUDE §4:** Tasks 1 + 2 land as ONE commit (diagnosis doc + 1-line code fix). Single defect closure, single commit.

Commit message format: `fix(22-02): HOMEBUG-02 — pass int values [2,3] to listing_tier .in() filter (schema is int NOT NULL DEFAULT 1)`

Includes:
- `src/components/landing/FeaturedListings.tsx` (1-line change at line 133 + comment)
- `.planning/phases/22-pre-launch-p0-closure/22-02-DIAGNOSIS.md` (SQLSTATE evidence)

After Wave 2 deploys + UAT Step 2 confirms 200 in prod, HOMEBUG-02 can move to closed state in `REQUIREMENTS.md` (handled in plan 22-04 — not here).
</verification>

<success_criteria>
- `tests/featured-listings-tier-type.test.ts` Wave 0 RED → fully GREEN (all 3 assertions pass)
- `src/components/landing/FeaturedListings.tsx` line 133 contains `.in('listing_tier', [2, 3])` exactly once
- Line 147 fallback query UNCHANGED (no `.in('listing_tier', ...)` introduced — was never there)
- `getTierBadge` helper at lines 33-38 UNCHANGED
- Diagnosis document records SQLSTATE 22P02 evidence
- Zero regression in vitest full suite or TypeScript build
- Single atomic commit covers diagnosis + fix
</success_criteria>

<output>
After completion, create `.planning/phases/22-pre-launch-p0-closure/22-02-homebug-02-listing-tier-SUMMARY.md` documenting:
- Diagnosis (Task 1) — SQLSTATE confirmation, schema confirmation, hypothesis closed
- Fix (Task 2) — file diff at line 133, Wave 0 spec RED→GREEN evidence
- Atomic commit SHA
- Note: line 147 was confirmed NOT to have the defect (research's "same change at line 147" guidance was based on a false read; fallback query has no listing_tier filter)
- Carryforward: Wave 2 plan 22-04 Step 2 must verify 200 in production
</output>
