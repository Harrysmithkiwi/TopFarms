# Phase 4: Match Scoring Engine - Research

**Researched:** 2026-03-16
**Domain:** PostgreSQL triggers, pg_cron, Supabase Edge Functions (Deno), Claude API, React/TypeScript frontend
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Staleness & Recalculation Triggers**
- DB triggers on `seeker_profiles` and `jobs` tables fire recalculation — scores upserted into `match_scores` immediately
- Recalculation is sector-scoped: dairy seeker change only recalculates against dairy jobs (and vice versa) — keeps trigger work proportional as platform grows
- Nightly batch recalculation for data integrity — Claude's discretion on pg_cron vs Supabase scheduled Edge Function (verify availability on current Supabase plan)
- Migration backfill on deploy: populate `match_scores` for all existing seeker-job pairs so search works immediately with pre-computed scores
- Must meet <60s SLA for score updates after profile/job changes

**Recency Multiplier**
- 1.1× multiplier for jobs posted within 7 days — hard cutoff, not gradual decay
- Applied to base score, then capped at 100 — no scores above 100 in the system
- Nightly batch handles the day-7 transition (recalculates scores for jobs crossing the 7-day mark)

**AI Explanation Tone & Content**
- Honest and practical tone — farm-worker-friendly language, no corporate-speak, no overselling
- Example: "You've got rotary experience and they run a rotary shed — that's your strongest match. The salary sits at the top of your range."
- Same single explanation per seeker-job pair — both seeker and employer see the same 2-3 sentences (one Claude API call per pair, stored once)
- Always generate for all scores including low matches — helps seekers understand WHY and whether to still apply (trustworthy brand)
- AI explanations generated async after score computation — separate Edge Function processes scores without explanations, doesn't block the <60s SLA

**Graceful Degradation**
- If no explanation exists yet, hide the explanation area entirely — match breakdown bars still render from score data, no broken UI
- Show stale explanation until replaced — when score changes, keep old explanation visible while new one generates async; score numbers update immediately, text catches up
- Edge Function retries: 3 attempts with exponential backoff (1s, 2s, 4s); if all fail, explanation stays null until nightly batch retries all null explanations

### Claude's Discretion
- Nightly batch implementation choice (pg_cron vs Supabase scheduled Edge Function)
- Exact Claude API prompt design for generating explanations from breakdown jsonb
- Edge Function queue/processing pattern for async explanation generation
- Trigger implementation details (AFTER INSERT/UPDATE, transition tables, etc.)
- Error logging and monitoring approach

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MTCH-01 | 100-point match scoring: shed type 25pts, location 20pts, accommodation 20pts, skills 20pts, salary 10pts, visa 5pts | `compute_match_score()` in `009_seeker_onboarding.sql` fully implements all 6 base dimensions — wrap with store logic, not rewrite |
| MTCH-02 | Couples bonus (+5 points when both parties seek couples and offer couples accommodation) | Already implemented in `compute_match_score()` as `v_couples := 5` conditional — no new logic needed |
| MTCH-03 | Recency multiplier applied to scores | Already implemented in `compute_match_score()` — 1.1× for jobs within 7 days, LEAST(100, ...) cap — nightly batch handles day-7 transitions |
| MTCH-04 | Pre-computed scores stored in match_scores table (never computed client-side) | `match_scores` table exists with correct schema — need: `explanation` column migration, DB triggers, backfill migration, switch frontend queries from RPC to table reads |
| MTCH-05 | Match scores recalculated when seeker profile or job listing changes (<60s SLA) | PostgreSQL AFTER trigger approach — synchronous upsert to `match_scores` in trigger function guarantees <1s let alone <60s |
| MTCH-06 | AI match explanations via Claude API: 2-3 sentence insights per match, called from Edge Function | New Edge Function `generate-match-explanation` using `@anthropic-ai/sdk` imported from esm.sh — async, non-blocking, with 3-attempt retry |
</phase_requirements>

