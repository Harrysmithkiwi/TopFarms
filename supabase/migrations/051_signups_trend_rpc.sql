-- 050: admin_get_signups_trend — daily signups timeseries (TREND-WIRE)
--
-- Feeds the DailyBriefing "Signups, last N days" AreaChart, replacing the
-- typed MOCK_TREND placeholder. Returns a CONTINUOUS daily series (zero-fill
-- days with no signups via generate_series LEFT JOIN) so the chart x-axis has
-- no gaps. Aggregates only — no user ids/emails leave the function.
--
-- 023-family pattern: SECURITY DEFINER, SET search_path=public, _admin_gate()
-- first, jsonb out. p_days clamped to [1, 90].
--
-- Day buckets are UTC calendar days (created_at::date), matching the UTC-window
-- convention used by admin_get_daily_briefing. Pre-launch volume makes the TZ
-- nuance immaterial; revisit to Pacific/Auckland bucketing if day-boundary
-- accuracy ever matters.

CREATE OR REPLACE FUNCTION public.admin_get_signups_trend(p_days int DEFAULT 14)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_days int := LEAST(GREATEST(COALESCE(p_days, 14), 1), 90);
BEGIN
  PERFORM public._admin_gate();

  RETURN COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object('date', d.day, 'signups', COALESCE(c.n, 0))
        ORDER BY d.day
      )
      FROM (
        SELECT (current_date - gs)::date AS day
        FROM generate_series(0, v_days - 1) AS gs
      ) d
      LEFT JOIN (
        SELECT created_at::date AS day, count(*) AS n
        FROM auth.users
        WHERE created_at >= (current_date - (v_days - 1))::timestamptz
        GROUP BY created_at::date
      ) c ON c.day = d.day
    ),
    '[]'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_signups_trend(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_signups_trend(int) TO authenticated;
