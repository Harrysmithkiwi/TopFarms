import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as jose from 'https://esm.sh/jose@5'

// lead-intake — the single intake door, L1 (Claude Haiku structuring).
//
// Two authenticated lanes:
//   1. Apify webhooks (L2): X-Webhook-Secret === LEAD_INTAKE_SECRET.
//   2. Founder's batch-paste UI: Authorization JWT, verified LOCALLY against
//      the project JWKS via jose (signature + aud). This is NOT the CLAUDE §5
//      trap — §5 forbids adminClient.auth.getUser(token) under a gateway that
//      already verified; here verify_jwt=false means WE are the verifier, and
//      JWKS signature verification is the correct tool. Role must be 'admin'
//      (service-client user_roles lookup after verification).
//
// Structuring (design §4, §9.4 = claude-haiku-4-5): items carrying only
// raw_text are parsed into the lead schema — a single paste may contain
// MULTIPLE posts (§9.2 batch decision); Claude returns one object per lead.
// Degrades honestly: no ANTHROPIC_API_KEY configured, or a Claude error,
// stages the raw text at confidence 0 / missing_fields ['all'] for manual
// review — items are never dropped silently.
//
// All outcomes converge on the _lead_intake() Postgres core (service_role
// grant), so suppression + dedupe cannot be bypassed from any lane.

