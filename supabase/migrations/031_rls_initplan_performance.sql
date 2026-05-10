BEGIN;

-- =============================================================
-- 031_rls_initplan_performance.sql
-- Phase 18.2 SC-13: Replace bare auth.uid() with (select auth.uid())
-- across all RLS policies to eliminate auth_rls_initplan advisor warnings.
-- Performance-only: no behaviour change to any policy.
-- Applied via Supabase Studio SQL Editor per CLAUDE.md §2.
-- Verify after apply: SELECT tablename, policyname, qual
--   FROM pg_policies WHERE schemaname='public'
--   AND qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(select auth.uid())%';
-- Expected: 0 rows (all bare auth.uid() replaced).
-- =============================================================

-- ============================================================
-- 1. user_roles
-- ============================================================

DROP POLICY IF EXISTS "user_roles: users read own role" ON public.user_roles;
CREATE POLICY "user_roles: users read own role"
  ON public.user_roles
  FOR SELECT
  USING (user_id = (select auth.uid()));

-- ============================================================
-- 2. employer_profiles
-- ============================================================

DROP POLICY IF EXISTS "employer_profiles: employers manage own" ON public.employer_profiles;
CREATE POLICY "employer_profiles: employers manage own"
  ON public.employer_profiles
  FOR ALL
  USING (
    user_id = (select auth.uid())
    AND public.get_user_role((select auth.uid())) = 'employer'
  )
  WITH CHECK (
    user_id = (select auth.uid())
    AND public.get_user_role((select auth.uid())) = 'employer'
  );

DROP POLICY IF EXISTS "employer_profiles: seekers can view" ON public.employer_profiles;
CREATE POLICY "employer_profiles: seekers can view"
  ON public.employer_profiles
  FOR SELECT
  USING (public.get_user_role((select auth.uid())) = 'seeker');

-- ============================================================
-- 3. seeker_profiles
-- ============================================================

DROP POLICY IF EXISTS "seeker_profiles: seekers manage own" ON public.seeker_profiles;
CREATE POLICY "seeker_profiles: seekers manage own"
  ON public.seeker_profiles
  FOR ALL
  USING (
    user_id = (select auth.uid())
    AND public.get_user_role((select auth.uid())) = 'seeker'
  )
  WITH CHECK (
    user_id = (select auth.uid())
    AND public.get_user_role((select auth.uid())) = 'seeker'
  );

DROP POLICY IF EXISTS "seeker_profiles: employers view open-to-work seekers" ON public.seeker_profiles;
CREATE POLICY "seeker_profiles: employers view open-to-work seekers"
  ON public.seeker_profiles
  FOR SELECT
  USING (
    open_to_work = true
    AND public.get_user_role((select auth.uid())) = 'employer'
  );

-- ============================================================
-- 4. seeker_contacts
-- ============================================================

DROP POLICY IF EXISTS "seeker_contacts: seekers manage own" ON public.seeker_contacts;
CREATE POLICY "seeker_contacts: seekers manage own"
  ON public.seeker_contacts
  FOR ALL
  USING (
    user_id = (select auth.uid())
    AND public.get_user_role((select auth.uid())) = 'seeker'
  )
  WITH CHECK (
    user_id = (select auth.uid())
    AND public.get_user_role((select auth.uid())) = 'seeker'
  );

DROP POLICY IF EXISTS "seeker_contacts: employers view after placement fee" ON public.seeker_contacts;
CREATE POLICY "seeker_contacts: employers view after placement fee"
  ON public.seeker_contacts
  FOR SELECT
  USING (
    public.get_user_role((select auth.uid())) = 'employer'
    AND EXISTS (
      SELECT 1
      FROM public.placement_fees pf
      JOIN public.applications a ON a.id = pf.application_id
      JOIN public.jobs j ON j.id = a.job_id
      JOIN public.employer_profiles ep ON ep.id = j.employer_id
      JOIN public.seeker_profiles sp ON sp.id = pf.seeker_id
      WHERE ep.user_id = (select auth.uid())
        AND sp.user_id = seeker_contacts.user_id
        AND pf.acknowledged_at IS NOT NULL
    )
  );

-- ============================================================
-- 5. skills
-- ============================================================

DROP POLICY IF EXISTS "skills: authenticated users can view" ON public.skills;
CREATE POLICY "skills: authenticated users can view"
  ON public.skills
  FOR SELECT
  USING ((select auth.uid()) IS NOT NULL);