---

## Summary

Phase 4 converts the existing query-time match scoring (Phase 3 RPC calls to `compute_match_score()`) to a pre-computed, trigger-maintained system stored in the `match_scores` table, and adds Claude AI explanations via a new Edge Function. The scoring logic itself (`compute_match_score()`) is already complete and correct — Phase 4 wraps it with infrastructure, not new scoring logic.

The primary work is three layers: (1) database layer — a new migration adds the `explanation` column, defines AFTER INSERT/UPDATE triggers on `seeker_profiles` and `jobs`, and runs a backfill for existing pairs; (2) Edge Function layer — a new `generate-match-explanation` function calls Claude API with the breakdown jsonb and upserts the result asynchronously; (3) frontend layer — `MatchBreakdown.tsx` gains a conditional AI explanation section, and `JobDetail.tsx`/`ApplicantDashboard.tsx` switch from RPC calls to direct `match_scores` table reads.

The nightly batch is implemented with pg_cron (confirmed available via `008_job_expiry_cron.sql`) and handles two responsibilities: data integrity re-runs and the day-7 recency cutoff (jobs that cross the 7-day mark need score recomputation to drop the 1.1× multiplier).

**Primary recommendation:** Implement triggers synchronously (upsert scores in trigger body) so the <60s SLA is trivially met, and invoke the AI Edge Function asynchronously from a separate trigger/hook so explanation generation never blocks the score write path.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL triggers (AFTER) | Built-in | Fire score recomputation on row changes | Zero latency, transactionally safe, sector-scoped via WHERE clause |
| pg_cron | Already enabled | Nightly batch recompute and day-7 recency fix | Confirmed available — `008_job_expiry_cron.sql` uses it |
| Supabase Edge Functions (Deno) | Runtime v1 | Claude API calls, async explanation generation | Established project pattern — `create-payment-intent`, `stripe-webhook` |
| @anthropic-ai/sdk | Latest via esm.sh | Claude API client in Deno | Official Anthropic SDK, imports cleanly from `https://esm.sh/@anthropic-ai/sdk` |
| Anthropic model | `claude-sonnet-4-20250514` | Generate 2-3 sentence match explanations | SPEC §9.2 specifies this model explicitly |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@supabase/supabase-js@2` | ^2.x (esm.sh) | Service role client inside Edge Functions | Already used in all Edge Functions |
| vitest + @testing-library | ^3.1.1 | Unit tests for scoring logic helpers | Tests dir already configured with `tests/setup.ts` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pg_cron for nightly batch | Supabase scheduled Edge Function | pg_cron is already confirmed available; scheduled Edge Functions also work but add another abstraction layer — pg_cron is simpler for pure SQL batch work |
| Synchronous trigger upsert | Async background job queue | Triggers are synchronous and reliable; a background queue adds operational complexity with no benefit for this scale |

**Installation:**
```bash
# No new npm packages needed — all logic is PostgreSQL + Edge Functions
# Edge Function uses esm.sh imports (no build step)
```

---

## Architecture Patterns

### Recommended Project Structure

```
supabase/
├── migrations/
│   └── 010_match_scores_precompute.sql   # explanation col + triggers + backfill + cron
├── functions/
│   └── generate-match-explanation/
│       └── index.ts                       # Claude API Edge Function

src/
├── components/ui/
│   └── MatchBreakdown.tsx                 # Add AI explanation section (conditional)
├── pages/jobs/
│   ├── JobDetail.tsx                      # Switch from RPC to match_scores table read
│   └── JobSearch.tsx                      # Switch from batch RPC to match_scores table read
└── pages/dashboard/employer/
    └── ApplicantDashboard.tsx             # Switch to match_scores table read + pass explanation

