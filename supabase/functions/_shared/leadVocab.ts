/**
 * Canonical vocabularies for lead extraction.
 *
 * WHY THIS EXISTS
 * A seeker post and an employer post describe the same world in different words. If a
 * seeker's "farm assistant" is stored verbatim, it never matches an employer's
 * "Farm Hand", and the two sides of the marketplace quietly fail to meet. Extraction
 * therefore maps free text onto the SAME tokens both sides already use.
 *
 * DUPLICATION IS DELIBERATE, AND GUARDED
 * Deno Edge Functions cannot import from `src/`, so these mirror
 * `src/lib/constants.ts` (ROLE_TYPES) and the `skills` table (SKILL_TAXONOMY) —
 * the same arrangement NZ_REGIONS already has in leadGeo.ts.
 * `tests/lead-vocab-parity.test.ts` fails if either copy drifts, because silent drift
 * here reintroduces exactly the mismatch this file exists to prevent.
 */

/** Mirrors ROLE_TYPES in src/lib/constants.ts — what an employer picks for jobs.role_type. */
export const ROLE_TYPES = [
  'Farm Manager',
  'Assistant Manager',
  'Farm Hand',
  'General',
  'Herd Manager',
  '2IC',
  'Relief Milker',
  // Added 2026-08-17 with the seeker lane. Not cosmetic here: this list is what the
  // extraction prompt tags a harvested post with, so before it carried these, a shepherd
  // post could only come back as the catch-all or as Farm Hand. The seeker lane intake
  // would have flattened the very thing that makes that person findable.
  // NB: keep comments in this block free of apostrophes and quoted tokens —
  // tests/lead-vocab-parity.test.ts parses the array with a string-literal regex.
  'Shepherd',
  'Stock Manager',
  'Calf Rearer',
  'Other',
] as const

/**
 * Mirrors CONTRACT_TYPE_PREFS in src/lib/constants.ts and, through it,
 * jobs_contract_type_check and seeker_profiles.contract_type_pref (migration 090).
 *
 * The single most common thing seekers state and the schema had no field for until
 * 2026-08-17: 9 of the 23 corpus posts ask for relief, part-time or short-term work. The
 * words they use are relief, casual, part time, short term, over calving, a few days a week
 * — almost never the DB token itself, so the prompt has to do the mapping.
 *
 * NB: keep comments in this block free of apostrophes and quoted tokens —
 * tests/lead-vocab-parity.test.ts parses the array with a string-literal regex.
 */
export const CONTRACT_TYPES = ['permanent', 'contract', 'casual'] as const

/** Mirrors public.skills.name — the 24-competency taxonomy, the join key for matching. */
export const SKILL_TAXONOMY = [
  'Agronomy & soil management',
  'Animal health & husbandry',
  'Arable & grain production',
  'Beef cattle management',
  'Compliance & record-keeping',
  'Dairy cattle management',
  'Data & farm tech literacy',
  'Farm financial management',
  'Farm planning & operations management',
  'Farm vehicle handling',
  'Fencing & yard construction',
  'Fuel & chemical handling',
  'General farm maintenance',
  'Health & safety competency',
  'Heavy machinery & harvest equipment',
  'Irrigation & water systems',
  'Mustering & stockmanship',
  'Pasture & forage management',
  'Sheep & lamb handling',
  'Spraying & application equipment',
  'Staff supervision & leadership',
  'Sustainable & regenerative practices',
  'Tractor operation',
  'Vegetable & root crop production',
] as const
