-- ============================================================
-- 022_fix_pg_net_http_post_signature.sql
-- TopFarms — fix handle_job_filled() trigger function for current pg_net API (2026-05-03)
--
-- Discovered empirically during Phase 15-02 Task 2 fire (Path A via MarkFilledModal):
-- the trigger errored with `function net.http_post(url => text, headers => jsonb,
-- body => text) does not exist`. Caught in postgres logs.
--
-- Root cause: pg_net was updated by the Supabase platform from a version that
-- exposed `body text` to v0.20.0, which only exposes `body jsonb`. Migration 017
-- cast the payload to ::text under the old signature; that overload no longer exists.
--
-- Current pg_net.http_post signature (verified via pg_get_function_arguments,
-- pg_net v0.20.0):
--   url text, body jsonb DEFAULT '{}', params jsonb DEFAULT '{}',
--   headers jsonb DEFAULT '{"Content-Type":"application/json"}',
--   timeout_milliseconds integer DEFAULT 5000
--
-- Fix: drop the ::text cast on the body argument. payload is already jsonb
-- (built via jsonb_build_object); pass it directly.
--
-- This migration is fully idempotent (CREATE OR REPLACE FUNCTION). The existing
-- trigger `on_job_filled` is unchanged — it executes whatever body the function
-- currently has, so updating the function picks up automatically without
-- DROP/CREATE on the trigger.
--
-- MAIL-02 §7 implication: this trigger has been silently broken in production
-- since 017 deployed. Every real job-fill since then errored at the pg_net layer,
-- rolling back the UPDATE jobs in PostgREST. MAIL-02 was never actually working
-- live — claims in 13-VERIFICATION.md (Phase 15-01 backfill) about "trigger no
-- longer 404s" were inferred from deploy state, not empirically verified by
-- firing the trigger. Same methodology gap captured in
-- SENSE_CHECK_AUDIT_2026-05-01.md §"Correction Note 2026-05-03" §"Methodology gap".
--
-- Phase 18 candidates surfaced by this incident (to be logged in 15-02-SUMMARY.md):
--   - pg_net signature drift — same platform-side state-shift class as the
--     011/012/013/014 phantom-applied range. Add to Supabase ticket amendment.
--   - MarkFilledModal non-atomic update sequence — application UPDATE commits
--     before job UPDATE, no compensation rollback when job UPDATE fails
--     (this incident left an orphan-hired application).
--   - MarkFilledModal applicant labels show only `Applicant #<8-char-uuid>` —
--     no name, status, or role context. Employer can't reliably identify who
--     they're picking. UX bug.
-- ============================================================

BEGIN;

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
      body := payload  -- 017 had `payload::text`; pg_net 0.20.0 only takes jsonb
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Post-verify: function exists, trigger intact
DO $verify$
DECLARE
  fn_count int;
  trg_count int;
BEGIN
  SELECT COUNT(*) INTO fn_count
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'handle_job_filled';

  SELECT COUNT(*) INTO trg_count
  FROM pg_trigger WHERE tgname = 'on_job_filled' AND NOT tgisinternal;

  IF fn_count <> 1 OR trg_count <> 1 THEN
    RAISE EXCEPTION 'Post-verify failed: handle_job_filled count=% (want 1), on_job_filled trigger count=% (want 1)', fn_count, trg_count;
  END IF;
  RAISE NOTICE 'Post-verify OK: handle_job_filled() updated, on_job_filled trigger intact.';
END;
$verify$;

COMMIT;
