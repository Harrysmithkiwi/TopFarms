-- 038: public marketplace view of employer_profiles (fixes RLS-MKT-01)
--
-- Bug (diagnosed 2026-06-10): employer_profiles has no anon SELECT policy, so
-- the employer_profiles!inner embed in JobSearch pruned EVERY job for
-- anonymous visitors ("/jobs shows 0 jobs found"), employers browsing /jobs
-- saw only their own listings, and JobDetail rendered blank farm info to
-- visitors.
--
-- Fix (operator-selected option: VIEW, not broad anon policy): expose ONLY
-- the 10 columns the marketplace actually renders to visitors, ONLY for
-- employers with a publicly-listed job. The broad-policy alternative would
-- have exposed all 39 columns — including user_id and stripe_customer_id —
-- to anon; the column inventory is why the view wins.
--
-- The view intentionally runs with OWNER privileges (security_invoker=false,
-- the default) — that is the mechanism that lets anon read through it while
-- the base table stays locked. Supabase lint 0010 (security_definer_view)
-- will flag it; that is the accepted, documented design. The WHERE clause is
-- the gate.
--
-- Job-status gate: non-draft, non-archived ('active','paused','filled',
-- 'expired') rather than active-only, so JobDetail pages for filled/paused
-- jobs (reachable from seeker application history) keep their farm info.
-- Draft-only and archived-only employers stay invisible.

BEGIN;

CREATE OR REPLACE VIEW public.marketplace_employer_profiles AS
SELECT
  ep.id,
  ep.farm_name,
  ep.region,
  ep.farm_type,
  ep.shed_type,
  ep.herd_size,
  ep.accommodation_available,
  ep.accommodation_type,
  ep.accommodation_extras,
  ep.culture_description
FROM public.employer_profiles ep
WHERE EXISTS (
  SELECT 1
  FROM public.jobs j
  WHERE j.employer_id = ep.id
    AND j.status IN ('active', 'paused', 'filled', 'expired')
);

COMMENT ON VIEW public.marketplace_employer_profiles IS
  'Visitor-safe projection of employer_profiles (10 of 39 columns), limited to employers with a publicly-listed job. Owner-privilege view by design — see migration 038.';

GRANT SELECT ON public.marketplace_employer_profiles TO anon, authenticated;

COMMIT;
