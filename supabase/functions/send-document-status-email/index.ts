// ============================================================
// send-document-status-email — Phase 21 Track B (plan 21-06)
//
// Sends a transactional email to the seeker after admin takes an action on
// their uploaded document (approve / reject / request-more-info).
//
// Triggered from the /admin/documents queue page (Wave 5 plan 21-07) after a
// successful admin RPC call (admin_approve_document, admin_reject_document,
// admin_request_more_info). Best-effort by design: invocation failure does
// NOT roll back the admin RPC — the queue page catches the error and toasts
// a warning but proceeds, because the canonical state change is already
// committed at the DB layer (RPC + admin_audit_log row).
//
// Auth gates (defence-in-depth):
//   1. verify_jwt: true (gateway upstream) — see supabase/config.toml entry
//      `[functions.send-document-status-email]`. Admin caller has a valid
//      user JWT; gateway validates signature before this handler runs.
//   2. X-Webhook-Secret header (Phase 18.1 SC-3 — matches send-followup-emails
//      + notify-job-filled defence; same Vault-backed WEBHOOK_SECRET).
//   3. BFIX-05 gateway-trust JWT decode (CLAUDE.md §5) — atob decode, validate
//      payload.aud === 'authenticated'. Do NOT call adminClient.auth.getUser
//      (rejects valid ES256 tokens on service-role-keyed clients).
//   4. user_roles.role === 'admin' check (only admin invokes this fn).
//
// Best-effort failure modes (200 responses so admin RPC isn't rolled back):
//   - RESEND_API_KEY unset → returns 200 { skipped: true, reason: 'no_resend_key' }
//     so the admin action path succeeds even if email infra is unconfigured.
//     Matches Phase 15 MAIL-02 partial-close discipline (CLAUDE.md §7) — deploy
//     + secret-set are decoupled, and missing secret should not break admin UX.
//
// Hard failure modes:
//   - Missing/invalid Authorization → 401
//   - Webhook secret mismatch / unset → 403
//   - Invalid JSON body / missing fields / unknown action → 400
//   - Caller not admin → 403
//   - DB lookup error → 500
//   - Resend API error (key set but send failed) → 500
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'TopFarms <hello@topfarms.co.nz>'
const APP_URL = Deno.env.get('APP_URL') ?? 'https://topfarms.co.nz'
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? ''

type DocAction = 'approved' | 'rejected' | 'needs_resubmission'

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ---------------------------------------------------------------------------
// Resend email helper — mirrors send-followup-emails:19-38 byte-for-byte
// ---------------------------------------------------------------------------

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('send-document-status-email: RESEND_API_KEY not set — skipping send to', to)
    return false
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  })
  if (!res.ok) {
    const error = await res.text()
    console.error(`send-document-status-email: Resend error for ${to}: ${error}`)
    return false
  }
  return true
}

// ---------------------------------------------------------------------------
// HTML wrapper + CTA — mirrors send-followup-emails:44-78 for brand consistency
// (TopFarms wordmark + #2D5016 primary + DM Sans + #F7F2E8 background).
// Inlined rather than imported because Deno Edge fns can't cleanly share
// internal modules across functions without a shared deno.json import map;
// the duplication is intentional and acceptable per RESEARCH.md §Pattern 4.
// ---------------------------------------------------------------------------

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TopFarms</title>
</head>
<body style="margin:0;padding:0;background-color:#F7F2E8;font-family:DM Sans,-apple-system,Helvetica Neue,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F2E8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#FFFFFF;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 24px;font-size:16px;font-weight:600;color:#2D5016;letter-spacing:-0.01em;">TopFarms</p>
              ${content}
              <hr style="border:none;border-top:1px solid #EEE8DC;margin:32px 0 20px;">
              <p style="margin:0;font-size:12px;color:#9E8E78;line-height:1.5;">
                You received this email because you uploaded a document on TopFarms.
                Questions? Reply to this email or visit <a href="${APP_URL}" style="color:#2D5016;">topfarms.co.nz</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#2D5016;color:#ffffff;border-radius:8px;padding:16px 24px;text-decoration:none;font-weight:600;font-size:14px;line-height:1;">${label}</a>`
}

