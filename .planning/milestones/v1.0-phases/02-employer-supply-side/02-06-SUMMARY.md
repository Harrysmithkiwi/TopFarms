---
phase: 02-employer-supply-side
plan: "06"
subsystem: employer-dashboard-and-public-listing
tags: [employer-dashboard, job-management, job-detail, pg-cron, routes]
dependency_graph:
  requires: ["02-01", "02-02", "02-03", "02-04", "02-05"]
  provides: ["employer-dashboard-full", "job-detail-public", "mark-filled-modal", "route-wiring"]
  affects: ["phase-03-seeker-matching"]
tech_stack:
  added: []
  patterns:
    - "Filter tabs with in-component state for job listing filtering"
    - "Sticky bottom CTA bar with auth-gated content for visitor/seeker/employer views"
    - "pg_cron scheduled SQL job for automated status transitions"
    - "Archive confirmation dialog as inline modal (no separate component)"
key_files:
  created:
    - src/pages/jobs/MarkFilledModal.tsx
    - src/pages/jobs/JobDetail.tsx
    - supabase/migrations/008_job_expiry_cron.sql
  modified:
    - src/pages/dashboard/EmployerDashboard.tsx
    - src/main.tsx
decisions:
  - "[02-06]: JobDetail loads employer verifications via separate query (not nested join) for clarity and reliability"
  - "[02-06]: /jobs/:id is public (no ProtectedRoute) — component handles auth-gated views internally based on session/role"
  - "[02-06]: /jobs/new route placed before /jobs/:id in router config to prevent 'new' matching as :id param"
  - "[02-06]: MarkFilledModal handles no-applicants case gracefully (Phase 2 has no applications yet) — employer can still mark filled externally"
  - "[02-06]: Archive confirmation is inline dialog in EmployerDashboard (not a separate component) — pattern consistent with simplicity"
metrics:
  duration_minutes: 4
  completed_date: "2026-03-15"
  tasks_completed: 2
  files_modified: 5
requirements_satisfied: [EONB-01, EVER-02, JPOS-01, JPOS-06, JPOS-07]
---

# Phase 2 Plan 06: Employer Dashboard, Job Detail, and Route Wiring Summary

**One-liner:** Full employer dashboard with job management cards and filter tabs, public job detail with visitor sticky CTA, MarkFilledModal with audit trail foundation, and pg_cron daily expiry job.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Rebuild EmployerDashboard with job management and MarkFilledModal | 1a06d15 | EmployerDashboard.tsx, MarkFilledModal.tsx |
| 2 | Create public job detail page, pg_cron migration, and wire all routes | ca53854 | JobDetail.tsx, 008_job_expiry_cron.sql, main.tsx |

## What Was Built

### EmployerDashboard (complete rebuild)

The placeholder dashboard was replaced with a full implementation:

- **Onboarding state gate:** If `onboarding_complete === false`, shows the progress card with updated step count from DB. If complete, shows the full dashboard.
- **Header row:** "Welcome back, {farm_name}" + "Post a Job" primary CTA.
- **Verification nudge card:** Uses `useVerifications(profile.id)` — shown if `trustLevel !== 'fully_verified'` with VerificationBadge + "Improve Trust Level" link to `/dashboard/employer/verification`.
- **Quick Stats row:** Three stat cards — Active Listings (count), Draft Listings (count), Total Views (sum of views_count).
- **Job Listings section:** Filter tabs (All / Active / Drafts / Paused / Filled/Expired), grid of JobCards with action handlers (pause/resume, edit, archive, mark filled).
- **Drafts section:** Shown separately below main listings when not on the Drafts tab, each with "Continue editing" link.
- **Archive confirmation dialog:** Inline modal with warning copy before archiving.
- **MarkFilledModal integration:** Opens on "Mark as Filled" action, reloads jobs on completion.

### MarkFilledModal

- Loads applicants from `applications` table for the job.
- Handles empty applicants case with "No applicants via TopFarms" state + note about external hire.
- Radio list to select hired candidate (or "Hired externally").
- Optional hire date input.
- On confirm: updates `jobs.status = 'filled'`, updates selected `applications.status = 'hired'`.
- Foundation for Phase 5 placement fee audit trail (placement_fees insert deferred to Phase 5).

### JobDetail (public page)

Single-column layout (`max-w-3xl`) with these sections:
- **Header:** Job title, farm name + expandable VerificationBadge, region, salary, contract type, start date. Tier badge (Featured/Premium) if listing_tier > 1.
- **Description:** Role Overview, Day-to-Day, What We Offer, Ideal Candidate (each conditional on content).
- **Skills:** Grouped by category, required/preferred badges, summary count.
- **Compensation & Benefits:** Salary + benefits list from jsonb.
- **Accommodation:** Type, pets/couples/family/utilities flags (conditional on `accommodation_available`).
- **Farm Details:** Farm type, shed type, herd size, region, culture description.
- **Sticky CTA bar:** Visitor → "Sign up to see how you match and apply" + Log In / Sign Up Free buttons. Seeker → Apply Now (toast placeholder for Phase 3). Employer → Edit Listing in nav bar.
- **404/gone handling:** Archived and not-found jobs show "Listing not available" page. Draft jobs only visible to employers (non-employers see 404-style message).

### pg_cron Migration (008_job_expiry_cron.sql)

Schedules a daily job at 2:00 AM UTC that transitions `status='active'` jobs to `status='expired'` where `expires_at < now()`. Includes comment noting pg_cron extension must be enabled in Supabase project settings.

### Route Wiring (main.tsx)

All routes now wired:
- `/jobs/:id` — Public `JobDetail` (no ProtectedRoute)
- `/jobs/new` — Employer-protected `PostJob` (placed BEFORE `/jobs/:id`)
- `/jobs/:id/edit` — Employer-protected `PostJob`
- `/dashboard/employer` — `EmployerDashboard`
- `/dashboard/employer/verification` — `EmployerVerification`
- `/dashboard/employer/verification/documents` — `DocumentUpload`
- `/dashboard/employer/verification/photos` — `FarmPhotoUpload`
- `/onboarding/employer` — `EmployerOnboarding`

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Files Created/Modified
- [x] `src/pages/dashboard/EmployerDashboard.tsx` — rebuilt
- [x] `src/pages/jobs/MarkFilledModal.tsx` — created
- [x] `src/pages/jobs/JobDetail.tsx` — created
- [x] `supabase/migrations/008_job_expiry_cron.sql` — created
- [x] `src/main.tsx` — routes wired

### Commits
- [x] 1a06d15 — Task 1: EmployerDashboard + MarkFilledModal
- [x] ca53854 — Task 2: JobDetail + pg_cron + routes

### Verification
- [x] `npx tsc --noEmit` passes with zero errors

## Self-Check: PASSED
