-- ============================================================
-- 033_admin_doc_rpcs.sql
-- TopFarms — Phase 21 Doc Verification Queue (Track B)
--
-- Four SECURITY DEFINER admin RPCs for the /admin/documents queue:
--   - admin_list_document_queue(p_limit, p_offset) — paginated list, pending-first
--   - admin_approve_document(p_document_id) — sets status='approved', clears reason
--   - admin_reject_document(p_document_id, p_reason) — sets status='rejected' + reason
--   - admin_request_more_info(p_document_id) — sets status='needs_resubmission'
--
-- All follow the canonical 023_admin_rpcs.sql template:
--   - SECURITY DEFINER + STABLE (read) or VOLATILE default (mutations)
--   - SET search_path = public
--   - PERFORM public._admin_gate() as first body statement
--   - Mutations: write admin_audit_log row BEFORE returning
--   - GRANT EXECUTE TO authenticated (gate stops non-admins at runtime)
--
-- Apply via Supabase Studio SQL Editor (CLAUDE.md §2). Wave 5 plan 21-07's
-- AdminDocumentsQueue page consumes these via supabase.rpc(... as never)
-- per Phase 20-05 STATE workaround (Studio-applied RPCs not in generated
-- function-name union).
-- ============================================================

BEGIN;

-- ============================================================
-- 3.1 admin_list_document_queue — paginated read
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_list_document_queue(
  p_limit  int DEFAULT 25,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_rows  jsonb;
  v_total int;
BEGIN
  PERFORM public._admin_gate();

  SELECT count(*) INTO v_total FROM public.seeker_documents;

  SELECT COALESCE(jsonb_agg(row_to_jsonb(t)), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      sd.id            AS document_id,
      sp.user_id       AS seeker_user_id,
      COALESCE(sc.first_name || ' ' || sc.last_name, sc.email, 'Unknown') AS seeker_name,
      sd.document_type,
      sd.filename,
      sd.uploaded_at,
      sd.status,
      sd.rejection_reason
    FROM public.seeker_documents sd
    JOIN public.seeker_profiles sp ON sp.id = sd.seeker_id
    LEFT JOIN public.seeker_contacts sc ON sc.seeker_id = sp.id
    ORDER BY
      CASE WHEN sd.status = 'pending' THEN 0 ELSE 1 END,
      sd.uploaded_at DESC
    LIMIT p_limit OFFSET p_offset
  ) t;

  RETURN jsonb_build_object('rows', v_rows, 'total', v_total);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_document_queue(int, int) TO authenticated;

-- ============================================================
-- 3.2 admin_approve_document
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_approve_document(p_document_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_before    text;
BEGIN
  PERFORM public._admin_gate();

  SELECT status INTO v_before FROM public.seeker_documents WHERE id = p_document_id;
  IF v_before IS NULL THEN
    RAISE EXCEPTION 'Document not found: %', p_document_id;
  END IF;

  UPDATE public.seeker_documents
    SET status = 'approved', rejection_reason = NULL
   WHERE id = p_document_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (
    v_caller_id,
    'approve_document',
    'seeker_documents',
    p_document_id,
    jsonb_build_object('before', v_before, 'after', 'approved')
  );

  RETURN jsonb_build_object('ok', true, 'document_id', p_document_id, 'status', 'approved');
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_approve_document(uuid) TO authenticated;

-- ============================================================
-- 3.3 admin_reject_document — requires non-empty reason
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_reject_document(
  p_document_id uuid,
  p_reason      text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_before    text;
  v_clean     text;
BEGIN
  PERFORM public._admin_gate();

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Rejection reason cannot be empty';
  END IF;
  v_clean := trim(p_reason);

  SELECT status INTO v_before FROM public.seeker_documents WHERE id = p_document_id;
  IF v_before IS NULL THEN
    RAISE EXCEPTION 'Document not found: %', p_document_id;
  END IF;

  UPDATE public.seeker_documents
    SET status = 'rejected', rejection_reason = v_clean
   WHERE id = p_document_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (
    v_caller_id,
    'reject_document',
    'seeker_documents',
    p_document_id,
    jsonb_build_object('before', v_before, 'after', 'rejected', 'reason', v_clean)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'document_id', p_document_id,
    'status', 'rejected',
    'reason', v_clean
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_reject_document(uuid, text) TO authenticated;

-- ============================================================
-- 3.4 admin_request_more_info — sets needs_resubmission state
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_request_more_info(p_document_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_before    text;
BEGIN
  PERFORM public._admin_gate();

  SELECT status INTO v_before FROM public.seeker_documents WHERE id = p_document_id;
  IF v_before IS NULL THEN
    RAISE EXCEPTION 'Document not found: %', p_document_id;
  END IF;

  UPDATE public.seeker_documents
    SET status = 'needs_resubmission', rejection_reason = NULL
   WHERE id = p_document_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (
    v_caller_id,
    'request_more_info_document',
    'seeker_documents',
    p_document_id,
    jsonb_build_object('before', v_before, 'after', 'needs_resubmission')
  );

  RETURN jsonb_build_object(
    'ok', true,
    'document_id', p_document_id,
    'status', 'needs_resubmission'
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_request_more_info(uuid) TO authenticated;

-- ============================================================
-- 4. Atomic post-state verification
-- ============================================================
DO $verify$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'admin_list_document_queue',
        'admin_approve_document',
        'admin_reject_document',
        'admin_request_more_info'
      )
      AND p.prosecdef = true;
  IF v_count != 4 THEN
    RAISE EXCEPTION 'Verify failed: expected 4 SECURITY DEFINER admin doc RPCs, got %', v_count;
  END IF;
END
$verify$;

COMMIT;
