// Match scoring v3 contract — Phase C (migration 093).
//
// Replaces match-scoring-v2.test.tsx, whose subject no longer exists in production. That file
// asserted migration 072's shape — a per-pair denominator and `null` for "inapplicable" — and
// would have stayed green while describing a superseded model, which is worse than no test.
//
// Two halves, because the algorithm spans two languages:
//   1. The engine is PL/pgSQL and cannot be imported into vitest, so it gets static-source
//      guards — the established idiom here. The BEHAVIOURAL proof was run against production
//      on 2026-08-18 inside a transaction that was rolled back: four corpus-shaped seekers
//      against five jobs, recorded in the 093 ledger entry. That probe is what caught a real
//      design error (see the visa-gate test below).
//   2. The rendering IS testable, and it carries the user-visible truth claim.

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MatchBreakdown } from '@/components/ui/MatchBreakdown'
import type { MatchScore } from '@/types/domain'

const ROOT = resolve(__dirname, '..')
const sql = readFileSync(resolve(ROOT, 'supabase/migrations/093_match_score_v3.sql'), 'utf8')

// ─── 1. The engine ───────────────────────────────────────────────────────────

describe('v3: the denominator is fixed, so two jobs can be compared', () => {
  it('normalises against a constant 100, never a per-pair maximum', () => {
    // THE defect this migration exists to fix. v2 computed v_max per pair, so a listing with
    // no shed types and no skills was scored out of 55 and a thorough one out of 100 — and
    // seeker search, the applicant list and the match-alert email all ORDER BY total_score.
    // The emptier listing won.
    expect(sql).toMatch(/'applicable_max',\s*100/)
    expect(sql).not.toMatch(/GREATEST\(v_max, 1\)/)
  })

  it('pays 60% of a dimension when either side leaves it blank', () => {
    // Not zero, which would punish a seeker for an employer's empty field; not "excluded",
    // which is what made the denominator move. Mid-pack, and ungameable by omission.
    for (const dim of ['18', '12', '15', '10', '8', '6', '3']) {
      expect(sql).toMatch(new RegExp(`${dim} \\* 0\\.6`))
    }
  })
})

describe('v3: dealbreakers are gates, not points', () => {
  it('applies them multiplicatively', () => {
    // A migrant who cannot legally take the job is not "80% as good". v2 charged 5 points out
    // of ~100 for that, because an additive model can only express "impossible" with a weight
    // so large it distorts everything else.
    expect(sql).toMatch(/v_multiplier := v_multiplier \* 0\.15/)  // visa
    expect(sql).toMatch(/v_multiplier := v_multiplier \* 0\.40/)  // terms
    expect(sql).toMatch(/v_multiplier := v_multiplier \* 0\.25/)  // accommodation
    expect(sql).toMatch(/v_multiplier := v_multiplier \* 0\.35/)  // sector
  })

  it('the visa gate fires ONLY for needs_sponsorship', () => {
    // The rollback probe caught this: the first draft also gated 'working_holiday' and
    // 'student', and a green WHV backpacker then scored 2-10 against EVERY job, because
    // almost no farm sets visa_sponsorship. A working-holiday visa IS the right to work
    // here — gating on it makes the largest pool of seasonal farm labour unmatchable.
    expect(sql).toMatch(/v_seeker\.visa_status = 'needs_sponsorship'/)
    expect(sql).not.toMatch(/visa_status IN \([^)]*working_holiday/)
  })

  it('does not hard-filter', () => {
    // Hiding jobs is fatal at zero inventory, and people negotiate. Every gate is a
    // multiplier, so a blocked pair sinks without vanishing.
    expect(sql).not.toMatch(/RETURN.*total_score.*0.*gate/i)
  })
})

describe('v3: the two dimensions v2 could not see', () => {
  it('scores the role, using adjacency for partial credit', () => {
    expect(sql).toMatch(/v_job\.role_type = ANY\(v_seeker\.role_type_pref\)/)
    expect(sql).toMatch(/public\.get_adjacent_roles\(pref\)/)
  })

  it('scores the terms', () => {
    // 9 of the 23 corpus posts ask for relief, part-time or short-term work. v2 scored it
    // nowhere, so "relief only" ranked against permanent jobs.
    expect(sql).toMatch(/v_job\.contract_type = ANY\(v_seeker\.contract_type_pref\)/)
  })

  it('demotes shed type from the largest weight to a tie-breaker', () => {
    // It was 25 in v2 — bigger than location, bigger than skills — while the role scored
    // zero. One sector's equipment detail outranking the work itself.
    expect(sql).toMatch(/v_shed := 3;/)
    expect(sql).not.toMatch(/v_shed := 25;/)
  })
})

describe('v3: experience is two-sided', () => {
  it('penalises over-qualification as well as under-qualification', () => {
    // ~35% of the corpus is entry-level, and v2's experience fields only ever SUBTRACTED, so
    // green was pure deficit. It also could not say that a 10-year herd manager in an entry
    // Farm Assistant role is a poor match. They are: they leave in three months.
    expect(sql).toMatch(/v_seeker\.years_experience < v_floor/)
    expect(sql).toMatch(/v_seeker\.years_experience > v_ceiling/)
  })

  it('floors the over-qualified penalty, because they are still a real candidate', () => {
    expect(sql).toMatch(/GREATEST\(4, 10 - 6\.0/)
  })
})

// ─── 2. The rendering ────────────────────────────────────────────────────────

const BLOCKED: MatchScore = {
  total_score: 22,
  breakdown: {
    role: 0, skills: 9, location: 15, contract: 0, accommodation: 10,
    experience: 10, salary: 8, timing: 4, herd_size: 2, shed_type: 2,
    gates: { visa: false, terms: true, accommodation: false, sector: false },
    _meta: { raw_total: 60, applicable_max: 100, gate_multiplier: 0.4 },
  },
} as MatchScore

describe('v3: a blocker reads as a blocker, not as lost points', () => {
  it('names the blocker in words for an employer', () => {
    const { container } = render(<MatchBreakdown score={BLOCKED} audience="employer" />)
    expect(container.textContent).toMatch(/Blocker/)
    expect(container.textContent).toMatch(/not the kind of engagement/i)
  })

  it('tells a worker what is in the way without showing them a number', () => {
    // §1.4 forbids the worker a score for themselves. It does not forbid telling them WHY a
    // role does not fit — that is the half they can act on.
    const { container } = render(<MatchBreakdown score={BLOCKED} audience="worker" />)
    expect(container.textContent).toMatch(/Blocker/)
    expect((container.textContent ?? '').match(/\d+/g) ?? []).toEqual([])
  })

  it('renders no blocker band when nothing is blocked', () => {
    const clear = {
      ...BLOCKED,
      breakdown: {
        ...BLOCKED.breakdown,
        gates: { visa: false, terms: false, accommodation: false, sector: false },
      },
    } as MatchScore
    const { container } = render(<MatchBreakdown score={clear} audience="employer" />)
    expect(container.textContent).not.toMatch(/Blocker/)
  })
})
