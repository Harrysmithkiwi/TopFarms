-- 047: lead triage + Lane B outreach (Phase 1, PHASE-1-SPEC.md, approved 2026-06-27)
--
-- ███ STAGED — apply via Supabase Studio SQL Editor per CLAUDE §2, AFTER 046 is
-- confirmed applied. Idempotent (ADD COLUMN IF NOT EXISTS / CREATE … IF NOT
-- EXISTS / CREATE OR REPLACE) — safe to re-run. ███
--
-- ADDITIVE ONLY. Does NOT modify _lead_intake, _lead_fingerprint, or any
-- admin_lead_approve/reject/categorise/set_status (041/044/046). Zero `jobs` touch.
--
-- Lane + the FB extract fields (shed_type, herd_details, application_method,
-- source_group, post_timestamp) ride INSIDE lead_staging.structured (jsonb) — set
-- at intake by the lead-intake Edge Fn, passed through 041's _lead_intake
-- untouched. Only the MUTABLE outreach workflow state lives in columns here.
--
-- ⚠️ REQUIRED FOLLOW-UP (condition of columns-on-staging, operator 2026-06-27):
-- before any Lane B outreach can age past 30 days, reschedule the 041
-- `lead-staging-purge` cron so its pending branch also excludes
-- `outreach_status IN ('approved','sent','responded')`. Not done here (additive
-- rule) and not on the first-drafted-reply path; tracked in PHASE-1-SPEC.md.

BEGIN;

-- ─── ❶ Outreach workflow state (mutable) on lead_staging ─────────────────────
ALTER TABLE public.lead_staging
  ADD COLUMN IF NOT EXISTS outreach_status text NOT NULL DEFAULT 'none'
    CHECK (outreach_status IN ('none','drafted','approved','sent','responded','skipped')),
  ADD COLUMN IF NOT EXISTS drafted_reply text,
  ADD COLUMN IF NOT EXISTS draft_model   text,
  ADD COLUMN IF NOT EXISTS sent_at       timestamptz,
  ADD COLUMN IF NOT EXISTS responded_at  timestamptz;

-- Partial index for the Lane B queue (active outreach only).
CREATE INDEX IF NOT EXISTS lead_staging_outreach_idx
  ON public.lead_staging (outreach_status) WHERE outreach_status <> 'none';

-- ─── ❷ preferred_path STUB on leads (Phase 3 populates; Phase 5 funnel) ──────
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS preferred_path text
    CHECK (preferred_path IS NULL OR preferred_path IN ('human','self_serve'));

-- ─── ❸ Swappable reply-draft prompt-config (single row) ──────────────────────
-- Content is operator input (do-not rules, voice, template, groups); the Edge Fn
-- reads it at draft time so wording iterates with ZERO code change.
CREATE TABLE IF NOT EXISTS public.lead_outreach_config (
  id           smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  do_not_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  voice_guide  text,
  template     text,
  groups       jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{name,url,norms}]
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_outreach_config ENABLE ROW LEVEL SECURITY;
-- (no policies → deny-by-default; service_role bypasses RLS for the Edge Fn read;
--  admin reads/writes via the RPCs below.)

