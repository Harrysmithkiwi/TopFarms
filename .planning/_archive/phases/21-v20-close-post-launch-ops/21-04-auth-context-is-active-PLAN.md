---
phase: 21-v20-close-post-launch-ops
plan: 04
type: execute
wave: 3
depends_on: [00]
files_modified:
  - src/contexts/AuthContext.tsx
  - src/components/layout/ProtectedRoute.tsx
  - tests/loadRole-isActive.test.ts
  - tests/protected-route-suspended.test.tsx
autonomous: true
requirements:
  - IS-ACTIVE-01
  - IS-ACTIVE-02
  - IS-ACTIVE-03
must_haves:
  truths:
    - "AuthContext.loadRole queries user_roles.is_active alongside role in a SINGLE round-trip"
    - "AuthHookReturn interface exposes isActive: boolean"
    - "Suspended user (isActive=false) hitting ANY ProtectedRoute is redirected to /suspended"
    - "isActive=true on DB error/null (no false-positive suspension; RESEARCH §Pattern 1)"
    - "isActive guard fires AFTER the role-null spinner guard (Pitfall 1 — order matters; no /suspended flash)"
    - "refreshRole co-updates isActive (Pitfall 5)"
  artifacts:
    - path: "src/contexts/AuthContext.tsx"
      provides: "loadRole returns { role, isActive }; AuthProvider holds isActive state"
      contains: "is_active"
    - path: "src/components/layout/ProtectedRoute.tsx"
      provides: "isActive === false → /suspended redirect"
      contains: "/suspended"
  key_links:
    - from: "src/components/layout/ProtectedRoute.tsx"
      to: "/suspended route in src/main.tsx (Wave 3 plan 21-05)"
      via: "<Navigate to=\"/suspended\" replace />"
      pattern: "/suspended"
    - from: "src/contexts/AuthContext.tsx loadRole"
      to: "public.user_roles.is_active column (migration 023 — already shipped)"
      via: "select('role, is_active')"
      pattern: "select\\('role, is_active'\\)"
---

<objective>
Wave 3 — Extend `AuthContext.loadRole` to fetch `is_active` alongside `role` in a single user_roles query. Propagate via the existing `LoadRoleOutcome` type and `AuthHookReturn`. Add `isActive === false → /suspended` redirect in `ProtectedRoute` at the correct position in the guard chain (AFTER the AUTH-FIX-02 role-null spinner; BEFORE the role-mismatch redirect). Flip Wave 0 stubs GREEN.

Purpose: Suspended users (admin flipped `is_active=false` via existing ProfileDrawer toggle from Phase 20) should hit a clear gate page instead of seeing a broken dashboard. Pure client-side enforcement — the `admin_set_user_active` RPC and the column already exist (migration 023). Only the client-side gate is missing.

Output: Pure TypeScript change in 2 source files; 2 test files flipped from .todo to assertions; full vitest suite green; tsc clean.
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
LOCKED DECISION: Enforcement layer = ProtectedRoute (CONTEXT.md "is_active blocking" — not middleware)
LOCKED DECISION: Full gate — no partial views (CONTEXT.md)
LOCKED DECISION: Gate route = /suspended (CONTEXT.md; route added in sibling Wave 3 plan 21-05)
RESEARCH §Pattern 1: loadRole returns { role: UserRole | null; isActive: boolean }; isActive defaults TRUE on error
RESEARCH §Pitfall 1: isActive check MUST be AFTER the role-null spinner guard
RESEARCH §Pitfall 5: refreshRole MUST co-update isActive
-->

<interfaces>
From src/contexts/AuthContext.tsx (current):
```typescript
export interface AuthHookReturn {
  session: Session | null
  role: UserRole | null
  loading: boolean
  signUpWithRole, signIn, signOut, resetPassword, updatePassword, signInWithOAuth,
  refreshRole: () => Promise<UserRole | null>
}
async function loadRole(userId: string): Promise<UserRole | null>
type LoadRoleOutcome =
  | { ok: true; role: UserRole | null }
  | { ok: false; reason: 'timeout' }
async function loadRoleWithTimeout(userId): Promise<LoadRoleOutcome>
```