tests/
└── match-scoring.test.ts                  # Unit tests for scoring dimension logic
```

### Pattern 1: Sector-Scoped AFTER Trigger

**What:** DB trigger on `seeker_profiles` and `jobs` that calls a helper function to recompute and upsert scores, scoped to matching sector only.

**When to use:** Any change to seeker profile or job listing — guarantees freshness within milliseconds, well under the 60s SLA.

```sql
-- Source: PostgreSQL official docs (triggers) + project pattern
CREATE OR REPLACE FUNCTION public.trigger_recompute_seeker_scores()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recompute scores for all active jobs matching this seeker's sector
  INSERT INTO public.match_scores (job_id, seeker_id, total_score, breakdown, calculated_at)
  SELECT
    j.id,
    NEW.id,
    (public.compute_match_score(NEW.id, j.id)->>'total_score')::int,
    public.compute_match_score(NEW.id, j.id)->'breakdown',
    now()
  FROM public.jobs j
  WHERE j.status = 'active'
    AND j.sector = ANY(NEW.sector_pref)
  ON CONFLICT (job_id, seeker_id)
  DO UPDATE SET
    total_score   = EXCLUDED.total_score,
    breakdown     = EXCLUDED.breakdown,
    calculated_at = EXCLUDED.calculated_at;

  RETURN NEW;
END;
$$;

CREATE TRIGGER seeker_profile_match_rescore
  AFTER INSERT OR UPDATE ON public.seeker_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recompute_seeker_scores();
```

**Note:** `compute_match_score()` is called twice per job in this pattern (once for total, once for breakdown). An optimisation is to capture the full jsonb result once:

```sql
-- Optimised single-call variant
INSERT INTO public.match_scores (job_id, seeker_id, total_score, breakdown, calculated_at)
SELECT
  j.id,
  NEW.id,
  (result->>'total_score')::int,
  result->'breakdown',
  now()
FROM public.jobs j
CROSS JOIN LATERAL public.compute_match_score(NEW.id, j.id) AS result
WHERE j.status = 'active'
  AND j.sector = ANY(NEW.sector_pref)
ON CONFLICT (job_id, seeker_id)
DO UPDATE SET
  total_score   = EXCLUDED.total_score,
  breakdown     = EXCLUDED.breakdown,
  calculated_at = EXCLUDED.calculated_at;
```

### Pattern 2: Jobs-Side Trigger (Sector-Scoped)

**What:** When a job is inserted or updated, recompute scores for all seekers whose `sector_pref` overlaps the job's sector.

```sql
CREATE OR REPLACE FUNCTION public.trigger_recompute_job_scores()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Only recompute if job is active
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.match_scores (job_id, seeker_id, total_score, breakdown, calculated_at)
  SELECT
    NEW.id,
    sp.id,
    (public.compute_match_score(sp.id, NEW.id)->>'total_score')::int,
    public.compute_match_score(sp.id, NEW.id)->'breakdown',
    now()
  FROM public.seeker_profiles sp
  WHERE NEW.sector = ANY(sp.sector_pref)
  ON CONFLICT (job_id, seeker_id)
  DO UPDATE SET
    total_score   = EXCLUDED.total_score,
    breakdown     = EXCLUDED.breakdown,
    calculated_at = EXCLUDED.calculated_at;

  RETURN NEW;
END;
$$;

CREATE TRIGGER job_match_rescore
  AFTER INSERT OR UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recompute_job_scores();
