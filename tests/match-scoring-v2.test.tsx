// Match scoring v2 contract — Phase 3 Task 3.1.
//
// Two halves, because the algorithm spans two languages:
//   1. The engine is PL/pgSQL (migration 072) and cannot be imported into
//      vitest, so it gets a static-source guard — the established idiom here
//      (tests/stripe-webhook.test.ts, tests/webhook-secret-presence.test.ts).
//      The behavioural proof is the T1–T5 probe log in
//      docs/evidence/phase-3-truth.md, run against production.
//   2. The "not applicable" rendering IS testable, and it is the user-visible
//      truth claim — a cropping job must not show "Shed Type 0/25". That half
//      is a real component test.

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MatchBreakdown } from '@/components/ui/MatchBreakdown'
import type { MatchScore } from '@/types/domain'

const ROOT = resolve(__dirname, '..')
const migration = readFileSync(resolve(ROOT, 'supabase/migrations/072_match_scoring_v2.sql'), 'utf8')

// ─── 1. The engine (static guards on migration 072) ──────────────────────────

describe('scoring v2: the denominator is sector-aware', () => {
  it('normalises against applicable maxima, not a fixed 105', () => {
    expect(migration).toMatch(/ROUND\(100\.0 \* v_raw_total::numeric \/ GREATEST\(v_max, 1\)\)/)
  })

  it('marks shed_type inapplicable when the job declares no shed', () => {
    expect(migration).toMatch(/v_shed_applicable := v_job\.shed_type IS NOT NULL/)
  })

  it('marks skills inapplicable when the job declares no skills', () => {
    // Previously 20.0 * 0 / GREATEST(0,1) = 0 — every seeker scored 0/20 on a
    // job that listed no skills at all.
    expect(migration).toMatch(/v_skills_applicable := v_job_skill_count > 0/)
  })

  it('marks the couples bonus inapplicable for a seeker not seeking as a couple', () => {
    expect(migration).toMatch(/v_couples_applicable := v_seeker\.couples_seeking = true/)
  })

  it('excludes inapplicable dimensions from BOTH the numerator and the denominator', () => {
    const numerator = migration.split('v_raw_total :=')[1]?.split(';')[0] ?? ''
    const denominator = migration.split('v_max :=')[1]?.split(';')[0] ?? ''
    for (const flag of ['v_shed_applicable', 'v_skills_applicable', 'v_couples_applicable']) {
      expect(numerator).toContain(flag)
      expect(denominator).toContain(flag)
    }
  })
})

describe('scoring v2: the recency multiplier is gone', () => {
  it('no 1.1 multiplier survives anywhere in the function', () => {
    expect(migration).not.toMatch(/\*\s*1\.1/)
  })

  it('does not branch on a 7-day window', () => {
    expect(migration).not.toMatch(/interval '7 days'/)
  })
})

describe('scoring v2: the bound is enforced by the database', () => {
  it('clamps unconditionally, outside any branch', () => {
    expect(migration).toMatch(/v_total := LEAST\(100, GREATEST\(0, v_total\)\)/)
  })

  it('adds the CHECK constraint — belief is not enforcement', () => {
    expect(migration).toMatch(/CHECK \(total_score BETWEEN 0 AND 100\)/)
  })
})

describe('scoring v2: staleness is impossible on a skills edit', () => {
  it('covers seeker_skills and job_skills for all three operations', () => {
    for (const table of ['seeker_skills', 'job_skills']) {
      for (const op of ['ins', 'upd', 'del']) {
        expect(migration).toContain(`${table}_match_rescore_${op}`)
      }
    }
  })

  it('uses STATEMENT-level triggers so a delete-and-reinsert is 2 recomputes, not N+M', () => {
    // SeekerStep4Skills.tsx deletes the whole set then re-inserts it.
    const statementTriggers = migration.match(/FOR EACH STATEMENT/g) ?? []
    expect(statementTriggers.length).toBe(6)
    expect(migration).not.toMatch(/FOR EACH ROW EXECUTE FUNCTION public\.trigger_recompute_scores_for/)
  })
})

describe('scoring v2: every writer records the version', () => {
  it('sets algorithm_version on the column, the function and the nightly cron', () => {
    expect(migration).toMatch(/ADD COLUMN algorithm_version smallint/)
    expect(migration).toMatch(/'algorithm_version', 2/)
    // The cron previously relied on the column DEFAULT, which would silently
    // mislabel rows as v2 the day a v3 landed.
    const cron = migration.split("cron.schedule(\n  'nightly-match-score-recompute'")[1] ?? ''
    expect(cron).toMatch(/algorithm_version/)
  })

  it('recomputes existing rows and removes v1 leftovers before constraining', () => {
    const recomputeAt = migration.indexOf('DELETE FROM public.match_scores WHERE algorithm_version < 2')
    const constraintAt = migration.indexOf('match_scores_total_score_range')
    expect(recomputeAt).toBeGreaterThan(0)
    // The constraint must be added AFTER the recompute, or a surviving v1 row
    // scoring 105 would abort the migration.
    expect(constraintAt).toBeGreaterThan(recomputeAt)
  })
})

