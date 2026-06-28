-- 053: server-side sort on admin_leads_staging_list (T-1, leads-triage)
--
-- WHY server-side: AdminTable paginates server-side (p_limit/p_offset, 25/page)
-- and only ever holds one page in memory. A client-side sort would reorder a
-- 25-row slice of a multi-page queue — misleading for triage. So the sort must
-- run in the RPC, over the full filtered set, before LIMIT/OFFSET.
--
-- SECURITY (mandatory): p_sort is NEVER interpolated into the ORDER BY. It is
-- validated against a fixed allowlist (captured/confidence/lane/region) via a
-- CASE that resolves to an internal token; anything off-list collapses to the
-- default (captured/desc). The ORDER BY then selects a whitelisted column
-- expression per (token, direction) branch — no dynamic SQL, no EXECUTE.
--
-- ARITY: this adds p_sort/p_dir, changing the signature from 3 args to 5. The
-- old 3-arg overload is DROPped first so PostgREST can't resolve ambiguously
-- (CREATE OR REPLACE alone would leave both overloads live). Grants are
-- re-applied after recreate (DROP loses them).
--
-- Reused by T-5: the same AdminTable sort mechanism will drive a sibling
-- p_sort on admin_outreach_list (outreach_status) in a later migration.

BEGIN;

DROP FUNCTION IF EXISTS public.admin_leads_staging_list(text, int, int);

CREATE OR REPLACE FUNCTION public.admin_leads_staging_list(
  p_search text DEFAULT NULL,
  p_limit  int  DEFAULT 25,
  p_offset int  DEFAULT 0,
  p_sort   text DEFAULT 'captured',
  p_dir    text DEFAULT 'desc'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_rows  jsonb;
  -- Allowlist validation. p_sort collapses to one of four internal tokens (or
  -- the 'captured' default); it is never concatenated into SQL.
  v_sort text := CASE lower(coalesce(p_sort, ''))
                   WHEN 'captured'   THEN 'captured'
                   WHEN 'confidence' THEN 'confidence'
                   WHEN 'lane'       THEN 'lane'
                   WHEN 'region'     THEN 'region'
                   ELSE 'captured'
                 END;
  v_asc boolean := lower(coalesce(p_dir, 'desc')) = 'asc';  -- default desc
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
    ORDER BY
      -- Only the branch matching (v_sort, v_asc) yields a non-null key; every
      -- other branch is NULL for all rows and cannot affect ordering. Each key
      -- is a hard-coded whitelisted column expression.
      CASE WHEN v_sort = 'confidence' AND     v_asc THEN st.confidence END ASC  NULLS LAST,
      CASE WHEN v_sort = 'confidence' AND NOT v_asc THEN st.confidence END DESC NULLS LAST,
      CASE WHEN v_sort = 'lane'       AND     v_asc THEN st.structured->>'lane' END ASC  NULLS LAST,
      CASE WHEN v_sort = 'lane'       AND NOT v_asc THEN st.structured->>'lane' END DESC NULLS LAST,
      CASE WHEN v_sort = 'region'     AND     v_asc THEN st.structured->>'region' END ASC  NULLS LAST,
      CASE WHEN v_sort = 'region'     AND NOT v_asc THEN st.structured->>'region' END DESC NULLS LAST,
      CASE WHEN v_sort = 'captured'   AND     v_asc THEN st.created_at END ASC,
      st.created_at DESC   -- captured/desc default + stable tiebreaker for every sort
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_leads_staging_list(text, int, int, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_leads_staging_list(text, int, int, text, text) TO authenticated;

COMMIT;
