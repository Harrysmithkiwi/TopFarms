-- 086 — Employer identity submissions go through a definer RPC (audit F-11, reopened)
--
-- 085 fixed the payloads but left `nzbn` and `document` writing directly, on the belief
-- (recorded in 085's header and in tests/employer-verification-writes.test.ts) that
-- DocumentUpload was "the writer that was already correct". Driving the flow on live prod
-- 2026-08-17 disproved that. Both are dead, and they die on the FIRST submit, not just a
-- resubmit:
--
--   POST /rest/v1/employer_verifications                        (plain INSERT)  → 201
--   POST /rest/v1/employer_verifications?on_conflict=...        (upsert)        → 42501
--   ...the same upsert for method='document'                                    → 42501
--
-- The payload was never the problem — the UPSERT FORM is. PostgREST renders
-- `.upsert(..., { onConflict: 'employer_id,method' })` as
-- `INSERT ... ON CONFLICT (employer_id, method) DO UPDATE SET ...` with the conflict-key
-- columns in the SET list, and Postgres checks UPDATE privilege at PLAN time — whether or
-- not a row actually conflicts. Live ACLs (pg_attribute.attacl, read 2026-08-17):
--
--   employer_id   a       INSERT only     ← no `w`, so the DO UPDATE never plans
--   method        a       INSERT only     ← same
--   nzbn_number   aw
--   document_url  aw
--   status        (none)  verified_at (none)
--
-- Table-level for `authenticated` is rdDxtm — no INSERT/UPDATE — so those column grants
-- are the whole story.
--
-- The fix is NOT to grant UPDATE on employer_id/method. That widens the ACL to buy back a
-- statement shape we do not need, and it would let a caller name the conflict target. It
-- is to route both writers through a definer RPC that derives the employer from auth.uid(),
-- exactly as 085 already did for email, phone and farm_photo.
--
-- The review step is preserved by NOT LETTING THE CALLER CHOOSE `status`, not by avoiding a
-- definer — a distinction 085's test got backwards. This function hard-codes 'pending'; the
-- caller has no say, and the admin queue still rules on every identity claim.
--
-- It also closes a second defect the direct write could not: because the browser held no
-- grant on `status`, a REJECTED employer who resubmitted kept status='rejected' attached to
-- brand-new evidence, and a VERIFIED one could swap the evidence under a verdict already
-- given. A resubmission is a fresh claim, so the prior verdict and its audit trail are
-- cleared and the row returns to the queue.

BEGIN;

CREATE OR REPLACE FUNCTION public.employer_submit_verification(
  p_method       text,
  p_nzbn         text DEFAULT NULL,
  p_document_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employer_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Only the two ADMIN-REVIEWED methods. email/phone belong to
  -- employer_sync_self_verifications(), farm_photo to employer_record_farm_photo(); routing
  -- either through here would let a caller park a self-verifying method in 'pending', and
  -- routing 'farm_photo' here would be a silent downgrade.
  IF p_method NOT IN ('nzbn', 'document') THEN
    RAISE EXCEPTION 'Unsupported verification method: %', p_method;
  END IF;

  IF p_method = 'nzbn' AND COALESCE(p_nzbn, '') !~ '^[0-9]{13}$' THEN
    RAISE EXCEPTION 'NZBN must be exactly 13 digits';
  END IF;

  IF p_method = 'document' AND btrim(COALESCE(p_document_url, '')) = '' THEN
    RAISE EXCEPTION 'A document URL is required';
  END IF;

  SELECT id INTO v_employer_id
    FROM public.employer_profiles
   WHERE user_id = auth.uid();

  IF v_employer_id IS NULL THEN
    RAISE EXCEPTION 'No employer profile';
  END IF;

  INSERT INTO public.employer_verifications
         (employer_id, method, status, nzbn_number, document_url)
  VALUES (v_employer_id, p_method, 'pending', p_nzbn, p_document_url)
  ON CONFLICT (employer_id, method) DO UPDATE
     -- COALESCE so a resubmission of one method cannot blank the other method's evidence
     -- column. Redundant while (employer_id, method) is the conflict key and each method
     -- fills only its own field, but it costs nothing and survives a schema change.
     SET nzbn_number      = COALESCE(EXCLUDED.nzbn_number, public.employer_verifications.nzbn_number),
         document_url     = COALESCE(EXCLUDED.document_url, public.employer_verifications.document_url),
         -- A resubmission is a NEW claim. Reopen it and drop the stale verdict.
         status           = 'pending',
         verified_at      = NULL,
         verified_by      = NULL,
         reviewed_at      = NULL,
         rejection_reason = NULL;
END;
$$;

COMMENT ON FUNCTION public.employer_submit_verification(text, text, text) IS
  'Submits an NZBN or ownership document for admin review on behalf of the calling employer (audit F-11, reopened 2026-08-17). Replaces a PostgREST .upsert() that returned 42501 on every attempt because ON CONFLICT DO UPDATE requires UPDATE on the conflict-key columns and `authenticated` holds INSERT only. Status is hard-coded to pending — the caller cannot self-verify — and a resubmission clears any prior verdict so the row returns to the queue.';

REVOKE ALL ON FUNCTION public.employer_submit_verification(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.employer_submit_verification(text, text, text) TO authenticated;

COMMIT;
