import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// lead-harvest — the PULL feed for commercial boards (Seek + TradeMe) via
// Firecrawl extract (PHASE-LEADS-FEEDS-ARCHITECTURE.md). Cron-triggered (pg_cron
// → pg_net.http_post with X-Webhook-Secret). Unlike lead-intake (push: Apify
// webhooks + manual paste), this function reaches OUT on a schedule.
//
// Firecrawl /v2/extract is async: POST → jobId → poll /v2/extract/{jobId}.
// Extracted listings are already STRUCTURED (schema below), so they go to the
// _lead_intake core PRE-STRUCTURED at high confidence — Haiku is not spent on
// clean commercial HTML. Dedupe on listing_url (source_ref) makes re-runs
// idempotent.
//
// Honest-degrade: no FIRECRAWL_API_KEY → { skipped } (no error, no fake data).
// Employer-only (§9.5). No anti-detection (§3) — Firecrawl is an identifiable,
// rate-limited extraction service.

const FIRECRAWL_BASE = 'https://api.firecrawl.dev/v2/extract'

// Search URLs per board, comma-separated in env (so they widen without a
// deploy). Empty until the operator confirms the NZ-ag search URLs to target.
const SOURCE_URLS: Record<string, string> = {
  seek: Deno.env.get('FIRECRAWL_SEEK_URLS') ?? '',
  trademe: Deno.env.get('FIRECRAWL_TRADEME_URLS') ?? '',
}

const EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    listings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          business_name: { type: 'string' },
          job_title: { type: 'string' },
          region: { type: 'string' },
          listing_url: { type: 'string' },
          public_contact: { type: 'string' },
        },
        required: ['job_title', 'listing_url'],
      },
    },
  },
  required: ['listings'],
}

const REGIONS = new Set([
  'Northland', 'Auckland', 'Waikato', 'Bay of Plenty', 'Gisborne', "Hawke's Bay",
  'Taranaki', 'Manawatū-Whanganui', 'Wellington', 'Tasman', 'Nelson',
  'Marlborough', 'West Coast', 'Canterbury', 'Otago', 'Southland',
])

interface Listing {
  business_name?: string
  job_title?: string
  region?: string
  listing_url?: string
  public_contact?: string
}

Deno.serve(async (req) => {
  // Called by pg_cron (no user JWT) — gate on the shared secret, same pattern
  // as notify-job-filled / lead-intake's webhook lane.
  const secret = Deno.env.get('LEAD_INTAKE_SECRET')
  if (!secret || req.headers.get('x-webhook-secret') !== secret) {
    return json({ error: 'forbidden' }, 403)
  }

  const key = Deno.env.get('FIRECRAWL_API_KEY')
  if (!key) return json({ skipped: 'FIRECRAWL_API_KEY not configured' }, 200)

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const results: Record<string, { inserted: number; exact_duplicate: number; suppressed: number; error: number; note?: string }> = {}

  for (const source of ['seek', 'trademe'] as const) {
    const urls = SOURCE_URLS[source].split(',').map((u) => u.trim()).filter(Boolean)
    if (urls.length === 0) {
      results[source] = { inserted: 0, exact_duplicate: 0, suppressed: 0, error: 0, note: 'no search URLs configured' }
      continue
    }

    const tally = { inserted: 0, exact_duplicate: 0, suppressed: 0, error: 0 }
    const extracted = await firecrawlExtract(key, urls)
    if (!extracted.ok) {
      results[source] = { ...tally, note: extracted.error }
      continue
    }

    for (const lst of extracted.listings.slice(0, 50)) {
      if (!lst.listing_url || !lst.job_title) continue
      const structured = {
        type: 'employer',
        display_name: lst.business_name ?? lst.job_title,
        region: lst.region && REGIONS.has(lst.region) ? lst.region : null,
        role_or_category: lst.job_title,
        contact: contactFrom(lst.public_contact),
      }
      const { data, error } = await db.rpc('_lead_intake', {
        p_source: source,
        p_source_ref: lst.listing_url,
        p_raw_excerpt: JSON.stringify(lst).slice(0, 2000),
        p_structured: structured,
        p_confidence: 0.9,
        p_missing_fields: lst.business_name ? [] : ['business_name'],
      })
      if (error) tally.error++
      else {
        const outcome = (data as { outcome?: string })?.outcome ?? 'error'
        if (outcome in tally) (tally as Record<string, number>)[outcome]++
      }
    }
    results[source] = tally
  }

  return json({ results })
})

// ── Firecrawl extract (async: POST jobId, then poll) ─────────────────────────
async function firecrawlExtract(
  key: string,
  urls: string[],
): Promise<{ ok: true; listings: Listing[] } | { ok: false; error: string }> {
  try {
    const start = await fetch(FIRECRAWL_BASE, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls,
        prompt:
          'Extract every NZ agricultural EMPLOYER job listing (farms hiring). ' +
          'Ignore "wanted work" / job-seeker ads. region must be one of the 16 NZ regions or null. ' +
          'Only include public_contact if explicitly stated in the ad.',
        schema: EXTRACT_SCHEMA,
      }),
    })
    if (!start.ok) return { ok: false, error: `firecrawl start ${start.status}` }
    const started = (await start.json()) as { success?: boolean; id?: string; data?: { listings?: Listing[] } }
    // Some responses complete synchronously; otherwise poll the job id.
    if (started.data?.listings) return { ok: true, listings: started.data.listings }
    const jobId = started.id
    if (!jobId) return { ok: false, error: 'firecrawl: no job id' }

    for (let i = 0; i < 12; i++) {
      await sleep(5000)
      const poll = await fetch(`${FIRECRAWL_BASE}/${jobId}`, {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (!poll.ok) return { ok: false, error: `firecrawl poll ${poll.status}` }
      const body = (await poll.json()) as { status?: string; data?: { listings?: Listing[] } }
      if (body.status === 'completed') return { ok: true, listings: body.data?.listings ?? [] }
      if (body.status === 'failed' || body.status === 'cancelled') {
        return { ok: false, error: `firecrawl ${body.status}` }
      }
    }
    return { ok: false, error: 'firecrawl poll timeout (60s)' }
  } catch (e) {
    return { ok: false, error: `firecrawl unreachable: ${(e as Error).message}` }
  }
}

function contactFrom(raw?: string): { email?: string; phone?: string; url?: string } | null {
  if (!raw) return null
  if (/@/.test(raw)) return { email: raw.trim() }
  if (/^https?:\/\//.test(raw)) return { url: raw.trim() }
  if (/\d{6,}/.test(raw)) return { phone: raw.trim() }
  return null
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
