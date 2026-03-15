-- ============================================================
-- 002_rls_policies.sql
-- TopFarms — Row Level Security policies
-- Security definer helper functions prevent RLS recursion
-- ============================================================

-- ============================================================
-- Helper Functions (security definer)
-- ============================================================

-- get_user_role: reads user role from user_roles table
-- Used in RLS policies to avoid recursive calls
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = p_user_id;
$$;

-- handle_new_user: trigger function that creates user_roles row
-- on auth.users insert, reading role from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'seeker')
  );
  RETURN NEW;
END;
$$;

-- Trigger: create user_roles row atomically with auth.users creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 1. user_roles — RLS Policies
-- Users can read their own role.
-- Insert/update handled by trigger only (no direct client access).
-- ============================================================

CREATE POLICY "user_roles: users read own role"
  ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- 2. employer_profiles — RLS Policies
-- ============================================================

CREATE POLICY "employer_profiles: employers manage own"
  ON public.employer_profiles
  FOR ALL
  USING (
    user_id = auth.uid()
    AND public.get_user_role(auth.uid()) = 'employer'
  )
  WITH CHECK (
    user_id = auth.uid()
    AND public.get_user_role(auth.uid()) = 'employer'
  );

CREATE POLICY "employer_profiles: seekers can view"
  ON public.employer_profiles
  FOR SELECT
  USING (public.get_user_role(auth.uid()) = 'seeker');

-- ============================================================
-- 3. seeker_profiles — RLS Policies
-- ============================================================

CREATE POLICY "seeker_profiles: seekers manage own"
  ON public.seeker_profiles
  FOR ALL
  USING (
    user_id = auth.uid()
    AND public.get_user_role(auth.uid()) = 'seeker'
  )
  WITH CHECK (
    user_id = auth.uid()
    AND public.get_user_role(auth.uid()) = 'seeker'
  );

-- Employers can view seeker profiles where seeker is open to work
-- Contact fields are in seeker_contacts, not here
CREATE POLICY "seeker_profiles: employers view open-to-work seekers"
  ON public.seeker_profiles
  FOR SELECT
  USING (
    open_to_work = true
    AND public.get_user_role(auth.uid()) = 'employer'
  );

-- ============================================================
-- 4. seeker_contacts — RLS Policies
-- Strict access: employers only see contacts after placement fee acknowledged
-- ============================================================

CREATE POLICY "seeker_contacts: seekers manage own"
  ON public.seeker_contacts
  FOR ALL
  USING (
    user_id = auth.uid()
    AND public.get_user_role(auth.uid()) = 'seeker'
  )
  WITH CHECK (
    user_id = auth.uid()
    AND public.get_user_role(auth.uid()) = 'seeker'
  );

-- Employers can only view seeker contact details after placement fee acknowledged
CREATE POLICY "seeker_contacts: employers view after placement fee"
  ON public.seeker_contacts
  FOR SELECT
  USING (
    public.get_user_role(auth.uid()) = 'employer'
    AND EXISTS (
      SELECT 1
      FROM public.placement_fees pf
      JOIN public.applications a ON a.id = pf.application_id
      JOIN public.jobs j ON j.id = a.job_id
      JOIN public.employer_profiles ep ON ep.id = j.employer_id
      JOIN public.seeker_profiles sp ON sp.id = pf.seeker_id
      WHERE ep.user_id = auth.uid()
        AND sp.user_id = seeker_contacts.user_id
        AND pf.acknowledged_at IS NOT NULL
    )
  );

-- ============================================================
-- 5. skills — RLS Policies
-- Read-only reference table for all authenticated users
-- ============================================================

CREATE POLICY "skills: authenticated users can view"
  ON public.skills
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 6. jobs — RLS Policies
-- ============================================================

CREATE POLICY "jobs: employers manage own jobs"
  ON public.jobs
  FOR ALL
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

-- Authenticated users can view active jobs
CREATE POLICY "jobs: authenticated users view active"
  ON public.jobs
  FOR SELECT
  USING (
    status = 'active'
    AND auth.uid() IS NOT NULL
  );

-- Public (anon) can view active jobs
CREATE POLICY "jobs: anon users view active"
  ON public.jobs
  FOR SELECT
  USING (status = 'active');

-- ============================================================
-- 7. job_skills — RLS Policies
-- ============================================================

CREATE POLICY "job_skills: employers manage for own jobs"
  ON public.job_skills
  FOR ALL
  USING (
    job_id IN (
      SELECT j.id FROM public.jobs j
      JOIN public.employer_profiles ep ON ep.id = j.employer_id
      WHERE ep.user_id = auth.uid()
    )
    AND public.get_user_role(auth.uid()) = 'employer'
  )
  WITH CHECK (
    job_id IN (
      SELECT j.id FROM public.jobs j
      JOIN public.employer_profiles ep ON ep.id = j.employer_id
      WHERE ep.user_id = auth.uid()
    )
    AND public.get_user_role(auth.uid()) = 'employer'
  );

