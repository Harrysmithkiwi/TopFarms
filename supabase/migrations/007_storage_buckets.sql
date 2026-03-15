-- ============================================================
-- 007_storage_buckets.sql
-- TopFarms — Supabase Storage buckets for employer uploads
-- employer-documents (private) and employer-photos (public) (EVER-04)
-- ============================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('employer-documents', 'employer-documents', false),
  ('employer-photos', 'employer-photos', true)
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------
-- employer-documents: private bucket for NZBN documents
-- -------------------------------------------------------

-- INSERT policy: employers can upload to their own auth.uid() folder path
CREATE POLICY "employers upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employer-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.get_user_role(auth.uid()) = 'employer'
);

-- SELECT policy: employers can view their own documents
CREATE POLICY "employers view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'employer-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- -------------------------------------------------------
-- employer-photos: public bucket for farm photos
-- -------------------------------------------------------

-- SELECT policy: farm photos are publicly viewable
CREATE POLICY "anyone can view farm photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'employer-photos');

-- INSERT policy: employers can upload to their own auth.uid() folder path
CREATE POLICY "employers upload own farm photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employer-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.get_user_role(auth.uid()) = 'employer'
);
