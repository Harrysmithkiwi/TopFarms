-- 052: admin_get_placements_summary — aggregate KPIs for the Placement Pipeline
--
-- Feeds the three KPI cards above the placement table: in-flight count, overdue
-- count (>14 days since ack), and total pipeline $ value. Scope matches
-- admin_list_placements exactly (acknowledged_at IS NOT NULL AND confirmed_at
-- IS NULL) so the cards and the table never disagree.
--
-- 023-family pattern: SECURITY DEFINER, SET search_path=public, _admin_gate()
-- first, jsonb out. Aggregates only — no row-level data leaves the function.

CREATE OR REPLACE FUNCTION public.admin_get_placements_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  PERFORM public._admin_gate();

  RETURN (
    SELECT jsonb_build_object(
      'count', count(*),
      'overdue', count(*) FILTER (WHERE (now() - acknowledged_at) > interval '14 days'),
      'value_nzd', COALESCE(sum(amount_nzd), 0)
    )
    FROM public.placement_fees
    WHERE acknowledged_at IS NOT NULL
      AND confirmed_at IS NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_placements_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_placements_summary() TO authenticated;
