import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// lead-intake — the webhook lane of the single intake door (L0 shell).
//
// Callers: Apify scheduled actors (L2) POST collected items here with the
// X-Webhook-Secret header (LEAD_INTAKE_SECRET in Edge secrets — the
// notify-job-filled pattern). verify_jwt = false, so any JWT arriving here
// is UNVERIFIED (CLAUDE §5 lesson) — which is why the founder's manual
// capture form does NOT use this function: it calls the admin_lead_capture
// RPC directly (PostgREST + _admin_gate). Both paths converge on the same
// _lead_intake() core in Postgres, so suppression/dedupe cannot be bypassed.
//
// L0 accepts pre-structured items only. L1 replaces the passthrough below
// with Claude Haiku structuring of raw text (design §4); until then raw-only
// items are staged at confidence 0 for fully-manual review.
//
// Body: { source, items: [{ source_ref?, raw_text?, structured?,
//         confidence?, missing_fields? }] }   (max 200 items per call)

const ALLOWED_SOURCES = ['seek', 'trademe', 'fb_own_group', 'fb_manual_capture']

Deno.serve(async (req) => {
  const secret = Deno.env.get('LEAD_INTAKE_SECRET')
  if (!secret) {
    console.error('LEAD_INTAKE_SECRET not configured')
    return json({ error: 'intake not configured' }, 500)
  }
  if (req.headers.get('x-webhook-secret') !== secret) {
    return json({ error: 'forbidden' }, 403)
  }

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
  if (items.length === 0) {
    return json({ error: 'items[] required' }, 400)
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const results: Record<string, number> = {
    inserted: 0,
    suppressed: 0,
    exact_duplicate: 0,
    error: 0,
  }

  for (const item of items) {
    // L1 will structure raw_text via Claude Haiku here. L0: pre-structured
    // passthrough; raw-only items stage at confidence 0 for manual review.
    const structured = item.structured ?? { type: null, display_name: null }
    const confidence = item.structured ? (item.confidence ?? 1) : 0
    const missing = item.structured ? (item.missing_fields ?? []) : ['all — unstructured (L0)']

    const { data, error } = await db.rpc('_lead_intake', {
      p_source: source,
      p_source_ref: item.source_ref ?? null,
      p_raw_excerpt: (item.raw_text ?? '').slice(0, 2000),
      p_structured: structured,
      p_confidence: confidence,
      p_missing_fields: missing,
    })
    if (error) {
      console.error('intake error:', error.message)
      results.error++
    } else {
      const outcome = (data as { outcome?: string })?.outcome ?? 'error'
      results[outcome] = (results[outcome] ?? 0) + 1
    }
  }

  return json({ received: items.length, results })
})

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
