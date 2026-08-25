---
phase: 21-v20-close-post-launch-ops
plan: 00
type: execute
wave: 0
depends_on: []
files_modified:
  - tests/loadRole-isActive.test.ts
  - tests/protected-route-suspended.test.tsx
  - tests/suspended-page.test.tsx
  - tests/admin-doc-queue.test.tsx
  - tests/documents-verified-badge.test.tsx
autonomous: true
requirements:
  - IS-ACTIVE-01
  - IS-ACTIVE-02
  - IS-ACTIVE-03
  - DOC-QUEUE-01
  - DOC-QUEUE-02
  - DOC-QUEUE-04
must_haves:
  truths:
    - "Every Wave 1-5 task has a failing-or-todo vitest stub it must turn GREEN"
    - "Test directory convention (tests/, not src/__tests__/) matches existing repo layout"
    - "Full suite remains 260 passed + todos (no new failures)"
  artifacts:
    - path: "tests/loadRole-isActive.test.ts"
      provides: "AuthContext.loadRole is_active extension stubs"
    - path: "tests/protected-route-suspended.test.tsx"
      provides: "ProtectedRoute is_active=false redirect stubs"
    - path: "tests/suspended-page.test.tsx"
      provides: "Suspended gate page render stubs"
    - path: "tests/admin-doc-queue.test.tsx"
      provides: "Admin doc queue page + 3 action button stubs"
    - path: "tests/documents-verified-badge.test.tsx"
      provides: "DocumentsVerifiedBadge render stubs"
  key_links:
    - from: "tests/loadRole-isActive.test.ts"
      to: "src/contexts/AuthContext.tsx (Wave 3 plan 04)"
      via: "loadRole shape assertion"
      pattern: "select\\('role, is_active'\\)|isActive"
    - from: "tests/protected-route-suspended.test.tsx"
      to: "src/components/layout/ProtectedRoute.tsx (Wave 3 plan 04)"
      via: "MemoryRouter render + isActive mock"
      pattern: "isActive: false|/suspended"
    - from: "tests/admin-doc-queue.test.tsx"
      to: "src/pages/admin/AdminDocumentsQueue.tsx (Wave 5 plan 07)"
      via: "RPC mock + 3 action button assertions"
      pattern: "admin_list_document_queue|admin_approve_document|admin_reject_document|admin_request_more_info"
---

<objective>
Wave 0 — Lay down failing/todo vitest stubs for every IS-ACTIVE-* and DOC-QUEUE-* test ID from 21-VALIDATION.md. Each subsequent wave turns one or more of these RED → GREEN. No production code touched.

