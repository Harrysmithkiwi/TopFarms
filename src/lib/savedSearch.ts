import { SHED_TYPES } from '@/types/domain'

/**
 * THE list of filter keys — audit F-17.
 *
 * It used to say "MUST mirror JobSearch.tsx handleClearAll()" and flag the drift risk in its
 * own docstring. It had then drifted exactly as predicted: `q` was missing, so a saved search
 * silently dropped the seeker's text search; four keys that filter nothing were still in it;
 * and `accredited` had never been added. Four registries were being kept in step by hand —
 * this one, JobSearch's clear-all, ActiveFilterPills' label map, and FilterSidebar's
 * hasActiveFilters.
 *
 * JobSearch now DERIVES its clear-all list from this one, so there is a single list rather
 * than a rule about copying. `sort` is here and excluded there; `page` is the reverse (a saved
 * search always starts at page 1).
 */
export const FILTER_KEYS = [
  'q',
  'role_type',
  'posted_recent',
  'shed_type',
  'region',
  'contract_type',
  'herd_size',
  'salary_min',
  'salary_max',
  'accommodation_type',
  'visa',
  'accredited',
  'sort',
] as const

/**
 * Snapshot the filter keys from URL searchParams into a stable string.
 * Output round-trips lossless via `new URLSearchParams(snapshotted)`.
 * Excludes the page param per locked decision (saved searches start at page 1 on load).
 */
export function snapshotFilters(searchParams: URLSearchParams): string {
  const next = new URLSearchParams()
  for (const key of FILTER_KEYS) {
    for (const value of searchParams.getAll(key)) {
      next.append(key, value)
    }
  }
  return next.toString()
}

/**
 * Derive a human-readable name from filter values.
 * Priority axes: shed_type → role_type → region → accommodation_type → visa.
 * Truncates to 50 chars with ellipsis.
 * Falls back to "Saved search YYYY-MM-DD" when no filters.
 */
export function deriveAutoName(searchParams: URLSearchParams): string {
  const parts: string[] = []

  // 1. Shed type — primary axis (defines farming domain)
  const shedTypes = searchParams.getAll('shed_type')
  if (shedTypes.length === 1) {
    const label = SHED_TYPES.find((s) => s.value === shedTypes[0])?.label
    if (label) parts.push(label)
  } else if (shedTypes.length > 1) {
    parts.push(`${shedTypes.length} shed types`)
  }

  // 2. Role type — fallback primary if no shed_type
  if (parts.length === 0) {
    const roleTypes = searchParams.getAll('role_type')
    if (roleTypes.length === 1) {
      // Lightly format snake_case → "Snake Case"
      parts.push(
        roleTypes[0]
          .split('_')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
      )
    } else if (roleTypes.length > 1) {
      parts.push(`${roleTypes.length} roles`)
    }
  }

  // 3. Region — location qualifier
  const regions = searchParams.getAll('region')
  if (regions.length === 1) {
    parts.push(`in ${regions[0]}`)
  } else if (regions.length > 1) {
    parts.push(`in ${regions.length} regions`)
  }

  // 4. Accommodation flag
  if (searchParams.getAll('accommodation_type').length > 0) {
    parts.push('+ accommodation')
  }

  // 5. Visa flag
  if (searchParams.get('visa') === 'true') {
    parts.push('+ visa sponsorship')
  }

  // Fallback
  if (parts.length === 0) {
    const today = new Date().toISOString().slice(0, 10)
    return `Saved search ${today}`
  }

  // Truncate to 50 chars
  const name = parts.join(' ')
  if (name.length <= 50) return name
  return `${name.slice(0, 47).trimEnd()}…`
}

/**
 * Predicate for "Save search" button visibility.
 * Returns true when at least one FILTER_KEYS value is set (excluding page/sort defaults).
 * Mirrors FilterSidebar.tsx:117 hasActiveFilters semantics — Phase 18 may extract
 * a single canonical helper.
 */
export function hasActiveFilters(searchParams: URLSearchParams): boolean {
  for (const key of FILTER_KEYS) {
    if (key === 'sort') continue // default sort is not a "filter applied" signal
    if (searchParams.getAll(key).length > 0) return true
  }
  return false
}
