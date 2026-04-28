-- ============================================================
-- 018_set_user_role_rpc.sql
-- TopFarms — Defensive RPC for user_roles writes (AUTH-02)
--
-- Closes two issues:
--   1. Email signup may silently fail to create user_roles row
--      (originally observed for harry.symmans.smith). SignUp.tsx
--      now backfills via this RPC if the handle_new_user trigger
--      didn't produce a row.
--   2. SelectRole.tsx (post-OAuth role selection) was attempting a
--      direct client INSERT into user_roles. With RLS enabled and
--      only a SELECT policy on the table (002_rls_policies.sql:88-90),
--      that INSERT either silently failed or conflicted with the
--      trigger's auto-created default 'seeker' row. SelectRole.tsx
--      now calls this RPC instead — idempotent UPSERT.
--
-- SECURITY DEFINER bypasses RLS safely — function validates the caller
-- (auth.uid() IS NOT NULL) and the input role string before UPSERTing.
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_user_role(p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_role NOT IN ('employer', 'seeker') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), p_role)
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_role(text) TO authenticated;