Purpose: Anchor the Nyquist sampling contract — every code-producing task in Waves 1-5 has an automated test that will execute (it.todo where shape isn't yet known, real assertion where shape is known from RESEARCH.md). Wave 0 establishes the test surface so executors aren't writing tests as a side-effect of feature work.

Output: 5 new vitest files in `tests/` (not `src/__tests__/` — 21-VALIDATION.md said the latter, but the project's live convention is `tests/`; matches all existing admin-*/protected-route-*/saved-search-* tests).
</objective>

<execution_context>
@/Users/harrysmith/.claude/get-shit-done/workflows/execute-plan.md
@/Users/harrysmith/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/21-v20-close-post-launch-ops/21-CONTEXT.md
@.planning/phases/21-v20-close-post-launch-ops/21-RESEARCH.md
@.planning/phases/21-v20-close-post-launch-ops/21-VALIDATION.md
@CLAUDE.md

<!--
Locked decisions from 21-CONTEXT.md:
- Enforcement layer: ProtectedRoute (not middleware)
- Gate page route: /suspended (unauthenticated-accessible — user has session, gated from dashboards)
- Admin doc bypass: branch inside existing get-applicant-document-url Edge Function (NOT new RPC) — RESEARCH §Pattern 3
- Request More Info: sets status='needs_resubmission' (RESEARCH §Pattern 7)
- loadRole extension: extend existing LoadRoleOutcome type (RESEARCH §Pattern 1)
- DocumentsVerifiedBadge: NEW component, not VerificationBadge reuse (RESEARCH §Pattern 6)
- Only seeker_documents queued (employer auto-verify deferred)
-->

<interfaces>
From src/contexts/AuthContext.tsx (CURRENT — pre-Wave-3):
```typescript
export interface AuthHookReturn {
  session: Session | null
  role: UserRole | null
  loading: boolean
  // ...mutations...
  refreshRole: () => Promise<UserRole | null>
}
async function loadRole(userId: string): Promise<UserRole | null>
type LoadRoleOutcome =
  | { ok: true; role: UserRole | null }
  | { ok: false; reason: 'timeout' }
```

From src/components/layout/ProtectedRoute.tsx (CURRENT — pre-Wave-3):
```typescript
interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: 'employer' | 'seeker' | 'admin'
}
// Current guard order: loading -> !session -> (requiredRole && role===null) -> !role -> requiredRole mismatch
```

From src/types/domain.ts (CURRENT):
```typescript
export type DocumentType = 'cv' | 'certificate' | 'reference' | 'identity' | 'other'
export interface SeekerDocument {
  id: string; seeker_id: string; storage_path: string;
  document_type: DocumentType; filename: string;
  uploaded_at: string; file_size_bytes: number | null
  // Wave 1 plan 01 will add: status, rejection_reason
}
```

Test conventions (from tests/admin-protected-route.test.tsx, tests/admin-suspend.test.ts):
- vi.mock '@/lib/supabase' at top; lazy `await import` for dynamic mock manipulation
- vi.mock '@/hooks/useAuth'; mockAuth helper sets {session, role, loading, ...mutations}
- MemoryRouter for ProtectedRoute renders
- rpcMock = vi.fn() at module scope; beforeEach mockReset()
- describe/it labels prefix with the test ID (e.g., "ADMIN-MUT-SUS: ...")
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create AuthContext loadRole + ProtectedRoute + SuspendedPage test stubs (IS-ACTIVE-01/02/03)</name>
  <files>tests/loadRole-isActive.test.ts, tests/protected-route-suspended.test.tsx, tests/suspended-page.test.tsx</files>

  <read_first>
    - tests/admin-suspend.test.ts (canonical rpcMock + lazy import pattern)
    - tests/admin-protected-route.test.tsx (canonical mockAuth + MemoryRouter pattern for ProtectedRoute)
    - .planning/phases/21-v20-close-post-launch-ops/21-VALIDATION.md (per-task verification map — IS-ACTIVE-* rows)
    - .planning/phases/21-v20-close-post-launch-ops/21-RESEARCH.md (Pattern 1 + Pitfall 1 — guard chain ordering)
    - src/contexts/AuthContext.tsx (current loadRole shape — line 30-42; LoadRoleOutcome — line 50-52)
    - src/components/layout/ProtectedRoute.tsx (current guard chain — lines 11-69)
  </read_first>

  <action>
Create THREE vitest files, each with `it.todo(...)` placeholders for behaviours that Wave 3 will implement. Bodies match the established `vi.mock('@/lib/supabase')` + `vi.mock('@/hooks/useAuth')` + lazy `await import` pattern from tests/admin-suspend.test.ts and tests/admin-protected-route.test.tsx.

**File 1 — tests/loadRole-isActive.test.ts** (covers IS-ACTIVE-02, IS-ACTIVE-03):

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// IS-ACTIVE-02: loadRole fetches { role, is_active } in a single user_roles query.
// IS-ACTIVE-03: loadRole returns isActive=true on DB error (no false-positive suspension).
// Wave 3 plan 21-04 implements; this file scaffolds the contract.

const fromMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: { from: fromMock },
}))

beforeEach(() => {
  fromMock.mockReset()
})

describe('AuthContext.loadRole is_active extension (IS-ACTIVE-02, IS-ACTIVE-03)', () => {
  it.todo('IS-ACTIVE-02: loadRole calls .from("user_roles").select("role, is_active").eq("user_id", id).single() — single round-trip')
  it.todo('IS-ACTIVE-02: loadRole returns { role: UserRole, isActive: boolean } on happy path')
  it.todo('IS-ACTIVE-03: loadRole returns { role: null, isActive: true } when supabase returns error')
  it.todo('IS-ACTIVE-03: loadRole returns isActive: true when data.is_active is null (DB default fallback)')
})
```

**File 2 — tests/protected-route-suspended.test.tsx** (covers IS-ACTIVE-01):

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

describe('ProtectedRoute is_active gate (IS-ACTIVE-01)', () => {
  it.todo('IS-ACTIVE-01: suspended seeker (session=true, role=seeker, isActive=false) redirects to /suspended, not requested dashboard')
  it.todo('IS-ACTIVE-01: suspended employer (session=true, role=employer, isActive=false) redirects to /suspended')
  it.todo('IS-ACTIVE-01: active seeker (isActive=true) accessing /dashboard/seeker passes through (no redirect)')
  it.todo('IS-ACTIVE-01 ordering guard: isActive=false but role=null (still loading) shows spinner, NOT /suspended flash (Pitfall 1)')
  it.todo('IS-ACTIVE-01 default: undefined isActive treated as true (defence — no suspension on transient error)')
})
```

