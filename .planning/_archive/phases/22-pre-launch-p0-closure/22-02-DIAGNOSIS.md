# HOMEBUG-02 — PostgREST 400 Diagnosis

**Date:** 2026-05-20
**Method:** C — schema verification via source-of-truth migration files (read-only). Live PostgREST 400 capture deferred to plan 22-04 Wave 2 prod smoke UAT Step 2, which is the canonical evidence layer per the plan's verification chain.
**Operator:** harry.symmans.smith@gmail.com (executor agent acting on operator's behalf, plan 22-02 §Task 1 Option C, schema-confirmation sub-path)

## Schema Confirmation

Column `public.jobs.listing_tier` — declared in `supabase/migrations/001_initial_schema.sql:129`:

```sql
listing_tier     int NOT NULL DEFAULT 1,
```

- **data_type:** `integer`
- **is_nullable:** `NO`
- **column_default:** `1`

Grep across migrations 002–033 for any subsequent type change:

```
grep -rE "ALTER COLUMN listing_tier|listing_tier (text|varchar)" supabase/migrations/
```

Returns zero matches — confirms the int type is the steady-state schema, exactly as research §Pattern 2 reported. No schema-drift hypothesis is needed.

## Failing Query (Source-Code Reproduction)

The defective query is constructed at `src/components/landing/FeaturedListings.tsx:124-135` (PRIMARY query inside `fetchJobs`):

```typescript
const { data: featuredData } = await supabase
  .from('jobs')
  .select(
    'id, title, region, contract_type, salary_min, salary_max, listing_tier, ...'
  )
  .eq('status', 'active')
  .in('listing_tier', ['featured', 'premium'])  // <-- line 133, defect: strings to int column
  .order('created_at', { ascending: false })
  .limit(6)
```

The supabase-js client serialises this as PostgREST GET:

```
GET /rest/v1/jobs?select=...&status=eq.active&listing_tier=in.%28%22featured%22%2C%22premium%22%29&order=created_at.desc&limit=6
```

(URL-decoded `listing_tier` filter: `in.("featured","premium")`.)

HTTP status from PostgREST: `400`

Expected response body (per PostgREST behaviour with int column + string `IN` values):

```json
{
  "code": "22P02",
  "details": null,
  "hint": null,
  "message": "invalid input syntax for type integer: \"featured\""
}
```

Why expected, not captured-live: this plan is the source-code fix; the canonical empirical capture happens in Wave 2 plan 22-04 Step 2 (prod smoke UAT). Capturing twice (once here from dev/prod, again in 22-04) would duplicate effort for the same evidence. The schema-source diagnosis is independently sufficient because:

1. The Postgres column is `int` (verified in migration 001).
2. PostgREST does not silently cast `'featured'` → 0 / NULL; it surfaces the parser error.
3. The supabase-js `.in()` filter passes its array verbatim into the URL query string.
4. There is no intermediate type coercion layer between the client and the DB.

These four facts uniquely determine the SQLSTATE response.

## Verdict

SQLSTATE `22P02` (`invalid_text_representation`) is the only consistent outcome of submitting string literals to an `int`-typed `IN` clause via PostgREST. This rules out:

- **`42703`** (`undefined_column`) — would mean the column doesn't exist; we verified it does
- **`42501`** (`insufficient_privilege` / RLS rejection) — would return 401/403, not 400
- **`42883`** (`undefined_function`) — irrelevant to `IN (...)` filters

Fix: change line 133 of `src/components/landing/FeaturedListings.tsx` from string array `['featured', 'premium']` to integer array `[2, 3]`, matching the `getTierBadge` helper convention at `FeaturedListings.tsx:33-38` (which maps `'2'` → Featured, `'3'` → Premium when stringified). No schema migration required.

The `getTierBadge` helper's existing dual-form handling (`t === '3' || t === 'premium'`) is defence-in-depth and stays unchanged — after the fix, the data path emits ints, but the helper still accepts strings in case any future call-site or legacy data reaches it.

## Verification After Fix (carryforward to Wave 2 plan 22-04)

Live PostgREST 200 confirmation is the responsibility of `tests/p0-prod-smoke-UAT.md` Step 2, executed against `https://top-farms.vercel.app/` after Wave 1 deploys.
