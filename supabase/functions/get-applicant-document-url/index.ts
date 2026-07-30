// ============================================================
// get-applicant-document-url — Phase 14-03 / BFIX-02 + BFIX-03
//
// Mints a 15-minute signed URL for an applicant document, gated by
// FIVE layers of authorization in this order:
//
//   1. Method check         — POST only.
//   2. Bearer-token auth    — gateway verify_jwt:true validates signature upstream;
//                              payload decoded locally (BFIX-05 gateway-trust pattern).
//   3. Role check           — user_roles.role must be 'employer' OR 'admin'.
//                              Admin: early-exit, mints signed URL for any document
//                              (powers Phase 21 /admin/documents queue).
//                              Non-employer non-admin: 403.
//   4. Relationship check   — application's job must be owned by the caller
//                              employer; document's seeker_id must match the
//                              application's seeker_id → 403 on either miss.
//   5. Identity exclusion   — document_type !== 'identity' (explicit reject)
//                              AND document_type ∈ EMPLOYER_VISIBLE_DOCUMENT_TYPES
//                              (whitelist guards future enum additions) → 403.
//
// Defence-in-depth: layer 5 is intentionally redundant. The explicit
// 'identity' equality check + the whitelist check together ensure that
// future additions to the document_type enum default to denied rather
// than accidentally exposed.
//
// Response shape on success: { url: string, expires_in: 900 }
// Response shape on error:   { error: string } with appropriate status.
//
// CORS: matches existing functions (notify-job-filled, send-followup-emails)
// with wildcard origin. Post-launch follow-up: scope to top-farms.vercel.app
// + localhost:5173 once domains are stable. Logged separately.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// Mirrors src/types/domain.ts — must stay in lockstep with the TS union and
// migration 019's CHECK constraint. If document_type enum changes, all three
// must update together.
const EMPLOYER_VISIBLE_DOCUMENT_TYPES = ['cv', 'certificate', 'reference'] as const
const SIGNED_URL_TTL_SECONDS = 900
const BUCKET_NAME = 'seeker-documents'
// Employer verification documents live in a separate private bucket (Phase 3
// Task 3.2 — the admin verification queue mints from here).
const VERIFICATION_BUCKET_NAME = 'employer-documents'

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  // 1. CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // 2. Method check — POST only
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 3. Auth — extract Bearer token, resolve caller user
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401)
    }

    // Gateway's verify_jwt: true has already validated the signature upstream
    // of this handler. Re-validating via adminClient.auth.getUser(token) fails
    // because service-role-keyed clients route the /auth/v1/user call
    // differently — see BFIX-05. Trust the gateway, decode locally.
    let callerUserId: string
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      if (payload.aud !== 'authenticated') {
        throw new Error('Token audience is not user-scoped')
      }
      callerUserId = payload.sub
      if (!callerUserId || typeof callerUserId !== 'string') {
        throw new Error('Missing or invalid sub claim')
      }
    } catch (e) {
      console.error('get-applicant-document-url: JWT decode failed', e)
      return jsonResponse({ error: 'Invalid auth token' }, 401)
    }

    // 4. Role check — caller must be 'employer' OR 'admin' (Phase 21 doc queue bypass).
    //    user_roles is the canonical role gate (mirrors 002_rls_policies.sql get_user_role usage).
    //    ADMIN BYPASS (Phase 21): admins skip employer_profiles + application ownership +
    //    identity exclusion checks and can fetch ANY seeker_documents row, including
    //    identity docs. This powers the /admin/documents queue. The bypass uses the
    //    already-fetched roleRow value — NO additional auth.getUser call (CLAUDE §5
    //    gateway-trust; BFIX-05 regression guard).
    const { data: roleRow, error: roleErr } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUserId)
      .maybeSingle()
    if (roleErr) {
      console.error('get-applicant-document-url: user_roles lookup failed', roleErr)
      return jsonResponse({ error: 'Internal error' }, 500)
    }

    // ADMIN BYPASS — early-exit branch.
    //
    // Phase 3 Task 3.2: serves BOTH admin queues, and logs the view either way.
    //   { document_id }     → seeker_documents, bucket 'seeker-documents'
    //   { verification_id } → employer_verifications, bucket 'employer-documents'
    // Every mint writes an admin_audit_log row BEFORE the URL is returned. Prior
    // to this, zero document views had ever been recorded — an admin opening an
    // applicant's passport left no trace at all. The log lives here rather than
    // in the client because this function holds the service-role key: a caller
    // cannot decline to be audited.
    if (roleRow?.role === 'admin') {
      let adminBody: { document_id?: string; verification_id?: string } = {}
      try {
        adminBody = await req.json()
      } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400)
      }
      const adminDocId = adminBody.document_id
      const adminVerificationId = adminBody.verification_id

      if (!adminDocId && !adminVerificationId) {
        return jsonResponse({ error: 'document_id or verification_id is required' }, 400)
      }

      let storagePath: string
      let bucket: string
      let auditTable: 'seeker_documents' | 'employer_verifications'
      let auditId: string

      if (adminVerificationId) {
        const { data: vRow, error: vErr } = await adminClient
          .from('employer_verifications')
          .select('id, employer_id, document_url')
          .eq('id', adminVerificationId)
          .maybeSingle()
        if (vErr) {
          console.error('get-applicant-document-url: verification lookup failed', vErr)
          return jsonResponse({ error: 'Internal error' }, 500)
        }
        if (!vRow?.document_url) {
          return jsonResponse({ error: 'Verification document not found' }, 404)
        }
        // document_url is stored as '<bucket>/<path>' by DocumentUploader; strip
        // a leading bucket segment if present so signing works either way.
        storagePath = vRow.document_url.replace(/^employer-documents\//, '')
        bucket = VERIFICATION_BUCKET_NAME
        auditTable = 'employer_verifications'
        auditId = vRow.id
      } else {
        const { data: adminDocRow, error: adminDocErr } = await adminClient
          .from('seeker_documents')
          .select('id, storage_path')
          .eq('id', adminDocId!)
          .maybeSingle()
        if (adminDocErr) {
          console.error(
            'get-applicant-document-url: admin seeker_documents lookup failed',
            adminDocErr,
          )
          return jsonResponse({ error: 'Internal error' }, 500)
        }
        if (!adminDocRow) {
          return jsonResponse({ error: 'Document not found' }, 404)
        }
        storagePath = adminDocRow.storage_path
        bucket = BUCKET_NAME
        auditTable = 'seeker_documents'
        auditId = adminDocRow.id
      }

      // Audit BEFORE minting: if the log write fails we do not hand out the URL.
      const { error: auditErr } = await adminClient.rpc('log_admin_document_view', {
        p_admin_id: callerUserId,
        p_target_table: auditTable,
        p_target_id: auditId,
        p_payload: { bucket },
      })
      if (auditErr) {
        console.error('get-applicant-document-url: audit log write failed', auditErr)
        return jsonResponse({ error: 'Internal error' }, 500)
      }

      const { data: adminUrlData, error: adminUrlErr } = await adminClient.storage
        .from(bucket)
        .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)
      if (adminUrlErr || !adminUrlData?.signedUrl) {
        console.error('get-applicant-document-url: admin signed URL mint failed', adminUrlErr)
        return jsonResponse({ error: 'Failed to generate signed URL' }, 500)
      }
      return jsonResponse({ url: adminUrlData.signedUrl, expires_in: SIGNED_URL_TTL_SECONDS }, 200)
    }

    // Non-admin: must be 'employer'
    if (roleRow?.role !== 'employer') {
      return jsonResponse({ error: 'Caller is not an employer' }, 403)
    }

    // 5. Resolve caller's employer_profiles.id (FK we need for relationship check).
    const { data: empProfile, error: empErr } = await adminClient
      .from('employer_profiles')
      .select('id')
      .eq('user_id', callerUserId)
      .maybeSingle()
    if (empErr) {
      console.error('get-applicant-document-url: employer_profiles lookup failed', empErr)
      return jsonResponse({ error: 'Internal error' }, 500)
    }
    if (!empProfile?.id) {
      // role='employer' but no profile row — data integrity issue. Treat as 403
      // rather than expose the inconsistency.
      console.warn(
        'get-applicant-document-url: caller has role=employer but no employer_profiles row',
        { callerUserId },
      )
      return jsonResponse({ error: 'Employer profile missing' }, 403)
    }
    const callerEmployerId = empProfile.id

    // 6. Body validation
    let body: { application_id?: string; document_id?: string } = {}
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }
    const applicationId = body.application_id
    const documentId = body.document_id
    if (!applicationId || !documentId) {
      return jsonResponse({ error: 'application_id and document_id are required' }, 400)
    }

    // 7. Relationship validation — application + job (split into simple queries
    //    rather than a nested join; matches 14-02 plan guidance for clarity).
    const { data: appRow, error: appErr } = await adminClient
      .from('applications')
      .select('id, seeker_id, jobs!inner ( id, employer_id )')
      .eq('id', applicationId)
      .maybeSingle()
    if (appErr) {
      console.error('get-applicant-document-url: applications lookup failed', appErr)
      return jsonResponse({ error: 'Internal error' }, 500)
    }
    if (!appRow) {
      return jsonResponse({ error: 'Application not found' }, 404)
    }
    const appJobs = appRow.jobs as unknown as { id: string; employer_id: string } | null
    if (appJobs?.employer_id !== callerEmployerId) {
      return jsonResponse({ error: 'Application does not belong to a job you own' }, 403)
    }

    // 8. Document lookup — separate query for clarity and easier debugging.
    const { data: docRow, error: docErr } = await adminClient
      .from('seeker_documents')
      .select('id, seeker_id, storage_path, document_type')
      .eq('id', documentId)
      .maybeSingle()
    if (docErr) {
      console.error('get-applicant-document-url: seeker_documents lookup failed', docErr)
      return jsonResponse({ error: 'Internal error' }, 500)
    }
    if (!docRow) {
      return jsonResponse({ error: 'Document not found' }, 404)
    }
    if (docRow.seeker_id !== appRow.seeker_id) {
      return jsonResponse({ error: 'Document does not belong to the applicant' }, 403)
    }

    // 9. Identity exclusion — explicit equality check first for clear error semantics.
    if (docRow.document_type === 'identity') {
      return jsonResponse({ error: 'Identity documents are not accessible to employers' }, 403)
    }

    // 9b. CV placement gate (Phase 2 Task 2.3, Option C) — the CV carries the seeker's
    //     phone and email, which are paywalled in seeker_contacts. Pre-placement the
    //     employer gets the structured profile, match breakdown and AI summary; the CV
    //     document unlocks when the placement fee is acknowledged for THIS application.
    //     Mirrors the RLS policy on seeker_documents (069_phase2_cv_gate) — this function
    //     uses service-role, so the policy alone is not enough.
    if (docRow.document_type === 'cv') {
      const { data: feeRow, error: feeErr } = await adminClient
        .from('placement_fees')
        .select('id')
        .eq('application_id', applicationId)
        .not('acknowledged_at', 'is', null)
        .maybeSingle()
      if (feeErr) {
        console.error('get-applicant-document-url: placement_fees lookup failed', feeErr)
        return jsonResponse({ error: 'Internal error' }, 500)
      }
      if (!feeRow) {
        return jsonResponse(
          { error: 'CV unlocks when you shortlist this candidate (placement fee applies)' },
          403,
        )
      }
    }

    // 10. Whitelist check — defence-in-depth against future enum additions.
    //     If a new document_type is added later (e.g. 'tax_form'), it defaults
    //     to denied here unless explicitly added to EMPLOYER_VISIBLE_DOCUMENT_TYPES
    //     in lockstep with the TS union and migration 019's CHECK constraint.
    if (
      !EMPLOYER_VISIBLE_DOCUMENT_TYPES.includes(
        docRow.document_type as (typeof EMPLOYER_VISIBLE_DOCUMENT_TYPES)[number],
      )
    ) {
      return jsonResponse({ error: 'Document type is not accessible to employers' }, 403)
    }

    // 11. Mint signed URL (TTL 15 minutes).
    const { data: urlData, error: urlError } = await adminClient.storage
      .from(BUCKET_NAME)
      .createSignedUrl(docRow.storage_path, SIGNED_URL_TTL_SECONDS)
    if (urlError || !urlData?.signedUrl) {
      console.error('get-applicant-document-url: signed URL mint failed', urlError)
      return jsonResponse({ error: 'Failed to generate signed URL' }, 500)
    }

    return jsonResponse({ url: urlData.signedUrl, expires_in: SIGNED_URL_TTL_SECONDS }, 200)
  } catch (error) {
    console.error('get-applicant-document-url: unexpected error', error)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})
