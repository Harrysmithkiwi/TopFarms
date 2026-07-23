/**
 * Shared lead-display helpers for the admin lead surfaces (Staging, Outreach,
 * Leads). One source of truth so card titles, source labels and search-match
 * context render identically across pages.
 *
 * Phase 28 punch-list:
 *  - P-5  formatLeadName  — clean card title, not a raw listing headline.
 *  - P-10 matchSnippet    — show WHY a row matched the search (e.g. a locality
 *                           buried in the raw post) so the hit is legible.
 */

/** Source code → human label. Shared by every lead surface. */
export const SOURCE_LABELS: Record<string, string> = {
  seek: 'Seek',
  trademe: 'TradeMe',
  fb_own_group: 'FB (own group)',
  fb_manual_capture: 'FB (manual capture)',
  manual_paste: 'Manual / screenshot',
  nzfarmingjobs: 'NZ Farming Jobs',
}

export const sourceLabel = (source: string): string => SOURCE_LABELS[source] ?? source

/**
 * P-5 — a clean, scannable card title.
 *
 * display_name often arrives as a raw listing headline ("110ha Pivot-Irrigated
 * Dairy Farm, Rotherham"). The locality after the final comma is surfaced
 * separately (P-8), and the descriptive headline is capped so the name column
 * stays aligned. We DON'T rewrite the name — just trim the trailing-locality
 * tail and bound the length; the full headline stays available on hover (title
 * attr) and in the detail drawer.
 *
 * ponytail: heuristic, not an NLP parse. Ceiling: a name legitimately
 * containing a comma loses its tail in the title (full value still on hover).
 * Upgrade path is the lead-intake prompt emitting a discrete display_name +
 * locality (staged for GATE 2) — then this just passes through.
 */
export function formatLeadName(displayName: string | null | undefined): string {
  const raw = (displayName ?? '').trim()
  if (!raw) return '(unnamed)'
  // Drop a trailing ", Locality" tail when the head is descriptive enough to
  // stand alone (>= 3 words) — keeps "Smith Farms Ltd" intact but strips the
  // town off a "… Dairy Farm, Rotherham" headline.
  const lastComma = raw.lastIndexOf(',')
  let head = raw
  if (lastComma > 0) {
    const candidate = raw.slice(0, lastComma).trim()
    if (candidate.split(/\s+/).length >= 3) head = candidate
  }
  // Bound the title; full value remains on hover.
  return head.length > 48 ? head.slice(0, 47).trimEnd() + '…' : head
}

/**
 * P-8 — the locality to show alongside region.
 *
 * Prefers a discrete structured.locality (populated by the GATE-2 lead-intake
 * change). Until that ships, falls back to the trailing ", Locality" tail of a
 * headline-style display_name so existing rows still surface a town.
 */
export function leadLocality(structured: {
  locality?: string | null
  display_name?: string | null
}): string | null {
  const explicit = (structured.locality ?? '').trim()
  if (explicit) return explicit
  const name = (structured.display_name ?? '').trim()
  const lastComma = name.lastIndexOf(',')
  if (lastComma > 0) {
    const head = name.slice(0, lastComma).trim()
    const tail = name.slice(lastComma + 1).trim()
    // Only treat the tail as a locality if the head stands alone (mirrors
    // formatLeadName) and the tail is short (a town, not another clause).
    if (head.split(/\s+/).length >= 3 && tail && tail.split(/\s+/).length <= 3) {
      return tail
    }
  }
  return null
}

/** "Waikato · Tirohanga" / "Waikato" / "" (blank) for region+locality display. */
export function regionLocalityLabel(structured: {
  region?: string | null
  locality?: string | null
  display_name?: string | null
}): string {
  const region = (structured.region ?? '').trim()
  const locality = leadLocality(structured)
  if (region && locality && locality.toLowerCase() !== region.toLowerCase()) {
    return `${region} · ${locality}`
  }
  // Blank (not "—") when neither is known — a dash in a populated row reads as
  // a load failure; an empty cell reads as "no region", which is the truth.
  return region || locality || ''
}

/**
 * P-10 — context window around the first case-insensitive match of `term` in
 * `text`, so a row that matched on hidden raw-post text shows why. Returns null
 * when the term is empty, absent, or already visible in the row's named columns
 * (caller decides visibility).
 */
export function matchSnippet(
  text: string | null | undefined,
  term: string,
  radius = 32,
): string | null {
  const hay = (text ?? '').replace(/\s+/g, ' ').trim()
  const needle = term.trim()
  if (!hay || needle.length < 2) return null
  const idx = hay.toLowerCase().indexOf(needle.toLowerCase())
  if (idx < 0) return null
  const matchEnd = idx + needle.length
  let start = Math.max(0, idx - radius)
  let end = Math.min(hay.length, matchEnd + radius)
  // Snap to whole-word boundaries so the window never cuts mid-word
  // ("…farm locate…"). Move start right to a word start, end left to a word end,
  // never crossing into the matched term itself.
  if (start > 0) while (start < idx && hay[start - 1] !== ' ') start++
  if (end < hay.length) while (end > matchEnd && hay[end] !== ' ') end--
  return (start > 0 ? '…' : '') + hay.slice(start, end).trim() + (end < hay.length ? '…' : '')
}

/**
 * Split `text` into segments around (case-insensitive) occurrences of `term`,
 * flagging the matches so a caller can bold them. Pure + testable; the snippet
 * consumer renders match segments in <strong>. Returns a single non-match
 * segment when the term is empty/absent.
 */
export function highlightParts(text: string, term: string): { text: string; match: boolean }[] {
  const needle = term.trim()
  if (!text || needle.length < 2) return [{ text, match: false }]
  const parts: { text: string; match: boolean }[] = []
  const lowerHay = text.toLowerCase()
  const lowerNeedle = needle.toLowerCase()
  let from = 0
  for (;;) {
    const hit = lowerHay.indexOf(lowerNeedle, from)
    if (hit < 0) break
    if (hit > from) parts.push({ text: text.slice(from, hit), match: false })
    parts.push({ text: text.slice(hit, hit + needle.length), match: true })
    from = hit + needle.length
  }
  if (from < text.length) parts.push({ text: text.slice(from), match: false })
  return parts
}
