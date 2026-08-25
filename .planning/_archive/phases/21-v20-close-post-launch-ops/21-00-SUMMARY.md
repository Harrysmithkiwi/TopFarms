---
phase: 21-v20-close-post-launch-ops
plan: 00
subsystem: testing
tags: [vitest, scaffold, nyquist, is-active, doc-queue, admin]

# Dependency graph
requires:
  - phase: 21-v20-close-post-launch-ops
    provides: 21-VALIDATION.md test ID inventory (IS-ACTIVE-01/02/03 + DOC-QUEUE-01/02/04)
provides:
  - 5 vitest stub files anchoring 24 it.todo placeholders across IS-ACTIVE-* and DOC-QUEUE-* test IDs
  - Nyquist sampling contract — every Wave 1-5 code-producing task has a pre-landed failing/todo test it must turn GREEN
  - Mock surface convention: rpcMock + functionsInvokeMock at module scope, reset in beforeEach
affects:
  - 21-04-auth-context-is-active (Wave 3 — flips loadRole-isActive.test.ts + protected-route-suspended.test.tsx todos to GREEN)
  - 21-05-suspended-page (Wave 3 — flips suspended-page.test.tsx todos to GREEN)
  - 21-02-admin-doc-rpcs (Wave 2 — RPC shape contract enforces admin_list_document_queue / admin_approve_document / admin_reject_document / admin_request_more_info signatures)
  - 21-07-admin-documents-queue (Wave 5 — flips admin-doc-queue.test.tsx action-dispatch + email-side-effect todos to GREEN)
  - 21-08-documents-verified-badge (Wave 5 — flips documents-verified-badge.test.tsx todos to GREEN)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 scaffold-first: it.todo() placeholders land before any production code (Phase 17-00, 18.1-00, 20-01 precedent extended)"
    - "Dual-mock setup for queue test: rpcMock + functionsInvokeMock — Wave 5 will dispatch RPC then invoke('send-document-status-email')"
    - "Render tests without RTL imports yet: render/screen/MemoryRouter not imported until .todo flipped — keeps stub file dependency-light"

key-files:
  created:
    - tests/loadRole-isActive.test.ts
    - tests/protected-route-suspended.test.tsx
    - tests/suspended-page.test.tsx
    - tests/admin-doc-queue.test.tsx
    - tests/documents-verified-badge.test.tsx
  modified: []

key-decisions:
  - "tests/ convention used (not src/__tests__/) — 21-VALIDATION.md path mention is documentation-only drift; live repo precedent is tests/admin-*/protected-route-*/saved-search-*"
  - "Plan-listed 'unused import' helpers (mockAuth, render, screen) elided from stub bodies — vitest todos don't execute so the unused-import lint would fail at GREEN-time. Helper signature retained as documented _mockAuth shape in protected-route-suspended.test.tsx for Wave 3 reference"
  - "Atomic single-commit landing of Tasks 1+2 per CLAUDE §4 + plan success_criteria — one wave = one commit, matches Phase 17-00 / 18.1-00 / 20-01 / 17-02 / 17-03 / 17-04 / 20.1-04 atomic-bundle precedent"

patterns-established:
  - "RPC name verbatim in test description: grep-able RPC strings (admin_list_document_queue|admin_approve_document|admin_reject_document|admin_request_more_info) double as a static-source spec that Wave 2 migration 033 must match"
  - "Mock helper _mockAuth shape retained in protected-route-suspended.test.tsx with _ prefix to suppress unused-lint while documenting the isActive: boolean prop Wave 3 will surface from useAuth"

requirements-completed: []

# Metrics
duration: 3min
completed: 2026-05-17
---

# Phase 21 Plan 00: Wave 0 Test Scaffold Summary

**5 vitest stubs landing 24 new it.todo placeholders across IS-ACTIVE-01/02/03 + DOC-QUEUE-01/02/04 — anchoring the Nyquist sampling contract before any Wave 1-5 production code touches the tree.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-17T12:30:18Z
- **Completed:** 2026-05-17T12:33:05Z
- **Tasks:** 2
- **Files created:** 5
- **Files modified:** 0

## Accomplishments

- 5 vitest stub files landed in `tests/` covering every IS-ACTIVE-* and DOC-QUEUE-* test ID from 21-VALIDATION.md
- 24 new `it.todo()` placeholders surfaced in vitest output as third-state todos (visible CI scaffolding signal per Phase 20-01 / 17-00 / 18.1-00 precedent)
- Baseline preserved exactly: 260 passed unchanged; todo count moved 113 → 137 (+24); 0 failures
- 4 admin RPC names referenced verbatim in `tests/admin-doc-queue.test.tsx` — these double as a static-source spec Wave 2 migration 033 must match
- Mock surface contracts pre-declared: `rpcMock` + `functionsInvokeMock` for queue test, `fromMock` for loadRole test, `auth.signOut` mock for SuspendedPage test
- Zero production source touched (verified by `git diff --stat HEAD~1` — 5 created files in `tests/`)

