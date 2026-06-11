-- 042: leads L4 — wire the pipeline into the founder cockpit + conversion link
--
-- Three read/link RPCs, 023 pattern (gate-first definer, pinned search_path),
-- corrected-037 grants (REVOKE ALL FROM PUBLIC, anon; GRANT authenticated).
-- No new tables/policies. admin_analytics_leads is aggregate-only (cockpit);
-- the suggestion + link RPCs legitimately surface candidate-account PII to the
-- admin doing the linking (same as admin_list_* in 023 — admin sees PII,
-- gated) — this is NOT an analytics aggregate, so the 039 PII rule does not
-- apply to it by design.

BEGIN;

-- ── Cockpit block: lead counts + conversion (aggregate only) ─────────────────
CREATE OR REPLACE FUNCTION public.admin_analytics_leads()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  PERFORM public._admin_gate();
  RETURN jsonb_build_object(
    'total', (SELECT count(*) FROM leads),
    'by_status', jsonb_build_object(
      'new',       (SELECT count(*) FROM leads WHERE status = 'new'),
      'contacted', (SELECT count(*) FROM leads WHERE status = 'contacted'),
      'onboarded', (SELECT count(*) FROM leads WHERE status = 'onboarded'),
      'dead',      (SELECT count(*) FROM leads WHERE status = 'dead')
    ),
    'by_type', jsonb_build_object(
      'employer', (SELECT count(*) FROM leads WHERE type = 'employer'),
      'seeker',   (SELECT count(*) FROM leads WHERE type = 'seeker')
    ),
    'converted', (SELECT count(*) FROM leads WHERE converted_user_id IS NOT NULL),
    'pending_review', (SELECT count(*) FROM lead_staging WHERE review_status = 'pending')
  );
END;
$$;

-- ── Conversion suggestions (admin CRM linking; PII by necessity) ─────────────
-- For each OPEN lead (new/contacted, not yet converted), surface candidate
-- accounts: exact contact-email match, or fuzzy farm_name/business match
-- (employer leads). Suggestion only — the human confirms via the link RPC.
CREATE OR REPLACE FUNCTION public.admin_lead_conversion_suggestions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  PERFORM public._admin_gate();
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'lead_id', l.id,
      'lead_name', l.display_name,
      'lead_type', l.type,
      'candidate_user_id', cand.user_id,
      'candidate_email', cand.email,
      'match', cand.match_kind
    ) ORDER BY l.created_at DESC)
    FROM leads l
    JOIN LATERAL (
      -- exact email match against any account
      SELECT u.id AS user_id, u.email, 'email' AS match_kind
      FROM auth.users u
      WHERE l.contact->>'email' IS NOT NULL
        AND lower(u.email) = lower(l.contact->>'email')
      UNION
      -- employer leads: fuzzy farm_name match
      SELECT ep.user_id, u.email, 'farm_name' AS match_kind
      FROM employer_profiles ep
      JOIN auth.users u ON u.id = ep.user_id
      WHERE l.type = 'employer'
        AND ep.farm_name IS NOT NULL
        AND similarity(ep.farm_name, l.display_name) >= 0.6
      LIMIT 5
    ) cand ON true
    WHERE l.status IN ('new', 'contacted')
      AND l.converted_user_id IS NULL
  ), '[]'::jsonb);
END;
$$;

-- ── Link a lead to a real account (mutation + audit) ─────────────────────────
CREATE OR REPLACE FUNCTION public.admin_lead_link_user(
  p_lead_id uuid,
  p_user_id uuid
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

  IF NOT EXISTS (SELECT 1 FROM leads WHERE id = p_lead_id) THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  UPDATE leads
  SET converted_user_id = p_user_id, status = 'onboarded', status_changed_at = now()
  WHERE id = p_lead_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (v_caller_id, 'lead_link_user', 'leads', p_lead_id,
          jsonb_build_object('user_id', p_user_id));

  RETURN jsonb_build_object('lead_id', p_lead_id, 'converted_user_id', p_user_id);
END;
$$;

-- ── Grants (corrected-037 pattern) ───────────────────────────────────────────
REVOKE ALL ON FUNCTION public.admin_analytics_leads() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_lead_conversion_suggestions() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_lead_link_user(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_analytics_leads() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_lead_conversion_suggestions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_lead_link_user(uuid, uuid) TO authenticated;

COMMIT;
