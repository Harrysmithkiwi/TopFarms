import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

// Leads L4 funnel-wiring RPCs (migration 042) — posture suite.
// Live ACL evidence (2026-06-11 post-apply): all three anon=false,
// authenticated=true; admin_lead_conversion_suggestions LATERAL validated
// against prod ([] — no leads yet).

const MIGRATION = readFileSync('supabase/migrations/042_leads_funnel_wiring.sql', 'utf8')
  .split('\n')
  .map((l) => l.replace(/--.*$/, ''))
  .join('\n')

const RPCS = ['admin_analytics_leads', 'admin_lead_conversion_suggestions', 'admin_lead_link_user']

describe('042 static posture (LEADS-L4-1)', () => {
  it('every RPC is SECURITY DEFINER, pins search_path, and gates first', () => {
    for (const fn of RPCS) {
      const head = MIGRATION.split(`FUNCTION public.${fn}(`)[1].split('$$;')[0]
      expect(head, fn).toContain('SECURITY DEFINER')
      expect(head, fn).toContain('SET search_path = public')
      const begin = head.indexOf('BEGIN')
      const gate = head.indexOf('PERFORM public._admin_gate();')
      expect(gate, fn).toBeGreaterThan(begin)
      expect(head.slice(begin + 5, gate).trim(), `${fn}: gate first`).toBe('')
    }
  })

  it('corrected-037 grants: REVOKE ALL FROM PUBLIC; authenticated-only; no anon', () => {
    for (const fn of RPCS) {
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

  it('admin_analytics_leads is aggregate-only (cockpit block, no PII output)', () => {
    const fn = MIGRATION.split('FUNCTION public.admin_analytics_leads(')[1].split('$$;')[0]
    // Counts only — it must not reach into identity sources or project PII.
    // (Note: 'contacted' status + converted_user_id COUNT predicate are fine;
    // the real tells are auth.users / contact-> / candidate / display_name.)
    expect(fn).not.toMatch(/auth\.users|contact->|candidate_|display_name/i)
    expect(fn).toContain('count(*)')
  })

  it('no new tables, triggers, or policies (read/link only)', () => {
    expect(MIGRATION).not.toMatch(/CREATE TABLE|CREATE TRIGGER|CREATE POLICY/i)
  })

  it('the link mutation writes an audit row', () => {
    const fn = MIGRATION.split('FUNCTION public.admin_lead_link_user(')[1].split('$$;')[0]
    expect(fn).toContain('INSERT INTO public.admin_audit_log')
    expect(fn).toContain("'lead_link_user'")
  })
})
