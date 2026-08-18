import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Test intent — Phase B1.
//
// Two defects, one migration (092):
//
//  1. The seeker lane had NO opt-out control. 087 closed this for promoted `leads`, but the
//     seeker lane never promotes — outreach state lives on `lead_staging` and
//     AdminSeekerStaging offered exactly one action, "copy link". A reply of "stop" to a DM
//     had nowhere to be recorded.
//  2. Suppression keys on display_name, which for a seeker is a Facebook handle. The corpus
//     already holds one person posting the same text under two handles, and a trigram check
//     does not catch it — similarity('Jess M', 'Jessica Moore') is under the 0.6 threshold.
//     So an opt-out under one handle left the other contactable.
//
// The behavioural half is SQL. The floor and the normalisation were proven against live prod
// as a read-only SELECT of the same expression before 092 was applied:
//
//   same text, different handles      → identical body key
//   case + punctuation + whitespace   → identical body key
//   one word changed                  → different body key   (exact-match by design)
//   short generic post (<120 chars)   → NULL                 (falls back to the name key)
//
// What a unit test holds is the shape: the lane scoping, the length floor, the guards that
// make a NULL key mean "pre-092 behaviour", and the writer/reader agreeing on one key.

const SQL = readFileSync(
  join(process.cwd(), 'supabase/migrations/092_seeker_opt_out_holds_across_handles.sql'),
  'utf-8',
)
const SEEKER_STAGING = readFileSync(
  join(process.cwd(), 'src/pages/admin/AdminSeekerStaging.tsx'),
  'utf-8',
)

