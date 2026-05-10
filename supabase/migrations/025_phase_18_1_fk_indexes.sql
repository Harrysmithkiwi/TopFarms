-- ============================================================
-- 025_phase_18_1_fk_indexes.sql
-- TopFarms — Phase 18.1 #6 / orig #10a
--
-- Closes 15× unindexed_foreign_keys advisor lints surfaced via
-- mcp__supabase__get_advisors --type=performance (captured 2026-05-07).
--
-- Naming: <table>_<column>_idx per 001_initial_schema.sql:140-188 precedent.
-- Idempotent (CREATE-INDEX-IF-NOT-EXISTS form on every line) — safe to re-run.
-- Plain CREATE INDEX (NOT CONCURRENTLY) — Studio SQL Editor wraps multi-statement
-- runs in an implicit transaction; CREATE INDEX CONCURRENTLY cannot run inside
-- a transaction. Pre-launch tables are tiny (admin_notes, placement_fees,
-- message_threads, messages, listing_fees mostly empty or single-digit row counts);
-- index build is millisecond-scale on these.
--
-- Apply path: Supabase Studio SQL Editor for project ref inlagtgpynemhipnqvty
-- (CLAUDE §2). Verify post-apply via read-only MCP pg_indexes query — Studio
-- applies don't write supabase_migrations.schema_migrations rows.
-- ============================================================

BEGIN;

-- admin_notes (1 FK)
CREATE INDEX IF NOT EXISTS admin_notes_admin_id_idx        ON public.admin_notes        (admin_id);

-- job_skills (1 FK)
CREATE INDEX IF NOT EXISTS job_skills_skill_id_idx         ON public.job_skills         (skill_id);

-- listing_fees (2 FKs)
CREATE INDEX IF NOT EXISTS listing_fees_employer_id_idx    ON public.listing_fees       (employer_id);
CREATE INDEX IF NOT EXISTS listing_fees_job_id_idx         ON public.listing_fees       (job_id);

-- message_threads (3 FKs)
CREATE INDEX IF NOT EXISTS message_threads_employer_id_idx ON public.message_threads    (employer_id);
CREATE INDEX IF NOT EXISTS message_threads_job_id_idx      ON public.message_threads    (job_id);
CREATE INDEX IF NOT EXISTS message_threads_seeker_id_idx   ON public.message_threads    (seeker_id);

-- messages (2 FKs)
CREATE INDEX IF NOT EXISTS messages_sender_id_idx          ON public.messages           (sender_id);
CREATE INDEX IF NOT EXISTS messages_thread_id_idx          ON public.messages           (thread_id);

-- placement_fees (4 FKs)
CREATE INDEX IF NOT EXISTS placement_fees_application_id_idx ON public.placement_fees   (application_id);
CREATE INDEX IF NOT EXISTS placement_fees_employer_id_idx    ON public.placement_fees   (employer_id);
CREATE INDEX IF NOT EXISTS placement_fees_job_id_idx         ON public.placement_fees   (job_id);
CREATE INDEX IF NOT EXISTS placement_fees_seeker_id_idx      ON public.placement_fees   (seeker_id);

-- saved_jobs (1 FK)
CREATE INDEX IF NOT EXISTS saved_jobs_job_id_idx           ON public.saved_jobs         (job_id);

-- seeker_skills (1 FK)
CREATE INDEX IF NOT EXISTS seeker_skills_skill_id_idx      ON public.seeker_skills      (skill_id);

COMMIT;

-- Post-verify (run as separate read-only MCP query after Studio apply):
--   SELECT indexname FROM pg_indexes
--    WHERE schemaname = 'public'
--      AND indexname IN (
--        'admin_notes_admin_id_idx','job_skills_skill_id_idx',
--        'listing_fees_employer_id_idx','listing_fees_job_id_idx',
--        'message_threads_employer_id_idx','message_threads_job_id_idx','message_threads_seeker_id_idx',
--        'messages_sender_id_idx','messages_thread_id_idx',
--        'placement_fees_application_id_idx','placement_fees_employer_id_idx',
--        'placement_fees_job_id_idx','placement_fees_seeker_id_idx',
--        'saved_jobs_job_id_idx','seeker_skills_skill_id_idx'
--      )
--    ORDER BY indexname;
--   -- Expect 15 rows.
