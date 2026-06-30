-- 043: schedule the Firecrawl commercial harvest (nzfarmingjobs)
--
-- pg_cron → pg_net.http_post → lead-harvest Edge Function, X-Webhook-Secret read
-- from Vault (029 precedent) so the secret never sits in the migration text or the
-- cron row. Mirrors refresh-resend-stats.
--
-- Preconditions (all met 2026-06-30):
--   • lead-harvest deployed (proven: manual run 2026-06-16 wrote lead_harvest_runs).
--   • FIRECRAWL_API_KEY set (the map step returned 1880 links that run).
--   • Edge Fn secret LEAD_INTAKE_SECRET set, SAME value in Vault as 'lead_intake_secret'
--     (the cron header must equal the function gate — proven 2026-06-30: pg_net probe
--     returned 202 + a fresh lead_harvest_runs row, not 403).
--
-- Board scope = nzfarmingjobs only (single BOARDS entry); Seek/TradeMe stay deferred
-- in the function, so no Seek/TradeMe env vars are required.
-- Apply via Studio SQL Editor; verify via cron.job, not list_migrations.

BEGIN;

-- Once daily, 02:00 UTC = 2pm NZST (UTC+12). cron.schedule is idempotent on the job name.
-- NOTE: schedule is fixed UTC and does NOT track NZ daylight saving. When NZDT (UTC+13)
-- starts ~late Sept the run lands at 3pm NZ, not 2pm — expected drift, harmless for a daily
-- harvest, do NOT "fix" it.
SELECT cron.schedule(
  'lead-harvest-nzfarmingjobs',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://inlagtgpynemhipnqvty.functions.supabase.co/lead-harvest',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'X-Webhook-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'lead_intake_secret')
    ),
    body    := '{}'::jsonb
  );
  $$
);

COMMIT;
