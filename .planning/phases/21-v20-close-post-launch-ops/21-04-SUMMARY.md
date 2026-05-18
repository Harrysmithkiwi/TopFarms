---
phase: 21-v20-close-post-launch-ops
plan: 04
subsystem: auth
tags: [react, react-router, supabase, auth, vitest]

# Dependency graph
requires:
  - phase: 21
    provides: 21-00 Wave 0 vitest scaffolds (loadRole-isActive + protected-route-suspended .todo placeholders)
  - phase: 20-02
    provides: migration 023 user_roles.is_active column (already shipped)
  - phase: 20-08
    provides: ProfileDrawer Active toggle (admin UI that flips is_active in prod)
  - phase: 20.1-02
    provides: dashboardPathFor helper (unchanged — ProtectedRoute role-mismatch redirect path)
provides:
  - "AuthContext.loadRole returns { role, isActive } in a single user_roles query (single round-trip)"
  - "AuthHookReturn.isActive: boolean exposed on the useAuth() value (defaults true)"
  - "ProtectedRoute 4th-position guard: isActive === false → Navigate /suspended"
  - "AuthProvider co-updates isActive on initial getSession, onAuthStateChange (both branches), signOut, refreshRole"
  - "Defence-in-depth default-true on DB error / null row (no false-positive suspension)"
affects: [21-05-suspended-page, 21-07-admin-documents-queue, future suspension flows]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single-query projection extension: existing select('col1') → select('col1, col2') + return shape change propagated through Promise<{a,b}> + LoadRoleOutcome union"
    - "Pitfall 1 ordering — defensive guard injected at correct position in existing chain (between role-null spinner and !role redirect) instead of top of chain"
    - "Default-true defence — both initial useState and error-branch return TRUE so transient DB failures never falsely suspend"

key-files:
  created: []
  modified:
    - "src/contexts/AuthContext.tsx (loadRole + LoadRoleOutcome + AuthProvider isActive state + value object)"
    - "src/components/layout/ProtectedRoute.tsx (isActive destructure + 4th-position guard)"
    - "tests/loadRole-isActive.test.ts (4 .todo → 5 GREEN assertions; AuthProvider-mount + supabase chain mock)"
    - "tests/protected-route-suspended.test.tsx (5 .todo → 5 GREEN assertions; MemoryRouter + mocked useAuth)"

key-decisions:
  - "createElement instead of JSX in loadRole-isActive.test.ts to match existing .ts file extension (avoids .ts → .tsx rename absorption per Phase 18.1-02 precedent)"
  - "admin-protected-route.test.tsx left unchanged — undefined !== false defensive behavior preserves all 4 ADMIN-GATE-FE tests GREEN without modification"
  - "isActive guard inserted at position 4 between role-null spinner (position 3) and !role redirect (position 5) — Pitfall 1 explicit ordering"
  - "Default-true useState init + default-true error-branch return → transient DB failures cannot suspend a valid user"
  - "refreshRole and signOut co-update isActive (Pitfall 5) — kept symmetric with role state lifecycle"

patterns-established:
  - "Single-query column-addition: when extending DB query shape, propagate through full LoadRoleOutcome + Promise return shape + state setters + value object atomically"
  - "Wave 0 .todo → Wave 3 GREEN flip pattern: 9 todos across 2 files flipped without changing scaffold filenames/extensions; assertions exercise the new code path via the same mock pattern Wave 0 scaffolded"

requirements-completed: [IS-ACTIVE-01, IS-ACTIVE-02, IS-ACTIVE-03]

# Metrics
duration: 6 min
completed: 2026-05-18
---

# Phase 21 Plan 04: AuthContext is_active gate Summary

