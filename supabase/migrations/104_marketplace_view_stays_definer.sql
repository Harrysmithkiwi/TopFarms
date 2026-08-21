-- 104 — the marketplace view stays SECURITY DEFINER, and here is the measured reason
--
-- ⚠ SUPERSEDED BY 105 (same day). This file's DIAGNOSIS stands and is why 105 looks the way
--   it does — the bare ALTER VIEW really does raise 42501, and 059 §3 really was only partly
--   live. What is no longer current is the CONCLUSION: 105 took option (b), the definer
--   helper, so the view IS security_invoker = true now and this file's COMMENT ON VIEW has
--   been replaced. Kept unedited for the decision history, per the v11-DIRECTIVE precedent.
--
-- UPLIFT-95 Phase 3 item 1 proposed a one-liner:
--
--     ALTER VIEW public.marketplace_employer_profiles SET (security_invoker = true);
--
-- backed by the advisor's single ERROR lint and by migration 059, which did intend exactly
-- that. NOT APPLIED. Proven on prod in a rolled-back transaction, twice, before writing
-- anything (CLAUDE.md §3, and the standing rule that an audit's proposed fix is a
-- hypothesis):
--
--   probe 1 — the bare ALTER VIEW alone:
--     anon SELECT on the view  ->  SQLSTATE 42501, permission denied for table
--                                  employer_profiles
--
-- That is not a degraded view, it is a hard failure, and the blast radius is the public
-- jobs board: JobSearch, V12Roles, OpenRolesSection and JobDetail all reach employer data
-- through `marketplace_employer_profiles!inner`, so /jobs would render zero rows for every
-- anonymous visitor — the exact surface the first outreach recipients land on.
--
-- WHY it fails is the part the audit did not have. 059 section 3 is only PARTLY live. Read
-- off pg_catalog 2026-08-21:
--
--   * "employer_profiles: public marketplace read"  -- DOES NOT EXIST. The only policy on
--     the table is "employer_profiles: employers manage own", TO authenticated, USING
--     (user_id = auth.uid() AND role = 'employer').
--   * anon column grants on employer_profiles      -- NONE. has_column_privilege('anon',
--     …,'farm_name','SELECT') is false; has_table_privilege is false.
--   * ALTER VIEW … security_invoker = true         -- reverted to false.
--   * The authenticated column grants (41 columns, stripe_customer_id correctly absent)
--     -- these DID survive.
--
-- So three of 059's four parts were reverted and one remains. The advisor lint is a true
-- statement about a view whose supporting scaffolding is gone, not a finding about a leak.
--
--   probe 2 — the FULL 059 restore (policy + 12 anon column grants + ALTER VIEW), with a
--   synthetic employer holding one ACTIVE job:
--     before(definer)=1  after(invoker)=1     <- anon visibility preserved
--
--   probe 3 — the same restore, with the employer's ONLY job status 'filled':
--     before(definer)=1  after(invoker)=0     <- the employer DISAPPEARS
--
-- Probe 3 is why this is still not applied, and it is a defect in 059's own design rather
-- than in the restore. The view's WHERE EXISTS accepts jobs in ('active','paused','filled',
-- 'expired'), but under invoker rights that subquery — and the restored policy's identical
-- subquery — read `jobs` as the CALLER, and the caller's jobs RLS is `status = 'active'`
-- for anon and for authenticated alike. Every non-active listing therefore vanishes.
--
-- The victim is not the marketplace (anon only ever reaches an employer via an active job
-- anyway). It is the seeker's own history: MyApplications and SeekerDashboard join
-- marketplace_employer_profiles to show the farm name on applications the seeker already
-- made. Fill the job — the success case, the thing this product exists to cause — and the
-- farm name drops out of that seeker's record. This is a plausible reason 059 section 3 was
-- reverted in the first place.
--
-- Current posture is safe and is now recorded rather than merely true by accident. The view
-- projects 10 marketing columns plus a computed accreditation boolean, filtered to
-- employers who already chose to publish a listing. No user_id, no contact details, no
-- stripe_customer_id. Definer rights over a deliberately narrow projection IS the standard
-- shape for a public gateway view.
--
-- Resolving the lint properly needs a decision that is the operator's, because each option
-- changes the security model rather than restating it:
--   (a) widen the anon/authenticated jobs SELECT policy to the four statuses the view
--       already accepts — makes non-active listings publicly readable;
--   (b) move the view's EXISTS into a SECURITY DEFINER helper so status filtering happens
--       owner-side, then apply the full 059 restore — keeps behaviour, adds a function;
--   (c) keep definer semantics and suppress the lint — this file, today.
--
-- This migration changes NO behaviour. It writes the finding where the next advisor sweep
-- will meet it.

BEGIN;

COMMENT ON VIEW public.marketplace_employer_profiles IS
  'PUBLIC GATEWAY VIEW — security_invoker = false is DELIBERATE (audit 2026-08-21, migration 104). '
  'Projects 10 marketing columns + computed accredited_employer, filtered to employers with a '
  'published listing; no user_id, no contact details, no stripe_customer_id. Definer rights are '
  'what let anon read it at all: anon holds NO column grants on employer_profiles and there is no '
  'anon RLS policy there, so switching to security_invoker=true raises 42501 and empties the public '
  'jobs board. Proven twice in rolled-back transactions on prod. Even the full 059 restore '
  '(policy + anon grants + invoker) regresses seekers: jobs RLS limits the caller to status=active, '
  'so an employer whose listing is filled or expired disappears from the seeker''s own application '
  'history. Do not "fix" the advisor ERROR with a bare ALTER VIEW. See 104 for the three options.';

COMMIT;
