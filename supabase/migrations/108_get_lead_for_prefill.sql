-- 108 — ?lead= read-only prefill for the post-a-job wizard.
--
-- Outreach links will carry ?lead=<lead_staging id> so an employer who
-- clicked through from their own Facebook post lands on their own job,
-- pre-filled from the lead_staging structured data, instead of a blank form.
-- This migration is only the read side: one RPC the wizard calls on mount.
-- The full signup-to-publish flow (parking ?lead= across signup, redirecting
-- to /jobs/new?lead= after onboarding) is a separate, later change.
--
-- What this adds, and deliberately nothing more:
--
--   1. get_lead_for_prefill(uuid) — SECURITY DEFINER, authenticated only.
--      Returns job fields ONLY (role, region, locality, shed_type,
--      herd_details, plus id and source_ref for provenance). The contact
--      object in structured (email, phone, name) is NEVER returned: a
--      callable-by-any-logged-in-user RPC that leaked it would hand every
--      captured lead's contact details to anyone who guesses a UUID.
--      Approved employer rows only — a pending row is not a job yet, and a
--      seeker row is a person looking for work, not a role to post.
--
-- NOT added: any write. Prefill is a draft in the browser; publish is still
-- the employer's click, and no lead_staging row is ever auto-inserted into
-- the public jobs table (Data_Architecture.md: leads do not auto-insert,
-- human approval first).
--
-- Untested against a live row: the test-batch leads live in Sheets, not
-- lead_staging, so no approved employer row exists to call this with yet.
-- Verify end to end after the 46 test-batch leads are imported (plan §5),
-- on staging first: one imported lead, /jobs/new?lead=<its id>, as a
-- logged-in employer with onboarding complete.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_lead_for_prefill(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_st record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Approved employer rows only (see header).
  SELECT st.id, st.source_ref, st.structured INTO v_st
  FROM public.lead_staging st
  WHERE st.id = p_lead_id
    AND st.review_status = 'approved'
    AND st.structured->>'type' = 'employer';

  IF v_st.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Job fields ONLY. structured->'contact' is deliberately absent.
  RETURN jsonb_build_object(
    'id', v_st.id,
    'source_ref', v_st.source_ref,
    'role', v_st.structured->>'role_or_category',
    'region', v_st.structured->>'region',
    'locality', v_st.structured->>'locality',
    'shed_type', v_st.structured->>'shed_type',
    'herd_details', v_st.structured->>'herd_details'
  );
END;
$$;

-- CORRECTED 037 pattern: no PUBLIC grant at birth; authenticated only.
REVOKE ALL ON FUNCTION public.get_lead_for_prefill(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_lead_for_prefill(uuid) TO authenticated;

COMMIT;
