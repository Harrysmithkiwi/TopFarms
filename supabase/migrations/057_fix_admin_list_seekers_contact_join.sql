-- UAT 2026-07-23: admin_list_seekers referenced seeker_contacts.seeker_id and
-- first_name/last_name, none of which exist (schema drift vs migration 023-era
-- assumptions). Join on user_id and fall back to email for the display name.
-- Applied to prod 2026-07-23 via MCP apply_migration (fix_admin_list_seekers_contact_join).
CREATE OR REPLACE FUNCTION public.admin_list_seekers(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 25, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total int;
  v_rows jsonb;
BEGIN
  PERFORM public._admin_gate();
  SELECT count(*) INTO v_total
  FROM public.seeker_profiles sp
  JOIN auth.users u ON u.id = sp.user_id
  LEFT JOIN public.seeker_contacts sc ON sc.user_id = sp.user_id
  WHERE p_search IS NULL OR p_search = ''
     OR u.email ILIKE '%' || p_search || '%'
     OR COALESCE(sc.email, '') ILIKE '%' || p_search || '%'
     OR sp.region ILIKE '%' || p_search || '%';
  SELECT COALESCE(jsonb_agg(row_obj ORDER BY created_at DESC), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'user_id', sp.user_id,
      'name', COALESCE(sc.email, u.email),
      'email', COALESCE(sc.email, u.email),
      'region', sp.region,
      'onboarding_complete', sp.onboarding_complete,
      'onboarding_step', sp.onboarding_step,
      'match_scores_computed', EXISTS(SELECT 1 FROM public.match_scores ms WHERE ms.seeker_id = sp.id),
      'joined', sp.created_at,
      'is_active', COALESCE(ur.is_active, true)
    ) AS row_obj, sp.created_at
    FROM public.seeker_profiles sp
    JOIN auth.users u ON u.id = sp.user_id
    LEFT JOIN public.seeker_contacts sc ON sc.user_id = sp.user_id
    LEFT JOIN public.user_roles ur ON ur.user_id = sp.user_id
    WHERE p_search IS NULL OR p_search = ''
       OR u.email ILIKE '%' || p_search || '%'
       OR COALESCE(sc.email, '') ILIKE '%' || p_search || '%'
       OR sp.region ILIKE '%' || p_search || '%'
    ORDER BY sp.created_at DESC LIMIT p_limit OFFSET p_offset
  ) sub;
  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END;
$function$;
