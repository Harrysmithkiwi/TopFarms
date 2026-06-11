import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// lead-harvest — PULL feed for commercial ag job boards via Firecrawl
// (PHASE-LEADS-FEEDS-ARCHITECTURE.md). Cron-triggered (pg_cron → pg_net with
// X-Webhook-Secret). Pattern proved on nzfarmingjobs 2026-06-12:
//
//   map(map_url) → filter to /job/ ads (drop the spam-polluted /company/
//   directory + /resume/) → dedupe against existing source_refs BEFORE
//   spending credits → /v2/scrape (json+schema) each NEW ad → normalise →
//   _lead_intake (service_role).
//
// 5 credits per scrape, so dedupe-before-extract is the cost control: steady
// state = only NEW ads each run. The map step is cheap. Honest-degrade: no
// FIRECRAWL_API_KEY → {skipped}. Employer-only (§9.5); no anti-detection (§3).
// Recruiter split: business_name = hiring farm; advertiser_name = agency;
// is_recruiter flags agency-placed ads. Never-infer: contact_* only when
// printed (enforced in the schema descriptions + prompt).

const FIRECRAWL = 'https://api.firecrawl.dev/v2'

// Per-board config. Add boards here; each new `source` value must also be added
// to the leads/lead_staging source CHECK (migration 044). Seek/TradeMe are
// JS-heavy SPAs — deferred until proven (may need wait-for / FIRE-1 agent).
interface Board {
  source: string
  map_url: string
  search?: string
  map_limit?: number
  url_include: string
  url_exclude: string[]
}
const BOARDS: Board[] = [
  {
    source: 'nzfarmingjobs',
    // ROOT, not /jobs/: the /jobs/ listing page only exposed ~12 links on the
    // first live run (mapped 12 → 0 /job/ ads). The individual ads live at
    // /job/<id> and are discoverable by mapping the site root. Confirmed config
    // via the ?probe=1 matrix before trusting this for a real run.
    map_url: 'https://nzfarmingjobs.co.nz',
    search: 'job',
    map_limit: 500,
    url_include: '/job/',
    url_exclude: ['/company/', '/resume/'],
  },
]

// Cap NEW ads scraped per board per run (bounds credit burn; 5 credits each).
// Skips beyond the cap are reported, never silently dropped.
const MAX_EXTRACTS_PER_BOARD = 25

const EXTRACT_PROMPT =
  'Extract this NZ agricultural EMPLOYER job ad. business_name is the HIRING ' +
  'FARM/station, NOT the recruitment agency; if an agency placed it for a farm, ' +
  'business_name=the farm and advertiser_name=the agency and is_recruiter=true. ' +
  'Map region to one of the 16 NZ regions. Include contact email/name/phone/notes ' +
  'ONLY if explicitly printed in the ad — NEVER infer or construct them. Write ' +
  'summary as one clean paragraph with no contact details.'

const SCHEMA = {
  type: 'object',
  properties: {
    business_name: { type: ['string', 'null'] },
    advertiser_name: { type: ['string', 'null'] },
    is_recruiter: { type: 'boolean' },
    job_title: { type: 'string' },
    region: { type: ['string', 'null'] },
    salary_text: { type: ['string', 'null'] },
    contact_email: { type: ['string', 'null'] },
    contact_name: { type: ['string', 'null'] },
    contact_phone: { type: ['string', 'null'] },
    contact_notes: { type: ['string', 'null'] },
    company_profile_url: { type: ['string', 'null'] },
    summary: { type: ['string', 'null'] },
    listing_url: { type: ['string', 'null'] },
  },
  required: ['job_title', 'is_recruiter'],
}

interface Extracted {
  business_name?: string | null
  advertiser_name?: string | null
  is_recruiter?: boolean
  job_title?: string | null
  region?: string | null
  salary_text?: string | null
  contact_email?: string | null
  contact_name?: string | null
  contact_phone?: string | null
  contact_notes?: string | null
  company_profile_url?: string | null
  summary?: string | null
}

