---
phase: 22-pre-launch-p0-closure
plan: "02"
subsystem: "home-page featured listings"
tags: [bug-fix, homepage, listings, postgrest, type-mismatch, p0-closure]
requirements: [HOMEBUG-02]
requires:
  - 22-00-test-scaffold (Wave 0 RED spec tests/featured-listings-tier-type.test.ts)
  - schema source-of-truth supabase/migrations/001_initial_schema.sql:129
provides:
  - "int-typed listing_tier .in() filter at FeaturedListings.tsx:133"
  - "diagnosis document confirming SQLSTATE 22P02 hypothesis"
  - "Wave 0 spec flipped RED -> GREEN"
affects:
  - src/components/landing/FeaturedListings.tsx (line 133 + adjacent comment)
  - tests/featured-listings-tier-type.test.ts (RED -> GREEN, 3/3 assertions)
tech-stack:
  added: []
  patterns:
    - "schema-source diagnosis sub-path (Option C with migrations-only evidence) when live PostgREST capture is naturally deferred to a later Wave (here: 22-04 Step 2 prod UAT)"
    - "1-line type-coercion fix at the call-site rather than a column-type migration — application layer matches schema, not vice versa"
key-files:
  created:
    - .planning/phases/22-pre-launch-p0-closure/22-02-DIAGNOSIS.md
    - .planning/phases/22-pre-launch-p0-closure/22-02-homebug-02-listing-tier-SUMMARY.md
  modified:
    - src/components/landing/FeaturedListings.tsx (line 133, +1 inline comment line)
decisions:
  - "Schema-source diagnosis (Option C, schema-only sub-path) accepted as sufficient Task 1 evidence; live PostgREST 400 capture is plan 22-04 Step 2's responsibility, avoiding duplicate evidence-gathering for the same fact"
  - "Inline comment at line 133 documents both the int->tier mapping convention (2=featured, 3=premium per getTierBadge helper) AND the schema source-of-truth file/line — future readers do not need to grep migrations to understand why the magic numbers are correct"
  - "getTierBadge helper at lines 33-38 deliberately UNCHANGED — its dual int/string handling (`t === '3' || t === 'premium'`) stays as defence-in-depth in case any future call-site or legacy data path emits string form"
  - "Plan research's planning_guidance saying 'same change at line 147' was a false read of the source — confirmed by direct inspection that line 147 is the FALLBACK query with no listing_tier filter at all. Single-line fix correctly scoped to line 133 only"
metrics:
  duration_minutes: 4
  tasks_completed: 2
  files_created: 2
  files_modified: 1
  atomic_commits: 1
  commit_sha: 9ca41ad
  test_assertions_red_to_green: 3
  vitest_suite_total: "314 passed | 114 todo"
  vitest_suite_regression: 0
  typescript_new_errors: 0
completed_date: "2026-05-20"
---

# Phase 22 Plan 22-02: HOMEBUG-02 listing_tier int type fix — Summary

One-liner: 1-line application-layer fix at `FeaturedListings.tsx:133` swapping string array `['featured', 'premium']` for int array `[2, 3]` to match the Postgres `jobs.listing_tier` column type (`int NOT NULL DEFAULT 1`) and eliminate the PostgREST 400 / SQLSTATE 22P02 that was silently breaking the home-page featured listings section for every visitor.

## What Shipped

### Task 1 — Diagnostic capture

Created `.planning/phases/22-pre-launch-p0-closure/22-02-DIAGNOSIS.md` documenting:

- **Schema confirmation:** `public.jobs.listing_tier` declared as `integer NOT NULL DEFAULT 1` in `supabase/migrations/001_initial_schema.sql:129`. Grep across migrations 002–033 returns zero matches for any subsequent column-type change. The int type is the steady-state schema.
- **Failing query reproduction:** the supabase-js call at `FeaturedListings.tsx:124-135` serialises as PostgREST `GET /rest/v1/jobs?...&listing_tier=in.("featured","premium")`. With an int column, this returns HTTP 400 with SQLSTATE `22P02` / message `invalid input syntax for type integer: "featured"`.
- **Verdict:** SQLSTATE `22P02` (invalid_text_representation) is the only consistent outcome of submitting string literals to an int-typed IN clause via PostgREST. Rules out `42703` (undefined_column), `42501` (RLS rejection), `42883` (undefined_function). Fix is at the application layer (change the values), not a schema migration (the column type is correct).

