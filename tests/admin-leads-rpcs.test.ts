import { readFileSync } from 'node:fs'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Leads pipeline L0 (migration 041) — adversarial posture suite, same style
// as admin-analytics-rpcs.test.ts. Live evidence captured 2026-06-11
// post-apply: _lead_intake exercised against prod (inserted/unique ->
// exact_duplicate on re-submit -> suspect_duplicate on similar name ->
// SUPPRESSED refusal for a suppression-listed fingerprint; probe rows
// cleaned to 0/0/0); anon: leads tables read as [], admin_lead_capture ->
// 42501 permission denied.

const RAW = readFileSync('supabase/migrations/041_leads_pipeline.sql', 'utf8')
const MIGRATION = RAW.split('\n')
  .map((l) => l.replace(/--.*$/, ''))
  .join('\n')

const ADMIN_RPCS = [
  'admin_lead_capture',
  'admin_leads_staging_list',
  'admin_leads_list',
  'admin_lead_approve',
  'admin_lead_reject',
  'admin_lead_set_status',
]

describe('041 static posture (LEADS-RLS-1)', () => {
  it('all three tables enable RLS with zero CREATE POLICY (deny-by-default)', () => {
    for (const t of ['leads', 'lead_staging', 'lead_suppression']) {
      expect(MIGRATION).toContain(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY`)
    }
    expect(MIGRATION).not.toMatch(/CREATE POLICY/i)
  })

  it('every admin RPC is SECURITY DEFINER, pins search_path, and gates first', () => {
    for (const fn of ADMIN_RPCS) {
      const body = MIGRATION.split(`FUNCTION public.${fn}(`)[1]
      expect(body, fn).toBeTruthy()
      const head = body.slice(0, body.indexOf('$$;'))
      expect(head, fn).toContain('SECURITY DEFINER')
      expect(head, fn).toContain('SET search_path = public')
      const begin = head.indexOf('BEGIN')
      const gate = head.indexOf('PERFORM public._admin_gate();')
      expect(gate, fn).toBeGreaterThan(begin)
      expect(head.slice(begin + 5, gate).trim(), `${fn}: gate must be first`).toBe('')
    }
  })

  it('corrected-037 grants: REVOKE ALL FROM PUBLIC at birth; no anon grants anywhere', () => {
    for (const fn of ADMIN_RPCS) {
      expect(MIGRATION).toMatch(
        new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\([^)]*\\) FROM PUBLIC, anon;`),
      )
      expect(MIGRATION).toMatch(
        new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${fn}\\([^)]*\\) TO authenticated;`),
      )
    }
    expect(MIGRATION).not.toMatch(/GRANT[^;]+TO[^;]*\banon\b/i)
    expect(MIGRATION).not.toMatch(/\bTO PUBLIC\b/i)
  })

  it('the intake core is service_role-only (never client-callable)', () => {
    expect(MIGRATION).toMatch(
      /REVOKE ALL ON FUNCTION public\._lead_intake\([^)]*\) FROM PUBLIC, anon, authenticated;/,
    )
    expect(MIGRATION).toMatch(
      /GRANT EXECUTE ON FUNCTION public\._lead_intake\([^)]*\) TO service_role;/,
    )
  })

  it('approval gate is the only staging->leads path: exactly one INSERT INTO leads', () => {
    const inserts = MIGRATION.match(/INSERT INTO leads\b/g) ?? []
    expect(inserts).toHaveLength(1)
    // ...and it lives inside admin_lead_approve.
    const approve = MIGRATION.split('FUNCTION public.admin_lead_approve(')[1].split('$$;')[0]
    expect(approve).toContain('INSERT INTO leads')
  })

  it('suppression is checked at the door, before any insert', () => {
    const intake = MIGRATION.split('FUNCTION public._lead_intake(')[1].split('$$;')[0]
    const suppressionCheck = intake.indexOf('FROM lead_suppression')
    const stagingInsert = intake.indexOf('INSERT INTO lead_staging')
    expect(suppressionCheck).toBeGreaterThan(-1)
    expect(stagingInsert).toBeGreaterThan(suppressionCheck)
  })

  it('retention crons exist and anonymise genuinely strips PII (no soft-delete flag)', () => {
    expect(MIGRATION).toContain("cron.schedule(\n  'lead-staging-purge'")
    expect(MIGRATION).toContain("cron.schedule(\n  'lead-dead-anonymise'")
    const anon = MIGRATION.split("'lead-dead-anonymise'")[1]
    for (const strip of [
      "display_name = '[anonymised]'",
      'contact = NULL',
      'notes = NULL',
      'source_ref = NULL',
    ]) {
      expect(anon).toContain(strip)
    }
    expect(anon).not.toMatch(/anonymised\s*=\s*true|is_anonymised/i)
  })
})

// ─── Gate contract (house style) ─────────────────────────────────────────────
const rpcMock = vi.fn()
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: rpcMock } }))
beforeEach(() => rpcMock.mockReset())

describe('leads RPC backend gate (LEADS-GATE-BE)', () => {
  it('anonymous caller surfaces permission denied (ACL layer)', async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'permission denied for function admin_lead_capture' },
    })
    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.rpc('admin_lead_capture', {})
    expect(error?.message).toContain('permission denied')
  })

  it("non-admin authenticated caller surfaces 'Forbidden: admin role required'", async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Forbidden: admin role required' },
    })
    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.rpc('admin_leads_list', { p_limit: 25, p_offset: 0 })
    expect(error?.message).toContain('Forbidden: admin role required')
  })
})
