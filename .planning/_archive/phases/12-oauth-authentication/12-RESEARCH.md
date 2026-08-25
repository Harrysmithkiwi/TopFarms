# Phase 12: OAuth Authentication - Research

**Researched:** 2026-04-02
**Domain:** Supabase Auth OAuth (Google + Facebook), React SPA redirect flow, role-selection routing
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**OAuth button placement:**
- Google and Facebook OAuth buttons appear on BOTH the Login and SignUp pages
- Buttons are placed ABOVE the email/password form, not below
- An "or" divider line separates OAuth buttons from the email/password form

**Role selection flow:**
- New OAuth users (no record in `user_roles`) are redirected to a dedicated `/auth/select-role` page after OAuth callback
- The role selection page reuses the same Employer/Seeker card pattern from the existing SignUp page (Building2 and User icons)
- This page only appears once per user — returning OAuth users with an existing role skip it entirely
- After role selection, the `user_roles` record is created and the user is routed to the correct onboarding wizard

**Account linking:**
- Supabase Auth auto-links accounts with the same email address
- No custom UI for account linking — handled by Supabase Auth configuration

**OAuth button styling:**
- Follow Google and Facebook official brand guidelines
- Google: standard "Sign in with Google" branded button
- Facebook: standard blue "Continue with Facebook" branded button
- Buttons sit inside AuthLayout's cream-background right panel

### Claude's Discretion
- OAuth callback URL configuration and error handling
- Loading states during OAuth redirect flow
- Error messages for OAuth failures (provider unavailable, popup blocked, etc.)
- Exact spacing and layout of OAuth buttons relative to divider

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-06 | User can sign up and log in with Google OAuth via Supabase Auth | `supabase.auth.signInWithOAuth({ provider: 'google' })` — full setup documented below |
| AUTH-07 | User can sign up and log in with Facebook OAuth via Supabase Auth | `supabase.auth.signInWithOAuth({ provider: 'facebook' })` — full setup documented below |
| AUTH-08 | OAuth users are prompted to select role on first login and routed to role-appropriate onboarding | Role-null detection via existing `loadRole()` + new `/auth/select-role` page — pattern documented below |
</phase_requirements>

---

## Summary

This phase adds Google and Facebook OAuth to a Supabase + React (Vite, react-router v7) SPA. The core Supabase method is `signInWithOAuth()` which triggers a full-page redirect to the provider. When the user returns, Supabase's existing `detectSessionInUrl: true` (already set in `src/lib/supabase.ts`) automatically exchanges the URL hash/fragment for a session, and the existing `onAuthStateChange` listener in `useAuth` picks up the `SIGNED_IN` event naturally.

The only new routing complexity is that new OAuth users arrive with a valid session but null role. The existing `ProtectedRoute` is not safe for this state — it currently checks `session` but not whether `role` is null, meaning an OAuth user with no role could reach a protected page or get routed to `/dashboard/null`. The fix is: when `onAuthStateChange` fires with a session and `loadRole()` returns null, redirect to `/auth/select-role` before any protected route is accessed. This requires either a global redirect in `useAuth` or handling it at the route level.

The new `/auth/select-role` page is a standalone auth page that: (a) confirms the user is authenticated, (b) presents the Employer/Seeker card UI from `SignUp.tsx`, (c) inserts a row into `user_roles`, and (d) navigates to the appropriate onboarding wizard.

**Primary recommendation:** Use redirect-based `signInWithOAuth()` (not popup), extend `useAuth` with a `signInWithOAuth` wrapper, add role-null redirect logic in `useAuth` or `ProtectedRoute`, create `/auth/select-role` as a new auth page reusing SignUp card pattern.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.49.4 (already installed) | `signInWithOAuth()`, session management | Supabase's official JS client — no additional install needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | ^0.487.0 (already installed) | Building2, User icons for role cards | Already used in SignUp.tsx for same purpose |
| `react-router` | ^7.5.0 (already installed) | `useNavigate`, new `/auth/select-role` route | Already used throughout auth pages |
| `sonner` | ^2.0.3 (already installed) | Toast for OAuth errors | Already used in Login.tsx and SignUp.tsx |

### No New Packages Required
All libraries needed for this phase are already installed. No `npm install` step needed.

