import { readFileSync } from 'node:fs'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Founder analytics RPCs (migration 039) — adversarial suite in the house
// style of admin-rpc-gate.test.ts + admin-rls-not-widened.test.ts.
//
// Live ACL evidence (captured 2026-06-11, post-apply):
//   pg_proc: all 4 fns prosecdef=true, proconfig search_path=public,
//   has_function_privilege('anon', ..., 'EXECUTE') = false for all 4,
//   has_function_privilege('authenticated', ...) = true.
//   Anon PostgREST call -> 42501 "permission denied for function
//   admin_analytics_funnel" — rejected at the ACL layer BEFORE _admin_gate.
// The static assertions below keep that posture from regressing in the
// migration source; the gate-contract tests pin the frontend's handling.

// Strip `-- ...` comments before scanning: the header documents the posture
// in prose ("SECURITY DEFINER", "TO PUBLIC", "emails"), which must not trip
// assertions that target executable SQL only.
const MIGRATION = readFileSync('supabase/migrations/039_admin_analytics_rpcs.sql', 'utf8')
  .split('\n')
  .map((l) => l.replace(/--.*$/, ''))
  .join('\n')

const RPCS = [
  'admin_analytics_funnel',
  'admin_analytics_cohorts',
  'admin_analytics_match_quality',
  'admin_analytics_revenue',
] as const

describe('039 static posture — analytics RPCs do not widen access (ANLY-RLS-1)', () => {
  it('declares exactly the four designed functions, all SECURITY DEFINER with pinned search_path', () => {
    const defs = MIGRATION.match(/CREATE OR REPLACE FUNCTION public\.(\w+)/g) ?? []
    expect(defs.map((d) => d.replace(/.*public\./, '')).sort()).toEqual([...RPCS].sort())
    // One SECURITY DEFINER + one pinned search_path per function definition.
    expect(MIGRATION.match(/SECURITY DEFINER/g)).toHaveLength(RPCS.length)
    expect(MIGRATION.match(/SET search_path = public/g)).toHaveLength(RPCS.length)
  })

  it('every function calls _admin_gate() before anything else', () => {
    // Each plpgsql body's first statement after BEGIN must be the gate.
    const bodies = MIGRATION.split('CREATE OR REPLACE FUNCTION').slice(1)
    expect(bodies).toHaveLength(RPCS.length)
    for (const body of bodies) {
      const begin = body.indexOf('BEGIN')
      const gate = body.indexOf('PERFORM public._admin_gate();')
      expect(gate).toBeGreaterThan(begin)
      // Nothing but whitespace/comments between BEGIN and the gate call.
      const between = body
        .slice(begin + 'BEGIN'.length, gate)
        .replace(/--[^\n]*/g, '')
        .trim()
      expect(between).toBe('')
    }
  })

  it('grants EXECUTE to authenticated only, and strips the PUBLIC/anon default', () => {
    for (const fn of RPCS) {
      expect(MIGRATION).toMatch(
        new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\([^)]*\\) FROM PUBLIC, anon;`),
      )
      expect(MIGRATION).toMatch(
        new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${fn}\\([^)]*\\) TO authenticated;`),
      )
    }
    expect(MIGRATION).not.toMatch(/GRANT[^;]+TO[^;]*anon/i)
    expect(MIGRATION).not.toMatch(/TO PUBLIC/i)
  })

  it('is read-only: no tables, triggers, policies, or write statements', () => {
    expect(MIGRATION).not.toMatch(
      /CREATE TABLE|CREATE TRIGGER|CREATE POLICY|ALTER POLICY|DROP POLICY/i,
    )
    expect(MIGRATION).not.toMatch(/\b(INSERT INTO|UPDATE\s+\w+\s+SET|DELETE FROM)\b/i)
  })

  it('returns no row-level PII columns (aggregates only)', () => {
    // The SELECT outputs must never project identity columns. user_id/au.id
    // appear ONLY inside JOIN/WHERE plumbing; email/phone/farm_name/title
    // must not appear at all.
    expect(MIGRATION).not.toMatch(
      /email|phone|farm_name|first_name|last_name|cover_note|ai_summary/i,
    )
    // user_id is allowed in joins but must never be jsonb output:
    expect(MIGRATION).not.toMatch(/jsonb_build_object\([^)]*user_id/is)
  })
})

// ─── Gate contract (mirrors admin-rpc-gate.test.ts ADMIN-GATE-BE style) ──────
const rpcMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: rpcMock },
}))

beforeEach(() => {
  rpcMock.mockReset()
})

describe('analytics RPC backend gate (ANLY-GATE-BE)', () => {
  it('anonymous caller surfaces permission denied (ACL layer, pre-gate)', async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'permission denied for function admin_analytics_funnel' },
    })
    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.rpc('admin_analytics_funnel', { p_from: null, p_to: null })
    expect(error?.message).toContain('permission denied')
  })

  it("non-admin authenticated caller surfaces 'Forbidden: admin role required'", async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Forbidden: admin role required' },
    })
    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.rpc('admin_analytics_revenue', { p_from: null, p_to: null })
    expect(error?.message).toContain('Forbidden: admin role required')
  })
})

// ─── PII shape contract on the payloads the UI consumes ─────────────────────
// Representative fixtures matching migration 039's jsonb output (cohorts +
// match-quality shapes verified against live data 2026-06-11; funnel/revenue
// against the migration source). If the RPC shape grows a PII key, the UI
// types must change and this test must be consciously revisited.

const FORBIDDEN_KEY = /(^|_)(email|phone|user_id|first_name|last_name|farm_name|full_name)($|_)/i

function assertNoPiiKeys(value: unknown, path = '$'): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertNoPiiKeys(v, `${path}[${i}]`))
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      expect(k, `forbidden key at ${path}.${k}`).not.toMatch(FORBIDDEN_KEY)
      assertNoPiiKeys(v, `${path}.${k}`)
    }
  }
}

describe('analytics payload PII shape (ANLY-PII-1)', () => {
  it('funnel payload contains aggregate keys only', () => {
    assertNoPiiKeys({
      range: { from: null, to: null },
      seekers: { signed_up: 4, onboarded: 2, applied_ever: 2, hired: 0 },
      employers: { signed_up: 1, onboarded: 1, posted_job: 1, filled_job: 1 },
      pipeline: { applied: 1, hired: 0 },
      placements_confirmed: 0,
    })
  })

  it('cohorts payload contains aggregate keys only', () => {
    assertNoPiiKeys({
      note: 'proxies',
      cohorts: [
        {
          cohort_month: '2026-04',
          role: 'seeker',
          size: 2,
          active_30d: 2,
          active_90d: 2,
          acted_m1: 0,
          acted_m2: 0,
          acted_m3: 0,
        },
      ],
    })
  })

  it('match-quality + revenue payloads contain aggregate keys only', () => {
    assertNoPiiKeys({
      completed_total: 1,
      low_n_warning: true,
      mean_score_hired: null,
      mean_score_declined: 62.0,
      bands: [{ band: '50-69', applications: 1, hired: 0, placement_rate: 0 }],
    })
    assertNoPiiKeys({
      range: { from: null, to: null },
      listing_fees: { monthly: [], by_tier: [] },
      placement_fees: {
        monthly: [],
        by_region: [{ region: 'Waikato', confirmed: 0, total_nzd: 0 }],
        by_tier: [],
      },
      pipeline: { acknowledged_unconfirmed: 0, value_nzd: 0 },
    })
  })
})
