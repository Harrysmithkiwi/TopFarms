---
phase: 21-v20-close-post-launch-ops
plan: 05
type: execute
wave: 3
depends_on: [00]
files_modified:
  - src/pages/auth/Suspended.tsx
  - src/main.tsx
  - tests/suspended-page.test.tsx
autonomous: true
requirements:
  - SUSPENDED-PAGE-01
  - SUSPENDED-ROUTE-01
must_haves:
  truths:
    - "Visiting /suspended (with or without session) renders the SuspendedPage component"
    - "Suspended page is OUTSIDE the ProtectedRoute wrapper (otherwise infinite redirect loop)"
    - "Page renders the locked message: 'Your account has been suspended. If you think this is an error, contact hello@topfarms.co.nz.'"
    - "Sign Out button on the page calls supabase.auth.signOut() and routes to /login"
    - "Page renders no nav into authenticated app surfaces"
  artifacts:
    - path: "src/pages/auth/Suspended.tsx"
      provides: "Suspended gate page component"
      contains: "Your account has been suspended"
    - path: "src/main.tsx"
      provides: "/suspended route registration (unauthenticated-accessible)"
      contains: "/suspended"
  key_links:
    - from: "src/main.tsx"
      to: "src/pages/auth/Suspended.tsx"
      via: "{ path: '/suspended', element: <Suspended /> }"
      pattern: "/suspended.*Suspended"
    - from: "src/components/layout/ProtectedRoute.tsx (plan 21-04)"
      to: "/suspended route"
      via: "<Navigate to='/suspended' replace />"
      pattern: "/suspended"
---

<objective>
Wave 3 — Create the `SuspendedPage` component at `src/pages/auth/Suspended.tsx` and register the `/suspended` route at the top of `main.tsx` (alongside `/login`, `/signup` — unauthenticated-accessible). Locked message wording per CONTEXT.md. Flip Wave 0 stubs GREEN.

Purpose: The redirect target for the new isActive=false guard in plan 21-04. Without this route registered, suspended users get a blank screen instead of a clear gate message.

Output: One new page component (~40 lines, AuthLayout-style shell), one route entry in main.tsx, 4 GREEN assertions in suspended-page.test.tsx.
</objective>

<execution_context>
@/Users/harrysmith/.claude/get-shit-done/workflows/execute-plan.md
@/Users/harrysmith/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/21-v20-close-post-launch-ops/21-CONTEXT.md
@.planning/phases/21-v20-close-post-launch-ops/21-RESEARCH.md
@CLAUDE.md

<!--
LOCKED DECISION: /suspended route — unauthenticated-accessible (CONTEXT.md "is_active blocking" — user has session but is blocked from dashboards; route NOT wrapped in ProtectedRoute)
LOCKED DECISION: Message wording — "Your account has been suspended. If you think this is an error, contact hello@topfarms.co.nz." (CONTEXT.md — VERBATIM)
LOCKED DECISION: Simple page consistent with existing auth pages (CONTEXT.md — like /login shell)
LOCKED DECISION: NO links into the app (CONTEXT.md — full gate, no escape hatch except Sign Out)
RESEARCH §Pattern 5: Use AuthLayout component if it exists (it does — src/components/layout/AuthLayout.tsx)
-->

<interfaces>
From src/components/layout/AuthLayout.tsx (existing — Phase 19 v2 brand):
```typescript
interface AuthLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}
export function AuthLayout({ children, title, subtitle }: AuthLayoutProps): JSX.Element
```
Renders: 2-panel split (left = brand panel, right = centered form area with optional title/subtitle).

From src/pages/auth/Login.tsx (model — uses AuthLayout with title + subtitle). Same component path convention.

From src/main.tsx (current — line 41-69 = public/auth routes):
- `{ path: '/login', element: <Login /> }` etc. — unauthenticated routes are bare element with no ProtectedRoute wrapper.

From src/components/ui/Button.tsx — variants include 'primary' | 'secondary' | 'ghost' (verify via Read if needed).

