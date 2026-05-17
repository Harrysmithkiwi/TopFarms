---
phase: 21-v20-close-post-launch-ops
plan: 06
type: execute
wave: 4
depends_on: [00, 01]
files_modified:
  - supabase/functions/send-document-status-email/index.ts
  - supabase/config.toml
  - tests/send-document-status-email.test.ts
autonomous: true
requirements:
  - DOC-QUEUE-EMAIL-01
  - DOC-QUEUE-EMAIL-02
must_haves:
  truths:
    - "send-document-status-email Edge Function source exists on disk"
    - "Function handles 3 actions: approved, rejected, needs_resubmission with distinct email templates"
    - "BFIX-05 gateway-trust JWT pattern used (verify_jwt:true; no adminClient.auth.getUser)"
    - "X-Webhook-Secret defence-in-depth header validated (consistent with send-followup-emails per Phase 18.1 SC-3)"
    - "Function fetches seeker email via service-role .from('seeker_contacts')+ auth.users fallback"
    - "RESEND_API_KEY missing → returns 200 with skipped=true marker (best-effort, doesn't block admin action)"
    - "Three Resend email templates use existing emailWrapper from send-followup-emails for consistent branding"
  artifacts:
    - path: "supabase/functions/send-document-status-email/index.ts"
      provides: "Deno Edge Function with 3 templates + Resend send + gateway-trust JWT"
      contains: "send-document-status-email"
    - path: "supabase/config.toml"
      provides: "verify_jwt configuration for new function"
      contains: "[functions.send-document-status-email]"
    - path: "tests/send-document-status-email.test.ts"
      provides: "Static-source guard for 3 templates + gateway-trust + WEBHOOK_SECRET validation"
  key_links:
    - from: "src/pages/admin/AdminDocumentsQueue.tsx (Wave 5 plan 21-07)"
      to: "supabase.functions.invoke('send-document-status-email')"
      via: "best-effort email after RPC success"
      pattern: "send-document-status-email"
---

<objective>
Wave 4 — New Deno Edge Function `send-document-status-email` that sends a transactional email to the seeker after admin takes an action on their document. Three templates: approved / rejected (with reason) / needs_resubmission. Best-effort: invocation failure does NOT roll back the admin RPC (Wave 5 admin queue page catches and toasts but proceeds).

Purpose: Closes the user-facing notification loop. Admin approves → seeker gets "Your document has been verified" email. Admin rejects with reason → seeker gets "Action required: ..." email containing the reason text.

Output: Edge Function source on disk + config.toml entry. Static-source regression-guard test. Deploy is deferred to Wave 6 operator script (plan 21-09 — operator runs `supabase functions deploy` after batching with other deploys).

