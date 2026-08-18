export const NZ_REGIONS = [
  'Northland',
  'Auckland',
  'Waikato',
  'Bay of Plenty',
  'Gisborne',
  "Hawke's Bay",
  'Taranaki',
  // Macron is correct te reo and is what supabase/functions/_shared/leadGeo.ts already
  // canonicalises TO. The two spellings had split the same region into two buckets in
  // lead_staging (6 rows each way, measured 2026-08-18) — the exact defect leadGeo's own
  // header describes fixing between the two edge functions, while nobody noticed the app used
  // the other form. Region is compared by EXACT string equality in compute_match_score.
  'Manawatū-Whanganui',
  'Wellington',
  'Tasman',
  'Nelson',
  'Marlborough',
  'West Coast',
  'Canterbury',
  'Otago',
  'Southland',
] as const

export type NZRegion = (typeof NZ_REGIONS)[number]

/**
 * Canonical role/position vocabulary — the SAME list an employer picks from when
 * posting a job (`jobs.role_type`) and the one a seeker's stated role is mapped onto.
 *
 * Lived inside JobStep1Basics.tsx until the seeker lane needed it. That was fine while
 * only employers wrote role data; the moment both sides do, a private list means a
 * seeker's "Farm Assistant" can never match an employer's "Farm Hand", and the two
 * halves of the marketplace quietly stop meeting.
 */
export const ROLE_TYPES = [
  'Farm Manager',
  'Assistant Manager',
  'Farm Hand',
  'General',
  // Dairy-specific.
  'Herd Manager',
  '2IC',
  'Relief Milker',
  // Sheep & beef and seasonal. Added 2026-08-17 from real Facebook seeker posts: the list
  // above is dairy-shaped, so a shepherd looking for work had nothing to pick on a site that
  // claims five sectors. Calf rearing is one of the largest seasonal intakes in the country
  // and was likewise unrepresentable.
  'Shepherd',
  'Stock Manager',
  'Calf Rearer',
  // Catch-all — MUST stay last. SeekerStep1FarmType filters it out of the seeker's own
  // "roles you're after" list, because "Other" is a thing a job can be, not a thing to want.
  'Other',
] as const

export type RoleType = (typeof ROLE_TYPES)[number]

/**
 * What kind of engagement a seeker wants, mirroring `jobs.contract_type` exactly.
 *
 * The values are the DB tokens; the labels are the words farmers actually use. "Casual"
 * alone tested badly against real posts — four of six saved seeker posts describe themselves
 * as doing or wanting *relief* work, and none of them said "casual".
 */
export const CONTRACT_TYPE_PREFS = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'contract', label: 'Fixed term / contract' },
  { value: 'casual', label: 'Casual or relief' },
] as const

export type ContractTypePref = (typeof CONTRACT_TYPE_PREFS)[number]['value']
