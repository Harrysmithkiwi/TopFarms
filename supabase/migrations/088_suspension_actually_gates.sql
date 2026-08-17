-- 088 — Suspension gates something (audit finding F-01, Tier 1)
--
-- Live before this migration:
--
--   get_user_role(p_user_id) = SELECT role FROM user_roles WHERE user_id = p_user_id
--
-- No `is_active`. So `user_roles.is_active = false` — the column the admin suspend action
-- writes — changed nothing anywhere in the database. A suspended admin could still call every
-- admin RPC, including the one that un-suspends them.
--
-- The reach is why this is the best ratio in the register: one function body is read by 22 RLS
-- policies (jobs, applications, seeker_profiles, seeker_documents, seeker_contacts,
-- seeker_skills, employer_profiles, employer_verifications, match_scores, job_skills,
-- analytics_events, and three storage.objects upload policies) and, via `_admin_gate`, by
-- every admin RPC. No policy DDL is needed.
--
-- ── THE TRAP, and why both functions move together ──────────────────────────────────────
--
-- Adding the predicate makes a suspended user's role NULL rather than 'admin'. Every one of
-- the 22 policies compares with `=`:
--
--   get_user_role(auth.uid()) = 'employer'   →   NULL = 'employer'   →   NULL   →   denied
--
-- NULL is not true, so those all fail CLOSED. Correct, and no change needed.
--
-- `_admin_gate` is the single exception in the entire database — verified by scanning every
-- pg_proc body for a negated comparison, which returned exactly one row:
--
--   IF get_user_role(auth.uid()) != 'admin' THEN RAISE EXCEPTION 'Forbidden' END IF;
--
-- `NULL != 'admin'` is NULL, `IF NULL` is not true, so the RAISE never fires and the function
-- RETURNS NORMALLY. Shipping the predicate alone would therefore have taken the admin gate
-- from "lets suspended admins through" to "lets suspended admins through, and now also anyone
-- with no user_roles row at all" — strictly worse than the defect it was fixing.
--
-- `IS DISTINCT FROM` is NULL-safe and raises on both. **These two changes must stay in one
-- migration.** Splitting them opens the gate for the interval between them.
--
-- The client is unaffected: AuthContext's loadRole reads `user_roles` directly for
-- `role, is_active` and already routes suspended users to /suspended. This migration is the
-- server-side half that was missing, which is the half that actually enforces anything.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- `is_active` is NOT NULL DEFAULT true, so this narrows only rows explicitly suspended.
  SELECT role FROM public.user_roles WHERE user_id = p_user_id AND is_active;
$function$;

COMMENT ON FUNCTION public.get_user_role(uuid) IS
  'Effective role of a user, or NULL if suspended or unknown (audit F-01). Before 088 this ignored is_active entirely, so suspension gated nothing across 22 RLS policies and every admin RPC. Callers MUST compare with `=` (fails closed on NULL) or `IS DISTINCT FROM` — a bare `!=` returns NULL and silently passes.';

CREATE OR REPLACE FUNCTION public._admin_gate()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  -- Audit F-01: was `!= 'admin'`. Once get_user_role can return NULL, that comparison
  -- evaluates to NULL for a suspended admin and the exception never fires. IS DISTINCT FROM
  -- treats NULL as a difference, so suspended and role-less callers are both refused.
  IF public.get_user_role(auth.uid()) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;
END;
$function$;

COMMENT ON FUNCTION public._admin_gate() IS
  'Raises unless the caller is an ACTIVE admin (audit F-01). Uses IS DISTINCT FROM deliberately: get_user_role returns NULL for a suspended user, and `!=` against NULL yields NULL, which does not fire an IF and would leave this gate open.';

COMMIT;
