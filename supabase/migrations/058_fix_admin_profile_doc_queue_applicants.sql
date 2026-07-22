-- UAT 2026-07-23: schema-drift repairs. seeker_contacts keys on user_id (not
-- seeker_id) and has no first_name/last_name; match_scores has no
-- application_id; applications.seeker_id references seeker_profiles.id.
-- Applied to prod via MCP apply_migration 2026-07-23.

CREATE OR REPLACE FUNCTION public.get_applicants_for_job(p_job_id uuid)
 RETURNS TABLE(id uuid, seeker_id uuid, status text, display_name text, match_score integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_employer_user_id uuid;
BEGIN
  SELECT ur.user_id INTO v_employer_user_id
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
    AND ur.role = 'employer';

  IF v_employer_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.jobs j
    JOIN public.employer_profiles ep ON ep.id = j.employer_id
    WHERE j.id = p_job_id
      AND ep.user_id = v_employer_user_id
  ) THEN
    RAISE EXCEPTION 'Job not found or not owned by caller' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.seeker_id,
    a.status::text,
    COALESCE(sc.email, u.email, LEFT(a.id::text, 8)) AS display_name,
    COALESCE(ms.total_score, 0) AS match_score
  FROM public.applications a
  LEFT JOIN public.seeker_profiles sp ON sp.id = a.seeker_id
  LEFT JOIN public.seeker_contacts sc ON sc.user_id = sp.user_id
  LEFT JOIN auth.users u ON u.id = sp.user_id
  LEFT JOIN public.match_scores ms ON ms.job_id = a.job_id AND ms.seeker_id = a.seeker_id
  WHERE a.job_id = p_job_id
  ORDER BY COALESCE(ms.total_score, 0) DESC, a.created_at ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_user_profile(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_user record;
  v_payload jsonb;
BEGIN
  PERFORM public._admin_gate();
  SELECT ur.role INTO v_role FROM public.user_roles ur WHERE ur.user_id = p_user_id LIMIT 1;
  IF v_role IS NULL THEN RAISE EXCEPTION 'No user_roles row for %', p_user_id; END IF;
  SELECT u.email, u.created_at AS join_date, u.last_sign_in_at INTO v_user FROM auth.users u WHERE u.id = p_user_id;
  IF v_role = 'employer' THEN
    SELECT jsonb_build_object(
      'role', 'employer', 'name', ep.farm_name, 'email', v_user.email, 'region', ep.region,
      'join_date', v_user.join_date, 'last_sign_in', v_user.last_sign_in_at,
      'verification_tier', (SELECT CASE WHEN EXISTS (SELECT 1 FROM public.employer_verifications ev WHERE ev.employer_id = ep.id AND ev.method = 'nzbn' AND ev.status = 'verified') THEN 'nzbn' WHEN EXISTS (SELECT 1 FROM public.employer_verifications ev WHERE ev.employer_id = ep.id AND ev.method = 'email' AND ev.status = 'verified') THEN 'email' WHEN ep.verification_tier >= 4 THEN 'featured' ELSE 'unverified' END),
      'total_jobs_posted', (SELECT count(*) FROM public.jobs j WHERE j.employer_id = ep.id)
    ) INTO v_payload FROM public.employer_profiles ep WHERE ep.user_id = p_user_id;
  ELSIF v_role = 'seeker' THEN
    SELECT jsonb_build_object(
      'role', 'seeker', 'name', COALESCE(sc.email, v_user.email),
      'email', COALESCE(sc.email, v_user.email), 'region', sp.region,
      'join_date', v_user.join_date, 'last_sign_in', v_user.last_sign_in_at,
      'onboarding_complete', sp.onboarding_complete,
      'onboarding_step', GREATEST(1, LEAST(7, sp.onboarding_step)),
      'match_scores_computed', EXISTS(SELECT 1 FROM public.match_scores ms WHERE ms.seeker_id = sp.id)
    ) INTO v_payload FROM public.seeker_profiles sp LEFT JOIN public.seeker_contacts sc ON sc.user_id = sp.user_id WHERE sp.user_id = p_user_id;
  ELSE
    v_payload := jsonb_build_object('role', v_role, 'email', v_user.email, 'join_date', v_user.join_date, 'last_sign_in', v_user.last_sign_in_at);
  END IF;
  RETURN v_payload;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_document_queue(p_limit integer DEFAULT 25, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rows  jsonb;
  v_total int;
BEGIN
  PERFORM public._admin_gate();

  SELECT count(*) INTO v_total FROM public.seeker_documents;

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      sd.id            AS document_id,
      sp.user_id       AS seeker_user_id,
      COALESCE(sc.email, u.email, 'Unknown') AS seeker_name,
      sd.document_type,
      sd.filename,
      sd.uploaded_at,
      sd.status,
      sd.rejection_reason
    FROM public.seeker_documents sd
    JOIN public.seeker_profiles sp ON sp.id = sd.seeker_id
    LEFT JOIN public.seeker_contacts sc ON sc.user_id = sp.user_id
    LEFT JOIN auth.users u ON u.id = sp.user_id
    ORDER BY
      CASE WHEN sd.status = 'pending' THEN 0 ELSE 1 END,
      sd.uploaded_at DESC
    LIMIT p_limit OFFSET p_offset
  ) t;

  RETURN jsonb_build_object('rows', v_rows, 'total', v_total);
END;
$function$;
