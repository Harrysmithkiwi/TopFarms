import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Test intent — audit finding F-21 (Tier 0, compliance).
//
// `lead_suppression` had one writer, `admin_lead_reject`, which requires a *staging* row.
// Once a lead was promoted to `leads` there was no way to record that they asked not to be
// contacted, so the procedure documented at docs/OUTREACH-EMAIL.md:52 was not executable and
// anyone replying "stop" could be re-surfaced by the next harvest.
//
// The behavioural half is SQL and was proven against live prod after applying 087:
//
//   suppressed name, region 'Waikato'   → suppressed
//   same name, region NULL              → suppressed   ← the case that used to leak
//   same name, punctuation/case variant → suppressed
//   different name                      → inserted     (control)
//   same name, type 'seeker'            → inserted     (control)
//
// What a unit test CAN hold is the shape that made the leak possible: the suppression key
// must not carry `region`, and every reader/writer must agree on one key. `region` is null on
// ~1 row in 11 (081:13), so a region-bearing key means a re-harvest of the same farm computes
// a different key and sails past the check.

const SQL = readFileSync(
  join(process.cwd(), 'supabase/migrations/087_lead_opt_out.sql'),
  'utf-8',
)
const ADMIN_LEADS = readFileSync(join(process.cwd(), 'src/pages/admin/AdminLeads.tsx'), 'utf-8')

/** Body of a `CREATE OR REPLACE FUNCTION <name>` block, up to the closing `$$;`/`$function$;`. */
function fnBody(sql: string, name: string): string {
  const i = sql.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`)
  expect(i, `${name} not defined in 087`).toBeGreaterThan(-1)
  const rest = sql.slice(i)
  const end = rest.search(/\n\$(function)?\$;/)
  return rest.slice(0, end === -1 ? undefined : end)
}

describe('F-21 — the suppression key must not carry region', () => {
  it('_lead_suppression_key takes name and type only', () => {
    const body = fnBody(SQL, '_lead_suppression_key')
    expect(body).toMatch(/_lead_suppression_key\(p_name text, p_type text\)/)
    // The whole point. A `p_region` argument here recreates the leak.
    expect(body).not.toMatch(/p_region/)
  })

  it('the intake suppression check uses the suppression key, not the dedupe fingerprint', () => {
    const body = fnBody(SQL, '_lead_intake')
    const check = body.slice(body.indexOf('FROM lead_suppression'))
    expect(check).toMatch(/_lead_suppression_key\(/)
    // `_lead_fingerprint` is name|region|type and is still correct for DEDUPE — it just must
    // not be what suppression is looked up by.
    const suppressionClause = check.slice(0, check.indexOf('RETURN'))
    expect(suppressionClause).not.toMatch(/_lead_fingerprint/)
  })

  it('the staging-side writer writes the same key the intake reads', () => {
    // If these two disagree, a suppression is recorded and then never matches — which is
    // indistinguishable from having no opt-out control at all.
    const body = fnBody(SQL, 'admin_lead_reject')
    const write = body.slice(body.indexOf('IF p_suppress'))
    expect(write).toMatch(/_lead_suppression_key\(/)
    expect(write).not.toMatch(/_lead_fingerprint\(/)
  })

  it('dedupe keeps its region-bearing fingerprint', () => {
    // Guards the other direction: F-21 must not be "fixed" by weakening dedupe, which would
    // start merging genuinely different farms.
    const body = fnBody(SQL, '_lead_intake')
    expect(body).toMatch(/v_fp text := public\._lead_fingerprint\([^)]*'region'/s)
    expect(body).toMatch(/l\.fingerprint = v_fp/)
  })
})

describe('F-21 — a promoted lead can be suppressed', () => {
  it('admin_lead_suppress is admin-gated and takes a lead id', () => {
    const body = fnBody(SQL, 'admin_lead_suppress')
    expect(body).toMatch(/p_lead_id uuid/)
    expect(body).toMatch(/_admin_gate\(\)/)
    expect(body).toMatch(/FROM public\.leads WHERE id = p_lead_id/)
    expect(body).toMatch(/INSERT INTO public\.lead_suppression/)
  })

  it('recording the opt-out also takes the lead out of the work list', () => {
    // Writing the suppression but leaving the lead workable would be half a control.
    const body = fnBody(SQL, 'admin_lead_suppress')
    expect(body).toMatch(/UPDATE public\.leads[\s\S]*status = 'dead'/)
  })

  it('it is auditable', () => {
    expect(fnBody(SQL, 'admin_lead_suppress')).toMatch(/admin_audit_log/)
  })

  it('the admin UI reaches it, behind a confirm', () => {
    expect(ADMIN_LEADS).toMatch(/rpc\('admin_lead_suppress'/)
    // Irreversible from that screen, so it must not be a single stray click.
    expect(ADMIN_LEADS).toMatch(/setConfirming/)
    // And it must stay distinct from the lifecycle chips: `dead` is our judgement about a
    // lead, an opt-out is their instruction, and conflating them is the original defect.
    expect(ADMIN_LEADS).toMatch(/const STATUSES: LeadRow\['status'\]\[\] = \['new', 'contacted', 'onboarded', 'dead'\]/)
  })
})