From src/components/layout/ProtectedRoute.tsx (current guard chain — by line):
- L14-28: if (loading) return spinner
- L30-32: if (!session) return Navigate to /login
- L42-56: if (requiredRole && role === null) return spinner (AUTH-FIX-02 guard)
- L58-61: if (!role) return Navigate to /auth/select-role
- L63-66: if (requiredRole && role !== requiredRole) return Navigate to dashboardPathFor(role)
- L68: return children

From public.user_roles (migration 023): is_active boolean NOT NULL DEFAULT true (already shipped — no DB migration needed)

From src/hooks/useAuth.ts (consumer):
- Re-exports useAuth from AuthContext via `export { useAuth } from '@/contexts/AuthContext'`
- Confirm path: `cat src/hooks/useAuth.ts` first
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Extend AuthContext loadRole + AuthHookReturn with isActive; update refreshRole</name>
  <files>src/contexts/AuthContext.tsx</files>

  <read_first>
    - src/contexts/AuthContext.tsx (entire file — current loadRole at 30-42, LoadRoleOutcome at 50-52, AuthProvider at 73+, refreshRole at 209-216)
    - .planning/phases/21-v20-close-post-launch-ops/21-RESEARCH.md §Pattern 1 (exact loadRole + LoadRoleOutcome shape) + §Pitfall 5 (refreshRole co-update)
  </read_first>

  <behavior>
    - loadRole returns Promise<{ role: UserRole | null; isActive: boolean }>
    - LoadRoleOutcome ok-true variant: { ok: true; role: UserRole | null; isActive: boolean }
    - AuthHookReturn gains isActive: boolean
    - AuthProvider holds isActive useState initialised to TRUE (Pitfall 1 — no false-positive flash)
    - On loadRole error or null data: returns isActive=true (defence per RESEARCH §Pattern 1)
    - refreshRole sets both setRole and setIsActive
    - signOut resets isActive back to true
    - Single round-trip: select('role, is_active') — no second query
  </behavior>

  <action>
**File — src/contexts/AuthContext.tsx**:

Edit 1: Replace `loadRole` function (lines 30-42) to fetch both columns + return both values. Keep the AUTH-FIX-02 console.time instrumentation:

```typescript
async function loadRole(
  userId: string
): Promise<{ role: UserRole | null; isActive: boolean }> {
  // [AUTH-FIX-02] Timing instrumentation — Phase 18.2 SC-7 diagnostic.
  // Remove once root cause confirmed or fix landed.
  console.time('[AUTH-FIX-02] loadRole:db-query')
  const { data, error } = await supabase
    .from('user_roles')
    .select('role, is_active')
    .eq('user_id', userId)
    .single()
  console.timeEnd('[AUTH-FIX-02] loadRole:db-query')
  // RESEARCH §Pattern 1: default isActive=true on error/null so a transient
  // failure does NOT incorrectly block a valid user. Only an explicit DB
  // is_active=false marks the user as suspended.
  if (error || !data) return { role: null, isActive: true }
  return {
    role: data.role as UserRole,
    isActive: data.is_active ?? true,
  }
}
```

Edit 2: Extend `LoadRoleOutcome` (lines 50-52) to carry isActive:

```typescript
type LoadRoleOutcome =
  | { ok: true; role: UserRole | null; isActive: boolean }
  | { ok: false; reason: 'timeout' }
```

Edit 3: Update `loadRoleWithTimeout` (lines 59-69) so the resolve shape matches:

```typescript
async function loadRoleWithTimeout(userId: string): Promise<LoadRoleOutcome> {
  return Promise.race<LoadRoleOutcome>([
    loadRole(userId).then(({ role, isActive }) => ({ ok: true, role, isActive })),
    new Promise<LoadRoleOutcome>((resolve) =>
      setTimeout(() => {
        console.warn('[useAuth] loadRole timeout after 3s, keeping previous role')
        resolve({ ok: false, reason: 'timeout' })
      }, 3000),
    ),
  ])
}
```

