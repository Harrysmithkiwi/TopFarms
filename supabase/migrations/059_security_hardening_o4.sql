-- 059: Post-launch security hardening batch (LAUNCH.md O4 / TF-014, TF-015, TF-017)
--
-- 1) Scope every RLS policy that calls get_user_role() to `authenticated`.
--    These policies are meaningless for anon (auth.uid() is NULL), but while
--    they applied to PUBLIC, any anon scan of the table evaluated the policy
--    and therefore needed EXECUTE on get_user_role(). Scoping them lets us
--    revoke the function from anon without breaking anon reads (public jobs
--    board, marketplace view).
-- 2) Revoke get_user_role() EXECUTE from anon + PUBLIC (TF-015 / H8).
--    anon could probe any uuid's role via /rest/v1/rpc/get_user_role.
--    get_platform_stats stays anon-executable on purpose (home page counters).
-- 3) Convert marketplace_employer_profiles to security_invoker (TF-014 / H7),
--    backed by a real SELECT policy on employer_profiles for rows with a
--    publicly-visible job, plus column-level grants:
--      - anon: only the 10 marketplace columns the view exposes.
--      - authenticated: every column EXCEPT stripe_customer_id (owner
--        dashboards need their own row; Stripe id is server-side only —
--        admin UI reads it via SECURITY DEFINER admin_* RPCs).
--    Client code was updated in the same PR to select explicit column lists
--    (EmployerOnboarding, PostJob) since '*' would now 42501.
-- 4) Move pg_trgm out of public (TF-017), and add `extensions` to the
--    search_path of the three functions that call similarity() unqualified.
--    leads_name_trgm_idx references the operator class by OID and is
--    unaffected.

-- ── 1. Scope get_user_role-referencing policies to authenticated ─────────────
ALTER POLICY "analytics_events_admin_read" ON public.analytics_events TO authenticated;
ALTER POLICY "applications: employers view for own jobs" ON public.applications TO authenticated;
ALTER POLICY "applications: seekers insert and view own" ON public.applications TO authenticated;
ALTER POLICY "employer_profiles: employers manage own" ON public.employer_profiles TO authenticated;
ALTER POLICY "job_skills: employers manage for own jobs" ON public.job_skills TO authenticated;
ALTER POLICY "jobs: employers manage own jobs" ON public.jobs TO authenticated;
ALTER POLICY "match_scores: employers view for own jobs" ON public.match_scores TO authenticated;
ALTER POLICY "seeker_contacts: employers view after placement fee" ON public.seeker_contacts TO authenticated;
ALTER POLICY "seeker_contacts: seekers manage own" ON public.seeker_contacts TO authenticated;
ALTER POLICY "employers select applicant visible documents" ON public.seeker_documents TO authenticated;
ALTER POLICY "seekers delete own documents" ON public.seeker_documents TO authenticated;
ALTER POLICY "seekers insert own documents" ON public.seeker_documents TO authenticated;
ALTER POLICY "seekers select own documents" ON public.seeker_documents TO authenticated;
ALTER POLICY "seekers update own documents" ON public.seeker_documents TO authenticated;
ALTER POLICY "seeker_profiles: employers view open-to-work seekers" ON public.seeker_profiles TO authenticated;
ALTER POLICY "seeker_profiles: seekers manage own" ON public.seeker_profiles TO authenticated;
ALTER POLICY "seeker_skills: employers can view" ON public.seeker_skills TO authenticated;
ALTER POLICY "seeker_skills: seekers manage own" ON public.seeker_skills TO authenticated;

-- ── 2. get_user_role: no longer anon-executable ─────────────────────────────
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon;
-- authenticated + service_role keep their existing explicit EXECUTE grants.

-- ── 3. marketplace_employer_profiles → security_invoker ─────────────────────
-- Row policy first, so the invoker view keeps returning rows.
CREATE POLICY "employer_profiles: public marketplace read"
  ON public.employer_profiles
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.employer_id = employer_profiles.id
        AND j.status IN ('active', 'paused', 'filled', 'expired')
    )
  );

-- Column-level hardening. REVOKE SELECT only — INSERT/UPDATE/DELETE grants
-- (RLS-guarded) are untouched.
REVOKE SELECT ON public.employer_profiles FROM anon, authenticated;

GRANT SELECT (
  id, farm_name, region, farm_type, shed_type, herd_size,
  accommodation_available, accommodation_type, accommodation_extras,
  culture_description
) ON public.employer_profiles TO anon;

GRANT SELECT (
  id, user_id, farm_name, farm_type, ownership_type, region, shed_type,
  herd_size, milking_frequency, breed, calving_system, distance_from_town,
  about_farm, verification_tier, subscription_tier, rating, created_at,
  culture_description, team_size, accommodation_available, accommodation_type,
  onboarding_step, onboarding_complete, property_size_ha, farm_types,
  nearest_town, distance_from_town_km, career_development, hiring_frequency,
  couples_welcome, partner_role, accommodation_extras, vehicle_provided,
  vehicle_types, broadband_available, salary_min, salary_max, billing_period
) ON public.employer_profiles TO authenticated;
-- stripe_customer_id deliberately absent from both lists.

ALTER VIEW public.marketplace_employer_profiles SET (security_invoker = true);

-- ── 4. pg_trgm → extensions schema ──────────────────────────────────────────
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- These call similarity()/word_similarity() unqualified with a pinned
-- search_path, so add extensions to it.
ALTER FUNCTION public.compute_match_score(uuid, uuid) SET search_path = public, extensions;
ALTER FUNCTION public.admin_lead_conversion_suggestions() SET search_path = public, extensions;
ALTER FUNCTION public._lead_intake(text, text, text, jsonb, numeric, text[]) SET search_path = public, extensions;