**Installation:**
```bash
# No new packages — all dependencies already present
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── hooks/
│   └── useAuth.ts                    # Add signInWithOAuth(), role-null redirect logic
├── pages/auth/
│   ├── Login.tsx                     # Add OAuth buttons above form
│   ├── SignUp.tsx                    # Add OAuth buttons above form
│   └── SelectRole.tsx                # NEW — role selection for OAuth users
├── components/layout/
│   └── ProtectedRoute.tsx            # Guard against session-with-null-role
└── main.tsx                          # Add /auth/select-role route
```

### Pattern 1: signInWithOAuth Call

**What:** Trigger full-page redirect to provider's consent screen. Supabase handles PKCE, token exchange, and session storage on return.

**When to use:** Both Login.tsx and SignUp.tsx OAuth buttons. Redirect flow (not popup) is standard for SPAs — no CORS issues, works on mobile.

```typescript
// Source: https://supabase.com/docs/reference/javascript/auth-signinwithoauth
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google', // or 'facebook'
  options: {
    redirectTo: `${window.location.origin}/auth/select-role`,
  },
})
if (error) {
  toast.error('Could not connect to Google. Please try again.')
}
// No further code needed — browser redirects to Google immediately
```

**Critical:** The `redirectTo` URL must be added to the Supabase Dashboard allow list (Authentication > URL Configuration > Redirect URLs). The value should be `http://localhost:5173/**` for dev and `https://topfarms.co.nz/**` (or similar) for prod.

**Returning users and redirectTo:** Setting `redirectTo` to `/auth/select-role` means returning OAuth users (who already have a role) will land on `SelectRole`, detect their existing role, and immediately redirect to their dashboard — one extra client-side hop. This is a deliberate tradeoff; do not try to optimize it away with a separate callback route.

### Pattern 2: Session Recovery on Return (Already Handled)

After the provider redirects back, `detectSessionInUrl: true` in `src/lib/supabase.ts` automatically processes the URL hash. The existing `onAuthStateChange` listener in `useAuth` fires with event `SIGNED_IN` and the new session. No additional code needed in the auth callback path — the hook already handles it.

```typescript
// Already in useAuth.ts — no changes needed here for session detection
const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
  setSession(newSession)
  if (newSession?.user) {
    const userRole = await loadRole(newSession.user.id)
    setRole(userRole)
    // If userRole is null here, this is a new OAuth user needing role selection
    // Add redirect logic here or in ProtectedRoute
  }
})
```

### Pattern 3: Role-Null Redirect (THE Critical New Logic)

**What:** When `onAuthStateChange` fires with a session but `loadRole()` returns null, redirect to `/auth/select-role`. This is the core routing fix for new OAuth users.

**Where to implement:** Two valid approaches:
1. In `useAuth` — expose a `needsRoleSelection` boolean derived from `session !== null && role === null && !loading`
2. In `ProtectedRoute` — check `session && !role && !loading` before rendering children, redirect to `/auth/select-role`

Recommended: handle in `ProtectedRoute` to keep `useAuth` stateless. Add a check before the existing role guard:

```typescript
// In ProtectedRoute.tsx — add this block AFTER loading check, BEFORE !session check
if (session && !role && !loading) {
  return <Navigate to="/auth/select-role" replace />
}
```

**Why this location:** `ProtectedRoute` already guards all post-auth routes. Adding the role-null redirect here means all protected routes are safe without changes to individual pages.

### Pattern 4: SelectRole Page

**What:** Standalone auth page that shows the Employer/Seeker card UI, inserts into `user_roles`, then navigates to onboarding.

```typescript
// src/pages/auth/SelectRole.tsx — key logic
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router'

export function SelectRole() {
  const { session } = useAuth()
  const navigate = useNavigate()

  // Redirect if not authenticated (direct URL access without OAuth session)
  if (!session) return <Navigate to="/login" replace />

  const handleRoleSelect = async (role: 'employer' | 'seeker') => {
    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: session.user.id, role })
    if (error) {
      toast.error('Failed to save your role. Please try again.')
      return
    }
    navigate(`/onboarding/${role}`, { replace: true })
  }

  // Render: AuthLayout + Building2/User card pattern from SignUp.tsx
}
```

**Critical timing fix:** After inserting into `user_roles`, `useAuth` still has `role = null` in memory. `onAuthStateChange` does not re-fire from a DB insert — only from session events. If `SelectRole` navigates directly to `/onboarding/employer`, `ProtectedRoute` will see `role !== 'employer'` (because role is still null in React state) and redirect to `/dashboard/null`. See Pattern 6 below for the required `refreshRole()` solution.