/** Body of a `CREATE OR REPLACE FUNCTION <name>` block, up to the closing `$$;`/`$function$;`. */
function fnBody(sql: string, name: string): string {
  const i = sql.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`)
  expect(i, `${name} not defined in 092`).toBeGreaterThan(-1)
  const rest = sql.slice(i)
  const end = rest.search(/\n\$(function)?\$;/)
  return rest.slice(0, end === -1 ? undefined : end)
}

describe('B1 — the body key', () => {
  it('normalises case, punctuation and whitespace away', () => {
    // Without lower() a re-typed capital letter forks the key; without the character class a
    // stray emoji or line break does. Both happen constantly in pasted Facebook text.
    const body = fnBody(SQL, '_lead_body_key')
    expect(body).toMatch(/lower\(coalesce\(p_body, ''\)\)/)
    expect(body).toMatch(/regexp_replace\(lower\(coalesce\(p_body, ''\)\), '\[\^a-z0-9\]\+', '', 'g'\)/)
  })

  it('is NULL below a length floor', () => {
    // The safety property. A short generic post is not identity — two unrelated people write
    // "looking for farm work in Waikato" in the same week, and keying suppression on that
    // would stop us contacting someone who never opted out.
    const body = fnBody(SQL, '_lead_body_key')
    expect(body).toMatch(/< 120\s*\n?\s*THEN NULL/)
  })

  it('is prefixed so a suppression row is self-describing', () => {
    // lead_suppression.fingerprint holds both key shapes. Without a prefix an md5 sits next to
    // a name|type key with nothing saying which is which.
    expect(fnBody(SQL, '_lead_body_key')).toMatch(/'body:' \|\| md5\(/)
  })
})

describe('B1 — the body key is scoped to the seeker lane', () => {
  it('intake computes it only for seeker posts', () => {
    // Employer dedupe works as it is, and syndicated or agency-templated job ads genuinely do
    // repeat verbatim across different farms — a body key there would merge distinct leads.
    const body = fnBody(SQL, '_lead_intake')
    expect(body).toMatch(
      /v_body_key text := CASE WHEN v_type = 'seeker'\s*\n?\s*THEN public\._lead_body_key\(p_raw_excerpt\) END/,
    )
  })

  it('the staging duplicate check re-scopes to seeker rows', () => {
    // v_body_key being non-null already implies this row is a seeker, but the row being
    // COMPARED against must be one too, or a seeker post could collide with an employer row.
    const body = fnBody(SQL, '_lead_intake')
    const check = body.slice(body.indexOf('FROM lead_staging st'))
    expect(check).toMatch(/st\.structured->>'type' = 'seeker'\s*\n?\s*AND public\._lead_body_key\(st\.raw_excerpt\)/)
  })

  it('every use of the key is guarded on IS NOT NULL', () => {
    // This is what makes a NULL key — every employer post, and any seeker post under the floor
    // — behave exactly as it did before 092. A single unguarded comparison would turn "too
    // short to identify" into "matches every other too-short post".
    const body = fnBody(SQL, '_lead_intake')
    const uses = body.match(/s\.fingerprint = v_body_key|_lead_body_key\(st\.raw_excerpt\) = v_body_key/g) ?? []
    expect(uses.length).toBe(2)
    for (const use of uses) {
      const at = body.indexOf(use)
      // The guard sits in the same OR branch, immediately before the comparison.
      expect(body.slice(Math.max(0, at - 200), at)).toMatch(/v_body_key IS NOT NULL/)
    }
  })
})

describe('B1 — the writer stores what the reader looks up', () => {
  it('the intake suppression check reads both keys', () => {
    const body = fnBody(SQL, '_lead_intake')
    const check = body.slice(body.indexOf('FROM lead_suppression'))
    const clause = check.slice(0, check.indexOf('RETURN'))
    // 087's key must survive — a re-post under the SAME handle with edited text is caught by
    // the name key and by nothing else.
    expect(clause).toMatch(/_lead_suppression_key\(v_name, v_type\)/)
    expect(clause).toMatch(/v_body_key IS NOT NULL AND s\.fingerprint = v_body_key/)
  })

  it('admin_lead_reject writes a second row for seekers', () => {
    const body = fnBody(SQL, 'admin_lead_reject')
    const write = body.slice(body.indexOf('IF p_suppress'))
    expect(write).toMatch(/_lead_suppression_key\(/)
    expect(write).toMatch(/v_st\.structured->>'type' = 'seeker'/)
    expect(write).toMatch(/v_body_key := public\._lead_body_key\(v_st\.raw_excerpt\)/)
    // Two rows, not one composite key: either alone must be sufficient at read time.
    expect(write.match(/INSERT INTO lead_suppression/g)?.length).toBe(2)
  })

  it('a NULL body key writes no row', () => {
    // Inserting NULL into lead_suppression.fingerprint would either fail on the primary key or
    // create a row that matches nothing — both worse than the name key alone.
    expect(fnBody(SQL, 'admin_lead_reject')).toMatch(/IF v_body_key IS NOT NULL THEN/)
  })
})

describe('B1 — the seeker queue can record an opt-out at all', () => {
  it('AdminSeekerStaging calls the suppressing form of admin_lead_reject', () => {
    expect(SEEKER_STAGING).toMatch(/rpc\('admin_lead_reject'/)
    expect(SEEKER_STAGING).toMatch(/p_suppress: true/)
    // Distinct from a judgement about the lead. `opted_out` is their instruction.
    expect(SEEKER_STAGING).toMatch(/p_reason: 'opted_out'/)
  })

  it('is behind a confirm, and not a browser dialog', () => {
    // Irreversible from the admin screens, so it must not be one stray click. window.confirm
    // blocks the extension that drives this page.
    expect(SEEKER_STAGING).toMatch(/setConfirming/)
    expect(SEEKER_STAGING).not.toMatch(/window\.confirm|\bconfirm\(/)
  })

  it('reports its own failure', () => {
    // The F-11 lesson: a swallowed denial that still toasts success is worse than no control,
    // because it tells the operator an opt-out is recorded when it is not.
    const fn = SEEKER_STAGING.slice(SEEKER_STAGING.indexOf('function OptOutControl'))
    const body = fn.slice(0, fn.indexOf('\nexport function'))
    expect(body).toMatch(/if \(error\)[\s\S]{0,120}toast\.error/)
    // and returns before the success toast
    expect(body.indexOf('toast.error')).toBeLessThan(body.indexOf('toast.success'))
  })
})
