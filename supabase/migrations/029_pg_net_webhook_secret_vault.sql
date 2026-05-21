-- ============================================================
-- 029_pg_net_webhook_secret_vault.sql
-- TopFarms — Phase 18.1 — amend 028's current_setting approach to Vault
--
-- 028 read the webhook secret via current_setting('app.webhook_secret', true),
-- which requires ALTER DATABASE postgres SET app.webhook_secret = '...'
-- That command is blocked on this Supabase plan (permission denied from Studio
-- and CLI db-execute path hits the known pooler auth issue).
--
-- Fix: switch to the same vault.decrypted_secrets subselect already used for
-- supabase_url and service_role_key in this function (017 → 022 → 028 precedent).
-- Operator stores the secret in Vault via Studio (vault.create_secret()) before
-- applying this migration.
--
-- The COALESCE(v_secret, '') guard is preserved: if the Vault row is missing,
-- the pg_net call sends an empty header → Edge Function 403s (fail-closed on
-- the notification, not on the job-status UPDATE which succeeds independently
-- since pg_net.http_post is async fire-and-forget).
--
-- Apply path: Supabase Studio SQL Editor for project ref inlagtgpynemhipnqvty
-- (CLAUDE §2). Run vault.create_secret() FIRST (see operator instructions
-- below), then apply this migration.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_job_filled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload  jsonb;
  v_secret text;
BEGIN
  IF (OLD.status IS DISTINCT FROM 'filled') AND (NEW.status = 'filled') THEN
    payload := jsonb_build_object(
      'type',       'UPDATE',
      'table',      'jobs',
      'schema',     'public',
      'record',     row_to_json(NEW)::jsonb,
      'old_record', row_to_json(OLD)::jsonb
    );

    -- Read webhook secret from Vault (same pattern as supabase_url / service_role_key).
    -- Returns NULL if secret is missing; COALESCE('') degrades gracefully (403 on
    -- the async pg_net call) without blocking the parent UPDATE transaction.
    v_secret := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'WEBHOOK_SECRET');

    PERFORM net.http_post(
      url     := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/notify-job-filled',
      headers := jsonb_build_object(
        'Content-Type',     'application/json',
        'Authorization',    'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
        'X-Webhook-Secret', COALESCE(v_secret, '')
      ),
      body    := payload
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Post-verify: confirm current_setting is gone and Vault lookup is present
DO $verify$
DECLARE
  v_fn_def text;
BEGIN
  v_fn_def := pg_get_functiondef('public.handle_job_filled'::regproc);

  IF position('current_setting' IN v_fn_def) > 0 THEN
    RAISE EXCEPTION 'handle_job_filled still contains current_setting — migration did not apply cleanly';
  END IF;

  IF position('vault.decrypted_secrets' IN v_fn_def) = 0 THEN
    RAISE EXCEPTION 'handle_job_filled missing vault.decrypted_secrets lookup';
  END IF;

  IF position('WEBHOOK_SECRET' IN v_fn_def) = 0 THEN
    RAISE EXCEPTION 'handle_job_filled missing WEBHOOK_SECRET vault lookup';
  END IF;

  RAISE NOTICE 'Post-verify OK: handle_job_filled uses Vault for WEBHOOK_SECRET (current_setting removed).';
END;
$verify$;

COMMIT;
