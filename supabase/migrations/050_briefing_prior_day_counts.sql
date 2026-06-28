-- 050: prior-day counts on admin_get_daily_briefing (DELTA-WIRE)
--
-- The briefing returned only yesterday's single counts, so the DailyBriefing
-- KPI cards had no baseline to compute a delta against and rendered a stub
-- "vs prior day —". This CREATE OR REPLACE adds the four matching prior-day
-- counts (the 24h window *before* yesterday's window) so the frontend can
-- compute a real % delta and light up the coloured ↑/↓ pills.
--
-- Additive only: every key the prior version returned is preserved byte-for-byte;
-- four *_prior keys are appended. No signature change, so the existing GRANT
-- still applies (re-stated below for Studio-apply idempotency).
--
-- Yesterday window  = [now()-1d, now())
-- Prior-day window  = [now()-2d, now()-1d)

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
    'signups_prior', (
      SELECT count(*) FROM auth.users
      WHERE created_at >= (now() - interval '2 days') AND created_at < (now() - interval '1 day')
    ),
    'jobs_posted_yesterday', (
      SELECT count(*) FROM public.jobs
      WHERE created_at >= (now() - interval '1 day') AND created_at < now()
    ),
    'jobs_posted_prior', (
      SELECT count(*) FROM public.jobs
      WHERE created_at >= (now() - interval '2 days') AND created_at < (now() - interval '1 day')
    ),
    'applications_yesterday', (
      SELECT count(*) FROM public.applications
      WHERE created_at >= (now() - interval '1 day') AND created_at < now()
    ),
    'applications_prior', (
      SELECT count(*) FROM public.applications
      WHERE created_at >= (now() - interval '2 days') AND created_at < (now() - interval '1 day')
    ),
    'placements_acked_yesterday', (
      SELECT count(*) FROM public.placement_fees
      WHERE acknowledged_at >= (now() - interval '1 day')
        AND acknowledged_at < now()
    ),
    'placements_acked_prior', (
      SELECT count(*) FROM public.placement_fees
      WHERE acknowledged_at >= (now() - interval '2 days')
        AND acknowledged_at < (now() - interval '1 day')
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
