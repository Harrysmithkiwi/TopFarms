-- Migration 008: pg_cron scheduled job for auto-expiry of job listings
--
-- Requires: pg_cron extension must be enabled in Supabase project settings
-- (Dashboard → Database → Extensions → pg_cron)
--
-- NOTE: If pg_cron is not available on the project's Supabase plan tier,
-- this can alternatively be implemented as a Supabase Edge Function scheduled
-- via Supabase's built-in cron support or an external scheduler (Trigger.dev).
--
-- Schedule: runs daily at 2:00 AM UTC
-- Effect: updates jobs from status='active' to status='expired' where expires_at < now()

SELECT cron.schedule(
  'expire-job-listings',         -- Job name (unique)
  '0 2 * * *',                   -- Cron expression: every day at 02:00 UTC
  $$
    UPDATE public.jobs
    SET status = 'expired'
    WHERE status = 'active'
      AND expires_at IS NOT NULL
      AND expires_at < now();
  $$
);
