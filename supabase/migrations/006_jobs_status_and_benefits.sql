-- ============================================================
-- 006_jobs_status_and_benefits.sql
-- TopFarms — Job status extension and benefits column
-- Adds 'paused' to jobs.status and benefits jsonb (JPOS-06, JPOS-04)
-- ============================================================

-- Add 'paused' to jobs.status CHECK constraint (JPOS-06)
-- Current constraint: ('draft', 'active', 'filled', 'expired', 'archived')
-- New constraint: includes 'paused'
ALTER TABLE public.jobs DROP CONSTRAINT jobs_status_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('draft', 'active', 'paused', 'filled', 'expired', 'archived'));

-- Add benefits column for job compensation details (JPOS-04)
-- Stores array of benefit strings e.g. ["accommodation", "vehicle", "phone", "meals"]
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS benefits jsonb DEFAULT '[]';
