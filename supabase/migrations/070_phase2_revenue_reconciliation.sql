-- ============================================================
-- 070_phase2_revenue_reconciliation.sql
-- TopFarms — Phase 2 Task 2.4: "who owes us money?" answerable from SQL
--
-- admin_revenue_reconciliation() feeds /admin/revenue: invoiced vs paid vs
-- overdue, plus the aged-debtors row list. Net-14 terms — an unpaid invoice
-- older than 14 days is overdue.
--
-- 023-family pattern: SECURITY DEFINER, SET search_path=public, _admin_gate()
-- first, jsonb out.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_revenue_reconciliation()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary jsonb;
  v_rows jsonb;
BEGIN
  PERFORM public._admin_gate();

  SELECT jsonb_build_object(
    'placements_total',      (SELECT count(*) FROM public.placements),
    'invoiced_cents',        COALESCE(sum(amount_nzd) FILTER (WHERE confirmed_at IS NOT NULL), 0),
    'paid_cents',            COALESCE(sum(amount_nzd) FILTER (WHERE paid_at IS NOT NULL), 0),
    'outstanding_cents',     COALESCE(sum(amount_nzd) FILTER (WHERE confirmed_at IS NOT NULL AND paid_at IS NULL AND COALESCE(stripe_invoice_status, 'open') <> 'uncollectible' AND amount_nzd > 0), 0),
    'overdue_cents',         COALESCE(sum(amount_nzd) FILTER (WHERE confirmed_at IS NOT NULL AND paid_at IS NULL AND COALESCE(stripe_invoice_status, 'open') <> 'uncollectible' AND amount_nzd > 0 AND confirmed_at < now() - interval '14 days'), 0),
    'uncollectible_cents',   COALESCE(sum(amount_nzd) FILTER (WHERE stripe_invoice_status = 'uncollectible'), 0),
    'waived_count',          count(*) FILTER (WHERE waived_reason IS NOT NULL OR (confirmed_at IS NOT NULL AND amount_nzd = 0)),
    'acknowledged_uninvoiced_cents', COALESCE(sum(amount_nzd) FILTER (WHERE acknowledged_at IS NOT NULL AND confirmed_at IS NULL), 0),
    'listing_revenue_cents', (SELECT COALESCE(sum(amount_nzd), 0) FROM public.listing_fees)
  )
  INTO v_summary
  FROM public.placement_fees;

  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.days_outstanding DESC NULLS LAST), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      pf.id,
      ep.farm_name,
      j.title AS job_title,
      pf.fee_tier,
      pf.amount_nzd,
      pf.discount_pct,
      pf.waived_reason,
      pf.acknowledged_at,
      pf.confirmed_at,
      pf.paid_at,
      COALESCE(pf.stripe_invoice_status, CASE WHEN pf.confirmed_at IS NOT NULL THEN 'open' END) AS stripe_invoice_status,
      pf.stripe_invoice_id,
      CASE
        WHEN pf.confirmed_at IS NOT NULL AND pf.paid_at IS NULL
        THEN EXTRACT(day FROM now() - pf.confirmed_at)::int
      END AS days_outstanding
    FROM public.placement_fees pf
    JOIN public.employer_profiles ep ON ep.id = pf.employer_id
    LEFT JOIN public.jobs j ON j.id = pf.job_id
    WHERE pf.acknowledged_at IS NOT NULL OR pf.confirmed_at IS NOT NULL
  ) t;

  RETURN jsonb_build_object('summary', v_summary, 'rows', v_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_revenue_reconciliation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revenue_reconciliation() TO authenticated;

COMMIT;