**Extends `AuthContext.loadRole` to fetch `user_roles.is_active` in a single round-trip and adds a 4th-position `isActive === false → /suspended` guard to `ProtectedRoute`, gating suspended users out of every authenticated dashboard while preserving the AUTH-FIX-02 role-null spinner ordering.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-18T09:36:42Z
- **Completed:** 2026-05-18T09:43:27Z
- **Tasks:** 3 (all `auto`, plan body specified `tdd="true"` on Tasks 1+2 but explicit RED-step skipped because Wave 0 scaffold supplied the RED state with `.todo` placeholders)
- **Files modified:** 4 (2 src + 2 tests)

## Accomplishments

- `loadRole` now fetches `role` AND `is_active` in a single user_roles query (no extra round-trip) — `select('role, is_active')` exactly once at line 38
- `AuthHookReturn` exposes `isActive: boolean` on the useAuth() value
- `AuthProvider` holds `isActive` state initialised to TRUE (Pitfall 1 — never flashes /suspended during loadRole resolution) and propagates through 4 update sites: initial getSession path, onAuthStateChange `!newSession?.user` branch, onAuthStateChange `result.ok` branch, refreshRole
- `signOut` resets isActive to TRUE so re-sign-in starts with default-true
- `ProtectedRoute` 6-step guard chain: `loading → !session → role-null spinner (AUTH-FIX-02) → isActive === false → /suspended → !role → /auth/select-role → role-mismatch → dashboardPathFor` — isActive at position 4 between role-null spinner and !role redirect (Pitfall 1)
- Defence-in-depth defaults: `data.is_active ?? true` on null DB column; `{ role: null, isActive: true }` on DB error → transient failures cannot falsely suspend
- 10 new GREEN test assertions (5 IS-ACTIVE-02/03 in loadRole-isActive + 5 IS-ACTIVE-01 in protected-route-suspended); zero regressions
- 4 pre-existing ADMIN-GATE-FE tests in `admin-protected-route.test.tsx` remain GREEN unchanged (undefined !== false defensive behavior)
- Phase 18.2 SC-7 `console.time('[AUTH-FIX-02] loadRole:db-query')` instrumentation preserved byte-for-byte
- Atomic single-commit landing of all 4 files per CLAUDE §4 + plan success_criteria

## Task Commits

Single atomic commit per plan §success_criteria (matches Phase 17/18.1/20.1/21-00 atomic-bundle precedent):

1. **All 3 tasks bundled** — `cc7e9a4` `feat(21-04): is_active gate in AuthContext + ProtectedRoute (Track B)` (4 files, +305/-42)

Splitting into 3 task commits would have produced 3 commits for what is logically one Wave 3 unit (loadRole projection + ProtectedRoute guard + Wave 0 scaffold flip) — matches Phase 17-01 (1c6a0fc), 17-02 (171d49e), 17-03 (33a590b), 17-04 (e349655), 18.1-02 (5c164c2), 20.1-04 (b4c6b4c), 21-00 (be8f76a) atomic-bundle precedent.

## Files Created/Modified

- `src/contexts/AuthContext.tsx` — loadRole returns `{role, isActive}`; LoadRoleOutcome ok-true variant gains isActive; AuthHookReturn gains isActive; AuthProvider holds isActive state + 4-site propagation
- `src/components/layout/ProtectedRoute.tsx` — destructure isActive from useAuth; insert `isActive === false → /suspended` Navigate at position 4 (line 63)
- `tests/loadRole-isActive.test.ts` — 4 `.todo` → 5 GREEN assertions; AuthProvider mount + supabase chain mock + select-shape + single-round-trip + error fallback + null fallback
- `tests/protected-route-suspended.test.tsx` — 5 `.todo` → 5 GREEN assertions; MemoryRouter + Routes + mocked useAuth + suspended seeker + suspended employer + active passthrough + Pitfall 1 ordering + default-true passthrough

### Order-of-guards verification (grep -n output)

```
42:  if (requiredRole && role === null) {     # Position 3 — AUTH-FIX-02 spinner
63:  if (isActive === false) {                # Position 4 — IS-ACTIVE-01 (NEW)
68:  if (!role) {                             # Position 5 — !role → /auth/select-role
```

