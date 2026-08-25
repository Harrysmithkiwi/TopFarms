---
phase: 22-pre-launch-p0-closure
plan: "01"
subsystem: auth
tags: [sonner, toast, react-hook-form, supabase-auth, signup, vitest]

# Dependency graph
requires:
  - phase: 22-pre-launch-p0-closure
    provides: "Wave 0 RED spec tests/signup-toast-persistence.test.tsx (plan 22-00, commit 7bf7c9a)"
provides:
  - "Persistent Sonner toast (duration: Infinity, closeButton: true) on /signup email_address_invalid error"
  - "Wave 0 spec tests/signup-toast-persistence.test.tsx flipped RED → GREEN"
  - "Empirical confirmation that signUpWithRole returns the AuthError on its named-error path (not the catch path) — Hypothesis A confirmed"
affects: [22-04 (P0 prod smoke UAT Step 1 verifies live), REQUIREMENTS.md SIGNUP-01 (closes when Wave 2 captures empirical proof)]

# Tech tracking
tech-stack:
  added: []  # No new dependencies — used Sonner's existing duration/closeButton options
  patterns:
    - "Diagnose-before-fix (CLAUDE §3): transient console.error inserted (Task 1), used to empirically confirm hypothesis, removed (Task 3) — pattern from BFIX-05 precedent"
    - "Atomic-bundle commits (CLAUDE §4): RED-diagnose-fix-cleanup land as one commit when they constitute a single defect closure (precedent: 17-01/17-02/20.1-04)"

key-files:
  created: []
  modified:
    - "src/pages/auth/SignUp.tsx (onSubmit handler: 2 toast.error calls now persistent)"

key-decisions:
  - "Used Sonner's built-in duration: Infinity + closeButton: true rather than hand-rolled modal (per 22-RESEARCH.md §Don't Hand-Roll table row 1)"
  - "Applied persistent options to BOTH named-error path AND catch fallback — defence-in-depth covers Hypothesis A (timeout) and Hypothesis B (catch fires) with one code change"
  - "Diagnostic console.error inserted and removed within the same atomic commit, per CLAUDE §3 — empirical proof of the hypothesis is captured in the spec output, no permanent debug noise"

patterns-established:
  - "Sonner persistent-error pattern: { duration: Infinity, closeButton: true } — to be reused for any other auth/form error where dismissal-by-user is required (see /login, /reset-password if symptoms recur)"
  - "Wave 0 RED spec → Wave 1 fix atomic-bundle commit convention is healthy across plan 22-01 (this) and 22-03 (commit 231d17b)"

requirements-completed: []  # SIGNUP-01 deliberately NOT closed here — see §Next Phase Readiness and CLAUDE §7 partial-close discipline

# Metrics
duration: ~12min
completed: 2026-05-20
---

# Phase 22 Plan 01: SIGNUP-01 Toast Persistence Summary

**Sonner toast for `email_address_invalid` errors now persists until user dismisses (duration: Infinity + closeButton) on both the named-error path and the catch fallback in `SignUp.tsx` onSubmit.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-05-20T20:21:31Z (approx — plan execution kickoff)
- **Completed:** 2026-05-20T20:33:39Z
- **Tasks:** 3 (Task 1 diagnostic, Task 2 fix, Task 3 cleanup — atomic-bundle commit)
- **Files modified:** 1 (`src/pages/auth/SignUp.tsx`)

## Accomplishments

- **Wave 0 spec flipped GREEN.** `tests/signup-toast-persistence.test.tsx` now passes 2/2 runnable tests (1 it.todo deferred for live Sonner integration). The primary assertion — `toast.error called with { duration: Infinity, closeButton: true }` — now resolves.
- **Both toast paths fortified.** Named-error path (line 88, now lines 87-90) AND catch fallback (now lines 93-96) carry the persistent options. Per 22-RESEARCH.md, this defends against both Hypothesis A (toast called but auto-dismisses in 4s) and the lower-probability Hypothesis B (signUpWithRole rejects rather than returns error).
- **Empirical Hypothesis A confirmation captured.** The Task 1 diagnostic `console.error('[SIGNUP-01]', ...)` fired during the Wave 0 spec run with shape `{ message: 'Unable to validate email address: invalid format', name: 'AuthError', status: 400 }` — exactly the AuthError shape predicted by 22-RESEARCH.md §Pattern 1. Hypothesis B ruled out: the catch block was not invoked in the spec scenario.
- **Zero regression.** `tests/signup-role-preselect.test.tsx` (4/4 pass), full vitest suite (51 files passed, 6 skipped, 314 tests pass, 114 todo, zero failures).

