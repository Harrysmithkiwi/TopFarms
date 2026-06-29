-- 055: server-side sort on admin_outreach_list (T-5, leads-triage)
--
-- Reuses the T-1 AdminTable sort mechanism on the Outreach queue. Server-side
-- for the same reason as staging: the queue spans pages, a client sort would
-- only order the loaded 25-row slice.
--
-- STATUS sorts by URGENCY (responded-first), NOT alphabetical and NOT workflow
-- progression. A farmer who replied is the urgent one to action; an unsent draft
-- waits. Ordinal: responded(1) → sent(2) → approved(3) → drafted(4), so the
-- first click (ascending) surfaces responded at the top of the queue.
--
-- SECURITY: p_sort validated against a fixed allowlist (status/captured) via
-- CASE → internal token; never interpolated. The ordinal CASE keys off the
-- outreach_status COLUMN, not p_sort. No dynamic SQL.
--
-- BACKWARD COMPAT: p_sort/p_dir DEFAULT, so the deployed 3-arg Outreach main
-- resolves to this unchanged. ARITY 3→5, so the 3-arg overload is DROPped first.

BEGIN;

DROP FUNCTION IF EXISTS public.admin_outreach_list(text, int, int);

CREATE OR REPLACE FUNCTION public.admin_outreach_list(
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
  v_sort text := CASE lower(coalesce(p_sort, ''))
                   WHEN 'status'   THEN 'status'
                   WHEN 'captured' THEN 'captured'
                   ELSE 'captured'
                 END;
  v_asc boolean := lower(coalesce(p_dir, 'desc')) = 'asc';
BEGIN
  PERFORM public._admin_gate();

  SELECT count(*) INTO v_total FROM lead_staging st
  WHERE st.review_status = 'pending'
    AND st.structured->>'lane' = 'b'
    AND st.outreach_status IN ('drafted','approved','sent','responded')
    AND (p_search IS NULL OR p_search = ''
         OR st.structured->>'display_name' ILIKE '%' || p_search || '%'
         OR st.structured->>'region' ILIKE '%' || p_search || '%');

  SELECT coalesce(jsonb_agg(row_to_json(sub)), '[]'::jsonb) INTO v_rows FROM (
    SELECT st.id, st.created_at, st.source, st.source_ref, st.raw_excerpt,
           st.structured, st.confidence, st.missing_fields,
           st.drafted_reply, st.draft_model, st.outreach_status,
           st.sent_at, st.responded_at
    FROM lead_staging st
    WHERE st.review_status = 'pending'
      AND st.structured->>'lane' = 'b'
      AND st.outreach_status IN ('drafted','approved','sent','responded')
      AND (p_search IS NULL OR p_search = ''
           OR st.structured->>'display_name' ILIKE '%' || p_search || '%'
           OR st.structured->>'region' ILIKE '%' || p_search || '%')
    ORDER BY
      -- Status by URGENCY ordinal (responded-first), never alphabetical. Only the
      -- branch matching (v_sort, v_asc) is non-null; the rest are NULL for all rows.
      CASE WHEN v_sort = 'status' AND v_asc THEN
        (CASE st.outreach_status WHEN 'responded' THEN 1 WHEN 'sent' THEN 2
                                 WHEN 'approved' THEN 3 WHEN 'drafted' THEN 4 ELSE 9 END)
      END ASC NULLS LAST,
      CASE WHEN v_sort = 'status' AND NOT v_asc THEN
        (CASE st.outreach_status WHEN 'responded' THEN 1 WHEN 'sent' THEN 2
                                 WHEN 'approved' THEN 3 WHEN 'drafted' THEN 4 ELSE 9 END)
      END DESC NULLS LAST,
      CASE WHEN v_sort = 'captured' AND v_asc THEN st.created_at END ASC,
      st.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_outreach_list(text, int, int, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_outreach_list(text, int, int, text, text) TO authenticated;

COMMIT;
