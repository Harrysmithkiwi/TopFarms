-- 092 — A seeker opt-out can be recorded, and it holds across handles (Phase B1)
--
-- COMPLIANCE, like 087, and applied at the same free moment: measured on prod 2026-08-18,
-- `lead_staging` holds 127 employer rows and **zero seeker rows**. The seeker lane has never
-- been loaded, so nothing has been messaged and no one has yet asked to stop. From the first
-- DM onward both halves below cost something.
--
-- ── half one: there was no control at all ───────────────────────────────────────────────
--
-- 087 closed the gap for PROMOTED leads (`admin_lead_suppress` + a button on `AdminLeads`).
-- It did not close it for the seeker lane, because the seeker lane never promotes: outreach
-- state (`sent_at`, `responded_at`, `outreach_status`) lives on `lead_staging`, and
-- `AdminSeekerStaging.tsx` offers exactly one action — copy a signup link. So a seeker who
-- replies "stop" to a DM has nowhere to be recorded. `admin_lead_reject` already exists and
-- already accepts `p_suppress`; it just had no caller on that screen. The UI half of this
-- ticket wires it up. No new RPC is needed for that.
--
-- ── half two: the key does not survive a second handle ──────────────────────────────────
--
-- Suppression keys on `_lead_suppression_key(display_name, type)`. For an EMPLOYER that is
-- sound — a farm has one stable trading name, which is why 087 stopped there. For a SEEKER
-- `display_name` is a person's Facebook handle, and the corpus already contains one person
-- posting the same text under two of them ("seeker-lane.md", round 2). Suppressing one leaves
-- the other contactable, and a trigram check does not save you: similarity('Jess M',
-- 'Jessica Moore') is well under the 0.6 suspect threshold, so the second handle is not even
-- flagged.
--
-- The one thing that IS stable across handles is the post itself. Hence a body key.
--
-- SCOPED TO THE SEEKER LANE ON PURPOSE. Employer dedupe works — 127 rows, 15 suspects, no
-- reported over- or under-merge — and syndicated or agency-templated job ads genuinely do
-- repeat verbatim across different farms, so a body key would merge distinct employers. The
-- failure this fixes is a seeker-lane failure; the fix stays there.
--
-- ponytail: md5 of a normalised body, not a similarity index. Exact repost is the observed
-- case (copy-paste to a second group, or a second handle) and it is the one worth catching
-- cheaply. Near-duplicate seeker posts stay a human judgement. Upgrade to trigram over
-- raw_excerpt if the corpus shows re-typed rather than re-pasted posts.

BEGIN;

