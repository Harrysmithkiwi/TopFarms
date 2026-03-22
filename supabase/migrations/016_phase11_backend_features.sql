-- ============================================================
-- 016_phase11_backend_features.sql
-- TopFarms — Phase 11 backend foundation
-- Sections:
--   1. seeker-documents Storage bucket (private)
--   2. Storage RLS policies for seeker-documents
--   3. document_urls column on seeker_profiles
--   4. estimate_match_pool RPC function
-- ============================================================

-- ============================================================
-- 1. seeker-documents Storage bucket (private)
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES
  ('seeker-documents', 'seeker-documents', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Storage RLS policies for seeker-documents
-- Pattern: same as 007_storage_buckets.sql employer-documents bucket
-- Seekers upload/view/delete only within their own auth.uid() folder
-- ============================================================

-- INSERT policy: seekers upload to their own auth.uid() folder path
CREATE POLICY "seekers upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'seeker-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.get_user_role(auth.uid()) = 'seeker'
);

-- SELECT policy: seekers can view their own documents
CREATE POLICY "seekers view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'seeker-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- DELETE policy: seekers can remove their own documents
CREATE POLICY "seekers delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'seeker-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- 3. document_urls column on seeker_profiles
-- Stores storage paths (not public URLs) for private bucket access
-- ============================================================

ALTER TABLE public.seeker_profiles
  ADD COLUMN IF NOT EXISTS document_urls text[] DEFAULT '{}';

-- ============================================================
-- 4. estimate_match_pool RPC function
-- Returns an estimate of how many seekers match a given job criteria.
-- Used by Plan 02 (MatchPoolEstimate widget) to show employers
-- the pool size before posting a job.
-- Parameters:
--   p_region        — filter by seeker region
--   p_shed_types    — filter by shed types experienced (ANY match)
--   p_accommodation — reserved for future accommodation filter
-- Returns jsonb: { seekers_in_region, seekers_with_shed, seekers_active }
-- ============================================================

CREATE OR REPLACE FUNCTION public.estimate_match_pool(
  p_region         text    DEFAULT NULL,
  p_shed_types     text[]  DEFAULT NULL,
  p_accommodation  boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_in_region    int;
  v_with_shed    int;
  v_active       int;
BEGIN
  SELECT COUNT(*) INTO v_in_region
  FROM public.seeker_profiles
  WHERE (p_region IS NULL OR region = p_region);

  SELECT COUNT(*) INTO v_with_shed
  FROM public.seeker_profiles
  WHERE (p_region IS NULL OR region = p_region)
    AND (p_shed_types IS NULL OR shed_types_experienced && p_shed_types);

  SELECT COUNT(*) INTO v_active
  FROM public.seeker_profiles
  WHERE (p_region IS NULL OR region = p_region)
    AND (p_shed_types IS NULL OR shed_types_experienced && p_shed_types)
    AND onboarding_complete = true;

  RETURN jsonb_build_object(
    'seekers_in_region', v_in_region,
    'seekers_with_shed',  v_with_shed,
    'seekers_active',     v_active
  );
END;
$$;

GRANT EXECUTE ON FUNCTION estimate_match_pool(text, text[], boolean) TO authenticated;
