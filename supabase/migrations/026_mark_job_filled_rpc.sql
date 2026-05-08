-- ============================================================
-- 026_mark_job_filled_rpc.sql
-- TopFarms — Phase 18.1 #4 / orig #17
--
-- SECURITY DEFINER RPC that wraps the 2-UPDATE mark-filled flow in a single
-- Postgres transaction. Replaces the non-atomic client-side pattern in
-- MarkFilledModal.handleConfirm (62-101). Eliminates the orphan-hired-application
-- class of incident (precedent: 2a91e3db required manual restore SQL during
-- Phase 15-02 Bug 4).
--
-- Pattern source: 018_set_user_role_rpc.sql (SECURITY DEFINER + auth.uid()
-- check + idempotency).
--
-- The UPDATE jobs SET status='filled' fires the existing on_job_filled trigger
-- (017/022) inside this same transaction. If the trigger raises, the entire
-- RPC rolls back — correct by design per 18.1-CONTEXT §Item #4 ("Failure mode:
-- on UPDATE jobs failure, the entire transaction rolls back — no orphan-hired
-- application possible").
--
-- Apply path: Supabase Studio SQL Editor for project ref inlagtgpynemhipnqvty
-- (CLAUDE §2). Verify post-apply via read-only MCP pg_proc query.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.mark_job_filled(
  p_job_id       uuid,
  p_applicant_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_user_id uuid;
  v_owner_user_id  uuid;
  v_current_status text;
BEGIN
  -- 1. Auth — must be authenticated
  v_caller_user_id := auth.uid();
  IF v_caller_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- 2. Ownership — caller must own the job
  --    jobs.employer_id -> employer_profiles.id (FK)
  --    employer_profiles.user_id -> auth.users.id (1:1 unique)
  SELECT ep.user_id
    INTO v_owner_user_id
    FROM public.jobs j
    JOIN public.employer_profiles ep ON ep.id = j.employer_id
   WHERE j.id = p_job_id;

  IF v_owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Job not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_owner_user_id <> v_caller_user_id THEN
    RAISE EXCEPTION 'Not authorised to mark this job filled' USING ERRCODE = '42501';
  END IF;

  -- 3. Idempotency — re-marking a filled job is a no-op
  SELECT status INTO v_current_status FROM public.jobs WHERE id = p_job_id;
  IF v_current_status = 'filled' THEN
    RAISE NOTICE 'mark_job_filled: job % already filled — no-op', p_job_id;
    RETURN;
  END IF;

  -- 4. Mark applicant hired FIRST (matches MarkFilledModal.tsx:67-81 ordering rationale —
  --    hired applicant must be excluded from the notify-job-filled NOTIFY_STATUSES sweep
  --    that fires from the on_job_filled trigger on the UPDATE jobs below).
  IF p_applicant_id IS NOT NULL THEN
    UPDATE public.applications
       SET status = 'hired'
     WHERE id = p_applicant_id
       AND job_id = p_job_id;
    -- Defensive: applicant must belong to this job. If not, no rows updated; raise.
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Applicant % not found for job %', p_applicant_id, p_job_id
        USING ERRCODE = 'P0002';
    END IF;
  END IF;

  -- 5. Mark job filled — fires on_job_filled trigger inside the same transaction.
  --    pg_net.http_post is async (queued in net._http_response); the trigger does not
  --    block the UPDATE on Edge fn response. If the trigger function itself raises,
  --    the entire RPC rolls back (steps 4 + 5 atomic).
  UPDATE public.jobs
     SET status = 'filled'
   WHERE id = p_job_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to mark job % filled', p_job_id USING ERRCODE = 'P0001';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_job_filled(uuid, uuid) TO authenticated;

-- Post-verify: function exists with SECURITY DEFINER + EXECUTE granted to authenticated
DO $verify$
DECLARE
  v_fn_count int;
  v_secdef boolean;
BEGIN
  SELECT count(*), bool_or(p.prosecdef)
    INTO v_fn_count, v_secdef
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'mark_job_filled';
  IF v_fn_count <> 1 OR v_secdef IS NOT TRUE THEN
    RAISE EXCEPTION 'Post-verify failed: count=% secdef=%', v_fn_count, v_secdef;
  END IF;
  RAISE NOTICE 'Post-verify OK: mark_job_filled installed (SECURITY DEFINER, count=1).';
END;
$verify$;

COMMIT;
