-- ============================================================
-- 017_notify_job_filled_webhook.sql
-- TopFarms — Phase 13 notify-job-filled database webhook
-- ============================================================
-- Sets up a database trigger that fires when jobs.status transitions
-- to 'filled', invoking the notify-job-filled Edge Function via pg_net.
-- ============================================================

-- Ensure pg_net extension is available (Supabase Database Webhooks depend on it)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================
-- Trigger function: fires AFTER UPDATE on jobs when status
-- transitions TO 'filled'
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_job_filled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payload jsonb;
BEGIN
  -- Only fire when status transitions TO 'filled' (not already filled, not other changes)
  IF (OLD.status IS DISTINCT FROM 'filled') AND (NEW.status = 'filled') THEN
    payload := jsonb_build_object(
      'type', 'UPDATE',
      'table', 'jobs',
      'schema', 'public',
      'record', row_to_json(NEW)::jsonb,
      'old_record', row_to_json(OLD)::jsonb
    );

    PERFORM net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/notify-job-filled',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body := payload::text
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- Attach trigger to jobs table
-- ============================================================

DROP TRIGGER IF EXISTS on_job_filled ON public.jobs;
CREATE TRIGGER on_job_filled
  AFTER UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_job_filled();

-- ============================================================
-- NOTE: If vault.decrypted_secrets is not configured in your
-- Supabase project, configure the webhook via the Dashboard UI:
--   Database > Webhooks > Create new webhook
--   Table: jobs
--   Event: UPDATE
--   Target: Edge Function notify-job-filled
-- The Edge Function guards against non-filled transitions internally.
-- ============================================================
