-- ============================================================
-- 073_verification_trust.sql
-- TopFarms — Phase 3 Task 3.2: verification you can trust (audit P0-9)
--
-- THE DEFECT. DocumentUpload.tsx:47-56 upserts employer_verifications with
-- status:'verified' FROM THE BROWSER. Upload any file — a blank PDF — and the
-- trust badge lights up. `status` already DEFAULTs to 'pending'; the client was
-- explicitly overriding it. Every downstream consumer of verification_tier
-- (023:262-267, 058:70) inherits the claim.
--
-- WHY BOTH HALVES SHIP TOGETHER. Downgrading the client write to 'pending' is
-- one line, and alone it is worse than the bug: no employer could EVER become
-- verified, because no admin approval path for employer_verifications exists.
-- AdminDocumentsQueue reads admin_list_document_queue, which is seeker_documents
-- only. A trust ladder nobody can climb is worse than one anyone can fake — the
-- fake one is at least honest about being decorative. So this migration adds the
-- queue RPCs in the same change as the lockdown.
--
-- ENFORCEMENT IS NOT THE CLIENT. Two independent layers, because "the client
-- writes pending" is a convention and conventions get refactored away:
--   (a) RLS WITH CHECK pins employer writes to status='pending'.
--   (b) Column-level REVOKE removes INSERT/UPDATE on status and verified_at
--       from `authenticated` entirely. SECURITY DEFINER RPCs run as the owner
--       and are unaffected, which is exactly the split we want.
--
-- AUDIT. admin_audit_log holds 2 rows and ZERO document views — an admin
-- looking at a passport currently leaves no trace. Both queues now log the
-- mint. Verified live 2026-07-30: employer_verifications holds 0 rows, so this
-- lands before the first real claim rather than after.
--
-- Apply via claude.ai Supabase connector. Verify via pg_catalog read-back.
-- ============================================================

BEGIN;

-- ─── 1. Provenance: who granted this badge, and how ─────────────────────────

ALTER TABLE public.employer_verifications
  ADD COLUMN verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN rejection_reason text;

COMMENT ON COLUMN public.employer_verifications.verified_by IS
  'The admin who approved this verification. NULL with status=verified means a pre-073 client-written claim that no human ever checked — see the backfill in this migration.';

-- Backfill: any existing status='verified' row was written by the browser and
-- was never reviewed. Reset to 'pending' so it must pass through the queue.
-- (0 rows live at apply time — this exists so the migration is correct if
-- re-run against a database where employers did verify first.)
UPDATE public.employer_verifications
SET status = 'pending', verified_at = NULL
WHERE status = 'verified' AND verified_by IS NULL;

-- ─── 2. Lock the employer out of its own status field ───────────────────────

DROP POLICY IF EXISTS "employers manage own verifications" ON public.employer_verifications;