CREATE POLICY "job_skills: authenticated users can view"
  ON public.job_skills
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 8. seeker_skills — RLS Policies
-- ============================================================

CREATE POLICY "seeker_skills: seekers manage own"
  ON public.seeker_skills
  FOR ALL
  USING (
    seeker_id IN (
      SELECT id FROM public.seeker_profiles WHERE user_id = auth.uid()
    )
    AND public.get_user_role(auth.uid()) = 'seeker'
  )
  WITH CHECK (
    seeker_id IN (
      SELECT id FROM public.seeker_profiles WHERE user_id = auth.uid()
    )
    AND public.get_user_role(auth.uid()) = 'seeker'
  );

CREATE POLICY "seeker_skills: employers can view"
  ON public.seeker_skills
  FOR SELECT
  USING (public.get_user_role(auth.uid()) = 'employer');

-- ============================================================
-- 9. match_scores — RLS Policies
-- ============================================================

CREATE POLICY "match_scores: seekers view own scores"
  ON public.match_scores
  FOR SELECT
  USING (
    seeker_id IN (
      SELECT id FROM public.seeker_profiles WHERE user_id = auth.uid()
    )
  );

-- Employers can view match scores for applicants to their jobs
CREATE POLICY "match_scores: employers view for own jobs"
  ON public.match_scores
  FOR SELECT
  USING (
    job_id IN (
      SELECT j.id FROM public.jobs j
      JOIN public.employer_profiles ep ON ep.id = j.employer_id
      WHERE ep.user_id = auth.uid()
    )
    AND public.get_user_role(auth.uid()) = 'employer'
  );

-- ============================================================
-- 10. applications — RLS Policies
-- ============================================================

CREATE POLICY "applications: seekers insert and view own"
  ON public.applications
  FOR ALL
  USING (
    seeker_id IN (
      SELECT id FROM public.seeker_profiles WHERE user_id = auth.uid()
    )
    AND public.get_user_role(auth.uid()) = 'seeker'
  )
  WITH CHECK (
    seeker_id IN (
      SELECT id FROM public.seeker_profiles WHERE user_id = auth.uid()
    )
    AND public.get_user_role(auth.uid()) = 'seeker'
  );

-- Employers can view applications to their jobs
CREATE POLICY "applications: employers view for own jobs"
  ON public.applications
  FOR SELECT
  USING (
    job_id IN (
      SELECT j.id FROM public.jobs j
      JOIN public.employer_profiles ep ON ep.id = j.employer_id
      WHERE ep.user_id = auth.uid()
    )
    AND public.get_user_role(auth.uid()) = 'employer'
  );

-- ============================================================
-- 11. listing_fees — RLS Policies
-- ============================================================

CREATE POLICY "listing_fees: employers view own"
  ON public.listing_fees
  FOR SELECT
  USING (
    employer_id IN (
      SELECT id FROM public.employer_profiles WHERE user_id = auth.uid()
    )
  );

-- Insert/update via service role only (Stripe webhook) — no client policy

-- ============================================================
-- 12. placement_fees — RLS Policies
-- ============================================================

CREATE POLICY "placement_fees: employers view own"
  ON public.placement_fees
  FOR SELECT
  USING (
    employer_id IN (
      SELECT id FROM public.employer_profiles WHERE user_id = auth.uid()
    )
  );

-- Insert/update via service role only — no client policy

-- ============================================================
-- 13. message_threads — RLS Policies (Growth Phase — minimal)
-- ============================================================

CREATE POLICY "message_threads: participants access own threads"
  ON public.message_threads
  FOR ALL
  USING (
    employer_id IN (
      SELECT id FROM public.employer_profiles WHERE user_id = auth.uid()
    )
    OR seeker_id IN (
      SELECT id FROM public.seeker_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    employer_id IN (
      SELECT id FROM public.employer_profiles WHERE user_id = auth.uid()
    )
    OR seeker_id IN (
      SELECT id FROM public.seeker_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 14. messages — RLS Policies (Growth Phase — minimal)
-- ============================================================

CREATE POLICY "messages: sender can insert"
  ON public.messages
  FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "messages: thread participants can view"
  ON public.messages
  FOR SELECT
  USING (
    thread_id IN (
      SELECT id FROM public.message_threads
      WHERE employer_id IN (
        SELECT id FROM public.employer_profiles WHERE user_id = auth.uid()
      )
      OR seeker_id IN (
        SELECT id FROM public.seeker_profiles WHERE user_id = auth.uid()
      )
    )
  );