From src/contexts/AuthContext.tsx — `signOut()` mutation exposed via `useAuth()`.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create SuspendedPage component + register /suspended route</name>
  <files>src/pages/auth/Suspended.tsx, src/main.tsx</files>

  <read_first>
    - src/components/layout/AuthLayout.tsx (shell pattern — title + subtitle props)
    - src/pages/auth/Login.tsx (consumer example — AuthLayout usage + Button composition)
    - src/main.tsx (route registration patterns — public routes at lines 41-69; admin routes at 215+)
    - src/contexts/AuthContext.tsx (signOut signature — returns Promise<void>)
    - .planning/phases/21-v20-close-post-launch-ops/21-CONTEXT.md (exact gate message wording — must match verbatim)
  </read_first>

  <behavior>
    - Component is a default React function component exported as `Suspended` (matches Login/SignUp naming)
    - Renders AuthLayout with title="Account suspended" and subtitle=undefined (single message — title carries weight)
    - Body contains the verbatim message: "Your account has been suspended. If you think this is an error, contact hello@topfarms.co.nz."
    - The `hello@topfarms.co.nz` portion is an anchor `<a href="mailto:hello@topfarms.co.nz">` for clickability
    - Sign Out button below the message calls `signOut()` from useAuth then navigates to `/login` via useNavigate
    - On Sign Out failure: shows toast.error (sonner already in project; matches Login pattern)
    - Page has NO nav into authenticated surfaces — no links to /dashboard/*, /admin, /jobs/new, etc.
    - Route `/suspended` registered in main.tsx ALONGSIDE /login, OUTSIDE any ProtectedRoute wrapper
  </behavior>

  <action>
**File 1 — src/pages/auth/Suspended.tsx** (new file):

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

/**
 * Phase 21 Track B — gate page for suspended users.
 *
 * Routed at /suspended (registered in main.tsx OUTSIDE ProtectedRoute). The redirect
 * target for ProtectedRoute's isActive=false guard (Phase 21 plan 21-04). Without
 * this page, a suspended user navigating into a dashboard would loop on the
 * ProtectedRoute redirect.
 *
 * Locked message per Phase 21 CONTEXT.md "Gate page message" decision. NO links
 * into authenticated app surfaces — only Sign Out (clears the session so user can
 * sign back in if reactivated by admin via ProfileDrawer).
 */
export function Suspended() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (err) {
      console.error('[Suspended] signOut failed', err)
      toast.error('Sign out failed — please refresh the page.')
      setSigningOut(false)
    }
  }

  return (
    <AuthLayout title="Account suspended">
      <div className="space-y-6">
        <p className="text-base" style={{ color: 'var(--color-text-muted)' }}>
          Your account has been suspended. If you think this is an error, contact{' '}
          <a
            href="mailto:hello@topfarms.co.nz"
            className="underline"
            style={{ color: 'var(--color-brand-900)' }}
          >
            hello@topfarms.co.nz
          </a>
          .
        </p>

        <Button
          type="button"
          variant="primary"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </Button>
      </div>
    </AuthLayout>
  )
}
```

If Button.tsx variant union does NOT include 'primary' (Phase 19/19b brand migration may have renamed; verify via `grep -E "variant.*'(primary|brand)'" src/components/ui/Button.tsx`), use the closest brand variant. Acceptable variants from project precedent: 'primary' (most likely), 'brand', or default. Pick what Login.tsx uses for its submit button — exact same Button variant.

**File 2 — src/main.tsx**:

Edit 1: Add the import alongside other auth page imports (after line 14 `import { SelectRole }`):
```typescript
import { Suspended } from '@/pages/auth/Suspended'
```

Edit 2: Register the route. Add AFTER the `/auth/select-role` route (line 67-69), BEFORE the `// ─── Jobs ──` section. Insert:
```typescript
  {
    // Phase 21 Track B — gate page for suspended users (isActive=false). MUST NOT
    // be wrapped in ProtectedRoute; user has a session but is blocked from
    // dashboards by ProtectedRoute's isActive guard, which redirects HERE.
    // Wrapping would cause infinite redirect.
    path: '/suspended',
    element: <Suspended />,
  },
```