## Task Commits

Both tasks landed in a single atomic commit per plan §success_criteria + CLAUDE §4:

1. **Tasks 1+2: Wave 0 vitest scaffold (5 files + 24 todos)** — `be8f76a` (test)

**Plan metadata:** _Final docs commit covers SUMMARY.md + STATE.md + ROADMAP.md_

## Files Created/Modified

- `tests/loadRole-isActive.test.ts` (23 lines, 4 todos) — IS-ACTIVE-02/03 contract: loadRole single round-trip `select('role, is_active')` + DB-error fallback to `isActive: true`
- `tests/protected-route-suspended.test.tsx` (42 lines, 5 todos) — IS-ACTIVE-01 contract: suspended → /suspended redirect + Pitfall 1 ordering guard (role=null spinner before isActive=false flash) + undefined-default defence
- `tests/suspended-page.test.tsx` (16 lines, 4 todos) — Wave 3 plan 05 SuspendedPage render: heading + contact email + Sign Out button + no authenticated-app nav
- `tests/admin-doc-queue.test.tsx` (42 lines, 7 todos) — DOC-QUEUE-01 list shape + DOC-QUEUE-02 action dispatch (4 RPCs verbatim + `send-document-status-email` side-effect + toast.error gate)
- `tests/documents-verified-badge.test.tsx` (11 lines, 4 todos) — DOC-QUEUE-04 render: hasVerifiedDocuments true/false branches + green Tag variant + FileCheck icon (RESEARCH Pattern 6)

## .todo → Wave mapping

| File | .todo count | Flipped to GREEN by |
|---|---|---|
| `tests/loadRole-isActive.test.ts` | 4 | Wave 3 plan 21-04-auth-context-is-active |
| `tests/protected-route-suspended.test.tsx` | 5 | Wave 3 plan 21-04-auth-context-is-active |
| `tests/suspended-page.test.tsx` | 4 | Wave 3 plan 21-05-suspended-page |
| `tests/admin-doc-queue.test.tsx` | 7 | Wave 2 plan 21-02 (RPC shape rows) + Wave 5 plan 21-07 (action dispatch + email side-effect) |
| `tests/documents-verified-badge.test.tsx` | 4 | Wave 5 plan 21-08-documents-verified-badge |
| **Total** | **24** | — |

## Decisions Made

- **`tests/` directory convention** — 21-VALIDATION.md mentioned `src/__tests__/`, but the project's live convention is `tests/` (matches all existing admin-*/protected-route-*/saved-search-* tests). Treated as documentation-only drift per plan body explicit note; SUMMARY documents this so 21-VALIDATION.md can be reconciled in Phase 21 closure plan 21-09 if desired.
- **Elided unused imports from stub bodies** — The plan body included `mockAuth` helper bodies and `render/screen/MemoryRouter` imports in `protected-route-suspended.test.tsx` / `suspended-page.test.tsx`. Vitest todo rows don't execute, so importing those symbols at scaffold-time would (a) inflate the stub line count, (b) trip eslint `no-unused-vars` once todos flip GREEN partially, and (c) couple the stub to a specific assertion shape. Retained `_mockAuth` signature with `_` prefix in `protected-route-suspended.test.tsx` to document the `isActive: boolean` prop Wave 3 will surface from `useAuth`. Aligns with Phase 17-00 + 20-01 stub conventions (load minimal mock surface; flesh out at GREEN time).
- **Atomic single-commit landing** — Plan §success_criteria explicitly required `Atomic commit: test(21-00): wave 0 vitest scaffold for is_active gate + doc queue`. Both tasks landed in `be8f76a`. Splitting into 2 commits (Task 1 → Task 2) would have produced 2 commits for what is logically one Wave 0 unit; matches Phase 17-00 / 18.1-00 / 20-01 atomic-bundle precedent.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `expect` + RTL imports from stub bodies**

- **Found during:** Both tasks (eslint/tsc lint posture)
- **Issue:** Plan body included `import { describe, it, expect, vi, beforeEach } from 'vitest'` and `import { render, screen } from '@testing-library/react'` in stubs where only `describe` + `it` (+ `vi` + `beforeEach` for mock files) are referenced. With `.todo` rows, these symbols are never read; vite's import resolver flags unused imports inconsistently across the project's eslint config.
- **Fix:** Trimmed each stub to import only the symbols its scaffold actually uses (`describe`, `it`, `vi`, `beforeEach`). `documents-verified-badge.test.tsx` imports only `describe, it`. Helper signature in `protected-route-suspended.test.tsx` retained as `_mockAuth` (underscore prefix → suppressed by tsconfig `noUnusedParameters`).
- **Files modified:** All 5 created test files (vs verbatim plan body)
- **Verification:** `pnpm exec vitest run --reporter=dot` reports 260 passed | 137 todo | 0 failures (no new test-collection failures from unused-import errors).
- **Committed in:** `be8f76a`

**2. [Rule 1 - Bug] Removed `import { ProtectedRoute }` and `import { useAuth }` from protected-route-suspended.test.tsx**