### Pattern 5: refreshRole — Required After user_roles Insert (useAuth Extension)

**What:** Expose a `refreshRole()` function from `useAuth` that re-queries `user_roles` and updates the React state. Call it after the `user_roles` insert in `SelectRole`, before navigating to onboarding.

**Why required:** `ProtectedRoute` reads `role` from `useAuth` React state. After `user_roles` insert, state is still null until refreshed. Without this call, onboarding routes reject the user because `requiredRole !== null`.

**Change to useAuth.ts:**
```typescript
// Add to useAuth.ts — inside useAuth function, before return
const refreshRole = async () => {
  if (session?.user) {
    const userRole = await loadRole(session.user.id)
    setRole(userRole)
  }
}
// Add refreshRole to the return object and AuthHookReturn interface
```

**Usage in SelectRole.tsx after insert:**
```typescript
// After successful user_roles insert:
await refreshRole()                                    // sync role into React state
navigate(`/onboarding/${selectedRole}`, { replace: true })  // ProtectedRoute now sees the role
```

### Pattern 6: OAuth Button UI

Follow brand guidelines (locked decision). Use plain `<button>` elements — no third-party OAuth button libraries needed.

```tsx
{/* Google OAuth button — official branding required */}
<button
  type="button"
  onClick={() => handleOAuth('google')}
  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors"
  style={{
    borderColor: 'var(--color-fog)',
    backgroundColor: 'var(--color-white)',
    color: 'var(--color-ink)',
  }}
>
  {/* Google "G" SVG logo — must use official colors per brand guidelines */}
  <svg ...>...</svg>
  Sign in with Google
</button>

{/* OR divider */}
<div className="relative flex items-center gap-3">
  <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-fog)' }} />
  <span className="text-xs" style={{ color: 'var(--color-light)' }}>or</span>
  <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-fog)' }} />
</div>

{/* Facebook OAuth button */}
<button
  type="button"
  onClick={() => handleOAuth('facebook')}
  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors"
  style={{
    backgroundColor: '#1877F2',  // Facebook official blue
    color: '#FFFFFF',
  }}
>
  {/* Facebook "f" SVG logo */}
  <svg ...>...</svg>
  Continue with Facebook
</button>
```

### Anti-Patterns to Avoid
- **Popup flow:** `signInWithOAuth` supports `skipBrowserRedirect: true` + manual `window.open()`, but this creates popup-blocked errors, mobile issues, and cross-origin complexity. Use redirect flow.
- **Storing role in user metadata at OAuth time:** Supabase doesn't know the role during OAuth — metadata tricks won't work. The `/auth/select-role` page is the correct pattern.
- **Handling callback in a dedicated `/auth/callback` route:** Not needed for SPAs using `detectSessionInUrl: true`. Supabase processes the URL hash automatically. Only needed for SSR/server-side flows.
- **Checking `created_at === last_sign_in_at` for "new user" detection:** Unreliable, timezone-sensitive. Use `loadRole()` returning null as the canonical "new OAuth user" signal instead.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth PKCE flow | Custom token exchange | `signInWithOAuth()` | PKCE code verifier, state param, token rotation all handled |
| Session from URL hash | Manual URL parsing after redirect | `detectSessionInUrl: true` (already set) | Supabase handles hash extraction and storage |
| Account linking | Custom "same email" merge logic | Supabase Auth automatic linking | Security edge cases (pre-account takeover) require careful handling |
| Google/Facebook SVG logos | Custom SVG icons | Official brand asset SVGs from Google/Meta | Brand guideline compliance — Google requires exact colors, proportions |

---

## Common Pitfalls

### Pitfall 1: redirectTo Not in Supabase Allow List
**What goes wrong:** OAuth flow completes at provider, but Supabase rejects the redirect back. User sees a Supabase error page or gets silently redirected to Site URL instead of `/auth/select-role`.
**Why it happens:** Supabase validates `redirectTo` against an allow list for security.
**How to avoid:** In Supabase Dashboard > Authentication > URL Configuration > Redirect URLs, add:
- Dev: `http://localhost:5173/**`
- Prod: `https://yourdomain.com/**`
**Warning signs:** OAuth flow redirects to homepage or shows "redirect_uri_mismatch" error.

