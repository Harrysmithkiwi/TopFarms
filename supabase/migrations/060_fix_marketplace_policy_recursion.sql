-- 060: Fix 42P17 infinite recursion introduced by 059's marketplace policy.
--
-- The "public marketplace read" policy on employer_profiles subqueried jobs;
-- jobs' "employers manage own jobs" policy subqueries employer_profiles. For
-- authenticated users both policies were in play → policy evaluation cycle →
-- every jobs/employer_profiles query 42P17'd. (Anon was fine: the jobs owner
-- policy is authenticated-only after 059.)
--
-- Fix: evaluate the "has a publicly-visible job" test in a narrow SECURITY
-- DEFINER boolean helper so the subquery on jobs bypasses jobs RLS and the
-- cycle never forms. This is a far smaller definer surface than the old
-- definer view: one boolean, no columns.

CREATE OR REPLACE FUNCTION public.employer_has_public_job(p_employer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.employer_id = p_employer_id
      AND j.status IN ('active', 'paused', 'filled', 'expired')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.employer_has_public_job(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.employer_has_public_job(uuid) TO anon, authenticated, service_role;

ALTER POLICY "employer_profiles: public marketplace read"
  ON public.employer_profiles
  USING (public.employer_has_public_job(id));
