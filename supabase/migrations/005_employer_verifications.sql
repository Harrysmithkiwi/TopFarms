-- ============================================================
-- 005_employer_verifications.sql
-- TopFarms — Employer verification tracking table
-- 5-method verification system with RLS (EVER-01)
-- ============================================================

CREATE TABLE public.employer_verifications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id    uuid NOT NULL REFERENCES public.employer_profiles(id) ON DELETE CASCADE,
  method         text NOT NULL CHECK (method IN ('email', 'phone', 'nzbn', 'document', 'farm_photo')),
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  nzbn_number    text,
  document_url   text,
  verified_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employer_verifications_employer_method_key UNIQUE (employer_id, method)
);

ALTER TABLE public.employer_verifications ENABLE ROW LEVEL SECURITY;

-- Employer can manage (view, insert, update) their own verifications
CREATE POLICY "employers manage own verifications"
ON public.employer_verifications FOR ALL
TO authenticated
USING (
  employer_id IN (
    SELECT id FROM public.employer_profiles WHERE user_id = auth.uid()
  )
  AND public.get_user_role(auth.uid()) = 'employer'
)
WITH CHECK (
  employer_id IN (
    SELECT id FROM public.employer_profiles WHERE user_id = auth.uid()
  )
  AND public.get_user_role(auth.uid()) = 'employer'
);

-- Seekers can view verifications (for trust badge on job listings)
CREATE POLICY "seekers view employer verifications"
ON public.employer_verifications FOR SELECT
TO authenticated
USING (public.get_user_role(auth.uid()) = 'seeker');

-- Public (anon) can view verifications for visitor job detail page
CREATE POLICY "anon view employer verifications"
ON public.employer_verifications FOR SELECT
TO anon
USING (true);