Edit 4: Extend `AuthHookReturn` interface (line 6-28) — add `isActive: boolean`:

```typescript
export interface AuthHookReturn {
  session: Session | null
  role: UserRole | null
  isActive: boolean
  loading: boolean
  // ...existing mutations unchanged...
  refreshRole: () => Promise<UserRole | null>
}
```

Edit 5: In AuthProvider (line 73+), add state and propagate:

After `const [role, setRole] = useState<UserRole | null>(null)` (line 75) add:
```typescript
// Pitfall 1: initialise true — never flash /suspended during loadRole resolution.
const [isActive, setIsActive] = useState<boolean>(true)
```

In the getSession `.then` handler (line 82-91), update the result handling:
```typescript
.then(async ({ data: { session: initialSession } }) => {
  setSession(initialSession)
  if (initialSession?.user) {
    const result = await loadRoleWithTimeout(initialSession.user.id)
    if (result.ok) {
      setRole(result.role)
      setIsActive(result.isActive)
    }
    // else: timeout — leave role + isActive at their initial values.
  }
  setLoading(false)
})
```

In onAuthStateChange handler (line 101-125), inside the `if (result.ok)` branch (line 118), add:
```typescript
if (result.ok) {
  setRole(result.role)
  setIsActive(result.isActive)
}
```

In the `!newSession?.user` branch (line 104-106), reset isActive too:
```typescript
if (!newSession?.user) {
  setRole(null)
  setIsActive(true)  // Pitfall 1 — keep default-true semantics on sign-out
}
```

Edit 6: In `signOut` (line 182-186), reset isActive:
```typescript
const signOut: AuthHookReturn['signOut'] = async () => {
  await supabase.auth.signOut()
  setSession(null)
  setRole(null)
  setIsActive(true)
}
```

Edit 7: In `refreshRole` (line 209-216), co-update isActive per Pitfall 5:
```typescript
const refreshRole: AuthHookReturn['refreshRole'] = async () => {
  if (session?.user) {
    const { role: userRole, isActive: userIsActive } = await loadRole(session.user.id)
    setRole(userRole)
    setIsActive(userIsActive)
    return userRole
  }
  return null
}
```

Edit 8: In the `value` object (line 218-229), include isActive:
```typescript
const value: AuthHookReturn = {
  session,
  role,
  isActive,
  loading,
  signUpWithRole,
  signIn,
  signOut,
  resetPassword,
  updatePassword,
  signInWithOAuth,
  refreshRole,
}
```

DO NOT touch:
- Anything outside these specific edits
- The console.time instrumentation (Phase 18.2 SC-7 carryforward)
- The signUpWithRole defensive backfill (lines 132-176)

