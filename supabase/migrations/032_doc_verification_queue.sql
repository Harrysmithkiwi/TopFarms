-- ============================================================
-- 032_doc_verification_queue.sql
-- TopFarms — Phase 21 Doc Verification Queue (Track B)
--
-- Adds review-state columns to seeker_documents so admin can approve/reject/
-- request-more-info on seeker uploads:
--   - status text NOT NULL DEFAULT 'pending' CHECK (4 values)
--   - rejection_reason text nullable
--   - composite index (status, uploaded_at DESC) — supports admin queue ordering
--
-- Existing rows default to 'pending' (RESEARCH §Pitfall 2 + Open Q1 — safer
-- default; operator can backfill 'approved' post-migration if volume is large).
--
-- Apply via Supabase Studio SQL Editor (CLAUDE.md §2 — preferred path; avoids
-- the --read-only MCP flag-flip restart cycle). Studio-applied migrations
-- don't write supabase_migrations.schema_migrations rows — verify via the
-- DO $verify$ block below and information_schema queries post-apply.
--
-- Wave 2 plan 21-02 will add 4 SECURITY DEFINER RPCs that read/write these
-- columns through the admin_* gateway pattern.
-- ============================================================

BEGIN;

-- 1. Add status column with CHECK constraint
ALTER TABLE public.seeker_documents
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
    CONSTRAINT seeker_documents_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'needs_resubmission'));

COMMENT ON CONSTRAINT seeker_documents_status_check ON public.seeker_documents IS
  'Document review workflow states. pending=awaiting review; approved=verified (employer-visible badge); rejected=rejected with reason; needs_resubmission=admin requested seeker re-upload.';

-- 2. Add rejection_reason column (nullable; populated only when status='rejected')
ALTER TABLE public.seeker_documents
  ADD COLUMN IF NOT EXISTS rejection_reason text;

COMMENT ON COLUMN public.seeker_documents.rejection_reason IS
  'Admin-supplied reason when status=rejected. NULL otherwise. Surfaced to seeker via send-document-status-email Edge Function.';

-- 3. Composite index for admin queue ordering (pending first, then newest)
--    Used by admin_list_document_queue RPC (wave 2 plan 21-02). Plain CREATE
--    INDEX (not CONCURRENTLY) — Studio wraps DDL in implicit transaction;
--    CONCURRENTLY cannot run inside a transaction. Pre-launch volume makes
--    millisecond build time acceptable (mirrors plan 18.1-01 SC-6 decision).
CREATE INDEX IF NOT EXISTS seeker_documents_status_uploaded_at_idx
  ON public.seeker_documents (status, uploaded_at DESC);

-- 4. Atomic post-state verification — rollback BEGIN/COMMIT on drift
DO $verify$
DECLARE
  v_status_col_count int;
  v_reason_col_count int;
  v_index_count int;
  v_bad_status_count int;
BEGIN
  -- 4a. Column 'status' exists with NOT NULL + DEFAULT
  SELECT count(*) INTO v_status_col_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'seeker_documents'
      AND column_name = 'status'
      AND is_nullable = 'NO'
      AND column_default = '''pending''::text';
  IF v_status_col_count != 1 THEN
    RAISE EXCEPTION 'Verify failed: seeker_documents.status column missing or wrong shape (count=%)', v_status_col_count;
  END IF;

  -- 4b. Column 'rejection_reason' exists nullable
  SELECT count(*) INTO v_reason_col_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'seeker_documents'
      AND column_name = 'rejection_reason';
  IF v_reason_col_count != 1 THEN
    RAISE EXCEPTION 'Verify failed: seeker_documents.rejection_reason missing (count=%)', v_reason_col_count;
  END IF;

  -- 4c. Composite index present
  SELECT count(*) INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'seeker_documents'
      AND indexname = 'seeker_documents_status_uploaded_at_idx';
  IF v_index_count != 1 THEN
    RAISE EXCEPTION 'Verify failed: seeker_documents_status_uploaded_at_idx missing (count=%)', v_index_count;
  END IF;

  -- 4d. All existing rows respect the CHECK constraint
  SELECT count(*) INTO v_bad_status_count
    FROM public.seeker_documents
    WHERE status NOT IN ('pending', 'approved', 'rejected', 'needs_resubmission');
  IF v_bad_status_count > 0 THEN
    RAISE EXCEPTION 'Verify failed: % rows have invalid status', v_bad_status_count;
  END IF;
END
$verify$;

COMMIT;
