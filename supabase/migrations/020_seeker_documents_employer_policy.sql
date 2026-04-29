-- ============================================================
-- 020_seeker_documents_employer_policy.sql
-- TopFarms — Phase 14-03 / BFIX-02 + BFIX-03
--
-- Adds the employer SELECT policy on seeker_documents that migration 019
-- explicitly deferred to 14-03 (per its section 2 header). Without this
-- policy, employers querying seeker_documents directly via the anon client
-- (e.g. from ApplicantDocuments.tsx in the applicant expanded panel) hit
-- RLS default-deny and see zero rows — even though they're authorised to
-- view the applicant's CVs/certificates/references.
--
-- Defence-in-depth: this RLS policy hard-filters identity at the data
-- layer, paired with the Edge Function whitelist (get-applicant-document-url)
-- and the listing-query filter in ApplicantDocuments.tsx. Three layers,
-- all enforcing EMPLOYER_VISIBLE_DOCUMENT_TYPES = (cv | certificate | reference).
--
-- Predicate (3 conjuncts):
--   1. caller's role = 'employer' (project convention via get_user_role)
--   2. document_type ∈ EMPLOYER_VISIBLE_DOCUMENT_TYPES (identity excluded)
--   3. document.seeker_id is one whose owner has applied to one of the
--      caller's jobs (relationship walk: seeker → application → job → employer)
--
-- Privacy: conjunct 3 is the relationship walk. WITHOUT the JOIN + WHERE
-- filter, every employer would see every applicant's documents platform-wide.
-- All three INNER JOINs and the WHERE ep.user_id = auth.uid() are essential.
-- ============================================================

BEGIN;

CREATE POLICY "employers select applicant visible documents"
ON public.seeker_documents
FOR SELECT
USING (
  get_user_role(auth.uid()) = 'employer'
  AND document_type IN ('cv', 'certificate', 'reference')
  AND seeker_id IN (
    SELECT a.seeker_id
    FROM public.applications a
    INNER JOIN public.jobs j ON j.id = a.job_id
    INNER JOIN public.employer_profiles ep ON ep.id = j.employer_id
    WHERE ep.user_id = auth.uid()
  )
);

COMMENT ON POLICY "employers select applicant visible documents" ON public.seeker_documents IS
  'Pairs with the get-applicant-document-url Edge Function whitelist and ApplicantDocuments.tsx listing-query filter. All three layers enforce EMPLOYER_VISIBLE_DOCUMENT_TYPES (cv | certificate | reference) — identity hard-filtered at the data layer. Relationship walk: employer (auth.uid) → employer_profiles.id → jobs.employer_id → applications.job_id → applications.seeker_id → seeker_documents.seeker_id.';

COMMIT;
