-- 061: Leads pipeline v2 — expired + international segmentation of the staging queue.
--
-- Both signals live in the `structured` jsonb (no new columns): `applications_close`
-- (ISO date) and `geo_scope` ('nz'|'intl'|'unknown'). This migration (a) backfills
-- them on the existing staged rows and (b) extends admin_leads_staging_list with two
-- optional filters. Forward extraction (lead-intake) ships separately; the filters
-- treat a MISSING signal as safe (not expired / not international), so new harvested
-- leads without the keys still show correctly.

-- Harvested rows keep the "Applications close…" cue and country mentions in the
-- extracted contact.notes / application_method, not raw_excerpt (which is often
-- empty), so every backfill below reads a combined haystack of all three.

-- ── Backfill geo_scope ───────────────────────────────────────────────────────
-- intl if a foreign dialling prefix (+X that isn't +64), a foreign ccTLD email,
-- or an unambiguous overseas place is present; else nz if the region is a real
-- NZ region; else unknown. Conservative country list — avoids NZ-ambiguous words.
UPDATE lead_staging st
SET structured = jsonb_set(
  st.structured, '{geo_scope}',
  to_jsonb(
    CASE
      WHEN (st.structured->'contact'->>'phone') ~ '\+(?!64)\d'
        OR (st.structured->'contact'->>'email') ~* '\.(ie|au|uk|ca|de|fr|us|za)$'
        OR (coalesce(st.raw_excerpt,'') || ' ' || coalesce(st.structured->'contact'->>'notes','')
            || ' ' || coalesce(st.structured->>'application_method',''))
             ~* '(ireland|saskatchewan|king island|tasmania|\baustralia\b|queensland|new south wales)'
        THEN 'intl'
      WHEN st.structured->>'region' IN (
        'Northland','Auckland','Waikato','Bay of Plenty','Gisborne','Hawke''s Bay',
        'Taranaki','Manawatū-Whanganui','Wellington','Tasman','Nelson','Marlborough',
        'West Coast','Canterbury','Otago','Southland')
        THEN 'nz'
      ELSE 'unknown'
    END
  )
);

-- ── Backfill applications_close (best-effort) ────────────────────────────────
-- Pass 1: slash dates near a "close/closing" cue — "Applications close 10/7/2026".
UPDATE lead_staging st
SET structured = jsonb_set(st.structured, '{applications_close}', to_jsonb(v.d::text))
FROM (
  SELECT s.id, to_date(r.m[1], 'DD/MM/YYYY') AS d
  FROM lead_staging s,
       LATERAL (
         SELECT regexp_match(
           coalesce(s.raw_excerpt,'') || ' ' || coalesce(s.structured->'contact'->>'notes','')
             || ' ' || coalesce(s.structured->>'application_method',''),
           'clos[a-z]*[^0-9]{0,20}(\d{1,2}/\d{1,2}/\d{4})', 'i') AS m
       ) r
  WHERE r.m IS NOT NULL
) v
WHERE st.id = v.id AND v.d IS NOT NULL;

-- Pass 2: textual dates — "Applications close 1st July 2026". Only fills rows
-- Pass 1 didn't already resolve; month is constrained so to_date can't choke.
UPDATE lead_staging st
SET structured = jsonb_set(st.structured, '{applications_close}', to_jsonb(v.d::text))
FROM (
  SELECT s.id, to_date(r.m[1] || ' ' || r.m[2] || ' ' || r.m[3], 'DD Month YYYY') AS d
  FROM lead_staging s,
       LATERAL (
         SELECT regexp_match(
           coalesce(s.raw_excerpt,'') || ' ' || coalesce(s.structured->'contact'->>'notes','')
             || ' ' || coalesce(s.structured->>'application_method',''),
           'clos[a-z]*[^0-9]{0,20}(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+(\d{4})', 'i') AS m
       ) r
  WHERE r.m IS NOT NULL
) v
WHERE st.id = v.id AND v.d IS NOT NULL
  AND st.structured->>'applications_close' IS NULL;

-- ── Extend admin_leads_staging_list with expired + geo filters ───────────────
-- Drop the old 6-arg signature first: adding params would otherwise create a
-- second overload and PostgREST would fail to choose a candidate.
DROP FUNCTION IF EXISTS public.admin_leads_staging_list(text,integer,integer,text,text,text);

CREATE OR REPLACE FUNCTION public.admin_leads_staging_list(
  p_search text DEFAULT NULL::text,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0,
  p_sort text DEFAULT 'captured'::text,
  p_dir text DEFAULT 'desc'::text,
  p_source text DEFAULT 'all'::text,
  p_hide_expired boolean DEFAULT false,
  p_geo text DEFAULT 'nz_unknown'::text
)
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
  BEGIN
    PERFORM public._admin_gate();

    SELECT count(*) INTO v_total FROM lead_staging st
    WHERE st.review_status = 'pending'
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
             st.dedupe_status, st.dedupe_match_id
      FROM lead_staging st
      WHERE st.review_status = 'pending'
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
