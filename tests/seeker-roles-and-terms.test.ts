import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROLE_TYPES, CONTRACT_TYPE_PREFS } from '@/lib/constants'

// Test intent — gaps G-1 and G-2, found by reading six real job-seeker posts saved from NZ
// farming Facebook groups.
//
// G-2: the role list was dairy-shaped (Herd Manager, 2IC, Relief Milker) on a site that
// claims five sectors, so a shepherd had nothing to pick. Calf rearing — one of the largest
// seasonal intakes in NZ — was likewise unrepresentable.
//
// G-1: four of the six wanted RELIEF or PART-TIME work. `jobs` already carried
// contract_type/hours and /jobs already filtered on it, but `seeker_profiles` had no
// employment-type field at all, so someone who only wanted relief had to present as though
// they wanted a permanent job.
//
// The persistence assertions are the important half. `role_type_pref` was missing from
// SeekerOnboarding's prefill list until 2026-08-16 while step 1 read it as a default — so a
// seeker who left mid-onboarding came back to cleared roles, and the next upsert wrote that
// blank over the real value. contract_type_pref is read as a default in exactly the same
// place and would fail in exactly the same way.

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf-8')

const STEP1 = read('src/pages/onboarding/steps/SeekerStep1FarmType.tsx')
const WIZARD = read('src/pages/onboarding/SeekerOnboarding.tsx')
const EDITOR = read('src/pages/dashboard/seeker/SeekerProfile.tsx')
const MIGRATION = read('supabase/migrations/090_seeker_contract_type_pref.sql')

describe('G-2 — the role vocabulary covers more than dairy', () => {
  it('carries the sheep & beef and seasonal roles', () => {
    for (const role of ['Shepherd', 'Stock Manager', 'Calf Rearer']) {
      expect(ROLE_TYPES).toContain(role)
    }
  })

  it('keeps the roles that were already there', () => {
    // Adding must not quietly drop any — these are stored on live jobs as free text
    // (jobs.role_type has no CHECK), so a removed value orphans real listings.
    for (const role of ['Farm Manager', 'Assistant Manager', 'Farm Hand', 'General',
                        'Herd Manager', '2IC', 'Relief Milker', 'Other']) {
      expect(ROLE_TYPES).toContain(role)
    }
  })

  it('keeps Other last', () => {
    // SeekerStep1 filters it out of the seeker's own list; anything appended after it would
    // render past the catch-all.
    expect(ROLE_TYPES[ROLE_TYPES.length - 1]).toBe('Other')
  })
})

describe('G-1 — a seeker can state the terms, not just the role', () => {
  it('the preference vocabulary mirrors jobs.contract_type exactly', () => {
    // A fork here is the F-22 defect again: the filter emits one vocabulary, the column
    // stores another, and the match is silently empty.
    expect(CONTRACT_TYPE_PREFS.map((c) => c.value)).toEqual(['permanent', 'contract', 'casual'])
  })

  it('the migration constrains to the same three values', () => {
    expect(MIGRATION).toMatch(/ARRAY\['permanent', 'contract', 'casual'\]/)
    // NULL must stay legal — "not stated" is not "wants nothing".
    expect(MIGRATION).toMatch(/contract_type_pref IS NULL/)
  })

  it('step 1 offers it, multi-select', () => {
    expect(STEP1).toMatch(/CONTRACT_TYPE_PREFS/)
    expect(STEP1).toMatch(/contract_type_pref: terms/)
    // "a permanent job, or relief in the meantime" is the commonest real answer; single
    // select would force a misrepresentation.
    const block = STEP1.slice(STEP1.indexOf('CONTRACT_TYPE_PREFS.map'))
    expect(block.slice(0, 400)).toMatch(/mode="multi"/)
  })
})

describe('G-1 — the value survives a round trip', () => {
  it('the wizard prefills it, so returning mid-onboarding does not clear it', () => {
    // The exact shape of the 2026-08-16 role_type_pref data-loss bug.
    expect(WIZARD).toMatch(/contract_type_pref: data\.contract_type_pref/)
  })

  it('the wizard passes it back into step 1 as a default', () => {
    expect(WIZARD).toMatch(/contract_type_pref: profileData\.contract_type_pref/)
  })

  it('the profile editor reads it, shows it, and passes it back', () => {
    expect(EDITOR).toMatch(/contract_type_pref: data\.contract_type_pref/)
    expect(EDITOR).toMatch(/contract_type_pref: profile\.contract_type_pref/)
    expect(EDITOR).toMatch(/label: 'Type of work'/)
  })
})