**File 3 — tests/suspended-page.test.tsx** (covers SuspendedPage render — Wave 3 plan 05):

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

describe('SuspendedPage (Wave 3 plan 05)', () => {
  it.todo('renders "Your account has been suspended" heading')
  it.todo('renders hello@topfarms.co.nz contact link/text')
  it.todo('renders a Sign Out button so suspended user can clear session')
  it.todo('does NOT render any navigation into authenticated app surfaces')
})
```

All `it.todo()` calls appear as todos in vitest output (reported as third-state — neither pass nor fail). When Wave 3 ships, executors flip `.todo` to real implementations with assertions.
  </action>

  <verify>
    <automated>pnpm exec vitest run tests/loadRole-isActive.test.ts tests/protected-route-suspended.test.tsx tests/suspended-page.test.tsx --reporter=verbose</automated>
  </verify>

  <acceptance_criteria>
    - `ls tests/loadRole-isActive.test.ts tests/protected-route-suspended.test.tsx tests/suspended-page.test.tsx` returns 3 files (exit 0)
    - `pnpm exec vitest run tests/loadRole-isActive.test.ts tests/protected-route-suspended.test.tsx tests/suspended-page.test.tsx` exits 0 with todo summary (≥ 13 todos across 3 files)
    - `grep -c "it.todo" tests/loadRole-isActive.test.ts` returns ≥ 4
    - `grep -c "it.todo" tests/protected-route-suspended.test.tsx` returns ≥ 5
    - `grep -c "it.todo" tests/suspended-page.test.tsx` returns ≥ 4
    - Full suite baseline preserved: `pnpm exec vitest run` exits 0 with no new failures (≥ 260 passing per RESEARCH §Test Framework)
  </acceptance_criteria>

  <done>
    3 vitest files exist with named-and-numbered `it.todo()` rows covering IS-ACTIVE-01/02/03 and Suspended page. Vitest reports them as todos. Baseline suite green.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create admin doc queue + DocumentsVerifiedBadge test stubs (DOC-QUEUE-01/02/04)</name>
  <files>tests/admin-doc-queue.test.tsx, tests/documents-verified-badge.test.tsx</files>

  <read_first>
    - tests/admin-suspend.test.ts (rpcMock + lazy-import canonical pattern for RPC shape-contract tests)
    - tests/admin-employer-list.test.ts (RPC list-shape contract — admin_list_* return rows + total)
    - .planning/phases/21-v20-close-post-launch-ops/21-VALIDATION.md (DOC-QUEUE-* rows in per-task map)
    - .planning/phases/21-v20-close-post-launch-ops/21-RESEARCH.md (Pattern 2 — 4 RPC signatures; Pattern 6 — DocumentsVerifiedBadge shape)
    - src/components/ui/Tag.tsx (variant union — green/warn/blue/red/grey/orange/purple)
  </read_first>

  <action>
Create TWO vitest files with `it.todo` placeholders matching the contract Wave 2/5 will implement.

**File 1 — tests/admin-doc-queue.test.tsx** (covers DOC-QUEUE-01, DOC-QUEUE-02):

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// DOC-QUEUE-01: admin_list_document_queue RPC shape matches AdminDocumentsQueue expectations.
// DOC-QUEUE-02: Approve / Reject / Request More Info buttons dispatch correct admin RPCs.
// Wave 2 plan 21-02 ships the 4 RPCs; Wave 5 plan 21-07 ships the page that consumes them.

const rpcMock = vi.fn()
const functionsInvokeMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: rpcMock,
    functions: { invoke: functionsInvokeMock },
  },
}))

beforeEach(() => {
  rpcMock.mockReset()
  functionsInvokeMock.mockReset()
})

describe('admin_list_document_queue RPC shape (DOC-QUEUE-01)', () => {
  it.todo('DOC-QUEUE-01: admin_list_document_queue called with { p_limit, p_offset } returns { rows: [{ document_id, seeker_id, seeker_name, document_type, filename, uploaded_at, status, rejection_reason }], total }')
  it.todo('DOC-QUEUE-01: rows ordered with pending status first, then most recently uploaded')
})

describe('admin doc queue action dispatch (DOC-QUEUE-02)', () => {
  it.todo('DOC-QUEUE-02: Approve button calls supabase.rpc("admin_approve_document", { p_document_id: id } as never)')
  it.todo('DOC-QUEUE-02: Reject button (after reason supplied) calls supabase.rpc("admin_reject_document", { p_document_id: id, p_reason: text } as never)')
  it.todo('DOC-QUEUE-02: Request More Info button calls supabase.rpc("admin_request_more_info", { p_document_id: id } as never)')
  it.todo('DOC-QUEUE-02: After successful RPC, supabase.functions.invoke("send-document-status-email", { body: { document_id, action } }) is called (best-effort — no rollback on email error)')
  it.todo('DOC-QUEUE-02: RPC error surfaces a toast.error containing the gate failure message ("Forbidden" or "Document not found")')
})
```