- **Found during:** Task 1 (vitest dry-run during stub creation)
- **Issue:** Plan body imported `ProtectedRoute` and dereferenced `useAuth` via `vi.mocked(useAuth)`. With todo rows, those references never execute, but the module-level import still triggers test-collection. `ProtectedRoute.tsx` and the `useAuth` hook transitively pull `@/lib/supabase` + `react-router` etc., inflating the stub's module graph for no benefit.
- **Fix:** Module-level imports kept to mock declarations only. Wave 3 plan 21-04 will add `import { ProtectedRoute } from '@/components/layout/ProtectedRoute'` + `import { useAuth } from '@/hooks/useAuth'` at the same time it flips the first `.todo` to a real assertion (single atomic GREEN commit per CLAUDE §4).
- **Files modified:** `tests/protected-route-suspended.test.tsx`
- **Verification:** Focused vitest run reports 5 todos for protected-route-suspended.test.tsx, 0 collect-time errors.
- **Committed in:** `be8f76a`

**3. [No deviation] Vercel-plugin / Next.js posttooluse hook injections**

- **Found during:** Both tasks (Read + Edit on `src/components/layout/ProtectedRoute.tsx`)
- **Observation:** Vercel-plugin subagent-bootstrap injected `react-best-practices` skill suggestion claiming React APIs are unreliable and instructing to read https://react.dev/reference/react before writing code. **Not applicable.** This plan writes ZERO production React component code — only vitest stubs with `.todo` rows. TopFarms is Vite + React Router v7 SPA on Supabase (not Next.js, not using Vercel for this app surface). Pattern matches Phase 17-02 / 17-03 / 17-04 / 18.1-02 / 18.1-03 / 20.1-02 STATE precedent for posttooluse hook noise dismissal.
- **Action taken:** Acknowledged in chat; no code change; documented here for future executors that may see the same hook output.

---

**Total deviations:** 2 auto-fixed (Rule 1 import-trim, both at scaffold-creation time) + 1 no-deviation hook-noise event
**Impact on plan:** Both auto-fixes are strict subsets of the plan body — they remove imports that would never have executed under `.todo` rows. No assertion semantics changed; no test ID dropped. Wave 3 plan 21-04 will reintroduce the trimmed imports at the same commit it flips the first `.todo` GREEN. No scope creep.

## Issues Encountered

None. Plan executed without blockers. Single auth-context Read (`src/contexts/AuthContext.tsx`) and ProtectedRoute Read (`src/components/layout/ProtectedRoute.tsx`) were sufficient to confirm the `select('role, is_active')` extension shape and the loading/!session/role-null/!role/requiredRole-mismatch guard chain Wave 3 will modify.

## User Setup Required

None — no external service configuration required. Wave 0 is pure test scaffold.

## Next Phase Readiness

- **Wave 1 (plan 21-01 migration-032-doc-status):** ready — migration adds `seeker_documents.status` + `rejection_reason` columns + composite index; tests don't depend on this wave but downstream waves (RPCs in 21-02) consume the columns.
- **Wave 2 (plans 21-02 admin-doc-rpcs + 21-03 edge-fn-admin-bypass):** ready — `tests/admin-doc-queue.test.tsx` provides the RPC shape contract; the 2 `DOC-QUEUE-01` rows must turn GREEN.
- **Wave 3 (plans 21-04 auth-context-is-active + 21-05 suspended-page):** ready — `tests/loadRole-isActive.test.ts` + `tests/protected-route-suspended.test.tsx` + `tests/suspended-page.test.tsx` provide the 13 todo rows that must turn GREEN.
- **Wave 4 (plan 21-06 email-edge-fn):** scaffold-light — `tests/admin-doc-queue.test.tsx` row 4 references `send-document-status-email` as a side-effect signal but doesn't independently test the function (Edge Functions are UAT-validated per `18.1-VERIFICATION.md` Stripe webhook precedent).
- **Wave 5 (plans 21-07 admin-documents-queue + 21-08 documents-verified-badge):** ready — `tests/admin-doc-queue.test.tsx` action-dispatch rows (5 of them) + `tests/documents-verified-badge.test.tsx` (4 rows) must turn GREEN.
- **Wave 6 (plan 21-09 track-a-milestone-close):** independent of this scaffold — operator-action plan for PEND-01 Stripe live-mode swap.

## Self-Check: PASSED

- `tests/loadRole-isActive.test.ts` — FOUND
- `tests/protected-route-suspended.test.tsx` — FOUND
- `tests/suspended-page.test.tsx` — FOUND
- `tests/admin-doc-queue.test.tsx` — FOUND
- `tests/documents-verified-badge.test.tsx` — FOUND
- Commit `be8f76a` — FOUND in `git log`
- Full suite: 260 passed | 137 todo | 0 failures (baseline preserved + 24 new todos)

---
*Phase: 21-v20-close-post-launch-ops*
*Completed: 2026-05-17*