-- Split FOR ALL into explicit commands: an employer may create and amend its
-- own submission, and may never mark it verified.
CREATE POLICY "employers view own verifications"
  ON public.employer_verifications
  FOR SELECT TO authenticated
  USING (
    employer_id IN (
      SELECT id FROM public.employer_profiles WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "employers submit own verifications"
  ON public.employer_verifications
  FOR INSERT TO authenticated
  WITH CHECK (
    employer_id IN (
      SELECT id FROM public.employer_profiles WHERE user_id = (SELECT auth.uid())
    )
    AND status = 'pending'
    AND verified_at IS NULL
    AND verified_by IS NULL
  );

CREATE POLICY "employers amend own pending verifications"
  ON public.employer_verifications
  FOR UPDATE TO authenticated
  USING (
    employer_id IN (
      SELECT id FROM public.employer_profiles WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    employer_id IN (
      SELECT id FROM public.employer_profiles WHERE user_id = (SELECT auth.uid())
    )
    AND status = 'pending'
    AND verified_at IS NULL
    AND verified_by IS NULL
  );

COMMENT ON POLICY "employers amend own pending verifications" ON public.employer_verifications IS
  'An employer may re-upload while pending. The WITH CHECK pins status to pending, so an UPDATE that sets verified is refused rather than silently accepted (audit P0-9). Column grants in this migration are the second layer.';

-- Column-level enforcement. A no-op while a table-level grant exists (the 067
-- lesson), so drop the table grants and re-grant precisely.
REVOKE INSERT, UPDATE ON public.employer_verifications FROM authenticated;
GRANT INSERT (employer_id, method, nzbn_number, document_url)
  ON public.employer_verifications TO authenticated;
GRANT UPDATE (nzbn_number, document_url)
  ON public.employer_verifications TO authenticated;

-- ─── 3. The admin approval path (the half that must not be missing) ─────────

CREATE OR REPLACE FUNCTION public.admin_list_verification_queue(
  p_limit  int DEFAULT 25,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows  jsonb;
  v_total int;
BEGIN
  PERFORM public._admin_gate();

  SELECT count(*) INTO v_total FROM public.employer_verifications;

  SELECT COALESCE(jsonb_agg(row_to_jsonb(t)), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      ev.id            AS verification_id,
      ev.employer_id,
      ep.farm_name,
      ep.region,
      ev.method,
      ev.status,
      ev.nzbn_number,
      ev.document_url,
      ev.created_at,
      ev.reviewed_at,
      ev.verified_at,
      ev.rejection_reason
    FROM public.employer_verifications ev
    JOIN public.employer_profiles ep ON ep.id = ev.employer_id
    ORDER BY
      CASE WHEN ev.status = 'pending' THEN 0 ELSE 1 END,
      ev.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) t;

  RETURN jsonb_build_object('rows', v_rows, 'total', v_total);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_verification(p_verification_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.employer_verifications;
BEGIN
  PERFORM public._admin_gate();

  UPDATE public.employer_verifications
  SET status           = 'verified',
      verified_at      = now(),
      reviewed_at      = now(),
      verified_by      = auth.uid(),
      rejection_reason = NULL
  WHERE id = p_verification_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Verification not found: %', p_verification_id USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (auth.uid(), 'verification.approve', 'employer_verifications', p_verification_id,
          jsonb_build_object('employer_id', v_row.employer_id, 'method', v_row.method));

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_verification(
  p_verification_id uuid,
  p_reason          text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.employer_verifications;
BEGIN
  PERFORM public._admin_gate();

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'A rejection reason is required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.employer_verifications
  SET status           = 'rejected',
      verified_at      = NULL,
      reviewed_at      = now(),
      verified_by      = auth.uid(),
      rejection_reason = p_reason
  WHERE id = p_verification_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Verification not found: %', p_verification_id USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (auth.uid(), 'verification.reject', 'employer_verifications', p_verification_id,
          jsonb_build_object('employer_id', v_row.employer_id, 'reason', p_reason));

  RETURN to_jsonb(v_row);
END;
$$;

-- ─── 4. Document views are auditable events, not free reads ─────────────────
-- Called by get-applicant-document-url immediately before it mints a signed
-- URL, for BOTH queues. The Edge Function holds the service-role key, so the
-- log write cannot be skipped by a client that simply chooses not to call it.

CREATE OR REPLACE FUNCTION public.log_admin_document_view(
  p_admin_id     uuid,
  p_target_table text,
  p_target_id    uuid,
  p_payload      jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_target_table NOT IN ('seeker_documents', 'employer_verifications') THEN
    RAISE EXCEPTION 'Unsupported audit target: %', p_target_table USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (p_admin_id, 'document.view', p_target_table, p_target_id, COALESCE(p_payload, '{}'::jsonb));
END;
$$;

COMMENT ON FUNCTION public.log_admin_document_view(uuid, text, uuid, jsonb) IS
  'Records an admin document view (Phase 3 Task 3.2). Service-role only — invoked by get-applicant-document-url before minting a signed URL. Before this existed, zero document views had ever been recorded: an admin opening a passport left no trace.';

REVOKE ALL ON FUNCTION public.admin_list_verification_queue(int, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_approve_verification(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reject_verification(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.log_admin_document_view(uuid, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_list_verification_queue(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_verification(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_verification(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_admin_document_view(uuid, text, uuid, jsonb) TO service_role;

COMMIT;