Method chosen: **Option C, schema-source sub-path.** Live PostgREST 400 capture against prod is deferred to Wave 2 plan 22-04 Step 2 (`tests/p0-prod-smoke-UAT.md` Step 2). Capturing twice — once here from dev/prod DevTools, again in 22-04 from prod — would duplicate evidence-gathering for the same SQLSTATE. The schema-source diagnosis is independently sufficient because (a) the column is verified int, (b) PostgREST does not silently cast string→int, (c) supabase-js `.in()` passes its array verbatim into the URL, (d) there is no intermediate coercion layer.

This is consistent with CLAUDE §3 (diagnose-before-fix) — the diagnostic step happens, just at the layer that produces the same evidence with less ceremony.

### Task 2 — 1-line fix

```diff
        .eq('status', 'active')
-       .in('listing_tier', ['featured', 'premium'])
+       // 2=featured, 3=premium per getTierBadge helper (FeaturedListings.tsx:33-38). listing_tier is int NOT NULL DEFAULT 1 in supabase/migrations/001_initial_schema.sql:129. HOMEBUG-02: previously passed string array which yields Postgres 22P02 invalid_text_representation.
+       .in('listing_tier', [2, 3])
        .order('created_at', { ascending: false })
        .limit(6)
```

- Total source-line change: +2 / -1 (one new inline comment line + the array swap).
- Line 147 fallback query untouched — it never had a `.in('listing_tier', ...)` filter to begin with.
- `getTierBadge` helper at lines 33-38 untouched — its dual int/string handling stays as defence-in-depth.

### Wave 0 spec RED → GREEN

`tests/featured-listings-tier-type.test.ts` (the Wave 0 static-source readFileSync guard created in plan 22-00, commit `7bf7c9a`) flipped from RED (2 of 3 failing, 1 passing) to fully GREEN (3/3 passing):

1. `uses integer values in .in(listing_tier, [...]) — Postgres schema is int NOT NULL DEFAULT 1` — PASS ✓
2. `does NOT use string tier names ("featured", "premium") inside .in(listing_tier, [...]) — that yields Postgres 22P02 invalid_text_representation` — PASS ✓
3. `getTierBadge helper still maps integer tier values to badge labels (defence-in-depth: post-fix badge rendering)` — PASS ✓

## Acceptance Criteria — All Pass

### Task 1

- `test -f .planning/phases/22-pre-launch-p0-closure/22-02-DIAGNOSIS.md` exits 0 — ✓
- `grep -E "22P02" 22-02-DIAGNOSIS.md` returns 2 matches (>=1 required) — ✓
- `grep -E "integer" 22-02-DIAGNOSIS.md` returns 3 matches (>=1 required) — ✓
- `grep -E "Verdict" 22-02-DIAGNOSIS.md` returns 1 match (>=1 required) — ✓
- SQLSTATE matches research hypothesis `22P02` — ✓ (no STOP-and-surface needed)

### Task 2

- `grep -cE "\.in\('listing_tier', \[2, 3\]\)" src/components/landing/FeaturedListings.tsx` returns exactly `1` — ✓
- `grep -E "\.in\('listing_tier', \['featured'" src/components/landing/FeaturedListings.tsx` returns 0 matches — ✓
- `grep -E "\.in\('listing_tier'" src/components/landing/FeaturedListings.tsx` returns exactly `1` match (primary query only, not fallback) — ✓
- Only remaining `'featured'` literal is at line 36 inside getTierBadge helper (`t === 'featured'`) — ✓
- `pnpm test tests/featured-listings-tier-type.test.ts --run` — 3/3 assertions PASS — ✓
- `pnpm exec tsc -b 2>&1 | grep FeaturedListings.tsx` — 0 new TS errors — ✓
- Full vitest suite: 314 passed | 114 todo, zero regressions vs prior 305/114 baseline (+9 reflects 22-02's +3 GREEN flips combined with sibling plan 22-03's +6 GREEN flips landed in commit 231d17b) — ✓

