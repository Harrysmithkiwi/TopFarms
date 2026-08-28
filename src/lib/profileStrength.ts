/**
 * THE profile-strength calculation — single source of truth.
 *
 * SeekerDashboard counted 8 fields while MyApplications counted 6, so the
 * same seeker read two different percentages on two screens. One field list,
 * one formula, imported by both.
 */
export const PROFILE_STRENGTH_FIELDS = [
  'sector_pref',
  'years_experience',
  'shed_types_experienced',
  'herd_sizes_worked',
  'dairynz_level',
  'region',
  'visa_status',
  'min_salary',
] as const

export type ProfileStrengthField = (typeof PROFILE_STRENGTH_FIELDS)[number]

/** SELECT-list fragment for fetching exactly the fields the formula reads. */
export const PROFILE_STRENGTH_SELECT = PROFILE_STRENGTH_FIELDS.join(', ')

export function computeProfileStrength(
  profile: Partial<Record<ProfileStrengthField, unknown>>,
): number {
  let filled = 0
  for (const field of PROFILE_STRENGTH_FIELDS) {
    const val = profile[field]
    if (val === null || val === undefined || val === '') continue
    if (Array.isArray(val) && val.length === 0) continue
    filled++
  }
  return Math.round((filled / PROFILE_STRENGTH_FIELDS.length) * 100)
}