### Pitfall 2: Provider Callback URL Mismatch
**What goes wrong:** Provider (Google Cloud Console or Facebook Developer) rejects the OAuth callback, showing "redirect_uri_mismatch" or "invalid_client" before the user even reaches Supabase.
**Why it happens:** The `Authorized redirect URIs` in Google Cloud Console / `Valid OAuth Redirect URIs` in Facebook must contain the Supabase project callback URL exactly: `https://<project-ref>.supabase.co/auth/v1/callback`. A single typo causes silent failure.
**How to avoid:** Copy the callback URL directly from the Supabase Dashboard provider page. Verify it appears exactly in the provider console.
**Warning signs:** Error page at provider's domain before returning to your app.

### Pitfall 3: ProtectedRoute Renders /dashboard/null for New OAuth Users
**What goes wrong:** New OAuth user completes OAuth, `onAuthStateChange` fires, `loadRole()` returns null, and the existing route guard `navigate(`/dashboard/${role}`)` produces `/dashboard/null`.
**Why it happens:** `ProtectedRoute` currently only checks `!session` — it does not handle the `session + null role` state that only occurs after OAuth.
**How to avoid:** Add role-null redirect in `ProtectedRoute` before the existing role check. See Pattern 3 above.
**Warning signs:** Browser navigates to `/dashboard/null` after OAuth.

### Pitfall 4: Facebook App in Development Mode Blocks Real Users
**What goes wrong:** Facebook OAuth works for developers/testers but fails for real users with "App Not Live" or "App in Development" errors.
**Why it happens:** Facebook apps start in Development mode — only users with explicit developer/tester roles can authenticate.
**How to avoid:** Before launch, switch the Facebook App to "Live" mode in Meta Developer Console AND complete App Review to confirm `public_profile` and `email` permissions are approved.
**Warning signs:** OAuth works in your own browser but not for others.

### Pitfall 5: Google Unverified App 100-User Cap
**What goes wrong:** Google shows an "unverified app" warning screen, and after 100 unique users authenticate, new users are blocked.
**Why it happens:** Google OAuth apps with `userinfo.email` + `userinfo.profile` + `openid` scopes must pass consent screen verification for production use. The limit is 100 users while unverified.
**How to avoid:** Submit the Google OAuth consent screen for verification (takes several business days to a few weeks). Start the process before launch — verification requires privacy policy URL, app description, and sometimes a video demo.
**Warning signs:** Users see "Google hasn't verified this app" on the consent screen.

### Pitfall 6: Facebook Requires email Permission Explicitly
**What goes wrong:** Facebook OAuth completes but the user record in Supabase has no email — authentication may fail or create an account with empty email.
**Why it happens:** Facebook does not return email by default. It must be explicitly requested via `email` permission scope AND the user must have a confirmed email on their Facebook account.
**How to avoid:** In the `signInWithOAuth` call for Facebook, include `scopes: 'email'`. In Meta Developer Console, verify the `email` permission shows "Ready for testing".
**Warning signs:** User record created in Supabase with blank email field.

### Pitfall 7: SelectRole Page Accessible by Logged-In Users with Existing Role
**What goes wrong:** A returning OAuth user navigates directly to `/auth/select-role` and sees the role selection screen again, potentially creating a duplicate `user_roles` record.
**Why it happens:** The page is public (needs to be accessible without role), so it doesn't get the `ProtectedRoute` guard.
**How to avoid:** Inside `SelectRole.tsx`, check `useAuth()` for an existing role — if role is already set, redirect to `/dashboard/${role}` immediately.
**Warning signs:** Duplicate `user_roles` insert error or user re-selecting their role.

---

## Code Examples

### signInWithOAuth with scopes for Facebook email
```typescript
// Source: https://supabase.com/docs/reference/javascript/auth-signinwithoauth
const signInWithOAuth = async (provider: 'google' | 'facebook') => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/select-role`,
      scopes: provider === 'facebook' ? 'email' : undefined,
    },
  })
  if (error) {
    toast.error(`Could not connect to ${provider === 'google' ? 'Google' : 'Facebook'}. Please try again.`)
  }
  // Browser redirects immediately on success — no further code runs
}
```

### Role-null redirect in ProtectedRoute
```typescript
// In ProtectedRoute.tsx — add after loading spinner, before session check
if (session && !role && !loading) {
  // Session exists but no role = new OAuth user who hasn't selected role yet
  return <Navigate to="/auth/select-role" replace />
}
```

### user_roles insert in SelectRole page (with required refreshRole call)
```typescript
// Source: pattern from existing signUpWithRole in useAuth.ts
// IMPORTANT: refreshRole() must be called before navigate — see Pattern 5
const { error } = await supabase
  .from('user_roles')
  .insert({ user_id: session.user.id, role: selectedRole })