// Narrow structural type: only the read surface dropKnown needs (the full
// SupabaseClient generics don't unify across esm.sh call sites — same fix as
// lead-intake).
type Db = {
  from: (t: string) => {
    select: (c: string) => { in: (col: string, vals: string[]) => PromiseLike<{ data: unknown }> }
  }
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('LEAD_INTAKE_SECRET')
  if (!secret || req.headers.get('x-webhook-secret') !== secret) {
    return json({ error: 'forbidden' }, 403)
  }
  const key = Deno.env.get('FIRECRAWL_API_KEY')
  if (!key) return json({ skipped: 'FIRECRAWL_API_KEY not configured' }, 200)

  // ── Probe mode (?probe=1): read-only discovery diagnostic. Maps a matrix of
  // candidate configs and returns the ACTUAL urls + counts so we can SEE what
  // gets discovered/filtered before spending any extraction credits. No scrape,
  // no DB writes. Maps are cheap.
  if (new URL(req.url).searchParams.get('probe') === '1') {
    const root = 'https://nzfarmingjobs.co.nz'
    const candidates = [
      { label: 'root + search=job', url: root, opts: { search: 'job', limit: 500 } },
      { label: 'root, no search', url: root, opts: { limit: 500 } },
      { label: 'root + search=farm', url: root, opts: { search: 'farm', limit: 500 } },
      { label: '/jobs/ + search=job (orig — got 12)', url: `${root}/jobs/`, opts: { search: 'job', limit: 200 } },
    ]
    const report: unknown[] = []
    for (const c of candidates) {
      const m = await firecrawlMap(key, c.url, c.opts)
      if (!m.ok) { report.push({ ...c, error: m.error }); continue }
      const ads = m.links.filter(
        (u) => u.includes('/job/') && !u.includes('/company/') && !u.includes('/resume/'),
      )
      report.push({
        label: c.label, url: c.url, opts: c.opts,
        total_links: m.links.length,
        job_ads: ads.length,
        sample_ads: ads.slice(0, 25),
        sample_links: m.links.slice(0, 15),
      })
    }
    return json({ probe: true, report })
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const results: Record<string, unknown> = {}

  for (const board of BOARDS) {
    const mapped = await firecrawlMap(key, board.map_url, {
      search: board.search,
      limit: board.map_limit,
    })
    if (!mapped.ok) {
      results[board.source] = { note: mapped.error }
      continue
    }
    // Filter to individual ad URLs; the /company/ directory is spam-polluted.
    const ads = mapped.links.filter(
      (u) => u.includes(board.url_include) && !board.url_exclude.some((x) => u.includes(x)),
    )
    // Dedupe BEFORE spending credits: drop URLs already seen as a source_ref.
    const fresh = await dropKnown(db as unknown as Db, ads)
    const toScrape = fresh.slice(0, MAX_EXTRACTS_PER_BOARD)

    const tally = { mapped: mapped.links.length, ads: ads.length, new: fresh.length,
                    scraped: 0, inserted: 0, exact_duplicate: 0, suppressed: 0, error: 0,
                    skipped_over_cap: Math.max(0, fresh.length - toScrape.length) }

    for (const url of toScrape) {
      const ex = await firecrawlScrape(key, url)
      tally.scraped++
      if (!ex.ok) { tally.error++; continue }
      const structured = normalise(ex.data, url)
      const { data, error } = await db.rpc('_lead_intake', {
        p_source: board.source,
        p_source_ref: url,
        p_raw_excerpt: JSON.stringify(ex.data).slice(0, 2000),
        p_structured: structured,
        p_confidence: 0.9,
        p_missing_fields: missingOf(structured),
      })
      if (error) tally.error++
      else {
        const outcome = (data as { outcome?: string })?.outcome ?? 'error'
        if (outcome in tally) (tally as Record<string, number>)[outcome]++
      }
    }
    results[board.source] = tally
  }

  return json({ results, credits_note: '~5 credits per scrape (json+schema); map is cheap' })
})

// ── Firecrawl ────────────────────────────────────────────────────────────────
async function firecrawlMap(
  key: string,
  url: string,
  opts?: { search?: string; limit?: number },
): Promise<{ ok: true; links: string[] } | { ok: false; error: string }> {
  try {
    const reqBody: Record<string, unknown> = { url, limit: opts?.limit ?? 200 }
    if (opts?.search) reqBody.search = opts.search
    const res = await fetch(`${FIRECRAWL}/map`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    })
    if (!res.ok) return { ok: false, error: `map ${res.status}` }
    const body = (await res.json()) as { links?: { url?: string }[] }
    return { ok: true, links: (body.links ?? []).map((l) => l.url).filter((u): u is string => !!u) }
  } catch (e) {
    return { ok: false, error: `map unreachable: ${(e as Error).message}` }
  }
}

async function firecrawlScrape(
  key: string,
  url: string,
): Promise<{ ok: true; data: Extracted } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${FIRECRAWL}/scrape`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        formats: [{ type: 'json', schema: SCHEMA, prompt: EXTRACT_PROMPT }],
      }),
    })
    if (!res.ok) return { ok: false, error: `scrape ${res.status}` }
    const body = (await res.json()) as { data?: { json?: Extracted } & Record<string, unknown> }
    // v2 returns the structured object at data.json; fall back defensively and
    // log the shape so the first live run surfaces any API drift.
    const extracted = (body.data?.json ?? body.data) as Extracted | undefined
    if (!extracted || typeof extracted !== 'object') {
      console.error('scrape: unexpected shape', JSON.stringify(body).slice(0, 300))
      return { ok: false, error: 'scrape: no json in response' }
    }
    return { ok: true, data: extracted }
  } catch (e) {
    return { ok: false, error: `scrape unreachable: ${(e as Error).message}` }
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────
// service_role bypasses RLS, so it can read the deny-by-default leads tables.
async function dropKnown(db: Db, urls: string[]): Promise<string[]> {
  if (urls.length === 0) return []
  const known = new Set<string>()
  for (const tbl of ['leads', 'lead_staging']) {
    const { data } = await db.from(tbl).select('source_ref').in('source_ref', urls)
    ;(data as { source_ref: string }[] | null)?.forEach((r) => known.add(r.source_ref))
  }
  return urls.filter((u) => !known.has(u))
}

function contactObj(x: Extracted): Record<string, string> | null {
  const c: Record<string, string> = {}
  if (x.contact_email) c.email = x.contact_email
  if (x.contact_phone) c.phone = x.contact_phone
  if (x.contact_name) c.name = x.contact_name
  if (x.contact_notes) c.notes = x.contact_notes
  return Object.keys(c).length ? c : null
}

function normalise(x: Extracted, url: string): Record<string, unknown> {
  return {
    type: 'employer',
    display_name: x.business_name ?? x.job_title ?? '(unnamed)',
    region: x.region ?? null,
    role_or_category: x.job_title ?? null,
    contact: contactObj(x),
    salary_text: x.salary_text ?? null,
    summary: x.summary ?? null,
    company_profile_url: x.company_profile_url ?? null,
    advertiser_name: x.advertiser_name ?? null,
    is_recruiter: x.is_recruiter ?? false,
    source_ref: url,
  }
}

function missingOf(s: Record<string, unknown>): string[] {
  const m: string[] = []
  if (!s.contact) m.push('contact')
  if (!s.region) m.push('region')
  if (s.display_name === '(unnamed)') m.push('business_name')
  return m
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
