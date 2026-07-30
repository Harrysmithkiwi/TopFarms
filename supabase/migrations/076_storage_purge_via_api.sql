-- ============================================================
-- 076_storage_purge_via_api.sql
-- TopFarms — Phase 3 Task 3.5 correction
--
-- 075 tried to delete storage objects from SQL. It cannot be done:
--
--   POST /rest/v1/rpc/admin_delete_account  (admin JWT)
--   -> 42501 "Direct deletion from storage tables is not allowed.
--             Use the Storage API instead."
--
-- Supabase enforces this with a platform trigger — verified live 2026-07-30:
--   CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects
--     FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete()
--
-- SECURITY DEFINER does not help; the trigger fires regardless of role. So
-- 075's account-deletion sweep and its identity-document purge trigger were
-- both INERT — they would have silently left every file in place while
-- reporting success. Found by running the probe, not by review. This is the
-- second time this phase that executing the thing beat reading it.
--
-- THE SPLIT THAT ACTUALLY WORKS. Storage deletion must go through the Storage
-- API, which means an Edge Function holding the service-role key. So:
--   Edge Function `admin-purge`  — deletes the FILES (Storage API)
--   these RPCs                   — do the DATABASE work
-- and the RPC REFUSES while any object survives. That ordering guard is the
-- point: it converts "the function is supposed to purge storage first" from a
-- convention into something the database enforces. SELECT on storage.objects
-- is permitted, so the RPC can check.
-- ============================================================

BEGIN;

-- ─── 1. Remove the inert trigger from 075 ───────────────────────────────────

DROP TRIGGER IF EXISTS seeker_documents_purge_identity ON public.seeker_documents;
DROP FUNCTION IF EXISTS public.purge_identity_document_object();

-- ─── 2. Mark a document's file as purged (called after the API delete) ──────

CREATE OR REPLACE FUNCTION public.admin_mark_document_purged(p_document_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.seeker_documents;
  v_remaining int;
BEGIN
  PERFORM public._admin_gate();

  SELECT * INTO v_row FROM public.seeker_documents WHERE id = p_document_id;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Document not found: %', p_document_id USING ERRCODE = 'P0002';
  END IF;

  -- Refuse to claim a purge that did not happen.
  SELECT count(*) INTO v_remaining
  FROM storage.objects
  WHERE bucket_id = 'seeker-documents' AND name = v_row.storage_path;

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Storage object still present for document % — purge the file via the Storage API first', p_document_id
      USING ERRCODE = '55000';
  END IF;

  UPDATE public.seeker_documents
  SET storage_purged_at = now()
  WHERE id = p_document_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (auth.uid(), 'document.purge', 'seeker_documents', p_document_id,
          jsonb_build_object('document_type', v_row.document_type, 'storage_path', v_row.storage_path));

  RETURN jsonb_build_object('document_id', p_document_id, 'purged', true);
END;
$$;

COMMENT ON FUNCTION public.admin_mark_document_purged(uuid) IS
  'Records that a document file has been deleted (Phase 3 Task 3.5). Refuses while the storage object still exists, so storage_purged_at cannot become a lie. The file deletion itself happens in the admin-purge Edge Function — SQL cannot delete storage objects (storage.protect_delete).';

-- ─── 3. Account deletion: database work only, ordered behind the file purge ─

CREATE OR REPLACE FUNCTION public.admin_delete_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_objects int := 0;
  v_threads int := 0;
  v_email   text;
  v_role    text;
BEGIN
  PERFORM public._admin_gate();

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Refusing to delete the calling admin''s own account'
      USING ERRCODE = '22023';
  END IF;

  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = p_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'No such user: %', p_user_id USING ERRCODE = 'P0002';
  END IF;
  SELECT ur.role INTO v_role FROM public.user_roles ur WHERE ur.user_id = p_user_id;

  -- THE GUARD. Rows cascade from auth.users; storage objects do not, and SQL
  -- cannot delete them. If we proceeded here we would destroy the only record
  -- of who owned those files while the files themselves survived — strictly
  -- worse than not deleting at all. Refuse, and make the caller purge first.
  SELECT count(*) INTO v_objects
  FROM storage.objects
  WHERE bucket_id IN ('seeker-documents', 'employer-documents', 'employer-photos')
    AND (storage.foldername(name))[1] = p_user_id::text;

  IF v_objects > 0 THEN
    RAISE EXCEPTION
      'Refusing to delete account %: % storage object(s) remain. Purge them via the admin-purge Edge Function first (SQL cannot delete storage objects).',
      p_user_id, v_objects
      USING ERRCODE = '55000';
  END IF;

  -- Audit BEFORE the delete: admin_audit_log.admin_id is ON DELETE SET NULL and
  -- the target is about to vanish, so capture who/what/when while both exist.
  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (auth.uid(), 'account.delete', 'auth.users', p_user_id,
          jsonb_build_object('email', v_email, 'role', v_role));

  DELETE FROM auth.users WHERE id = p_user_id;

  -- message_threads FKs are ON DELETE SET NULL, so deleting both participants
  -- leaves a row of nulls rather than removing it (found by the Phase 1
  -- cleanup, swept by hand at the time).
  WITH swept AS (
    DELETE FROM public.message_threads
    WHERE employer_id IS NULL AND seeker_id IS NULL
    RETURNING 1
  )
  SELECT count(*) INTO v_threads FROM swept;

  RETURN jsonb_build_object(
    'deleted_user', p_user_id,
    'email', v_email,
    'orphan_threads_swept', v_threads
  );
END;
$$;

COMMENT ON FUNCTION public.admin_delete_account(uuid) IS
  'Deletes an account: the cascade plus the SET NULL orphans it leaves behind (Phase 3 Task 3.5). REFUSES while any storage object remains under the user prefix — files must be purged through the admin-purge Edge Function first, because storage.protect_delete blocks SQL deletion. Admin-executed by design: Privacy.tsx routes deletion REQUESTS to email, so the promise is "ask us and we will", not a self-serve button.';

REVOKE ALL ON FUNCTION public.admin_delete_account(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_mark_document_purged(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_account(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mark_document_purged(uuid) TO authenticated;

COMMIT;
