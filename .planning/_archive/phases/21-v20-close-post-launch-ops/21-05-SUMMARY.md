---
phase: 21-v20-close-post-launch-ops
plan: 05
subsystem: auth
tags: [react, react-router, vitest, suspended-gate, is-active]

# Dependency graph
requires:
  - phase: 21-v20-close-post-launch-ops
    provides: Wave 0 vitest scaffold (4 .todo stubs in tests/suspended-page.test.tsx, landed plan 21-00 commit be8f76a)
provides:
  - SuspendedPage gate component at src/pages/auth/Suspended.tsx (renders verbatim CONTEXT.md locked-message + Sign Out button only)
  - /suspended route registration in src/main.tsx outside ProtectedRoute (unauthenticated-accessible — sibling 21-04 ProtectedRoute isActive=false redirect target)
  - 4 GREEN suspended-page.test.tsx assertions (verbatim message + mailto link + Sign Out behaviour + no-app-nav negative)
affects: [21-04 (redirect source — ProtectedRoute isActive guard), 21-09 (Wave 6 operator UAT — suspended-flow smoke test)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Auth-gate page pattern: AuthLayout shell + verbatim CONTEXT.md message + single Sign Out CTA (no nav into authenticated surfaces)"
    - "Sign-out-then-navigate handler: try { await signOut(); navigate('/login', { replace: true }) } catch { toast.error + setSigningOut(false) } — matches Login.tsx error fallback shape"
    - "@testing-library/user-event 14.x setup() pattern for click-driven RTL tests (first usage in project — previously fireEvent everywhere)"

key-files:
  created:
    - src/pages/auth/Suspended.tsx (63 lines — SuspendedPage component)
    - .planning/phases/21-v20-close-post-launch-ops/21-05-SUMMARY.md (this file)
  modified:
    - src/main.tsx (import + route entry — 9 inserts, 0 deletes)
    - tests/suspended-page.test.tsx (4 .todo → 4 GREEN; 78 lines total)

key-decisions:
  - "AuthLayout shell with title='Account suspended' only (subtitle undefined) — single-message page, title carries the weight. Same shell as Login/SignUp for visual consistency per CONTEXT.md 'simple, consistent with existing auth pages'."
  - "Verbatim CONTEXT.md locked-message wording preserved byte-for-byte: 'Your account has been suspended. If you think this is an error, contact hello@topfarms.co.nz.' Email rendered as <a href='mailto:hello@topfarms.co.nz'> for click-to-mail UX (single phrase split with anchor)."
  - "Button variant='primary' (Button.tsx union: 'primary' | 'outline' | 'ghost' | 'warn') — primary is the brand CTA variant used by Login submit button. Matches plan body recommendation byte-for-byte (no warn override needed because 'suspend' is informational here, not destructive)."
  - "Route registered at main.tsx:75-78 directly after /auth/select-role (line 67-69) and BEFORE the /jobs section. Sits among unauthenticated routes alongside /login (line 47), /signup (line 51), /auth/verify (line 55), /forgot-password (line 59), /auth/reset (line 63), /auth/select-role (line 67). NOT inside any ProtectedRoute wrapper — wrapping would cause infinite redirect because user has a session but fails sibling 21-04's isActive guard which redirects HERE."
  - "Companion-commit pattern (e4fbfd0 + 3183e21) per CLAUDE §3 + §4 + §8: diagnosed-before-fix that stash pop during pre-commit tsc baseline reset the index; subsequent git add re-staged but commit object only captured the new-file diff. NO amend / NO reset per CLAUDE §8 2026-05-05 incident precedent — created a NEW companion commit completing the same plan-scoped work. Both commits share feat(21-05): prefix for traceability."

patterns-established:
  - "Auth-gate page pattern: AuthLayout title + body message + single CTA. Reusable for any future block-the-user gate (e.g. account-deletion-confirmation, region-restricted, feature-flag-blocked). Companion to Phase 20.1 AdminLoginPage AccessDeniedView (different stylistic family — inline alert pattern there)."
  - "Plan-scoped-files-only staging (CLAUDE §4 atomic commit hygiene + Phase 18.1-02 sibling-bundled-commit precedent): in parallel-wave execution, explicitly `git add <specific paths>` to prevent absorbing sibling plan's working-tree changes. This commit cleanly excluded sibling 21-04's src/contexts/AuthContext.tsx + src/components/layout/ProtectedRoute.tsx modifications."
  - "User-event v14 setup() RTL pattern: import userEvent from '@testing-library/user-event'; const user = userEvent.setup(); await user.click(button). First usage in project — package was already in package.json (count=1). Cleaner than fireEvent for click-driven test flows (fires correct event sequence, awaits microtasks)."

requirements-completed: []

# Metrics
duration: 4min
completed: 2026-05-18
---

# Phase 21 Plan 05: Suspended Page Summary

**SuspendedPage gate component at src/pages/auth/Suspended.tsx + /suspended route registered outside ProtectedRoute at main.tsx:75-78 (alongside /login /signup) + 4 GREEN suspended-page.test.tsx assertions covering verbatim message + mailto link + Sign Out behaviour + no-app-nav negative.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-18T09:36:41Z
- **Completed:** 2026-05-18T09:40:42Z
- **Tasks:** 2
- **Files modified:** 2 (src/main.tsx, tests/suspended-page.test.tsx)
- **Files created:** 1 (src/pages/auth/Suspended.tsx — 63 lines)

## Accomplishments

- **SuspendedPage component shipped** — `src/pages/auth/Suspended.tsx` (63 lines) wraps AuthLayout with title="Account suspended" + space-y-6 body block containing the CONTEXT.md-locked message + Sign out Button. Verbatim message: "Your account has been suspended. If you think this is an error, contact hello@topfarms.co.nz." with `mailto:hello@topfarms.co.nz` anchor inline. Sign Out handler: `await signOut()` then `navigate('/login', { replace: true })` with try/catch → toast.error fallback.
- **/suspended route registered** — `src/main.tsx:75-78` directly after `/auth/select-role` (line 67-69), BEFORE the `/jobs` section. Outside any ProtectedRoute wrapper (verified via `grep -B1 -A4 "path: '/suspended'" src/main.tsx | grep -c ProtectedRoute` → 0). Import at line 15 alongside other auth-page imports.
- **4 .todo stubs flipped to GREEN** — `tests/suspended-page.test.tsx` (78 lines) renders Suspended via MemoryRouter; asserts (1) verbatim message regex, (2) mailto anchor href, (3) Sign Out button click triggers signOutMock once via @testing-library/user-event 14.x, (4) no anchors target `/dashboard /admin /jobs /onboarding`.
- **Full vitest suite GREEN, zero regressions** — 278 passed | 127 todo vs baseline 274 passed | 131 todo (exact +4/-4 reconciliation matching the 4 .todo flips).

## Task Commits

Each task was committed atomically (two-commit landing per companion-commit diagnostic, see Issues Encountered §1):

1. **Task 1 (component + route registration, partial — Suspended.tsx only):** `e4fbfd0` `feat(21-05): /suspended gate page + route (Track B)` — 1 file, +63 insertions
2. **Tasks 1+2 companion (route registration + test flip):** `3183e21` `feat(21-05): /suspended route registration + tests GREEN` — 2 files, +77/-6

_Note: The two-commit landing happened because of an index-state-reset incident during the pre-commit tsc baseline check (see Issues Encountered §1). Both commits share the `feat(21-05):` prefix for plan-scoped traceability._

## Files Created/Modified

- **`src/pages/auth/Suspended.tsx`** (CREATED, 63 lines) — SuspendedPage default-export function component. AuthLayout wrapper + space-y-6 body. Imports useState + useNavigate + toast + AuthLayout + Button + useAuth. Handler: `handleSignOut` async with setSigningOut state for button disabled+label flip ("Signing out…").
- **`src/main.tsx`** (MODIFIED, +9 insertions) — Line 15: `import { Suspended } from '@/pages/auth/Suspended'`. Lines 70-78: new `{ path: '/suspended', element: <Suspended /> }` route entry with 4-line explanatory comment about why it MUST sit outside ProtectedRoute.
- **`tests/suspended-page.test.tsx`** (MODIFIED, +74/-6) — Wave 0 stub bodies replaced with 4 real assertions. New imports: expect + render + screen + waitFor + userEvent + MemoryRouter + Suspended. Mocks: @/lib/supabase auth.signOut + @/hooks/useAuth full hook surface with signOutMock spy.

## Decisions Made

- **AuthLayout single-title-only shell** — subtitle undefined; single-message page needs no secondary line. Matches CONTEXT.md "simple, consistent with existing auth pages" — same shell as /login /signup but without their forms.
- **Verbatim CONTEXT.md message preserved byte-for-byte** — `Your account has been suspended. If you think this is an error, contact hello@topfarms.co.nz.` Email rendered as separate `<a href="mailto:hello@topfarms.co.nz">` anchor so the test can assert `toHaveAttribute('href', 'mailto:hello@topfarms.co.nz')`. Phrase split: text-text-mailto-text-period pattern (matches plan body action template byte-for-byte).
- **Button variant='primary'** — verified Button.tsx union is `'primary' | 'outline' | 'ghost' | 'warn'`. Primary is the brand-coloured CTA (bg-brand). 'warn' would be wrong (informational not destructive); 'outline' would de-emphasise; 'ghost' would visually disappear.
- **Route position: between /auth/select-role and /jobs** — most-public neighborhood. NOT among /dashboard/* /onboarding/* /admin (those all wrap with ProtectedRoute). Verified outside-ProtectedRoute invariant via grep.
- **NO useNavigate-on-mount auto-redirect** — Suspended page does NOT proactively kick the user out if isActive becomes true (e.g. admin reactivation). Reactivation flow is admin-driven via ProfileDrawer toggle; the user must re-sign-in (Sign Out → /login → new session → AuthContext loadRole picks up new is_active=true → ProtectedRoute lets them through). Locked decision per CONTEXT.md "Re-activation: Manual only — admin flips is_active back to true via the existing ProfileDrawer toggle. No self-service path."

## Deviations from Plan

None - plan executed exactly as written for component, route, and test contract. The companion-commit incident in Issues Encountered §1 is a process diagnostic, not a deviation from the plan's design or scope.

## Issues Encountered

### §1 — Companion-commit incident (index-state-reset during pre-commit tsc baseline)

**Symptom:** First commit attempt (`e4fbfd0`) staged all 3 plan-scoped files (`src/pages/auth/Suspended.tsx` new + `src/main.tsx` modified + `tests/suspended-page.test.tsx` modified — confirmed via `git status --short` pre-commit showing `A`/`M`/`M` in column 1) but the resulting commit object contained ONLY `Suspended.tsx` (1 file +63 insertions). The other two files reverted to unstaged-modified post-commit.

**Diagnosis (per CLAUDE §3 — diagnose before fix):** Reflog showed `reset: moving to HEAD` entries immediately before commit, which corresponds to the internal `git reset --mixed` performed by `git stash pop` during the pre-commit tsc baseline check (`git stash && pnpm exec tsc -b && git stash pop` to verify which tsc errors were pre-existing vs new). The stash pop preserved working-tree changes but reset the index to clean. Subsequent `git add <files>` appeared to re-stage all three per `git status` output, but only the new-file (Suspended.tsx) made it into the commit object. Most likely root cause: a path-spec mismatch or git internal index-rebuild race between the `git add` and the `git commit` invocation. Cost to investigate further: 30+ min for a problem already fixable in 1 min via companion commit. Cost to fix: 1 commit.

**Fix:** Per CLAUDE §4 + §8 (NO `git reset --hard` / NO `git commit --amend` without explicit operator instruction in chat), created a NEW commit `3183e21` `feat(21-05): /suspended route registration + tests GREEN` capturing the remaining 2 files with diagnostic explanation in the commit message body. Both commits share the `feat(21-05):` prefix so they read as a logical pair in `git log`. Working tree post-commit is clean of all plan-21-05 files (verified `git status --short`).

**Verification:**
- `git show --stat e4fbfd0` → 1 file changed, 63 insertions (`src/pages/auth/Suspended.tsx`)
- `git show --stat 3183e21` → 2 files changed, 77 insertions/6 deletions (`src/main.tsx` + `tests/suspended-page.test.tsx`)
- `cat src/main.tsx | grep -c Suspended` → 2 (import + element); `git show HEAD:src/main.tsx | grep -c Suspended` → 2 (post-3183e21)
- `pnpm exec vitest run tests/suspended-page.test.tsx` → 4 passed (post-3183e21)
- Working tree contains ONLY sibling 21-04's in-flight changes (`src/contexts/AuthContext.tsx` + `src/components/layout/ProtectedRoute.tsx`) and pre-existing untracked files (`.claude/scheduled_tasks.lock` + `supabase/migrations/029_pg_net_webhook_secret_vault.sql`) — none of mine.

**Carryforward / prevention rule (proposal for STATE.md):** For future plans where pre-commit verification involves `git stash`, complete the stash cycle BEFORE the first plan-scoped `git add`. The stash-pop-then-add-then-commit sequence carries a measurable index-state-reset risk that's not always trapped by `git status` snapshot. Alternative: skip the tsc baseline `git stash` if there are no uncommitted plan-scoped files at risk — diagnose post-add via `git diff --cached` instead.

## User Setup Required

None - no external service configuration required. Component is fully self-contained (uses existing AuthContext.signOut + Button + AuthLayout + sonner toast — all in-tree).

## Next Phase Readiness

**Wave 3 complete (this plan + sibling 21-04 in flight).** Plan 21-04 ProtectedRoute isActive=false guard will redirect to `/suspended` — destination is now live. Plan 21-04's executor will validate end-to-end redirect via its own tests.

**Wave 6 plan 21-09 operator UAT smoke test:** When 21-09 runs, operator should:
1. Sign in as a seeker account via /login
2. From a separate admin browser/session, suspend that seeker via ProfileDrawer
3. Refresh seeker session (or attempt navigation to any /dashboard/* path) — should redirect to /suspended
4. Verify message + email link + Sign Out button render
5. Click Sign Out → land at /login
6. Reactivate the seeker via admin → re-sign-in → /dashboard/seeker renders normally (no stale-suspension residue)

**No blockers.** Two companion commits land cleanly; sibling 21-04 work isolated; baseline tsc errors unchanged (all pre-existing per `git stash` baseline check); vitest suite +4/-4 exact reconciliation.

## Self-Check: PASSED

- src/pages/auth/Suspended.tsx → FOUND
- src/main.tsx → FOUND (contains "Suspended" import + element)
- tests/suspended-page.test.tsx → FOUND (contains real `it('renders` assertions, not .todo)
- .planning/phases/21-v20-close-post-launch-ops/21-05-SUMMARY.md → FOUND (this file)
- Commit e4fbfd0 → FOUND in git log
- Commit 3183e21 → FOUND in git log
- All claims verified.

---
*Phase: 21-v20-close-post-launch-ops*
*Completed: 2026-05-18*
