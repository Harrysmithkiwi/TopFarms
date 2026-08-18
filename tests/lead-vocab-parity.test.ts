import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CONTRACT_TYPE_PREFS, NZ_REGIONS, ROLE_TYPES } from '@/lib/constants'

/**
 * Deno Edge Functions cannot import from `src/`, so the extraction vocabularies are
 * duplicated in `supabase/functions/_shared/leadVocab.ts`. That duplication is
 * deliberate — but silent drift in it reintroduces the exact defect the vocabularies
 * exist to prevent: a seeker's role stored as a token no employer ever picks, so the
 * two halves of the marketplace stop matching and nothing anywhere reports it.
 */

const VOCAB = readFileSync(
  resolve(__dirname, '../supabase/functions/_shared/leadVocab.ts'),
  'utf8',
)

/** Pull a `export const NAME = [ 'a', 'b' ] as const` array out of the Deno module. */
function arrayLiteral(name: string): string[] {
  const block = new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const`).exec(VOCAB)
  if (!block) throw new Error(`${name} not found in leadVocab.ts`)
  return [...block[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\'/g, "'"))
}

describe('lead extraction vocabularies stay in step', () => {
  it('ROLE_TYPES matches src/lib/constants.ts exactly, in order', () => {
    expect(arrayLiteral('ROLE_TYPES')).toEqual([...ROLE_TYPES])
  })

  it('SKILL_TAXONOMY carries all 24 competencies, unique', () => {
    // Mirrors public.skills.name. 24 is the taxonomy's size (migration 034); a
    // changed count means the DB moved and the prompt is now mapping onto a stale list.
    const skills = arrayLiteral('SKILL_TAXONOMY')
    expect(skills).toHaveLength(24)
    expect(new Set(skills).size).toBe(24)
  })

  it('CONTRACT_TYPES matches the seeker-facing options, in order', () => {
    // These are the DB tokens behind CONTRACT_TYPE_PREFS, which mirror
    // jobs_contract_type_check and seeker_profiles.contract_type_pref (090). Drift here is
    // worse than a role mismatch: the CHECK constraint rejects the write outright, so an
    // extracted term would be silently lost at the point it is used.
    expect(arrayLiteral('CONTRACT_TYPES')).toEqual(CONTRACT_TYPE_PREFS.map((c) => c.value))
  })

  it('NZ_REGIONS matches leadGeo.ts exactly, in order', () => {
    // Not in the audit; found 2026-08-18 and fixed by migration 100. The app spelled
    // 'Manawatu-Whanganui' and leadGeo 'Manawatū-Whanganui', and BOTH were in production data
    // — lead_staging held 6 rows each way, the same region split into two buckets. That is the
    // exact defect leadGeo's own header describes fixing between the two edge functions, while
    // nobody noticed the app used the other form.
    //
    // It matters because compute_match_score compares regions by EXACT string equality, so a
    // seeker in one spelling never matches a job in the other and nothing reports it.
    const geo = readFileSync(
      resolve(__dirname, '../supabase/functions/_shared/leadGeo.ts'),
      'utf8',
    )
    const block = /export const NZ_REGIONS = \[([\s\S]*?)\]/.exec(geo)
    expect(block, 'NZ_REGIONS not found in leadGeo.ts').not.toBeNull()
    const regions = [...block![1].matchAll(/'((?:[^'\\]|\\.)*)'|"([^"]*)"/g)].map(
      (m) => (m[1] ?? m[2]).replace(/\\'/g, "'"),
    )
    expect(regions).toEqual([...NZ_REGIONS])
  })

  it('the prompt actually interpolates both vocabularies', () => {
    // The lists are worthless if the system prompt stops embedding them — the model
    // would fall back to free text and nothing would fail loudly.
    const intake = readFileSync(
      resolve(__dirname, '../supabase/functions/lead-intake/index.ts'),
      'utf8',
    )
    expect(intake).toMatch(/\$\{ROLE_TYPES\.join/)
    expect(intake).toMatch(/\$\{SKILL_TAXONOMY\.join/)
    expect(intake).toMatch(/\$\{CONTRACT_TYPES\.join/)
    // The schema enum is the second half: the prompt asks, the enum enforces.
    expect(intake).toMatch(/enum: \[\.\.\.CONTRACT_TYPES\]/)
  })
})