if (error) {
  toast.error('Failed to save your role. Please try again.')
  return
}
await refreshRole()  // sync role into React state before ProtectedRoute evaluates it
navigate(`/onboarding/${selectedRole}`, { replace: true })
```

### Route entry in main.tsx
```typescript
// In createBrowserRouter config — add to public routes section
{
  path: '/auth/select-role',
  element: <SelectRole />,
},
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| OAuth implicit flow (token in URL hash) | PKCE flow via `signInWithOAuth()` | More secure, default since Supabase JS v2 |
| Dedicated `/auth/callback` route for SSR | `detectSessionInUrl: true` for SPAs | SPAs need no callback route — already configured |
| Manual account linking UI | Supabase automatic identity linking by email | No custom UI needed — Supabase handles it |

**Note on `detectSessionInUrl`:** Already set to `true` in `src/lib/supabase.ts`. This is the correct setting for SPA OAuth. No changes needed there.

---

## External Setup Steps (Developer Action Required, Not Code)

These cannot be automated — a developer must complete them before testing OAuth:

### Supabase Dashboard
1. **Enable Google provider:** Authentication > Providers > Google — toggle on, enter Client ID + Secret
2. **Enable Facebook provider:** Authentication > Providers > Facebook — toggle on, enter App ID + Secret
3. **Add redirect URL:** Authentication > URL Configuration > Redirect URLs — add `http://localhost:5173/**` (dev) and production URL

### Google Cloud Console
1. Create OAuth 2.0 Client ID at console.cloud.google.com
2. Application type: Web application
3. Authorized JavaScript origins: `http://localhost:5173` and production domain
4. Authorized redirect URIs: copy from Supabase Dashboard Google provider page (format: `https://<ref>.supabase.co/auth/v1/callback`)
5. Configure OAuth consent screen: add `openid`, `userinfo.email`, `userinfo.profile` scopes
6. **Submit for verification** (required before real users — 100 user cap while unverified)

### Meta Developer Console (Facebook)
1. Create app at developers.facebook.com > My Apps > Create App
2. Add Facebook Login product
3. Valid OAuth Redirect URIs: copy from Supabase Dashboard Facebook provider page
4. Ensure `email` permission is enabled (Use Cases > Authentication and Account Creation)
5. **Switch to Live mode** before launch (Development mode = developer-only access)

---

## Open Questions

1. **Account linking config toggle**
   - What we know: Supabase Auth automatically links identities with the same verified email — no code required
   - What's unclear: Whether this is on by default or requires a Dashboard toggle — official docs mention "automatic linking" without specifying a config location
   - Recommendation: Verify in Supabase Dashboard > Authentication > Settings — look for "Allow linking" or identity linking toggle. If not found, treat as automatic and test empirically.

2. **Facebook OAuth on localhost**
   - What we know: Facebook allows HTTP for localhost in Development mode
   - What's unclear: Exact port (5173 for Vite) — whether `http://localhost:5173` works or if HTTPS proxy is needed
   - Recommendation: Test directly; if blocked, use ngrok as fallback for local Facebook testing.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.1.1 + @testing-library/react 16.3.0 |
