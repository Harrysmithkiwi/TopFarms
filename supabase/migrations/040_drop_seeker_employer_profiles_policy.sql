-- 040: close SEEKER-PROFILE-EXPOSURE-01 (filed 2026-06-10, applied with 037)
--
-- The migration-002 policy "employer_profiles: seekers can view" granted any
-- seeker account SELECT over ALL 39 employer_profiles columns — including
-- stripe_customer_id and user_id. Since migration 038, every seeker-facing
-- read goes through the 10-column marketplace_employer_profiles view (the
-- last four base-table embeds were repointed in the same commit as this
-- file), so the broad policy has no remaining legitimate consumer.
--
-- After this: employer_profiles is readable ONLY by its owner (the
-- "employers manage own" policy) and via SECURITY DEFINER admin RPCs.
-- Seekers and anon read the marketplace view exclusively.

BEGIN;

DROP POLICY IF EXISTS "employer_profiles: seekers can view" ON public.employer_profiles;

COMMIT;
