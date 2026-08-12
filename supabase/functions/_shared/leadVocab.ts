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
  'Other',
] as const

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
