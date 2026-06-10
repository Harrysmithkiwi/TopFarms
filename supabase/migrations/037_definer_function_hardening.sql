-- 037: SECURITY DEFINER function hardening (audit F7 + F8)
--
-- ███ STAGED FOR PRE-LAUNCH REVIEW — DO NOT APPLY WITHOUT OPERATOR ███
-- Prepared 2026-06-10 (session item 7). Generated from the advisor sweep of
-- the same date: 32 definer functions REST-callable by anon via
-- /rest/v1/rpc/<name>. Numbered 037 because 036 (storage policy) was applied
-- first the same day.
--
-- Apply path when the time comes: Studio SQL Editor or Management API per
-- CLAUDE §2 (registry row via `supabase migration repair --status applied 037`
-- afterwards — see .planning/REGISTRY-REPAIR-PLAN-2026-06-10.md).
--
-- Post-apply verification checklist (run ALL before closing F7/F8):
--   1. Signup (email+password) creates user_roles row  ← handle_new_user path
--   2. OAuth signup -> SelectRole -> role set           ← set_user_role path
--   3. Landing page counters render                    ← get_platform_stats as anon
--   4. /jobs renders for a logged-in seeker            ← get_user_role inside RLS
--   5. Admin lists load                                ← admin_* as authenticated
--   6. advisor sweep: anon_security_definer lint count drops 32 -> 2
--      (get_platform_stats + get_user_role remain BY DESIGN, see below)

BEGIN;

-- ─── Category A: revoke anon only (client calls these AUTHENTICATED) ────────
-- admin_* keep `authenticated` because AdminTable invokes them dynamically
-- (rpc prop) and _admin_gate() enforces the admin check inside each body.
REVOKE EXECUTE ON FUNCTION public.admin_add_note(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_approve_document(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_daily_briefing() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_system_alerts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_user_audit(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_user_profile(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_analytics_events(text, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_document_queue(integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_employers(text, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_jobs(text, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_placements(integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_seekers(text, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_reject_document(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_request_more_info(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_active(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_skill_coverage() FROM anon;
REVOKE EXECUTE ON FUNCTION public.compute_match_score(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.compute_match_scores_batch(uuid, uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.estimate_match_pool(text, text[], boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_adjacent_regions(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_applicants_for_job(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_job_filled(uuid, uuid) FROM anon;

-- ⚠ SIGNUP-PATH RISK (flagged per session brief): set_user_role is called by
-- the AUTHENTICATED client in two places — AuthContext.tsx signUpWithRole
-- backfill and SelectRole.tsx (OAuth flow). It must KEEP `authenticated`.
-- Revoking anon is safe: by the time either call fires, a session exists.
REVOKE EXECUTE ON FUNCTION public.set_user_role(text) FROM anon;

-- ─── Category B: revoke BOTH anon and authenticated (never REST-called) ─────
-- _admin_gate is only PERFORMed inside other definer functions (runs with the
-- owner's privileges, no client ACL needed).
REVOKE EXECUTE ON FUNCTION public._admin_gate() FROM anon, authenticated;

-- ⚠ SIGNUP-PATH RISK (flagged per session brief): handle_new_user fires as a
-- trigger on auth.users INSERT. Postgres does NOT re-check EXECUTE ACLs when
-- firing triggers, so revoking REST access does not stop the trigger — but
-- this is exactly the assumption post-apply check #1 exists to prove. If
-- signup stops creating user_roles rows after apply, REVERT THIS BLOCK FIRST.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_job_filled() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_match_scores_on_status_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_recompute_job_scores() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_recompute_seeker_scores() FROM anon, authenticated;

-- ─── Category C: KEEP grants — revoking would break the app ─────────────────
-- get_platform_stats(): called AS ANON by the public landing page
--   (CountersSection -> rpc/get_platform_stats). Intentionally public.
-- get_user_role(uuid): called INSIDE RLS policy USING expressions (jobs,
--   employer_profiles, ... — policies evaluate as the querying role, so anon
--   and authenticated both need EXECUTE). Revoking = permission-denied on
--   every table read app-wide. DO NOT REVOKE.
-- Consequence: the advisor's anon_security_definer lint will keep exactly
-- these 2 entries after apply. That is the accepted end state.

-- F8: pin the one definer function with a mutable search_path (the rest
-- adopted SET search_path = public from migration 023 onward).
ALTER FUNCTION public.get_platform_stats() SET search_path = public;

COMMIT;

-- Optional follow-up (NOT included in this migration — decide separately):
-- make revoke-by-default the posture for FUTURE functions, so the next
-- definer function isn't internet-callable on creation:
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public
--     REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
-- Trade-off: every future client-called RPC then needs an explicit GRANT,
-- which existing migration patterns (012, 016, 018, 023) already do anyway.
