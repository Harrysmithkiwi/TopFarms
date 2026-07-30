-- ============================================================
-- 075_privacy_retention.sql
-- TopFarms — Phase 3 Task 3.5: privacy retention
--
-- Three gaps, all of the same shape: data the product promised to get rid of,
-- and no mechanism that gets rid of it.
--
-- 1. lead-staging-purge (cron jobid 5) deletes rejected rows and pending rows
--    older than 30 days, but EXEMPTS review_status='approved' and anything
--    whose outreach_status is drafted/approved/sent — forever. Live command
--    verified 2026-07-30. Four rows are already past any reasonable retention.
--
-- 2. An identity document (a passport scan) is needed to MAKE a verification
--    decision and not afterwards. Today it is kept indefinitely. This is the
--    single highest-consequence data the platform holds.
--
-- 3. Privacy.tsx:78-79 promises deletion on request and :95 routes the request
--    to email — but NO account-deletion path exists anywhere: no UI, no Edge
--    Function, no admin RPC. Admin has suspension only (user_roles.is_active).
--    Rows cascade from auth.users; storage objects and SET NULL orphans do NOT.
--    Both proved, not theorised: Phase 1 left an orphan message_threads row,
--    and Phase 2's cleanup had to delete storage objects by hand because
--    deleting the owning user did not.
--
-- RETENTION RULE, stated so it can be argued with:
--    rejected leads        deleted immediately (no reason to hold a no)
--    contacted leads       12 months  (UEMA evidence of what we sent to whom)
--    everything else       90 days    (pending, approved, drafted outreach)
--
-- Apply via claude.ai Supabase connector. Verify via cron.job + pg_proc.
-- ============================================================

BEGIN;

-- ─── 1. Bookkeeping: record when a stored file was purged ───────────────────
-- Keeping the seeker_documents ROW (with its decision and audit trail) while
-- deleting the FILE is the point: we must still be able to say "this was
-- reviewed and approved on date X" without holding the passport itself.

ALTER TABLE public.seeker_documents
  ADD COLUMN storage_purged_at timestamptz;

COMMENT ON COLUMN public.seeker_documents.storage_purged_at IS
  'Set when the underlying storage object was deleted after a verification decision (Phase 3 Task 3.5). The row survives as the record of the decision; the file does not.';

-- ─── 2. Purge an identity document once its decision is recorded ────────────

CREATE OR REPLACE FUNCTION public.purge_identity_document_object()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only identity documents, only once a decision exists, only once.
  IF NEW.document_type = 'identity'
     AND NEW.status IN ('approved', 'rejected')
     AND NEW.storage_purged_at IS NULL
     AND NEW.storage_path IS NOT NULL
  THEN
    DELETE FROM storage.objects
    WHERE bucket_id = 'seeker-documents' AND name = NEW.storage_path;

    NEW.storage_purged_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seeker_documents_purge_identity ON public.seeker_documents;
CREATE TRIGGER seeker_documents_purge_identity
  BEFORE UPDATE ON public.seeker_documents
  FOR EACH ROW EXECUTE FUNCTION public.purge_identity_document_object();

COMMENT ON FUNCTION public.purge_identity_document_object() IS
  'Deletes the stored file for an identity document as soon as an admin records a decision (Phase 3 Task 3.5). BEFORE UPDATE so storage_purged_at lands on the same row write. KNOWN LIMIT: deleting the storage.objects row revokes all access immediately, which is the security property we need; reclaiming the physical S3 blob is left to Supabase''s storage reaper.';

-- ─── 3. Account deletion that actually deletes ──────────────────────────────

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

  -- (a) Storage objects. Rows cascade from auth.users; objects do not, so a
  --     hand-run deletion leaves passport scans and CVs in the buckets. Every
  --     uploader writes under a '<auth user id>/...' prefix (DocumentUpload.tsx
  --     :123, SeekerStep3Qualifications.tsx:180), which is what makes this
  --     sweep possible.
  WITH deleted AS (
    DELETE FROM storage.objects
    WHERE bucket_id IN ('seeker-documents', 'employer-documents', 'employer-photos')
      AND (storage.foldername(name))[1] = p_user_id::text
    RETURNING 1
  )
  SELECT count(*) INTO v_objects FROM deleted;

  -- (b) The audit row is written BEFORE the delete, because admin_audit_log
  --     .admin_id is ON DELETE SET NULL and the target is about to vanish —
  --     capture who/what/when while both still exist.
  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (auth.uid(), 'account.delete', 'auth.users', p_user_id,
          jsonb_build_object('email', v_email, 'role', v_role, 'storage_objects_deleted', v_objects));

  -- (c) The cascade. Everything FK'd to auth.users with ON DELETE CASCADE goes.
  DELETE FROM auth.users WHERE id = p_user_id;

  -- (d) SET NULL orphans. message_threads FKs are ON DELETE SET NULL, so
  --     deleting both participants leaves a row with null columns rather than
  --     removing it (found by the Phase 1 cleanup, swept by hand at the time).
  WITH swept AS (
    DELETE FROM public.message_threads
    WHERE employer_id IS NULL AND seeker_id IS NULL
    RETURNING 1
  )
  SELECT count(*) INTO v_threads FROM swept;

  RETURN jsonb_build_object(
    'deleted_user', p_user_id,
    'email', v_email,
    'storage_objects_deleted', v_objects,
    'orphan_threads_swept', v_threads
  );
END;
$$;

COMMENT ON FUNCTION public.admin_delete_account(uuid) IS
  'Deletes an account completely: storage objects, the cascade, and the SET NULL orphans the cascade leaves behind (Phase 3 Task 3.5). Admin-executed by design — Privacy.tsx routes deletion REQUESTS to email, so the promise is "ask us and we will", not a self-serve button. No self-serve UI exists deliberately: an irreversible destructive path is not worth adding at this scale.';

REVOKE ALL ON FUNCTION public.admin_delete_account(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_account(uuid) TO authenticated;

-- ─── 4. Lead retention: nothing is exempt forever ───────────────────────────
-- cron.schedule is idempotent on the job name (jobid 5 is replaced in place).

SELECT cron.schedule(
  'lead-staging-purge',
  '0 3 * * 0',
  $cron$
    DELETE FROM public.lead_staging
    WHERE
      -- A rejected lead is a decision we do not need to keep the evidence for.
      review_status = 'rejected'
      -- Contacted leads: 12 months, as UEMA evidence of what was sent to whom.
      OR (coalesce(outreach_status, 'none') = 'sent'
          AND created_at < now() - interval '12 months')
      -- Everything else — pending triage, approved-but-never-contacted, and
      -- drafted outreach that was never sent — 90 days. Before Phase 3 these
      -- were exempt forever, which is not a retention policy.
      OR (coalesce(outreach_status, 'none') <> 'sent'
          AND created_at < now() - interval '90 days')
  $cron$
);

COMMIT;
