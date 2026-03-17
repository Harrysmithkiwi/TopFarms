-- Migration 011: Placement fee follow-up tracking columns, stripe_customer_id, and pg_cron flag job
--
-- Requires: pg_cron extension enabled (confirmed available via 008_job_expiry_cron.sql)
--
-- Purpose:
--   1. Extends placement_fees with follow-up tracking columns (7d/14d due + sent flags),
--      a fee_tier label column for display/invoice, and an optional star rating column.
--   2. Adds stripe_customer_id to employer_profiles for Stripe Invoice API (Phase 5).
--   3. Schedules a daily pg_cron job (08:00 UTC) that marks follow-up flags as due
--      when the appropriate interval has elapsed since contact release (acknowledged_at).
--      The flag columns are consumed by the Resend Edge Function to send follow-up emails.
--
-- Schedule: runs daily at 8:00 AM UTC
-- Effect: sets followup_7d_due / followup_14d_due = true on eligible placement_fee rows

-- ============================================================
-- 1. Add columns to placement_fees
-- ============================================================

ALTER TABLE public.placement_fees
  ADD COLUMN fee_tier text CHECK (fee_tier IN ('entry', 'experienced', 'senior'));

ALTER TABLE public.placement_fees
  ADD COLUMN followup_7d_sent boolean NOT NULL DEFAULT false;

ALTER TABLE public.placement_fees
  ADD COLUMN followup_14d_sent boolean NOT NULL DEFAULT false;

ALTER TABLE public.placement_fees
  ADD COLUMN followup_7d_due boolean NOT NULL DEFAULT false;

ALTER TABLE public.placement_fees
  ADD COLUMN followup_14d_due boolean NOT NULL DEFAULT false;

ALTER TABLE public.placement_fees
  ADD COLUMN rating smallint CHECK (rating >= 1 AND rating <= 5);

-- ============================================================
-- 2. Add stripe_customer_id to employer_profiles
-- ============================================================

ALTER TABLE public.employer_profiles
  ADD COLUMN stripe_customer_id text;

-- ============================================================
-- 3. pg_cron follow-up flag job
-- ============================================================
-- Runs at 8:00 AM UTC daily.
-- Marks followup_7d_due / followup_14d_due = true on rows where:
--   - acknowledged_at IS NOT NULL (contact released / shortlist acknowledged)
--   - confirmed_at IS NULL (outcome not yet resolved — stops emails once hire confirmed)
--   - The sent flag is false (avoid re-marking already-sent rows)
--   - The due flag is false (idempotent — avoids duplicate work)
--   - The required interval has elapsed since acknowledged_at
--
-- Follows the exact pattern established in 008_job_expiry_cron.sql.

SELECT cron.schedule(
  'placement-followup-flags',    -- Job name (unique)
  '0 8 * * *',                   -- Cron expression: every day at 08:00 UTC
  $$
    -- Mark Day 7 follow-ups due
    UPDATE public.placement_fees
    SET followup_7d_due = true
    WHERE acknowledged_at IS NOT NULL
      AND confirmed_at IS NULL
      AND followup_7d_sent = false
      AND followup_7d_due = false
      AND acknowledged_at <= now() - INTERVAL '7 days';

    -- Mark Day 14 follow-ups due
    UPDATE public.placement_fees
    SET followup_14d_due = true
    WHERE acknowledged_at IS NOT NULL
      AND confirmed_at IS NULL
      AND followup_14d_sent = false
      AND followup_14d_due = false
      AND acknowledged_at <= now() - INTERVAL '14 days';
  $$
);
