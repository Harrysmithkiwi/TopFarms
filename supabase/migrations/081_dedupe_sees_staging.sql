-- 081_dedupe_sees_staging.sql
--
-- The "Possible duplicate" badge has existed since 041 and has never once fired.
-- All 93 staging rows read `dedupe_status = 'unique'` while the queue holds seven
-- genuine duplicate pairs, two of them visible side by side in the admin UI.
--
-- TWO ROOT CAUSES, both here:
--
-- 1. The fuzzy pass searched `leads` — the PROMOTED table, 2 rows — and never
--    `lead_staging`, which holds 93. Every duplicate in the system is
--    staging-to-staging, so the check was looking in an almost-empty table.
--
-- 2. The exact-duplicate check keys on _lead_fingerprint(name, region, type), and the
--    harvester leaves `region` null on roughly one row in eleven. Moeangiangi Station
--    arrived as "Hawke's Bay" on 30 Jun and null on 17 Jul — different fingerprints,
--    same farm, inserted twice. Wairio is the same story. An unreliable field was
--    load-bearing for identity.
--
-- THE MATCH RULE IS TWO-TIER, and the tiers were chosen by measuring against the real
-- queue rather than picked a priori:
--   • similarity >= 0.9  → duplicate regardless of region. Same farm harvested twice
--     with different region extraction is the single most common case here (Beckenham
--     Hills Ltd in Canterbury and Otago, Patunga in Waikato and Taranaki, Waverley in
--     Taranaki and Tasman).
--   • similarity 0.6–0.9 → duplicate ONLY if the regions agree or one is null. This is
--     what separates "Beckenham Hills Limited" from "Beckenham Hills Ltd" (both
--     Canterbury, genuine, 0.63) from "Pukeroa Station" vs "Puketio Station"
--     (Wellington vs Hawke's Bay, 0.63, two different farms). A region-blind 0.6
--     threshold flags that false positive; this rule does not.
--
-- dedupe_match_id is deliberately left NULL for staging matches: it carries
-- `FOREIGN KEY (dedupe_match_id) REFERENCES leads(id)`, so a lead_staging id cannot be
-- stored there without a schema change. The UI never reads that column — all four
-- render sites in AdminLeadsStaging.tsx key on dedupe_status alone — so the badge and
-- the drawer note fire correctly with it null.
--
-- ponytail: similarity() over pending staging is an O(n) scan per intake. Fine at 93
-- rows and fine at 10,000. Add a GIN trigram index on (structured->>'display_name') if
-- intake ever runs hot.

CREATE OR REPLACE FUNCTION public._lead_intake(
  p_source text, p_source_ref text, p_raw_excerpt text, p_structured jsonb,
  p_confidence numeric DEFAULT 1, p_missing_fields text[] DEFAULT '{}'::text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_name text := p_structured->>'display_name';
  v_region text := p_structured->>'region';
  v_type text := p_structured->>'type';
  v_fp text := public._lead_fingerprint(p_structured->>'display_name', p_structured->>'region', p_structured->>'type');
  v_dupe_id uuid;
  v_suspect_id uuid;
  v_staging_id uuid;
  v_dedupe text := 'unique';
BEGIN
  -- Durable opt-out: suppressed fingerprints are refused at the door.
  IF EXISTS (SELECT 1 FROM lead_suppression s WHERE s.fingerprint = v_fp) THEN
    RETURN jsonb_build_object('outcome', 'suppressed');
  END IF;

  -- Exact duplicate: same listing URL, or same fingerprint, already a lead.
  SELECT l.id INTO v_dupe_id FROM leads l
  WHERE (p_source_ref IS NOT NULL AND l.source_ref = p_source_ref)
     OR l.fingerprint = v_fp
  LIMIT 1;
  IF v_dupe_id IS NOT NULL THEN
    RETURN jsonb_build_object('outcome', 'exact_duplicate', 'duplicate_of', v_dupe_id);
  END IF;

  -- Already pending in staging with the same fingerprint -> exact duplicate.
  IF EXISTS (SELECT 1 FROM lead_staging st
             WHERE st.review_status = 'pending'
               AND public._lead_fingerprint(st.structured->>'display_name',
                                            st.structured->>'region',
                                            st.structured->>'type') = v_fp) THEN
    RETURN jsonb_build_object('outcome', 'exact_duplicate');
  END IF;

  IF v_name IS NOT NULL THEN
    -- (a) Fuzzy suspect against promoted leads. Original behaviour, unchanged.
    SELECT l.id INTO v_suspect_id FROM leads l
    WHERE l.type = v_type
      AND coalesce(l.region, '') = coalesce(v_region, '')
      AND similarity(l.display_name, v_name) >= 0.6
    ORDER BY similarity(l.display_name, v_name) DESC
    LIMIT 1;

    IF v_suspect_id IS NOT NULL THEN
      v_dedupe := 'suspect_duplicate';
    ELSIF EXISTS (
      -- (b) NEW: fuzzy suspect against other pending staging rows — where the
      --     duplicates actually live. Two-tier, per the header note.
      SELECT 1 FROM lead_staging st
      WHERE st.review_status = 'pending'
        AND st.structured->>'type' = v_type
        AND (
          similarity(st.structured->>'display_name', v_name) >= 0.9
          OR (similarity(st.structured->>'display_name', v_name) >= 0.6
              AND (v_region IS NULL
                   OR st.structured->>'region' IS NULL
                   OR st.structured->>'region' = v_region))
        )
    ) THEN
      v_dedupe := 'suspect_duplicate';   -- dedupe_match_id stays NULL, see header
    END IF;
  END IF;

  INSERT INTO lead_staging (source, source_ref, raw_excerpt, structured,
                            confidence, missing_fields, dedupe_status, dedupe_match_id)
  VALUES (p_source, p_source_ref, p_raw_excerpt, p_structured,
          coalesce(p_confidence, 1), coalesce(p_missing_fields, '{}'), v_dedupe, v_suspect_id)
  RETURNING id INTO v_staging_id;

  RETURN jsonb_build_object('outcome', 'inserted', 'staging_id', v_staging_id,
                            'dedupe_status', v_dedupe, 'suspect_of', v_suspect_id);
END;
$function$;

-- ─── Backfill: the queue already holds seven duplicate pairs that were never flagged ──
-- Flags BOTH sides of a pair, not just the later arrival, so the operator sees them as
-- a pair when they search the name. Only touches rows still 'unique' and 'pending' —
-- an already-reviewed decision is not second-guessed.
UPDATE public.lead_staging a
SET dedupe_status = 'suspect_duplicate'
WHERE a.review_status = 'pending'
  AND a.dedupe_status = 'unique'
  AND EXISTS (
    SELECT 1 FROM public.lead_staging b
    WHERE b.id <> a.id
      AND b.review_status = 'pending'
      AND b.structured->>'type' = a.structured->>'type'
      AND (
        extensions.similarity(b.structured->>'display_name', a.structured->>'display_name') >= 0.9
        OR (extensions.similarity(b.structured->>'display_name', a.structured->>'display_name') >= 0.6
            AND (a.structured->>'region' IS NULL
                 OR b.structured->>'region' IS NULL
                 OR b.structured->>'region' = a.structured->>'region'))
      )
  );
