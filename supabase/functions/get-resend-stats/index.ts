// ============================================================
// get-resend-stats — Phase 20 plan 20-03
//
// Cron-driven poller (verify_jwt = false). Calls Resend's /emails endpoint,
// aggregates last_event into delivered/bounced/complained counts, and upserts
// the result into public.admin_metrics_cache (metric_key='resend_stats').
//
// admin_get_daily_briefing reads from admin_metrics_cache only — this function
// is the only place that hits Resend's API.
//
// Defence-in-depth: verify_jwt=false means the gateway does not authenticate
// the caller. Phase 18 hardening item #15 mandates X-Webhook-Secret validation
// inside the function. The cron job (scheduled in plan 20-08) sends the secret
// in the request header.
//
// IMPORTANT: This function does NOT use the gateway-trust JWT pattern from
// CLAUDE.md §5 — that pattern is for verify_jwt=true functions where the
// gateway has already validated a user JWT. This is a cron-driven webhook,
// no user JWT in flight.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const ADMIN_METRICS_WEBHOOK_SECRET = Deno.env.get('ADMIN_METRICS_WEBHOOK_SECRET') ?? ''

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  // 1. Method check — POST only
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  // 2. Defence-in-depth: validate X-Webhook-Secret (Phase 18 hardening #15)
  if (!ADMIN_METRICS_WEBHOOK_SECRET) {
    console.error('get-resend-stats: ADMIN_METRICS_WEBHOOK_SECRET unset')
    return jsonResponse({ error: 'Server misconfigured (secret unset)' }, 503)
  }
  if (req.headers.get('x-webhook-secret') !== ADMIN_METRICS_WEBHOOK_SECRET) {
    return jsonResponse({ error: 'Forbidden' }, 403)
  }

  // 3. RESEND_API_KEY presence check
  if (!RESEND_API_KEY) {
    console.warn('get-resend-stats: RESEND_API_KEY unset — caching unavailable marker')
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { error } = await adminClient.from('admin_metrics_cache').upsert({
      metric_key: 'resend_stats',
      value: { unavailable: true, reason: 'RESEND_API_KEY unset' },
      cached_at: new Date().toISOString(),
    })
    if (error) {
      console.error('get-resend-stats: cache upsert failed', error)
      return jsonResponse({ error: 'Cache write failed' }, 500)
    }
    return jsonResponse({ ok: true, cached: 'unavailable' }, 200)
  }

  // 4. Fetch Resend emails (last 100)
  let resendData: { data?: Array<{ last_event?: string }> }
  try {
    const res = await fetch('https://api.resend.com/emails?limit=100', {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
    })
    if (!res.ok) {
      const errBody = await res.text()
      console.error(`get-resend-stats: Resend API ${res.status}`, errBody)
      return jsonResponse({ error: `Resend API ${res.status}` }, 502)
    }
    resendData = await res.json()
  } catch (e) {
    console.error('get-resend-stats: fetch failed', e)
    return jsonResponse({ error: 'Resend fetch failed' }, 502)
  }

  // 5. Aggregate last_event counts
  const emails = Array.isArray(resendData.data) ? resendData.data : []
  const counts: Record<string, number> = {}
  for (const e of emails) {
    const event = e.last_event ?? 'unknown'
    counts[event] = (counts[event] ?? 0) + 1
  }
  const total = emails.length
  const delivered = (counts.delivered ?? 0) + (counts.opened ?? 0) + (counts.clicked ?? 0)
  const bounced = counts.bounced ?? 0
  const complained = counts.complained ?? 0
  const rate = total > 0 ? delivered / total : 1

  // 6. Upsert into admin_metrics_cache
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const cachePayload = {
    rate,
    total,
    delivered,
    bounced,
    complained,
    counts,
    sampled_at: new Date().toISOString(),
  }
  const { error } = await adminClient.from('admin_metrics_cache').upsert({
    metric_key: 'resend_stats',
    value: cachePayload,
    cached_at: new Date().toISOString(),
  })
  if (error) {
    console.error('get-resend-stats: cache upsert failed', error)
    return jsonResponse({ error: 'Cache write failed' }, 500)
  }

  return jsonResponse({ ok: true, ...cachePayload }, 200)
})