## Task Commits

Per CLAUDE §4 atomic-bundle convention, all 3 tasks landed as ONE commit:

1. **Task 1: Diagnostic — instrument SignUp.tsx with transient console.error** — bundled in `0e8c3a5`
2. **Task 2: Fix — apply persistent toast options { duration: Infinity, closeButton: true }** — bundled in `0e8c3a5`
3. **Task 3: Remove transient [SIGNUP-01 DIAGNOSTIC] console.error lines** — bundled in `0e8c3a5`

**Atomic commit:** `0e8c3a5 fix(22-01): SIGNUP-01 — persist Sonner toast for email_address_invalid (duration Infinity + closeButton)`

Splitting into 3 commits would have produced churn for what is logically one defect closure (precedent: 17-01 `1c6a0fc`, 17-02 `171d49e`, 20.1-04 `b4c6b4c`).

## Files Created/Modified

- `src/pages/auth/SignUp.tsx` — onSubmit handler: both `toast.error(...)` invocations gained a `{ duration: Infinity, closeButton: true }` second arg. Net +8/-2 lines. Catch block parameter remains bare (`catch {`) per project lint config.

## Decisions Made

1. **Built-in Sonner options over hand-rolled modal.** 22-RESEARCH.md §Don't Hand-Roll row 1 advised that Sonner already exposes `duration: Infinity` and `closeButton: true` as first-class options. Building a custom modal or persistence wrapper would have introduced ~100 lines of code, new test surface, and accessibility risk for zero functional gain.
2. **Both error paths get the same options.** Named-error path covers Hypothesis A (Supabase returns `{ error: AuthError }` and Sonner default 4s dismissal hides the message). Catch path covers Hypothesis B (signUpWithRole rejects instead of returning the error). Defence-in-depth with one code shape.
3. **Diagnostic recorded in commit log, not source.** The Task 1 `console.error` was removed in Task 3 per CLAUDE §3 (diagnose before fix — the diagnostic is dropped once diagnosis is complete). Empirical confirmation that the AuthError shape matched prediction is documented in this SUMMARY and visible in the spec's stderr output during the Task 2 verification run.
4. **SIGNUP-01 in REQUIREMENTS.md remains open.** Wave 1 closes the spec-level gap. Wave 2 plan 22-04 Step 1 must capture empirical proof in production before the requirement flips per CLAUDE §7 partial-close discipline.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

**Spurious Next.js skill injection at Read/Edit hooks.** Plugin pattern-matching saw `src/pages/auth/` and injected Next.js best-practice validations (`"use client"` directive, async `searchParams`). These are inapplicable — TopFarms is a React + Vite SPA with React Router, not Next.js. Documented inline, ignored without applying. No effect on the work.

## User Setup Required

None — no environment variables or external service configuration changed.

## Next Phase Readiness

- **Wave 2 (plan 22-04 P0 prod smoke) ready to verify.** UAT Step 1 in `tests/p0-prod-smoke-UAT.md` will visit production `/signup`, submit an invalid email, and confirm: (a) toast appears top-right, (b) message says "Unable to validate email address: invalid format" or similar, (c) toast remains visible for >10s without auto-dismissing, (d) X close affordance is present and dismisses on click.
- **REQUIREMENTS.md SIGNUP-01 flip is gated on Wave 2 evidence.** Do NOT mark satisfied here. Per CLAUDE §7 partial-close discipline (precedent: MAIL-02 Phase 15 closeout), Wave 1 closing the spec-level gap is necessary but not sufficient — empirical prod proof is the remaining gap.
- **No blockers.** Sibling plans 22-00 (test scaffold, commit `7bf7c9a`/`91a89c4`) and 22-03 (accommodation filter, commits `231d17b`/`f7fe12d`) both shipped. Plan 22-02 (listing tier) and 22-04 (prod smoke) and 22-05 (mail docs audit) remain queued.

---
*Phase: 22-pre-launch-p0-closure*
*Plan: 01-signup-01-toast*
*Completed: 2026-05-20*

## Self-Check: PASSED

- src/pages/auth/SignUp.tsx exists with `duration: Infinity` x2 and `closeButton: true` x2 — verified via grep.
- Commit `0e8c3a5` exists in git log — verified via `git rev-parse`.
- Wave 0 spec passes (2/2 runnable, 1 todo) — verified via `pnpm test tests/signup-toast-persistence.test.tsx --run`.
- No `[SIGNUP-01` markers or `console.error` lines remain in SignUp.tsx — verified via grep (0 matches).
