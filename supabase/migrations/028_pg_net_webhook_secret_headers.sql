-- ============================================================
-- 028_pg_net_webhook_secret_headers.sql
-- TopFarms — Phase 18.1 #3 / orig #15 — pg_net caller-side header injection
--
-- Adds X-Webhook-Secret header to handle_job_filled (the only disk-side
-- pg_net.http_post caller for an Edge fn that gains validation in Phase 18.1).
--
-- send-followup-emails is invoked via Supabase scheduled function or operator-side
-- trigger, NOT via a pg_cron pg_net.http_post job. Empirical evidence:
--   - 011_placement_fee_followups.sql: the `placement-followup-flags` cron job is
--     a SQL-only UPDATE (flag-setter); no pg_net.http_post in its command body.
--   - supabase/config.toml: [functions.send-followup-emails] has verify_jwt=false
--     but NO [functions.send-followup-emails.schedule] block.
--   - Phase 20-08 STATE decision: the only Studio-applied pg_cron job invoking an
--     Edge fn via pg_net is `refresh-resend-stats` (jobid=4, invokes get-resend-stats).
--   - cron.job runtime query at plan 18.1-04 execution time: no row with command
--     containing pg_net.http_post AND /functions/v1/send-followup-emails found.
-- Therefore there is no SQL caller-side change needed for send-followup-emails.
-- The in-fn 403 check (Task 1) + operator-side scheduler config (plan 18.1-06)
-- cover that path.
--
-- The header value is read from current_setting('app.webhook_secret', true).
-- The TWO-ARGUMENT form (true = silent NULL on missing) is load-bearing:
-- without it, the trigger would error on first fire if operator hasn't run
-- ALTER DATABASE postgres SET app.webhook_secret yet. With it, the trigger
-- sends an empty header, the Edge fn returns 403 (Task 1 added this branch),
-- the trigger function does NOT raise (pg_net.http_post is async; the 403 is
-- the *response*, not a SQL exception). See 18.1-RESEARCH §Pitfall 3.
--
-- This decouples Wave 2 (this migration) from Wave 3 (operator deploy):
-- migration is non-blocking; functions break HARMLESSLY (403, no rollback)
-- until operator finishes Wave 3 (supabase secrets set + ALTER DATABASE +
-- supabase functions deploy).
--
-- Pattern source: 022 amends 017 via CREATE OR REPLACE FUNCTION (append-only
-- migration history; matches the existing precedent).
--
-- Apply path: Supabase Studio SQL Editor for project ref inlagtgpynemhipnqvty
-- (CLAUDE §2). Verify post-apply via read-only MCP pg_proc query.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_job_filled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payload jsonb;
  v_secret text;
BEGIN
  IF (OLD.status IS DISTINCT FROM 'filled') AND (NEW.status = 'filled') THEN
    payload := jsonb_build_object(
      'type', 'UPDATE',
      'table', 'jobs',
      'schema', 'public',
      'record', row_to_json(NEW)::jsonb,
      'old_record', row_to_json(OLD)::jsonb
    );

    -- Read app.webhook_secret from DB-level config. true = silent NULL on missing
    -- so the trigger doesn't error if operator hasn't set the secret yet.
    v_secret := current_setting('app.webhook_secret', true);

    PERFORM net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/notify-job-filled',
      headers := jsonb_build_object(
        'Content-Type',     'application/json',
        'Authorization',    'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
        'X-Webhook-Secret', COALESCE(v_secret, '')
      ),
      body := payload
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Post-verify
DO $verify$
DECLARE
  v_fn_def text;
BEGIN
  v_fn_def := pg_get_functiondef('public.handle_job_filled'::regproc);
  IF position('X-Webhook-Secret' IN v_fn_def) = 0 THEN
    RAISE EXCEPTION 'handle_job_filled body does not contain X-Webhook-Secret header';
  END IF;
  RAISE NOTICE 'Post-verify OK: handle_job_filled has X-Webhook-Secret. send-followup-emails caller is non-SQL — operator handles via plan 18.1-06.';
END;
$verify$;

COMMIT;
