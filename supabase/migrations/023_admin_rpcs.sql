-- ============================================================
-- 023_admin_rpcs.sql
-- TopFarms — Phase 20 Super Admin Dashboard backend
--
-- Single atomic migration introducing the admin RPC layer:
--   - user_roles.is_active boolean (suspension state, RESEARCH.md Pitfall 2 option b)
--   - admin_audit_log table (every admin mutation writes a row before returning)
--   - admin_notes table (additive only — no destructive ops on notes)
--   - admin_metrics_cache table (Resend stats + future external metrics)
--   - public._admin_gate() helper (single source of truth for admin role check)
--   - 10 SECURITY DEFINER admin_* RPCs (reads + drawer + suspend + add-note + audit)
--
-- All RPCs follow the SECURITY DEFINER + STABLE/(VOLATILE for mutations)
-- + SET search_path = public + GRANT EXECUTE TO authenticated pattern from
-- migrations 012 (read template) and 018 (mutation+caller-validation template).
--
-- Mutation RPCs (admin_set_user_active, admin_add_note) write a row into
-- public.admin_audit_log BEFORE returning to caller — see CONTEXT.md "Audit
-- governance" decision.
--
-- Apply via Supabase Studio SQL Editor (CLAUDE.md §2 — preferred path for
-- one-off DB writes; avoids the `--read-only` flag-flip restart cycle).
-- ============================================================

BEGIN;

-- ============================================================
-- Section 1 — Schema additions
-- ============================================================

-- 1.1 user_roles.is_active column (suspension state per RESEARCH.md Pitfall 2 option b)
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 1.2 admin_audit_log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action       text NOT NULL,
  target_table text NOT NULL,
  target_id    uuid,
  payload      jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS admin_audit_log_target_idx
  ON public.admin_audit_log (target_table, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_admin_idx
  ON public.admin_audit_log (admin_id, created_at DESC);
-- No RLS policies — read/write only via SECURITY DEFINER RPCs.

-- 1.3 admin_notes (additive only)
CREATE TABLE IF NOT EXISTS public.admin_notes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  content        text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS admin_notes_target_idx
  ON public.admin_notes (target_user_id, created_at DESC);

-- 1.4 admin_metrics_cache (Resend stats + future external metrics)
CREATE TABLE IF NOT EXISTS public.admin_metrics_cache (
  metric_key text PRIMARY KEY,
  value      jsonb NOT NULL,
  cached_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_metrics_cache ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Section 2 — Helper for admin gate (DRY for the 10 RPCs)
-- ============================================================

-- 2.1 Internal helper: raises if caller is not admin. Inline in every admin_* RPC.
-- Defined as a function so the gate logic lives in one place.
CREATE OR REPLACE FUNCTION public._admin_gate()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF public.get_user_role(auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;
END;
$$;
-- Not granted to anyone — only called from inside other SECURITY DEFINER RPCs.

-- ============================================================
-- Section 3 — 10 admin RPCs
--
-- Each follows the template:
--   SECURITY DEFINER + SET search_path = public + PERFORM _admin_gate() first
--   + return jsonb. Mutations write admin_audit_log row BEFORE returning.
-- ============================================================

-- 3.1 admin_get_daily_briefing — yesterday's signups/jobs/applications/placements + revenue snapshot + resend stats
CREATE OR REPLACE FUNCTION public.admin_get_daily_briefing()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_resend_row record;
  v_resend_payload jsonb;
BEGIN
  PERFORM public._admin_gate();

  SELECT value, cached_at INTO v_resend_row
    FROM public.admin_metrics_cache
    WHERE metric_key = 'resend_stats'
    LIMIT 1;

  IF v_resend_row.cached_at IS NULL THEN
    v_resend_payload := jsonb_build_object('unavailable', true);
  ELSIF v_resend_row.cached_at < (now() - interval '30 minutes') THEN
    v_resend_payload := jsonb_build_object(
      'stale', true,
      'cached_at', v_resend_row.cached_at,
      'value', v_resend_row.value
    );
  ELSE
    v_resend_payload := jsonb_build_object(
      'fresh', true,
      'cached_at', v_resend_row.cached_at,
      'value', v_resend_row.value
    );
  END IF;

  RETURN jsonb_build_object(
    'signups_yesterday', (
      SELECT count(*) FROM auth.users
      WHERE created_at >= (now() - interval '1 day') AND created_at < now()
    ),
    'jobs_posted_yesterday', (
      SELECT count(*) FROM public.jobs
      WHERE created_at >= (now() - interval '1 day') AND created_at < now()
    ),
    'applications_yesterday', (
      SELECT count(*) FROM public.applications
      WHERE created_at >= (now() - interval '1 day') AND created_at < now()
    ),
    'placements_acked_yesterday', (
      SELECT count(*) FROM public.placement_fees
      WHERE acknowledged_at >= (now() - interval '1 day')
        AND acknowledged_at < now()
    ),
    'revenue_snapshot', jsonb_build_object(
      'placements_acked_this_month', (
        SELECT count(*) FROM public.placement_fees
        WHERE acknowledged_at >= date_trunc('month', now())
      ),
      'placements_confirmed_this_month', (
        SELECT count(*) FROM public.placement_fees
        WHERE confirmed_at >= date_trunc('month', now())
      )
    ),
    'resend_stats', v_resend_payload
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_daily_briefing() TO authenticated;

-- 3.2 admin_get_system_alerts — recent webhook failures + cron health
CREATE OR REPLACE FUNCTION public.admin_get_system_alerts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  PERFORM public._admin_gate();

  RETURN jsonb_build_object(
    'webhook_failures', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'status_code', status_code,
        'error_body', LEFT(content::text, 500),
        'created', created
      ) ORDER BY created DESC)
      FROM (
        SELECT id, status_code, content, created
        FROM net._http_response
        WHERE status_code IS NULL OR status_code >= 400
        ORDER BY created DESC
        LIMIT 50
      ) recent_failures
    ), '[]'::jsonb),
    'cron_health', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'jobname', jobname,
        'last_status', last_status,
        'last_message', last_message,
        'last_start', last_start,
        'last_end', last_end
      ))
      FROM (
        SELECT
          j.jobname,
          rd.status AS last_status,
          rd.return_message AS last_message,
          rd.start_time AS last_start,
          rd.end_time AS last_end
        FROM cron.job j
        LEFT JOIN LATERAL (
          SELECT * FROM cron.job_run_details
          WHERE jobid = j.jobid
          ORDER BY start_time DESC
          LIMIT 1
        ) rd ON true
        ORDER BY j.jobname
      ) cron_summary
    ), '[]'::jsonb)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_system_alerts() TO authenticated;