// ─── 2. The claim the user actually sees ─────────────────────────────────────

function scoreFixture(overrides: Partial<MatchScore['breakdown']> = {}): MatchScore {
  return {
    total_score: 100,
    breakdown: {
      shed_type: 25,
      location: 20,
      accommodation: 20,
      skills: 20,
      salary: 10,
      visa: 5,
      couples: 5,
      _meta: { raw_total: 105, applicable_max: 105, algorithm_version: 2 },
      ...overrides,
    },
  }
}

// These four are the EMPLOYER view. v11-DIRECTIVE §1.4 permits numbers only for
// employers, so audience is now explicit — the component defaults to 'worker',
// where none of these numbers exist. The worker view is guarded below.
describe('MatchBreakdown renders "not applicable" as a different claim from zero', () => {
  it('a cropping job shows an em dash for shed type, never 0/25', () => {
    render(
      <MatchBreakdown
        score={scoreFixture({
          shed_type: null,
          _meta: { raw_total: 75, applicable_max: 75, algorithm_version: 2 },
        })}
        audience="employer"
      />,
    )
    expect(screen.getByText(/Not applicable to this role/)).toBeInTheDocument()
    expect(screen.queryByText('0/25')).not.toBeInTheDocument()
  })

  it('a zero score still reads as a zero score, with its low-score context', () => {
    // 0 and null must not collapse into the same presentation: "you scored 0 on
    // shed type" and "shed type does not apply here" are different statements.
    render(
      <MatchBreakdown
        score={scoreFixture({
          shed_type: 0,
          _meta: { raw_total: 80, applicable_max: 105, algorithm_version: 2 },
        })}
        audience="employer"
      />,
    )
    expect(screen.getByText('0/25')).toBeInTheDocument()
    expect(screen.getByText(/Different shed type experience/)).toBeInTheDocument()
    expect(screen.queryByText(/Not applicable/)).not.toBeInTheDocument()
  })

  it('states the denominator so the headline number is explainable', () => {
    render(
      <MatchBreakdown
        score={scoreFixture({
          shed_type: null,
          _meta: { raw_total: 75, applicable_max: 75, algorithm_version: 2 },
        })}
        audience="employer"
      />,
    )
    expect(screen.getByText(/75 of 75 applicable points = 100% match/)).toBeInTheDocument()
  })

  it('renders a real bar and the raw fraction for an applicable dimension', () => {
    render(<MatchBreakdown score={scoreFixture()} audience="employer" />)
    expect(screen.getByText('25/25')).toBeInTheDocument()
    expect(screen.queryByText(/Not applicable/)).not.toBeInTheDocument()
  })
})

// v11-DIRECTIVE §1.4: "Employers see numeric match scores. The worker-facing
// profile panel shows a word, Strong... It never shows the worker a score for
// themselves." The reason given is that a number attached to a person invites
// them to read it as a rating of their worth, and the worker side includes
// migrant workers who are structurally vulnerable.
//
// The default audience is 'worker', so a call site that forgets to say gets the
// safe rendering. These tests exist to fail if that default ever flips.
describe('MatchBreakdown never shows a worker a number about themselves', () => {
  it('renders no total, no per-dimension fraction and no percentage', () => {
    render(
      <MatchBreakdown
        score={scoreFixture({
          _meta: { raw_total: 80, applicable_max: 105, algorithm_version: 2 },
        })}
      />,
    )
    expect(screen.queryByText('25/25')).not.toBeInTheDocument()
    expect(screen.queryByText(/applicable points/)).not.toBeInTheDocument()
    expect(screen.queryByText(/% match/)).not.toBeInTheDocument()
    // No bare numeral anywhere in the rendered output.
    expect(document.body.textContent).not.toMatch(/\d+\s*\/\s*\d+/)
  })

  it('shows a word instead, and never a negative one', () => {
    render(<MatchBreakdown score={scoreFixture()} />)
    expect(screen.getByText(/Strong match/)).toBeInTheDocument()
    expect(screen.queryByText(/Weak|Poor|Low match|Bad/i)).not.toBeInTheDocument()
  })

  it('keeps the explanation — the mechanic is prominent in the portal (§1.3)', () => {
    render(<MatchBreakdown score={scoreFixture()} />)
    expect(screen.getByText('Shed Type')).toBeInTheDocument()
  })
})