**CRITICAL constraints:**
- BFIX-05 gateway-trust JWT pattern (CLAUDE §5) — NO `adminClient.auth.getUser(token)` calls
- X-Webhook-Secret header validation (Phase 18.1 SC-3 + plan 18.1-04 — defence-in-depth)
- Reuse `emailWrapper` and `sendEmail` patterns from `send-followup-emails` (don't re-invent branding/CSS)
</objective>

<execution_context>
@/Users/harrysmith/.claude/get-shit-done/workflows/execute-plan.md
@/Users/harrysmith/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/21-v20-close-post-launch-ops/21-CONTEXT.md
@.planning/phases/21-v20-close-post-launch-ops/21-RESEARCH.md
@CLAUDE.md

<!--
LOCKED DECISION: New send-document-status-email function (NOT extension of send-followup-emails) — RESEARCH §"Standard Stack" Alternatives Considered: tightly-coupled placement_fees query in send-followup-emails makes parameterisation costly
RESEARCH §Pattern 4: 3 templates (approved / rejected / needs_resubmission); verify_jwt:true; gateway-trust pattern; WEBHOOK_SECRET defence-in-depth (matches Phase 18.1 SC-3)
RESEARCH §Open Q3 resolved: invocation = supabase.functions.invoke from client (after RPC success); NOT pg_net from inside the RPC (best-effort; admin action shouldn't roll back on email failure)
-->

<interfaces>
From supabase/functions/send-followup-emails/index.ts (canonical pattern):
- WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? '' (Phase 18.1 SC-3)
- sendEmail(to, subject, html) async helper — fetches api.resend.com/emails; returns boolean
- emailWrapper(content: string): string — TopFarms-branded HTML wrapper (lines 44-74)
- ctaButton(href, label): string — branded button helper
- Header validation block at top of Deno.serve (Phase 18.1 plan 18.1-04 — request.headers.get('X-Webhook-Secret') !== WEBHOOK_SECRET → 403)
- Service-role createClient at top
- RESEND_API_KEY env var check; return early when unset

From supabase/functions/get-applicant-document-url/index.ts (BFIX-05 JWT decode template):
- payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
- Validate payload.aud === 'authenticated'
- callerUserId = payload.sub

From migration 023:
- _admin_gate() exists; can be invoked indirectly via SECURITY DEFINER RPC, but Edge fns can't call it directly — admin check must rely on user_roles lookup

DB shape (from existing migrations):
- public.seeker_documents.id, seeker_id, document_type, filename, rejection_reason
- public.seeker_profiles.id, user_id
- public.seeker_contacts.seeker_id, email, first_name, last_name (per admin_get_user_profile)
- auth.users (service role can read via createClient with SUPABASE_SERVICE_ROLE_KEY)

Request body shape (locked by Wave 5 invocation):
- { document_id: uuid, action: 'approved' | 'rejected' | 'needs_resubmission', rejection_reason?: string }
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Write send-document-status-email Edge Function + register in config.toml</name>
  <files>supabase/functions/send-document-status-email/index.ts, supabase/config.toml</files>

  <read_first>
    - supabase/functions/send-followup-emails/index.ts (full file — emailWrapper at 44-74; ctaButton at 76-78; sendEmail at 19-38; WEBHOOK_SECRET validation pattern from Phase 18.1 plan 18.1-04 commit 35e1cef)
    - supabase/functions/get-applicant-document-url/index.ts lines 70-95 (BFIX-05 gateway-trust JWT decode pattern)
    - supabase/config.toml (existing function entries — locate verify_jwt = true entries to mirror)
    - .planning/phases/21-v20-close-post-launch-ops/21-RESEARCH.md §Pattern 4 (full template guidance)
    - CLAUDE.md §5 (gateway-trust pattern)
  </read_first>

  <behavior>
    - Function deployed at supabase/functions/send-document-status-email/index.ts
    - verify_jwt: true (set in config.toml so the gateway validates upstream)
    - Request body schema: { document_id: string, action: 'approved'|'rejected'|'needs_resubmission', rejection_reason?: string }
    - Header X-Webhook-Secret validated against Deno.env.get('WEBHOOK_SECRET') — 403 on mismatch
    - JWT decoded locally via atob (gateway-trust); validate payload.aud === 'authenticated'
    - User role lookup confirms caller is admin (any non-admin caller → 403)
    - Service-role client fetches: seeker email via seeker_documents → seeker_profiles → auth.users.email OR seeker_contacts.email
    - 3 templates rendered with emailWrapper:
      * approved: subject "Your document has been verified — TopFarms"
      * rejected: subject "Action required — your document was not accepted"; body includes rejection_reason
      * needs_resubmission: subject "Please re-upload your document — TopFarms"
    - Each template includes a CTA button to https://topfarms.co.nz/dashboard/seeker/documents
    - Returns 200 { sent: boolean, action, document_id } on Resend success
    - Returns 200 { skipped: true, reason: 'no_resend_key' } when RESEND_API_KEY unset (per RESEARCH best-effort design — admin action shouldn't fail because of email config)
    - Returns 400 on invalid body shape; 403 on auth/role gate failures; 500 on Resend API or DB errors
  </behavior>

  <action>
**File 1 — supabase/functions/send-document-status-email/index.ts** (new):

```typescript
// ============================================================
// send-document-status-email — Phase 21 Track B
//
// Sends a transactional email to the seeker after admin takes an action on
// their uploaded document (approve / reject / request-more-info).
//
// Triggered from the /admin/documents queue page after a successful RPC call
// (admin_approve_document, admin_reject_document, admin_request_more_info).
// Best-effort: invocation failure does NOT roll back the admin RPC (admin
// queue page catches the error and toasts but proceeds).
//
// Auth gates (defence-in-depth):
//   1. verify_jwt: true (gateway upstream) — see supabase/config.toml entry
//   2. X-Webhook-Secret header (Phase 18.1 SC-3 — matches send-followup-emails
//      + notify-job-filled defence; same Vault-backed secret)
//   3. BFIX-05 gateway-trust JWT decode (CLAUDE §5) — atob decode, validate
//      payload.aud === 'authenticated'. Do NOT call adminClient.auth.getUser.
//   4. user_roles.role === 'admin' check (only admin invokes this fn)
//
// RESEND_API_KEY unset → returns 200 { skipped: true } so the admin action
// path succeeds even if email infrastructure is unconfigured.
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

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TopFarms</title>
</head>
<body style="margin:0;padding:0;background-color:#F7F2E8;font-family:Inter,-apple-system,Helvetica Neue,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F2E8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#FFFFFF;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 24px;font-size:16px;font-weight:600;color:#16A34A;letter-spacing:-0.01em;">TopFarms</p>
              ${content}
              <hr style="border:none;border-top:1px solid #EEE8DC;margin:32px 0 20px;">
              <p style="margin:0;font-size:12px;color:#9E8E78;line-height:1.5;">
                You received this email because you uploaded a document on TopFarms.
                Questions? Reply to this email or visit <a href="${APP_URL}" style="color:#16A34A;">topfarms.co.nz</a>.
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
  return `<a href="${href}" style="display:inline-block;background:#16A34A;color:#ffffff;border-radius:8px;padding:16px 24px;text-decoration:none;font-weight:600;font-size:14px;line-height:1;">${label}</a>`
}

function approvedTemplate(filename: string): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#1B3A0F;">Your document has been verified</p>
    <p style="margin:0 0 16px;font-size:14px;color:#4A4035;line-height:1.6;">
      Good news — our team has reviewed and approved <strong>${filename}</strong>.
      Your profile now shows a "Documents Verified" badge to employers viewing your applications.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#4A4035;line-height:1.6;">
      You can view your documents anytime from your dashboard.
    </p>
    ${ctaButton(`${APP_URL}/dashboard/seeker/documents`, 'View my documents')}
  `
  return {
    subject: 'Your document has been verified — TopFarms',
    html: emailWrapper(body),
  }
}

function rejectedTemplate(filename: string, reason: string): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#1B3A0F;">Action required — your document was not accepted</p>
    <p style="margin:0 0 16px;font-size:14px;color:#4A4035;line-height:1.6;">
      Our team has reviewed <strong>${filename}</strong> but couldn't accept it.
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#4A4035;line-height:1.6;">
      <strong>Reason:</strong> ${reason}
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#4A4035;line-height:1.6;">
      Please upload a replacement when you're ready.
    </p>
    ${ctaButton(`${APP_URL}/dashboard/seeker/documents`, 'Upload a replacement')}
  `
  return {
    subject: 'Action required — your document was not accepted',
    html: emailWrapper(body),
  }
}

function needsResubmissionTemplate(filename: string): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#1B3A0F;">Please re-upload your document</p>
    <p style="margin:0 0 16px;font-size:14px;color:#4A4035;line-height:1.6;">
      Our team has reviewed <strong>${filename}</strong> and would like you to upload a fresh copy.
      This is sometimes needed when the file is unclear, the wrong page is captured,
      or details have changed since your original upload.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#4A4035;line-height:1.6;">
      Re-upload from your dashboard at any time.
    </p>
    ${ctaButton(`${APP_URL}/dashboard/seeker/documents`, 'Upload again')}
  `
  return {
    subject: 'Please re-upload your document — TopFarms',
    html: emailWrapper(body),
  }
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  // Gate 1: X-Webhook-Secret defence-in-depth (Phase 18.1 SC-3 pattern)
  const headerSecret = req.headers.get('X-Webhook-Secret') ?? ''
  if (!WEBHOOK_SECRET || headerSecret !== WEBHOOK_SECRET) {
    return jsonResponse({ error: 'Webhook secret missing or invalid' }, 403)
  }

  // Gate 2: BFIX-05 gateway-trust JWT decode (CLAUDE §5; NO auth.getUser)
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

  // Body validation
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

  // Gate 3: admin role check
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

  // Fetch document + seeker email
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
  const sp = (docRow as any).seeker_profiles as { id: string; user_id: string } | null
  if (!sp?.user_id) {
    console.error('send-document-status-email: seeker_profiles missing for doc', document_id)
    return jsonResponse({ error: 'Seeker profile missing' }, 500)
  }

  // Prefer seeker_contacts.email, fallback to auth.users.email
  const { data: contactRow } = await adminClient
    .from('seeker_contacts')
    .select('email')
    .eq('seeker_id', sp.id)
    .maybeSingle()
  let toEmail = contactRow?.email ?? null
  if (!toEmail) {
    const { data: userRow } = await adminClient.auth.admin.getUserById(sp.user_id)
    toEmail = userRow?.user?.email ?? null
  }
  if (!toEmail) {
    console.error('send-document-status-email: no email found for seeker', sp.user_id)
    return jsonResponse({ error: 'Seeker email missing' }, 500)
  }

  // RESEND_API_KEY unset → skip without failing (best-effort)
  if (!RESEND_API_KEY) {
    return jsonResponse({
      skipped: true,
      reason: 'no_resend_key',
      action,
      document_id,
    }, 200)
  }

  // Build + send template
  let tpl: { subject: string; html: string }
  if (action === 'approved') {
    tpl = approvedTemplate((docRow as any).filename ?? 'your document')
  } else if (action === 'rejected') {
    tpl = rejectedTemplate((docRow as any).filename ?? 'your document', rejection_reason!.trim())
  } else {
    tpl = needsResubmissionTemplate((docRow as any).filename ?? 'your document')
  }

  const ok = await sendEmail(toEmail, tpl.subject, tpl.html)
  return jsonResponse({
    sent: ok,
    action,
    document_id,
  }, ok ? 200 : 500)
})
```

**File 2 — supabase/config.toml**:

Find the existing function entries (likely sections like `[functions.get-resend-stats]`, `[functions.send-followup-emails]`). Append a new entry following the same pattern. Critical: set `verify_jwt = true` (admin caller has a valid JWT).

```toml
[functions.send-document-status-email]
verify_jwt = true
```

If `[functions.send-followup-emails]` exists in config.toml and has `verify_jwt = false`, do NOT mirror that — `send-followup-emails` uses verify_jwt=false because it's invoked by pg_net cron with a service-role JWT that the gateway rejects (Phase 18.1 SC-3 documents this). `send-document-status-email` is invoked from the admin browser session, which has a valid user JWT — so verify_jwt = true is correct.

Verify config.toml change does not break syntax: `grep -c "^\[functions\." supabase/config.toml` should increase by 1.
  </action>

  <verify>
    <automated>ls supabase/functions/send-document-status-email/index.ts && grep -c "send-document-status-email" supabase/config.toml</automated>
  </verify>

  <acceptance_criteria>
    - `ls supabase/functions/send-document-status-email/index.ts` exits 0
    - `grep -c "approvedTemplate\|rejectedTemplate\|needsResubmissionTemplate" supabase/functions/send-document-status-email/index.ts` returns ≥ 6 (3 defs + 3 calls)
    - `grep -c "payload.aud !== 'authenticated'" supabase/functions/send-document-status-email/index.ts` returns 1 (gateway-trust)
    - `grep -c "adminClient.auth.getUser\b\|adminClient.auth.getUser(" supabase/functions/send-document-status-email/index.ts` returns 0 (BFIX-05 enforced — note: getUserById is allowed; it's a data fetch not a JWT validation per BFIX-05 audit precedent in Phase 15)
    - `grep -c "X-Webhook-Secret" supabase/functions/send-document-status-email/index.ts` returns ≥ 1
    - `grep -c "RESEND_API_KEY" supabase/functions/send-document-status-email/index.ts` returns ≥ 2 (env + skip path)
    - `grep -c "roleRow?.role !== 'admin'" supabase/functions/send-document-status-email/index.ts` returns 1 (admin gate)
    - `grep -c "skipped: true" supabase/functions/send-document-status-email/index.ts` returns 1 (best-effort no-key path)
    - `grep -c "\\[functions.send-document-status-email\\]" supabase/config.toml` returns 1
    - `grep -A1 "\\[functions.send-document-status-email\\]" supabase/config.toml | grep "verify_jwt = true"` exit 0
    - File does NOT contain pg_net.http_post (per RESEARCH Open Q3 — invocation is from client via supabase.functions.invoke)
  </acceptance_criteria>

  <done>
    Function source + config.toml entry on disk. Deploy is deferred to Wave 6 operator plan 21-09.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Static-source regression-guard test for the email function</name>
  <files>tests/send-document-status-email.test.ts</files>

  <read_first>
    - tests/employer-visible-document-types-drift.test.ts (canonical static-source readFileSync pattern)
    - tests/webhook-secret-presence.test.ts (Phase 18.1 SC-3 — multi-fn WEBHOOK_SECRET grep test)
    - supabase/functions/send-document-status-email/index.ts (Task 1)
  </read_first>

  <action>
**File — tests/send-document-status-email.test.ts** (new, ~50 lines):

```typescript
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Static-source guard for send-document-status-email Edge Function (Phase 21 Track B).
// Verifies the function preserves CLAUDE §5 gateway-trust + Phase 18.1 SC-3 WEBHOOK_SECRET
// + RESEARCH §Pattern 4 (3 templates) across deploys and refactors.
// Pure-Node; runtime <10ms; no Deno required.