-- 3.3 admin_list_employers — paginated + searchable
CREATE OR REPLACE FUNCTION public.admin_list_employers(
  p_search text DEFAULT NULL,
  p_limit  int  DEFAULT 25,
  p_offset int  DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_rows jsonb;
BEGIN
  PERFORM public._admin_gate();

  SELECT count(*) INTO v_total
  FROM public.employer_profiles ep
  JOIN auth.users u ON u.id = ep.user_id
  LEFT JOIN public.user_roles ur ON ur.user_id = ep.user_id
  WHERE p_search IS NULL OR p_search = ''
     OR ep.farm_name ILIKE '%' || p_search || '%'
     OR u.email ILIKE '%' || p_search || '%';

  SELECT COALESCE(jsonb_agg(row_obj ORDER BY created_at DESC), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'user_id', ep.user_id,
      'name', ep.farm_name,
      'email', u.email,
      'verification_tier', (
        -- Reverse-map: prefer most-advanced verified method from employer_verifications
        SELECT CASE
          WHEN EXISTS (SELECT 1 FROM public.employer_verifications ev
            WHERE ev.employer_id = ep.id AND ev.method = 'nzbn' AND ev.status = 'verified')
            THEN 'nzbn'
          WHEN EXISTS (SELECT 1 FROM public.employer_verifications ev
            WHERE ev.employer_id = ep.id AND ev.method = 'email' AND ev.status = 'verified')
            THEN 'email'
          WHEN ep.verification_tier >= 4 THEN 'featured'
          ELSE 'unverified'
        END
      ),
      'joined', ep.created_at,
      'jobs_count', (
        SELECT count(*) FROM public.jobs j WHERE j.employer_id = ep.id
      ),
      'is_active', COALESCE(ur.is_active, true)
    ) AS row_obj,
    ep.created_at
    FROM public.employer_profiles ep
    JOIN auth.users u ON u.id = ep.user_id
    LEFT JOIN public.user_roles ur ON ur.user_id = ep.user_id
    WHERE p_search IS NULL OR p_search = ''
       OR ep.farm_name ILIKE '%' || p_search || '%'
       OR u.email ILIKE '%' || p_search || '%'
    ORDER BY ep.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_employers(text, int, int) TO authenticated;

-- 3.4 admin_list_seekers — paginated + searchable
CREATE OR REPLACE FUNCTION public.admin_list_seekers(
  p_search text DEFAULT NULL,
  p_limit  int  DEFAULT 25,
  p_offset int  DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_rows jsonb;
BEGIN
  PERFORM public._admin_gate();

  SELECT count(*) INTO v_total
  FROM public.seeker_profiles sp
  JOIN auth.users u ON u.id = sp.user_id
  LEFT JOIN public.seeker_contacts sc ON sc.seeker_id = sp.id
  LEFT JOIN public.user_roles ur ON ur.user_id = sp.user_id
  WHERE p_search IS NULL OR p_search = ''
     OR u.email ILIKE '%' || p_search || '%'
     OR COALESCE(sc.email, '') ILIKE '%' || p_search || '%'
     OR sp.region ILIKE '%' || p_search || '%';

  SELECT COALESCE(jsonb_agg(row_obj ORDER BY created_at DESC), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'user_id', sp.user_id,
      'name', COALESCE(sc.first_name || ' ' || sc.last_name, u.email),
      'email', COALESCE(sc.email, u.email),
      'region', sp.region,
      'onboarding_complete', sp.onboarding_complete,
      'onboarding_step', sp.onboarding_step,
      'match_scores_computed', EXISTS(
        SELECT 1 FROM public.match_scores ms WHERE ms.seeker_id = sp.id
      ),
      'joined', sp.created_at,
      'is_active', COALESCE(ur.is_active, true)
    ) AS row_obj,
    sp.created_at
    FROM public.seeker_profiles sp
    JOIN auth.users u ON u.id = sp.user_id
    LEFT JOIN public.seeker_contacts sc ON sc.seeker_id = sp.id
    LEFT JOIN public.user_roles ur ON ur.user_id = sp.user_id
    WHERE p_search IS NULL OR p_search = ''
       OR u.email ILIKE '%' || p_search || '%'
       OR COALESCE(sc.email, '') ILIKE '%' || p_search || '%'
       OR sp.region ILIKE '%' || p_search || '%'
    ORDER BY sp.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_seekers(text, int, int) TO authenticated;

-- 3.5 admin_list_jobs — paginated + searchable + applicant count
CREATE OR REPLACE FUNCTION public.admin_list_jobs(
  p_search text DEFAULT NULL,
  p_limit  int  DEFAULT 25,
  p_offset int  DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_rows jsonb;
BEGIN
  PERFORM public._admin_gate();

  SELECT count(*) INTO v_total
  FROM public.jobs j
  LEFT JOIN public.employer_profiles ep ON ep.id = j.employer_id
  WHERE p_search IS NULL OR p_search = ''
     OR j.title ILIKE '%' || p_search || '%'
     OR ep.farm_name ILIKE '%' || p_search || '%';

  SELECT COALESCE(jsonb_agg(row_obj ORDER BY created_at DESC), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id', j.id,
      'title', j.title,
      'status', j.status,
      'employer_id', j.employer_id,
      'employer_name', ep.farm_name,
      'applicant_count', (
        SELECT count(*) FROM public.applications a WHERE a.job_id = j.id
      ),
      'days_live', GREATEST(0, EXTRACT(day FROM (now() - j.created_at))::int),
      'last_applicant_at', (
        SELECT max(a.created_at) FROM public.applications a WHERE a.job_id = j.id
      ),
      'created_at', j.created_at
    ) AS row_obj,
    j.created_at
    FROM public.jobs j
    LEFT JOIN public.employer_profiles ep ON ep.id = j.employer_id
    WHERE p_search IS NULL OR p_search = ''
       OR j.title ILIKE '%' || p_search || '%'
       OR ep.farm_name ILIKE '%' || p_search || '%'
    ORDER BY j.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_jobs(text, int, int) TO authenticated;

-- 3.6 admin_list_placements — ack'd, not confirmed, with overdue flag
CREATE OR REPLACE FUNCTION public.admin_list_placements(
  p_limit  int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_rows jsonb;
BEGIN
  PERFORM public._admin_gate();

  SELECT count(*) INTO v_total
  FROM public.placement_fees pf
  WHERE pf.acknowledged_at IS NOT NULL
    AND pf.confirmed_at IS NULL;

  SELECT COALESCE(jsonb_agg(row_obj ORDER BY ack_at), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id', pf.id,
      'employer_id', pf.employer_id,
      'employer_name', ep.farm_name,
      'acknowledged_at', pf.acknowledged_at,
      'days_since_ack', GREATEST(0, EXTRACT(day FROM (now() - pf.acknowledged_at))::int),
      'is_overdue', (now() - pf.acknowledged_at) > interval '14 days',
      'confirmed_at', pf.confirmed_at,
      'stripe_customer_id', ep.stripe_customer_id,
      'stripe_invoice_id', pf.stripe_invoice_id,
      'fee_tier', pf.fee_tier
    ) AS row_obj,
    pf.acknowledged_at AS ack_at
    FROM public.placement_fees pf
    LEFT JOIN public.employer_profiles ep ON ep.id = pf.employer_id
    WHERE pf.acknowledged_at IS NOT NULL
      AND pf.confirmed_at IS NULL
    ORDER BY pf.acknowledged_at ASC
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_placements(int, int) TO authenticated;

-- 3.7 admin_get_user_profile — drawer JSONB shape per UI-SPEC
CREATE OR REPLACE FUNCTION public.admin_get_user_profile(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_user record;
  v_payload jsonb;
BEGIN
  PERFORM public._admin_gate();

  SELECT ur.role INTO v_role FROM public.user_roles ur WHERE ur.user_id = p_user_id LIMIT 1;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'No user_roles row for %', p_user_id;
  END IF;

  SELECT u.email, u.created_at AS join_date, u.last_sign_in_at INTO v_user
  FROM auth.users u WHERE u.id = p_user_id;

  IF v_role = 'employer' THEN
    SELECT jsonb_build_object(
      'role', 'employer',
      'name', ep.farm_name,
      'email', v_user.email,
      'region', ep.region,
      'join_date', v_user.join_date,
      'last_sign_in', v_user.last_sign_in_at,
      'verification_tier', (
        SELECT CASE
          WHEN EXISTS (SELECT 1 FROM public.employer_verifications ev
            WHERE ev.employer_id = ep.id AND ev.method = 'nzbn' AND ev.status = 'verified')
            THEN 'nzbn'
          WHEN EXISTS (SELECT 1 FROM public.employer_verifications ev
            WHERE ev.employer_id = ep.id AND ev.method = 'email' AND ev.status = 'verified')
            THEN 'email'
          WHEN ep.verification_tier >= 4 THEN 'featured'
          ELSE 'unverified'
        END
      ),
      'total_jobs_posted', (
        SELECT count(*) FROM public.jobs j WHERE j.employer_id = ep.id
      )
    ) INTO v_payload
    FROM public.employer_profiles ep WHERE ep.user_id = p_user_id;
  ELSIF v_role = 'seeker' THEN
    SELECT jsonb_build_object(
      'role', 'seeker',
      'name', COALESCE(sc.first_name || ' ' || sc.last_name, v_user.email),
      'email', COALESCE(sc.email, v_user.email),
      'region', sp.region,
      'join_date', v_user.join_date,
      'last_sign_in', v_user.last_sign_in_at,
      'onboarding_complete', sp.onboarding_complete,
      'onboarding_step', GREATEST(1, LEAST(7, sp.onboarding_step)),
      'match_scores_computed', EXISTS(
        SELECT 1 FROM public.match_scores ms WHERE ms.seeker_id = sp.id
      )
    ) INTO v_payload
    FROM public.seeker_profiles sp
    LEFT JOIN public.seeker_contacts sc ON sc.seeker_id = sp.id
    WHERE sp.user_id = p_user_id;
  ELSE
    -- admin or unknown — return minimal shape
    v_payload := jsonb_build_object(
      'role', v_role,
      'email', v_user.email,
      'join_date', v_user.join_date,
      'last_sign_in', v_user.last_sign_in_at
    );
  END IF;

  RETURN v_payload;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_user_profile(uuid) TO authenticated;

-- 3.8 admin_set_user_active — suspend/reactivate + audit
CREATE OR REPLACE FUNCTION public.admin_set_user_active(
  p_user_id uuid,
  p_active  boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_before    boolean;
BEGIN
  PERFORM public._admin_gate();

  SELECT is_active INTO v_before FROM public.user_roles WHERE user_id = p_user_id;
  IF v_before IS NULL THEN
    RAISE EXCEPTION 'No user_roles row for %', p_user_id;
  END IF;

  UPDATE public.user_roles SET is_active = p_active WHERE user_id = p_user_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (
    v_caller_id,
    CASE WHEN p_active THEN 'reactivate_user' ELSE 'suspend_user' END,
    'user_roles',
    p_user_id,
    jsonb_build_object('before', v_before, 'after', p_active)
  );

  RETURN jsonb_build_object('ok', true, 'before', v_before, 'after', p_active);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_user_active(uuid, boolean) TO authenticated;

-- 3.9 admin_add_note — additive only
CREATE OR REPLACE FUNCTION public.admin_add_note(
  p_target_user_id uuid,
  p_content text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_note_id uuid;
  v_note_row record;
BEGIN
  PERFORM public._admin_gate();

  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Note content cannot be empty';
  END IF;

  INSERT INTO public.admin_notes (target_user_id, admin_id, content)
  VALUES (p_target_user_id, v_caller_id, p_content)
  RETURNING id INTO v_note_id;

  SELECT * INTO v_note_row FROM public.admin_notes WHERE id = v_note_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (
    v_caller_id,
    'add_note',
    'admin_notes',
    p_target_user_id,
    jsonb_build_object('note_id', v_note_id, 'preview', LEFT(p_content, 80))
  );

  RETURN jsonb_build_object(
    'id', v_note_row.id,
    'target_user_id', v_note_row.target_user_id,
    'admin_id', v_note_row.admin_id,
    'content', v_note_row.content,
    'created_at', v_note_row.created_at
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_add_note(uuid, text) TO authenticated;

-- 3.10 admin_get_user_audit — drawer "Activity" timeline (also fetches notes for display)
CREATE OR REPLACE FUNCTION public.admin_get_user_audit(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_audit jsonb;
  v_notes jsonb;
BEGIN
  PERFORM public._admin_gate();

  SELECT COALESCE(jsonb_agg(row_obj ORDER BY created_at DESC), '[]'::jsonb) INTO v_audit
  FROM (
    SELECT jsonb_build_object(
      'id', al.id,
      'action', al.action,
      'admin_id', al.admin_id,
      'payload', al.payload,
      'created_at', al.created_at
    ) AS row_obj,
    al.created_at
    FROM public.admin_audit_log al
    WHERE al.target_id = p_user_id
    ORDER BY al.created_at DESC
    LIMIT 100
  ) sub;

  SELECT COALESCE(jsonb_agg(row_obj ORDER BY created_at DESC), '[]'::jsonb) INTO v_notes
  FROM (
    SELECT jsonb_build_object(
      'id', n.id,
      'admin_id', n.admin_id,
      'content', n.content,
      'created_at', n.created_at
    ) AS row_obj,
    n.created_at
    FROM public.admin_notes n
    WHERE n.target_user_id = p_user_id
    ORDER BY n.created_at DESC
    LIMIT 100
  ) sub;

  RETURN jsonb_build_object('audit', v_audit, 'notes', v_notes);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_user_audit(uuid) TO authenticated;

COMMIT;
