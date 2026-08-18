import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { computeTrustLevel } from '@/hooks/useVerifications'
import type { EmployerVerification } from '@/types/domain'

// Test intent — D4 Stage 1 (migration 101). An admin can now record what the INZ
// accredited-employer register says about an employer's claimed accreditation.
//
// Everything here guards a decision that is easy to reverse by accident and expensive to get
// wrong, because the person who pays for a wrong answer is a migrant deciding whether to spend
// a visa fee on a farm that may not legally be able to hire them.
//
// The three that matter most:
//
//   1. This must never become a trust-ladder rung. The ladder answers "is this a real farm run
//      by real people"; accreditation answers "has INZ licensed them to hire migrants". Folding
//      them together makes every unaccredited farm — most NZ dairy farms — look less trustworthy
//      than it is, and makes an accredited one look like WE vouched for it (F-11).
//   2. A refusal must not touch the employer's listings. The likeliest causes are that the
//      employer opted out of publication, or one of thirteen hand-typed digits is wrong, and the
//      register returns the identical HTTP 400 for a typo and a genuine miss.
//   3. Nothing may query the register from code. INZ's terms of use forbid it
//      (docs/immigration/06-inz-register-verification.md), so the admin opens a link.

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf-8')

const SQL = read('supabase/migrations/101_inz_register_check.sql')
const QUEUE = read('src/pages/admin/AdminDocumentsQueue.tsx')
const DOC = read('docs/immigration/06-inz-register-verification.md')

describe('101 — the register check cannot become an earned badge', () => {
  it('the RPC never writes employer_verifications', () => {
    // The one line that would undo F-11. Verified against the live pg_proc body before this
    // test existed; asserted here so the next edit cannot slip it back in.
    const body = /admin_record_inz_register_check[\s\S]*?\$function\$;/.exec(SQL)?.[0] ?? ''
    expect(body).not.toMatch(/employer_verifications/)
    expect(body).toMatch(/employer_profiles/)
  })

  it('computeTrustLevel still knows nothing about accreditation', () => {
    // The ladder is computed from verification METHODS alone. An accredited employer with only
    // an email is still `basic`, and that is correct — they have proved a licence, not an
    // identity. This is the assertion that fails loudly if someone adds an 'inz' method.
    const v = (method: string, status = 'verified') =>
      ({ method, status }) as EmployerVerification
    expect(computeTrustLevel([v('email')])).toBe('basic')
    expect(computeTrustLevel([v('email'), v('nzbn')])).toBe('verified')
    expect(computeTrustLevel([v('email'), v('inz_accredited')])).toBe('basic')
  })
})

describe('101 — a refusal is not a punishment', () => {
  it('the RPC never touches jobs', () => {
    expect(SQL).not.toMatch(/UPDATE public\.jobs|DELETE FROM public\.jobs|INSERT INTO public\.jobs/)
  })

  it('the stated expiry survives a refusal', () => {
    // Only two columns are written. The expiry is what the employer told us and what the
    // follow-up conversation is about; clearing it would delete the evidence of the claim
    // alongside the claim.
    const update = /UPDATE public\.employer_profiles[\s\S]*?RETURNING/.exec(SQL)?.[0] ?? ''
    expect(update).toMatch(/inz_accredited\s+=/)
    expect(update).toMatch(/inz_accredited_verified_at\s+=/)
    expect(update).not.toMatch(/inz_accreditation_expires\s*=/)
  })

  it('a confirmation and a refusal both clear or set the timestamp, never leave it stale', () => {
    // A "verified on 12 Aug" sitting beside a withdrawn claim is the worst of the three states,
    // because it reads as our assurance of something we just failed to confirm.
    expect(SQL).toMatch(
      /inz_accredited_verified_at = CASE WHEN p_confirms THEN now\(\) ELSE NULL END/,
    )
  })

  it('NULL is not a third outcome', () => {
    // Unguarded, `CASE WHEN NULL` takes the ELSE arm — silently recording a refusal nobody
    // pressed, on a call that looks like it did nothing.
    expect(SQL).toMatch(/IF p_confirms IS NULL THEN[\s\S]{0,200}RAISE EXCEPTION/)
  })

  it('confirming a claim nobody made is refused', () => {
    // Otherwise inz_accredited_verified_at says we checked while accredited_employer stays
    // false — a verification of nothing.
    expect(SQL).toMatch(/IF p_confirms AND NOT v_row\.inz_accredited THEN[\s\S]{0,220}RAISE EXCEPTION/)
  })

  it('is admin-gated and audit-logged, and anon cannot execute it', () => {
    expect(SQL).toMatch(/PERFORM public\._admin_gate\(\)/)
    expect(SQL).toMatch(/INSERT INTO public\.admin_audit_log[\s\S]{0,400}'employer\.inz_register_check'/)
    expect(SQL).toMatch(
      /REVOKE ALL ON FUNCTION public\.admin_record_inz_register_check\(uuid, boolean\) FROM PUBLIC, anon;/,
    )
  })
})

describe('101 — a refusal stays visible', () => {
  it('the queue reads the last check back out of the audit log', () => {
    // inz_accredited=false with a NULL timestamp is byte-identical to an employer who never
    // claimed anything, so without this the admin loses the fact that they looked.
    expect(SQL).toMatch(/inz_register_checked_at/)
    expect(SQL).toMatch(/inz_register_confirmed/)
    expect(SQL).toMatch(/FROM public\.admin_audit_log al/)
  })

  it('the lateral is deterministic under a same-transaction tie', () => {
    // created_at defaults to now(), which is the TRANSACTION start time. The probe that proved
    // this migration wrote both checks in one transaction and the queue reported the refusal as
    // "confirmed". Production cannot tie — each press is its own request — but a guard beats a
    // claim resting on request timing.
    expect(SQL).toMatch(/ORDER BY al\.created_at DESC, al\.ctid DESC/)
  })

  it('the admin screen surfaces a cleared claim rather than silently forgetting it', () => {
    expect(QUEUE).toMatch(/inz_register_confirmed === false/)
    expect(QUEUE).toMatch(/opt out of being/)
  })
})

describe('D4 — nothing queries the register from code', () => {
  it('the app only ever links to it', () => {
    // INZ's terms forbid "scraping… automation, or any similar data gathering, extraction or
    // monitoring method" and require access "via standard web browsers only". The endpoint the
    // register's own search box calls is therefore off limits to us, however easy it would be.
    expect(QUEUE).toMatch(/INZ_REGISTER_URL/)
    expect(QUEUE).toMatch(/accredited-employer-list/)
    expect(QUEUE).not.toMatch(/list-api|getAPIResults/)
  })

  it('no source file anywhere calls the list API', () => {
    const hits: string[] = []
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, e.name)
        if (e.isDirectory()) walk(full)
        else if (/\.(ts|tsx)$/.test(e.name) && readFileSync(full, 'utf-8').includes('getAPIResults'))
          hits.push(full)
      }
    }
    walk(join(process.cwd(), 'src'))
    walk(join(process.cwd(), 'supabase/functions'))
    expect(hits, 'INZ terms of use forbid scripted access to the register').toEqual([])
  })

  it('the finding that forbids it is written down with its evidence', () => {
    expect(DOC).toMatch(/standard web browsers only/)
    expect(DOC).toMatch(/expiryDateOfAccreditation/)
    // Absence is not evidence of non-accreditation — this is what stops "does not confirm"
    // being read as "they lied".
    expect(DOC).toMatch(/chosen not to be published/)
  })
})
