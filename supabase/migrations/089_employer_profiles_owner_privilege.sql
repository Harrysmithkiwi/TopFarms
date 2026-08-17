-- 089 — The marketplace view becomes the boundary (audit finding F-02, Tier 1)
--
-- Live before this migration:
--
--   policy "employer_profiles: public marketplace read"  TO anon, authenticated
--          USING employer_has_public_job(id)
--   column grants:  anon 10 columns,  authenticated 38
--
-- So ANY authenticated user — every seeker — could read 38 columns of every employer that has
-- ever posted a job, straight off the base table: `salary_min`, `salary_max`,
-- `subscription_tier`, `verification_tier`, `rating`, `billing_period`, `onboarding_step`, and
-- `user_id` (which links a farm to an auth identity). `stripe_customer_id` was correctly
-- excluded, which is what makes the rest look deliberate when it is not — this re-opened what
-- migration 040 closed.
--
-- ── why the audit's prescription would have broken the marketplace ──────────────────────
--
-- The fix was recorded as "view to owner-privilege, drop base-table policy, revoke anon", with
-- the note that all seeker/anon call sites already use `marketplace_employer_profiles`. The
-- second half is true and verified — 8 call sites, all through the view, and JobSearch.tsx:269
-- even carries a comment saying the base table has no anon access.
--
-- But the view is `security_invoker = true`. It therefore runs under the CALLER's RLS, so
-- dropping the base-table policy on its own would have made the view return zero rows for
-- anon and for every logged-in seeker: no jobs list, no job detail, no application cards.
-- The policy is what the view has been feeding on all along.
--
-- ── why column grants cannot be the lever either ────────────────────────────────────────
--
-- The obvious smaller fix — revoke the 28 extra columns from `authenticated` — does not work.
-- Grants are per-ROLE, and an employer reading their own dashboard IS `authenticated`. Revoking
-- those columns would blind employers to their own profile. Rows are the axis that separates a
-- seeker from an employer here, and rows are policy, not grant.
--
-- ── what this migration actually does ───────────────────────────────────────────────────
--
-- Flip the view to owner rights and let its own WHERE be the boundary. That WHERE — "an
-- employer with at least one job in active/paused/filled/expired" — is the same predicate the
-- dropped policy used, and the view projects exactly the 10 columns that were always intended
-- to be public. The base table then keeps ONE policy, "employers manage own", so:
--
--   anon           → no policy, no grants           → nothing from the base table
--   seeker         → no matching policy              → nothing from the base table
--   employer       → own row only, all columns       → dashboard unaffected
--   anyone         → the 10-column view              → marketplace unaffected
--
-- The view owner is `postgres` and no SECURITY INVOKER function reads `employer_profiles`
-- (checked across pg_proc), so nothing else silently depended on the dropped policy.
--
-- KNOWN: Supabase's linter flags an owner-rights view as `security_definer_view`. That is the
-- point here — a deliberately curated public projection with its filter baked in — and it is
-- narrower than the policy it replaces, not wider. Do not "fix" it by flipping
-- security_invoker back on without restoring a base-table read policy in the same migration,
-- or the marketplace goes dark.

BEGIN;

-- 1. The view stops borrowing the caller's RLS and stands on its own WHERE.
ALTER VIEW public.marketplace_employer_profiles SET (security_invoker = false);

-- 2. The 38-column hole. Nothing reads the base table as anon or as a seeker any more.
DROP POLICY IF EXISTS "employer_profiles: public marketplace read" ON public.employer_profiles;

-- 3. Defence in depth: with the policy gone anon already gets nothing, but leaving SELECT
--    grants lying on the base table invites the next policy to be written without noticing.
REVOKE SELECT ON public.employer_profiles FROM anon;

-- 4. The view itself carried `arwdDxtm` for anon and authenticated — INSERT/UPDATE/DELETE on
--    an auto-updatable view over the base table. Base-table grants stopped those writes, but
--    the view should never have offered them. Read-only, which is all it is for.
REVOKE ALL ON public.marketplace_employer_profiles FROM anon, authenticated;
GRANT SELECT ON public.marketplace_employer_profiles TO anon, authenticated;

COMMENT ON VIEW public.marketplace_employer_profiles IS
  'The ONLY public projection of employer_profiles: 10 columns, filtered to employers with a job in active/paused/filled/expired. Owner-rights (security_invoker=false) deliberately — this WHERE is the security boundary that replaced the base-table policy dropped in 089 (audit F-02), which had been exposing 38 columns to any authenticated user. Flipping security_invoker back on without restoring a base-table read policy takes the marketplace dark.';

COMMIT;
