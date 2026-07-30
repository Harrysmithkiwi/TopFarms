-- ============================================================
-- 074_fix_verification_queue_jsonb.sql
-- TopFarms — Phase 3 Task 3.2 follow-up
--
-- 073's admin_list_verification_queue used row_to_jsonb(t), which does not
-- exist in this Postgres:
--
--   POST /rest/v1/rpc/admin_list_verification_queue  (admin JWT)
--   -> 404 {"code":"42883","message":"function row_to_jsonb(record) does not exist"}
--
-- Found by probing the deployed RPC, not by review. I copied the pattern from
-- 033_admin_doc_rpcs.sql — which carried the SAME defect, and which migration
-- 058 already fixed by switching to to_jsonb(t). Copying a sibling RPC
-- reproduced a bug that had been fixed a year of migrations ago; the lesson is
-- to copy the LIVE function body (pg_get_functiondef) rather than the oldest
-- migration that mentions it.
--
-- Append-only rather than an edit to 073: 073 is what was actually applied, and
-- the disk file should keep saying so (same precedent as 058 amending 033).
-- ============================================================

BEGIN;

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

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_rows
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

REVOKE ALL ON FUNCTION public.admin_list_verification_queue(int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_verification_queue(int, int) TO authenticated;

COMMIT;
