export const NZ_REGIONS = [
  'Northland',
  'Auckland',
  'Waikato',
  'Bay of Plenty',
  'Gisborne',
  "Hawke's Bay",
  'Taranaki',
  'Manawatu-Whanganui',
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
  'Herd Manager',
  '2IC',
  'Relief Milker',
  'Other',
] as const

export type RoleType = (typeof ROLE_TYPES)[number]