DO NOT modify:
- The AdminGate routing at line 222-224 (Phase 20.1 hybrid pattern — separate concern)
- Any of the existing ProtectedRoute-wrapped routes
- The router top-level structure
  </action>

  <verify>
    <automated>grep -n "/suspended" src/main.tsx; grep -c "Your account has been suspended" src/pages/auth/Suspended.tsx</automated>
  </verify>

  <acceptance_criteria>
    - `ls src/pages/auth/Suspended.tsx` exits 0
    - `grep -c "Your account has been suspended" src/pages/auth/Suspended.tsx` returns 1
    - `grep -c "hello@topfarms.co.nz" src/pages/auth/Suspended.tsx` returns ≥ 2 (anchor href + display text)
    - `grep -c "signOut" src/pages/auth/Suspended.tsx` returns ≥ 2 (import + handler)
    - `grep -c "navigate('/login'" src/pages/auth/Suspended.tsx` returns 1
    - `grep -c "/suspended" src/main.tsx` returns 1 (route registration)
    - `grep -c "Suspended" src/main.tsx` returns ≥ 2 (import + element)
    - `/suspended` route in main.tsx is NOT inside any ProtectedRoute element: `grep -B1 -A4 "path: '/suspended'" src/main.tsx | grep -c "ProtectedRoute"` returns 0
    - Page does NOT link to /dashboard/* or /admin: `grep -E "(/dashboard|/admin|/jobs|/onboarding)" src/pages/auth/Suspended.tsx` returns nothing
    - `pnpm exec tsc -b` exits 0 OR only pre-existing Phase 18.1-02 errors
  </acceptance_criteria>

  <done>
    SuspendedPage exists; /suspended route registered outside ProtectedRoute. Ready for tests in Task 2.
  </done>
</task>

<task type="auto">
  <name>Task 2: Flip suspended-page.test.tsx stubs to GREEN</name>
  <files>tests/suspended-page.test.tsx</files>

  <read_first>
    - tests/suspended-page.test.tsx (Wave 0 stubs)
    - src/pages/auth/Suspended.tsx (Task 1)
    - tests/admin-login.test.tsx (canonical RTL render + button click + signOut mock pattern)
  </read_first>

  <action>
**File — tests/suspended-page.test.tsx** (flip 4 .todos to assertions):

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { Suspended } from '@/pages/auth/Suspended'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

const signOutMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    session: { user: { id: 's1' } },
    role: 'seeker',
    isActive: false,
    loading: false,
    signUpWithRole: vi.fn(),
    signIn: vi.fn(),
    signOut: signOutMock,
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    refreshRole: vi.fn(),
  }),
}))

describe('SuspendedPage (Phase 21 Wave 3)', () => {
  it('renders "Your account has been suspended" message verbatim', () => {
    render(
      <MemoryRouter initialEntries={['/suspended']}>
        <Suspended />
      </MemoryRouter>,
    )
    expect(screen.getByText(/Your account has been suspended/)).toBeInTheDocument()
  })

  it('renders hello@topfarms.co.nz as a mailto link', () => {
    render(
      <MemoryRouter initialEntries={['/suspended']}>
        <Suspended />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: /hello@topfarms.co.nz/i })
    expect(link).toHaveAttribute('href', 'mailto:hello@topfarms.co.nz')
  })

  it('renders Sign out button that calls signOut and navigates to /login', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()
    render(
      <MemoryRouter initialEntries={['/suspended']}>
        <Suspended />
      </MemoryRouter>,
    )
    const button = screen.getByRole('button', { name: /sign out/i })
    expect(button).toBeInTheDocument()
    await user.click(button)
    await waitFor(() => expect(signOutMock).toHaveBeenCalledTimes(1))
  })

  it('does NOT render any links into authenticated app surfaces', () => {
    render(
      <MemoryRouter initialEntries={['/suspended']}>
        <Suspended />
      </MemoryRouter>,
    )
    // No anchor to /dashboard/*, /admin, /jobs/new, /onboarding/*
    const links = screen.queryAllByRole('link')
    for (const link of links) {
      const href = link.getAttribute('href') ?? ''
      expect(href).not.toMatch(/^\/(dashboard|admin|jobs|onboarding)/)
    }
  })
})
```

If `@testing-library/user-event` is not installed, fall back to `fireEvent.click(button)` from `@testing-library/react` — verify via `grep "user-event" package.json` first. (Project has been using fireEvent elsewhere — check tests/admin-login.test.tsx for precedent.)

Run `pnpm exec vitest run tests/suspended-page.test.tsx` — expect 4 GREEN assertions.
  </action>

  <verify>
    <automated>pnpm exec vitest run tests/suspended-page.test.tsx --reporter=verbose</automated>
  </verify>

  <acceptance_criteria>
    - `pnpm exec vitest run tests/suspended-page.test.tsx` exits 0
    - Test summary shows 4 passing
    - `grep -c "it.todo" tests/suspended-page.test.tsx` returns 0 (all flipped)
    - Full suite: `pnpm exec vitest run` exits 0; no regressions
  </acceptance_criteria>

  <done>
    SuspendedPage tests GREEN. Atomic commit per CLAUDE §4 with Task 1.
  </done>
</task>

</tasks>

<verification>
1. SuspendedPage component on disk
2. /suspended route registered OUTSIDE ProtectedRoute (verified via grep)
3. 4 GREEN assertions for the page
4. Full vitest suite green; tsc clean
5. Locked message + email contact + signOut button all present
</verification>

<success_criteria>
- /suspended route lands at SuspendedPage with the verbatim CONTEXT.md message
- No nav into authenticated surfaces (link-attribute negative assertion GREEN)
- Sign Out button clears session and routes to /login
- Atomic commit: `feat(21-05): /suspended gate page + route (Track B)`
</success_criteria>

<output>
After completion, create `.planning/phases/21-v20-close-post-launch-ops/21-05-SUMMARY.md` capturing:
- Suspended.tsx line count + AuthLayout shell confirmation
- main.tsx route registration line number
- Test flip count (4 todos → 4 assertions)
- Verbatim-message confirmation
- Pointer back to plan 21-04 (the redirect source) and forward to Wave 6 plan 21-09 (operator UAT — suspended-flow smoke test)
</output>