// ---------------------------------------------------------------------------
// Three templates: approved / rejected (with reason) / needs_resubmission
// ---------------------------------------------------------------------------

function approvedTemplate(filename: string): { subject: string; html: string } {
  const body = `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1A1208;line-height:1.2;">Your document has been verified</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#1A1208;line-height:1.5;">
      Good news — our team has reviewed and approved <strong>${filename}</strong>.
      Your profile now shows a "Documents Verified" badge to employers viewing your applications.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#6B5D4A;line-height:1.5;">
      You can view your documents anytime from your dashboard.
    </p>
    <p style="margin:0 0 0;">
      ${ctaButton(`${APP_URL}/dashboard/seeker/documents`, 'View my documents')}
    </p>
  `
  return {
    subject: 'Your document has been verified — TopFarms',
    html: emailWrapper(body),
  }
}

function rejectedTemplate(filename: string, reason: string): { subject: string; html: string } {
  const body = `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1A1208;line-height:1.2;">Action required — your document was not accepted</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#1A1208;line-height:1.5;">
      Our team has reviewed <strong>${filename}</strong> but couldn't accept it.
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#1A1208;line-height:1.5;">
      <strong>Reason:</strong> ${reason}
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#6B5D4A;line-height:1.5;">
      Please upload a replacement when you're ready.
    </p>
    <p style="margin:0 0 0;">
      ${ctaButton(`${APP_URL}/dashboard/seeker/documents`, 'Upload a replacement')}
    </p>
  `
  return {
    subject: 'Action required — your document was not accepted',
    html: emailWrapper(body),
  }
}