const ALLOWED_SOURCES = ['seek', 'trademe', 'fb_own_group', 'fb_manual_capture']
const REGIONS = [
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

// Region canonicalisation ported from lead-harvest (Phase 1 A3): exact match →
// alias → null. Keeps lead-intake's macron spelling ('Manawatū-Whanganui') as
// canonical; aliases fold common variants in. Previously this lane only did
// exact-match-or-null with no aliases.
const REGION_ALIASES: Record<string, string> = {
  'wairarapa': 'Wellington',
  'manawatu-whanganui': 'Manawatū-Whanganui',
  'manawatu-wanganui': 'Manawatū-Whanganui',
  'manawatu': 'Manawatū-Whanganui',
  'wanganui': 'Manawatū-Whanganui',
  'whanganui': 'Manawatū-Whanganui',
  'hawkes bay': "Hawke's Bay",
  'hawke s bay': "Hawke's Bay",
}
function canonicalRegion(r: string | null | undefined): string | null {
  if (!r) return null
  const key = r.trim().toLowerCase()
  const exact = REGIONS.find((x) => x.toLowerCase() === key)
  if (exact) return exact
  return REGION_ALIASES[key] ?? null
}

// Lane classification (Phase 1 A2) — in CODE, not the LLM. A regex backstop
// promotes any clear email/phone found in application_method / raw text into
// contact before the test, so a misfiled contact doesn't produce a false Lane B.
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
const PHONE_RE = /(?:\+?64|0)[\s-]?(?:2\d|[3-9])(?:[\s-]?\d){6,8}/
type Contact = { email?: string; phone?: string; url?: string; name?: string; notes?: string }
function classifyLane(
  contact: Contact | null | undefined,
  applicationMethod: string | null | undefined,
  rawText: string,
): { lane: 'a' | 'b'; contact: Contact | null } {
  const c: Contact = { ...(contact ?? {}) }
  const hay = [applicationMethod ?? '', rawText ?? ''].join(' ')
  if (!c.email) {
    const m = hay.match(EMAIL_RE)
    if (m) c.email = m[0]
  }
  if (!c.phone) {
    const m = hay.match(PHONE_RE)
    if (m) c.phone = m[0].trim()
  }
  const lane: 'a' | 'b' = c.email || c.phone ? 'a' : 'b'
  return { lane, contact: Object.keys(c).length ? c : null }
}

interface StructuredLead {
  type: 'employer' | 'seeker' | null
  display_name: string | null
  region: string | null
  role_or_category: string | null
  contact: Contact | null
  // FB extract fields (Phase 1 A1) — NEVER-INFER, null unless literally present.
  shed_type: string | null
  herd_details: string | null
  application_method: string | null
  confidence: number
  missing_fields: string[]
}

interface IntakeItem {
  source_ref?: string
  raw_text?: string
  structured?: Record<string, unknown>
  confidence?: number
  missing_fields?: string[]
  // Founder-supplied FB paste metadata (NOT Claude-extracted — no hallucinated
  // URLs). post_url is passed as source_ref; these two ride into structured.
  source_group?: string
  post_timestamp?: string
}

// Minimal config-read surface for draftReply (service_role bypasses RLS).
type ConfigDb = {
  from: (t: string) => {
    select: (c: string) => {
      eq: (k: string, v: number) => { single: () => PromiseLike<{ data: unknown }> }
    }
  }
}

// Apify webhook event envelope (ACTOR.RUN.SUCCEEDED). `resource` mirrors the
// Get-Actor-run API response; defaultDatasetId is the run's results dataset.
interface ApifyEvent {
  eventType?: string
  resource?: { defaultDatasetId?: string; id?: string }
  eventData?: { actorRunId?: string }
}

Deno.serve(async (req) => {
  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const authed = await authorize(req, db as unknown as RoleLookupDb)
  if (!authed.ok) return json({ error: authed.error }, authed.status)

  const reqUrl = new URL(req.url)
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid JSON' }, 400)
  }

  // Two body shapes converge on the shared loop below:
  //   A. Direct  { source, items:[...] }  — L1 paste lane + the replay script.
  //   B. Apify webhook event { resource:{ defaultDatasetId } }  — L2 scheduled
  //      actors. `source` comes from the URL (?source=seek|trademe); items are
  //      FETCHED from the run's dataset with APIFY_TOKEN. Dedupe on source_ref
  //      makes Apify's at-least-once webhook retries idempotent.
  let source: string
  let items: IntakeItem[]
  const apifyDatasetId = (body as ApifyEvent)?.resource?.defaultDatasetId

  if (apifyDatasetId) {
    source = reqUrl.searchParams.get('source') ?? ''
    if (!ALLOWED_SOURCES.includes(source)) {
      return json({ error: `?source must be one of ${ALLOWED_SOURCES.join(', ')}` }, 400)
    }
    const fetched = await fetchApifyDataset(apifyDatasetId)
    if (!fetched.ok) return json({ error: fetched.error }, 502)
    items = fetched.items
  } else {
    const b = body as { source?: string; items?: IntakeItem[] }
    source = b.source ?? ''
    if (!ALLOWED_SOURCES.includes(source)) {
      return json({ error: `source must be one of ${ALLOWED_SOURCES.join(', ')}` }, 400)
    }
    items = Array.isArray(b.items) ? b.items : []
  }

  // Cap: each item is one inline Haiku call. NZ-ag listing volume per 2x/day
  // run is small (design §L2); if it ever exceeds this, structuring moves to a
  // queue rather than raising the cap.
  items = items.slice(0, 50)
  if (items.length === 0) return json({ error: 'no items' }, 400)

  const results: Record<string, number> = {
    inserted: 0,
    suppressed: 0,
    exact_duplicate: 0,
    error: 0,
  }
  const structuredNote: string[] = []

  for (const item of items) {
    // Pre-structured passthrough (Apify L2 actors may pre-map fields).
    let leads: { structured: Record<string, unknown>; confidence: number; missing: string[] }[]
    if (item.structured) {
      leads = [
        {
          structured: item.structured,
          confidence: item.confidence ?? 1,
          missing: item.missing_fields ?? [],
        },
      ]
    } else {
      const parsed = await structureWithClaude(item.raw_text ?? '')
      structuredNote.push(parsed.note)
      leads = parsed.leads.map((l) => {
        // Lane in CODE (A2) + regex backstop; FB fields + paste metadata ride in
        // structured (passed through 041's _lead_intake untouched).
        const { lane, contact } = classifyLane(l.contact, l.application_method, item.raw_text ?? '')
        return {
          structured: {
            type: l.type,
            display_name: l.display_name,
            region: l.region,
            role_or_category: l.role_or_category,
            contact,
            shed_type: l.shed_type ?? null,
            herd_details: l.herd_details ?? null,
            application_method: l.application_method ?? null,
            source_group: item.source_group ?? null,
            post_timestamp: item.post_timestamp ?? null,
            lane,
          },
          confidence: l.confidence,
          missing: l.missing_fields,
        }
      })
    }

    for (const lead of leads) {
      const { data, error } = await db.rpc('_lead_intake', {
        p_source: source,
        p_source_ref: item.source_ref ?? null,
        p_raw_excerpt: (item.raw_text ?? '').slice(0, 2000),
        p_structured: lead.structured,
        p_confidence: lead.confidence,
        p_missing_fields: lead.missing,
      })
      if (error) {
        console.error('intake error:', error.message)
        results.error++
        continue
      }
      const outcome = (data as { outcome?: string; staging_id?: string })?.outcome ?? 'error'
      results[outcome] = (results[outcome] ?? 0) + 1

      // Lane B + freshly staged → seed a drafted FB reply (A4). The draft itself
      // is a PLACEHOLDER until lead_outreach_config is populated — see draftReply.
      const stagingId = (data as { staging_id?: string })?.staging_id
      if (outcome === 'inserted' && stagingId && lead.structured.lane === 'b') {
        const drafted = await draftReply(lead.structured, db as unknown as ConfigDb)
        const { error: seedErr } = await db.rpc('_lead_outreach_seed', {
          p_staging_id: stagingId,
          p_draft: drafted.draft,
          p_model: drafted.model,
        })
        if (seedErr) console.error('outreach seed error:', seedErr.message)
      }
    }
  }

  return json({ received: items.length, results, structuring: structuredNote[0] ?? 'passthrough' })
})