-- ============================================================
-- 6. jobs
-- ============================================================

DROP POLICY IF EXISTS "jobs: employers manage own jobs" ON public.jobs;
CREATE POLICY "jobs: employers manage own jobs"
  ON public.jobs
  FOR ALL
  USING (
    employer_id IN (
      SELECT id FROM public.employer_profiles WHERE user_id = (select auth.uid())
    )
    AND public.get_user_role((select auth.uid())) = 'employer'
  )
  WITH CHECK (
    employer_id IN (
      SELECT id FROM public.employer_profiles WHERE user_id = (select auth.uid())
    )
    AND public.get_user_role((select auth.uid())) = 'employer'
  );

DROP POLICY IF EXISTS "jobs: authenticated users view active" ON public.jobs;
CREATE POLICY "jobs: authenticated users view active"
  ON public.jobs
  FOR SELECT
  USING (
    status = 'active'
    AND (select auth.uid()) IS NOT NULL
  );

-- "jobs: anon users view active" uses no auth.uid() — unchanged, no DROP/CREATE needed

-- ============================================================
-- 7. job_skills
-- ============================================================

DROP POLICY IF EXISTS "job_skills: employers manage for own jobs" ON public.job_skills;
CREATE POLICY "job_skills: employers manage for own jobs"
  ON public.job_skills
  FOR ALL
  USING (
    job_id IN (
      SELECT j.id FROM public.jobs j
      JOIN public.employer_profiles ep ON ep.id = j.employer_id
      WHERE ep.user_id = (select auth.uid())
    )
    AND public.get_user_role((select auth.uid())) = 'employer'
  )
  WITH CHECK (
    job_id IN (
      SELECT j.id FROM public.jobs j
      JOIN public.employer_profiles ep ON ep.id = j.employer_id
      WHERE ep.user_id = (select auth.uid())
    )
    AND public.get_user_role((select auth.uid())) = 'employer'
  );

DROP POLICY IF EXISTS "job_skills: authenticated users can view" ON public.job_skills;
CREATE POLICY "job_skills: authenticated users can view"
  ON public.job_skills
  FOR SELECT
  USING ((select auth.uid()) IS NOT NULL);

-- ============================================================
-- 8. seeker_skills
-- ============================================================

DROP POLICY IF EXISTS "seeker_skills: seekers manage own" ON public.seeker_skills;
CREATE POLICY "seeker_skills: seekers manage own"
  ON public.seeker_skills
  FOR ALL
  USING (
    seeker_id IN (
      SELECT id FROM public.seeker_profiles WHERE user_id = (select auth.uid())
    )
    AND public.get_user_role((select auth.uid())) = 'seeker'
  )
  WITH CHECK (
    seeker_id IN (
      SELECT id FROM public.seeker_profiles WHERE user_id = (select auth.uid())
    )
    AND public.get_user_role((select auth.uid())) = 'seeker'
  );

DROP POLICY IF EXISTS "seeker_skills: employers can view" ON public.seeker_skills;
CREATE POLICY "seeker_skills: employers can view"
  ON public.seeker_skills
  FOR SELECT
  USING (public.get_user_role((select auth.uid())) = 'employer');

-- ============================================================
-- 9. match_scores
-- ============================================================

