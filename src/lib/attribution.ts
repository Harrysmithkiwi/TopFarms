// Outreach attribution helpers, shared by the signup page and the landing pages.
//
// `?ref=` carries the first 8 hex characters of a lead_staging id (a full UUID is
// still accepted, links already sent stay valid). Validated rather than passed
// through: it lands in user metadata permanently, and a junk value would sit
// there forever pretending to be a lead. Same rule as SignUp.tsx has always
// applied; this file is the single copy of it now.
const REF_PATTERN = /^[0-9a-f]{8}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function readAttributionRef(searchParams: URLSearchParams): string | null {
  const refParam = searchParams.get('ref')
  return refParam && REF_PATTERN.test(refParam) ? refParam.toLowerCase() : null
}

// Signup URL for a landing page CTA, carrying `?ref=` through so an outreach
// link that lands on /for-employers or /for-seekers does not lose attribution.
export function signupHref(role: 'employer' | 'seeker', ref: string | null): string {
  return `/signup?role=${role}${ref ? `&ref=${ref}` : ''}`
}