// ─── auth ─────────────────────────────────────────────────────────────────────

// Narrow structural type: only the lookup surface authorize() needs (the
// full SupabaseClient generics don't unify across esm.sh call sites).
type RoleLookupDb = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => { single: () => PromiseLike<{ data: unknown }> }
    }
  }
}

async function authorize(
  req: Request,
  db: RoleLookupDb,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const secret = Deno.env.get('LEAD_INTAKE_SECRET')
  if (secret && req.headers.get('x-webhook-secret') === secret) return { ok: true }

  const bearer = req.headers.get('authorization')?.replace(/^Bearer /i, '')
  if (bearer) {
    try {
      const jwks = jose.createRemoteJWKSet(
        new URL(`${Deno.env.get('SUPABASE_URL')}/auth/v1/.well-known/jwks.json`),
      )
      const { payload } = await jose.jwtVerify(bearer, jwks, { audience: 'authenticated' })
      const userId = payload.sub
      if (userId) {
        const { data } = await db.from('user_roles').select('role').eq('user_id', userId).single()
        if ((data as { role?: string } | null)?.role === 'admin') return { ok: true }
      }
      return { ok: false, status: 403, error: 'admin role required' }
    } catch {
      return { ok: false, status: 401, error: 'invalid token' }
    }
  }
  return { ok: false, status: 403, error: 'forbidden' }
}