Position 4 (isActive) sits strictly AFTER position 3 (role-null spinner) and BEFORE position 5 (!role redirect). Pitfall 1 ordering preserved empirically.

### Test metrics

- Before: 274 passed | 131 todo (405) — baseline established 09:36 UTC
- After: 288 passed | 118 todo (406) — observed at 09:42 UTC
- Plan 21-04 contribution: +10 passed, -9 todo (4 loadRole + 5 protected-route)
- Sibling Wave 3 plan 21-05 in-flight contribution: +4 passed, -4 todo (suspended-page.test.tsx flipped GREEN by sibling commits e4fbfd0 + 3183e21 landing during this plan's execution)
- Net: +1 in total count because suspended-page.test.tsx now collects 4 tests where it previously was a skipped collection

## Decisions Made

1. **createElement over JSX in `.ts` test file** — `tests/loadRole-isActive.test.ts` retains its `.ts` extension (matches Wave 0 scaffold filename). Plan body used JSX which esbuild would reject. `createElement(AuthProvider, ...)` is semantically identical and avoids a mid-execution `.ts → .tsx` rename (Phase 18.1-02 precedent: such renames absorb into atomic commits and create cross-plan confusion).
2. **admin-protected-route.test.tsx left untouched** — its `mockAuth` helper omits isActive, but undefined !== false so the new ProtectedRoute guard is a no-op for those tests. All 4 ADMIN-GATE-FE tests verified GREEN unchanged. The plan body's defensive note about adding `isActive: true` was not needed (Rule 1 fix avoided).
3. **Atomic single-commit landing of all 3 tasks** — per plan §success_criteria explicit commit message `feat(21-04): is_active gate in AuthContext + ProtectedRoute (Track B)`. Matches Phase 17-01 → 21-00 atomic-bundle precedent. Splitting would produce 3 commits for one logical Wave 3 unit.
4. **Default-true symmetry across all 4 setIsActive callsites** — initial useState=true + signOut reset + onAuthStateChange-no-session branch + DB-error fallback all converge on TRUE. Single locus of false-positive prevention (no surface where a transient state could leak false into ProtectedRoute).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] JSX in `.ts` file would fail esbuild**
- **Found during:** Task 3 (flipping loadRole-isActive.test.ts stubs)
- **Issue:** Plan body specified JSX (`<AuthProvider><Probe /></AuthProvider>`) in `tests/loadRole-isActive.test.ts`. The Wave 0 scaffold uses `.ts` extension (not `.tsx`); esbuild's `vite:esbuild` plugin would reject JSX in a `.ts` file (same root cause as Phase 18.1-02 `mark-job-filled-rpc.test.{ts → tsx}` rename incident).
- **Fix:** Used `createElement(AuthProvider, { children: createElement(Probe) as ReactNode })` instead of JSX. Semantically identical.
- **Files modified:** tests/loadRole-isActive.test.ts (no rename — extension preserved)
- **Verification:** 5/5 IS-ACTIVE-02/03 assertions GREEN; full suite +10 passed.
- **Committed in:** cc7e9a4 (atomic plan commit)

**2. [Rule 1 - Bug] Plan AC2 internal contradiction surfaced and resolved**
- **Found during:** Task 1 acceptance criteria check
- **Issue:** Plan AC6 reads "File does NOT have a second `from('user_roles')` call (single round-trip enforced)" but plan action text explicitly says "DO NOT touch the signUpWithRole defensive backfill (lines 132-176)" — which contains the second `from('user_roles')` call (defensive backfill on signup, line 152 in original, line 171 in modified). Following the DO-NOT-touch directive correctly produces 2 file-wide `from('user_roles')` matches.
- **Fix:** No code change — followed DO-NOT-touch directive. AC interpreted as "single round-trip within loadRole" (which is satisfied: line 38 only). The signUpWithRole backfill is a different code path (signup-time defensive check, not auth-load).
- **Files modified:** None
- **Verification:** Behavior-AC satisfied (one round-trip per loadRole call); literal grep-AC has a known 2-match count due to plan's own DO-NOT-touch constraint.
- **Committed in:** N/A (plan-AC reconciliation only)

