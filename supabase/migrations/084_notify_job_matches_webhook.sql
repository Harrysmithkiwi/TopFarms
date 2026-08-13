-- ============================================================
-- 084_notify_job_matches_webhook.sql
-- TopFarms — operator match-alert webhook (go-live brief item:
-- "the waitlist promises an email that nothing sends")
-- ============================================================
-- Fires when a job becomes 'active' (INSERT as active, or UPDATE
-- transitioning to active), invoking the notify-job-matches Edge
-- Function via pg_net. The function emails the OPERATOR the list of
-- matched seekers; under 100 users the operator sends the first
-- seeker emails by hand (NEXT-SESSION.md recommendation).
--
-- Ordering note: match_scores rows are written synchronously by the
-- job_match_rescore trigger inside the same transaction; pg_net only
-- delivers after commit, so the Edge Function always sees them.
--
-- Vault pattern: identical to handle_job_filled (017 → 022 → 029).
-- Secrets supabase_url / service_role_key / WEBHOOK_SECRET already
-- exist in Vault — no new secret required.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_job_activated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload  jsonb;
  v_secret text;
BEGIN
  IF NEW.status = 'active'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    payload := jsonb_build_object(
      'type',       TG_OP,
      'table',      'jobs',
      'schema',     'public',
      'record',     row_to_json(NEW)::jsonb,
      'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb ELSE NULL END
    );

    v_secret := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'WEBHOOK_SECRET');

    PERFORM net.http_post(
      url     := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/notify-job-matches',
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

DROP TRIGGER IF EXISTS on_job_activated_notify_matches ON public.jobs;
CREATE TRIGGER on_job_activated_notify_matches
  AFTER INSERT OR UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_job_activated();

-- Post-verify (029 precedent): function shape + trigger attachment
DO $verify$
DECLARE
  v_fn_def text;
BEGIN
  v_fn_def := pg_get_functiondef('public.handle_job_activated'::regproc);

  IF position('notify-job-matches' IN v_fn_def) = 0 THEN
    RAISE EXCEPTION 'handle_job_activated missing notify-job-matches URL';
  END IF;

  IF position('vault.decrypted_secrets' IN v_fn_def) = 0 THEN
    RAISE EXCEPTION 'handle_job_activated missing vault.decrypted_secrets lookup';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.jobs'::regclass
      AND tgname  = 'on_job_activated_notify_matches'
  ) THEN
    RAISE EXCEPTION 'trigger on_job_activated_notify_matches not attached to public.jobs';
  END IF;

  RAISE NOTICE 'Post-verify OK: handle_job_activated wired to notify-job-matches via Vault.';
END;
$verify$;
