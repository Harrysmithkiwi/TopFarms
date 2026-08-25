---
phase: 03-seeker-demand-side
plan: "06"
subsystem: routing-integration
tags: [routing, dashboard, sidebar, integration]
dependency_graph:
  requires: [03-02, 03-03, 03-04, 03-05]
  provides: [all-phase-3-routes-live, seeker-dashboard-live, employer-applicant-counts]
  affects: [src/main.tsx, src/components/layout/Sidebar.tsx, src/pages/dashboard/SeekerDashboard.tsx, src/pages/dashboard/EmployerDashboard.tsx]
tech_stack:
  added: []
  patterns: [react-router-createBrowserRouter, supabase-batch-counts, profile-strength-computation]
key_files:
  created: []
  modified:
    - src/main.tsx
    - src/components/layout/Sidebar.tsx
    - src/pages/dashboard/SeekerDashboard.tsx
    - src/pages/dashboard/EmployerDashboard.tsx
decisions:
  - "Removed Placeholder and OnboardingPlaceholder functions from main.tsx — all routes now have real components"
  - "Sidebar seeker nav updated to correct Phase 3 paths: /dashboard/seeker/applications, /onboarding/seeker (as Edit Profile)"
  - "EmployerDashboard wraps each JobCard in a div with applicant count link below — avoids restructuring JobCard component"
  - "SeekerDashboard profile strength computed from 8 key profile fields (sector_pref, years_experience, shed_types_experienced, herd_sizes_worked, dairynz_level, region, visa_status, min_salary)"
metrics:
  duration: "5 min"
  completed_date: "2026-03-16"
  tasks_completed: 2
  files_modified: 4
---

# Phase 3 Plan 06: Integration — Routes, Dashboards, Sidebar Summary

Final integration plan connecting all Phase 3 seeker-side components into the running app: new routes wired, placeholders removed, SeekerDashboard rebuilt with live Supabase data, EmployerDashboard extended with per-job applicant counts.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Route wiring + Sidebar update | 046db3e | src/main.tsx, src/components/layout/Sidebar.tsx |
| 2 | Rebuild SeekerDashboard + extend EmployerDashboard | c0f3ab2 | src/pages/dashboard/SeekerDashboard.tsx, src/pages/dashboard/EmployerDashboard.tsx |

## What Was Built

**Route wiring (main.tsx):**
- Added imports for `MyApplications` and `ApplicantDashboard`
- Added `/dashboard/seeker/applications` route (ProtectedRoute seeker) placed BEFORE `/dashboard/seeker`
- Added `/dashboard/employer/jobs/:id/applicants` route (ProtectedRoute employer) placed BEFORE `/dashboard/employer`
- Removed `OnboardingPlaceholder` function (was placeholder for seeker onboarding, now real component is wired)
- Removed `Placeholder` function (no longer used anywhere)
- Removed unused `DashboardLayout` import from main.tsx

**Sidebar seeker nav:**
- Dashboard → `/dashboard/seeker`
- Find Jobs → `/jobs` (was "Find Work")
- My Applications → `/dashboard/seeker/applications` (was `/my-applications`)
- Edit Profile → `/onboarding/seeker` (was "My Profile" at `/profile`)
- Removed Settings from seeker items (employer-only)

**SeekerDashboard rebuilt:**
- On mount: loads `seeker_profiles` for current user
- If `onboarding_complete === false`: shows onboarding prompt card with step progress (N of 7) and CTA
- If `onboarding_complete === true`: shows full dashboard with:
  - Profile summary card: experience, DairyNZ level, region, visa status + profile strength ProgressBar
  - "Edit Profile" link to `/onboarding/seeker`
  - Quick stats row: Active Applications, Profile Views (0 placeholder), Profile Strength %
  - Recent Applications card: last 3 using `ApplicationCard`, empty state with "Browse jobs" CTA to `/jobs`
  - "View all" link to `/dashboard/seeker/applications`
- Profile strength computed from 8 key fields as filled percentage

**EmployerDashboard extended:**
- After loading jobs, batch queries `applications` table with `job_id IN (...)` to get all application rows
- Groups by `job_id` into a `Map<string, number>`
- Each JobCard wrapped in a div; if `appCount > 0`, renders `View Applicants (N)` link below the card
- Link points to `/dashboard/employer/jobs/${job.id}/applicants`

## Decisions Made

- Removed `Placeholder` and `OnboardingPlaceholder` from main.tsx — Phase 3 completes all placeholder routes
- Sidebar seeker nav omits Settings (employer-only concern for now — seekers have no settings page)
- EmployerDashboard wraps JobCard in div rather than modifying JobCard component — minimal, non-breaking addition
- SeekerDashboard profile strength uses 8 core fields (not all DB columns) for a meaningful percentage

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused Placeholder function from main.tsx**
- **Found during:** Task 1 (build verification)
- **Issue:** After removing `OnboardingPlaceholder`, the `Placeholder` function it depended on became unused — TypeScript TS6133 error
- **Fix:** Removed the `Placeholder` function entirely
- **Files modified:** src/main.tsx
- **Commit:** c0f3ab2

## Self-Check: PASSED
