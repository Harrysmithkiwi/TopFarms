-- 098 — A hire always produces a placement (audit F-04, Phase E)
--
-- DEPENDS ON F-03 (097), as the audit records. 097 made `hired` reachable only along
-- `offered -> hired` and only by an employer or admin; this makes that one transition the
-- single event that creates a placement. Doing it the other way round would have attached the
-- placement to a status any seeker could set on themselves.
--
-- ── THE DIVERGENCE ─────────────────────────────────────────────────────────────────────
--
-- `hired` had three writers. `placements` had one:
--
--   ApplicantDashboard.tsx:470   .update({ status: 'hired' })    -> no placement
--   mark_job_filled (026:74)     SET status = 'hired'            -> no placement
--   create-placement-invoice     upserts placements              -> placement, but ONLY when
--                                                                  the invoice flow runs
--
-- So a hire recorded through "mark job filled" — which is the natural path for an employer
-- closing a vacancy — produced a `hired` application and NO placement row. `placements` is
-- where `started_on`, `employer_confirmed_at` and `seeker_confirmed_at` live, so the record
-- that the hire actually happened simply did not exist for that path, and the follow-up and
-- reconciliation flows that read it saw nothing.
--
-- ── THE FIX ────────────────────────────────────────────────────────────────────────────
--
-- The placement follows the STATUS, not the caller. One AFTER trigger on the transition into
-- `hired` means all three writers converge, and a fourth cannot forget — the same shape as
-- 094's explanation-invalidation trigger, and for the same reason: a rule spread across call
-- sites is a rule waiting to be missed.
--
-- The row is created BARE: `application_id` only. It records that a hire occurred.
-- `employer_confirmed_at` still comes from `create-placement-invoice`, whose upsert now
-- updates the existing row instead of inserting one, and `started_on` / `seeker_confirmed_at`
-- remain what they always were — later, human confirmations.
--
-- Leaving `hired` does NOT delete the placement. 097 permits `hired -> applied` because
-- re-apply is real, but a placement that happened is a fact about the past; deleting it would
-- erase a hire from the record because the person later applied somewhere again.
--
-- Verified before applying: 0 hired applications, 0 placements, 0 divergent — no backfill.

BEGIN;

CREATE OR REPLACE FUNCTION public._placement_follows_the_hire()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.placements (application_id)
  VALUES (NEW.id)
  ON CONFLICT (application_id) DO NOTHING;
  RETURN NULL;   -- AFTER trigger; the return value is ignored
END;
$function$;

COMMENT ON FUNCTION public._placement_follows_the_hire() IS
  'Audit F-04: `hired` had three writers and `placements` had one, so a hire recorded through mark_job_filled produced no placement row at all. The placement now follows the status rather than the caller, so all writers converge and a fourth cannot forget. Creates the row bare; employer_confirmed_at still comes from create-placement-invoice.';

DROP TRIGGER IF EXISTS applications_placement_on_hire ON public.applications;
CREATE TRIGGER applications_placement_on_hire
  AFTER UPDATE OF status ON public.applications
  FOR EACH ROW
  WHEN (NEW.status = 'hired' AND OLD.status IS DISTINCT FROM 'hired')
  EXECUTE FUNCTION public._placement_follows_the_hire();

-- INSERT too: an application created directly as `hired` (a data import, a hand-fixed row)
-- would otherwise slip past an UPDATE-only trigger. Nothing does this today, which is exactly
-- when it is cheap to cover.
DROP TRIGGER IF EXISTS applications_placement_on_hire_insert ON public.applications;
CREATE TRIGGER applications_placement_on_hire_insert
  AFTER INSERT ON public.applications
  FOR EACH ROW
  WHEN (NEW.status = 'hired')
  EXECUTE FUNCTION public._placement_follows_the_hire();

COMMIT;
