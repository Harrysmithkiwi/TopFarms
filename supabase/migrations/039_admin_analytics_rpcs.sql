-- 039: founder analytics RPCs (PHASE-ANALYTICS-DESIGN.md, approved 2026-06-11)
--
-- Four read-only SECURITY DEFINER RPCs, 023 pattern: SET search_path=public,
-- PERFORM _admin_gate() first, jsonb aggregates out. AGGREGATES ONLY — no
-- names, emails, user_ids, or row-level records leave these functions.
-- Access tier: existing admin role (operator decision 2026-06-11; the
-- admin_analytics_ prefix keeps a future founder-tier split to one migration).
--
-- Hardening upgrade over 023: explicit REVOKE FROM PUBLIC/anon (Postgres
-- default-grants EXECUTE to PUBLIC on creation — the very thing the advisor
-- flags on the 023 family and staged 037 retro-fixes). These are born clean.
-- No tables, no triggers, no policies, no writes.

BEGIN;

-- ─── 1. Funnel ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_analytics_funnel(p_from date DEFAULT NULL, p_to date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_from timestamptz := COALESCE(p_from::timestamptz, '-infinity');
  v_to   timestamptz := COALESCE((p_to + 1)::timestamptz, 'infinity'); -- end-inclusive date
BEGIN
  PERFORM public._admin_gate();

  RETURN jsonb_build_object(
    'range', jsonb_build_object('from', p_from, 'to', p_to),
    'seekers', jsonb_build_object(
      'signed_up', (SELECT count(*) FROM user_roles ur
                    WHERE ur.role = 'seeker' AND ur.created_at >= v_from AND ur.created_at < v_to),
      'onboarded', (SELECT count(*) FROM seeker_profiles sp
                    JOIN user_roles ur ON ur.user_id = sp.user_id
                    WHERE sp.onboarding_complete
                      AND ur.created_at >= v_from AND ur.created_at < v_to),
      'applied_ever', (SELECT count(DISTINCT a.seeker_id) FROM applications a
                       JOIN seeker_profiles sp ON sp.id = a.seeker_id
                       JOIN user_roles ur ON ur.user_id = sp.user_id
                       WHERE ur.created_at >= v_from AND ur.created_at < v_to),
      'hired', (SELECT count(DISTINCT a.seeker_id) FROM applications a
                JOIN seeker_profiles sp ON sp.id = a.seeker_id
                JOIN user_roles ur ON ur.user_id = sp.user_id
                WHERE a.status = 'hired'
                  AND ur.created_at >= v_from AND ur.created_at < v_to)
    ),
    'employers', jsonb_build_object(
      'signed_up', (SELECT count(*) FROM user_roles ur
                    WHERE ur.role = 'employer' AND ur.created_at >= v_from AND ur.created_at < v_to),
      'onboarded', (SELECT count(*) FROM employer_profiles ep
                    JOIN user_roles ur ON ur.user_id = ep.user_id
                    WHERE ep.onboarding_complete
                      AND ur.created_at >= v_from AND ur.created_at < v_to),
      'posted_job', (SELECT count(DISTINCT j.employer_id) FROM jobs j
                     JOIN employer_profiles ep ON ep.id = j.employer_id
                     JOIN user_roles ur ON ur.user_id = ep.user_id
                     WHERE j.status <> 'draft'
                       AND ur.created_at >= v_from AND ur.created_at < v_to),
      'filled_job', (SELECT count(DISTINCT j.employer_id) FROM jobs j
                     JOIN employer_profiles ep ON ep.id = j.employer_id
                     JOIN user_roles ur ON ur.user_id = ep.user_id
                     WHERE j.status = 'filled'
                       AND ur.created_at >= v_from AND ur.created_at < v_to)
    ),
    -- Snapshot of the live application pipeline (current statuses; the state
    -- machine has no transition timestamps — see design doc §2.1 gap).
    'pipeline', (SELECT COALESCE(jsonb_object_agg(s.status, s.n), '{}'::jsonb)
                 FROM (SELECT status, count(*) AS n FROM applications
                       WHERE created_at >= v_from AND created_at < v_to
                       GROUP BY status) s),
    'placements_confirmed', (SELECT count(*) FROM placement_fees
                             WHERE confirmed_at IS NOT NULL
                               AND confirmed_at >= v_from AND confirmed_at < v_to)
  );
END;
$$;

-- ─── 2. Cohort retention (proxies — see design doc §2.2 limitation) ─────────
CREATE OR REPLACE FUNCTION public.admin_analytics_cohorts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  PERFORM public._admin_gate();

  RETURN (
    WITH members AS (
      SELECT ur.user_id, ur.role,
             date_trunc('month', ur.created_at) AS cm,
             au.last_sign_in_at
      FROM user_roles ur
      JOIN auth.users au ON au.id = ur.user_id
      WHERE ur.role IN ('seeker', 'employer')
    ),
    acts AS (
      SELECT sp.user_id, a.created_at
      FROM applications a JOIN seeker_profiles sp ON sp.id = a.seeker_id
      UNION ALL
      SELECT ep.user_id, j.created_at
      FROM jobs j JOIN employer_profiles ep ON ep.id = j.employer_id
      WHERE j.status <> 'draft'
    ),
    flags AS (
      SELECT m.role, m.cm, m.last_sign_in_at,
        EXISTS (SELECT 1 FROM acts t WHERE t.user_id = m.user_id
                AND t.created_at >= m.cm + interval '1 month'
                AND t.created_at <  m.cm + interval '2 months') AS acted_m1,
        EXISTS (SELECT 1 FROM acts t WHERE t.user_id = m.user_id
                AND t.created_at >= m.cm + interval '2 months'
                AND t.created_at <  m.cm + interval '3 months') AS acted_m2,
        EXISTS (SELECT 1 FROM acts t WHERE t.user_id = m.user_id
                AND t.created_at >= m.cm + interval '3 months'
                AND t.created_at <  m.cm + interval '4 months') AS acted_m3
      FROM members m
    )
    SELECT jsonb_build_object(
      'note', 'sign-in recency + action proxies; true retention needs analytics_events instrumentation (design doc §2.2)',
      'cohorts', COALESCE(jsonb_agg(g ORDER BY g->>'cohort_month', g->>'role'), '[]'::jsonb)
    )
    FROM (
      SELECT jsonb_build_object(
        'cohort_month', to_char(cm, 'YYYY-MM'),
        'role', role,
        'size', count(*),
        'active_30d', count(*) FILTER (WHERE last_sign_in_at >= now() - interval '30 days'),
        'active_90d', count(*) FILTER (WHERE last_sign_in_at >= now() - interval '90 days'),
        'acted_m1', count(*) FILTER (WHERE acted_m1),
        'acted_m2', count(*) FILTER (WHERE acted_m2),
        'acted_m3', count(*) FILTER (WHERE acted_m3)
      ) AS g
      FROM flags
      GROUP BY cm, role
    ) cohort_rows
  );
END;
$$;

-- ─── 3. Match quality ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_analytics_match_quality()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  PERFORM public._admin_gate();

  RETURN (
    -- LEFT JOIN + 'unscored' band: migration 027's cleanup trigger deletes
    -- match_scores for closed jobs, so completed applications may be scoreless.
    WITH completed AS (
      SELECT a.status, ms.total_score
      FROM applications a
      LEFT JOIN match_scores ms
        ON ms.seeker_id = a.seeker_id AND ms.job_id = a.job_id
      WHERE a.status IN ('hired', 'declined')
    ),
    banded AS (
      SELECT status, total_score,
        CASE
          WHEN total_score IS NULL THEN 'unscored'
          WHEN total_score >= 85 THEN '85+'
          WHEN total_score >= 70 THEN '70-84'
          WHEN total_score >= 50 THEN '50-69'
          ELSE '<50'
        END AS band
      FROM completed
    )
    SELECT jsonb_build_object(
      'completed_total', (SELECT count(*) FROM banded),
      'low_n_warning', (SELECT count(*) FROM banded) < 30,
      'mean_score_hired', (SELECT round(avg(total_score)::numeric, 1) FROM banded
                           WHERE status = 'hired' AND total_score IS NOT NULL),
      'mean_score_declined', (SELECT round(avg(total_score)::numeric, 1) FROM banded
                              WHERE status = 'declined' AND total_score IS NOT NULL),
      'bands', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'band', band,
          'applications', n,
          'hired', hired,
          'placement_rate', CASE WHEN n > 0 THEN round(hired::numeric / n, 3) END
        ) ORDER BY band)
        FROM (SELECT band, count(*) AS n,
                     count(*) FILTER (WHERE status = 'hired') AS hired
              FROM banded GROUP BY band) b
      ), '[]'::jsonb)
    )
  );
