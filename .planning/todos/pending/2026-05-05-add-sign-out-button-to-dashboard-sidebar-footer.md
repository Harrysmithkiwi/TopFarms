---
created: 2026-05-05T01:29:02.750Z
title: Add Sign Out button to dashboard sidebar footer
area: ui
phase: 21
files:
  - src/components/layout/Sidebar.tsx
  - src/components/layout/AdminSidebar.tsx (reference pattern)
  - src/contexts/AuthContext.tsx (signOut export)
  - src/components/layout/Nav.tsx:124-128 (existing sign-out wired in user dropdown — only visible on Nav-bearing routes)
---

## Problem

Employer (`/dashboard/employer/*`) and seeker (`/dashboard/seeker/*`) dashboards have **no visible Sign Out control** in the sidebar or any header on dashboard routes. Sign-out exists in `Nav.tsx:124-128` (user dropdown menu), but `Nav` is not rendered inside `DashboardLayout` — it's used on landing/marketing/job-search routes. Result: a logged-in employer or seeker on `/dashboard/employer` has no obvious way to sign out without navigating away to a Nav-bearing page first.

Surfaced during Phase 20 UAT (2026-05-05) when verifying admin role assignment + redirect behaviour. AdminSidebar already has a footer slot ("Back to app" link, see `src/components/layout/AdminSidebar.tsx:28-35`); the parallel pattern for the consumer dashboard sidebar is missing.

## Solution

Extend `src/components/layout/Sidebar.tsx` with a footer section containing a Sign Out button:

1. Import `signOut` from `useAuth()`
2. Add a footer slot below the nav links (mirror AdminSidebar's footer pattern)
3. Render a button styled as a link/text button (consistent with existing v2 brand tokens) that calls `signOut()` on click
4. After sign-out, AuthContext's `onAuthStateChange` clears the session — `ProtectedRoute` redirects to `/login`. No explicit navigate needed unless desired.
5. Apply to both employer and seeker variants (single Sidebar component renders different items based on role; the Sign Out button is role-agnostic and lives below the role-specific items)

### Acceptance

- Visible Sign Out control on `/dashboard/employer` and `/dashboard/seeker`
- Click signs the user out and redirects to landing page (or `/login` via ProtectedRoute fall-through)
- Visual style consistent with v2 brand tokens (no new design primitives)
- Works on mobile (sidebar collapses; ensure footer is reachable in collapsed/expanded states)

### Notes

- `AdminSidebar` "Back to app" footer is the canonical reference pattern (commit `95a97e9`, Phase 20-04)
- `Nav.tsx`'s existing sign-out (lines 124-128) calls `signOut()` from `useAuth()` then closes the user menu — same call pattern works here
- Phase 21 also covers other post-launch items per ROADMAP Phase 20 Notes (broadcast comms, doc verification queue, moderation queue, advanced analytics, login-blocking on `is_active=false`); this Sign Out button can ship as one of the early Phase 21 deliverables
