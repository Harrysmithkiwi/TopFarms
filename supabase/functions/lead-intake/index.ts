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

interface StructuredLead {
  type: 'employer' | 'seeker' | null
  display_name: string | null
  region: string | null
  role_or_category: string | null
  contact: { email?: string; phone?: string; url?: string } | null
  confidence: number
  missing_fields: string[]
}

Deno.serve(async (req) => {
  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const authed = await authorize(req, db as unknown as RoleLookupDb)
  if (!authed.ok) return json({ error: authed.error }, authed.status)

  let body: {
    source?: string
    items?: {
      source_ref?: string
      raw_text?: string
      structured?: Record<string, unknown>
      confidence?: number
      missing_fields?: string[]
    }[]
  }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid JSON' }, 400)
  }

  const source = body.source ?? ''
  if (!ALLOWED_SOURCES.includes(source)) {
    return json({ error: `source must be one of ${ALLOWED_SOURCES.join(', ')}` }, 400)
  }
  const items = Array.isArray(body.items) ? body.items.slice(0, 200) : []
  if (items.length === 0) return json({ error: 'items[] required' }, 400)

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
      leads = parsed.leads.map((l) => ({
        structured: {
          type: l.type,
          display_name: l.display_name,
          region: l.region,
          role_or_category: l.role_or_category,
          contact: l.contact,
        },
        confidence: l.confidence,
        missing: l.missing_fields,
      }))
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
      } else {
        const outcome = (data as { outcome?: string })?.outcome ?? 'error'
        results[outcome] = (results[outcome] ?? 0) + 1
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
                        },
                      },
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
        region: l.region && REGIONS.includes(l.region) ? l.region : null,
        confidence: Math.max(0, Math.min(1, Number(l.confidence) || 0)),
        missing_fields: Array.isArray(l.missing_fields) ? l.missing_fields : [],
      })),
    }
  } catch (e) {
    console.error('claude call failed:', (e as Error).message)
    return fallback('unstructured (claude unreachable)')
  }
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
