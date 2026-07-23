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

const ALLOWED_SOURCES = ['seek', 'trademe', 'fb_own_group', 'fb_manual_capture', 'manual_paste']
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
  // Wairarapa is administratively part of the Wellington region; its towns rarely
  // say "Wellington" in FB posts, so fold the common ones in (else they go null).
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
function canonicalRegion(r: string | null | undefined): string | null {
  if (!r) return null
  const key = r.trim().toLowerCase()
  const exact = REGIONS.find((x) => x.toLowerCase() === key)
  if (exact) return exact
  return REGION_ALIASES[key] ?? null
}

// geo_scope classification (Leads v2) — in CODE, mirrors migration 061's backfill
// so harvested + pasted + screenshot leads segment identically. intl on a foreign
// dialling prefix / ccTLD / unambiguous overseas place; nz on a real NZ region;
// else unknown. NZ-ambiguous words are deliberately excluded from the country list.
const INTL_PLACE_RE =
  /ireland|saskatchewan|king island|tasmania|\baustralia\b|queensland|new south wales/i
const FOREIGN_TLD_RE = /\.(ie|au|uk|ca|de|fr|us|za)$/i
const FOREIGN_DIAL_RE = /\+(?!64)\d/
function classifyGeo(
  contact: Contact | null | undefined,
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
  if (region && REGIONS.includes(region)) return 'nz'
  return 'unknown'
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
  // P-8: town / settlement (e.g. "Tirohanga"), distinct from the macro region.
  // NEVER-INFER — null unless literally stated.
  locality: string | null
  role_or_category: string | null
  contact: Contact | null
  // FB extract fields (Phase 1 A1) — NEVER-INFER, null unless literally present.
  shed_type: string | null
  herd_details: string | null
  application_method: string | null
  // Leads v2: ISO date (YYYY-MM-DD) applications close, if stated; else null.
  applications_close: string | null
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
  // Leads v2 screenshot lane: base64 image (no data: prefix) + its media type.
  // When present, Claude structures from the image (vision) instead of raw_text.
  image?: string
  image_media_type?: string
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

// CORS: matches the repo's browser-invoked functions (get-applicant-document-url,
// notify-job-filled, send-followup-emails). WITHOUT the OPTIONS preflight handler
// + these headers, supabase.functions.invoke() from the admin paste UI fails with
// "Failed to send a request to the Edge Function" before the POST is ever sent.
// The server lanes (pg_cron→pg_net, Apify webhooks) are unaffected — they don't
// do a CORS preflight — which is why only the browser paste lane was broken.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // CORS preflight — must return before anything else (incl. JSON parsing).
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

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
      const parsed = await structureWithClaude(
        item.raw_text ?? '',
        item.image
          ? { data: item.image, mediaType: item.image_media_type ?? 'image/png' }
          : undefined,
      )
      structuredNote.push(parsed.note)
      leads = parsed.leads.map((l) => {
        // Lane in CODE (A2) + regex backstop; FB fields + paste metadata ride in
        // structured (passed through 041's _lead_intake untouched).
        const { lane, contact } = classifyLane(l.contact, l.application_method, item.raw_text ?? '')
        // geo_scope in CODE (Leads v2) — everything text-ish we hold about the lead.
        const hay = [l.application_method ?? '', item.raw_text ?? '', contact?.notes ?? ''].join(
          ' ',
        )
        return {
          structured: {
            type: l.type,
            display_name: l.display_name,
            region: l.region,
            locality: l.locality ?? null,
            role_or_category: l.role_or_category,
            contact,
            shed_type: l.shed_type ?? null,
            herd_details: l.herd_details ?? null,
            application_method: l.application_method ?? null,
            applications_close: l.applications_close ?? null,
            geo_scope: classifyGeo(contact, l.region, hay),
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
        const drafted = await draftReply(
          lead.structured,
          item.raw_text ?? '',
          db as unknown as ConfigDb,
        )
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
      const ref = urlKeys.map((k) => row[k]).find((v) => typeof v === 'string') as
        | string
        | undefined
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
  image?: { data: string; mediaType: string },
): Promise<{ leads: StructuredLead[]; note: string }> {
  const fallback = (note: string) => ({
    note,
    leads: [
      {
        type: null,
        display_name: null,
        region: null,
        locality: null,
        role_or_category: null,
        contact: null,
        shed_type: null,
        herd_details: null,
        application_method: null,
        applications_close: null,
        confidence: 0,
        missing_fields: [`all — ${note}`],
      } as StructuredLead,
    ],
  })

  const key = Deno.env.get('ANTHROPIC_API_KEY')
  if (!key) return fallback('unstructured (ANTHROPIC_API_KEY not configured)')
  if (!rawText.trim() && !image) return fallback('unstructured (empty raw_text)')

  // Screenshot lane (Leads v2): structure from the image via vision. Haiku 4.5 is
  // multimodal, so the same model + tool schema handle text and image intake.
  const userContent = image
    ? [
        {
          type: 'image',
          source: { type: 'base64', media_type: image.mediaType, data: image.data },
        },
        {
          type: 'text',
          text:
            rawText.slice(0, 8000) ||
            'Extract every distinct lead from this screenshot of a NZ farm job post or board.',
        },
      ]
    : rawText.slice(0, 8000)

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
          'display_name = a clean, scannable name for the lead: prefer a business /',
          'farm / person name (e.g. "Smith Farms Ltd", "Jane Smith"). Do NOT use a',
          'descriptive listing headline ("110ha Pivot-Irrigated Dairy Farm") as the',
          'name — if only a headline is given, use the most name-like fragment and',
          'put the town in locality, not the name.',
          `region MUST be one of: ${REGIONS.join(', ')} — or null if not stated.`,
          'locality = the town / settlement / district named in the post (e.g.',
          '"Tirohanga", "Rotherham"), verbatim — distinct from the macro region;',
          'null if no town is stated. NEVER infer it from the region.',
          'NZ-ag vocabulary: 2IC = second in charge; OAD = once-a-day milking;',
          'herd manager / farm assistant / calf rearing / relief milking are roles.',
          'shed_type = milking shed (rotary / herringbone / N-bail), verbatim.',
          'herd_details = herd size / calving pattern if stated (e.g. "550 cows, split calving").',
          'application_method = VERBATIM how to apply ("PM me", "email jane@x.co.nz", "call 027…").',
          'applications_close = the date applications close AS AN ISO DATE (YYYY-MM-DD),',
          'if a closing date is stated — convert "10/7/2026" → "2026-07-10", "1st July',
          '2026" → "2026-07-01" (NZ day/month order). null if no closing date is stated.',
          'NEVER guess or infer absent fields — use null and list them in',
          'missing_fields. Only include contact details EXPLICITLY stated in the',
          'post (no enrichment, no inference). confidence is your 0-1 certainty',
          'the extraction is faithful.',
        ].join(' '),
        messages: [{ role: 'user', content: userContent }],
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
                      'locality',
                      'role_or_category',
                      'contact',
                      'shed_type',
                      'herd_details',
                      'application_method',
                      'applications_close',
                      'confidence',
                      'missing_fields',
                    ],
                    properties: {
                      type: { type: ['string', 'null'], enum: ['employer', 'seeker', null] },
                      display_name: { type: ['string', 'null'] },
                      region: { type: ['string', 'null'] },
                      locality: { type: ['string', 'null'] },
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
                      applications_close: { type: ['string', 'null'] },
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
        locality: l.locality ?? null,
        shed_type: l.shed_type ?? null,
        herd_details: l.herd_details ?? null,
        application_method: l.application_method ?? null,
        applications_close: l.applications_close ?? null,
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
// Reads the swappable lead_outreach_config row (do-not rules + voice guide +
// worked-example register, set by the operator via admin_outreach_set_config /
// Studio) and writes a TAILORED first-contact FB message for this specific lead.
// NOT a fixed template: the post is read and written to, in Harry's voice, within
// the rules, varying shape per the variation kit. Source of truth is the config
// row — edit the config, not this code, to change voice/rules. Every draft lands
// as `drafted`; the operator reads/edits/approves/sends manually on FB (the gate
// never auto-sends). See docs/_canonical/TopFarms_Outreach_Reply_Config.md.

// Voice-critical + low volume (Lane B = no-contact posts only) + the operator
// reads every draft → use the stronger writer, not the haiku used for bulk
// structuring. Temperature is high on purpose: drafts must NOT converge on one
// shape across a small community (see config §5 variation kit).
const DRAFT_MODEL = 'claude-sonnet-4-6'
const DRAFT_TEMPERATURE = 1.0
// Where the message points. The CTA lands a cold employer on the employer entry
// page. Overridable via APP_URL secret; path is the employer signup/post entry.
const outreachLink = () => (Deno.env.get('APP_URL') ?? 'https://topfarms.co.nz') + '/for-employers'

interface OutreachConfigRow {
  do_not_rules?: unknown[]
  voice_guide?: string | null
  template?: string | null
}

/** Assemble the system prompt from the operator's config + the resolved link. */
function buildDraftSystemPrompt(cfg: OutreachConfigRow, link: string): string {
  const rules = (cfg.do_not_rules ?? []).map((r) => `- ${String(r)}`).join('\n')
  return [
    'You are Harry, writing a single first-contact Facebook message to the author of a',
    'New Zealand farm job post that gave no contact details (a Lane B lead). You saw their',
    'post and reckon you can help. You are writing as yourself, a real person, never as a',
    'company representative.',
    '',
    'HOW TO WRITE (voice, structure, and variation):',
    cfg.voice_guide ?? '',
    '',
    'HARD RULES — never break any of these:',
    rules,
    '',
    'REGISTER — worked examples of the right register. Do NOT copy them. They deliberately',
    'vary in shape and length; yours must vary too. Read the actual post and write a fresh',
    'message for THAT post.',
    cfg.template ?? '',
    '',
    `THE LINK — include this exact URL where the message points to TopFarms: ${link}`,
    'Never output a placeholder like [link]; write the real URL.',
    '',
    'OUTPUT: only the message text itself. No preamble, no quotation marks, no subject line,',
    'no sign-off label, no notes about your choices. Just the message, ready to paste.',
  ].join('\n')
}

/** The specific lead, as context for the draft. */
function buildLeadUserMessage(structured: Record<string, unknown>, rawText: string): string {
  const s = structured as Record<string, string | null | undefined>
  const facts: string[] = []
  if (s.role_or_category) facts.push(`Looking for: ${s.role_or_category}`)
  const place = [s.region, s.locality].filter(Boolean).join(' / ')
  if (place) facts.push(`Where: ${place}`)
  if (s.shed_type) facts.push(`Shed: ${s.shed_type}`)
  if (s.herd_details) facts.push(`Herd: ${s.herd_details}`)
  if (s.application_method) facts.push(`How they said to apply: ${s.application_method}`)
  if (s.summary) facts.push(`Summary: ${s.summary}`)
  return [
    'The post (verbatim — read it and write to THIS post specifically):',
    '"""',
    (rawText ?? '').slice(0, 4000).trim() || '(no raw post text captured)',
    '"""',
    '',
    facts.length ? 'What we extracted from it:' : '',
    facts.map((f) => `- ${f}`).join('\n'),
  ]
    .filter(Boolean)
    .join('\n')
}

async function draftReply(
  structured: Record<string, unknown>,
  rawText: string,
  db: ConfigDb,
): Promise<{ draft: string; model: string }> {
  let cfg: OutreachConfigRow = {}
  try {
    const { data } = await db.from('lead_outreach_config').select('*').eq('id', 1).single()
    cfg = (data as OutreachConfigRow) ?? {}
  } catch {
    /* fall through to placeholder */
  }

  // No reply is drafted without the do-not rules + register present.
  const ready = !!cfg.template && Array.isArray(cfg.do_not_rules) && cfg.do_not_rules.length > 0
  if (!ready) {
    return {
      draft:
        '[Draft pending — set the reply-draft config (do-not rules + voice guide + template) ' +
        'via admin_outreach_set_config. No reply is generated without the do-not rules.]',
      model: 'placeholder',
    }
  }

  const key = Deno.env.get('ANTHROPIC_API_KEY')
  // All non-real outcomes start with '[Draft pending' so the Outreach UI keeps the
  // send button disabled (AdminLeadsOutreach isPlaceholder check) until a real draft exists.
  if (!key) {
    return {
      draft: '[Draft pending — ANTHROPIC_API_KEY not configured in Edge secrets]',
      model: 'placeholder',
    }
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: DRAFT_MODEL,
        max_tokens: 400,
        temperature: DRAFT_TEMPERATURE,
        system: buildDraftSystemPrompt(cfg, outreachLink()),
        messages: [{ role: 'user', content: buildLeadUserMessage(structured, rawText) }],
      }),
    })
    if (!res.ok) {
      console.error('draftReply claude error:', res.status, (await res.text()).slice(0, 200))
      return {
        draft: '[Draft pending — draft generation failed, re-stage to retry]',
        model: 'error',
      }
    }
    const msg = await res.json()
    const text = (msg.content as { type: string; text?: string }[] | undefined)
      ?.find((c) => c.type === 'text')
      ?.text?.trim()
    if (!text) {
      return {
        draft: '[Draft pending — draft generation returned empty, re-stage to retry]',
        model: 'error',
      }
    }
    return { draft: text, model: DRAFT_MODEL }
  } catch (e) {
    console.error('draftReply call failed:', (e as Error).message)
    return {
      draft: '[Draft pending — draft generation unreachable, re-stage to retry]',
      model: 'error',
    }
  }
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
