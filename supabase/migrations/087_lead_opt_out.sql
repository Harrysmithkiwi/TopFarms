-- 087 — An opt-out can actually be recorded (audit finding F-21, Tier 0)
--
-- COMPLIANCE, not code quality. `docs/OUTREACH-EMAIL.md:52` documents a control that does not
-- exist: `lead_suppression` is written in exactly one place, `admin_lead_reject` (041:347),
-- which requires a *staging* row. Once a lead is promoted to `leads` there is no way to record
-- that they asked not to be contacted — no RPC, and `AdminLeads.tsx:55` offers only
-- new/contacted/onboarded/dead. Marking someone `dead` records a judgement about the lead; it
-- does not record their instruction.
--
-- Timing is why this goes first. Measured on prod 2026-08-17: 104 staged leads, 2 promoted,
-- **0 contacted**, and `lead_suppression` is empty. Nothing has been sent yet, so right now the
-- gap has cost nothing. From the first send onward, anyone replying "stop" has no recordable
-- opt-out and the next harvest re-surfaces them.
--
-- ── the second half, which the RPC alone would not fix ──────────────────────────────────
--
-- Suppression was keyed on `_lead_fingerprint` = name|region|type. That key is right for
-- DEDUPE and wrong for SUPPRESSION, and the two jobs were sharing one function:
--
--   dedupe       wants MORE specificity — merging two distinct farms is the failure.
--   suppression  wants LESS — re-emailing someone who opted out is the failure.
--
-- `region` is null on roughly 1 row in 11 (081:13). So a farm suppressed while carrying
-- "Waikato" produces a DIFFERENT key when re-harvested with region null, and sails straight
-- through the check in `_lead_intake`. The opt-out silently stops holding.
--
-- Hence a separate `_lead_suppression_key(name, type)`. `_lead_fingerprint` is left exactly as
-- it is and `leads.fingerprint` is untouched — dedupe behaviour does not change, and there is
-- no backfill.
--
-- KNOWN TRADE-OFF, accepted deliberately: two genuinely different farms sharing a name in
-- different regions now suppress together. That is a false positive — a lead you could have
-- contacted and won't. The alternative is a false negative: emailing someone who opted out.
-- For a compliance control the safe direction is obvious, and it is the direction the audit
-- recommended ("Key on name+type").

BEGIN;

-- ── suppression key ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._lead_suppression_key(p_name text, p_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(regexp_replace(coalesce(p_name, ''), '[^a-zA-Z0-9]+', '', 'g'))
         || '|' || lower(coalesce(p_type, ''));
$$;

COMMENT ON FUNCTION public._lead_suppression_key(text, text) IS
  'Opt-out key: name + type, deliberately WITHOUT region (audit F-21). region is null ~1 row in 11, so a region-bearing key lets a re-harvest of the same farm miss an existing suppression. Distinct from _lead_fingerprint, which keeps region because dedupe wants the opposite bias.';

-- Re-key any rows written under the old name|region|type format. Verified empty on prod
-- 2026-08-17, so this is insurance rather than a data migration — but a suppression row that
-- silently stopped matching is precisely the failure this migration exists to prevent.
UPDATE public.lead_suppression
   SET fingerprint = split_part(fingerprint, '|', 1) || '|' || split_part(fingerprint, '|', 3)
 WHERE fingerprint ~ '^[^|]*\|[^|]*\|[^|]*$';

-- ── the intake check now reads the suppression key ──────────────────────────────────────
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
  v_dupe_id uuid;
  v_suspect_id uuid;
  v_staging_id uuid;
  v_dedupe text := 'unique';
BEGIN
  -- Audit F-21: was `s.fingerprint = v_fp`, i.e. the region-bearing dedupe key. Everything
  -- below still uses v_fp for dedupe — only this check changed.
  IF EXISTS (SELECT 1 FROM lead_suppression s
              WHERE s.fingerprint = public._lead_suppression_key(v_name, v_type)) THEN
    RETURN jsonb_build_object('outcome', 'suppressed');
  END IF;

  SELECT l.id INTO v_dupe_id FROM leads l
  WHERE (p_source_ref IS NOT NULL AND l.source_ref = p_source_ref)
     OR l.fingerprint = v_fp
  LIMIT 1;
  IF v_dupe_id IS NOT NULL THEN
    RETURN jsonb_build_object('outcome', 'exact_duplicate', 'duplicate_of', v_dupe_id);
  END IF;

  IF EXISTS (SELECT 1 FROM lead_staging st
             WHERE st.review_status = 'pending'
               AND public._lead_fingerprint(st.structured->>'display_name',
                                            st.structured->>'region',
                                            st.structured->>'type') = v_fp) THEN
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

-- ── the staging-side writer uses the same key, or the two disagree ──────────────────────
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
  END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (v_caller_id, CASE WHEN p_suppress THEN 'lead_reject_suppress' ELSE 'lead_reject' END,
          'lead_staging', p_staging_id, jsonb_build_object('reason', p_reason));

  RETURN jsonb_build_object('rejected', true, 'suppressed', p_suppress);
END;
$function$;

-- ── the missing control: suppress from a PROMOTED lead ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_lead_suppress(
  p_lead_id uuid,
  p_reason  text DEFAULT 'opted_out'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_lead record;
  v_key  text;
BEGIN
  PERFORM public._admin_gate();

  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
  IF v_lead.id IS NULL THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  v_key := public._lead_suppression_key(v_lead.display_name, v_lead.type);

  -- DO UPDATE, not DO NOTHING: a row may already exist from `rejected_at_review`, and an
  -- explicit opt-out is the more important reason to have on record. The audit log keeps the
  -- history, so nothing is lost by letting the latest instruction win.
  INSERT INTO public.lead_suppression (fingerprint, reason)
  VALUES (v_key, coalesce(nullif(btrim(p_reason), ''), 'opted_out'))
  ON CONFLICT (fingerprint) DO UPDATE SET reason = EXCLUDED.reason;

  -- Recording the instruction and leaving the lead in the work list would be half a control.
  -- `dead` is the existing terminal status; the REASON this one is dead lives in
  -- lead_suppression, which is what makes it an opt-out rather than a judgement call.
  UPDATE public.leads
     SET status = 'dead', status_changed_at = now()
   WHERE id = p_lead_id AND status IS DISTINCT FROM 'dead';

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (v_caller_id, 'lead_suppress', 'leads', p_lead_id,
          jsonb_build_object('reason', p_reason, 'key', v_key,
                             'display_name', v_lead.display_name, 'type', v_lead.type));

  RETURN jsonb_build_object('suppressed', true, 'key', v_key);
END;
$$;

COMMENT ON FUNCTION public.admin_lead_suppress(uuid, text) IS
  'Records that a promoted lead asked not to be contacted (audit F-21). Writes lead_suppression so the next harvest cannot re-surface them, and marks the lead dead. Admin-gated. This control was documented in docs/OUTREACH-EMAIL.md but did not exist for anything past staging.';

REVOKE ALL ON FUNCTION public.admin_lead_suppress(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_lead_suppress(uuid, text) TO authenticated;

COMMIT;