Run `pnpm exec tsc -b` — must exit 0 OR only show pre-existing errors documented in Phase 18.1-02 STATE. The isActive addition will surface a TS error at any consumer that destructures useAuth() into a typed shape WITHOUT isActive — fix only if the consumer is in the test fixtures we touch in Task 3 (mockAuth helper); otherwise out-of-scope.
  </action>

  <verify>
    <automated>grep -c "isActive" src/contexts/AuthContext.tsx</automated>
  </verify>

  <acceptance_criteria>
    - `grep -cE "isActive: boolean" src/contexts/AuthContext.tsx` returns ≥ 2 (interface + LoadRoleOutcome)
    - `grep -c "select('role, is_active')" src/contexts/AuthContext.tsx` returns 1 (single query)
    - `grep -c "setIsActive" src/contexts/AuthContext.tsx` returns ≥ 4 (init, onAuthStateChange, signOut, refreshRole)
    - `grep -c "useState<boolean>(true)" src/contexts/AuthContext.tsx` returns 1 (default-true per Pitfall 1)
    - `grep -c "data.is_active ?? true" src/contexts/AuthContext.tsx` returns 1 (default-true on null per Pattern 1)
    - File does NOT have a second `from('user_roles')` call (single round-trip enforced)
    - `pnpm exec tsc -b` exits 0 OR only pre-existing Phase 18.1-02 errors surfaced
  </acceptance_criteria>

  <done>
    AuthContext extended; isActive flows through state; refreshRole + signOut co-update. Ready for ProtectedRoute consumer in Task 2.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Add isActive → /suspended redirect in ProtectedRoute</name>
  <files>src/components/layout/ProtectedRoute.tsx</files>

  <read_first>
    - src/components/layout/ProtectedRoute.tsx (entire file — 70 lines)
    - .planning/phases/21-v20-close-post-launch-ops/21-RESEARCH.md §Pitfall 1 (exact guard chain order — 6 steps; isActive between step 3 spinner and step 5 select-role redirect)
  </read_first>

  <behavior>
    - Guard order MUST be:
      1. if (loading) → spinner
      2. if (!session) → /login
      3. if (requiredRole && role === null) → spinner (AUTH-FIX-02 guard, unchanged)
      4. if (isActive === false) → /suspended  ← NEW
      5. if (!role) → /auth/select-role
      6. if (requiredRole && role !== requiredRole) → dashboardPathFor(role)
    - The isActive check fires only after the spinner guards have resolved → no false-positive /suspended flash for users whose loadRole is still resolving
    - When isActive is true (default), the new guard is a no-op → existing routes unchanged
  </behavior>

  <action>
**File — src/components/layout/ProtectedRoute.tsx**:

Edit 1: Update the destructure in `useAuth()` (line 12):
```typescript
const { session, role, isActive, loading } = useAuth()
```

Edit 2: Add the isActive guard AFTER the AUTH-FIX-02 spinner (current line 56) and BEFORE the `!role` redirect (current line 59). Insert:

```typescript
  // Phase 21 IS-ACTIVE-01: suspended user (admin flipped is_active=false via
  // ProfileDrawer) is gated to /suspended. This check sits AFTER the AUTH-FIX-02
  // role-null spinner (Pitfall 1 — checking before would flash /suspended for
  // users whose loadRole is still resolving). The /suspended route itself is
  // unprotected (Wave 3 plan 21-05) so a session user can land there.
  if (isActive === false) {
    return <Navigate to="/suspended" replace />
  }
```

Final guard chain (post-edit):
```typescript
if (loading) return spinner;
if (!session) return <Navigate to="/login" replace />;
if (requiredRole && role === null) return spinner;  // AUTH-FIX-02
if (isActive === false) return <Navigate to="/suspended" replace />;  // NEW
if (!role) return <Navigate to="/auth/select-role" replace />;
if (requiredRole && role !== requiredRole) {
  const dest = dashboardPathFor(role);
  return <Navigate to={dest} replace />;
}
return <>{children}</>;
```

DO NOT modify:
- The spinner JSX (line 14-28, 42-55) — keep byte-frozen
- The AUTH-FIX-02 comment block (line 34-41) — load-bearing context for the role-null spinner
- The dashboardPathFor import or call (Phase 20.1 STATE precedent)

After save: `pnpm exec tsc -b` must exit 0 OR only show pre-existing Phase 18.1-02 errors.
  </action>

  <verify>
    <automated>grep -n "isActive === false" src/components/layout/ProtectedRoute.tsx</automated>
  </verify>

  <acceptance_criteria>
    - `grep -c "isActive" src/components/layout/ProtectedRoute.tsx` returns ≥ 2 (destructure + check)
    - `grep -c "/suspended" src/components/layout/ProtectedRoute.tsx` returns 1 (redirect target)
    - `grep -nE "isActive === false" src/components/layout/ProtectedRoute.tsx` shows a line number AFTER the AUTH-FIX-02 spinner (line number > line of `requiredRole && role === null`) and BEFORE the `!role` redirect line
    - Order check via awk/grep: `grep -nE "requiredRole && role === null|isActive === false|!role" src/components/layout/ProtectedRoute.tsx` shows order: requiredRole-role-null first, then isActive, then !role
    - `pnpm exec tsc -b` exits 0 OR only pre-existing errors
  </acceptance_criteria>

  <done>
    ProtectedRoute has 6-step guard chain with isActive at position 4. Ready for tests to flip GREEN in Task 3.
  </done>
