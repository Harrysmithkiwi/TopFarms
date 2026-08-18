import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NZ_REGIONS } from '@/lib/constants'
import { PREFERRED_REGION_OPTIONS } from '@/types/domain'

// Test intent — audit finding F-23 (Tier 1).
//
// `seeker_profiles.region` is captured in Step 1 from the full 16-region list, and it drives
// the 20-point location dimension in `compute_match_score` (verified against the live
// function body: `IF v_seeker.region = v_job.region THEN v_location := 20`). Step 5 then
// overwrote it with `preferred_regions?.[0]`, labelled "backward compatibility":
//
//   - `preferred_regions` came from a hand-written EIGHT-region subset, so a seeker in
//     Gisborne or the West Coast could not name their own region at all;
//   - it is a multi-select captured in TAP ORDER, so "first" means whichever chip they
//     happened to press first, not a preference;
//   - the profile editor reuses this form per section, so saving "Life situation" silently
//     rewrote the Region displayed in the section above it.
//
// Fixed at the write (Step 5) AND at the display (SeekerOnboarding's completion summary,
// which read the same expression and could show a region different from the stored one).
// `preferred_regions` itself is scored by nothing today — `compute_match_score` reads
// `region` and `open_to_relocate`, never `preferred_regions`.

const STEP5 = readFileSync(
  join(process.cwd(), 'src/pages/onboarding/steps/SeekerStep5LifeSituation.tsx'),
  'utf-8',
)
const ONBOARDING = readFileSync(
  join(process.cwd(), 'src/pages/onboarding/SeekerOnboarding.tsx'),
  'utf-8',
)

describe('F-23 — Life situation does not rewrite the region', () => {
  it('Step 5 submits no region at all', () => {
    // It has no business writing one: the field it would derive it from is a different
    // question, asked later, with a different answer shape.
    const submit = STEP5.slice(STEP5.indexOf('function onSubmit'), STEP5.indexOf('return ('))
    expect(submit).not.toMatch(/^\s*region:/m)
  })

  it('nowhere in the seeker flow derives a region from preferred_regions', () => {
    // The expression, not the line. It existed twice — once writing, once displaying — and
    // fixing only the one the audit named would have left the summary screen lying.
    for (const [name, src] of [
      ['SeekerStep5LifeSituation', STEP5],
      ['SeekerOnboarding', ONBOARDING],
    ] as const) {
      const code = src
        .split('\n')
        .filter((l) => !l.trimStart().startsWith('//') && !l.trimStart().startsWith('*'))
        .join('\n')
      expect(code, `${name} still derives region from preferred_regions`).not.toMatch(
        /region:\s*[\w.]*preferred_regions\?\.\[0\]/,
      )
    }
  })

  it('the completion summary shows the stored region', () => {
    expect(ONBOARDING).toMatch(/region: profileData\.region,/)
  })
})

describe('F-23 — a seeker can name any region they would work in', () => {
  it('the preferred-region options cover all 16 regions', () => {
    // The subset was 8. Half the country could not answer the question.
    expect(PREFERRED_REGION_OPTIONS.map((o) => o.value)).toEqual([...NZ_REGIONS])
  })

  it('they are derived, not hand-written', () => {
    // The list is compared by exact string equality against `jobs.region`, so a second
    // hand-maintained spelling of any region is a silent no-match. Deriving removes the
    // only place in the app that spelled regions independently.
    const DOMAIN = readFileSync(join(process.cwd(), 'src/types/domain.ts'), 'utf-8')
    expect(DOMAIN).toMatch(/PREFERRED_REGION_OPTIONS[^=]*=\s*NZ_REGIONS\.map/)
  })
})
