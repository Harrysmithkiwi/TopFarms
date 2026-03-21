-- Phase 9: Page-Level Integrations schema changes

-- 1. Employer view tracking
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz;

-- 2. AI candidate summary cache
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS ai_summary text;

-- 3. Employer private notes per applicant
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS application_notes text;

-- 4. Saved jobs table
CREATE TABLE IF NOT EXISTS saved_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, job_id)
);

ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own saved jobs"
  ON saved_jobs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
