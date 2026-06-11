-- 044: widen leads for rich commercial-extract fields + recruiter split + the
-- nzfarmingjobs source value (Firecrawl /job/ lane)
--
-- ███ STAGED — DO NOT APPLY until reviewed (operator gate). Applied together
-- with the lead-harvest rewrite. ███
--
-- Firecrawl /job/ extraction (proved 2026-06-12 on real nzfarmingjobs ads,
-- incl. the never-infer rule) returns more than leads stores: salary, a contact
-- NAME + call-window notes, the /company profile link, a clean summary, AND the
-- recruiter-vs-employer split (an agency like "Rural Directions" places ads for
-- a farm like "Otamatea Station" — the farm is the lead, the recruiter is the
-- channel). Approving such a lead must not drop any of that.
--
-- Contact normalisation: lead-harvest assembles structured.contact =
-- {email,phone,url,name,notes} from Firecrawl's flat contact_* fields, so the
-- approval RPC keeps reading structured->'contact' (just richer keys, no DDL).

BEGIN;

-- Rich columns
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS salary_text text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company_profile_url text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS summary text;
-- Recruiter split: business_name stays the HIRING FARM; advertiser_name is the
-- agency/placer when distinct; is_recruiter flags agency-placed ads.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS advertiser_name text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_recruiter boolean NOT NULL DEFAULT false;

-- Source-value widening: add 'nzfarmingjobs' to BOTH source CHECKs (lead_staging
-- is written first by _lead_intake; leads at approval). Inline CHECKs from 041
-- are auto-named <table>_source_check.
ALTER TABLE public.lead_staging DROP CONSTRAINT IF EXISTS lead_staging_source_check;
ALTER TABLE public.lead_staging ADD CONSTRAINT lead_staging_source_check
  CHECK (source IN ('seek', 'trademe', 'fb_own_group', 'fb_manual_capture', 'nzfarmingjobs'));
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_source_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_source_check
  CHECK (source IN ('seek', 'trademe', 'fb_own_group', 'fb_manual_capture', 'nzfarmingjobs'));

-- Carry the new fields from staging.structured at approval. PURELY ADDITIVE vs
-- migration 041: _admin_gate() stays first, the pending-row guard, the
-- staging->approved UPDATE, and the audit insert are unchanged. Suppression +
-- dedupe live in _lead_intake (NOT touched here).
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
                     salary_text, company_profile_url, summary,
                     advertiser_name, is_recruiter)
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
    v_st.structured->>'summary',
    v_st.structured->>'advertiser_name',
    coalesce((v_st.structured->>'is_recruiter')::boolean, false)
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
