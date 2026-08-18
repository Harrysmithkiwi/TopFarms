import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Test intent — seeker gap G-13, from a 23-post corpus of real NZ farming Facebook posts.
//
// 30% of that corpus is visa-touched, and the question these people keep asking in comments is
// NOT the one jobs.visa_sponsorship answers:
//
//   "looking to secure a long-term position with an ACCREDITED EMPLOYER in advance"
//   "Do you have right to work in NZ or seeking an accredited employer?"
//
// AEWV accreditation is a specific INZ status a farm either holds or does not — without it a
// migrant cannot apply at all, however willing the farm is. A boolean about willingness cannot
// answer a question about status.
//
// Two invariants are worth locking, because getting either wrong harms someone vulnerable:
//
//   1. A claim must carry an expiry, and a lapsed claim must stop being advertised BY ITSELF.
//      A migrant relying on stale accreditation loses an application fee and maybe a season.
//   2. Recreating the marketplace view must not lose 089's security settings. CREATE OR REPLACE
//      VIEW drops reloptions and grants; losing security_invoker=false takes the marketplace
//      dark for anon and every logged-in seeker.

const SQL = readFileSync(
  join(process.cwd(), 'supabase/migrations/091_employer_inz_accreditation.sql'),
  'utf-8',
)
const STEP2 = readFileSync(
  join(process.cwd(), 'src/pages/onboarding/steps/Step2FarmDetails.tsx'),
  'utf-8',
)
const WIZARD = readFileSync(
  join(process.cwd(), 'src/pages/onboarding/EmployerOnboarding.tsx'),
  'utf-8',
)

describe('G-13 — a claim cannot outlive its expiry', () => {
  it('the DB refuses an accreditation claim with no expiry', () => {
    expect(SQL).toMatch(/CHECK \(inz_accredited = false OR inz_accreditation_expires IS NOT NULL\)/)
  })

  it('the form mirrors that rule rather than relying on the DB to reject the save', () => {
    expect(STEP2).toMatch(/if \(d\.inz_accredited && !d\.inz_accreditation_expires\)/)
  })

  it('the public flag is derived per read, so a lapsed claim disappears on its own', () => {
    // Not a stored boolean anyone has to remember to switch off.
    expect(SQL).toMatch(
      /\(ep\.inz_accredited AND ep\.inz_accreditation_expires > current_date\) AS accredited_employer/,
    )
  })

  it('the raw expiry date never leaves the table', () => {
    // The projection exposes the derived flag only — nothing here should read as an audited
    // fact with a precise date while this is still self-declared.
    const view = SQL.slice(SQL.indexOf('CREATE OR REPLACE VIEW'))
    const selectList = view.slice(0, view.indexOf('FROM public.employer_profiles'))
    expect(selectList).not.toMatch(/ep\.inz_accreditation_expires,/)
    expect(selectList).not.toMatch(/ep\.inz_accredited,/)
  })
})

describe('G-13 — recreating the view must not undo 089', () => {
  it('re-applies security_invoker=false', () => {
    // CREATE OR REPLACE VIEW drops reloptions. 089 made this view the security boundary for
    // employer_profiles; without this line the marketplace returns zero rows to anon and to
    // every logged-in seeker.
    expect(SQL).toMatch(/ALTER VIEW public\.marketplace_employer_profiles SET \(security_invoker = false\)/)
  })

  it('re-applies read-only grants', () => {
    expect(SQL).toMatch(/REVOKE ALL ON public\.marketplace_employer_profiles FROM anon, authenticated/)
    expect(SQL).toMatch(/GRANT SELECT ON public\.marketplace_employer_profiles TO anon, authenticated/)
  })

  it('keeps the WHERE that is the security boundary', () => {
    expect(SQL).toMatch(/WHERE EXISTS \(\s*SELECT 1 FROM public\.jobs j/)
  })
})

describe('G-13 — the value survives a round trip', () => {
  it('the wizard selects the columns', () => {
    expect(WIZARD).toMatch(/inz_accredited, inz_accreditation_expires'/)
  })

  it('the wizard prefills them', () => {
    // The 2026-08-16 role_type_pref data-loss shape: step 2 reads these as defaults, so
    // omitting them here clears a returning employer's claim and writes the blank back.
    expect(WIZARD).toMatch(/inz_accredited: data\.inz_accredited/)
    expect(WIZARD).toMatch(/inz_accreditation_expires: data\.inz_accreditation_expires/)
  })

  it('the wizard passes them back into step 2', () => {
    expect(WIZARD).toMatch(/inz_accredited: profileData\.inz_accredited/)
  })
})

describe('G-13 — it is not passed off as verified', () => {
  it('the form tells the employer what we do with the claim', () => {
    // The substance, not the phrasing. It said "we do not yet check it" until D4 Stage 1
    // (migration 101) made the check real, so the promise inverted: it is still THEIR statement,
    // and now we also tell them we check it and clear it if we cannot confirm it. Leaving the
    // old sentence would have been the rarer failure — a product under-claiming what it does,
    // which costs the employer the chance to fix a wrong NZBN before a migrant relies on it.
    expect(STEP2).toMatch(/your own statement/i)
    expect(STEP2).toMatch(/check it against the\s*\n?\s*Immigration New Zealand/i)
    expect(STEP2).toMatch(/clear it if we cannot confirm it/i)
    expect(STEP2).not.toMatch(/do not yet check it/i)
  })

  it('091 reserved a place for real verification, and 101 is what fills it', () => {
    // 091 was honest about being unverified: the column existed and was documented as always
    // NULL. That is still the right record of what 091 did, so this file keeps asserting it.
    expect(SQL).toMatch(/inz_accredited_verified_at/)
    expect(SQL).toMatch(/Always NULL today/)
    // And it is no longer true of the live column, because 101 writes it. A reserved column that
    // stays reserved forever is the failure mode the reservation was meant to avoid.
    const SQL101 = readFileSync(
      join(process.cwd(), 'supabase/migrations/101_inz_register_check.sql'),
      'utf-8',
    )
    expect(SQL101).toMatch(/inz_accredited_verified_at = CASE WHEN p_confirms THEN now\(\) ELSE NULL END/)
    expect(SQL101).toMatch(/COMMENT ON COLUMN public\.employer_profiles\.inz_accredited_verified_at/)
  })

  it('it stays out of the trust ladder', () => {
    // employer_verifications is the earned-badge surface (F-11). A self-declared claim must
    // not sit in it, or `fully_verified` becomes self-assertable again.
    expect(SQL).not.toMatch(/INSERT INTO public\.employer_verifications/)
  })
})
