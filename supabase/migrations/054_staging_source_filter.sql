-- 054: source filter (mine / harvested / all) on admin_leads_staging_list (T-2)
--
-- WHY: harvested volume (nzfarmingjobs) buries the founder's hand-captures.
-- Server-side filter — a client filter over the loaded 25-row page mis-slices a
-- multi-page queue (same reason the T-1 sort is server-side).
--
-- CLASSIFICATION (authoritative): the source CHECK enum (mig 044) bounds the
-- universe to 5 values. "Mine" = the manual capture/paste sources, identical to
-- lead-intake's ALLOWED_SOURCES; "harvested" = everything else (nzfarmingjobs
-- today). A static drift-guard test asserts v_manual_sources == ALLOWED_SOURCES
-- so "mine" can't silently rot when a source is added.
--
-- SECURITY: p_source is validated against a fixed allowlist via CASE → an
-- internal token; it is never interpolated and drives a `= ANY(array)`
-- predicate, not dynamic SQL. Unknown → 'all'.
--
-- BACKWARD COMPAT: p_source DEFAULTs to 'all', so the currently-deployed T-1
-- main (5-arg calls, no p_source) resolves to this function unchanged — safe to
-- apply before the frontend merges. "Mine by default" is a FRONTEND default.
--
-- ARITY: 5 → 6 args, so the 5-arg overload is DROPped first (avoids ambiguous
-- PostgREST resolution). Grants re-applied after recreate.

BEGIN;

DROP FUNCTION IF EXISTS public.admin_leads_staging_list(text, int, int, text, text);

CREATE OR REPLACE FUNCTION public.admin_leads_staging_list(
  p_search text DEFAULT NULL,
  p_limit  int  DEFAULT 25,
  p_offset int  DEFAULT 0,
  p_sort   text DEFAULT 'captured',
  p_dir    text DEFAULT 'desc',
  p_source text DEFAULT 'all'
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
  -- "Mine" = the manual capture/paste sources. KEEP IN SYNC with
  -- supabase/functions/lead-intake/index.ts ALLOWED_SOURCES (drift-guard test
  -- enforces it). Harvested = anything not in this set.
  v_manual_sources text[] := ARRAY['seek', 'trademe', 'fb_own_group', 'fb_manual_capture'];
  v_sort text := CASE lower(coalesce(p_sort, ''))
                   WHEN 'captured'   THEN 'captured'
                   WHEN 'confidence' THEN 'confidence'
                   WHEN 'lane'       THEN 'lane'
                   WHEN 'region'     THEN 'region'
                   ELSE 'captured'
                 END;
  v_asc boolean := lower(coalesce(p_dir, 'desc')) = 'asc';
  -- p_source allowlist → internal token; unknown collapses to 'all'.
  v_source text := CASE lower(coalesce(p_source, ''))
                     WHEN 'mine'      THEN 'mine'
                     WHEN 'harvested' THEN 'harvested'
                     ELSE 'all'
                   END;
BEGIN
  PERFORM public._admin_gate();

  SELECT count(*) INTO v_total FROM lead_staging st
  WHERE st.review_status = 'pending'
    AND (v_source = 'all'
         OR (v_source = 'mine'      AND coalesce(st.source, '') = ANY(v_manual_sources))
         OR (v_source = 'harvested' AND NOT (coalesce(st.source, '') = ANY(v_manual_sources))))
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
      AND (v_source = 'all'
           OR (v_source = 'mine'      AND coalesce(st.source, '') = ANY(v_manual_sources))
           OR (v_source = 'harvested' AND NOT (coalesce(st.source, '') = ANY(v_manual_sources))))
      AND (p_search IS NULL OR p_search = ''
           OR st.structured->>'display_name' ILIKE '%' || p_search || '%'
           OR st.structured->>'region' ILIKE '%' || p_search || '%'
           OR st.structured->>'role_or_category' ILIKE '%' || p_search || '%'
           OR st.raw_excerpt ILIKE '%' || p_search || '%'
           OR st.source ILIKE '%' || p_search || '%')
    ORDER BY
      CASE WHEN v_sort = 'confidence' AND     v_asc THEN st.confidence END ASC  NULLS LAST,
      CASE WHEN v_sort = 'confidence' AND NOT v_asc THEN st.confidence END DESC NULLS LAST,
      CASE WHEN v_sort = 'lane'       AND     v_asc THEN st.structured->>'lane' END ASC  NULLS LAST,
      CASE WHEN v_sort = 'lane'       AND NOT v_asc THEN st.structured->>'lane' END DESC NULLS LAST,
      CASE WHEN v_sort = 'region'     AND     v_asc THEN st.structured->>'region' END ASC  NULLS LAST,
      CASE WHEN v_sort = 'region'     AND NOT v_asc THEN st.structured->>'region' END DESC NULLS LAST,
      CASE WHEN v_sort = 'captured'   AND     v_asc THEN st.created_at END ASC,
      st.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_leads_staging_list(text, int, int, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_leads_staging_list(text, int, int, text, text, text) TO authenticated;

COMMIT;