| Config file | `vitest.config.ts` — `include: ['tests/**/*.test.{ts,tsx}']` |
| Quick run command | `npx vitest run tests/oauth-buttons.test.tsx` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-06 | Google OAuth button renders on Login page | unit | `npx vitest run tests/oauth-buttons.test.tsx` | ❌ Wave 0 |
| AUTH-06 | Google OAuth button renders on SignUp page | unit | `npx vitest run tests/oauth-buttons.test.tsx` | ❌ Wave 0 |
| AUTH-06 | Google button click calls `signInWithOAuth({ provider: 'google' })` | unit | `npx vitest run tests/oauth-buttons.test.tsx` | ❌ Wave 0 |
| AUTH-07 | Facebook OAuth button renders on Login and SignUp | unit | `npx vitest run tests/oauth-buttons.test.tsx` | ❌ Wave 0 |
| AUTH-07 | Facebook button click calls `signInWithOAuth({ provider: 'facebook' })` | unit | `npx vitest run tests/oauth-buttons.test.tsx` | ❌ Wave 0 |
| AUTH-08 | SelectRole page renders Employer and Seeker cards | unit | `npx vitest run tests/select-role.test.tsx` | ❌ Wave 0 |
| AUTH-08 | SelectRole page redirects to /login if no session | unit | `npx vitest run tests/select-role.test.tsx` | ❌ Wave 0 |
| AUTH-08 | SelectRole page redirects to /dashboard if role already set | unit | `npx vitest run tests/select-role.test.tsx` | ❌ Wave 0 |
| AUTH-08 | Role card click calls supabase insert + navigates to onboarding | unit | `npx vitest run tests/select-role.test.tsx` | ❌ Wave 0 |
| AUTH-08 | ProtectedRoute redirects session+null-role to /auth/select-role | unit | `npx vitest run tests/protected-route-oauth.test.tsx` | ❌ Wave 0 |
| AUTH-06/07 | Full OAuth redirect → provider → return → role selection flow | manual only | — | N/A — requires live provider |
| AUTH-08 | Returning OAuth user with existing role skips role selection | manual only | — | N/A — requires real Supabase session |

**Manual-only justification:** The OAuth provider redirect flow requires real network calls to Google/Facebook consent screens. These cannot be meaningfully unit tested without a live Supabase instance and provider credentials — integration testing is environment-specific.

### Sampling Rate
- **Per task commit:** `npx vitest run tests/oauth-buttons.test.tsx tests/select-role.test.tsx tests/protected-route-oauth.test.tsx`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/oauth-buttons.test.tsx` — covers AUTH-06, AUTH-07 (button render + click behavior)
- [ ] `tests/select-role.test.tsx` — covers AUTH-08 (SelectRole page behavior)
- [ ] `tests/protected-route-oauth.test.tsx` — covers AUTH-08 (ProtectedRoute role-null redirect)

*(Existing `tests/setup.ts` and `tests/signup-role-preselect.test.tsx` patterns are directly reusable as templates — both mock `@/hooks/useAuth` and `@/lib/supabase` in the same way needed here.)*

---

## Sources

### Primary (HIGH confidence)
- [https://supabase.com/docs/guides/auth/social-login/auth-google](https://supabase.com/docs/guides/auth/social-login/auth-google) — Google provider setup, scopes, redirect URL config, consent screen verification requirement
- [https://supabase.com/docs/guides/auth/social-login/auth-facebook](https://supabase.com/docs/guides/auth/social-login/auth-facebook) — Facebook provider setup, email permission, Dev vs Live mode
- [https://supabase.com/docs/guides/auth/redirect-urls](https://supabase.com/docs/guides/auth/redirect-urls) — Allow list configuration, wildcard patterns
- [https://supabase.com/docs/guides/auth/auth-identity-linking](https://supabase.com/docs/guides/auth/auth-identity-linking) — Automatic email-based identity linking behavior
- `src/lib/supabase.ts` — confirms `detectSessionInUrl: true` already set
- `src/hooks/useAuth.ts` — confirms `loadRole()` pattern, `onAuthStateChange` handler
- `src/components/layout/ProtectedRoute.tsx` — confirms role-null gap

### Secondary (MEDIUM confidence)
- [https://supabase.com/docs/reference/javascript/auth-signinwithoauth](https://supabase.com/docs/reference/javascript/auth-signinwithoauth) — method signature (page content partially fetched, cross-verified with community examples)
- Google Cloud Console docs — 100 test user cap for unverified apps (verified via multiple Google support pages)

### Tertiary (LOW confidence — for validation)
- Facebook HTTP localhost allowance in development mode — confirmed across multiple community sources but not from official Meta docs directly

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, Supabase method is well-documented
- Architecture: HIGH — patterns derived directly from existing codebase + official Supabase docs
- Pitfalls: HIGH — provider setup pitfalls verified against official docs; role-null routing issue confirmed by reading actual ProtectedRoute code
- External setup steps: MEDIUM — Supabase Dashboard UI labels assumed from docs descriptions, may differ slightly

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (Supabase JS v2 stable; Google/Facebook developer console UIs may update)
