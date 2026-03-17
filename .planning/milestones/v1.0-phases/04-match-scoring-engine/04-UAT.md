---
status: testing
phase: 04-match-scoring-engine
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md]
started: 2026-03-16T09:15:00Z
updated: 2026-03-16T09:15:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 1
name: Cold Start Smoke Test
expected: |
  Kill any running dev server. Run `supabase db push` to deploy the new migration (010_match_scores_precompute.sql). Run `supabase functions deploy generate-match-explanation`. Start the app fresh. The app loads without errors, the migration completes (triggers created, backfill runs), and navigating to the job search page shows results.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running dev server. Run `supabase db push` to deploy the new migration (010_match_scores_precompute.sql). Run `supabase functions deploy generate-match-explanation`. Start the app fresh. The app loads without errors, the migration completes (triggers created, backfill runs), and navigating to the job search page shows results.
result: [pending]

### 2. Job Detail Match Score
expected: Log in as a seeker with a completed profile. Navigate to a job detail page. The match score breakdown appears showing dimensions (shed type, location, accommodation, skills, salary, visa) with point values and a total score circle. Scores come from the pre-computed match_scores table (no loading delay from RPC).
result: [pending]

### 3. AI Match Explanation Appears
expected: On the job detail page (same as test 2), below the score breakdown dimensions, a "Why this match" section appears with a 2-3 sentence plain-English explanation in farm-worker-friendly language. The explanation references specific scoring factors (e.g. shed type match, salary range).
result: [pending]

### 4. Explanation Graceful Degradation
expected: If viewing a job detail where the AI explanation hasn't been generated yet (or if the Claude API is unavailable), the "Why this match" section simply doesn't appear — no error, no empty box, no loading spinner. The rest of the score breakdown renders normally.
result: [pending]

### 5. Job Search Score Circles
expected: On the job search page, each job card shows a match score circle with the numeric score. Scores load quickly (pre-computed, not calculated on the fly). If not logged in or no seeker profile, no score circles appear.
result: [pending]

### 6. Employer Applicant Dashboard
expected: Log in as an employer with active job listings that have applicants. Navigate to the applicant dashboard. Each applicant row shows their match score. Scores load via a single batch query (should feel fast even with many applicants).
result: [pending]

### 7. My Applications Scores
expected: Log in as a seeker who has applied to jobs. Navigate to My Applications. Each application shows the match score for that job. Scores are pre-computed and load quickly.
result: [pending]

### 8. Score Recalculation on Profile Update
expected: As a seeker, note your match score on a specific job. Update your profile (e.g. change shed type experience or region preference). Return to that job detail page. The match score has been recalculated to reflect the profile change (should happen within 60 seconds of the profile save).
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0

## Gaps

[none yet]
