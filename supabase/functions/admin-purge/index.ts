// ============================================================
// admin-purge — Phase 3 Task 3.5
//
// WHY THIS FUNCTION EXISTS
// Storage objects cannot be deleted from SQL. Supabase enforces it with a
// platform trigger (verified live 2026-07-30):
//
//   CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects
//     FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete()
//
//   -> 42501 "Direct deletion from storage tables is not allowed.
//             Use the Storage API instead."
//
// SECURITY DEFINER does not bypass it. Migration 075 tried, and its account
// sweep plus identity-purge trigger were both INERT — they would have reported
// success while leaving every passport scan in place. So file deletion lives
// here, where the service-role key can drive the Storage API, and the database
// work stays in RPCs that REFUSE while any object survives (migration 076).
// That ordering guard is what stops this function being merely a convention.
//
// Two actions:
//   { action: 'delete_account',  user_id }     purge every object under the
//                                              user's prefix in all three
//                                              buckets, then delete the account
//   { action: 'purge_document',  document_id } purge one document's file (used
//                                              for identity docs once a
//                                              verification decision exists)
//
// Deployed verify_jwt = true: called from the admin browser, so the gateway has
// already validated the JWT (CLAUDE.md §5 — decode locally, do not re-validate).
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireCaller, requireRole, toAuthErrorResponse } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Every uploader writes under a '<auth user id>/...' prefix
// (DocumentUpload.tsx:123, SeekerStep3Qualifications.tsx:180), which is what
// makes a per-user sweep possible at all.
const USER_SCOPED_BUCKETS = ['seeker-documents', 'employer-documents', 'employer-photos'] as const

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  let callerUserId: string
  try {
    callerUserId = requireCaller(req)
    await requireRole(admin, callerUserId, ['admin'])
  } catch (e) {
    return toAuthErrorResponse(e, corsHeaders)
  }

  let body: { action?: string; user_id?: string; document_id?: string } = {}
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  try {
    // ── Purge one document's file ───────────────────────────────────────────
    if (body.action === 'purge_document') {
      if (!body.document_id) return json({ error: 'document_id is required' }, 400)

      const { data: doc, error: docErr } = await admin
        .from('seeker_documents')
        .select('id, storage_path, document_type, status, storage_purged_at')
        .eq('id', body.document_id)
        .maybeSingle()
      if (docErr) {
        console.error('admin-purge: document lookup failed', docErr)
        return json({ error: 'Internal error' }, 500)
      }
      if (!doc) return json({ error: 'Document not found' }, 404)
      if (doc.storage_purged_at) return json({ already_purged: true }, 200)

      // A file is only redundant once a decision has been recorded against it.
      if (!['approved', 'rejected'].includes(doc.status)) {
        return json({ error: 'Document has no recorded decision yet' }, 409)
      }

      const { error: rmErr } = await admin.storage
        .from('seeker-documents')
        .remove([doc.storage_path])
      if (rmErr) {
        console.error('admin-purge: storage remove failed', rmErr)
        return json({ error: 'Failed to delete the stored file' }, 500)
      }

      // Records the purge — and refuses if the object somehow survived.
      const { error: markErr } = await admin.rpc('admin_mark_document_purged', {
        p_document_id: doc.id,
      })
      if (markErr) {
        console.error('admin-purge: mark purged failed', markErr)
        return json({ error: markErr.message }, 500)
      }

      return json({ document_id: doc.id, purged: true }, 200)
    }

    // ── Delete an account, files first ──────────────────────────────────────
    if (body.action === 'delete_account') {
      if (!body.user_id) return json({ error: 'user_id is required' }, 400)
      if (body.user_id === callerUserId) {
        return json({ error: 'Refusing to delete your own account' }, 400)
      }

      // SELECT on storage.objects is permitted (only DELETE is blocked), but the
      // `storage` schema is NOT exposed to PostgREST — querying it over REST
      // returns "Failed to list stored files". So the listing goes through a
      // SECURITY DEFINER RPC and only the removal goes through the Storage API.
      const { data: objects, error: objErr } = await admin.rpc(
        'admin_list_user_storage_objects',
        { p_user_id: body.user_id },
      )
      if (objErr) {
        console.error('admin-purge: object listing failed', objErr)
        return json({ error: 'Failed to list stored files' }, 500)
      }
      const objectRows = (objects ?? []) as Array<{ bucket_id: string; name: string }>

      let removed = 0
      for (const bucket of USER_SCOPED_BUCKETS) {
        const names = objectRows.filter((o) => o.bucket_id === bucket).map((o) => o.name)
        if (names.length === 0) continue
        const { error: rmErr } = await admin.storage.from(bucket).remove(names)
        if (rmErr) {
          console.error('admin-purge: bucket purge failed', { bucket, rmErr })
          return json({ error: `Failed to purge ${bucket}` }, 500)
        }
        removed += names.length
      }

      // The RPC re-checks and refuses if anything survived, so a partial purge
      // cannot destroy the only record of who owned the remaining files.
      const { data: result, error: delErr } = await admin.rpc('admin_delete_account', {
        p_user_id: body.user_id,
      })
      if (delErr) {
        console.error('admin-purge: account delete failed', delErr)
        return json({ error: delErr.message }, 500)
      }

      return json({ ...(result as Record<string, unknown>), storage_objects_deleted: removed }, 200)
    }

    return json({ error: "action must be 'delete_account' or 'purge_document'" }, 400)
  } catch (e) {
    console.error('admin-purge: unexpected error', e)
    return json({ error: 'Internal server error' }, 500)
  }
})