END;
$$;

-- ─── 4. Revenue (real schema; zero rows until PEND-01 — empty is correct) ────
CREATE OR REPLACE FUNCTION public.admin_analytics_revenue(p_from date DEFAULT NULL, p_to date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_from timestamptz := COALESCE(p_from::timestamptz, '-infinity');
  v_to   timestamptz := COALESCE((p_to + 1)::timestamptz, 'infinity');
BEGIN
  PERFORM public._admin_gate();

  RETURN jsonb_build_object(
    'range', jsonb_build_object('from', p_from, 'to', p_to),
    'listing_fees', jsonb_build_object(
      'monthly', COALESCE((SELECT jsonb_agg(m ORDER BY m->>'month') FROM (
        SELECT jsonb_build_object('month', to_char(date_trunc('month', paid_at), 'YYYY-MM'),
                                  'payments', count(*), 'total_nzd', COALESCE(sum(amount_nzd), 0)) AS m
        FROM listing_fees WHERE paid_at >= v_from AND paid_at < v_to
        GROUP BY date_trunc('month', paid_at)) x), '[]'::jsonb),
      'by_tier', COALESCE((SELECT jsonb_agg(t ORDER BY t->>'tier') FROM (
        SELECT jsonb_build_object('tier', tier, 'payments', count(*),
                                  'total_nzd', COALESCE(sum(amount_nzd), 0)) AS t
        FROM listing_fees WHERE paid_at >= v_from AND paid_at < v_to
        GROUP BY tier) x), '[]'::jsonb)
    ),
    'placement_fees', jsonb_build_object(
      'monthly', COALESCE((SELECT jsonb_agg(m ORDER BY m->>'month') FROM (
        SELECT jsonb_build_object('month', to_char(date_trunc('month', confirmed_at), 'YYYY-MM'),
                                  'confirmed', count(*), 'total_nzd', COALESCE(sum(amount_nzd), 0)) AS m
        FROM placement_fees WHERE confirmed_at IS NOT NULL
          AND confirmed_at >= v_from AND confirmed_at < v_to
        GROUP BY date_trunc('month', confirmed_at)) x), '[]'::jsonb),
      'by_region', COALESCE((SELECT jsonb_agg(r ORDER BY r->>'region') FROM (
        SELECT jsonb_build_object('region', COALESCE(ep.region, 'unknown'),
                                  'confirmed', count(*), 'total_nzd', COALESCE(sum(pf.amount_nzd), 0)) AS r
        FROM placement_fees pf
        JOIN employer_profiles ep ON ep.id = pf.employer_id
        WHERE pf.confirmed_at IS NOT NULL
          AND pf.confirmed_at >= v_from AND pf.confirmed_at < v_to
        GROUP BY ep.region) x), '[]'::jsonb),
      'by_tier', COALESCE((SELECT jsonb_agg(t ORDER BY t->>'fee_tier') FROM (
        SELECT jsonb_build_object('fee_tier', fee_tier, 'confirmed', count(*),
                                  'total_nzd', COALESCE(sum(amount_nzd), 0)) AS t
        FROM placement_fees WHERE confirmed_at IS NOT NULL
          AND confirmed_at >= v_from AND confirmed_at < v_to
        GROUP BY fee_tier) x), '[]'::jsonb)
    ),
    'pipeline', jsonb_build_object(
      'acknowledged_unconfirmed', (SELECT count(*) FROM placement_fees
                                   WHERE confirmed_at IS NULL),
      'value_nzd', (SELECT COALESCE(sum(amount_nzd), 0) FROM placement_fees
                    WHERE confirmed_at IS NULL)
    )
  );
END;
$$;

-- ─── Grants: authenticated ONLY; strip the Postgres PUBLIC default ───────────
REVOKE ALL ON FUNCTION public.admin_analytics_funnel(date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_analytics_cohorts() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_analytics_match_quality() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_analytics_revenue(date, date) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_analytics_funnel(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_cohorts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_match_quality() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_revenue(date, date) TO authenticated;

COMMIT;
