-- 048: broaden admin_leads_staging_list search (punch-list P-3)
--
-- ███ STAGED — apply via Supabase Studio SQL Editor per CLAUDE §2 (MCP write
-- blocked). Idempotent (CREATE OR REPLACE) — safe to re-run. ███
--
-- Symptom: searching "Tirohanga" in Lead Staging returned nothing — the post's
-- locality lived in raw_excerpt, but the 041 search only matched
-- structured->>'display_name', structured->>'region', and source.
--
-- Fix: widen the predicate to ALSO match raw_excerpt and
-- structured->>'role_or_category'. ADDITIVE — same signature, same return shape,
-- same gate/order/pagination; CREATE OR REPLACE preserves existing grants. No
-- schema change, no touch to other RPCs or the jobs table.

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_leads_staging_list(
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 25,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_rows jsonb;
BEGIN
  PERFORM public._admin_gate();

  SELECT count(*) INTO v_total FROM lead_staging st
  WHERE st.review_status = 'pending'
    AND (p_search IS NULL OR p_search = ''
         OR st.structured->>'display_name' ILIKE '%' || p_search || '%'
         OR st.structured->>'region' ILIKE '%' || p_search || '%'
         OR st.structured->>'role_or_category' ILIKE '%' || p_search || '%'
         OR st.raw_excerpt ILIKE '%' || p_search || '%'
         OR st.source ILIKE '%' || p_search || '%');

  SELECT coalesce(jsonb_agg(row_to_json(sub)), '[]'::jsonb) INTO v_rows FROM (
    SELECT st.id, st.created_at, st.source, st.source_ref, st.raw_excerpt,
           st.structured, st.confidence, st.missing_fields,
           st.dedupe_status, st.dedupe_match_id
    FROM lead_staging st
    WHERE st.review_status = 'pending'
      AND (p_search IS NULL OR p_search = ''
           OR st.structured->>'display_name' ILIKE '%' || p_search || '%'
           OR st.structured->>'region' ILIKE '%' || p_search || '%'
           OR st.structured->>'role_or_category' ILIKE '%' || p_search || '%'
           OR st.raw_excerpt ILIKE '%' || p_search || '%'
           OR st.source ILIKE '%' || p_search || '%')
    ORDER BY st.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END;
$$;

COMMIT;
