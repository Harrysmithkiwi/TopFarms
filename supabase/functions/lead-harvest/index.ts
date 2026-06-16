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
  sitemap?: 'skip' | 'include' | 'only'
  map_limit?: number
  url_include: string
  url_exclude: string[]
}
const BOARDS: Board[] = [
  {
    source: 'nzfarmingjobs',
    // ROOT + SITEMAP, no search: the /jobs/ listing exposed only ~12 links;
    // worse, Firecrawl's `search` param pre-filters by slug keyword and silently
    // drops ads whose slugs lack the term (probe: search=job→6, search=farm→14,
    // both << the ~40 live ads). The sitemap is the authoritative complete list
    // of /job/ pages — no keyword guessing, no missed ads. limit 5000 (the API
    // default; our earlier 500 truncated on /company/ URLs). Confirmed via the
    // ?probe=1 matrix before a real run.
    map_url: 'https://nzfarmingjobs.co.nz',
    sitemap: 'only',
    map_limit: 5000,
    url_include: '/job/',
    url_exclude: ['/company/', '/resume/'],
  },
]

// Background time budget. The scrape loop runs inside EdgeRuntime.waitUntil
// AFTER we return 202, so it gets the full worker wall-clock (Free tier: 150s —
// Supabase docs verified 2026-06-16), NOT the 60s gateway response cut (which we
// sidestep by returning immediately). Stop STARTING new scrapes once elapsed
// exceeds the budget, leaving ~25s headroom for the in-flight scrape (~5-10s) +
// the run-table finalise. Time-budgeting adapts to per-ad latency drift where a
// fixed count can't; BACKSTOP_MAX is a hard ceiling so a pathological run can't
// spin to the wall. Over-budget ads roll into the next run via dedupe.
const HARVEST_BUDGET_MS = 125_000 // ~125s of a 150s Free wall-clock
const BACKSTOP_MAX = 60

// Supabase global for background tasks: keeps the worker alive until the promise
// settles (bounded by the wall-clock limit).
declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void }

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
    const candidates: { label: string; url: string; opts: MapOpts }[] = [
      { label: 'root sitemap=only, no search, limit 5000', url: root, opts: { sitemap: 'only', limit: 5000 } },
      { label: 'root sitemap=include, no search, limit 5000', url: root, opts: { sitemap: 'include', limit: 5000 } },
      { label: 'root + search=farm (prior best — 14)', url: root, opts: { search: 'farm', limit: 500 } },
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

  // Fire-and-return: the sequential scrape loop is far longer than the 60s
  // gateway response window, so run it as a background task and return 202
  // immediately. The caller (cron via pg_net, or a manual trigger) gets the
  // run_id; the tally lands in lead_harvest_runs + the logs, not this response.
  const runId = crypto.randomUUID()
  EdgeRuntime.waitUntil(runHarvest(runId, key))
  return json(
    { status: 'started', run_id: runId,
      check: 'SELECT status, tally FROM lead_harvest_runs WHERE id = <run_id>' },
    202,
  )
})

// ── Background harvest ───────────────────────────────────────────────────────
// Module-level handle so the beforeunload safety net can flush a partial tally
// to the logs if the worker is killed mid-run (wall-clock hit or crash). In that
// case the lead_harvest_runs row also stays at status='running' — a stale
// 'running' row is itself the timeout signal.
let activeRun: { id: string; tally: Record<string, unknown> } | null = null

addEventListener('beforeunload', () => {
  if (activeRun) {
    console.log(
      `harvest-run ${activeRun.id} INTERRUPTED (worker shutdown) partial=${JSON.stringify(activeRun.tally)}`,
    )
  }
})

