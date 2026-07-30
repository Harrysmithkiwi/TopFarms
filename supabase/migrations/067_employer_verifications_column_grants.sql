-- 067: restrict anon's column access on employer_verifications.
--
-- FOUND BY PROBING, NOT BY REVIEW. Migration 066 fixed WHICH ROWS anon can read
-- (status='verified' AND the employer has a public job). Probe P10 then showed anon could
-- still read `document_url` on the rows that remained visible:
--
--   GET /rest/v1/employer_verifications?select=document_url  (apikey only, no JWT)
--   -> [{"document_url":"employer-documents/probe-a-secret.pdf"}]  HTTP 200
--
-- A row-level policy cannot restrict columns. Every employer who verifies and has a live
-- listing was therefore publishing the storage path of their identity/verification document
-- to anonymous visitors.
--
-- SEVERITY, HONESTLY: the path alone is not access. `employer-documents` is a private
-- bucket and its storage.objects policies scope to (storage.foldername(name))[1] =
-- auth.uid()::text, so knowing the filename does not fetch it. This is information
-- disclosure — filenames, and the fact of holding a document — not a file leak. Closed
-- because anon has no reason to see it at all, not because it was exploitable.
--
-- Postgres note: a column-level REVOKE is a no-op while a table-level SELECT grant exists.
-- The table grant must be dropped and the safe columns granted back explicitly.

REVOKE SELECT ON public.employer_verifications FROM anon;
GRANT  SELECT (id, employer_id, method, status, verified_at, created_at)
  ON public.employer_verifications TO anon;

-- RESIDUAL, recorded rather than hidden: `authenticated` retains full-column SELECT, so a
-- seeker crafting a direct REST call can still read document_url/nzbn_number for employers
-- with a public verified listing. Not closed here because column grants are per-ROLE and
-- employers legitimately need those columns for their own row ("employers manage own
-- verifications"). Splitting them needs a view or a sibling table — the same structural
-- constraint recorded for applications.application_notes in 066, and carried to the same
-- Phase 5 data-layer work. The client no longer requests either column
-- (useVerifications.ts, JobSearch.tsx, JobDetail.tsx).
