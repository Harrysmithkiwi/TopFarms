-- 045: lead_harvest_runs — durable per-run record for the background harvest.
--
-- ███ STAGED — DO NOT APPLY until reviewed (operator gate). Applied together
-- with the lead-harvest waitUntil refactor. ███
--
-- Once lead-harvest returns 202 immediately and runs the scrape loop in the
-- background (EdgeRuntime.waitUntil), the tally no longer comes back in the HTTP
-- response. This table is where each run records itself so a run's result is
-- durably queryable after the fact (and, once cron'd, observable unattended).
--
-- Deny-by-default RLS with zero policies (the 023 pattern): the function writes
-- via service_role (bypasses RLS); admins read via the read-only MCP / a future
-- admin RPC. No anon/authenticated access.

BEGIN;

CREATE TABLE IF NOT EXISTS public.lead_harvest_runs (
  id          uuid PRIMARY KEY,                 -- = the run_id returned in the 202
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  -- running: in-flight (or worker was killed before it could finalise — a stale
  -- 'running' row with an old started_at is the timeout/crash signal);
  -- complete: drained within budget; partial: stopped at time/backstop budget;
  -- error: threw mid-run.
  status      text NOT NULL DEFAULT 'running'
              CHECK (status IN ('running', 'complete', 'partial', 'error')),
  tally       jsonb NOT NULL DEFAULT '{}'::jsonb,
  note        text
);

-- Recent-runs-first listing.
CREATE INDEX IF NOT EXISTS lead_harvest_runs_started_at_idx
  ON public.lead_harvest_runs (started_at DESC);

ALTER TABLE public.lead_harvest_runs ENABLE ROW LEVEL SECURITY;
-- (no policies → deny-by-default; service_role bypasses RLS for the function's
--  insert/update; reads go through service_role/MCP or a later admin RPC.)

COMMIT;