-- Seed the single config row (placeholder — operator fills via admin_outreach_set_config).
INSERT INTO public.lead_outreach_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ─── Internal seed RPC (service_role; called by lead-intake after _lead_intake) ─
CREATE OR REPLACE FUNCTION public._lead_outreach_seed(
  p_staging_id uuid,
  p_draft text,
  p_model text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lane text;
BEGIN
  SELECT structured->>'lane' INTO v_lane FROM lead_staging WHERE id = p_staging_id;
  IF v_lane IS NULL THEN
    RAISE EXCEPTION 'Staging row not found';
  END IF;
  IF v_lane <> 'b' THEN
    -- Lane A rows need no FB outreach; leave outreach_status='none'.
    RETURN jsonb_build_object('seeded', false, 'reason', 'not_lane_b');
  END IF;

  UPDATE lead_staging
  SET drafted_reply = p_draft, draft_model = p_model, outreach_status = 'drafted'
  WHERE id = p_staging_id;

  RETURN jsonb_build_object('seeded', true, 'staging_id', p_staging_id);
END;
$$;

-- ─── Admin RPCs (023 pattern: gate first, jsonb out, audit on mutation) ──────

-- Lane B outreach queue.
CREATE OR REPLACE FUNCTION public.admin_outreach_list(
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
    ORDER BY st.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END;
$$;

-- Founder edits the draft + (default) approves it.
CREATE OR REPLACE FUNCTION public.admin_outreach_update_draft(
  p_staging_id uuid,
  p_draft text,
  p_status text DEFAULT 'approved'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_lane text;
BEGIN
  PERFORM public._admin_gate();

  IF p_status NOT IN ('drafted','approved') THEN
    RAISE EXCEPTION 'update_draft status must be drafted or approved';
  END IF;

  SELECT structured->>'lane' INTO v_lane FROM lead_staging
  WHERE id = p_staging_id AND review_status = 'pending';
  IF v_lane IS NULL THEN
    RAISE EXCEPTION 'Staging row not found or already reviewed';
  END IF;
  IF v_lane <> 'b' THEN
    RAISE EXCEPTION 'Not a Lane B row';
  END IF;

  UPDATE lead_staging
  SET drafted_reply = p_draft, outreach_status = p_status
  WHERE id = p_staging_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (v_caller_id, 'outreach_update_draft', 'lead_staging', p_staging_id,
          jsonb_build_object('status', p_status));

  RETURN jsonb_build_object('staging_id', p_staging_id, 'outreach_status', p_status);
END;
$$;

-- Mark the (manually-sent) reply as sent. Manual-send: founder pastes into FB.
CREATE OR REPLACE FUNCTION public.admin_outreach_mark_sent(
  p_staging_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_status text;
BEGIN
  PERFORM public._admin_gate();

  SELECT outreach_status INTO v_status FROM lead_staging
  WHERE id = p_staging_id AND review_status = 'pending';
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Staging row not found or already reviewed';
  END IF;
  IF v_status NOT IN ('drafted','approved') THEN
    RAISE EXCEPTION 'Can only mark sent from drafted/approved (was %)', v_status;
  END IF;

  UPDATE lead_staging
  SET outreach_status = 'sent', sent_at = now()
  WHERE id = p_staging_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (v_caller_id, 'outreach_mark_sent', 'lead_staging', p_staging_id, '{}'::jsonb);

  RETURN jsonb_build_object('staging_id', p_staging_id, 'outreach_status', 'sent');
END;
$$;

-- Mark a sent reply as responded (employer replied on FB). Phase 2 turns this
-- into add-contact-and-approve; for now it just advances the state.
CREATE OR REPLACE FUNCTION public.admin_outreach_mark_responded(
  p_staging_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_status text;
BEGIN
  PERFORM public._admin_gate();

  SELECT outreach_status INTO v_status FROM lead_staging
  WHERE id = p_staging_id AND review_status = 'pending';
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Staging row not found or already reviewed';
  END IF;
  IF v_status <> 'sent' THEN
    RAISE EXCEPTION 'Can only mark responded from sent (was %)', v_status;
  END IF;

  UPDATE lead_staging
  SET outreach_status = 'responded', responded_at = now()
  WHERE id = p_staging_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (v_caller_id, 'outreach_mark_responded', 'lead_staging', p_staging_id, '{}'::jsonb);

  RETURN jsonb_build_object('staging_id', p_staging_id, 'outreach_status', 'responded');
END;
$$;

-- Drop a Lane B row out of the active queue.
CREATE OR REPLACE FUNCTION public.admin_outreach_skip(
  p_staging_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
BEGIN
  PERFORM public._admin_gate();

  UPDATE lead_staging SET outreach_status = 'skipped'
  WHERE id = p_staging_id AND review_status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staging row not found or already reviewed';
  END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (v_caller_id, 'outreach_skip', 'lead_staging', p_staging_id,
          jsonb_build_object('reason', p_reason));

  RETURN jsonb_build_object('staging_id', p_staging_id, 'outreach_status', 'skipped');
END;
$$;

-- Read / write the swappable prompt-config.
CREATE OR REPLACE FUNCTION public.admin_outreach_get_config()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  PERFORM public._admin_gate();
  SELECT to_jsonb(c) INTO v FROM lead_outreach_config c WHERE id = 1;
  RETURN coalesce(v, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_outreach_set_config(
  p_config jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
BEGIN
  PERFORM public._admin_gate();

  INSERT INTO lead_outreach_config (id, do_not_rules, voice_guide, template, groups, updated_at)
  VALUES (
    1,
    coalesce(p_config->'do_not_rules', '[]'::jsonb),
    p_config->>'voice_guide',
    p_config->>'template',
    coalesce(p_config->'groups', '[]'::jsonb),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    do_not_rules = excluded.do_not_rules,
    voice_guide  = excluded.voice_guide,
    template     = excluded.template,
    groups       = excluded.groups,
    updated_at   = now();

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (v_caller_id, 'outreach_set_config', 'lead_outreach_config', NULL, '{}'::jsonb);

  RETURN jsonb_build_object('updated', true);
END;
$$;

-- ─── Grants (corrected-037 pattern — PUBLIC + anon stripped at birth) ────────
REVOKE ALL ON FUNCTION public._lead_outreach_seed(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_outreach_list(text, int, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_outreach_update_draft(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_outreach_mark_sent(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_outreach_mark_responded(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_outreach_skip(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_outreach_get_config() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_outreach_set_config(jsonb) FROM PUBLIC, anon;

-- _lead_outreach_seed: service_role ONLY (the Edge Fn lane).
GRANT EXECUTE ON FUNCTION public._lead_outreach_seed(uuid, text, text) TO service_role;

GRANT EXECUTE ON FUNCTION public.admin_outreach_list(text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_outreach_update_draft(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_outreach_mark_sent(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_outreach_mark_responded(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_outreach_skip(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_outreach_get_config() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_outreach_set_config(jsonb) TO authenticated;

COMMIT;