-- ── the body key ────────────────────────────────────────────────────────────────────────
-- NULL below a length floor. A short generic post ("Looking for farm work in Waikato,
-- message me" → ~40 normalised chars) is not identity — two unrelated people write it in the
-- same week, and keying suppression on it would silently stop us contacting an innocent
-- person. 120 normalised alphanumerics is roughly two sentences; every post in the 23-post
-- corpus clears it comfortably. NULL means "fall back to the name key", i.e. today's
-- behaviour, so the floor fails in the safe direction.
CREATE OR REPLACE FUNCTION public._lead_body_key(p_body text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
           WHEN length(regexp_replace(lower(coalesce(p_body, '')), '[^a-z0-9]+', '', 'g')) < 120
             THEN NULL
           ELSE 'body:' || md5(regexp_replace(lower(coalesce(p_body, '')), '[^a-z0-9]+', '', 'g'))
         END;
$$;

COMMENT ON FUNCTION public._lead_body_key(text) IS
  'Seeker-lane identity of last resort: md5 of the normalised post body, NULL under 120 normalised chars. The same person under two Facebook handles produces two display_names but one body. Prefixed body: so a lead_suppression row is self-describing next to a name|type key. Deliberately NOT used on the employer lane, where templated ads repeat across distinct farms.';

-- ── intake honours it, on the seeker lane only ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._lead_intake(p_source text, p_source_ref text, p_raw_excerpt text, p_structured jsonb, p_confidence numeric DEFAULT 1, p_missing_fields text[] DEFAULT '{}'::text[])
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
  -- NULL on every employer post and on any seeker post too short to identify. Every use
  -- below is guarded on IS NOT NULL, so a NULL here is exactly the pre-092 behaviour.
  v_body_key text := CASE WHEN v_type = 'seeker'
                          THEN public._lead_body_key(p_raw_excerpt) END;
  v_dupe_id uuid;
  v_suspect_id uuid;
  v_staging_id uuid;
  v_dedupe text := 'unique';
BEGIN
  -- Audit F-21: was `s.fingerprint = v_fp`, i.e. the region-bearing dedupe key. Everything
  -- below still uses v_fp for dedupe — only this check changed.
  -- 092: a seeker opt-out is also stored under the body key, so a second handle carrying the
  -- same post is stopped here rather than landing in the queue looking brand new.
  IF EXISTS (SELECT 1 FROM lead_suppression s
              WHERE s.fingerprint = public._lead_suppression_key(v_name, v_type)
                 OR (v_body_key IS NOT NULL AND s.fingerprint = v_body_key)) THEN
    RETURN jsonb_build_object('outcome', 'suppressed');
  END IF;

  SELECT l.id INTO v_dupe_id FROM leads l
  WHERE (p_source_ref IS NOT NULL AND l.source_ref = p_source_ref)
     OR l.fingerprint = v_fp
  LIMIT 1;
  IF v_dupe_id IS NOT NULL THEN
    RETURN jsonb_build_object('outcome', 'exact_duplicate', 'duplicate_of', v_dupe_id);
  END IF;

  -- `leads` carries no raw_excerpt, so the body check can only run against staging. That is
  -- where the seeker lane lives anyway — seeker rows are messaged from lead_staging and are
  -- never promoted.
  IF EXISTS (SELECT 1 FROM lead_staging st
             WHERE st.review_status = 'pending'
               AND (public._lead_fingerprint(st.structured->>'display_name',
                                             st.structured->>'region',
                                             st.structured->>'type') = v_fp
                    OR (v_body_key IS NOT NULL
                        AND st.structured->>'type' = 'seeker'
                        AND public._lead_body_key(st.raw_excerpt) = v_body_key))) THEN
    RETURN jsonb_build_object('outcome', 'exact_duplicate');
  END IF;

  IF v_name IS NOT NULL THEN
    SELECT l.id INTO v_suspect_id FROM leads l
    WHERE l.type = v_type
      AND coalesce(l.region, '') = coalesce(v_region, '')
      AND similarity(l.display_name, v_name) >= 0.6
    ORDER BY similarity(l.display_name, v_name) DESC
    LIMIT 1;

    IF v_suspect_id IS NOT NULL THEN
      v_dedupe := 'suspect_duplicate';
    ELSIF EXISTS (
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
      v_dedupe := 'suspect_duplicate';
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

-- ── the writer stores both keys, or the intake check above finds nothing ────────────────
CREATE OR REPLACE FUNCTION public.admin_lead_reject(p_staging_id uuid, p_suppress boolean DEFAULT false, p_reason text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_st record;
  v_fp text;
  v_body_key text;
BEGIN
  PERFORM public._admin_gate();

  SELECT * INTO v_st FROM lead_staging WHERE id = p_staging_id AND review_status = 'pending';
  IF v_st.id IS NULL THEN
    RAISE EXCEPTION 'Staging row not found or already reviewed';
  END IF;

  UPDATE lead_staging SET review_status = 'rejected', reviewed_at = now()
  WHERE id = p_staging_id;

  IF p_suppress THEN
    -- Audit F-21: was _lead_fingerprint. A row written here had to match what _lead_intake
    -- looks up; leaving this on the old key would suppress nothing.
    v_fp := public._lead_suppression_key(v_st.structured->>'display_name',
                                         v_st.structured->>'type');
    INSERT INTO lead_suppression (fingerprint, reason)
    VALUES (v_fp, coalesce(p_reason, 'rejected_at_review'))
    ON CONFLICT (fingerprint) DO NOTHING;

    -- 092: second row for the seeker lane. Two rows rather than one composite key, because
    -- the intake check is an OR over fingerprints and either alone must be sufficient — a
    -- re-post under the SAME handle is caught by the name key even when the body was edited,
    -- and a re-post under a NEW handle is caught by the body key.
    IF v_st.structured->>'type' = 'seeker' THEN
      v_body_key := public._lead_body_key(v_st.raw_excerpt);
      IF v_body_key IS NOT NULL THEN
        INSERT INTO lead_suppression (fingerprint, reason)
        VALUES (v_body_key, coalesce(p_reason, 'rejected_at_review'))
        ON CONFLICT (fingerprint) DO NOTHING;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (v_caller_id, CASE WHEN p_suppress THEN 'lead_reject_suppress' ELSE 'lead_reject' END,
          'lead_staging', p_staging_id, jsonb_build_object('reason', p_reason));

  RETURN jsonb_build_object('rejected', true, 'suppressed', p_suppress);
END;
$function$;

COMMIT;

-- KNOWN GAP, deliberately not closed here: `admin_lead_suppress` (087, promoted `leads`)
-- cannot write a body key, because `leads` carries no raw_excerpt and holds no reference back
-- to the staging row it came from. That is correct for now — the employer lane is the only
-- one that promotes, and the employer lane is not getting body keys. If seeker rows ever
-- promote to `leads`, this becomes a live hole: carry the excerpt or a staging_id across.
