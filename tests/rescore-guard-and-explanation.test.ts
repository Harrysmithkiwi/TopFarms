import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Test intent — audit F-15 + F-20 (Phase C4), one migration on purpose.
//
// BOTH tickets rewrite the same two rescore trigger functions. Applied as separate migrations
// the second silently reverts the first, which is why they share a file — and why this test
// asserts they are in the same file.
//
// F-15: both rescore triggers early-return when "nothing relevant changed", and both column
// lists had fallen behind the score. The seeker list named 8 columns while compute_match_score
// v3 reads 15. The audit named `pets` and `family`; v3 added five more, including
// `role_type_pref` — the largest dimension at 18 points — so after 093 a seeker could change
// the role they want and their score would not move. The job side was equally stale.
//
// F-20: `match_scores.explanation` is LLM prose about a specific score, and no writer cleared
// it, so a rescore left last week's reasoning on this week's number.
//
// Proven on prod inside a rolled-back transaction, 2026-08-18:
//   role_type_pref change  -> score 82 -> 64 (exactly the 18-point role dimension) and
//                             explanations remaining: 2 -> 0
//   narrow sector_pref     -> rows 2 -> 1, sheep_beef orphans 0
//   irrelevant edit        -> explanation KEPT (no spurious invalidation)

const SQL = readFileSync(
  join(process.cwd(), 'supabase/migrations/094_rescore_guard_and_explanation_invalidation.sql'),
  'utf-8',
)

function fnBody(name: string): string {
  const i = SQL.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`)
  expect(i, `${name} not defined in 094`).toBeGreaterThan(-1)
  const rest = SQL.slice(i)
  const end = rest.search(/\n\$(function)?\$;/)
  return rest.slice(0, end === -1 ? undefined : end)
}

describe('F-15 + F-20 must ship together', () => {
  it('both fixes live in one migration', () => {
    // Separate migrations would each CREATE OR REPLACE the same two functions, and whichever
    // landed last would drop the other's change with no error.
    expect(SQL).toMatch(/_match_score_invalidate_explanation/)
    expect(SQL).toMatch(/trigger_recompute_seeker_scores/)
    expect(SQL).toMatch(/trigger_recompute_job_scores/)
  })
})

describe('F-15 — the guard sees every column the score reads', () => {
  const SEEKER_COLUMNS = [
    'region', 'open_to_relocate', 'sector_pref', 'role_type_pref', 'contract_type_pref',
    'years_experience', 'accommodation_needed', 'pets', 'family', 'couples_seeking',
    'visa_status', 'min_salary', 'availability_date', 'herd_sizes_worked',
    'shed_types_experienced',
  ]
  const JOB_COLUMNS = [
    'sector', 'region', 'role_type', 'contract_type', 'shed_type', 'herd_size_min',
    'herd_size_max', 'salary_min', 'salary_max', 'min_dairy_experience', 'seniority_level',
    'start_date', 'visa_sponsorship', 'accommodation', 'status',
  ]

  it.each(SEEKER_COLUMNS)('seeker guard watches %s', (col) => {
    const guard = fnBody('trigger_recompute_seeker_scores')
    expect(guard).toMatch(new RegExp(`OLD\\.${col}\\s+IS NOT DISTINCT FROM NEW\\.${col}`))
  })

  it.each(JOB_COLUMNS)('job guard watches %s', (col) => {
    const guard = fnBody('trigger_recompute_job_scores')
    expect(guard).toMatch(new RegExp(`OLD\\.${col}\\s+IS NOT DISTINCT FROM NEW\\.${col}`))
  })

  it('neither guard watches views_count', () => {
    // It moves on every page view, and a rescore is a cross join over every seeker.
    expect(SQL).not.toMatch(/OLD\.views_count/)
  })

  it('narrowing sector_pref removes the orphaned rows', () => {
    // match_scores is what job search reads AND what the operator match-alert emails from, so
    // an orphan is not merely stale data — the seeker is still shown, and still emailed
    // about, a sector they explicitly removed.
    const body = fnBody('trigger_recompute_seeker_scores')
    expect(body).toMatch(/DELETE FROM public\.match_scores ms/)
    expect(body).toMatch(/NEW\.sector_pref IS NULL OR NOT \(j\.sector = ANY\(NEW\.sector_pref\)\)/)
    // Before the insert: a reconcile that runs after would race the upsert it is reconciling.
    expect(body.indexOf('DELETE FROM public.match_scores')).toBeLessThan(
      body.indexOf('INSERT INTO public.match_scores'),
    )
  })
})

describe('F-20 — an explanation cannot outlive its score', () => {
  it('is enforced on the table, not in each writer', () => {
    // Three writers today (job-side, seeker-side, seeker_skills) and a fourth would not know
    // the rule. A per-writer ON CONFLICT clause is a rule you can forget; a trigger is not.
    expect(SQL).toMatch(/CREATE TRIGGER match_scores_invalidate_explanation\s*\n\s*BEFORE UPDATE ON public\.match_scores/)
  })

  it('drops the explanation when the score, breakdown or version moves', () => {
    const body = fnBody('_match_score_invalidate_explanation')
    expect(body).toMatch(/NEW\.total_score\s+IS DISTINCT FROM OLD\.total_score/)
    expect(body).toMatch(/NEW\.breakdown\s+IS DISTINCT FROM OLD\.breakdown/)
    expect(body).toMatch(/NEW\.algorithm_version IS DISTINCT FROM OLD\.algorithm_version/)
    expect(body).toMatch(/NEW\.explanation := NULL/)
  })

  it('does not fire when only the explanation is written', () => {
    // generate-match-explanation writes explanation alone. If the guard were unconditional it
    // would erase the very prose it was invoked to store.
    const body = fnBody('_match_score_invalidate_explanation')
    expect(body).toMatch(/IF NEW\.total_score/)
    expect(body).not.toMatch(/^\s*NEW\.explanation := NULL;\s*\n\s*RETURN NEW;/m)
  })
})
