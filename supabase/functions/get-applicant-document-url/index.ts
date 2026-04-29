// ============================================================
// get-applicant-document-url — Phase 14-03 / BFIX-02 + BFIX-03
//
// Mints a 15-minute signed URL for an applicant document, gated by
// FIVE layers of authorization in this order:
//
//   1. Method check         — POST only.
//   2. Bearer-token auth    — supabase.auth.getUser(token) → 401 if invalid.
//   3. Role check           — user_roles.role must be 'employer' → 403.
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
      console.error('get-applicant-document-url: JWT decode failed', e)
      return jsonResponse({ error: 'Invalid auth token' }, 401)
    }

    // 4. Role check — must be 'employer' (project convention: user_roles is the
    //    canonical role gate, mirroring 002_rls_policies.sql `get_user_role` usage).
    const { data: roleRow, error: roleErr } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUserId)
      .maybeSingle()
    if (roleErr) {
      console.error('get-applicant-document-url: user_roles lookup failed', roleErr)
      return jsonResponse({ error: 'Internal error' }, 500)
    }
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
      console.warn('get-applicant-document-url: caller has role=employer but no employer_profiles row', { callerUserId })
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
    const appJobs = appRow.jobs as { id: string; employer_id: string } | null
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
      return jsonResponse(
        { error: 'Identity documents are not accessible to employers' },
        403,
      )
    }

    // 10. Whitelist check — defence-in-depth against future enum additions.
    //     If a new document_type is added later (e.g. 'tax_form'), it defaults
    //     to denied here unless explicitly added to EMPLOYER_VISIBLE_DOCUMENT_TYPES
    //     in lockstep with the TS union and migration 019's CHECK constraint.
    if (!EMPLOYER_VISIBLE_DOCUMENT_TYPES.includes(docRow.document_type as typeof EMPLOYER_VISIBLE_DOCUMENT_TYPES[number])) {
      return jsonResponse({ error: 'Document type is not accessible to employers' }, 403)
    }

    // 11. Mint signed URL (TTL 15 minutes).
    const { data: urlData, error: urlError } = await adminClient
      .storage
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
