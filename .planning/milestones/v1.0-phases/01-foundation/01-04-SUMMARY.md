---
phase: 01-foundation
plan: 04
subsystem: routing
tags: [react-router, protected-routes, role-based-access, dashboard, navigation, layout]

# Dependency graph
requires:
  - phase: 01-01
    provides: Tailwind v4 CSS-first theme with colour tokens, cn() utility, path alias @/*
  - phase: 01-02
    provides: Button, Card, ProgressBar UI components
  - phase: 01-03
    provides: useAuth hook (session/role/loading), auth pages (Login/SignUp/VerifyEmail/ForgotPassword/ResetPassword)
provides:
  - ProtectedRoute component: auth + role guard, redirects unauthenticated to /login and wrong-role to /dashboard/:role
  - Nav component: 56px soil bg, role-aware links (employer/seeker/public), user avatar dropdown, mobile hamburger
  - Sidebar component: 240px role-specific nav items with lucide icons and moss active state (hidden on mobile)
  - DashboardLayout component: Nav + Sidebar + cream content area (max-w-1200px)
  - EmployerDashboard page: onboarding prompt card, ProgressBar 0%, 3 empty state cards
  - SeekerDashboard page: onboarding prompt card, ProgressBar 0%, 3 empty state cards
  - Home page: TopFarms heading with dual CTA buttons (worker/employer)
  - Complete router via createBrowserRouter with all Phase 1 routes + placeholders for future phases
  - Login.tsx updated: navigates to /dashboard/:role via useEffect after signIn + role load
affects: [02-employer, 03-seeker, 04-matching, 05-payments, 06-testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - createBrowserRouter (react-router v7) used for all route definitions — no BrowserRouter wrapper in App.tsx
    - ProtectedRoute pattern: loading state -> !session -> wrong role -> render children (three-gate guard)
    - NavLink from react-router used in Nav and Sidebar for active state detection (end prop on exact dashboard paths)
    - Role-aware navigation: employer/seeker/public link arrays selected via useAuth role at render time
    - Dashboard CTAs use Link styled with cn() utility matching Button.primary — no polymorphic as prop needed
    - Login navigation uses useRef didSubmit + useEffect on session/role/loading to navigate after onAuthStateChange fires

key-files:
  created:
    - src/components/layout/ProtectedRoute.tsx (route guard: auth + optional role, loading spinner)
    - src/components/layout/Nav.tsx (sticky 56px, soil bg, role-aware links, avatar dropdown, hamburger mobile menu)
    - src/components/layout/Sidebar.tsx (240px, role-specific nav with lucide icons, hidden on mobile)
    - src/components/layout/DashboardLayout.tsx (Nav + Sidebar + cream content area shell)
    - src/pages/Home.tsx (placeholder landing with TopFarms heading and dual CTA buttons)
    - src/pages/dashboard/EmployerDashboard.tsx (onboarding prompt, ProgressBar 0%, empty state cards)
    - src/pages/dashboard/SeekerDashboard.tsx (onboarding prompt, ProgressBar 0%, empty state cards)
  modified:
    - src/main.tsx (replaced App + Toaster with createBrowserRouter + RouterProvider + all routes)
    - src/App.tsx (replaced with null shell — routing now in main.tsx)
    - src/pages/auth/Login.tsx (added useNavigate + useEffect navigation to /dashboard/:role post-login)

key-decisions:
  - "Router defined with createBrowserRouter in main.tsx — App.tsx replaced with null shell, eliminates double-wrapping"
  - "Button component has no as/polymorphic prop — dashboard CTAs use Link styled via cn() with equivalent class strings"
  - "Login navigation uses useRef didSubmit flag + useEffect monitoring session/role/loading — avoids premature redirect before onAuthStateChange fires role"
  - "ProtectedRoute guards wrong-role access by redirecting to /dashboard/${role} — seeker can never stay on /dashboard/employer"

patterns-established:
  - "Pattern 8: All protected routes wrapped in ProtectedRoute with requiredRole — role enforcement at router level, not page level"
  - "Pattern 9: createBrowserRouter is the single source of route truth — all phase pages registered here as they are built"
  - "Pattern 10: DashboardLayout wraps every dashboard page — Nav + Sidebar + content area is the standard dashboard shell"

requirements-completed: [AUTH-05]

# Metrics
duration: 3min
completed: 2026-03-15
---

# Phase 1 Plan 4: Routing and Dashboard Shells Summary

**Complete react-router v7 router with ProtectedRoute role guards, Nav/Sidebar/DashboardLayout shell, and employer/seeker dashboard pages with onboarding prompts — full auth-to-dashboard flow wired end-to-end**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-15T08:28:39Z
- **Completed:** 2026-03-15T08:31:39Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- ProtectedRoute enforces three gates: loading skeleton, unauthenticated redirect to /login, wrong-role redirect to /dashboard/:role — role-based access control works without any page-level checks
- Nav renders at 56px soil background with role-aware link arrays (employer/seeker/public), user avatar with dropdown (Profile/Settings/Sign Out), and hamburger mobile menu with slide-out — fully responsive below 768px
- Complete router via createBrowserRouter with all routes: home, 5 auth pages, 2 dashboards, 2 onboarding placeholders, jobs placeholder
- Login.tsx updated with useEffect navigation via didSubmit ref — navigates to /dashboard/:role only after onAuthStateChange fires and role loads from user_roles table

## Task Commits

Each task was committed atomically:

1. **Task 1: Build Nav, Sidebar, DashboardLayout, and ProtectedRoute components** - `6cd1115` (feat)
2. **Task 2: Create dashboard pages and wire complete router** - `daeb5ec` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified

- `src/components/layout/ProtectedRoute.tsx` - Three-gate route guard: loading spinner, unauthenticated redirect, wrong-role redirect
- `src/components/layout/Nav.tsx` - Sticky 56px nav with soil bg, role-aware links, user avatar dropdown, mobile hamburger slide-out
- `src/components/layout/Sidebar.tsx` - 240px left sidebar with role-specific lucide-icon nav items, moss active state, hidden on mobile
- `src/components/layout/DashboardLayout.tsx` - Dashboard shell: Nav + Sidebar + cream content area (max-w-1200px)
- `src/pages/Home.tsx` - Placeholder landing: TopFarms heading, "Find your next farm role" subtitle, dual CTA buttons
- `src/pages/dashboard/EmployerDashboard.tsx` - Fraunces heading, onboarding prompt card with hay emoji, ProgressBar 0%, 3 empty state cards
- `src/pages/dashboard/SeekerDashboard.tsx` - Fraunces heading, onboarding prompt card with farmer emoji, ProgressBar 0%, 3 empty state cards
- `src/main.tsx` - createBrowserRouter with all routes, RouterProvider at root, Toaster from sonner
- `src/App.tsx` - Replaced with null shell (routing moved to main.tsx)
- `src/pages/auth/Login.tsx` - Added useNavigate + useRef didSubmit + useEffect for role-aware post-login navigation

## Decisions Made

- Router defined with createBrowserRouter in main.tsx — App.tsx replaced with null shell. Eliminates double-wrapping and aligns with react-router v7 data router pattern.
- Button component has no polymorphic as prop — dashboard CTAs use Link styled via cn() with the same class strings as Button.primary. Avoids needing to modify the design system component.
- Login navigation uses a useRef didSubmit flag with useEffect monitoring session/role/loading — this prevents premature redirect before onAuthStateChange fires and role loads from user_roles table.
- ProtectedRoute redirects wrong-role users to /dashboard/${role} rather than /login — employer accessing /dashboard/seeker goes straight to their dashboard, not back to login.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Full Phase 1 foundation complete: schema + design system + auth pages + routing + dashboards
- Phase 2 (employer onboarding) can immediately use DashboardLayout, ProtectedRoute, Nav, Sidebar
- All auth pages are now properly wired into the router — login/signup/verify flows work end-to-end
- Dashboard shells are ready to receive real content as each phase delivers features

## Self-Check: PASSED

All 8 files verified present. Both task commits (6cd1115, daeb5ec) verified in git log. TypeScript clean (npx tsc --noEmit: 0 errors).
