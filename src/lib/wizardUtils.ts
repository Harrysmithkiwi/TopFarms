// ============================================================
// wizardUtils.ts
// Phase 8 — Wizard utility helpers
// ============================================================

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
