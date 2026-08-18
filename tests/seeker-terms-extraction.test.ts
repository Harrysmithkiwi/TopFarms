import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Test intent — Phase B3.
//
// `contract_type_pref` shipped on 2026-08-17 (migration 090) as the answer to the most
// common thing seekers say — 9 of the 23 corpus posts ask for relief, part-time or
// short-term work. Verified 2026-08-18: the token appeared NOWHERE in `supabase/functions/`
// or `src/pages/admin/`. Onboarding wrote it and nothing else read it, so the strongest
// signal in a seeker post was read by a human, understood, and thrown away at intake.
//
// The behavioural half runs against the real model:
//   deno run --allow-read --allow-env --allow-net scripts/seeker-extraction-check.ts
// which replays the prompt and schema out of index.ts rather than a copy of them.
// These tests hold the shape that makes that behaviour possible.

const INTAKE = readFileSync(
  join(process.cwd(), 'supabase/functions/lead-intake/index.ts'),
  'utf-8',
)
const SEEKER_STAGING = readFileSync(
  join(process.cwd(), 'src/pages/admin/AdminSeekerStaging.tsx'),
  'utf-8',
)
const CHECK = readFileSync(join(process.cwd(), 'scripts/seeker-extraction-check.ts'), 'utf-8')

describe('B3 — terms reach the extractor', () => {
  it('the seeker block carries contract_type_pref', () => {
    expect(INTAKE).toMatch(/interface SeekerDetail \{[\s\S]{0,900}contract_type_pref: string\[\]/)
    expect(INTAKE).toMatch(/contract_type_pref: \{\s*\n?\s*type: 'array'/)
  })

  it('the schema constrains it to the DB tokens', () => {
    // A free-string array would let "part time" through, and seeker_profiles.contract_type_pref
    // has a CHECK against permanent|contract|casual — so the value would be rejected at the
    // point it is finally used, long after the post is gone.
    expect(INTAKE).toMatch(/items: \{ type: 'string', enum: \[\.\.\.CONTRACT_TYPES\] \}/)
  })

  it('the prompt separates a term from a role', () => {
    // The distinction that made 090 necessary: "Relief Milker" is a role, "permanent or
    // relief" is a term, and posts state one without the other.
    expect(INTAKE).toMatch(/ENGAGEMENT they want, and it is separate from the role/)
  })

  it('an unstated term stays empty rather than being inferred from the role', () => {
    // The corpus is ~35% entry-level and those posts often state no terms at all. Guessing
    // "casual" off a Relief Milker role would manufacture a preference the person never
    // expressed — and then rank them on it.
    expect(INTAKE).toMatch(/when the post states no terms at all; never guess from the role/)
  })

  it('multiple accepted terms are allowed', () => {
    // One corpus post reads "weekends, or ideally permanent part time, or even better full
    // time" — an ordered ladder. We cannot hold the ordering yet (G-23), but collapsing it
    // to a single value would discard two thirds of what they said.
    expect(INTAKE).toMatch(/MULTIPLE values when they say they would take more than one/)
  })
})

describe('B3 — the role mappings that can lie about a person', () => {
  it('calf rearing and shepherding map onto the 2026-08-17 roles', () => {
    // These three shipped in ROLE_TYPES but the prompt had no mapping hints for them, so
    // "calf rearing" could still land on Farm Hand or Other.
    expect(INTAKE).toMatch(/"calf rearing"\/"calf rearer" → "Calf Rearer"/)
    expect(INTAKE).toMatch(/"shepherd"\/"shepherding"/)
  })

  it('generic stock work must not be promoted to Stock Manager', () => {
    // The one mapping with a cost beyond a miss: it puts a title on someone that the post
    // does not claim, and the queue then misrepresents them to an employer.
    expect(INTAKE).toMatch(/CAUTION on "Stock Manager"/)
    expect(INTAKE).toMatch(/promote someone into a management role they did not claim/)
  })
})

describe('B3 — an extracted term is visible to the reviewer', () => {
  it('the staging drawer shows it, in the words the posts use', () => {
    // Showing the raw token would put "casual" in front of a reviewer reading a post that
    // says "relief only" — and relief is the word that actually appears in the corpus.
    expect(SEEKER_STAGING).toMatch(/import \{ CONTRACT_TYPE_PREFS \} from '@\/lib\/constants'/)
    expect(SEEKER_STAGING).toMatch(/<Field label="Terms" value=\{terms\(/)
    expect(SEEKER_STAGING).toMatch(/CONTRACT_LABELS\[t\] \?\? t/)
  })
})

describe('B3 — the behaviour check reads the real prompt', () => {
  it('the extraction script slices index.ts instead of copying it', () => {
    // The .mjs predecessor hard-copied the prompt and had drifted past the seeker lane, the
    // three new roles and contract_type_pref — while its header claimed it replayed the
    // exact prompt. A stale copy of the logic under test is worse than no check.
    expect(CHECK).toMatch(/lead-intake\/index\.ts/)
    expect(CHECK).toMatch(/slice\('system: \[',/)
    expect(CHECK).toMatch(/objectAfter\('input_schema: \{'\)/)
    expect(CHECK).not.toMatch(/const system = \[\s*\n\s*'You extract recruitment leads/)
  })

  it('it covers each term token and the Stock Manager trap', () => {
    for (const token of ['casual', 'contract', 'permanent']) {
      expect(CHECK).toMatch(new RegExp(`terms: \\[[^\\]]*'${token}'`))
    }
    expect(CHECK).toMatch(/must NOT become Stock Manager/)
    expect(CHECK).toMatch(/terms: \[\],/) // the no-terms-stated case
  })
})
