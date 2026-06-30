-- 056: lead-harvest watchdog notify — quiet-variant email alert
--
-- Separate watchdog (NOT in-function): an in-function emailer goes silent on the
-- worst case — a worker killed at wall-clock leaves a stale 'running' row and never
-- reaches a notify call. This reads lead_harvest_runs and catches that. Sends via
-- Resend HTTP directly (pg_net → api.resend.com), key from Vault 'resend_api_key' —
-- no Edge Function, no deploy path.
--
-- Quiet when latest run is status=complete AND new=0 AND no budget skips (healthy no-op).
-- Emails when: new>0 OR scrape errors>0 OR skipped_over_budget>0 (throttled/starved)
-- OR status in (error,partial) OR stale 'running' row OR no run in the window
-- (cron miss / 403 / pg_net failure).
--
-- Apply via Studio. Test without emailing:  SELECT public.lead_harvest_notify_check(true);

BEGIN;

CREATE OR REPLACE FUNCTION public.lead_harvest_notify_check(p_dry_run boolean DEFAULT false)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  r           record;
  v_new       int;
  v_err       int;
  v_scraped   int;
  v_inserted  int;
  v_skipped   int;
  v_notify    boolean := false;
  v_reason    text;
  v_subject   text;
  v_body      text;
BEGIN
  SELECT * INTO r
  FROM public.lead_harvest_runs
  WHERE started_at > now() - interval '40 minutes'
  ORDER BY started_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    v_notify  := true;
    v_reason  := 'no harvest run in last 40m (cron miss / function 403 / pg_net failure)';
    v_subject := 'TopFarms harvest — NO RUN recorded';
    v_body    := v_reason;
  ELSE
    -- Sum per-board counters (tally = {"<board>": {new,error,scraped,inserted,skipped_over_budget,...}}).
    -- A top-level tally.error string (catch path) is skipped here but caught by status below.
    SELECT COALESCE(SUM((b.value->>'new')::int), 0),
           COALESCE(SUM((b.value->>'error')::int), 0),
           COALESCE(SUM((b.value->>'scraped')::int), 0),
           COALESCE(SUM((b.value->>'inserted')::int), 0),
           COALESCE(SUM((b.value->>'skipped_over_budget')::int), 0)
      INTO v_new, v_err, v_scraped, v_inserted, v_skipped
    FROM jsonb_each(r.tally) AS b
    WHERE jsonb_typeof(b.value) = 'object';

    IF r.status = 'running' AND r.started_at < now() - interval '10 minutes' THEN
      v_notify := true;
      v_reason := 'stale running row — worker likely killed at wall-clock';
    ELSIF r.status IN ('error', 'partial') THEN
      v_notify := true;
      v_reason := 'run status=' || r.status
               || CASE WHEN v_skipped > 0 THEN ' (' || v_skipped || ' over-budget)' ELSE '' END;
    ELSIF v_new > 0 OR v_err > 0 OR v_skipped > 0 THEN
      v_notify := true;
      v_reason := v_new || ' new, ' || v_err || ' scrape error(s)'
               || CASE WHEN v_skipped > 0 THEN ', ' || v_skipped || ' skipped over budget' ELSE '' END;
    END IF;

    IF v_notify THEN
      v_subject := format('TopFarms harvest — %s new, %s error(s)%s%s',
                          v_new, v_err,
                          CASE WHEN v_skipped > 0 THEN ', ' || v_skipped || ' over-budget' ELSE '' END,
                          CASE WHEN r.status = 'complete' THEN '' ELSE ' [' || r.status || ']' END);
      v_body := format(E'Run %s\nstatus=%s  new=%s  scraped=%s  inserted=%s  error=%s  skipped_over_budget=%s\n\nReview: %s/admin/leads/staging',
                       r.id, r.status, v_new, v_scraped, v_inserted, v_err, v_skipped, 'https://topfarms.co.nz');
    END IF;
  END IF;

  IF NOT v_notify THEN
    RETURN 'quiet';
  END IF;

  IF p_dry_run THEN
    RETURN 'would send → ' || v_reason || ' | subject: ' || v_subject;
  END IF;

  PERFORM net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'resend_api_key'),
      'Content-Type',  'application/json'
    ),
    body := jsonb_build_object(
      'from',    'TopFarms <hello@topfarms.co.nz>',
      'to',      jsonb_build_array('harry.symmans.smith@gmail.com'),
      'subject', v_subject,
      'text',    v_body
    )
  );
  RETURN 'sent → ' || v_reason;
END
$fn$;

REVOKE ALL ON FUNCTION public.lead_harvest_notify_check(boolean) FROM PUBLIC, anon, authenticated;

-- 30 min after the harvest (02:00 → 02:30 UTC). Idempotent on name.
-- Fixed UTC; follows the harvest's DST drift (see 043) — ~3pm NZ under NZDT. Not a bug.
SELECT cron.schedule(
  'lead-harvest-notify',
  '30 2 * * *',
  $$SELECT public.lead_harvest_notify_check();$$
);

COMMIT;
