-- 046: keep + categorise — follow_up lifecycle + overseas classification.
--
-- ███ APPROVED 2026-06-27 (leads-triage design session, T0) — apply via Supabase
-- Studio SQL Editor per CLAUDE §2. Idempotent (ADD COLUMN IF NOT EXISTS /
-- DROP+ADD CONSTRAINT / CREATE OR REPLACE) — safe to re-run if partially applied. ███
--
-- Design (2026-06-16): two orthogonal axes.
--   STATUS    = pipeline lifecycle (new/contacted/onboarded/dead/follow_up)
--   CATEGORY  = classification (domestic/overseas) — survives the lifecycle
-- follow_up_date is the "when", notes (existing) the "why". An overseas lead you
-- chase in July is category='overseas' AND status='follow_up' — two axes, not one
-- overloaded enum. Suppress stays junk-only. _lead_intake is insert-only, so a
-- re-harvest can never overwrite these fields (verified in 041).

BEGIN;

-- "When" + "what kind" (additive; existing rows backfill to domestic).
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS follow_up_date date;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'domestic';
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_category_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_category_check
  CHECK (category IN ('domestic', 'overseas'));

-- Status axis gains 'follow_up'. Lock the enum at the DB (deterministic guard —
-- a typo'd status would silently break pipeline filters). Widening this CHECK is
-- a deliberate, reviewed act (operator chose this over free-text, 2026-06-16).
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check
  CHECK (status IN ('new', 'contacted', 'onboarded', 'dead', 'follow_up'));

-- Park-with-reason-and-when in one gate-guarded, audited call. Updates only the
-- fields supplied (NULL = leave unchanged); p_clear_follow_up_date wipes the date
-- explicitly (since NULL means "unchanged"). 023 pattern: gate first, SET
-- search_path, jsonb return. status_changed_at bumps only on a real status change.
CREATE OR REPLACE FUNCTION public.admin_lead_categorise(
  p_lead_id uuid,
  p_status text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_follow_up_date date DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_clear_follow_up_date boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_lead leads;
BEGIN
  PERFORM public._admin_gate();

  UPDATE leads SET
    status = coalesce(p_status, status),
    status_changed_at = CASE WHEN p_status IS NOT NULL AND p_status <> status
                             THEN now() ELSE status_changed_at END,
    category = coalesce(p_category, category),
    follow_up_date = CASE WHEN p_clear_follow_up_date THEN NULL
                          ELSE coalesce(p_follow_up_date, follow_up_date) END,
    notes = coalesce(p_notes, notes)
  WHERE id = p_lead_id
  RETURNING * INTO v_lead;

  IF v_lead.id IS NULL THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (v_caller_id, 'lead_categorise', 'leads', p_lead_id,
          jsonb_build_object('status', v_lead.status, 'category', v_lead.category,
                             'follow_up_date', v_lead.follow_up_date));

  RETURN jsonb_build_object('lead_id', v_lead.id, 'status', v_lead.status,
                            'category', v_lead.category,
                            'follow_up_date', v_lead.follow_up_date);
END;
$$;

-- Corrected-037 grants: revoke the implicit PUBLIC grant (anon inherits it), then
-- grant only authenticated. The _admin_gate inside still enforces admin role.
REVOKE ALL ON FUNCTION public.admin_lead_categorise(uuid, text, text, date, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_lead_categorise(uuid, text, text, date, text, boolean) TO authenticated;

-- Widen the pipeline list to carry category, follow_up_date, and the 044 rich
-- fields (salary/summary/recruiter) so the detail panel has full context when
-- deciding whether to chase a lead. PURELY ADDITIVE to the SELECT — gate, search,
-- count, ordering, and pagination are unchanged from 041. CREATE OR REPLACE
-- preserves existing grants.
CREATE OR REPLACE FUNCTION public.admin_leads_list(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
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
           l.notes, l.status, l.status_changed_at, l.converted_user_id,
           l.category, l.follow_up_date,
           l.salary_text, l.summary, l.advertiser_name, l.is_recruiter
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

COMMIT;
