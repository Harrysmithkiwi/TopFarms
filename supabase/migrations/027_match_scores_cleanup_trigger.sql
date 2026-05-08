-- ============================================================
-- 027_match_scores_cleanup_trigger.sql
-- TopFarms — Phase 18.1 #5 / orig #19
--
-- Eliminates the stale-match_scores class of bug surfaced 2026-05-04 morning
-- during UAT-04. When jobs.status transitions out of 'active' (filled / expired
-- / archived), the corresponding match_scores rows persist. RLS on jobs
-- (status='active' filter) hides them from PostgREST embedded joins, returning
-- the parent row with jobs=null. The !inner workaround in SeekerStep7Complete.tsx
-- (commit 7401116) drops them at query time but doesn't clean them up.
--
-- This migration:
--   1. Adds an AFTER UPDATE trigger that DELETEs orphaned match_scores rows
--      on the active -> non-active transition.
--   2. Backfills a one-time DELETE for rows that accumulated pre-trigger.
--   3. Post-verifies zero orphans + trigger attached + function installed.
--
-- Pattern source: 017_notify_job_filled_webhook.sql (AFTER UPDATE + OLD/NEW guard).
--
-- Reactivation case (archived -> active): match_scores get recomputed on demand
-- by existing engine (compute_match_scores_batch in 009/010). The trigger here
-- DOES NOT recompute on reactivation; only deletes on de-activation.
--
-- Failure mode: trigger error rolls back the jobs.status UPDATE. Acceptable per
-- 18.1-CONTEXT; we want to know if cleanup is broken before status transitions
-- silently leave debris. SECURITY DEFINER bypasses RLS, so RLS isn't a concern;
-- match_scores is a leaf table (no FKs reference it; confirmed pre-flight via
-- pg_constraint), so DELETE doesn't cascade.
--
-- Apply path: Supabase Studio SQL Editor for project ref inlagtgpynemhipnqvty
-- (CLAUDE §2). Verify post-apply via read-only MCP pg_trigger + orphan-count.
-- ============================================================

BEGIN;

-- 1. Trigger function fires on AFTER UPDATE jobs status transitions
CREATE OR REPLACE FUNCTION public.cleanup_match_scores_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Guard: fire only when the job leaves 'active' status.
  -- Active -> non-active (filled / expired / archived) sheds match_scores.
  -- Non-active -> active reactivation: match_scores get recomputed on demand
  -- by existing engine (compute_match_scores_batch), no special handling here.
  IF OLD.status = 'active' AND NEW.status IS DISTINCT FROM 'active' THEN
    DELETE FROM public.match_scores WHERE job_id = NEW.id;
    -- match_scores has match_scores_job_id_idx (001_initial_schema.sql:187),
    -- so the DELETE is index-backed.
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Attach trigger. Distinct trigger name from on_job_filled (017) so both fire
--    on AFTER UPDATE jobs without conflict. Trigger order is defined by name;
--    Postgres fires alphabetically; on_job_filled fires before
--    on_jobs_status_change_match_scores_cleanup, both inside the same transaction.
DROP TRIGGER IF EXISTS on_jobs_status_change_match_scores_cleanup ON public.jobs;
CREATE TRIGGER on_jobs_status_change_match_scores_cleanup
  AFTER UPDATE OF status ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_match_scores_on_status_change();

-- 3. One-time backfill clears stale rows that accumulated pre-trigger.
DELETE FROM public.match_scores ms
 WHERE EXISTS (
   SELECT 1 FROM public.jobs j
    WHERE j.id = ms.job_id
      AND j.status IS DISTINCT FROM 'active'
 );

-- 4. Post-verify
DO $verify$
DECLARE
  v_orphan_count int;
  v_trigger_count int;
  v_fn_count int;
BEGIN
  SELECT COUNT(*) INTO v_orphan_count
    FROM public.match_scores ms
    JOIN public.jobs j ON j.id = ms.job_id
   WHERE j.status IS DISTINCT FROM 'active';
  IF v_orphan_count > 0 THEN
    RAISE EXCEPTION 'match_scores backfill failed: % orphans remain', v_orphan_count;
  END IF;

  SELECT COUNT(*) INTO v_trigger_count
    FROM pg_trigger
   WHERE tgname = 'on_jobs_status_change_match_scores_cleanup'
     AND NOT tgisinternal;
  IF v_trigger_count <> 1 THEN
    RAISE EXCEPTION 'Trigger not attached: count=%', v_trigger_count;
  END IF;

  SELECT COUNT(*) INTO v_fn_count
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'cleanup_match_scores_on_status_change';
  IF v_fn_count <> 1 THEN
    RAISE EXCEPTION 'Trigger function missing: count=%', v_fn_count;
  END IF;

  RAISE NOTICE 'Post-verify OK: zero orphans, trigger attached, function installed.';
END;
$verify$;

COMMIT;
