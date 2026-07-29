-- 063: Leads staging bulk actions + retention-cron outreach guard (Admin Portal v2, E).
--
-- (a) Set-based approve/reject so the founder can clear a batch of harvested rows
--     in one click instead of one-drawer-at-a-time. Each bulk fn is _admin_gate()-
--     first and LOOPS the canonical single-row RPC (admin_lead_approve /
--     admin_lead_reject) over the PENDING subset of the passed ids — so the exact
--     insert/suppress/audit logic is reused (no duplication, no drift) and already-
--     reviewed ids are skipped rather than aborting the whole batch.
-- (b) Close the retention-cron gap flagged in 047:15-19 — the weekly purge deleted
--     pending rows >30d regardless of active outreach, which would silently eat
--     in-flight Lane-B conversations. Guard the pending branch on outreach_status.

-- ── Bulk approve ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_lead_bulk_approve(p_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_count int := 0;
BEGIN
  PERFORM public._admin_gate();
  -- Pre-filter to pending so admin_lead_approve never RAISEs mid-batch (single
  -- transaction — the subset can't change under us).
  FOR v_id IN
    SELECT id FROM lead_staging WHERE id = ANY(p_ids) AND review_status = 'pending'
  LOOP
    PERFORM public.admin_lead_approve(v_id, NULL);
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('approved', v_count);
END;
$function$;

-- ── Bulk reject (+ optional suppress) ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_lead_bulk_reject(p_ids uuid[], p_suppress boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_count int := 0;
BEGIN
  PERFORM public._admin_gate();
  FOR v_id IN
    SELECT id FROM lead_staging WHERE id = ANY(p_ids) AND review_status = 'pending'
  LOOP
    PERFORM public.admin_lead_reject(v_id, p_suppress, NULL);
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('rejected', v_count, 'suppressed', p_suppress);
END;
$function$;

-- Grants mirror the single-row RPCs: authenticated + service_role, never anon/public.
REVOKE ALL ON FUNCTION public.admin_lead_bulk_approve(uuid[]) FROM public;
REVOKE ALL ON FUNCTION public.admin_lead_bulk_reject(uuid[], boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_lead_bulk_approve(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_lead_bulk_reject(uuid[], boolean) TO authenticated, service_role;
-- Supabase default-privileges re-grant EXECUTE to anon on new public functions;
-- revoke it so these match the single-row RPCs (admin only via _admin_gate).
REVOKE EXECUTE ON FUNCTION public.admin_lead_bulk_approve(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_lead_bulk_reject(uuid[], boolean) FROM anon;

-- ── Retention-cron guard ─────────────────────────────────────────────────────
-- Keep the rejected-row sweep; guard the pending sweep so an active outreach
-- conversation (drafted/approved/sent) is never purged at the 30-day mark.
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'lead-staging-purge'),
  command => $cmd$DELETE FROM public.lead_staging
    WHERE review_status = 'rejected'
       OR (review_status = 'pending'
           AND created_at < now() - interval '30 days'
           AND coalesce(outreach_status, 'none') NOT IN ('drafted', 'approved', 'sent'))$cmd$
);
