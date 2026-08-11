-- 082_staging_type_filter_and_signup_attribution.sql
--
-- Two changes, both needed before the seeker lane has a screen of its own.
--
-- 1. `p_type` filter. `lead_staging` now carries seeker rows alongside employer rows
--    (see the lead-intake seeker extraction). Without a server-side filter the two
--    lanes share one queue, and pagination makes client-side filtering wrong rather
--    than merely untidy.
--
-- 2. `signed_up` per row — the attribution loop. `signUpWithRole` writes the `?ref=`
--    token into auth.users.raw_user_meta_data, so a staging row can be joined to the
--    account it produced. Without this the seeker funnel has no conversion measure at
--    all, and "which group converts?" is unanswerable.
--
-- DROP then CREATE, deliberately: CREATE OR REPLACE with a new signature creates an
-- OVERLOAD rather than replacing, and PostgREST then refuses the call with "could not
-- choose the best candidate function". The grants below are re-applied for the same
-- reason — DROP takes them with it.
--
-- p_type defaults to NULL = every type, so any caller that has not been updated keeps
-- its current behaviour.

DROP FUNCTION IF EXISTS public.admin_leads_staging_list(text, integer, integer, text, text, text, boolean, text);

CREATE FUNCTION public.admin_leads_staging_list(
  p_search text DEFAULT NULL::text,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0,
  p_sort text DEFAULT 'captured'::text,
  p_dir text DEFAULT 'desc'::text,
  p_source text DEFAULT 'all'::text,
  p_hide_expired boolean DEFAULT false,
  p_geo text DEFAULT 'nz_unknown'::text,
  p_type text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  DECLARE
    v_total int;
    v_rows  jsonb;
    v_manual_sources text[] := ARRAY['seek', 'trademe', 'fb_own_group', 'fb_manual_capture', 'manual_paste'];
    v_sort text := CASE lower(coalesce(p_sort, ''))
                     WHEN 'captured'   THEN 'captured'
                     WHEN 'confidence' THEN 'confidence'
                     WHEN 'lane'       THEN 'lane'
                     WHEN 'region'     THEN 'region'
                     ELSE 'captured'
                   END;
    v_asc boolean := lower(coalesce(p_dir, 'desc')) = 'asc';
    v_source text := CASE lower(coalesce(p_source, ''))
                       WHEN 'mine'      THEN 'mine'
                       WHEN 'harvested' THEN 'harvested'
                       ELSE 'all'
                     END;
    v_geo text := CASE lower(coalesce(p_geo, ''))
                    WHEN 'intl' THEN 'intl'
                    WHEN 'all'  THEN 'all'
                    ELSE 'nz_unknown'
                  END;
    -- Allowlist, not passthrough: this value reaches a jsonb comparison.
    v_type text := CASE lower(coalesce(p_type, ''))
                     WHEN 'employer' THEN 'employer'
                     WHEN 'seeker'   THEN 'seeker'
                     ELSE NULL
                   END;
  BEGIN
    PERFORM public._admin_gate();

    SELECT count(*) INTO v_total FROM lead_staging st
    WHERE st.review_status = 'pending'
      -- Employer is the default reading of a typeless legacy row: every row captured
      -- before the seeker lane existed is an employer lead.
      AND (v_type IS NULL
           OR coalesce(st.structured->>'type', 'employer') = v_type)
      AND (v_source = 'all'
           OR (v_source = 'mine'      AND coalesce(st.source, '') = ANY(v_manual_sources))
           OR (v_source = 'harvested' AND NOT (coalesce(st.source, '') = ANY(v_manual_sources))))
      AND (v_geo = 'all'
           OR (v_geo = 'intl'       AND st.structured->>'geo_scope' = 'intl')
           OR (v_geo = 'nz_unknown' AND coalesce(st.structured->>'geo_scope', 'nz') <> 'intl'))
      AND (NOT p_hide_expired
           OR st.structured->>'applications_close' IS NULL
           OR (st.structured->>'applications_close')::date >= current_date)
      AND (p_search IS NULL OR p_search = ''
           OR st.structured->>'display_name' ILIKE '%' || p_search || '%'
           OR st.structured->>'region' ILIKE '%' || p_search || '%'
           OR st.structured->>'role_or_category' ILIKE '%' || p_search || '%'
           OR st.raw_excerpt ILIKE '%' || p_search || '%'
           OR st.source ILIKE '%' || p_search || '%');

    SELECT coalesce(jsonb_agg(row_to_json(sub)), '[]'::jsonb) INTO v_rows FROM (
      SELECT st.id, st.created_at, st.source, st.source_ref, st.raw_excerpt,
             st.structured, st.confidence, st.missing_fields,
             st.dedupe_status, st.dedupe_match_id,
             st.outreach_status, st.sent_at, st.responded_at,
             -- The attribution loop: did this captured lead become an account?
             EXISTS (SELECT 1 FROM auth.users u
                     WHERE u.raw_user_meta_data->>'ref' = st.id::text) AS signed_up
      FROM lead_staging st
      WHERE st.review_status = 'pending'
        AND (v_type IS NULL
             OR coalesce(st.structured->>'type', 'employer') = v_type)
        AND (v_source = 'all'
             OR (v_source = 'mine'      AND coalesce(st.source, '') = ANY(v_manual_sources))
             OR (v_source = 'harvested' AND NOT (coalesce(st.source, '') = ANY(v_manual_sources))))
        AND (v_geo = 'all'
             OR (v_geo = 'intl'       AND st.structured->>'geo_scope' = 'intl')
             OR (v_geo = 'nz_unknown' AND coalesce(st.structured->>'geo_scope', 'nz') <> 'intl'))
        AND (NOT p_hide_expired
             OR st.structured->>'applications_close' IS NULL
             OR (st.structured->>'applications_close')::date >= current_date)
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
  $function$;

-- Re-applied: DROP took the originals. The security boundary is _admin_gate() inside
-- the function, not the grant (CLAUDE.md §10).
GRANT EXECUTE ON FUNCTION public.admin_leads_staging_list(text, integer, integer, text, text, text, boolean, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_leads_staging_list(text, integer, integer, text, text, text, boolean, text, text) TO service_role;