</task>

<task type="auto">
  <name>Task 3: Flip Wave 0 IS-ACTIVE-* test stubs to GREEN</name>
  <files>tests/loadRole-isActive.test.ts, tests/protected-route-suspended.test.tsx</files>

  <read_first>
    - tests/loadRole-isActive.test.ts (Wave 0 — IS-ACTIVE-02/03 stubs)
    - tests/protected-route-suspended.test.tsx (Wave 0 — IS-ACTIVE-01 stubs)
    - tests/admin-suspend.test.ts (canonical fromMock + lazy import pattern for DB-shape tests)
    - tests/admin-protected-route.test.tsx (canonical MemoryRouter + mockAuth pattern for ProtectedRoute tests)
    - src/contexts/AuthContext.tsx (Task 1 — loadRole shape; mock returns must match)
    - src/components/layout/ProtectedRoute.tsx (Task 2 — guard chain order; mockAuth must include isActive)
  </read_first>

  <action>
**File 1 — tests/loadRole-isActive.test.ts** (flip 4 .todos to real assertions):

Replace `it.todo` rows with actual implementations. The challenge: `loadRole` is NOT exported from AuthContext. Test the contract via a thin proxy — directly call supabase mock and assert the projection the loadRole function applies. Since we can't import `loadRole` directly, we test the *single round-trip query shape* by inspecting how `from(...).select(...).eq(...).single()` is called when the AuthProvider mounts with a session.

Approach: Use the existing `from` chain mock pattern, mount AuthProvider with a mocked initial session, observe the select call and the result handling.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'

// IS-ACTIVE-02: loadRole fetches { role, is_active } in a single user_roles query.
// IS-ACTIVE-03: loadRole returns isActive=true on DB error (no false-positive suspension).

const selectMock = vi.fn()
const eqMock = vi.fn()
const singleMock = vi.fn()
const fromMock = vi.fn(() => ({ select: selectMock }))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

beforeEach(() => {
  fromMock.mockClear()
  selectMock.mockReset()
  eqMock.mockReset()
  singleMock.mockReset()
  selectMock.mockImplementation(() => ({ eq: eqMock }))
  eqMock.mockImplementation(() => ({ single: singleMock }))
})