**File 2 — tests/documents-verified-badge.test.tsx** (covers DOC-QUEUE-04):

```typescript
import { describe, it } from 'vitest'
import { render, screen } from '@testing-library/react'

// DOC-QUEUE-04: DocumentsVerifiedBadge renders "Documents Verified" only when hasVerifiedDocuments=true.
// Wave 5 plan 21-08 ships the badge.

describe('DocumentsVerifiedBadge (DOC-QUEUE-04)', () => {
  it.todo('DOC-QUEUE-04: renders "Documents Verified" text when hasVerifiedDocuments=true')
  it.todo('DOC-QUEUE-04: renders nothing (null/no badge in document) when hasVerifiedDocuments=false')
  it.todo('DOC-QUEUE-04: applies green Tag variant (RESEARCH §Pattern 6 — Tag variant="green")')
  it.todo('DOC-QUEUE-04: renders FileCheck icon (RESEARCH §Pattern 6 — Lucide icon)')
})
```

`functions: { invoke }` mock is added inside the supabase mock because Wave 5 will call the new `send-document-status-email` Edge Function after successful RPC dispatch.
  </action>

  <verify>
    <automated>pnpm exec vitest run tests/admin-doc-queue.test.tsx tests/documents-verified-badge.test.tsx --reporter=verbose</automated>
  </verify>

  <acceptance_criteria>
    - `ls tests/admin-doc-queue.test.tsx tests/documents-verified-badge.test.tsx` returns 2 files (exit 0)
    - `pnpm exec vitest run tests/admin-doc-queue.test.tsx tests/documents-verified-badge.test.tsx` exits 0 with todo summary (≥ 11 todos across 2 files)
    - `grep -c "it.todo" tests/admin-doc-queue.test.tsx` returns ≥ 7
    - `grep -c "it.todo" tests/documents-verified-badge.test.tsx` returns ≥ 4
    - Test file references the 4 RPC names verbatim: `grep -c "admin_list_document_queue\|admin_approve_document\|admin_reject_document\|admin_request_more_info" tests/admin-doc-queue.test.tsx` returns ≥ 4
    - Full suite baseline preserved: `pnpm exec vitest run` exits 0 (≥ 260 passing)
  </acceptance_criteria>

  <done>
    2 vitest files exist with named-and-numbered `it.todo()` rows for the 4 admin RPCs + DocumentsVerifiedBadge. Vitest reports them as todos. Baseline suite green. Atomic commit per CLAUDE §4.
  </done>
</task>

</tasks>

<verification>
After both tasks:

1. `pnpm exec vitest run --reporter=dot` exits 0
2. New todo count = baseline + ≥ 24 (5+5+4+7+4 = 25 minimum)
3. No new failing tests
4. `git diff --stat HEAD~1` shows only the 5 new test files
5. Single atomic commit per CLAUDE §4 wave-bundle precedent (Phase 17-00, 18.1-00, 20-01)
</verification>

<success_criteria>
- 5 new test files in `tests/` with `it.todo` placeholders covering all IS-ACTIVE-* and DOC-QUEUE-* test IDs from 21-VALIDATION.md
- Vitest reports new todos (verifiable scaffolding signal in CI output per Phase 20-01 + 17-00 + 18.1-00 precedent)
- Baseline 260 passed | 113+ todo | 0 failures preserved
- Atomic commit: `test(21-00): wave 0 vitest scaffold for is_active gate + doc queue`
</success_criteria>

<output>
After completion, create `.planning/phases/21-v20-close-post-launch-ops/21-00-SUMMARY.md` capturing:
- 5 files created + line counts
- Total new it.todo count
- Updated vitest baseline (X passed | Y todo | 0 failures)
- Pointer to which Wave the .todos correspond to
- Confirmation no production source touched
- Confirmation tests/ (not src/__tests__/) used; note 21-VALIDATION.md path mention as documentation-only drift
</output>
