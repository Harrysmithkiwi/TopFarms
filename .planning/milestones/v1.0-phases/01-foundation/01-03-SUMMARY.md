---
phase: 01-foundation
plan: 03
subsystem: auth
tags: [supabase-auth, react-hook-form, zod, react-router, sonner, tailwind, split-screen-layout]

# Dependency graph
requires:
  - phase: 01-01
    provides: supabase client singleton, UserRole/AuthState types, Tailwind v4 colour tokens
provides:
  - useAuth hook with session/role/loading state and signUpWithRole/signIn/signOut/resetPassword/updatePassword functions
  - AuthLayout split-screen component (soil gradient left, cream right, responsive)
  - SignUp page with two-step role selection (Employer/Seeker cards) and password strength indicator
  - Login page with email/password form and forgot-password link
  - VerifyEmail page handling check-inbox state and SIGNED_IN event redirect
  - ForgotPassword page sending reset email via Supabase and success confirmation state
  - ResetPassword page handling PASSWORD_RECOVERY event with 5s invalid-link timeout
  - Toaster added to main.tsx app root via sonner
affects: [01-04-routing, 02-employer, 03-seeker, 04-matching, 05-payments]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - signUpWithRole passes role in user metadata options.data.role — handle_new_user() DB trigger creates user_roles row atomically
    - useAuth uses getSession() + onAuthStateChange() for session re-hydration and reactivity
    - Auth pages use direct Tailwind utility classes + CSS variable inline styles (no design system components — parallel build)
    - All form pages use react-hook-form + zodResolver for type-safe validation
    - sonner toast for all async feedback (error and success)

key-files:
  created:
    - src/hooks/useAuth.ts (auth state management hook with all 5 auth functions)
    - src/components/layout/AuthLayout.tsx (split-screen layout, soil left panel, cream right panel)
    - src/pages/auth/SignUp.tsx (role card selection + email/password form + password strength)
    - src/pages/auth/Login.tsx (email/password with show/hide toggle)
    - src/pages/auth/VerifyEmail.tsx (check-inbox state + SIGNED_IN event redirect)
    - src/pages/auth/ForgotPassword.tsx (sends reset email, success confirmation state)
    - src/pages/auth/ResetPassword.tsx (PASSWORD_RECOVERY listener, 5s timeout, new password form)
  modified:
    - src/main.tsx (added Toaster from sonner to app root)

key-decisions:
  - "signUpWithRole does NOT insert into user_roles from client — stores role in metadata.data.role for handle_new_user() DB trigger (atomic, race-condition-free)"
  - "Auth pages use direct Tailwind + CSS variable inline styles (not Plan 02 design system) — parallel build, no circular dependency"
  - "ResetPassword uses 5s timeout before showing invalid-link UI — allows TIME for PASSWORD_RECOVERY event to arrive from Supabase"
  - "AuthLayout left panel hidden on mobile (md:hidden md:flex) — single-column cream form on small screens"

patterns-established:
  - "Pattern 5: useAuth is the single source of auth truth — all pages read session/role from this hook"
  - "Pattern 6: Never insert into user_roles from client code — the handle_new_user() trigger owns that row creation"
  - "Pattern 7: AuthLayout wraps all auth pages — consistent split-screen on desktop, single-column on mobile"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04]

# Metrics
duration: 4min
completed: 2026-03-15
---

# Phase 1 Plan 3: Authentication Flow Summary

**Supabase Auth integration with useAuth hook, 5 auth pages (SignUp/Login/VerifyEmail/ForgotPassword/ResetPassword), split-screen AuthLayout, and role-based metadata for DB trigger**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-15T08:22:10Z
- **Completed:** 2026-03-15T08:26:10Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- useAuth hook provides complete auth state management: session, role (loaded from user_roles table), loading, and all 5 auth functions — signUpWithRole stores role in user metadata for the handle_new_user() DB trigger rather than inserting client-side
- AuthLayout renders a two-column split-screen on desktop (soil-deep gradient farm imagery left, cream form right) with responsive single-column on mobile, Fraunces branding, value prop copy, and stat counters
- All 5 auth pages built with Supabase Auth integration, react-hook-form + Zod validation, sonner toasts, and password strength indicator on SignUp

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useAuth hook and AuthLayout component** - `3fc04f3` (feat)
2. **Task 2: Build all 5 auth pages** - `f80a15d` (feat)

## Files Created/Modified

- `src/hooks/useAuth.ts` - Auth state hook: session/role/loading + signUpWithRole/signIn/signOut/resetPassword/updatePassword
- `src/components/layout/AuthLayout.tsx` - Split-screen layout: soil gradient left panel (hidden mobile), cream right panel with optional title/subtitle
- `src/pages/auth/SignUp.tsx` - Two-step form: role selection cards (Employer/Seeker) -> email/password with strength bar, terms checkbox, react-hook-form+zod
- `src/pages/auth/Login.tsx` - Email/password login with show/hide toggle, forgot-password link, sonner error/success toasts
- `src/pages/auth/VerifyEmail.tsx` - Check-inbox state with resend button + onAuthStateChange SIGNED_IN listener that redirects to /dashboard/:role
- `src/pages/auth/ForgotPassword.tsx` - Reset email form with success confirmation state showing recipient address
- `src/pages/auth/ResetPassword.tsx` - onAuthStateChange PASSWORD_RECOVERY listener, 5s timeout for invalid-link UI, new password + confirm form
- `src/main.tsx` - Added `<Toaster position="top-right" richColors />` from sonner to app root

## Decisions Made

- signUpWithRole does NOT manually insert into user_roles from client — the handle_new_user() DB trigger reads raw_user_meta_data.role and creates the row atomically (Race-condition-free, RLS-safe)
- Auth pages use direct Tailwind utility classes and CSS variable inline styles rather than Plan 02 design system components — those build in parallel, no circular dependency
- ResetPassword uses a 5-second timeout before showing the invalid-link state to give the PASSWORD_RECOVERY auth event time to arrive from Supabase's URL hash token processing
- AuthLayout left panel hidden on mobile (hidden md:flex) so auth forms render full-width on small screens

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required beyond what Plan 01 documented (Supabase credentials in .env).

## Next Phase Readiness

- useAuth hook and all 5 auth pages are ready for router integration (Plan 04)
- Pages are NOT wired into the router yet — exports ready, Plan 04 handles route definitions
- AuthLayout is immediately usable by any future page requiring auth-gated split-screen layout

---
*Phase: 01-foundation*
*Completed: 2026-03-15*