describe('AuthContext.loadRole is_active extension (IS-ACTIVE-02, IS-ACTIVE-03)', () => {
  it('IS-ACTIVE-02: loadRole calls select("role, is_active") — single round-trip', async () => {
    singleMock.mockResolvedValue({ data: { role: 'seeker', is_active: true }, error: null })
    const { AuthProvider, useAuth } = await import('@/contexts/AuthContext')
    function Probe() {
      useAuth()
      return null
    }
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => {
      expect(fromMock).toHaveBeenCalledWith('user_roles')
      expect(selectMock).toHaveBeenCalledWith('role, is_active')
      expect(eqMock).toHaveBeenCalledWith('user_id', 'u1')
    })
    // Single round-trip: only one .from('user_roles') call during mount
    const userRolesCalls = fromMock.mock.calls.filter(c => c[0] === 'user_roles').length
    expect(userRolesCalls).toBe(1)
  })

  it('IS-ACTIVE-02: AuthHookReturn exposes isActive=true on happy path', async () => {
    singleMock.mockResolvedValue({ data: { role: 'seeker', is_active: true }, error: null })
    let captured: any = null
    const { AuthProvider, useAuth } = await import('@/contexts/AuthContext')
    function Probe() {
      captured = useAuth()
      return null
    }
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(captured?.role).toBe('seeker'))
    expect(captured.isActive).toBe(true)
  })

  it('IS-ACTIVE-02: AuthHookReturn exposes isActive=false when DB says so', async () => {
    singleMock.mockResolvedValue({ data: { role: 'seeker', is_active: false }, error: null })
    let captured: any = null
    const { AuthProvider, useAuth } = await import('@/contexts/AuthContext')
    function Probe() {
      captured = useAuth()
      return null
    }
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(captured?.role).toBe('seeker'))
    expect(captured.isActive).toBe(false)
  })

  it('IS-ACTIVE-03: DB error returns role=null, isActive=true (no false-positive suspension)', async () => {
    singleMock.mockResolvedValue({ data: null, error: { message: 'transient' } })
    let captured: any = null
    const { AuthProvider, useAuth } = await import('@/contexts/AuthContext')
    function Probe() {
      captured = useAuth()
      return null
    }
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(captured?.loading).toBe(false))
    expect(captured.role).toBeNull()
    expect(captured.isActive).toBe(true)
  })

  it('IS-ACTIVE-03: is_active=null in row defaults to isActive=true (DB default fallback)', async () => {
    singleMock.mockResolvedValue({ data: { role: 'seeker', is_active: null }, error: null })
    let captured: any = null
    const { AuthProvider, useAuth } = await import('@/contexts/AuthContext')
    function Probe() {
      captured = useAuth()
      return null
    }
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(captured?.role).toBe('seeker'))
    expect(captured.isActive).toBe(true)
  })
})
```

**File 2 — tests/protected-route-suspended.test.tsx** (flip 5 .todos to real assertions):

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}))

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))
import { useAuth } from '@/hooks/useAuth'

function mockAuth(opts: {
  session: any
  role: 'employer' | 'seeker' | 'admin' | null
  loading: boolean
  isActive: boolean
}) {
  vi.mocked(useAuth).mockReturnValue({
    session: opts.session,
    role: opts.role,
    loading: opts.loading,
    isActive: opts.isActive,
    signUpWithRole: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    refreshRole: vi.fn(),
  } as any)
}

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={
          <ProtectedRoute requiredRole="seeker">
            <div>protected-content</div>
          </ProtectedRoute>
        } />
        <Route path="/suspended" element={<div>suspended-page</div>} />
        <Route path="/dashboard/seeker" element={<div>seeker-dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute is_active gate (IS-ACTIVE-01)', () => {
  it('IS-ACTIVE-01: suspended seeker redirects to /suspended (not seeker dashboard)', () => {
    mockAuth({ session: { user: { id: 's1' } } as any, role: 'seeker', loading: false, isActive: false })
    renderRoute('/dashboard/seeker')
    expect(screen.getByText('suspended-page')).toBeInTheDocument()
    expect(screen.queryByText('protected-content')).not.toBeInTheDocument()
  })

  it('IS-ACTIVE-01: suspended employer redirects to /suspended', () => {
    mockAuth({ session: { user: { id: 'e1' } } as any, role: 'employer', loading: false, isActive: false })
    render(
      <MemoryRouter initialEntries={['/dashboard/employer']}>
        <Routes>
          <Route path="/dashboard/employer" element={
            <ProtectedRoute requiredRole="employer">
              <div>employer-content</div>
            </ProtectedRoute>
          } />
          <Route path="/suspended" element={<div>suspended-page</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('suspended-page')).toBeInTheDocument()
    expect(screen.queryByText('employer-content')).not.toBeInTheDocument()
  })

  it('IS-ACTIVE-01: active seeker passes through to protected content', () => {
    mockAuth({ session: { user: { id: 's1' } } as any, role: 'seeker', loading: false, isActive: true })
    renderRoute('/dashboard/seeker')
    expect(screen.getByText('protected-content')).toBeInTheDocument()
    expect(screen.queryByText('suspended-page')).not.toBeInTheDocument()
  })

  it('IS-ACTIVE-01 ordering guard (Pitfall 1): role=null with isActive=false shows spinner, NOT /suspended', () => {
    // requiredRole present + role===null → AUTH-FIX-02 spinner fires BEFORE isActive check
    mockAuth({ session: { user: { id: 'u1' } } as any, role: null, loading: false, isActive: false })
    renderRoute('/dashboard/seeker')
    // Spinner = aria-label="Loading" (per ProtectedRoute.tsx:21)
    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
    expect(screen.queryByText('suspended-page')).not.toBeInTheDocument()
  })

  it('IS-ACTIVE-01 default: isActive=true is treated as authorised (defence)', () => {
    mockAuth({ session: { user: { id: 's1' } } as any, role: 'seeker', loading: false, isActive: true })
    renderRoute('/dashboard/seeker')
    expect(screen.getByText('protected-content')).toBeInTheDocument()
  })
})
```