DROP POLICY IF EXISTS "match_scores: seekers view own scores" ON public.match_scores;
CREATE POLICY "match_scores: seekers view own scores"
  ON public.match_scores
  FOR SELECT
  USING (
    seeker_id IN (
      SELECT id FROM public.seeker_profiles WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "match_scores: employers view for own jobs" ON public.match_scores;
CREATE POLICY "match_scores: employers view for own jobs"
  ON public.match_scores
  FOR SELECT
  USING (
    job_id IN (
      SELECT j.id FROM public.jobs j
      JOIN public.employer_profiles ep ON ep.id = j.employer_id
      WHERE ep.user_id = (select auth.uid())
    )
    AND public.get_user_role((select auth.uid())) = 'employer'
  );

-- ============================================================
-- 10. applications
-- ============================================================

DROP POLICY IF EXISTS "applications: seekers insert and view own" ON public.applications;
CREATE POLICY "applications: seekers insert and view own"
  ON public.applications
  FOR ALL
  USING (
    seeker_id IN (
      SELECT id FROM public.seeker_profiles WHERE user_id = (select auth.uid())
    )
    AND public.get_user_role((select auth.uid())) = 'seeker'
  )
  WITH CHECK (
    seeker_id IN (
      SELECT id FROM public.seeker_profiles WHERE user_id = (select auth.uid())
    )
    AND public.get_user_role((select auth.uid())) = 'seeker'
  );

DROP POLICY IF EXISTS "applications: employers view for own jobs" ON public.applications;
CREATE POLICY "applications: employers view for own jobs"
  ON public.applications
  FOR SELECT
  USING (
    job_id IN (
      SELECT j.id FROM public.jobs j
      JOIN public.employer_profiles ep ON ep.id = j.employer_id
      WHERE ep.user_id = (select auth.uid())
    )
    AND public.get_user_role((select auth.uid())) = 'employer'
  );

-- Applications update policies from 009_seeker_onboarding.sql:

DROP POLICY IF EXISTS "applications: employers update status for own jobs" ON public.applications;
CREATE POLICY "applications: employers update status for own jobs"
  ON public.applications
  FOR UPDATE
  USING (
    job_id IN (
      SELECT j.id FROM public.jobs j
      JOIN public.employer_profiles ep ON ep.id = j.employer_id
      WHERE ep.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "applications: seekers update own" ON public.applications;
CREATE POLICY "applications: seekers update own"
  ON public.applications
  FOR UPDATE
  USING (
    seeker_id IN (SELECT id FROM public.seeker_profiles WHERE user_id = (select auth.uid()))
  )
  WITH CHECK (
    seeker_id IN (SELECT id FROM public.seeker_profiles WHERE user_id = (select auth.uid()))
  );

-- ============================================================
-- 11. listing_fees
-- ============================================================

DROP POLICY IF EXISTS "listing_fees: employers view own" ON public.listing_fees;
CREATE POLICY "listing_fees: employers view own"
  ON public.listing_fees
  FOR SELECT
  USING (
    employer_id IN (
      SELECT id FROM public.employer_profiles WHERE user_id = (select auth.uid())
    )
  );

-- ============================================================
-- 12. placement_fees
-- ============================================================

DROP POLICY IF EXISTS "placement_fees: employers view own" ON public.placement_fees;
CREATE POLICY "placement_fees: employers view own"
  ON public.placement_fees
  FOR SELECT
  USING (
    employer_id IN (
      SELECT id FROM public.employer_profiles WHERE user_id = (select auth.uid())
    )
  );

-- ============================================================
-- 13. message_threads
-- ============================================================

DROP POLICY IF EXISTS "message_threads: participants access own threads" ON public.message_threads;
CREATE POLICY "message_threads: participants access own threads"
  ON public.message_threads
  FOR ALL
  USING (
    employer_id IN (
      SELECT id FROM public.employer_profiles WHERE user_id = (select auth.uid())
    )
    OR seeker_id IN (
      SELECT id FROM public.seeker_profiles WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    employer_id IN (
      SELECT id FROM public.employer_profiles WHERE user_id = (select auth.uid())
    )
    OR seeker_id IN (
      SELECT id FROM public.seeker_profiles WHERE user_id = (select auth.uid())
    )
  );

-- ============================================================
-- 14. messages
-- ============================================================

DROP POLICY IF EXISTS "messages: sender can insert" ON public.messages;
CREATE POLICY "messages: sender can insert"
  ON public.messages
  FOR INSERT
  WITH CHECK (sender_id = (select auth.uid()));

DROP POLICY IF EXISTS "messages: thread participants can view" ON public.messages;
CREATE POLICY "messages: thread participants can view"
  ON public.messages
  FOR SELECT
  USING (
    thread_id IN (
      SELECT id FROM public.message_threads
      WHERE employer_id IN (
        SELECT id FROM public.employer_profiles WHERE user_id = (select auth.uid())
      )
      OR seeker_id IN (
        SELECT id FROM public.seeker_profiles WHERE user_id = (select auth.uid())
      )
    )
  );

-- ============================================================
-- 15. employer_verifications (from 005_employer_verifications.sql)
-- ============================================================

DROP POLICY IF EXISTS "employers manage own verifications" ON public.employer_verifications;
CREATE POLICY "employers manage own verifications"
  ON public.employer_verifications
  FOR ALL
  TO authenticated
  USING (
    employer_id IN (
      SELECT id FROM public.employer_profiles WHERE user_id = (select auth.uid())
    )
    AND public.get_user_role((select auth.uid())) = 'employer'
  )
  WITH CHECK (
    employer_id IN (
      SELECT id FROM public.employer_profiles WHERE user_id = (select auth.uid())
    )
    AND public.get_user_role((select auth.uid())) = 'employer'
  );

DROP POLICY IF EXISTS "seekers view employer verifications" ON public.employer_verifications;
CREATE POLICY "seekers view employer verifications"
  ON public.employer_verifications
  FOR SELECT
  TO authenticated
  USING (public.get_user_role((select auth.uid())) = 'seeker');

-- "anon view employer verifications" uses USING (true) — no auth.uid() — unchanged

-- ============================================================
-- 16. saved_jobs (from 015_phase9_schema.sql)
-- ============================================================

DROP POLICY IF EXISTS "Users can manage their own saved jobs" ON public.saved_jobs;
CREATE POLICY "Users can manage their own saved jobs"
  ON public.saved_jobs
  FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================
-- 17. seeker_documents (from 019_seeker_documents.sql)
-- ============================================================

DROP POLICY IF EXISTS "seekers select own documents" ON public.seeker_documents;
CREATE POLICY "seekers select own documents"
  ON public.seeker_documents
  FOR SELECT
  USING (
    seeker_id IN (SELECT id FROM public.seeker_profiles WHERE user_id = (select auth.uid()))
    AND public.get_user_role((select auth.uid())) = 'seeker'
  );

DROP POLICY IF EXISTS "seekers insert own documents" ON public.seeker_documents;
CREATE POLICY "seekers insert own documents"
  ON public.seeker_documents
  FOR INSERT
  WITH CHECK (
    seeker_id IN (SELECT id FROM public.seeker_profiles WHERE user_id = (select auth.uid()))
    AND public.get_user_role((select auth.uid())) = 'seeker'
  );

DROP POLICY IF EXISTS "seekers update own documents" ON public.seeker_documents;
CREATE POLICY "seekers update own documents"
  ON public.seeker_documents
  FOR UPDATE
  USING (
    seeker_id IN (SELECT id FROM public.seeker_profiles WHERE user_id = (select auth.uid()))
    AND public.get_user_role((select auth.uid())) = 'seeker'
  )
  WITH CHECK (
    seeker_id IN (SELECT id FROM public.seeker_profiles WHERE user_id = (select auth.uid()))
    AND public.get_user_role((select auth.uid())) = 'seeker'
  );

DROP POLICY IF EXISTS "seekers delete own documents" ON public.seeker_documents;
CREATE POLICY "seekers delete own documents"
  ON public.seeker_documents
  FOR DELETE
  USING (
    seeker_id IN (SELECT id FROM public.seeker_profiles WHERE user_id = (select auth.uid()))
    AND public.get_user_role((select auth.uid())) = 'seeker'
  );

-- ============================================================
-- 18. seeker_documents employer policy (from 020_seeker_documents_employer_policy.sql)
-- ============================================================

DROP POLICY IF EXISTS "employers select applicant visible documents" ON public.seeker_documents;
CREATE POLICY "employers select applicant visible documents"
  ON public.seeker_documents
  FOR SELECT
  USING (
    get_user_role((select auth.uid())) = 'employer'
    AND document_type IN ('cv', 'certificate', 'reference')
    AND seeker_id IN (
      SELECT a.seeker_id
      FROM public.applications a
      INNER JOIN public.jobs j ON j.id = a.job_id
      INNER JOIN public.employer_profiles ep ON ep.id = j.employer_id
      WHERE ep.user_id = (select auth.uid())
    )
  );

-- ============================================================
-- 19. saved_searches (from 024_saved_searches.sql)
-- ============================================================

DROP POLICY IF EXISTS "users select own saved_searches" ON public.saved_searches;
CREATE POLICY "users select own saved_searches"
  ON public.saved_searches
  FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "users insert own saved_searches" ON public.saved_searches;
CREATE POLICY "users insert own saved_searches"
  ON public.saved_searches
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "users update own saved_searches" ON public.saved_searches;
CREATE POLICY "users update own saved_searches"
  ON public.saved_searches
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "users delete own saved_searches" ON public.saved_searches;
CREATE POLICY "users delete own saved_searches"
  ON public.saved_searches
  FOR DELETE
  USING ((select auth.uid()) = user_id);

COMMIT;
