-- 044: widen leads for the rich commercial-extract fields (Firecrawl lane)
--
-- ███ STAGED — DO NOT APPLY until reviewed (operator gate). ███
--
-- The Firecrawl /job/ extraction (proved 2026-06-12 on a real nzfarmingjobs ad)
-- returns more than the leads table stores: salary, a contact NAME + call-window
-- notes, the /company profile link, and a clean rewritten summary. Today's
-- `contact` jsonb only carries email/phone/url and there are no salary/summary/
-- profile columns — so approving such a lead would DROP that value. This adds
-- the columns + carries them through the approval RPC.
--
-- Contact normalisation note: lead-harvest assembles structured.contact =
-- {email,phone,url,name,notes} from Firecrawl's flat contact_* fields, so the
-- approval RPC keeps reading structured->'contact' unchanged (just richer keys).

BEGIN;

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS salary_text text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company_profile_url text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS summary text;

-- Carry the new fields from staging.structured at approval. Identical to the
-- migration-041 body plus salary_text / company_profile_url / summary.
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
                     source, source_ref, contact, notes, fingerprint,
                     salary_text, company_profile_url, summary)
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
                             v_st.structured->>'type'),
    v_st.structured->>'salary_text',
    v_st.structured->>'company_profile_url',
    v_st.structured->>'summary'
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

COMMIT;