### Process-deviation note (not a Rule fix — documenting for verifier audit)

**Sibling Wave 3 plan 21-05 executor ran in parallel.** Initial working-tree snapshot showed pre-staged sibling files (`Suspended.tsx`, `main.tsx`, `suspended-page.test.tsx`) — sibling's pending edits. During plan execution, sibling committed 2x (`e4fbfd0`, `3183e21`) landing the Suspended page + route registration. My atomic commit `cc7e9a4` staged ONLY the 4 plan-scoped files (per Phase 18.1-02 process improvement: "sibling executors should `git add <specific paths>` rather than `git add .`"). Zero cross-plan file absorption. STATE.md modification by sibling absorbed naturally before my STATE update (sequencing handled by gsd-tools `state advance-plan`).

---

**Total deviations:** 1 auto-fixed (Rule 1 — JSX in .ts), 1 plan-AC reconciliation (no code change), 1 process-deviation note (sibling parallel — no action needed)
**Impact on plan:** Zero scope creep. All 12 plan acceptance criteria satisfied (modulo plan-AC6 interpretive note above). 10 IS-ACTIVE assertions GREEN. Single atomic commit per success_criteria.

## Issues Encountered

- `act()` warnings in stderr during loadRole tests — React state updates inside async loadRole resolution. Non-fatal (tests pass; warnings are informational about testing best practice). Could wrap in `act(...)` in a future cleanup pass; not a regression vs Phase 18.2 SC-7 instrumentation context.

## User Setup Required

None — no external service configuration required. Pure client-side TS change.

## Pointer Forward

- **Wave 3 plan 21-05 (Suspended page + /suspended route)** — sibling plan, already merged at `e4fbfd0` + `3183e21` during this plan's execution. The `<Navigate to="/suspended" replace />` redirect target is now live.
- **Wave 5 plan 21-07 (AdminDocumentsQueue)** — admin can flip user.is_active via existing ProfileDrawer toggle (Phase 20-05); the gate established here is the user-side enforcement.
- **No DB migration needed** — `user_roles.is_active` column shipped in migration 023 (Phase 20-02, applied 2026-04-30). Verified live via prior Phase 20-08 ADMIN-BOOTSTRAP-1 UAT.
- **Phase 18.2 SC-7 console.time instrumentation preserved byte-for-byte** — `console.time('[AUTH-FIX-02] loadRole:db-query')` + `console.timeEnd(...)` brackets the new 2-column select identically to prior 1-column select. Production timing diagnostic continues to flow.

## Next Phase Readiness

- Track B (is_active enforcement) frontend layer complete end-to-end with sibling 21-05 Suspended page landed
- AuthContext + ProtectedRoute changes have zero impact on AUTH-FIX-02 ordering (verified by 4 admin-protected-route tests GREEN unchanged + new Pitfall 1 ordering test GREEN)
- Phase 21 Wave 3 (plans 21-04 + 21-05) closes is_active enforcement loop in the client; admin tooling already exists (ProfileDrawer Active toggle from Phase 20-05 + admin_set_user_active RPC from migration 023)
- Remaining Phase 21 plans: 21-06 email Edge fn, 21-07 admin documents queue, 21-08 verified badge, 21-09 milestone close (deploy batch)

## Self-Check: PASSED

- src/contexts/AuthContext.tsx — FOUND
- src/components/layout/ProtectedRoute.tsx — FOUND
- tests/loadRole-isActive.test.ts — FOUND
- tests/protected-route-suspended.test.tsx — FOUND
- .planning/phases/21-v20-close-post-launch-ops/21-04-SUMMARY.md — FOUND
- Commit cc7e9a4 — FOUND in git log

---
*Phase: 21-v20-close-post-launch-ops*
*Completed: 2026-05-18*
