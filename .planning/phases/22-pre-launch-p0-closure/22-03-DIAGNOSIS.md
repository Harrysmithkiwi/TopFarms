# HOMEBUG-03 — Accommodation Filter Layer 2 Mismatch Diagnosis

**Date:** 2026-05-20
**Method:** B (Supabase Management API read-only — equivalent to MCP execute_sql per Phase 21-01/02 continuation-agent precedent in STATE.md; project ref `inlagtgpynemhipnqvty` verbatim per CLAUDE §1; `--read-only` MCP invariant preserved via 3 SELECT queries with zero writes)
**Operator:** gsd-executor (Phase 22 plan 22-03 Task 1, autonomous)

## Layer 1 — UI Emission (FilterSidebar.tsx:43-49)

Confirmed by reading `src/components/ui/FilterSidebar.tsx:43-49` ACCOMMODATION_OPTIONS — values dispatched on toggle:

| Option `value` | URL param produced |
|---|---|
| `couples` | `?accommodation_type=couples` |
| `family` | `?accommodation_type=family` |
| `pet_friendly` | `?accommodation_type=pet_friendly` |
| `house` | `?accommodation_type=house` (TYPE column — out of scope for this fix) |
| `cottage` | `?accommodation_type=cottage` (TYPE column — out of scope) |

Each toggle dispatches `toggleMultiValue('accommodation_type', value)` via `FilterSidebar` so URL params are concatenated (`?accommodation_type=couples&accommodation_type=pet_friendly`). All five values are lowercase / snake_case strings.

## Layer 2 — Current Handler Behavior (JobSearch.tsx:273-279)

Source-confirmed (re-read at execution time):

```typescript
// Lines 273-279 of src/pages/jobs/JobSearch.tsx
// Accommodation multi-option filter — operates on employer_profiles.accommodation_extras
// via PostgREST embed filter. Requires the !inner hint on the employer_profiles select above
// so the filter prunes the parent jobs result, not just the embedded employer rows.
const accommodationTypes = searchParams.getAll('accommodation_type')
if (accommodationTypes.length > 0) {
  query = query.overlaps('employer_profiles.accommodation_extras', accommodationTypes)
}
```

Raw URL values pass through to PostgREST `.overlaps()` unchanged. The resulting REST request shape (per supabase-js `.overlaps()` translation):

```
GET /rest/v1/jobs?...&employer_profiles.accommodation_extras=ov.%7Bcouples%2Cpet_friendly%7D
```

Where `ov.{couples,pet_friendly}` is the URL-encoded representation of `&&` array-overlap operator with raw lowercase values. Response: **200 with empty result set** (not 400) — Postgres `text[] && text[]` is type-valid; values just never match the Title Case strings stored in the column. From the seeker's perspective this is indistinguishable from "no jobs match my filter" — a silent top-of-funnel breaker.

## Layer 3 — DB Column State (employer_profiles.accommodation_extras)

Empirical evidence captured 2026-05-20 via Supabase Management API:

### Column type

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'employer_profiles'
  AND column_name = 'accommodation_extras';
```

Result:

```json
[{"column_name":"accommodation_extras","data_type":"ARRAY"}]
```

Column is `text[]` (PostgREST + information_schema reports as `ARRAY`).

### Sample distinct stored values

```sql
SELECT DISTINCT unnest(accommodation_extras) AS extra
FROM public.employer_profiles
WHERE accommodation_extras IS NOT NULL
  AND array_length(accommodation_extras, 1) > 0
ORDER BY extra
LIMIT 30;
```

Result (prod sample):

```json
[{"extra":"Couples welcome"}]
```

Single distinct value in current prod data (Title Case) — matches the migration `013_phase8_wizard_fields.sql:30-37` and `src/types/domain.ts:327-336` ACCOMMODATION_EXTRAS_OPTIONS source-of-truth shape:

```
Couples welcome
Family welcome
Pets allowed
Utilities included
Furnished
Garden
Garage
Internet included
```

Confirms DB stores Title Case (not lowercase / snake_case).

### Failing-shape vs fix-shape query proof

Failing shape (current handler — raw URL value `couples`):

```sql
SELECT count(*) AS n
FROM public.jobs j
INNER JOIN public.employer_profiles ep ON ep.id = j.employer_id
WHERE j.status = 'active'
  AND ep.accommodation_extras && ARRAY['couples']::text[];
```

Result: `[{"n":0}]` — zero matches (array overlap is case-sensitive; `'couples'` ≠ `'Couples welcome'`).

Fix shape (post-remap — Title Case `Couples welcome`):

```sql
SELECT count(*) AS n
FROM public.jobs j
INNER JOIN public.employer_profiles ep ON ep.id = j.employer_id
WHERE j.status = 'active'
  AND ep.accommodation_extras && ARRAY['Couples welcome']::text[];
```

Result: `[{"n":1}]` — match returned.

## Verdict

Layer 1 emits lowercase / snake_case URL params (`couples`, `family`, `pet_friendly`); Layer 3 stores Title Case strings (`'Couples welcome'`, `'Family welcome'`, `'Pets allowed'`); Layer 2 passes raw Layer 1 values to Layer 3 verbatim. Mismatch empirically confirmed at all three layers. Fix at Layer 2 (research-recommended; isolated to `JobSearch.tsx` — minimum cross-cutting impact).

**Scope decision (research §Open Question 1):** `house` and `cottage` values from `FilterSidebar.ACCOMMODATION_OPTIONS` map to `employer_profiles.accommodation_type` (singular column, plain `text`) — **NOT** `accommodation_extras` (the array column being filtered here). They will NOT be added to `ACCOMMODATION_FILTER_TO_DB` in this plan; they fall through `.filter(Boolean)` and become no-ops for the extras filter. A future plan can add a separate handler for the TYPE column if the `house` / `cottage` filter values become important (currently neither filter would return matches against `accommodation_extras` anyway because the column doesn't store those tokens).