function needsResubmissionTemplate(filename: string): { subject: string; html: string } {
  const body = `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1A1208;line-height:1.2;">Please re-upload your document</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#1A1208;line-height:1.5;">
      Our team has reviewed <strong>${filename}</strong> and would like you to upload a fresh copy.
      This is sometimes needed when the file is unclear, the wrong page is captured,
      or details have changed since your original upload.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#6B5D4A;line-height:1.5;">
      Re-upload from your dashboard at any time.
    </p>
    <p style="margin:0 0 0;">
      ${ctaButton(`${APP_URL}/dashboard/seeker/documents`, 'Upload again')}
    </p>
  `
  return {
    subject: 'Please re-upload your document — TopFarms',
    html: emailWrapper(body),
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  // Gate 1: X-Webhook-Secret defence-in-depth (Phase 18.1 SC-3 pattern).
  // Header lookup is case-insensitive per fetch Headers spec; literal preserved
  // for grep regression guard in tests/send-document-status-email.test.ts.
  const headerSecret = req.headers.get('X-Webhook-Secret') ?? ''
  if (!WEBHOOK_SECRET || headerSecret !== WEBHOOK_SECRET) {
    return jsonResponse({ error: 'Webhook secret missing or invalid' }, 403)
  }

  // Gate 2: BFIX-05 gateway-trust JWT decode (CLAUDE.md §5; NO auth.getUser).
  // verify_jwt: true in config.toml means the gateway has already validated
  // the signature upstream. Decode locally for `sub`; validate audience.
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401)
  }
  let callerUserId: string
  try {
    const payload = JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    )
    if (payload.aud !== 'authenticated') {
      throw new Error('Token audience is not user-scoped')
    }
    callerUserId = payload.sub
    if (!callerUserId || typeof callerUserId !== 'string') {
      throw new Error('Missing or invalid sub claim')
    }
  } catch (e) {
    console.error('send-document-status-email: JWT decode failed', e)
    return jsonResponse({ error: 'Invalid auth token' }, 401)
  }

  // Body validation — { document_id, action, rejection_reason? }
  let body: { document_id?: string; action?: DocAction; rejection_reason?: string } = {}
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }
  const { document_id, action, rejection_reason } = body
  if (!document_id || !action) {
    return jsonResponse({ error: 'document_id and action are required' }, 400)
  }
  if (!['approved', 'rejected', 'needs_resubmission'].includes(action)) {
    return jsonResponse({ error: `Invalid action: ${action}` }, 400)
  }
  if (action === 'rejected' && (!rejection_reason || rejection_reason.trim().length === 0)) {
    return jsonResponse({ error: 'rejection_reason is required when action=rejected' }, 400)
  }

  // Gate 3: admin role check via user_roles (canonical role gate; no auth.getUser).
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: roleRow, error: roleErr } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', callerUserId)
    .maybeSingle()
  if (roleErr) {
    console.error('send-document-status-email: user_roles lookup failed', roleErr)
    return jsonResponse({ error: 'Internal error' }, 500)
  }
  if (roleRow?.role !== 'admin') {
    return jsonResponse({ error: 'Caller is not an admin' }, 403)
  }

  // Fetch document + linked seeker_profiles.user_id (for email lookup).
  const { data: docRow, error: docErr } = await adminClient
    .from('seeker_documents')
    .select('id, filename, seeker_id, seeker_profiles!inner(id, user_id)')
    .eq('id', document_id)
    .maybeSingle()
  if (docErr) {
    console.error('send-document-status-email: seeker_documents lookup failed', docErr)
    return jsonResponse({ error: 'Internal error' }, 500)
  }
  if (!docRow) {
    return jsonResponse({ error: 'Document not found' }, 404)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sp = (docRow as any).seeker_profiles as { id: string; user_id: string } | null
  if (!sp?.user_id) {
    console.error('send-document-status-email: seeker_profiles missing for doc', document_id)
    return jsonResponse({ error: 'Seeker profile missing' }, 500)
  }

  // Prefer seeker_contacts.email (operator-curated), fallback to auth.users.email.
  // NOTE: auth.admin.getUserById is a data fetch on a service-role-keyed client
  // (NOT JWT validation) — the BFIX-05 audit precedent (Phase 15) explicitly
  // allows this. The gateway-trust prohibition is on auth.getUser(token).
  const { data: contactRow } = await adminClient
    .from('seeker_contacts')
    .select('email')
    .eq('seeker_id', sp.id)
    .maybeSingle()
  let toEmail: string | null = contactRow?.email ?? null
  if (!toEmail) {
    const { data: userRow } = await adminClient.auth.admin.getUserById(sp.user_id)
    toEmail = userRow?.user?.email ?? null
  }
  if (!toEmail) {
    console.error('send-document-status-email: no email found for seeker', sp.user_id)
    return jsonResponse({ error: 'Seeker email missing' }, 500)
  }

  // RESEND_API_KEY unset → skip without failing (best-effort design; admin RPC
  // already succeeded at this point, so we don't want the email layer to
  // surface as a hard error in the admin queue UI).
  if (!RESEND_API_KEY) {
    return jsonResponse(
      {
        skipped: true,
        reason: 'no_resend_key',
        action,
        document_id,
      },
      200,
    )
  }

  // Build + send template
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filename = ((docRow as any).filename as string | null) ?? 'your document'
  let tpl: { subject: string; html: string }
  if (action === 'approved') {
    tpl = approvedTemplate(filename)
  } else if (action === 'rejected') {
    tpl = rejectedTemplate(filename, rejection_reason!.trim())
  } else {
    tpl = needsResubmissionTemplate(filename)
  }

  const ok = await sendEmail(toEmail, tpl.subject, tpl.html)
  return jsonResponse(
    {
      sent: ok,
      action,
      document_id,
    },
    ok ? 200 : 500,
  )
})
