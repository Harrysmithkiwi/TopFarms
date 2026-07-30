-- ============================================================
-- 071_phase2_followup_cron.sql
-- TopFarms — Phase 2 Task 2.4: wire send-followup-emails
--
-- The function has been deployed and hardened since Phase 15 and has NEVER
-- fired: 011 schedules a flag-setter (placement-followup-flags, 08:00 UTC)
-- and nothing posts to the function (028:17-18 recorded this and moved on).
-- Day-7/14 chasers are how a Net-14 invoice actually gets paid — decision:
-- wire it, don't delete it.
--
-- Pattern mirrors 043 (lead-harvest-nzfarmingjobs): pg_cron → pg_net.http_post,
-- X-Webhook-Secret read from Vault so the secret never sits in migration text
-- or the cron row. Runs 08:30 UTC — 30 min after the flag-setter marks rows due.
--
-- Vault secret name verified live 2026-07-30: 'WEBHOOK_SECRET' (uppercase),
-- alongside lead_intake_secret / resend_api_key. Must hold the same value as
-- the Edge secret WEBHOOK_SECRET that send-followup-emails checks.
-- Verify post-apply via cron.job jobid, not the Studio banner.
-- ============================================================

BEGIN;

SELECT cron.schedule(
  'placement-followup-send',
  '30 8 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://inlagtgpynemhipnqvty.functions.supabase.co/send-followup-emails',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'X-Webhook-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'WEBHOOK_SECRET')
    ),
    body    := '{}'::jsonb
  );
  $$
);

COMMIT;