const FN_PATH = resolve(__dirname, '../supabase/functions/send-document-status-email/index.ts')
const CONFIG_PATH = resolve(__dirname, '../supabase/config.toml')

describe('send-document-status-email Edge Function (Phase 21 DOC-QUEUE-EMAIL-01/02)', () => {
  const source = readFileSync(FN_PATH, 'utf-8')
  const config = readFileSync(CONFIG_PATH, 'utf-8')

  it('DOC-QUEUE-EMAIL-01: 3 templates defined (approved / rejected / needs_resubmission)', () => {
    expect(source).toMatch(/function approvedTemplate/)
    expect(source).toMatch(/function rejectedTemplate/)
    expect(source).toMatch(/function needsResubmissionTemplate/)
  })

  it('DOC-QUEUE-EMAIL-01: action branch routes each action to its template', () => {
    expect(source).toMatch(/'approved'.*approvedTemplate|approvedTemplate.*'approved'/s)
    expect(source).toMatch(/rejectedTemplate/)
    expect(source).toMatch(/needsResubmissionTemplate/)
  })

  it('CLAUDE §5 gateway-trust preserved: payload.aud === "authenticated" decode', () => {
    expect(source).toMatch(/payload\.aud !== 'authenticated'/)
  })

  it('CLAUDE §5 gateway-trust preserved: no adminClient.auth.getUser(token) call', () => {
    // Allow auth.admin.getUserById (data fetch, not JWT validation — BFIX-05 audit precedent)
    expect(source).not.toMatch(/adminClient\.auth\.getUser\(/)
  })

  it('Phase 18.1 SC-3: X-Webhook-Secret header validated', () => {
    expect(source).toMatch(/X-Webhook-Secret/)
    expect(source).toMatch(/WEBHOOK_SECRET/)
  })

  it('Admin-only gate: caller must have user_roles.role === "admin"', () => {
    expect(source).toMatch(/roleRow\?\.role !== 'admin'/)
  })

  it('Best-effort: RESEND_API_KEY missing returns skipped:true (no admin action rollback)', () => {
    expect(source).toMatch(/skipped: true/)
    expect(source).toMatch(/'no_resend_key'/)
  })

  it('Rejection: empty rejection_reason returns 400', () => {
    expect(source).toMatch(/rejection_reason is required when action=rejected/)
  })

  it('config.toml: verify_jwt = true on send-document-status-email', () => {
    expect(config).toMatch(/\[functions\.send-document-status-email\][\s\S]{0,200}verify_jwt\s*=\s*true/)
  })

  it('No pg_net.http_post — invocation is from client (RESEARCH Open Q3 — best-effort)', () => {
    expect(source).not.toMatch(/pg_net\.http_post/)
    expect(source).not.toMatch(/net\.http_post/)
  })
})
```
  </action>

  <verify>
    <automated>pnpm exec vitest run tests/send-document-status-email.test.ts --reporter=verbose</automated>
  </verify>

  <acceptance_criteria>
    - `ls tests/send-document-status-email.test.ts` exits 0
    - `pnpm exec vitest run tests/send-document-status-email.test.ts` exits 0
    - Test summary shows 10 passing assertions
    - Runtime <50ms (pure-Node)
    - Full suite green: `pnpm exec vitest run` exits 0
  </acceptance_criteria>

  <done>
    Static-source guard GREEN. Atomic commit with Task 1.
  </done>
</task>

</tasks>

<verification>
1. Function source + config.toml entry on disk
2. Static-source test 10/10 GREEN
3. BFIX-05 gateway-trust + WEBHOOK_SECRET + admin gate all enforced
4. RESEND_API_KEY missing path returns 200 skipped (verified)
5. Deploy NOT yet done — bundled into Wave 6 operator script
</verification>

<success_criteria>
- send-document-status-email function on disk with 3 templates
- config.toml registers function with verify_jwt = true
- Static-source regression test GREEN
- Atomic commit: `feat(21-06): send-document-status-email Edge Function + WEBHOOK_SECRET + templates`
</success_criteria>

<output>
After completion, create `.planning/phases/21-v20-close-post-launch-ops/21-06-SUMMARY.md` capturing:
- Function source + line count
- config.toml entry confirmation
- 10-assertion test GREEN summary
- Note that deploy is deferred to Wave 6 plan 21-09 operator script (so it can batch with the get-applicant-document-url admin bypass redeploy + WEBHOOK_SECRET availability check)
- Reuse confirmation: emailWrapper + ctaButton + sendEmail patterns mirror send-followup-emails for brand consistency
</output>
