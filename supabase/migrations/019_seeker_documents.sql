-- ============================================================
-- 019_seeker_documents.sql
-- TopFarms — Phase 14 BFIX-03 — document categorization
--
-- Renumbered from 018: slot 018 was consumed in 2026-04-28 by
-- 018_set_user_role_rpc.sql (AUTH-02 fix in cdc9df7) before
-- Phase 14-02 executed.
--
-- Sections:
--   1. seeker_documents table with document_type CHECK constraint
--   2. RLS — seeker-only direct access (NO employer policies — see note)
--   3. Indexes
--   4. Idempotent LATERAL backfill from seeker_profiles.document_urls
--   5. Deprecation comment on legacy column
--
-- Notes:
--   - The document_type enum is LOCKED to exactly:
--       ('cv', 'certificate', 'reference', 'identity', 'other').
--     Changing this set requires updating the TS DocumentType union
--     in src/types/domain.ts AND EMPLOYER_VISIBLE_DOCUMENT_TYPES
--     AND 14-03's employer-side RLS policy in lockstep.
--   - No employer-side RLS policy in this migration. Postgres RLS
--     default-denies when no policy matches the role/operation, so
--     employers have zero access by default. 14-03 will ADD a
--     SELECT policy filtered by EMPLOYER_VISIBLE_DOCUMENT_TYPES
--     (cv | certificate | reference) for the applicant document
--     view, and the get-applicant-document-url Edge Function will
--     also enforce the type filter (defense-in-depth).
--   - The handle_new_user trigger and other auth-layer triggers are
--     not touched by this migration. Trigger discipline N/A here.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. seeker_documents table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.seeker_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seeker_id       uuid NOT NULL REFERENCES public.seeker_profiles(id) ON DELETE CASCADE,
  storage_path    text NOT NULL,
  document_type   text NOT NULL,
  filename        text NOT NULL,
  uploaded_at     timestamptz NOT NULL DEFAULT now(),
  file_size_bytes bigint,
  CONSTRAINT seeker_documents_document_type_check
    CHECK (document_type IN ('cv', 'certificate', 'reference', 'identity', 'other'))
);

COMMENT ON CONSTRAINT seeker_documents_document_type_check ON public.seeker_documents IS
  'LOCKED enum: cv | certificate | reference | identity | other. Mirrors TS DocumentType union (src/types/domain.ts) and EMPLOYER_VISIBLE_DOCUMENT_TYPES. Changes require coordinated update across DB CHECK + TS union + 14-03 RLS policy.';

-- ============================================================
-- 2. RLS — seeker-only direct access
-- (Edge Functions use service role and bypass RLS; 14-03 will ADD
--  an employer SELECT policy filtered by document_type.)
-- ============================================================

ALTER TABLE public.seeker_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seekers select own documents"
ON public.seeker_documents FOR SELECT
USING (
  seeker_id IN (SELECT id FROM public.seeker_profiles WHERE user_id = auth.uid())
  AND public.get_user_role(auth.uid()) = 'seeker'
);

CREATE POLICY "seekers insert own documents"
ON public.seeker_documents FOR INSERT
WITH CHECK (
  seeker_id IN (SELECT id FROM public.seeker_profiles WHERE user_id = auth.uid())
  AND public.get_user_role(auth.uid()) = 'seeker'
);

CREATE POLICY "seekers update own documents"
ON public.seeker_documents FOR UPDATE
USING (
  seeker_id IN (SELECT id FROM public.seeker_profiles WHERE user_id = auth.uid())
  AND public.get_user_role(auth.uid()) = 'seeker'
)
WITH CHECK (
  seeker_id IN (SELECT id FROM public.seeker_profiles WHERE user_id = auth.uid())
  AND public.get_user_role(auth.uid()) = 'seeker'
);

CREATE POLICY "seekers delete own documents"
ON public.seeker_documents FOR DELETE
USING (
  seeker_id IN (SELECT id FROM public.seeker_profiles WHERE user_id = auth.uid())
  AND public.get_user_role(auth.uid()) = 'seeker'
);

-- ============================================================
-- 3. Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS seeker_documents_seeker_id_idx
  ON public.seeker_documents(seeker_id);

CREATE INDEX IF NOT EXISTS seeker_documents_seeker_id_document_type_idx
  ON public.seeker_documents(seeker_id, document_type);

-- ============================================================
-- 4. Idempotent LATERAL backfill from seeker_profiles.document_urls
-- Existing storage paths are migrated as document_type='other'.
-- The NOT EXISTS guard makes the migration safe to re-run.
-- ============================================================

INSERT INTO public.seeker_documents (seeker_id, storage_path, document_type, filename)
SELECT sp.id, doc.path, 'other', regexp_replace(doc.path, '^.*/', '')
FROM public.seeker_profiles sp,
     LATERAL unnest(sp.document_urls) AS doc(path)
WHERE sp.document_urls IS NOT NULL
  AND array_length(sp.document_urls, 1) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.seeker_documents sd
    WHERE sd.storage_path = doc.path AND sd.seeker_id = sp.id
  );

-- ============================================================
-- 5. Deprecation marker on legacy column
-- Column is preserved for backfill traceability; drop in a follow-up
-- cleanup phase (target post-Phase 15) once all readers are confirmed
-- migrated.
-- ============================================================

COMMENT ON COLUMN public.seeker_profiles.document_urls IS
  'DEPRECATED: replaced by seeker_documents table from migration 019 (Phase 14 BFIX-03). New uploads write to seeker_documents only. Drop this column in a future cleanup phase once all readers have been migrated.';

COMMIT;
