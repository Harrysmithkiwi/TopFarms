-- 105 — the marketplace view becomes security_invoker, safely
--
-- Supersedes 104's holding position. 104 refused the work order's one-liner and recorded
-- three options; this is **option (b)**, and it is the only one that does not either break
-- the page or widen what the public can read:
--
--   (a) widen the anon jobs SELECT policy to all four statuses  -> REJECTED. It would make
--       paused, filled and expired listings publicly readable through the REST API. An
--       employer who PAUSES a listing has deliberately taken it down; handing it back to
--       anon is a real exposure, traded for a lint.
--   (b) move the view's EXISTS into a SECURITY DEFINER helper   -> THIS FILE.
--   (c) keep definer semantics forever                          -> what 104 did as a hold.
--
-- ── why a definer helper is the fix, and not a workaround ───────────────────────────────
--
-- 104 measured the trap: under `security_invoker = true`, the view's `WHERE EXISTS (…jobs…)`
-- is evaluated as the CALLER, and the caller's jobs RLS is `status = 'active'`. So every
-- employer whose listing had been filled or expired silently dropped out — including out of
-- `MyApplications`, where a seeker reads the farm name on applications they already made.
-- Filling a job is the success case; it must not erase the seeker's own history.
--
-- `_employer_has_public_listing()` runs as owner, so the status test sees all four statuses
-- regardless of who is asking, while the view itself now respects caller privileges for the
-- COLUMNS it returns. That is the split we actually want: the visibility RULE is a product
-- decision and belongs to the owner; the column ACCESS is a permission and belongs to the
-- caller.
--
-- It is also the established shape in this codebase, not an invention: cross-table policy
-- predicates go through definer helpers here because a policy that reads another RLS-guarded
-- table recurses (42P17, incident E8). Being definer is exactly what stops the helper's read
-- of `jobs` from re-entering the `jobs: employers manage own jobs` policy, which itself
-- subqueries `employer_profiles`.
--
-- ── restores the rest of 059 §3, which was only partly live ─────────────────────────────
--
-- 104 found the policy absent and anon holding NO column grants; only 059's `authenticated`
-- grants had survived. Both are restored here. The anon grant is 059's original ten columns
-- **plus `inz_accredited` and `inz_accreditation_expires`** — 091 added the computed
-- `accredited_employer` expression to the view AFTER 059 was written, and under invoker
-- rights the caller must be able to read the columns an expression consumes. Granting 059's
-- list verbatim would have failed on exactly that.
--
-- `stripe_customer_id` stays absent from every grant, as it has since 059.
--
-- ── the view keeps its own WHERE, deliberately ─────────────────────────────────────────
--
-- With the RLS policy applying the same predicate, the view's WHERE is redundant for anon
-- and authenticated. It is NOT redundant for `service_role`, which bypasses RLS entirely —
-- without it, a service-role read of the view would return employers with no public listing
-- at all. Two enforcement points, one shared helper, no drift.
--
-- ── proven on prod in a rolled-back transaction, three synthetic employers ─────────────
--
--   anon, employer with an ACTIVE job        1 -> 1   (preserved)
--   anon, employer with a FILLED job only    1 -> 1   (104's regression, fixed)
--   anon, employer with NO job               0 -> 0   (still invisible)
--   authenticated seeker, FILLED employer          1   (MyApplications history intact)
--   anon direct read of stripe_customer_id    blocked (42501)
--   anon direct read of farm_name                readable
--   anon direct rows for a no-listing employer         0   (policy holds off-view too)

BEGIN;

-- ── the owner-side visibility rule ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._employer_has_public_listing(p_employer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.jobs j
     WHERE j.employer_id = p_employer_id
       AND j.status IN ('active', 'paused', 'filled', 'expired')
  );
$$;

COMMENT ON FUNCTION public._employer_has_public_listing(uuid) IS
  'Owner-side marketplace visibility rule (migration 105). SECURITY DEFINER on purpose: under security_invoker the view and the RLS policy would evaluate this as the caller, whose jobs RLS is status=active, so a filled or expired listing would drop the employer out of the marketplace AND out of the seeker''s own application history. Definer also prevents 42P17 recursion, since the jobs policy subqueries employer_profiles. Uses jobs_employer_id_idx.';

REVOKE ALL ON FUNCTION public._employer_has_public_listing(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._employer_has_public_listing(uuid) TO anon, authenticated;

-- ── 059 §3, restored ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "employer_profiles: public marketplace read" ON public.employer_profiles;
CREATE POLICY "employer_profiles: public marketplace read"
  ON public.employer_profiles
  FOR SELECT
  TO anon, authenticated
  USING (public._employer_has_public_listing(id));

-- 059's ten, plus the two INZ columns the 091 expression reads. stripe_customer_id absent.
GRANT SELECT (
  id, farm_name, region, farm_type, shed_type, herd_size,
  accommodation_available, accommodation_type, accommodation_extras,
  culture_description, inz_accredited, inz_accreditation_expires
) ON public.employer_profiles TO anon;

-- ── the view: same columns, same order, rule now shared with the policy ────────────────
CREATE OR REPLACE VIEW public.marketplace_employer_profiles AS
  SELECT id,
         farm_name,
         region,
         farm_type,
         shed_type,
         herd_size,
         accommodation_available,
         accommodation_type,
         accommodation_extras,
         culture_description,
         inz_accredited AND inz_accreditation_expires > CURRENT_DATE AS accredited_employer
    FROM public.employer_profiles ep
   WHERE public._employer_has_public_listing(ep.id);

ALTER VIEW public.marketplace_employer_profiles SET (security_invoker = true);

-- 104's comment asserted the opposite posture and would now be a lie on the object itself.
COMMENT ON VIEW public.marketplace_employer_profiles IS
  'PUBLIC GATEWAY VIEW — security_invoker = true since migration 105. Projects 10 marketing columns + computed accredited_employer, for employers with a listing in (active, paused, filled, expired); no user_id, no contact details, no stripe_customer_id. The status rule lives in _employer_has_public_listing(), a SECURITY DEFINER helper, because evaluating it as the caller would limit it to status=active and drop filled/expired employers out of the marketplace and out of the seeker''s own application history (measured: 1 -> 0). The view keeps its own WHERE as well as the RLS policy: service_role bypasses RLS and would otherwise see employers with no public listing. See 104 for the diagnosis this replaces.';

COMMIT;