```

### Pattern 3: pg_cron Nightly Batch

**What:** Full recompute at 3 AM UTC daily — handles data integrity drift and day-7 recency multiplier transitions.

```sql
-- Source: 008_job_expiry_cron.sql establishes this exact pattern
SELECT cron.schedule(
  'nightly-match-score-recompute',
  '0 3 * * *',
  $$
    INSERT INTO public.match_scores (job_id, seeker_id, total_score, breakdown, calculated_at)
    SELECT
      j.id,
      sp.id,
      (public.compute_match_score(sp.id, j.id)->>'total_score')::int,
      public.compute_match_score(sp.id, j.id)->'breakdown',
      now()
    FROM public.jobs j
    JOIN public.seeker_profiles sp ON j.sector = ANY(sp.sector_pref)
    WHERE j.status = 'active'
    ON CONFLICT (job_id, seeker_id)
    DO UPDATE SET
      total_score   = EXCLUDED.total_score,
      breakdown     = EXCLUDED.breakdown,
      calculated_at = EXCLUDED.calculated_at
    WHERE match_scores.total_score IS DISTINCT FROM EXCLUDED.total_score
       OR match_scores.breakdown IS DISTINCT FROM EXCLUDED.breakdown;
  $$
);
```

The `WHERE ... IS DISTINCT FROM` guards prevent unnecessary writes to rows that haven't changed, keeping the nightly run efficient.

### Pattern 4: Claude API Edge Function

**What:** Deno Edge Function that receives a `{ seeker_id, job_id }` payload, loads breakdown from `match_scores`, calls Claude, and upserts `explanation` back to the same row.

```typescript
// Source: Supabase Edge Functions Deno pattern + Anthropic SDK esm.sh pattern
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { seeker_id, job_id } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Load the match score breakdown
    const { data: scoreRow, error: scoreError } = await supabase
      .from('match_scores')
      .select('breakdown, total_score')
      .eq('seeker_id', seeker_id)
      .eq('job_id', job_id)
      .single()

    if (scoreError || !scoreRow) {
      return new Response(JSON.stringify({ error: 'Score not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Call Claude with retry logic
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

    let explanation: string | null = null
    let attempt = 0
    const delays = [1000, 2000, 4000]

    while (attempt < 3 && explanation === null) {
      try {
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 150,
          messages: [{
            role: 'user',
            content: buildPrompt(scoreRow.total_score, scoreRow.breakdown),
          }],
        })
        explanation = message.content[0].type === 'text' ? message.content[0].text : null
      } catch (err) {
        attempt++
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, delays[attempt - 1]))
        }
      }
      if (explanation !== null) break
      attempt++
    }

    if (explanation) {
      await supabase
        .from('match_scores')
        .update({ explanation })
        .eq('seeker_id', seeker_id)
        .eq('job_id', job_id)
    }

    return new Response(
      JSON.stringify({ explanation }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('generate-match-explanation error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

### Pattern 5: Frontend — Switch from RPC to Table Read

**What:** Replace `supabase.rpc('compute_match_score', ...)` calls with direct table queries now that scores are pre-computed. Also include `explanation` in the select.

```typescript
// Source: Existing JobDetail.tsx pattern — replace the RPC call at line ~222

// Before (Phase 3):
const { data: scoreData } = await supabase
  .rpc('compute_match_score', { p_seeker_id: profile.id, p_job_id: jobId })

// After (Phase 4):
const { data: scoreData } = await supabase
  .from('match_scores')
  .select('total_score, breakdown, explanation')
  .eq('seeker_id', profile.id)
  .eq('job_id', jobId)
  .single()
```

### Anti-Patterns to Avoid

- **Calling `compute_match_score()` at query time in the frontend**: Phase 4's entire point is removing this. After the migration, all reads hit the pre-computed table only.
- **Building triggers that fire for every column update**: Use `IF (OLD.shed_types_experienced IS DISTINCT FROM NEW.shed_types_experienced OR OLD.region IS DISTINCT FROM NEW.region ...)` guards on the seeker trigger to skip rescore on irrelevant field updates like `updated_at`.
- **Generating AI explanations synchronously in the trigger path**: The explanation Edge Function must be invoked asynchronously (from the application layer or a separate `pg_net` HTTP call) — not from inside the DB trigger where it would block the transaction and risk timeouts.
- **Double-calling `compute_match_score()` per row**: Always capture the full jsonb result once using `CROSS JOIN LATERAL` rather than calling the function separately for `total_score` and `breakdown`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scheduling nightly batch | Custom cron job outside Supabase | `pg_cron` (already enabled) | Already used in project for job expiry — same pattern, zero new dependencies |
| Retry logic in Edge Function | Manual loop with setTimeout | Standard exponential backoff in the function body | Claude API errors are transient; 3 attempts with 1s/2s/4s covers flakiness without complexity |
| Conflict resolution on upsert | DELETE + INSERT | `ON CONFLICT (job_id, seeker_id) DO UPDATE` | The unique constraint `match_scores_job_seeker_key` is already defined — use it |
| NL explanation generation | Template strings | Claude API | Template strings cannot produce natural, contextual language — every explanation would sound identical |

**Key insight:** The scoring function, table schema, indexes, and RLS policies are all already built. Phase 4 is glue and infrastructure work, not net-new logic.

---

## Common Pitfalls

### Pitfall 1: Trigger Fires on Non-Scoring Columns

**What goes wrong:** The seeker trigger fires on every UPDATE to `seeker_profiles`, including `updated_at` bumps, onboarding step increments, etc. — causing unnecessary mass rescoring.

**Why it happens:** `FOR EACH ROW` triggers don't automatically filter by which columns changed.

**How to avoid:** Add column-level guards inside the trigger function:
```sql
IF (
  OLD.shed_types_experienced IS NOT DISTINCT FROM NEW.shed_types_experienced AND
  OLD.region IS NOT DISTINCT FROM NEW.region AND
  OLD.sector_pref IS NOT DISTINCT FROM NEW.sector_pref AND
  OLD.visa_status IS NOT DISTINCT FROM NEW.visa_status AND
  OLD.min_salary IS NOT DISTINCT FROM NEW.min_salary AND
  OLD.accommodation_needed IS NOT DISTINCT FROM NEW.accommodation_needed AND
  OLD.couples_seeking IS NOT DISTINCT FROM NEW.couples_seeking AND
  OLD.open_to_relocate IS NOT DISTINCT FROM NEW.open_to_relocate
) THEN
  RETURN NEW; -- nothing scoring-relevant changed
END IF;
```

Alternatively, PostgreSQL supports `WHEN (condition)` on the trigger definition itself:
```sql
CREATE TRIGGER seeker_profile_match_rescore
  AFTER UPDATE ON public.seeker_profiles
  FOR EACH ROW
  WHEN (
    OLD.shed_types_experienced IS DISTINCT FROM NEW.shed_types_experienced
    OR OLD.region IS DISTINCT FROM NEW.region
    -- etc.
  )
  EXECUTE FUNCTION public.trigger_recompute_seeker_scores();
```

**Warning signs:** High DB CPU during seeker profile saves for non-scoring fields.

### Pitfall 2: Job Trigger Rescores for Inactive Jobs

**What goes wrong:** Trigger fires when a job is paused, filled, or archived — wasting CPU computing scores for jobs nobody can apply to.

**Why it happens:** The trigger fires for any UPDATE, including status changes.

**How to avoid:** Guard the trigger function body with `IF NEW.status != 'active' THEN RETURN NEW; END IF;`.

**Warning signs:** High write load to `match_scores` whenever job status management happens.

### Pitfall 3: Backfill Migration Timeout

**What goes wrong:** The backfill migration that computes all existing seeker-job pairs times out on Supabase if run as a single transaction with tens of thousands of pairs.

**Why it happens:** Supabase migrations run in a transaction; long-running operations can hit statement timeouts.

**How to avoid:** Two options:
1. Add `SET statement_timeout = '0';` at the top of the backfill migration to disable the timeout for this migration only.
2. Write the backfill as a loop with batching and intermediate commits (requires a DO block with COMMIT, which is only possible in non-transaction-mode migrations).

The simpler approach for MVP scale (low seeker/job count) is `SET statement_timeout = '0';`.

**Warning signs:** Migration fails with "canceling statement due to statement timeout".

### Pitfall 4: Explanation Column Breaks MatchBreakdown Component

**What goes wrong:** `MatchBreakdown.tsx` receives a score object with an `explanation` field it wasn't typed for — TypeScript error or stale UI.

**Why it happens:** The `MatchScore` type in `src/types/domain.ts` doesn't include `explanation` yet.

**How to avoid:** Update `MatchScore` type to include `explanation?: string | null` before updating the component.

**Warning signs:** TypeScript compile errors in `MatchBreakdown.tsx` after the type update.

### Pitfall 5: ApplicantDashboard Uses compute_match_scores_batch RPC

**What goes wrong:** The employer applicant dashboard continues calling the batch RPC even after Phase 4 switches to pre-computed scores, causing stale data or incorrect scores.

**Why it happens:** `ApplicantDashboard.tsx` has its own score-fetching logic with `scoreMap` state.

**How to avoid:** In Phase 4, replace the batch RPC call in `ApplicantDashboard.tsx` with a bulk `match_scores` table read filtered by `job_id` and a list of `seeker_id`s from the applicants array.

**Warning signs:** Scores in the applicant dashboard differ from scores on the job detail page.

### Pitfall 6: nightly batch re-triggers AI explanation generation for unchanged scores

**What goes wrong:** Nightly batch overwrites `calculated_at` and nulls `explanation` for rows whose scores haven't changed, causing unnecessary Claude API calls.

**Why it happens:** A naive `DO UPDATE SET ... explanation = NULL` on upsert resets the explanation column.

**How to avoid:** The nightly batch upsert should NOT touch the `explanation` column — only update `total_score`, `breakdown`, and `calculated_at`. The nightly batch also runs a separate pass to retry null explanations:
```sql
-- Nightly batch upsert: never touch explanation column
ON CONFLICT (job_id, seeker_id)
DO UPDATE SET
  total_score   = EXCLUDED.total_score,
  breakdown     = EXCLUDED.breakdown,
  calculated_at = EXCLUDED.calculated_at
  -- explanation intentionally excluded
```

---

## Code Examples

Verified patterns from official sources and existing project code:

### match_scores Table: Add explanation Column

```sql
-- Source: existing 001_initial_schema.sql schema pattern
ALTER TABLE public.match_scores
  ADD COLUMN IF NOT EXISTS explanation text;

-- Index for finding null explanations (nightly retry pass)
CREATE INDEX match_scores_explanation_null_idx
  ON public.match_scores (id)
  WHERE explanation IS NULL;
```

### MatchScore Type Update

```typescript
// Source: src/types/domain.ts — extend existing MatchScore interface
export interface MatchScore {
  total_score: number
  breakdown: {
    shed_type: number
    location: number
    accommodation: number
    skills: number
    salary: number
    visa: number
    couples: number
  }
  explanation?: string | null  // NEW: null = not yet generated, undefined = not selected
}
```

### MatchBreakdown AI Explanation Section

```tsx
// Source: src/components/ui/MatchBreakdown.tsx — add below the category rows div
{score.explanation && (
  <div
    className="mt-4 pt-4 border-t border-fog"
  >
    <p
      className="text-[11px] font-body font-semibold uppercase tracking-wide mb-1.5"
      style={{ color: 'var(--color-light)' }}
    >
      Why this match
    </p>
    <p
      className="text-[13px] font-body leading-relaxed"
      style={{ color: 'var(--color-mid)' }}
    >
      {score.explanation}
    </p>
  </div>
)}
```

### Claude Prompt for Match Explanation

```typescript
// Deterministic, structured prompt to get 2-3 sentence plain English output
function buildPrompt(totalScore: number, breakdown: Record<string, number>): string {
  return `You are writing match feedback for a New Zealand farm job platform. Be honest, practical, and use plain farm-worker language. Never use corporate-speak or oversell.

Match score: ${totalScore}/100
Breakdown:
- Shed type: ${breakdown.shed_type}/25
- Location: ${breakdown.location}/20
- Accommodation: ${breakdown.accommodation}/20
- Skills: ${breakdown.skills}/20
- Salary: ${breakdown.salary}/10
- Visa: ${breakdown.visa}/5
- Couples bonus: ${breakdown.couples}/5

Write exactly 2-3 sentences explaining what drives this match score. Lead with the strongest factor. Be honest about gaps — if the score is low, say why clearly. Example style: "You've got rotary experience and they run a rotary shed — that's your strongest match. The salary sits at the top of your range. Location is the main gap — you're in Waikato and this role is Canterbury."

Only output the explanation sentences. No preamble, no labels, no bullet points.`
}
```

### JobSearch — Switch to Pre-Computed Scores

```typescript
// Source: src/pages/jobs/JobSearch.tsx — replace compute_match_scores_batch RPC call
// Before: const { data } = await supabase.rpc('compute_match_scores_batch', {...})
// After:
const { data: scoreRows } = await supabase
  .from('match_scores')
  .select('job_id, total_score, breakdown')
  .eq('seeker_id', seekerProfileId)
  .in('job_id', jobIds)

// Build scoreMap from result (same shape as before)
const scoreMap = new Map(
  (scoreRows ?? []).map(row => [row.job_id, { total_score: row.total_score, breakdown: row.breakdown }])
)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Query-time scoring via `compute_match_score()` RPC | Pre-computed, trigger-maintained `match_scores` rows | Phase 4 | Eliminates per-request DB function calls; search page reads index instead of executing 7-dimension logic per job |
| No AI explanation | 2-3 sentence Claude explanation per pair | Phase 4 | Differentiates platform; helps seekers understand low scores, not just high ones |
| Batch RPC for search page scores | Direct table read with `IN` filter | Phase 4 | Table reads are faster and use existing indexes |

**Deprecated/outdated:**
- `compute_match_scores_batch()` RPC: Still exists in the DB but frontend should no longer call it after Phase 4. The function can remain for diagnostics/admin use.
- `supabase.rpc('compute_match_score', ...)` in `JobDetail.tsx` line ~222: Replace with table read.

---

## Open Questions

1. **Trigger invocation of AI explanation generation**
   - What we know: Triggers are synchronous; Claude API calls are async and slow; a DB trigger cannot call an Edge Function directly without `pg_net` extension.
   - What's unclear: Is `pg_net` available on the project's Supabase plan?
   - Recommendation: Invoke the `generate-match-explanation` Edge Function from the application layer, not from the trigger. After the frontend writes (or after the trigger fires and the frontend detects a score without an explanation), call the Edge Function client-side. Alternatively, the nightly batch can process all null explanations. This is the cleanest approach that doesn't require `pg_net`.

2. **Trigger performance at scale**
   - What we know: A seeker profile update currently triggers recompute for all active jobs in their sector. At MVP scale (tens of seekers, tens of jobs), this is trivial.
   - What's unclear: At what seeker/job count does the per-trigger recompute become slow?
   - Recommendation: For MVP, synchronous trigger is fine. Add a `RAISE NOTICE` in dev to log row counts. Document that at >500 seekers × >500 jobs per sector, a background queue approach should replace the trigger.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^3.1.1 + @testing-library/react |
| Config file | `vitest.config.ts` (mergeConfig with vite.config.ts) |
| Quick run command | `npx vitest run tests/match-scoring.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MTCH-01 | All 6 scoring dimensions return correct point values | unit | `npx vitest run tests/match-scoring.test.ts` | ❌ Wave 0 |
| MTCH-02 | Couples bonus adds 5pts when both flags true, 0pts otherwise | unit | `npx vitest run tests/match-scoring.test.ts` | ❌ Wave 0 |
| MTCH-03 | Recency multiplier: jobs <7 days get 1.1×, capped at 100 | unit | `npx vitest run tests/match-scoring.test.ts` | ❌ Wave 0 |
| MTCH-04 | Pre-computed scores exist in match_scores table after trigger | integration/manual | Manual — requires live Supabase | manual-only |
| MTCH-05 | Score updates within 60s of seeker profile change | integration/manual | Manual — requires live Supabase + timer | manual-only |
| MTCH-06 | AI explanation present in MatchBreakdown when score has explanation | unit | `npx vitest run tests/match-breakdown-ui.test.tsx` | ❌ Wave 0 |

**Note on MTCH-04 and MTCH-05:** These require a live Supabase instance with the trigger deployed. They are verified manually during the verification phase, not automated.

**Note on MTCH-01/02/03:** The scoring logic lives in a PostgreSQL function. Unit tests should test a TypeScript mirror of the scoring logic (pure function, no DB) to validate the math — this is the same approach used in Phase 3's `tests/seeker-profile.test.ts`.

### Sampling Rate

- **Per task commit:** `npx vitest run tests/match-scoring.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/match-scoring.test.ts` — covers MTCH-01, MTCH-02, MTCH-03 (pure TS scoring logic unit tests)
- [ ] `tests/match-breakdown-ui.test.tsx` — covers MTCH-06 (MatchBreakdown renders explanation conditionally)

*(Existing test infrastructure: `vitest.config.ts`, `tests/setup.ts`, `@testing-library/react` are all present — no framework install needed)*

---

## Sources

### Primary (HIGH confidence)
- Direct code reading: `supabase/migrations/009_seeker_onboarding.sql` lines 108-363 — full `compute_match_score()` and `compute_match_scores_batch()` implementations
- Direct code reading: `supabase/migrations/001_initial_schema.sql` lines 172-188 — `match_scores` table schema and existing indexes
- Direct code reading: `supabase/migrations/002_rls_policies.sql` lines 241-264 — RLS policies on `match_scores`
- Direct code reading: `supabase/migrations/008_job_expiry_cron.sql` — confirms pg_cron available and establishes `cron.schedule()` pattern
- Direct code reading: `supabase/functions/create-payment-intent/index.ts` — Deno Edge Function pattern (esm.sh imports, CORS headers, service role client)
- Direct code reading: `src/components/ui/MatchBreakdown.tsx` — component structure and DIMENSIONS const
- Direct code reading: `src/types/domain.ts` — `MatchScore` interface (needs `explanation` field added)
- Direct code reading: `vitest.config.ts` + `tests/setup.ts` — test infrastructure confirmed present
- `SPEC.md` §9 — scoring dimensions, display rules, recalculation triggers, AI explanation spec
- `SPEC.md` §8.7 — `match_scores` table schema (with `explanation` column listed in SPEC but not yet in migration)
- `.planning/phases/04-match-scoring-engine/04-CONTEXT.md` — all locked decisions and constraints

### Secondary (MEDIUM confidence)
- PostgreSQL AFTER trigger pattern with `ON CONFLICT DO UPDATE` — standard PostgreSQL documentation pattern
- `@anthropic-ai/sdk` importable via `https://esm.sh/@anthropic-ai/sdk` — consistent with all esm.sh patterns used in project

### Tertiary (LOW confidence)
- `pg_net` availability for HTTP calls from triggers — not verified; recommendation is to avoid this approach entirely

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components are confirmed present in existing codebase or documented in SPEC
- Architecture: HIGH — triggers, pg_cron, and Edge Function patterns are directly read from existing code
- Pitfalls: HIGH — derived from direct reading of existing code and standard PostgreSQL trigger behaviour
- AI explanation prompt: MEDIUM — prompt design is Claude's discretion per CONTEXT.md; structure confirmed but exact wording will iterate

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable stack — PostgreSQL triggers and pg_cron are not fast-moving)
