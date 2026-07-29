// Shared lead geo + region canonicalisation for the intake AND harvest edge
// functions (Admin Portal v2, workstream F). Single source of truth so a pasted,
// screenshot, or harvested lead segments identically. Previously this logic was
// duplicated in lead-intake/index.ts and lead-harvest/index.ts — and the two had
// diverged: intake canonicalised 'Manawatū-Whanganui' (macron), harvest
// 'Manawatu-Whanganui' (no macron), so the same region split into two buckets.
// This module is the macron-canonical version; both functions now import it.
//
// Pure TS (no Deno/remote imports) so it also unit-tests under vitest.

export const NZ_REGIONS = [
  'Northland',
  'Auckland',
  'Waikato',
  'Bay of Plenty',
  'Gisborne',
  "Hawke's Bay",
  'Taranaki',
  'Manawatū-Whanganui',
  'Wellington',
  'Tasman',
  'Nelson',
  'Marlborough',
  'West Coast',
  'Canterbury',
  'Otago',
  'Southland',
]

// exact match → alias → null. Aliases fold macron/no-macron variants and the
// Wairarapa towns (administratively Wellington) into the canonical set.
const REGION_ALIASES: Record<string, string> = {
  wairarapa: 'Wellington',
  'south wairarapa': 'Wellington',
  masterton: 'Wellington',
  carterton: 'Wellington',
  greytown: 'Wellington',
  featherston: 'Wellington',
  martinborough: 'Wellington',
  'manawatu-whanganui': 'Manawatū-Whanganui',
  'manawatu-wanganui': 'Manawatū-Whanganui',
  manawatu: 'Manawatū-Whanganui',
  wanganui: 'Manawatū-Whanganui',
  whanganui: 'Manawatū-Whanganui',
  'hawkes bay': "Hawke's Bay",
  'hawke s bay': "Hawke's Bay",
}

export function canonicalRegion(r: string | null | undefined): string | null {
  if (!r) return null
  const key = r.trim().toLowerCase()
  const exact = NZ_REGIONS.find((x) => x.toLowerCase() === key)
  if (exact) return exact
  return REGION_ALIASES[key] ?? null
}

export type LeadContact = {
  email?: string
  phone?: string
  url?: string
  name?: string
  notes?: string
}

// geo_scope (Leads v2) — mirrors migration 061's backfill. intl on a foreign
// dialling prefix / ccTLD / unambiguous overseas place; nz on a real NZ region;
// else unknown. NZ-ambiguous words are deliberately excluded from the country list.
const INTL_PLACE_RE =
  /ireland|saskatchewan|king island|tasmania|\baustralia\b|queensland|new south wales/i
const FOREIGN_TLD_RE = /\.(ie|au|uk|ca|de|fr|us|za)$/i
const FOREIGN_DIAL_RE = /\+(?!64)\d/

export function classifyGeo(
  contact: LeadContact | null | undefined,
  region: string | null,
  hay: string,
): 'nz' | 'intl' | 'unknown' {
  if (
    FOREIGN_DIAL_RE.test(contact?.phone ?? '') ||
    FOREIGN_TLD_RE.test(contact?.email ?? '') ||
    INTL_PLACE_RE.test(hay)
  ) {
    return 'intl'
  }
  if (region && NZ_REGIONS.includes(region)) return 'nz'
  return 'unknown'
}
