-- 043: schedule the Firecrawl commercial harvest (leads — Seek/TradeMe)
--
-- ███ STAGED — DO NOT APPLY until lead-harvest is DEPLOYED and the secrets are
-- set (FIRECRAWL_API_KEY, LEAD_INTAKE_SECRET, FIRECRAWL_SEEK_URLS /
-- FIRECRAWL_TRADEME_URLS). Applying earlier just fires an unkeyed function that
-- 200-skips twice daily — pointless until live. ███
--
-- Pattern: pg_cron → pg_net.http_post → lead-harvest, with the X-Webhook-Secret
-- header (same as get-resend-stats / notify-job-filled). The secret is read
-- from Vault at apply time (migration 029 precedent) so it never sits in the
-- migration text or the cron row.
--
-- Apply (go-live, operator present):
--   1) Vault: ensure secret 'lead_intake_secret' holds the LEAD_INTAKE_SECRET value.
--   2) Run this migration via Studio/Management API.
--   3) registry repair: ...repair --status applied 043 (see REGISTRY-REPAIR-PLAN).

BEGIN;

-- Twice daily (03:10 and 15:10 UTC). cron.schedule is idempotent on name.
SELECT cron.schedule(
  'lead-harvest-seek-trademe',
  '10 3,15 * * *',
  $$
  SELECT net.http_post(
    url    := 'https://inlagtgpynemhipnqvty.functions.supabase.co/lead-harvest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Webhook-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'lead_intake_secret')
    ),
    body   := '{}'::jsonb
  );
  $$
);

COMMIT;
