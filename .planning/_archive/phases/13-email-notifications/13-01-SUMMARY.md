---
phase: 13-email-notifications
plan: "01"
subsystem: email-notifications
tags: [edge-function, database-webhook, email, ghosting-prevention, resend]
dependency_graph:
  requires: []
  provides: [notify-job-filled-edge-function, job-filled-webhook-trigger, mark-filled-race-condition-fix]
  affects: [applications, jobs, seeker_contacts, seeker_profiles]
tech_stack:
  added: [notify-job-filled Edge Function, pg_net trigger, handle_job_filled SQL function]
  patterns: [database-webhook-trigger, resend-email, seeker-contacts-email-lookup]
key_files:
  created:
    - supabase/functions/notify-job-filled/index.ts
    - supabase/migrations/017_notify_job_filled_webhook.sql
  modified:
    - src/pages/jobs/MarkFilledModal.tsx
decisions:
  - "Used full SQL trigger migration with vault secrets for net.http_post (with dashboard fallback comment)"
  - "NOTIFY_STATUSES matches domain.ts ACTIVE_STATUSES exactly: applied/review/interview/shortlisted/offered"
  - "CTA links to /jobs (job search page) not /dashboard to encourage exploring new roles"
  - "Race condition fix: hired application updated before job status to exclude hired applicant from ghost emails"
metrics:
  duration: "2 minutes"
  completed_date: "2026-04-03"
  tasks_completed: 2
  files_changed: 3
---

# Phase 13 Plan 01: Notify Job Filled — Anti-Ghosting Emails Summary

**One-liner:** Edge Function `notify-job-filled` sends closure emails to unresolved applicants when an employer marks a job as filled, with a database webhook trigger and MarkFilledModal race condition fix ensuring the hired applicant is excluded.

## What Was Built

### Task 1: MarkFilledModal Race Condition Fix + Edge Function

**MarkFilledModal fix (src/pages/jobs/MarkFilledModal.tsx):**
- Reordered `handleConfirm()` so `applications.update({ status: 'hired' })` runs BEFORE `jobs.update({ status: 'filled' })`
- Application update failure is now fatal (returns early) rather than non-fatal — prevents job from being marked filled with unknown application state
- Comments explain ordering rationale for future maintainers

**Edge Function (supabase/functions/notify-job-filled/index.ts):**
- Handles Supabase database webhook payload format with `{ type, record, old_record }` structure
- Guard condition skips non-filled transitions: checks `payload.type !== 'UPDATE'`, `old_record.status === 'filled'`, `record.status !== 'filled'`
- Queries applications with `status IN ('applied', 'review', 'interview', 'shortlisted', 'offered')` — exactly matches `ACTIVE_STATUSES` from `domain.ts`
- Two-step email lookup: `seeker_profiles` (get `user_id`) → `seeker_contacts` (get `email`)
- Sends branded notification email with job title, farm name, and "Browse Open Roles" CTA linking to `/jobs`
- Returns `{ sent, failed, job_id }` response for observability
- Email helpers (`sendEmail`, `emailWrapper`, `ctaButton`) duplicated from `send-followup-emails` for consistency

### Task 2: Database Webhook Migration

**Migration (supabase/migrations/017_notify_job_filled_webhook.sql):**
- Enables `pg_net` extension for HTTP from within PostgreSQL triggers
- Creates `public.handle_job_filled()` trigger function with status guard: `OLD.status IS DISTINCT FROM 'filled' AND NEW.status = 'filled'`
- Uses `net.http_post` with vault secret references for Supabase URL and service role key
- Creates `on_job_filled` AFTER UPDATE trigger on `public.jobs`
- Includes dashboard fallback instructions as inline comments for environments without vault configured

## Decisions Made

| Decision | Rationale |
|---|---|
| Hired applicant updated before job status | Race condition prevention — webhook fires on job status change, so hired applicant must be excluded BEFORE webhook triggers |
| NOTIFY_STATUSES = domain.ts ACTIVE_STATUSES exactly | Ensures code stays in sync with canonical status definitions; uses 'review' not 'reviewed' |
| CTA links to /jobs not /dashboard | Encourages seekers to explore new opportunities rather than viewing a stale application |
| Full SQL migration with vault fallback | Reproducible infrastructure with documentation for dashboard-based setup as alternative |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `src/pages/jobs/MarkFilledModal.tsx` — hired update before filled update confirmed at lines 73/86
- [x] `supabase/functions/notify-job-filled/index.ts` — created with Deno.serve handler
- [x] `supabase/migrations/017_notify_job_filled_webhook.sql` — created with full trigger SQL
- [x] Task 1 commit: 17378fc
- [x] Task 2 commit: 3742a9f

## Self-Check: PASSED
