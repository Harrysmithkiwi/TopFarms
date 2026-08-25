---
phase: 09-page-level-integrations
plan: 01
subsystem: database
tags: [supabase, migrations, react, hooks, edge-functions, anthropic, rls]

# Dependency graph
requires:
  - phase: 08-wizard-field-extensions
    provides: Applications and seeker_profiles tables with Phase 8 fields in place
provides:
  - Migration 015 adding viewed_at, ai_summary, application_notes to applications and saved_jobs table with RLS
  - DashboardLayout hideSidebar prop for pages that suppress the sidebar
  - generate-candidate-summary Edge Function with cache hit check and Anthropic AI
  - useSavedJobs hook with optimistic toggle and revert-on-error
affects:
  - 09-02-PLAN
  - 09-03-PLAN
  - 09-04-PLAN
  - 09-05-PLAN
  - 09-06-PLAN

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Edge Function cache check: read ai_summary from DB before calling AI, store result after"
    - "Optimistic toggle: setSavedJobIds before async op, revert in catch block with toast.error"
    - "hideSidebar prop: boolean guard on Sidebar render without affecting Nav or children"

key-files:
  created:
    - supabase/migrations/015_phase9_schema.sql
    - supabase/functions/generate-candidate-summary/index.ts
    - src/hooks/useSavedJobs.ts
  modified:
    - src/components/layout/DashboardLayout.tsx

key-decisions:
  - "Migration repair: ran supabase migration repair --status applied 011 012 013 014 to align remote migration history with local files before pushing 015"
  - "Cache-first AI: generate-candidate-summary checks applications.ai_summary before invoking Anthropic, preventing redundant API calls"

patterns-established:
  - "Edge Function pattern: CORS headers + Deno.serve + OPTIONS handler + service role client + retry loop (3 attempts, exponential backoff)"
  - "useSavedJobs: optimistic Set<string> state with revert on DB error and toast.error notification"

requirements-completed: [ADSH-04, MAPP-02]

# Metrics
duration: 2min
completed: 2026-03-22
---

# Phase 9 Plan 01: Foundation Summary

**Postgres migration 015 (viewed_at, ai_summary, application_notes, saved_jobs table+RLS), DashboardLayout hideSidebar prop, generate-candidate-summary Edge Function with Anthropic AI and cache hit, and useSavedJobs optimistic hook**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-21T22:02:13Z
- **Completed:** 2026-03-21T22:04:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Migration 015 applied to remote DB: viewed_at, ai_summary, application_notes columns on applications; saved_jobs table with UNIQUE constraint and RLS
- DashboardLayout extended with optional hideSidebar prop — all 5 subsequent Phase 9 plans can suppress sidebar for full-width pages
- generate-candidate-summary Edge Function deployed to Supabase, matching generate-match-explanation pattern with AI cache and retry loop
- useSavedJobs hook ready for consumption by plans 03, 04, 06

## Task Commits

Each task was committed atomically:

1. **Task 1: DB migration 015 + DashboardLayout hideSidebar** - `c10e6da` (feat)
2. **Task 2: AI candidate summary Edge Function + useSavedJobs hook** - `c5fe258` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `supabase/migrations/015_phase9_schema.sql` - Phase 9 schema: viewed_at, ai_summary, application_notes columns; saved_jobs table with RLS
- `src/components/layout/DashboardLayout.tsx` - Added hideSidebar?: boolean prop; conditionally renders Sidebar
- `supabase/functions/generate-candidate-summary/index.ts` - Edge Function: loads app+seeker+job+score, checks ai_summary cache, calls Anthropic claude-sonnet-4-20250514, writes back to applications.ai_summary
- `src/hooks/useSavedJobs.ts` - Optimistic save/unsave hook with Set<string> state and revert-on-error toast

## Decisions Made
- Migration repair was required: migrations 011-014 had been applied to the remote DB outside of the migration tracking system. Ran `supabase migration repair --status applied 011 012 013 014` before pushing 015.
- Cache-first AI pattern: generate-candidate-summary reads ai_summary first and short-circuits before any Anthropic call if summary already exists, keeping AI costs low.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Repaired migration history before pushing 015**
- **Found during:** Task 1 (DB migration push)
- **Issue:** `npx supabase db push` failed on migration 011 with "column already exists" — migrations 011-014 were applied to the remote DB but not recorded in the migration tracking table
- **Fix:** Ran `npx supabase migration repair --status applied 011 012 013 014` to mark them as applied, then re-ran `db push` which only applied 015
- **Files modified:** None (migration tracking metadata in remote DB only)
- **Verification:** `npx supabase db push` completed with "Applying migration 015_phase9_schema.sql... Finished"
- **Committed in:** c10e6da (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (blocking issue — migration history desync)
**Impact on plan:** Necessary fix to apply the migration. No scope creep.

## Issues Encountered
- Remote DB migration history was out of sync with local files (011-014 applied but untracked). Resolved with `migration repair` command before pushing.

## User Setup Required
None - no external service configuration required. Edge Function uses existing ANTHROPIC_API_KEY secret already set in Supabase.

## Next Phase Readiness
- Migration 015 applied — all Phase 9 plans can use viewed_at, ai_summary, application_notes, saved_jobs immediately
- DashboardLayout hideSidebar ready — plans 02-06 can pass hideSidebar={true} for full-width layouts
- generate-candidate-summary deployed — plan 05 (Applicant Detail page) can invoke it via supabase.functions.invoke
- useSavedJobs ready — plans 03, 04, 06 can import and use it
- No blockers for Phase 9 continuation

---
*Phase: 09-page-level-integrations*
*Completed: 2026-03-22*
