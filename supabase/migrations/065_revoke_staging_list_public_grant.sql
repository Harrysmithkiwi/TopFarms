-- 065: revoke the anon/PUBLIC EXECUTE grant on admin_leads_staging_list.
--
-- Audit finding F-S4 (P2). Every other admin_* function is granted to `authenticated`
-- only; this one alone carried EXECUTE for `anon` and `PUBLIC`. It is not currently
-- exploitable — `PERFORM public._admin_gate()` is the first statement in the body and
-- raises for a null/non-admin caller — but the grant is inconsistent with the rest of
-- the surface and removes a layer of defence for no benefit.
--
-- Defence in depth, not a fix for a live hole: the gate stays exactly as it is.

-- Signature verified live 2026-07-30 via pg_get_function_identity_arguments:
--   (p_search text, p_limit integer, p_offset integer, p_sort text, p_dir text,
--    p_source text, p_hide_expired boolean, p_geo text)
-- Pre-state ACL: =X/postgres (PUBLIC) | anon=X | authenticated=X | service_role=X

REVOKE EXECUTE ON FUNCTION
  public.admin_leads_staging_list(text, integer, integer, text, text, text, boolean, text)
  FROM anon, PUBLIC;

-- Keep the intended callers working.
GRANT EXECUTE ON FUNCTION
  public.admin_leads_staging_list(text, integer, integer, text, text, text, boolean, text)
  TO authenticated, service_role;
