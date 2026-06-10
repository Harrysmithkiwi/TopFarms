-- 036: narrow employer-photos SELECT policy — close bucket enumeration (audit F12)
--
-- Advisor `public_bucket_allows_listing`: the migration-007 policy
-- "anyone can view farm photos" (USING bucket_id = 'employer-photos', no role
-- or prefix restriction) let ANY client — including anon — call the storage
-- list API and enumerate every file in the bucket.
--
-- Why narrowing is safe (verified 2026-06-10):
--   * Display never depends on this policy. The bucket is PUBLIC; all reads in
--     the app go through getPublicUrl() (FarmPhotoUpload.tsx:77,
--     FileDropzone.tsx:137,182), and public-object GETs bypass storage.objects
--     RLS by design.
--   * Listing is used in exactly ONE place app-wide: FarmPhotoUpload.tsx:65,
--     where an authenticated employer lists their OWN prefix
--     (`${userId}/farm`). The new owner-prefix policy keeps that working —
--     same expression shape as the proven "employers view own documents"
--     policy from migration 007.
--   * Bucket is currently empty (0 rows in storage.objects for this bucket),
--     so no existing display surface changes.

BEGIN;

DROP POLICY IF EXISTS "anyone can view farm photos" ON storage.objects;

CREATE POLICY "employers list own farm photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'employer-photos'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

COMMIT;
