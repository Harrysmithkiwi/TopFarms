---
phase: 12-oauth-authentication
plan: 02
subsystem: auth
tags: [react, supabase, oauth, routing, react-router]

# Dependency graph
requires:
  - phase: 12-oauth-authentication-01
    provides: useAuth hook with signInWithOAuth and refreshRole methods
provides:
  - SelectRole page at /auth/select-role for new OAuth users to choose Employer or Seeker
  - Role-null redirect in ProtectedRoute preventing /dashboard/null for OAuth users without a role
  - /auth/select-role public route in main.tsx router config
affects: [onboarding, protected-routes, oauth-flow]

# Tech tracking
tech-stack:
  added: []
  patterns: [role-null guard in ProtectedRoute, self-contained auth check in SelectRole page]

key-files:
  created:
    - src/pages/auth/SelectRole.tsx
  modified:
    - src/components/layout/ProtectedRoute.tsx
    - src/main.tsx

key-decisions:
  - "/auth/select-role is a public route (not wrapped in ProtectedRoute) because SelectRole handles its own auth check — session+null-role users need access but would be rejected by ProtectedRoute"
  - "role-null check in ProtectedRoute inserted after !session check but before requiredRole check to correctly identify authenticated OAuth users with no role yet"

patterns-established:
  - "SelectRole self-guard pattern: page handles its own loading/session/role redirects internally"
  - "ProtectedRoute null-role guard: session+null-role redirects to /auth/select-role, preventing /dashboard/null"

requirements-completed: [AUTH-08]

# Metrics
duration: 12min
completed: 2026-04-02
---

# Phase 12 Plan 02: Role Selection Page Summary

**Employer/Seeker role selection page for new OAuth users with ProtectedRoute null-role guard and /auth/select-role route**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-02T23:20:00Z
- **Completed:** 2026-04-02T23:32:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- SelectRole.tsx replaces stub with full Employer/Seeker card UI matching SignUp.tsx design patterns
- Inserts into user_roles, calls refreshRole(), navigates to /onboarding/{role} on card click
- ProtectedRoute now redirects session+null-role users to /auth/select-role preventing /dashboard/null
- /auth/select-role wired as public route in main.tsx — SelectRole self-guards internally

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SelectRole page and add route to main.tsx** - `24ed98f` (feat)
2. **Task 2: Add role-null redirect to ProtectedRoute** - `00eec4a` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `src/pages/auth/SelectRole.tsx` - Full role selection page: loading spinner, no-session redirect to /login, existing-role redirect to dashboard, Employer/Seeker cards with supabase insert + refreshRole + navigate to onboarding
- `src/components/layout/ProtectedRoute.tsx` - Added !role guard between !session and requiredRole checks
- `src/main.tsx` - Added SelectRole import and /auth/select-role public route

## Decisions Made
- `/auth/select-role` added as a public (non-ProtectedRoute) route because SelectRole handles its own auth internally; users with session+null-role would be rejected by ProtectedRoute if it were protected.
- Role-null check positioned after `!session` and before `requiredRole` in ProtectedRoute so it correctly identifies authenticated users who have not yet selected a role.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- OAuth flow is complete: Google/Facebook sign-in → redirect to /auth/select-role → role insert → /onboarding/{role}
- ProtectedRoute correctly handles all four user states: loading, unauthenticated, no-role, role-mismatch
- Ready for integration testing or next phase features

---
*Phase: 12-oauth-authentication*
*Completed: 2026-04-02*

## Self-Check: PASSED

- FOUND: src/pages/auth/SelectRole.tsx
- FOUND: src/components/layout/ProtectedRoute.tsx
- FOUND: src/main.tsx
- FOUND: .planning/phases/12-oauth-authentication/12-02-SUMMARY.md
- FOUND commit: 24ed98f (feat: SelectRole page + route)
- FOUND commit: 00eec4a (feat: ProtectedRoute role-null guard)
