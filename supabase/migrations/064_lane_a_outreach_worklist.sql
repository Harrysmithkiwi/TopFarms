-- 064: Lane-A outreach loop + leads worklist (Admin Portal v2 stretch #1/#2).
--
-- #1 gives contactable (Lane A) leads the same draft→send→track loop Lane B has:
--    an editable AI-drafted email stored on the lead, a "mark contacted" step.
-- #2 rolls the three leads surfaces into one worklist RPC (counts + due list).

-- ── Lane-A outreach columns on leads ─────────────────────────────────────────
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS drafted_email jsonb,        -- { subject, body } (lead-draft-email)
  ADD COLUMN IF NOT EXISTS draft_model text,           -- e.g. 'claude-sonnet-4-6' or 'template'
  ADD COLUMN IF NOT EXISTS contacted_at timestamptz;   -- set when marked contacted

-- Save an edited draft (the founder tweaks the AI copy before sending).
CREATE OR REPLACE FUNCTION public.admin_lead_save_draft(p_lead_id uuid, p_draft jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public._admin_gate();
  UPDATE leads SET drafted_email = p_draft WHERE id = p_lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found'; END IF;
  RETURN jsonb_build_object('saved', true);
END;
$function$;

-- Mark contacted — status='contacted' + contacted_at stamp (the Lane-A "sent").
CREATE OR REPLACE FUNCTION public.admin_lead_mark_contacted(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_before text;
BEGIN
  PERFORM public._admin_gate();
  SELECT status INTO v_before FROM leads WHERE id = p_lead_id;
  IF v_before IS NULL THEN RAISE EXCEPTION 'Lead not found'; END IF;

  UPDATE leads
     SET status = 'contacted', status_changed_at = now(), contacted_at = now()
   WHERE id = p_lead_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (v_caller_id, 'lead_mark_contacted', 'leads', p_lead_id,
          jsonb_build_object('before', v_before));

  RETURN jsonb_build_object('status', 'contacted');
END;
$function$;

-- ── Worklist rollup (#2) ─────────────────────────────────────────────────────
-- One call → the four numbers a founder acts on each morning, plus the
-- follow-ups actually due (so parked leads can't silently go cold).
CREATE OR REPLACE FUNCTION public.admin_leads_worklist()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v jsonb;
BEGIN
  PERFORM public._admin_gate();
  SELECT jsonb_build_object(
    'to_review', (SELECT count(*) FROM lead_staging WHERE review_status = 'pending'),
    'to_send', (SELECT count(*) FROM lead_staging
                 WHERE review_status = 'pending'
                   AND structured->>'lane' = 'b'
                   AND outreach_status IN ('drafted', 'approved')),
    'awaiting_reply',
      (SELECT count(*) FROM lead_staging WHERE review_status = 'pending' AND outreach_status = 'sent')
      + (SELECT count(*) FROM leads WHERE status = 'contacted'),
    'followups_due', (SELECT count(*) FROM leads
                       WHERE follow_up_date IS NOT NULL
                         AND follow_up_date <= current_date
                         AND status NOT IN ('dead', 'onboarded')),
    'followups', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', id, 'name', display_name, 'date', follow_up_date)
                       ORDER BY follow_up_date)
      FROM (
        SELECT id, display_name, follow_up_date FROM leads
        WHERE follow_up_date IS NOT NULL
          AND follow_up_date <= current_date
          AND status NOT IN ('dead', 'onboarded')
        ORDER BY follow_up_date LIMIT 10
      ) f), '[]'::jsonb)
  ) INTO v;
  RETURN v;
END;
$function$;

-- Grants: authenticated + service_role only (admin enforced inside via _admin_gate).
REVOKE ALL ON FUNCTION public.admin_lead_save_draft(uuid, jsonb) FROM public;
REVOKE ALL ON FUNCTION public.admin_lead_mark_contacted(uuid) FROM public;
REVOKE ALL ON FUNCTION public.admin_leads_worklist() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_lead_save_draft(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_lead_mark_contacted(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_leads_worklist() TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.admin_lead_save_draft(uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_lead_mark_contacted(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_leads_worklist() FROM anon;
