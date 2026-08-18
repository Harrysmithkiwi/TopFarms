-- 097 — A seeker cannot promote themselves to hired (audit F-03, Phase E)
--
-- Live policy `applications: seekers update own` constrains `seeker_id` and NOTHING ELSE, so
-- any seeker could run
--
--     update applications set status = 'hired' where seeker_id = <their own>
--
-- and `hired` is not a label — it is the trigger for the placement/billing path. The employer
-- policy is no better: `applications: employers update status for own jobs` has a USING clause
-- and NO WITH CHECK, so an employer can move an application anywhere, including backwards or
-- into a seeker-only state.
--
-- `VALID_TRANSITIONS` exists in `src/types/domain.ts` but is used in exactly one place
-- (`ApplicantPanel.tsx:169`) and only to RENDER the buttons. It is presentation. Nothing has
-- ever enforced it, and `tests/pipeline-transitions.test.ts` is 11 `it.todo` with zero
-- assertions, so the gate reported green over an unenforced state machine.
--
-- ── WHAT THE TABLE ENCODES, AND WHY IT IS NOT JUST VALID_TRANSITIONS ────────────────────
--
-- Two things the constant does not say:
--
-- 1. WHO may make each move. `offered -> hired` is an employer's decision; `-> withdrawn` is
--    the seeker's. A transition table with no actor column would still let a seeker hire
--    themselves, just along an approved edge.
--
-- 2. RE-APPLY. `VALID_TRANSITIONS` shows every terminal state as a dead end, but the apply
--    path is an UPSERT (`JobSearch.tsx:516`) and `ExpandableCardTabs.tsx:30` deliberately
--    re-enables the Apply tab on declined/withdrawn/hired. So `declined -> applied` and
--    friends happen in production today and are legitimate. Encoding only the constant would
--    have broken re-apply, which is why this reads the shipped behaviour and not the constant.
--
-- Also encoded: `-> withdrawn` from every active state. `withdrawn` is modelled, rendered by
-- two components and handled by `useAppliedStatuses`, but `VALID_TRANSITIONS` has no path INTO
-- it and no UI writes it — a status nobody can enter. That is a separate defect; the state
-- machine allows the move so a withdraw button does not have to ship a migration with it.
--
-- ── SERVICE CONTEXT ─────────────────────────────────────────────────────────────────────
--
-- When `auth.uid()` is NULL the caller is a SECURITY DEFINER function or an edge function on
-- the service key — `mark_job_filled` writes `hired` this way (026:74). Those paths are gated
-- where they are defined; re-gating them here would break the pipeline and teach the next
-- person to bypass the trigger. NULL actor is allowed through, deliberately and visibly.

BEGIN;

CREATE TABLE IF NOT EXISTS public.application_status_transitions (
  from_status text NOT NULL,
  to_status   text NOT NULL,
  actor       text NOT NULL CHECK (actor IN ('seeker', 'employer', 'admin')),
  PRIMARY KEY (from_status, to_status, actor)
);

COMMENT ON TABLE public.application_status_transitions IS
  'Audit F-03: the application state machine, as DATA. Rows are (from, to, actor) — the actor column is the half VALID_TRANSITIONS in src/types/domain.ts cannot express, and its absence is what let a seeker set their own status to hired. That constant stays as presentation; this table is the authority.';

-- Nobody writes this from the app. It changes with a migration, deliberately.
REVOKE ALL ON public.application_status_transitions FROM anon, authenticated;
ALTER TABLE public.application_status_transitions ENABLE ROW LEVEL SECURITY;

INSERT INTO public.application_status_transitions (from_status, to_status, actor) VALUES
  -- Employer: the hiring pipeline, mirroring VALID_TRANSITIONS.
  ('applied',     'review',      'employer'),
  ('applied',     'declined',    'employer'),
  ('review',      'interview',   'employer'),
  ('review',      'shortlisted', 'employer'),
  ('review',      'declined',    'employer'),
  ('interview',   'shortlisted', 'employer'),
  ('interview',   'declined',    'employer'),
  ('shortlisted', 'offered',     'employer'),
  ('shortlisted', 'declined',    'employer'),
  ('offered',     'hired',       'employer'),
  ('offered',     'declined',    'employer'),
  -- Seeker: withdraw from anything still live, and re-apply from any terminal state.
  ('applied',     'withdrawn',   'seeker'),
  ('review',      'withdrawn',   'seeker'),
  ('interview',   'withdrawn',   'seeker'),
  ('shortlisted', 'withdrawn',   'seeker'),
  ('offered',     'withdrawn',   'seeker'),
  ('declined',    'applied',     'seeker'),
  ('withdrawn',   'applied',     'seeker'),
  ('hired',       'applied',     'seeker')
ON CONFLICT DO NOTHING;

-- Admin may make any move an employer or a seeker could, and nothing more. Admin is not a
-- superuser over the pipeline; an admin marking someone hired still bills a farm.
INSERT INTO public.application_status_transitions (from_status, to_status, actor)
SELECT DISTINCT from_status, to_status, 'admin'
FROM public.application_status_transitions
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public._enforce_application_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  v_actor := public.get_user_role(auth.uid());

  -- Service context: a SECURITY DEFINER function or the service key, e.g. mark_job_filled.
  -- Gated where it is defined. See the header.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.application_status_transitions t
    WHERE t.from_status = OLD.status
      AND t.to_status   = NEW.status
      AND t.actor       = v_actor
  ) THEN
    RAISE EXCEPTION
      'Application status change % -> % is not permitted for %',
      OLD.status, NEW.status, coalesce(v_actor, 'an unknown role')
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS applications_enforce_transition ON public.applications;
CREATE TRIGGER applications_enforce_transition
  BEFORE UPDATE OF status ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public._enforce_application_transition();

COMMIT;