// ─── Apify dataset fetch (L2 commercial feeds) ───────────────────────────────
// Field names vary per actor, so we do NOT couple to a specific actor schema:
// the whole row JSON is handed to Haiku structuring, and source_ref is lifted
// from common listing-URL keys so dedupe makes retries idempotent.
async function fetchApifyDataset(
  datasetId: string,
): Promise<{ ok: true; items: IntakeItem[] } | { ok: false; error: string }> {
  const token = Deno.env.get('APIFY_TOKEN')
  if (!token) return { ok: false, error: 'APIFY_TOKEN not configured' }
  try {
    const res = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&format=json`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!res.ok) return { ok: false, error: `apify dataset fetch ${res.status}` }
    const rows = (await res.json()) as Record<string, unknown>[]
    const urlKeys = ['url', 'link', 'jobUrl', 'listingUrl', 'positionUrl', 'adUrl']
    const items: IntakeItem[] = rows.map((row) => {
      const ref = urlKeys.map((k) => row[k]).find((v) => typeof v === 'string') as string | undefined
      return { source_ref: ref, raw_text: JSON.stringify(row).slice(0, 8000) }
    })
    return { ok: true, items }
  } catch (e) {
    return { ok: false, error: `apify unreachable: ${(e as Error).message}` }
  }
}

// ─── Claude Haiku structuring (design §4) ─────────────────────────────────────

async function structureWithClaude(
  rawText: string,
): Promise<{ leads: StructuredLead[]; note: string }> {
  const fallback = (note: string) => ({
    note,
    leads: [
      {
        type: null,
        display_name: null,
        region: null,
        role_or_category: null,
        contact: null,
        shed_type: null,
        herd_details: null,
        application_method: null,
        confidence: 0,
        missing_fields: [`all — ${note}`],
      } as StructuredLead,
    ],
  })

  const key = Deno.env.get('ANTHROPIC_API_KEY')
  if (!key) return fallback('unstructured (ANTHROPIC_API_KEY not configured)')
  if (!rawText.trim()) return fallback('unstructured (empty raw_text)')

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 2048,
        system: [
          'You extract recruitment leads from raw NZ agricultural job/seeker posts',
          '(Seek, TradeMe, Facebook farming groups). The text may contain MULTIPLE',
          'distinct posts — return one object per distinct lead via the emit_leads tool.',
          `region MUST be one of: ${REGIONS.join(', ')} — or null if not stated.`,
          'NZ-ag vocabulary: 2IC = second in charge; OAD = once-a-day milking;',
          'herd manager / farm assistant / calf rearing / relief milking are roles.',
          'shed_type = milking shed (rotary / herringbone / N-bail), verbatim.',
          'herd_details = herd size / calving pattern if stated (e.g. "550 cows, split calving").',
          'application_method = VERBATIM how to apply ("PM me", "email jane@x.co.nz", "call 027…").',
          'NEVER guess or infer absent fields — use null and list them in',
          'missing_fields. Only include contact details EXPLICITLY stated in the',
          'post (no enrichment, no inference). confidence is your 0-1 certainty',
          'the extraction is faithful.',
        ].join(' '),
        messages: [{ role: 'user', content: rawText.slice(0, 8000) }],
        tools: [
          {
            name: 'emit_leads',
            description: 'Emit every distinct lead found in the text.',
            input_schema: {
              type: 'object',
              required: ['leads'],
              properties: {
                leads: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: [
                      'type',
                      'display_name',
                      'region',
                      'role_or_category',
                      'contact',
                      'shed_type',
                      'herd_details',
                      'application_method',
                      'confidence',
                      'missing_fields',
                    ],
                    properties: {
                      type: { type: ['string', 'null'], enum: ['employer', 'seeker', null] },
                      display_name: { type: ['string', 'null'] },
                      region: { type: ['string', 'null'] },
                      role_or_category: { type: ['string', 'null'] },
                      contact: {
                        type: ['object', 'null'],
                        properties: {
                          email: { type: 'string' },
                          phone: { type: 'string' },
                          url: { type: 'string' },
                          name: { type: 'string' },
                          notes: { type: 'string' },
                        },
                      },
                      shed_type: { type: ['string', 'null'] },
                      herd_details: { type: ['string', 'null'] },
                      application_method: { type: ['string', 'null'] },
                      confidence: { type: 'number' },
                      missing_fields: { type: 'array', items: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
        ],
        tool_choice: { type: 'tool', name: 'emit_leads' },
      }),
    })
    if (!res.ok) {
      console.error('claude error:', res.status, (await res.text()).slice(0, 200))
      return fallback(`unstructured (claude ${res.status})`)
    }
    const msg = await res.json()
    const toolUse = (msg.content as { type: string; input?: { leads?: StructuredLead[] } }[]).find(
      (c) => c.type === 'tool_use',
    )
    const leads = toolUse?.input?.leads
    if (!Array.isArray(leads) || leads.length === 0) {
      return fallback('unstructured (claude returned no leads)')
    }
    return {
      note: `claude-haiku structured ${leads.length} lead(s)`,
      leads: leads.map((l) => ({
        ...l,
        region: canonicalRegion(l.region),
        shed_type: l.shed_type ?? null,
        herd_details: l.herd_details ?? null,
        application_method: l.application_method ?? null,
        confidence: Math.max(0, Math.min(1, Number(l.confidence) || 0)),
        missing_fields: Array.isArray(l.missing_fields) ? l.missing_fields : [],
      })),
    }
  } catch (e) {
    console.error('claude call failed:', (e as Error).message)
    return fallback('unstructured (claude unreachable)')
  }
}

// ─── Lane B reply draft (A4) ──────────────────────────────────────────────────
// MECHANISM is built (loads the swappable lead_outreach_config row); the actual
// Claude prompt ASSEMBLY is intentionally a PLACEHOLDER. Per operator: no reply is
// drafted without the do-not rules, and the prompt construction is reviewed before
// going live. Until config (do-not rules + voice + template) is supplied via
// admin_outreach_set_config AND the assembly is signed off, seed a placeholder.
async function draftReply(
  _structured: Record<string, unknown>,
  db: ConfigDb,
): Promise<{ draft: string; model: string }> {
  let cfg: { do_not_rules?: unknown[]; voice_guide?: string; template?: string } = {}
  try {
    const { data } = await db.from('lead_outreach_config').select('*').eq('id', 1).single()
    cfg = (data as typeof cfg) ?? {}
  } catch {
    /* fall through to placeholder */
  }

  const ready = !!cfg.template && Array.isArray(cfg.do_not_rules) && cfg.do_not_rules.length > 0
  if (!ready) {
    return {
      draft:
        '[Draft pending — set the reply-draft config (do-not rules + voice guide + template) ' +
        'via admin_outreach_set_config. No reply is generated without the do-not rules.]',
      model: 'placeholder',
    }
  }

  // ⚠️ A4 PLACEHOLDER ASSEMBLY — finalise with operator sign-off once config lands:
  //   build the Claude system prompt from cfg.voice_guide + cfg.do_not_rules +
  //   cfg.template + the structured lead, call claude-haiku-4-5, return the reply.
  // Dormant by design until then.
  return {
    draft: '[Outreach config present — Claude draft assembly pending operator sign-off]',
    model: 'placeholder',
  }
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