After flipping both files, run `pnpm exec vitest run tests/loadRole-isActive.test.ts tests/protected-route-suspended.test.tsx` — must be GREEN. Also run full suite — must not regress baseline.

Pre-existing tests `tests/admin-protected-route.test.tsx` may need a tiny update — its `mockAuth` helper omits `isActive`. With the new field, `useAuth()` consumers in ProtectedRoute will see `isActive: undefined` and the `isActive === false` check yields false (undefined !== false), so the guard does NOT fire. Existing 4 admin gate tests should remain GREEN. If they fail with "Cannot read isActive of undefined", add `isActive: true` to the existing mockAuth fallback (Rule 1 — defensive fix; closest neighbour to plan scope).
  </action>

  <verify>
    <automated>pnpm exec vitest run tests/loadRole-isActive.test.ts tests/protected-route-suspended.test.tsx tests/admin-protected-route.test.tsx --reporter=verbose</automated>
  </verify>

  <acceptance_criteria>
    - `pnpm exec vitest run tests/loadRole-isActive.test.ts tests/protected-route-suspended.test.tsx` exits 0
    - Test summary: ≥ 10 assertions passing across the 2 files (5 + 5)
    - `grep -c "it.todo" tests/loadRole-isActive.test.ts tests/protected-route-suspended.test.tsx | awk -F: '{sum+=$2} END {print sum}'` returns 0 (all todos flipped)
    - `grep -c "is_active" tests/loadRole-isActive.test.ts` returns ≥ 3 (multiple test scenarios)
    - `grep -c "isActive" tests/protected-route-suspended.test.tsx` returns ≥ 5 (mockAuth uses; assertions reference)
    - `tests/admin-protected-route.test.tsx` 4 ADMIN-GATE-FE tests still GREEN
    - Full suite green: `pnpm exec vitest run` exits 0; passing count ≥ baseline + 10
  </acceptance_criteria>

  <done>
    All Wave 0 IS-ACTIVE-* stubs flipped to assertions and GREEN. Pre-existing admin-protected-route tests preserved. Atomic commit per CLAUDE §4 with Tasks 1+2.
  </done>
</task>

</tasks>

<verification>
1. AuthContext loadRole single-query verified by static-source: `grep -c "select('role, is_active')" src/contexts/AuthContext.tsx` returns 1
2. ProtectedRoute guard chain ORDER preserved + isActive inserted at correct position (verified by grep order check in Task 2 acceptance)
3. 10 new GREEN assertions (IS-ACTIVE-01/02/03)
4. Full suite green; tsc clean (or only pre-existing Phase 18.1-02 errors)
5. No file outside the 4 listed is modified
</verification>

<success_criteria>
- AuthContext.loadRole returns { role, isActive } in a single round-trip
- AuthHookReturn exposes isActive: boolean
- ProtectedRoute redirects suspended users to /suspended in the correct guard position
- Tests for IS-ACTIVE-01/02/03 all GREEN
- Atomic commit: `feat(21-04): is_active gate in AuthContext + ProtectedRoute (Track B)`
</success_criteria>

<output>
After completion, create `.planning/phases/21-v20-close-post-launch-ops/21-04-SUMMARY.md` capturing:
- AuthContext + ProtectedRoute diff stats
- Test flip count (5 todos → 5 assertions + 5 todos → 5 assertions)
- Order-of-guards verification (grep -n output showing isActive between role-null spinner and !role redirect)
- Confirmation no DB migration needed (is_active column already shipped in 023)
- Pointer forward to Wave 3 plan 21-05 (/suspended route + page)
- Confirmation Phase 18.2 SC-7 console.time instrumentation preserved
</output>
