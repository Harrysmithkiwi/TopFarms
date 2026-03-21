// ============================================================
// wizardUtils.ts
// Phase 8 — Wizard utility helpers
// ============================================================

const ACCOMMODATION_CHIP_MAP: Record<string, string> = {
  accommodation_pets: 'Pets allowed',
  accommodation_couples: 'Couples welcome',
  accommodation_family: 'Family welcome',
  accommodation_utilities_included: 'Utilities included',
}

/**
 * Maps legacy boolean accommodation columns to chip string[] values.
 * Used for backward-compatible chip preloading when existing profile
 * has old boolean columns but no accommodation_extras array yet.
 *
 * @param profile - The raw profile record from Supabase
 * @param columnMap - Map of DB column names to chip label strings
 * @returns string[] of chip values that are true in the profile
 */
export function booleanColumnsToChipArray(
  profile: Record<string, boolean | unknown>,
  columnMap: Record<string, string> = ACCOMMODATION_CHIP_MAP,
): string[] {
  return Object.entries(columnMap)
    .filter(([col]) => profile[col] === true)
    .map(([, chipValue]) => chipValue)
}

/**
 * Computes job listing completeness as a rounded-to-nearest-5 percentage.
 * Used by LivePreviewSidebar to show progress to employers as they fill
 * in their job posting wizard.
 *
 * @param data - Partial JobPostingData fields
 * @returns Percentage 0-100, rounded to nearest 5
 */
export function computeJobCompleteness(data: {
  title?: string
  region?: string
  shed_type?: string[]
  salary_min?: number
  salary_max?: number
  accommodation?: unknown
  description_overview?: string
}): number {
  const fields = [
    !!data.title,
    !!data.region,
    !!(data.shed_type && data.shed_type.length > 0),
    !!(data.salary_min || data.salary_max),
    !!data.accommodation,
    !!data.description_overview,
  ]
  const filled = fields.filter(Boolean).length
  return Math.round((filled / fields.length) * 100 / 5) * 5
}