async function runHarvest(runId: string, key: string): Promise<void> {
  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )
  const startedMs = Date.now()
  const tally: Record<string, unknown> = {}
  activeRun = { id: runId, tally }
  let status: 'complete' | 'partial' | 'error' = 'complete'

  // Start marker (a stale 'running' row later = a run the worker never finalised).
  const ins = await db.from('lead_harvest_runs').insert({ id: runId, status: 'running', tally: {} })
  if (ins.error) console.error('lead_harvest_runs insert:', ins.error.message)

  try {
    for (const board of BOARDS) {
      const mapped = await firecrawlMap(key, board.map_url, {
        search: board.search,
        sitemap: board.sitemap,
        limit: board.map_limit,
      })
      if (!mapped.ok) { tally[board.source] = { note: mapped.error }; continue }
      // Filter to individual ad URLs; the /company/ directory is spam-polluted.
      const ads = mapped.links.filter(
        (u) => u.includes(board.url_include) && !board.url_exclude.some((x) => u.includes(x)),
      )
      // Dedupe BEFORE spending credits: drop URLs already seen as a source_ref.
      const fresh = await dropKnown(db as unknown as Db, ads)

      const bt = { mapped: mapped.links.length, ads: ads.length, new: fresh.length,
                   scraped: 0, inserted: 0, exact_duplicate: 0, suppressed: 0, error: 0,
                   skipped_over_budget: 0 }
      tally[board.source] = bt

      for (let i = 0; i < fresh.length; i++) {
        // Stop starting new scrapes at the time budget or the hard backstop; the
        // remainder rolls into the next run (dedupe makes that idempotent).
        if (i >= BACKSTOP_MAX || Date.now() - startedMs > HARVEST_BUDGET_MS) {
          bt.skipped_over_budget = fresh.length - i
          status = 'partial'
          break
        }
        const url = fresh[i]
        const ex = await firecrawlScrape(key, url)
        bt.scraped++
        if (!ex.ok) { bt.error++; continue }
        const structured = normalise(ex.data, url)
        // raw_excerpt '' (#5): harvested rows are fully structured; the raw JSON
        // is noise next to the summary, so the review panel's excerpt box hides.
        const { data, error } = await db.rpc('_lead_intake', {
          p_source: board.source,
          p_source_ref: url,
          p_raw_excerpt: '',
          p_structured: structured,
          p_confidence: 0.9,
          p_missing_fields: missingOf(structured),
        })
        if (error) bt.error++
        else {
          const outcome = (data as { outcome?: string })?.outcome ?? 'error'
          if (outcome in bt) (bt as Record<string, number>)[outcome]++
        }
      }
    }
  } catch (e) {
    status = 'error'
    tally.error = (e as Error).message
  }

  const upd = await db.from('lead_harvest_runs')
    .update({ finished_at: new Date().toISOString(), status, tally })
    .eq('id', runId)
  if (upd.error) console.error('lead_harvest_runs update:', upd.error.message)
  console.log(`harvest-run ${runId} ${status} ${JSON.stringify(tally)}`)
  activeRun = null
}

// ── Firecrawl ────────────────────────────────────────────────────────────────
type MapOpts = { search?: string; sitemap?: 'skip' | 'include' | 'only'; limit?: number }

async function firecrawlMap(
  key: string,
  url: string,
  opts?: MapOpts,
): Promise<{ ok: true; links: string[] } | { ok: false; error: string }> {
  try {
    const reqBody: Record<string, unknown> = { url, limit: opts?.limit ?? 5000 }
    if (opts?.search) reqBody.search = opts.search
    if (opts?.sitemap) reqBody.sitemap = opts.sitemap
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

// Board guard (#1): the listing site is NOT a recruiter. When the LLM puts the
// board's own name in advertiser_name (e.g. "NZ Farming Jobs",
// "nzfarmingjobs.co.nz") it mistook the site for a placing agency. Strip
// non-letters and match the board token — real agencies like "Rural Directions"
// → "ruraldirections" never match.
function isBoardName(name: string | null | undefined): boolean {
  if (!name) return false
  return name.toLowerCase().replace(/[^a-z]/g, '').includes('nzfarmingjobs')
}

// Region canonicalisation (#2): enforce the 16-region set; do NOT trust the
// LLM's free text. Exact match wins; known variants map via aliases; anything
// else → null (surfaces as a missing field for manual review rather than
// polluting region filtering with off-set values).
const NZ_REGIONS = [
  'Northland', 'Auckland', 'Waikato', 'Bay of Plenty', 'Gisborne', "Hawke's Bay",
  'Taranaki', 'Manawatu-Whanganui', 'Wellington', 'Tasman', 'Nelson',
  'Marlborough', 'West Coast', 'Canterbury', 'Otago', 'Southland',
]
const REGION_ALIASES: Record<string, string> = {
  'wairarapa': 'Wellington', // Wairarapa sits within the Wellington region
  'manawatu-wanganui': 'Manawatu-Whanganui',
  'manawatu': 'Manawatu-Whanganui',
  'wanganui': 'Manawatu-Whanganui',
  'whanganui': 'Manawatu-Whanganui',
  'hawkes bay': "Hawke's Bay",
  'hawke s bay': "Hawke's Bay",
}
function canonicalRegion(r: string | null | undefined): string | null {
  if (!r) return null
  const key = r.trim().toLowerCase()
  const exact = NZ_REGIONS.find((x) => x.toLowerCase() === key)
  if (exact) return exact
  return REGION_ALIASES[key] ?? null
}

function normalise(x: Extracted, url: string): Record<string, unknown> {
  // #1: if the "advertiser" is really the board, it's a direct-from-farm ad —
  // null the advertiser and clear the recruiter flag. Genuine agencies (Rural
  // Directions, etc.) pass through unchanged.
  const advertiserIsBoard = isBoardName(x.advertiser_name)
  return {
    type: 'employer',
    display_name: x.business_name ?? x.job_title ?? '(unnamed)',
    region: canonicalRegion(x.region), // #2
    role_or_category: x.job_title ?? null,
    contact: contactObj(x),
    salary_text: x.salary_text ?? null,
    summary: x.summary ?? null,
    company_profile_url: x.company_profile_url ?? null,
    advertiser_name: advertiserIsBoard ? null : (x.advertiser_name ?? null),
    is_recruiter: advertiserIsBoard ? false : (x.is_recruiter ?? false),
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
