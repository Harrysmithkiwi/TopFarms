-- 107 — application events: the lifecycle gets a memory, and interview
--       acceptance becomes a real mutation
--
-- The audit of 2026-08-29 closed the acquisition journeys and left one product
-- gap on the record: "Interview-accept is still a toast with no backend write;
-- no application status history table (timeline is coarse)". Inspection made it
-- worse than the note: the seeker's interview DECLINE button wrote
-- status='declined' — an employer-only edge in application_status_transitions —
-- so 097's live trigger has been rejecting it. One button lied (accept), the
-- other errored (decline).
--
-- What this adds, and deliberately nothing more:
--
--   1. application_events — an append-only record of every status transition
--      and interview acceptance. Written ONLY by the triggers/RPC below; client
--      INSERT is revoked, so the timeline can never be forged from the app.
--      This is also the future hook for notifications: a notifier reads events,
--      it does not re-derive them.
--
--   2. applications.interview_accepted_at — the acceptance itself. A timestamp,
--      not a status: acceptance does not move the pipeline (the employer still
--      decides interview -> shortlisted/declined); it answers "did the seeker
--      say yes, and when".
--
--   3. accept_interview(uuid) — SECURITY DEFINER, validates the caller OWNS the
--      application and that it is IN interview, is idempotent, stamps the
--      column, writes the event. The UI restriction is presentation; this is
--      the boundary.
--
-- NOT added: new statuses, offer letters, reopening, notification sends. 097's
-- state machine remains the authority on what moves are legal.
--
-- Backfill: none needed — applications count in prod at apply time is 0
-- (verified by SELECT). The insert trigger records 'applied' for every future
-- row, so timelines are complete from birth.

BEGIN;

-- ── 1. the events table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.application_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  event_type     text NOT NULL CHECK (event_type IN ('status_change', 'interview_accepted')),
  from_status    text,
  to_status      text,
  -- 'system' = service context (mark_job_filled etc., auth.uid() IS NULL) —
  -- mirrors 097's deliberate pass-through.
  actor          text NOT NULL CHECK (actor IN ('seeker', 'employer', 'admin', 'system')),
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.application_events IS
  'Append-only lifecycle record per application. Written only by _log_application_* triggers and accept_interview(); client INSERT revoked. The candidate timeline renders these rows and nothing else — no event, no timeline entry.';

CREATE INDEX IF NOT EXISTS idx_application_events_application
  ON public.application_events (application_id, created_at);

ALTER TABLE public.application_events ENABLE ROW LEVEL SECURITY;

-- Reads: the two parties to the application, same relationship walks as the
-- applications policies (031/009). Writes: nobody from the client — no INSERT/
-- UPDATE/DELETE policy exists, and the grants say so too (two layers, per 106).
REVOKE ALL ON public.application_events FROM anon, authenticated;
GRANT SELECT ON public.application_events TO authenticated;

CREATE POLICY "application_events: seekers view own"
  ON public.application_events FOR SELECT
  USING (
    application_id IN (
      SELECT a.id FROM public.applications a
      JOIN public.seeker_profiles sp ON sp.id = a.seeker_id
      WHERE sp.user_id = (SELECT auth.uid())
    )
    AND public.get_user_role((SELECT auth.uid())) = 'seeker'
  );

CREATE POLICY "application_events: employers view for own jobs"
  ON public.application_events FOR SELECT
  USING (
    application_id IN (
      SELECT a.id FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      JOIN public.employer_profiles ep ON ep.id = j.employer_id
      WHERE ep.user_id = (SELECT auth.uid())
    )
    AND public.get_user_role((SELECT auth.uid())) = 'employer'
  );

-- ── 2. interview acceptance column ─────────────────────────────────────────

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS interview_accepted_at timestamptz;

COMMENT ON COLUMN public.applications.interview_accepted_at IS
  'Set only by accept_interview(). A timestamp, not a status: the pipeline position stays the employer''s decision. Cleared by _reset_interview_acceptance when a terminal application is re-applied.';

-- ── 3. event-writing triggers ──────────────────────────────────────────────
-- SECURITY DEFINER so the inserts clear RLS/grants that (deliberately) block
-- clients. Actor derived the same way 097 derives it.

CREATE OR REPLACE FUNCTION public._log_application_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.application_events (application_id, event_type, from_status, to_status, actor)
  VALUES (
    NEW.id, 'status_change', NULL, NEW.status,
    COALESCE(public.get_user_role(auth.uid()), 'system')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public._log_application_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.application_events (application_id, event_type, from_status, to_status, actor)
    VALUES (
      NEW.id, 'status_change', OLD.status, NEW.status,
      COALESCE(public.get_user_role(auth.uid()), 'system')
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Re-apply over a terminal row (the upsert path 097's header documents) starts
-- a fresh attempt: a stale acceptance from the previous round must not survive
-- into it. BEFORE trigger so it can amend NEW; the history keeps the old
-- acceptance as an event either way.
CREATE OR REPLACE FUNCTION public._reset_interview_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'applied' AND OLD.status IN ('declined', 'withdrawn', 'hired') THEN
    NEW.interview_accepted_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_log_insert ON public.applications;
CREATE TRIGGER applications_log_insert
  AFTER INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public._log_application_insert();

DROP TRIGGER IF EXISTS applications_log_status_change ON public.applications;
CREATE TRIGGER applications_log_status_change
  AFTER UPDATE OF status ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public._log_application_status_change();

DROP TRIGGER IF EXISTS applications_reset_interview_acceptance ON public.applications;
CREATE TRIGGER applications_reset_interview_acceptance
  BEFORE UPDATE OF status ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public._reset_interview_acceptance();

-- ── 4. accept_interview ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.accept_interview(p_application_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_app public.applications%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  -- Ownership: the caller must be the seeker on this application. FOR UPDATE
  -- so two concurrent accepts serialise.
  SELECT a.* INTO v_app
  FROM public.applications a
  JOIN public.seeker_profiles sp ON sp.id = a.seeker_id
  WHERE a.id = p_application_id
    AND sp.user_id = auth.uid()
  FOR UPDATE OF a;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_app.status <> 'interview' THEN
    RAISE EXCEPTION 'This application is not awaiting an interview response'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Idempotent: a double-tap or a refreshed retry returns the original stamp.
  IF v_app.interview_accepted_at IS NOT NULL THEN
    RETURN v_app.interview_accepted_at;
  END IF;

  UPDATE public.applications
  SET interview_accepted_at = v_now
  WHERE id = p_application_id;

  INSERT INTO public.application_events (application_id, event_type, from_status, to_status, actor)
  VALUES (p_application_id, 'interview_accepted', 'interview', 'interview', 'seeker');

  RETURN v_now;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_interview(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.accept_interview(uuid) TO authenticated;

COMMIT;
