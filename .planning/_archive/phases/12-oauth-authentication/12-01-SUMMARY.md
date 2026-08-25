---
phase: 12-oauth-authentication
plan: "01"
subsystem: auth
tags: [oauth, google, supabase, react, vitest, testing]

# Dependency graph
requires: []
provides:
  - Google and Facebook OAuth buttons on Login and SignUp pages
  - useAuth.signInWithOAuth(provider) calls supabase.auth.signInWithOAuth with redirectTo /auth/select-role
  - useAuth.refreshRole() re-queries user_roles and syncs React state
  - Wave 0 test scaffolds for all phase 12 requirements (oauth-buttons, select-role, protected-route-oauth)
  - SelectRole page stub enabling test compilation
affects: [12-02, ProtectedRoute, SelectRole, Login, SignUp]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "OAuth redirect pattern: signInWithOAuth redirectTo /auth/select-role so new OAuth users land on role selection"
    - "Facebook OAuth requires scopes: 'email' to receive user email address"
    - "handleOAuth pattern: no finally on success — browser redirects away so component unmounts naturally"
    - "Wave 0 TDD: test scaffolds with failing assertions define expected behavior before implementation"

key-files:
  created:
    - tests/oauth-buttons.test.tsx
    - tests/select-role.test.tsx
    - tests/protected-route-oauth.test.tsx
    - src/pages/auth/SelectRole.tsx
  modified:
    - src/hooks/useAuth.ts
    - src/pages/auth/Login.tsx
    - src/pages/auth/SignUp.tsx

key-decisions:
  - "OAuth redirectTo set to /auth/select-role so both new and returning OAuth users can set/verify role"
  - "Facebook requires scopes: 'email' explicitly; Google has email/profile by default via OpenID"
  - "SelectRole stub created (Rule 3) to allow test compilation before plan 02 full implementation"
  - "oauthLoading state has no finally on success — browser navigation unmounts the component"

patterns-established:
  - "Pattern: OAuth buttons appear ABOVE email/password form with 'or' divider (locked decision from CONTEXT.md)"
  - "Pattern: Google button uses white background with border; Facebook button uses #1877F2 blue"
  - "Pattern: Both buttons use type=button and disabled={oauthLoading}"

requirements-completed: [AUTH-06, AUTH-07]

# Metrics
duration: 4min
completed: 2026-04-02
---

# Phase 12 Plan 01: OAuth Buttons and useAuth Extension Summary

**Google and Facebook OAuth buttons on Login/SignUp pages with signInWithOAuth and refreshRole added to useAuth, plus Wave 0 test scaffolds for all phase 12 requirements**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-02T12:16:30Z
- **Completed:** 2026-04-02T12:20:29Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Created 3 Wave 0 test scaffold files with 12 tests (6 failing RED for OAuth buttons, others defining expected behavior)
- Extended useAuth with signInWithOAuth (Google/Facebook) and refreshRole, updated AuthHookReturn interface
- Added OAuth buttons (Google and Facebook) above forms on both Login and SignUp pages with "or" divider
- All 6 OAuth button tests pass after implementation; full test suite shows no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Wave 0 test scaffolds** - `a82a3f3` (test)
2. **Task 2: Extend useAuth with signInWithOAuth and refreshRole** - `7514a88` (feat)
3. **Task 3: Add OAuth buttons to Login and SignUp pages** - `0af428f` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `tests/oauth-buttons.test.tsx` - 6 tests for OAuth button rendering and click behavior (all green after Task 3)
- `tests/select-role.test.tsx` - 4 tests for SelectRole page behavior (3 red awaiting plan 02 implementation)
- `tests/protected-route-oauth.test.tsx` - 2 tests for ProtectedRoute role-null redirect behavior
- `src/pages/auth/SelectRole.tsx` - Minimal stub enabling test compilation (full impl in plan 02)
- `src/hooks/useAuth.ts` - Added signInWithOAuth and refreshRole; updated AuthHookReturn interface
- `src/pages/auth/Login.tsx` - OAuth buttons + handleOAuth + oauthLoading state added above email/password form
- `src/pages/auth/SignUp.tsx` - OAuth buttons + handleOAuth + oauthLoading state added above role selection

## Decisions Made
- OAuth redirectTo points to `/auth/select-role` so new OAuth users can select their role before accessing the dashboard
- Facebook OAuth requires `scopes: 'email'` explicitly — not included in default OAuth scopes
- `handleOAuth` has no `finally` for `setOauthLoading(false)` on success path — browser navigation unmounts the component
- SelectRole stub created to unblock test compilation without implementing plan 02 functionality early

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created SelectRole stub for test compilation**
- **Found during:** Task 1 (Wave 0 test scaffolds)
- **Issue:** `tests/select-role.test.tsx` imports `SelectRole` component which doesn't exist yet (plan 02 work), causing compile-time import error that would violate the "all 3 files compile without syntax errors" acceptance criterion
- **Fix:** Created `src/pages/auth/SelectRole.tsx` as a minimal stub that exports the component with correct name and renders via AuthLayout, allowing tests to compile and fail on assertions (not on import)
- **Files modified:** src/pages/auth/SelectRole.tsx (created)
- **Verification:** All 3 test files compile; select-role tests fail on assertions as expected (not on import errors)
- **Committed in:** a82a3f3 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 3 blocking)
**Impact on plan:** Essential for test compilation correctness. No scope creep — stub has minimal content and will be replaced by plan 02 full implementation.

## Issues Encountered
None beyond the SelectRole stub deviation documented above.

## User Setup Required
External services require manual configuration before OAuth works end-to-end. See plan frontmatter `user_setup` section for:
- Google Cloud Console: Create OAuth 2.0 Client ID, set authorized redirect URI to Supabase callback URL
- Google Cloud Console: Configure consent screen with openid/email/profile scopes
- Supabase Dashboard: Enable Google provider, paste Client ID + Secret
- Meta Developer Console: Create Facebook App, enable Facebook Login, set valid OAuth redirect URIs
- Supabase Dashboard: Enable Facebook provider, paste App ID + Secret
- Environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, FACEBOOK_APP_ID, FACEBOOK_APP_SECRET

## Next Phase Readiness
- Plan 02 (SelectRole page) can replace the stub with full implementation
- useAuth.signInWithOAuth and refreshRole are ready for SelectRole to use
- ProtectedRoute role-null redirect (plan 02 work) test is already scaffolded in protected-route-oauth.test.tsx
- OAuth button tests provide regression coverage for button rendering behavior

---
*Phase: 12-oauth-authentication*
*Completed: 2026-04-02*