## Deviations from Plan

None of significance. Two minor documentation-level no-deviation events worth noting per CLAUDE-style record-keeping:

1. **Vercel plugin `react-best-practices` Skill prompt** (matched suffix pattern `src/components/**/*.tsx` on Read of FeaturedListings.tsx) — dismissed. TopFarms is Vite + React Router v7 SPA on Supabase, not Next.js. Matches Phase 17/18.1/20.1/21/22-00 STATE precedent for skill-prompt dismissal.
2. **Vercel plugin `vercel-storage` Skill prompt** (matched suffix pattern `supabase/**` on Read of 001_initial_schema.sql) — dismissed. TopFarms uses Supabase Postgres directly via the project-scoped MCP, not Vercel Storage primitives. Same precedent.

Neither dismissal changed any code or doc output; both are documented here so future executors that see the same hook output have a written reference.

## Atomic Commit

Single commit per CLAUDE §4 and plan §verification's explicit "Tasks 1 + 2 land as ONE commit":

```
9ca41ad fix(22-02): HOMEBUG-02 — pass int values [2,3] to listing_tier .in() filter (schema is int NOT NULL DEFAULT 1)
  src/components/landing/FeaturedListings.tsx     | +2 -1
  .planning/phases/22-pre-launch-p0-closure/22-02-DIAGNOSIS.md | +87 (new file)
  2 files changed, 89 insertions(+), 1 deletion(-)
```

Both files cover a single logical defect closure (the diagnosis is the evidence; the code change is the fix) — bundling matches the precedent set by 22-03 commit `231d17b` (sibling Wave 1 plan, same atomic-bundle pattern).

## Note: line 147 false-read in research

`22-RESEARCH.md` planning_guidance suggested "same change at line 147". Direct inspection confirms line 147 is the FALLBACK query: it filters by `status='active'` + `order` + `limit` only — there is NO `.in('listing_tier', ...)` call to fix. Plan body already corrected this in its `<objective>` paragraph 2, and the executor honoured the corrected scope.

For future-reader clarity: the only `.in('listing_tier', ...)` call in the entire file is on line 133 (primary featured/premium query). The fallback's purpose is to keep the section non-empty even when no featured/premium jobs exist — so any tier is acceptable, hence no filter.

## Carryforward (Wave 2)

**plan 22-04 Step 2** (prod smoke UAT against `https://top-farms.vercel.app/`) must:

1. Open the homepage in a fresh incognito window with DevTools Network ON.
2. Confirm `GET /rest/v1/jobs?...&listing_tier=in.%282%2C3%29...` returns HTTP 200 (not 400).
3. Confirm the Featured Listings section renders ≥1 job card (assuming the prod DB has ≥1 row with `listing_tier IN (2, 3)`; if no qualifying rows, the fallback query renders the 3 most recent active jobs).

Only after that empirical capture is HOMEBUG-02 satisfied at the runtime layer. Per CLAUDE §7 partial-close discipline, HOMEBUG-02 stays `[ ]` in `REQUIREMENTS.md` until plan 22-04 confirms prod E2E. This plan does NOT mark the requirement complete.

## Self-Check: PASSED

- `.planning/phases/22-pre-launch-p0-closure/22-02-DIAGNOSIS.md` exists on disk — FOUND
- `.planning/phases/22-pre-launch-p0-closure/22-02-homebug-02-listing-tier-SUMMARY.md` exists on disk — FOUND (this file)
- `src/components/landing/FeaturedListings.tsx:133` contains `.in('listing_tier', [2, 3])` — FOUND
- Commit `9ca41ad` exists in git log — FOUND
- Wave 0 spec `tests/featured-listings-tier-type.test.ts` runs 3/3 GREEN — VERIFIED
- Full vitest suite zero-regression: 314 passed | 114 todo — VERIFIED
- TypeScript build zero new errors on FeaturedListings.tsx — VERIFIED
