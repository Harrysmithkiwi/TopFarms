# Phase 12: OAuth Authentication - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

A user can sign up and log in with Google or Facebook, select their role on first OAuth login, and be routed to the correct onboarding — matching the existing email/password flow. No new capabilities beyond OAuth provider integration and the role selection step for new OAuth users.

</domain>

<decisions>
## Implementation Decisions

### OAuth button placement
- Google and Facebook OAuth buttons appear on BOTH the Login and SignUp pages
- Buttons are placed ABOVE the email/password form, not below
- An "or" divider line separates OAuth buttons from the email/password form
- Rationale: primary acquisition channel is Facebook groups — OAuth should be the first thing users see

### Role selection flow
- New OAuth users (no record in `user_roles`) are redirected to a dedicated `/auth/select-role` page after OAuth callback
- The role selection page reuses the same Employer/Seeker card pattern from the existing SignUp page (Building2 and User icons)
- This page only appears once per user — returning OAuth users with an existing role skip it entirely
- After role selection, the `user_roles` record is created and the user is routed to the correct onboarding wizard (same as email/password flow)

### Account linking
- Supabase Auth auto-links accounts with the same email address
- If a user signed up with email/password and later tries Google/Facebook OAuth with the same email, they get the same account with both providers attached
- No custom UI for account linking — handled by Supabase Auth configuration

### OAuth button styling
- Follow Google and Facebook official brand guidelines for button appearance
- Google: standard "Sign in with Google" branded button
- Facebook: standard blue "Continue with Facebook" branded button
- Buttons sit inside AuthLayout's cream-background right panel alongside the existing soil-colored submit button

### Claude's Discretion
- OAuth callback URL configuration and error handling
- Loading states during OAuth redirect flow
- Error messages for OAuth failures (provider unavailable, popup blocked, etc.)
- Exact spacing and layout of OAuth buttons relative to divider

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Authentication
- `src/hooks/useAuth.ts` — Current auth hook with session/role management, `loadRole()` function, `signUpWithRole` pattern
- `src/pages/auth/Login.tsx` — Login page to add OAuth buttons to (uses AuthLayout, react-hook-form, routes to `/dashboard/${role}`)
- `src/pages/auth/SignUp.tsx` — SignUp page to add OAuth buttons to (has role selection cards pattern to reuse for `/auth/select-role`)
- `src/components/layout/AuthLayout.tsx` — Split-screen auth layout (branding left, form right) used by all auth pages
- `src/components/layout/ProtectedRoute.tsx` — Route guard that checks role — OAuth users without role must be redirected before hitting this

### Routing
- `src/main.tsx` — Router configuration (createBrowserRouter) — new `/auth/select-role` route needed

### Project context
- `MILESTONE_LAUNCH.md` — Authoritative launch guide, all gaps assessed against it
- `.planning/REQUIREMENTS.md` — AUTH-06 (Google OAuth), AUTH-07 (Facebook OAuth), AUTH-08 (role selection for OAuth users)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AuthLayout` component: Split-screen layout, reuse for the new `/auth/select-role` page
- Role selection cards (Building2/User icons) in `SignUp.tsx`: Extract or replicate for the role selection page
- `loadRole()` in `useAuth.ts`: Already checks `user_roles` table — use to determine if OAuth user needs role selection
- `onAuthStateChange` listener in `useAuth.ts`: Already handles session changes — will naturally pick up OAuth logins

### Established Patterns
- Auth pages use `react-hook-form` + `zod` for validation
- Toast notifications via `sonner` for success/error feedback
- CSS variables for design system colors (soil, cream, fog, etc.)
- `useNavigate` for post-auth routing to `/dashboard/${role}`

### Integration Points
- `supabase.auth.signInWithOAuth()` — Supabase method to add for Google/Facebook providers
- `src/main.tsx` router — add `/auth/select-role` route
- `useAuth` hook — extend with `signInWithOAuth` method, handle OAuth callback where role is null
- Supabase Dashboard — enable Google and Facebook providers, configure redirect URLs

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches within the decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-oauth-authentication*
*Context gathered: 2026-04-02*
