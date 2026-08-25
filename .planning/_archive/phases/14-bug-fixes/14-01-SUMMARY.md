---
phase: 14-bug-fixes
plan: "01"
subsystem: jobs
tags: [bfix-01, applied-badge, react-hooks, batch-query, jobs-01-fallout]
dependency_graph:
  requires: []
  provides: [useSeekerProfileId, useAppliedStatuses, status-suffixed-applied-badge, apply-tab-gating]
  affects: [src/pages/jobs/JobSearch.tsx, src/components/ui/SearchJobCard.tsx, src/components/ui/ExpandableCardTabs.tsx]
tech_stack:
  added: [useSeekerProfileId, useAppliedStatuses, appliedStatus prop signature]
  patterns: [auth-bound hook, batch-applications query, hasActiveApplication derivation]
key_files:
  created:
    - src/hooks/useSeekerProfileId.ts
    - src/hooks/useAppliedStatuses.ts
  modified:
    - src/pages/jobs/JobSearch.tsx
    - src/components/ui/SearchJobCard.tsx
    - src/components/ui/ExpandableCardTabs.tsx
    - src/hooks/useAuth.ts
decisions:
  - "Single batch query for applied statuses (one round-trip via .in('job_id', visibleJobIds)) over per-card lookup"
  - "appliedStatus: ApplicationStatus | null replaces hasApplied: boolean — renders status-suffixed copy for terminal states"
  - "hasActiveApplication derived once at the top of ExpandableCardTabs from ACTIVE_STATUSES.includes — Apply tab hidden only when active, visible (re-apply allowed) for terminal statuses"
  - "JOBS-01 useAuth timeout + .catch race shipped here as a hard dependency — fetchJobs gated on authLoading prevents triple-fire / Web Lock contention. Symptom-mitigation; root-cause fix tracked separately as AUTH-FIX in 2fce4b7"
metrics:
  closing_commit: c6066ea
  completed_date: "2026-04-28"
  tasks_completed: 5
  files_changed: 6
  insertions: 190
  deletions: 24
---

# Phase 14 Plan 01 — BFIX-01 Applied badge with status-suffixed copy

**One-liner:** Replace `JobSearch.tsx:582 hasApplied={false}` hardcode with a real per-(seeker, job) lookup driven by two new hooks. Render an "Applied" badge on every card the seeker has applied to, with status-suffixed copy for terminal states; Apply tab re-enabled for terminal applications (re-apply allowed).

## What Was Built

### Hooks (new)
- **`src/hooks/useSeekerProfileId.ts`** — auth-bound hook deriving `seeker_profiles.id` from `auth.uid` via a single `maybeSingle()` lookup with cancellation guard. Returns `null` while loading, when unsigned, or for non-seeker users (employer-role users have no `seeker_profiles` row).
- **`src/hooks/useAppliedStatuses.ts`** — single batch query against `applications` filtered `.in('job_id', jobIds)` and `.eq('seeker_id', seekerProfileId)`, ordered `.order('created_at', { ascending: false })`. Builds `Map<jobId, latestStatus>` keeping the FIRST encounter per job (so the latest application wins when a seeker has re-applied). Stable join key (`[...jobIds].sort().join(',')`) used in the effect dep array to avoid infinite re-fires from array-reference churn.

### Wiring (modified)
- **`src/pages/jobs/JobSearch.tsx`** — imports both hooks, derives `appliedStatuses` from `jobs.map(j => j.id)`, replaces hardcode with `appliedStatus={appliedStatuses.get(job.id) ?? null}`. Unused `Button` import removed (TS6133 cleanup in flight). `fetchJobs` useEffect gated on `authLoading` to prevent triple-fire / lock contention (JOBS-01 hard dependency for UAT).
- **`src/components/ui/SearchJobCard.tsx`** — prop signature `hasApplied: boolean` → `appliedStatus: ApplicationStatus | null`. Status-suffixed badge renders `Applied · {Label}` for terminal states (declined / withdrawn / hired) using `APPLICATION_STATUS_LABELS`; plain `Applied` for active states. Muted styling (fog/mid) for terminal, primary (meadow/soil) for active.
- **`src/components/ui/ExpandableCardTabs.tsx`** — same prop rename. `hasActiveApplication` derived once near the top from `ACTIVE_STATUSES.includes(appliedStatus)`. Apply tab gate flipped: hidden only when `hasActiveApplication === true` — terminal statuses make the tab visible so re-apply is allowed.
- **`src/hooks/useAuth.ts`** — JOBS-01 mitigation: `loadRoleWithTimeout` (3s `Promise.race`) + `.catch()` on `getSession`. Symptom-mitigation against Web Lock contention; root-cause fix landed later as AUTH-FIX in `2fce4b7` (single AuthProvider). Timeout + catch retained as defence-in-depth in the post-AUTH-FIX provider.

## Decisions Made

| Decision | Rationale |
|---|---|
| Single batch query, not per-card | One round-trip per page load instead of N queries; the per-card pattern would have multiplied auth-token Web Lock contention (related to JOBS-01) |
| `appliedStatus` over `hasApplied` | Boolean lost the distinction between active and terminal applications; terminal states need re-apply visibility AND status-suffixed copy |
| `hasActiveApplication` derived once | Single source of truth inside ExpandableCardTabs; both the tab gate and the apply-content gate read the same value |
| JOBS-01 `loadRoleWithTimeout` shipped here | Hard dependency for UAT — without it, `/jobs` rendered "0 jobs found" for authenticated seekers. Tracked as defence-in-depth even after the AUTH-FIX root cause fix landed |

## Deviations from Plan

None to the BFIX-01 deliverable scope. JOBS-01 mitigation was originally separate but bundled here per the commit because the UAT depended on it.

## Self-Check

- [x] `src/hooks/useSeekerProfileId.ts` created — `maybeSingle()`, cancellation guard
- [x] `src/hooks/useAppliedStatuses.ts` created — `.in('job_id', jobIds)` batch, `.order('created_at', { ascending: false })`, stable join key
- [x] `JobSearch.tsx:617` — `appliedStatus={appliedStatuses.get(job.id) ?? null}` (no remaining `hasApplied={false}`)
- [x] `SearchJobCard.tsx:21,63-68` — `appliedStatus: ApplicationStatus | null` interface + status-suffixed render via `APPLICATION_STATUS_LABELS`
- [x] `ExpandableCardTabs.tsx:17,26-32,138` — `hasActiveApplication` derived from `ACTIVE_STATUSES.includes`; Apply tab gated
- [x] `Button` unused import removed from `JobSearch.tsx` (TS6133 cleared)
- [x] Closing commit: `c6066ea feat(14-01): real hasApplied lookup with status-suffixed badge` (2026-04-28)

## Self-Check: PASSED
