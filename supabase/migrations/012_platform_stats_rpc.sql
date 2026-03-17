-- Secure RPC for anonymous platform counter queries.
-- SECURITY DEFINER allows anon users to read aggregate counts
-- without needing direct table access (avoids RLS issues on
-- seeker_profiles and match_scores for unauthenticated visitors).

CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT jsonb_build_object(
    'jobs', (SELECT count(*) FROM jobs WHERE status = 'active'),
    'seekers', (SELECT count(*) FROM seeker_profiles),
    'matches', (SELECT count(*) FROM match_scores WHERE total_score >= 50)
  );
$$;

GRANT EXECUTE ON FUNCTION get_platform_stats() TO anon, authenticated;
