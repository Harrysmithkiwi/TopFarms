-- 041: leads pipeline L0 (PHASE-LEADS-DESIGN.md, approved + §9 decisions 2026-06-11)
--
-- Tables: lead_staging (30-day transient buffer), leads (post-approval),
-- lead_suppression (durable opt-out). RLS deny-by-default: enabled, ZERO
-- client policies — every read/write goes through SECURITY DEFINER RPCs
-- gated by _admin_gate(), grants per the CORRECTED 037 pattern
-- (REVOKE ALL FROM PUBLIC, anon at birth; explicit grants only).
--
-- Single intake door: _lead_intake() holds ALL intake logic (suppression
-- check -> dedupe -> staging insert). Two authenticated entries call it:
--   * admin_lead_capture()  — founder's manual capture (gate-first wrapper)
--   * lead-intake Edge Fn   — webhook lane (service_role; X-Webhook-Secret
--     checked in-function; verify_jwt=false so a JWT there is UNVERIFIED —
--     per CLAUDE §5 lesson the form does NOT use the Edge Fn)
--
-- Privacy mechanics in this file: human approval gate (only
-- admin_lead_approve moves staging -> leads); durable suppression (intake
-- refuses suppressed fingerprints — a later cron cycle CANNOT re-create an
-- opted-out lead); 30-day staging purge cron; 6-month dead-lead anonymise
-- cron that GENUINELY strips PII in place (name/contact/notes/source_ref
-- nulled) — not a soft-delete flag.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL CHECK (type IN ('employer', 'seeker')),
  display_name text NOT NULL,
  region text,
  role_or_category text,
  skills uuid[] NOT NULL DEFAULT '{}',
  source text NOT NULL CHECK (source IN ('seek', 'trademe', 'fb_own_group', 'fb_manual_capture')),
  source_ref text,
  contact jsonb,
  notes text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'onboarded', 'dead')),
  status_changed_at timestamptz NOT NULL DEFAULT now(),
  converted_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  fingerprint text NOT NULL
);
CREATE INDEX IF NOT EXISTS leads_fingerprint_idx ON public.leads (fingerprint);
CREATE INDEX IF NOT EXISTS leads_status_idx ON public.leads (status);
CREATE INDEX IF NOT EXISTS leads_name_trgm_idx ON public.leads USING gin (display_name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS public.lead_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL CHECK (source IN ('seek', 'trademe', 'fb_own_group', 'fb_manual_capture')),
  source_ref text,
  raw_excerpt text,
  structured jsonb NOT NULL,
  confidence numeric NOT NULL DEFAULT 1 CHECK (confidence >= 0 AND confidence <= 1),
  missing_fields text[] NOT NULL DEFAULT '{}',
  dedupe_status text NOT NULL DEFAULT 'unique' CHECK (dedupe_status IN ('unique', 'suspect_duplicate', 'exact_duplicate')),
  dedupe_match_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.lead_suppression (
  fingerprint text PRIMARY KEY,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Deny-by-default: RLS on, no policies (admin_audit_log posture).
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_suppression ENABLE ROW LEVEL SECURITY;

-- ─── Fingerprint helper (internal) ───────────────────────────────────────────
-- "Same lead" = normalised name + region + type (design §5).
CREATE OR REPLACE FUNCTION public._lead_fingerprint(p_name text, p_region text, p_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(regexp_replace(coalesce(p_name, ''), '[^a-zA-Z0-9]+', '', 'g'))
         || '|' || lower(coalesce(p_region, '')) || '|' || lower(coalesce(p_type, ''));
$$;

-- ─── Single intake door (internal core) ──────────────────────────────────────
-- NOT client-callable. Returns {outcome: inserted|suppressed|exact_duplicate,
-- staging_id?, duplicate_of?}. ALL intake paths route through here so the
-- suppression check can never be bypassed.
CREATE OR REPLACE FUNCTION public._lead_intake(
  p_source text,
  p_source_ref text,
  p_raw_excerpt text,
  p_structured jsonb,
  p_confidence numeric DEFAULT 1,
  p_missing_fields text[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Fuzzy suspect: similar name, same region + type (human decides).
  IF v_name IS NOT NULL THEN
    SELECT l.id INTO v_suspect_id FROM leads l
    WHERE l.type = v_type
      AND coalesce(l.region, '') = coalesce(v_region, '')
      AND similarity(l.display_name, v_name) >= 0.6
    ORDER BY similarity(l.display_name, v_name) DESC
    LIMIT 1;
    IF v_suspect_id IS NOT NULL THEN
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
$$;

-- ─── Admin RPCs (023 pattern: gate first, jsonb out, audit on mutation) ──────

-- Manual capture (founder's day-one path; L1 adds Claude structuring upstream).
CREATE OR REPLACE FUNCTION public.admin_lead_capture(
  p_source text,
  p_source_ref text,
  p_raw_excerpt text,
  p_structured jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._admin_gate();
  RETURN public._lead_intake(p_source, p_source_ref, p_raw_excerpt, p_structured);
END;
$$;

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
           OR st.source ILIKE '%' || p_search || '%')
    ORDER BY st.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_leads_list(
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

  SELECT count(*) INTO v_total FROM leads l
  WHERE (p_search IS NULL OR p_search = ''
         OR l.display_name ILIKE '%' || p_search || '%'
         OR l.region ILIKE '%' || p_search || '%'
         OR l.status ILIKE '%' || p_search || '%'
         OR l.source ILIKE '%' || p_search || '%');

  SELECT coalesce(jsonb_agg(row_to_json(sub)), '[]'::jsonb) INTO v_rows FROM (
    SELECT l.id, l.created_at, l.approved_at, l.type, l.display_name, l.region,
           l.role_or_category, l.skills, l.source, l.source_ref, l.contact,
           l.notes, l.status, l.status_changed_at, l.converted_user_id
    FROM leads l
    WHERE (p_search IS NULL OR p_search = ''
           OR l.display_name ILIKE '%' || p_search || '%'
           OR l.region ILIKE '%' || p_search || '%'
           OR l.status ILIKE '%' || p_search || '%'
           OR l.source ILIKE '%' || p_search || '%')
    ORDER BY l.status_changed_at DESC
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END;
$$;

-- THE approval gate (privacy checkpoint): the ONLY path from staging to leads.
CREATE OR REPLACE FUNCTION public.admin_lead_approve(
  p_staging_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_st record;
  v_lead_id uuid;
BEGIN
  PERFORM public._admin_gate();

  SELECT * INTO v_st FROM lead_staging WHERE id = p_staging_id AND review_status = 'pending';
  IF v_st.id IS NULL THEN
    RAISE EXCEPTION 'Staging row not found or already reviewed';
  END IF;

  INSERT INTO leads (type, display_name, region, role_or_category, skills,
                     source, source_ref, contact, notes, fingerprint)
  VALUES (
    v_st.structured->>'type',
    coalesce(v_st.structured->>'display_name', '(unnamed)'),
    v_st.structured->>'region',
    v_st.structured->>'role_or_category',
    coalesce((SELECT array_agg(x::uuid) FROM jsonb_array_elements_text(v_st.structured->'skills') x), '{}'),
    v_st.source,
    v_st.source_ref,
    v_st.structured->'contact',
    p_notes,
    public._lead_fingerprint(v_st.structured->>'display_name',
                             v_st.structured->>'region',
                             v_st.structured->>'type')
  )
  RETURNING id INTO v_lead_id;

  UPDATE lead_staging SET review_status = 'approved', reviewed_at = now()
  WHERE id = p_staging_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (v_caller_id, 'lead_approve', 'leads', v_lead_id,
          jsonb_build_object('staging_id', p_staging_id, 'source', v_st.source));

  RETURN jsonb_build_object('lead_id', v_lead_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_lead_reject(
  p_staging_id uuid,
  p_suppress boolean DEFAULT false,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    v_fp := public._lead_fingerprint(v_st.structured->>'display_name',
                                     v_st.structured->>'region',
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
$$;

CREATE OR REPLACE FUNCTION public.admin_lead_set_status(
  p_lead_id uuid,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_before text;
BEGIN
  PERFORM public._admin_gate();

  SELECT status INTO v_before FROM leads WHERE id = p_lead_id;
  IF v_before IS NULL THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  UPDATE leads SET status = p_status, status_changed_at = now()
  WHERE id = p_lead_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (v_caller_id, 'lead_set_status', 'leads', p_lead_id,
          jsonb_build_object('before', v_before, 'after', p_status));

  RETURN jsonb_build_object('status', p_status);
END;
$$;

-- ─── Grants (corrected 037 pattern — explicit, PUBLIC stripped at birth) ─────
REVOKE ALL ON FUNCTION public._lead_fingerprint(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._lead_intake(text, text, text, jsonb, numeric, text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_lead_capture(text, text, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_leads_staging_list(text, int, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_leads_list(text, int, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_lead_approve(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_lead_reject(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_lead_set_status(uuid, text) FROM PUBLIC, anon;

-- _lead_intake: service_role ONLY (the Edge Function webhook lane).
GRANT EXECUTE ON FUNCTION public._lead_intake(text, text, text, jsonb, numeric, text[]) TO service_role;

GRANT EXECUTE ON FUNCTION public.admin_lead_capture(text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_leads_staging_list(text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_leads_list(text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_lead_approve(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_lead_reject(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_lead_set_status(uuid, text) TO authenticated;

-- ─── Retention crons (§9 decisions 3) ────────────────────────────────────────
-- Weekly: purge rejected staging rows + pending rows older than 30 days.
SELECT cron.schedule(
  'lead-staging-purge',
  '0 3 * * 0',
  $$DELETE FROM public.lead_staging
    WHERE review_status = 'rejected'
       OR (review_status = 'pending' AND created_at < now() - interval '30 days')$$
);

-- Monthly: GENUINELY anonymise dead leads after 6 months — PII stripped in
-- place (name/contact/notes/source_ref), aggregate row retained for funnel
-- stats. NOT a soft-delete flag (operator §9.3).
SELECT cron.schedule(
  'lead-dead-anonymise',
  '0 3 1 * *',
  $$UPDATE public.leads
    SET display_name = '[anonymised]', contact = NULL, notes = NULL,
        source_ref = NULL, fingerprint = '[anonymised]|' || id::text
    WHERE status = 'dead'
      AND status_changed_at < now() - interval '6 months'
      AND display_name <> '[anonymised]'$$
);

COMMIT;
