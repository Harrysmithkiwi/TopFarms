---
phase: 22-pre-launch-p0-closure
plan: "01"
type: execute
wave: 1
depends_on: ["22-00"]
files_modified:
  - src/pages/auth/SignUp.tsx
autonomous: true
requirements: [SIGNUP-01]
must_haves:
  truths:
    - "When supabase.auth.signUp returns an email_address_invalid error, the Sonner toast at top-right is visible AND remains visible for 10+ seconds without auto-dismissing"
    - "The toast has a close affordance (X button) so the user can dismiss explicitly"
    - "Both the named-error path AND the catch-block fallback path use the persistent toast configuration"
    - "Wave 0 test tests/signup-toast-persistence.test.tsx flips from RED to GREEN"
  artifacts:
    - path: "src/pages/auth/SignUp.tsx"
      provides: "Persistent toast.error invocation with { duration: Infinity, closeButton: true } options"
      contains: "duration: Infinity"
  key_links:
    - from: "src/pages/auth/SignUp.tsx onSubmit"
      to: "Sonner toast.error"
      via: "options object second arg"
      pattern: "toast\\.error\\([^,]+,\\s*\\{[^}]*duration:\\s*Infinity"
---

<objective>
Close SIGNUP-01: signup form silently swallows `email_address_invalid` errors from Supabase. Fix the Sonner toast plumbing in `src/pages/auth/SignUp.tsx:88` so error messages persist until the user dismisses them, instead of auto-dismissing in 4 seconds (Sonner default).

Per `22-RESEARCH.md §Pattern 1` (Hypothesis A — Sonner default duration), this is the most likely root cause given the symptom verbatim match. Hypothesis B (signUpWithRole swallows the AuthError) is ruled less likely but defended against via the catch-block update.

Per CLAUDE §3 (diagnose before fix), Task 1 inserts a transient `console.error('[SIGNUP-01]', result.error)` for the operator to confirm during dev that the AuthError path IS hit (rules out Hypothesis B empirically). Task 2 lands the fix; Task 3 removes the diagnostic line.

Purpose: Top-of-funnel breaker — users entering invalid emails see nothing happen and bounce. Fix unblocks signup conversion.

Output: 1 file modified (`src/pages/auth/SignUp.tsx`); Wave 0 spec GREEN; ready for Wave 2 prod UAT (Step 1 of `tests/p0-prod-smoke-UAT.md`).
</objective>

<execution_context>
@/Users/harrysmith/.claude/get-shit-done/workflows/execute-plan.md
@/Users/harrysmith/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/REQUIREMENTS.md
@.planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md
@.planning/phases/22-pre-launch-p0-closure/22-VALIDATION.md
@CLAUDE.md

# Files modified
@src/pages/auth/SignUp.tsx

# Supporting reads (do not modify)
@src/contexts/AuthContext.tsx
@src/main.tsx

# Wave 0 spec to flip GREEN
@tests/signup-toast-persistence.test.tsx

<interfaces>
src/pages/auth/SignUp.tsx — CURRENT onSubmit handler (lines 82-97):
```typescript
const onSubmit = async (data: FormValues) => {
  if (!data.role) return
  setIsSubmitting(true)
  try {
    const result = await signUpWithRole(data.email, data.password, data.role)
    if (result.error) {
      toast.error(result.error.message)  // <-- LINE 88, the defect
    } else {
      navigate('/auth/verify')
    }
  } catch {
    toast.error('An unexpected error occurred. Please try again.')
  } finally {
    setIsSubmitting(false)
  }
}
```

POST-FIX target shape (from 22-RESEARCH.md §Example 1):
```typescript
const onSubmit = async (data: FormValues) => {
  if (!data.role) return
  setIsSubmitting(true)
  try {
    const result = await signUpWithRole(data.email, data.password, data.role)
    if (result.error) {
      toast.error(result.error.message, {
        duration: Infinity,
        closeButton: true,
      })
    } else {
      navigate('/auth/verify')
    }
  } catch (err) {
    // Defence-in-depth: if signUpWithRole rejects (not just returns error),
    // log the raw error so we don't lose diagnostic info.
    console.error('[SIGNUP-01] signUpWithRole threw:', err)
    toast.error('An unexpected error occurred. Please try again.', {
      duration: Infinity,
      closeButton: true,
    })
  } finally {
    setIsSubmitting(false)
  }
}
```

src/contexts/AuthContext.tsx signUpWithRole — confirmed { data, error: AuthError | null } return shape (Supabase auth-js v2). The named-error path (`if (result.error)`) handles `email_address_invalid` directly; the defensive backfill at lines 169-191 only wraps `role_backfill_failed` and is NOT relevant for invalid-email errors.

src/main.tsx:297 — `<Toaster position="top-right" richColors />` — confirmed mount; `richColors` does NOT affect duration (Sonner default 4000ms applies).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Diagnostic — instrument SignUp.tsx with transient console.error to confirm AuthError path</name>
  <files>src/pages/auth/SignUp.tsx</files>
  <read_first>
    - src/pages/auth/SignUp.tsx (current onSubmit handler, lines 82-97 — the defect site)
    - src/contexts/AuthContext.tsx (signUpWithRole at lines 150-194 — confirms return shape; not modified)
    - .planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md §Pattern 1 (Hypothesis A vs B decision tree)
    - .planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md §Pitfall 7 (AuthError vs Generic Error confusion — confirms backfill path NOT hit for email_address_invalid)
    - CLAUDE.md §3 (diagnose before fix discipline)
  </read_first>
  <action>
    Insert a transient diagnostic `console.error` call BEFORE the existing `toast.error(result.error.message)` line at SignUp.tsx:88. This is per CLAUDE §3 — empirically confirm `result.error` is populated for `email_address_invalid` before applying the fix.

    Use the Edit tool. Edit the onSubmit handler so it becomes (CHANGED lines marked with `// [SIGNUP-01 DIAGNOSTIC]` comment):

    ```typescript
    const onSubmit = async (data: FormValues) => {
      if (!data.role) return
      setIsSubmitting(true)
      try {
        const result = await signUpWithRole(data.email, data.password, data.role)
        if (result.error) {
          // [SIGNUP-01 DIAGNOSTIC] — remove in Task 3 after operator confirms AuthError shape in browser console
          console.error('[SIGNUP-01]', { message: result.error.message, name: (result.error as { name?: string }).name, status: (result.error as { status?: number }).status })
          toast.error(result.error.message)
        } else {
          navigate('/auth/verify')
        }
      } catch (err) {
        // [SIGNUP-01 DIAGNOSTIC] — remove in Task 3 after operator confirms
        console.error('[SIGNUP-01] caught (non-Error-shape throw):', err)
        toast.error('An unexpected error occurred. Please try again.')
      } finally {
        setIsSubmitting(false)
      }
    }
    ```

    Note: this task does NOT yet add `{ duration: Infinity, closeButton: true }` — that lands in Task 2 after operator empirically observes the console.error fires. Diagnostic-only edit.

    After saving, the operator runs `pnpm dev` locally, opens `/signup`, enters `not_an_email@example.test` + a valid password, clicks Create account, and visually confirms in the browser DevTools Console that `[SIGNUP-01]` log line appears with the expected AuthError shape (message containing "Unable to validate email address" or "invalid format", name "AuthError", status 400). This confirms Hypothesis A (toast IS called but auto-dismisses).

    **CHECKPOINT (informational, no gate):** the executor agent does NOT block on the operator running this. The Task 2 fix is correct whether or not the operator runs the local diagnostic — the diagnostic is documentation of due diligence per CLAUDE §3, NOT a precondition for the fix.
  </action>
  <verify>
    <automated>grep -E "\\[SIGNUP-01\\] DIAGNOSTIC" src/pages/auth/SignUp.tsx — expect ≥2 matches (one before named-error path, one in catch); pnpm exec tsc -b 2>&1 | grep "SignUp.tsx" — expect zero NEW errors on SignUp.tsx (pre-existing project-wide TS errors are tolerated; only NEW errors on this file are blockers)</automated>
  </verify>
  <acceptance_criteria>
    - `grep -E "console.error\\('\\[SIGNUP-01\\]" src/pages/auth/SignUp.tsx` returns ≥2 matches
    - `grep -E "\\[SIGNUP-01 DIAGNOSTIC\\]" src/pages/auth/SignUp.tsx` returns ≥2 matches (anchor for Task 3 removal)
    - `pnpm exec tsc -b 2>&1 | grep "src/pages/auth/SignUp.tsx" | grep -v "node_modules"` returns no NEW errors (pre-existing project-wide errors tolerated)
    - The diagnostic does NOT change the `toast.error` call shape (still single-arg pre-Task-2)
  </acceptance_criteria>
  <done>
    SignUp.tsx contains transient `[SIGNUP-01 DIAGNOSTIC]` console.error in both the named-error path AND the catch block. File compiles. Operator may optionally run local diagnostic to confirm AuthError shape — not a blocker for Task 2.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Fix — apply persistent toast options { duration: Infinity, closeButton: true }</name>
  <files>src/pages/auth/SignUp.tsx</files>
  <read_first>
    - src/pages/auth/SignUp.tsx (post-Task-1 state with diagnostic log)
    - tests/signup-toast-persistence.test.tsx (Wave 0 RED spec — the assertion target shape)
    - .planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md §Example 1 (verbatim fix shape)
    - .planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md §Don't Hand-Roll table row 1 (Sonner persistence — use built-in duration prop, not custom modal)
  </read_first>
  <behavior>
    - Test 1 (Wave 0 spec test 1): toast.error called with `{ duration: Infinity, closeButton: true }` second arg.
    - Test 2 (Wave 0 spec test 2): toast.error fires exactly once per submit (no regression introduced by edit).
    - Test 3 (pre-existing tests/signup-role-preselect.test.tsx): preserves all current SignUp behavior — role preselect from URL param still works.
  </behavior>
  <action>
    Use the Edit tool to update the onSubmit handler in `src/pages/auth/SignUp.tsx`. The named-error path gets the persistent options; the catch block also gets the persistent options (matches research recommendation that both Hypothesis A and B are addressed by ONE code change).

    POST-EDIT target (the `[SIGNUP-01 DIAGNOSTIC]` lines remain — they are removed in Task 3):

    ```typescript
    const onSubmit = async (data: FormValues) => {
      if (!data.role) return
      setIsSubmitting(true)
      try {
        const result = await signUpWithRole(data.email, data.password, data.role)
        if (result.error) {
          // [SIGNUP-01 DIAGNOSTIC] — remove in Task 3 after operator confirms AuthError shape in browser console
          console.error('[SIGNUP-01]', { message: result.error.message, name: (result.error as { name?: string }).name, status: (result.error as { status?: number }).status })
          toast.error(result.error.message, {
            duration: Infinity,
            closeButton: true,
          })
        } else {
          navigate('/auth/verify')
        }
      } catch (err) {
        // [SIGNUP-01 DIAGNOSTIC] — remove in Task 3 after operator confirms
        console.error('[SIGNUP-01] caught (non-Error-shape throw):', err)
        toast.error('An unexpected error occurred. Please try again.', {
          duration: Infinity,
          closeButton: true,
        })
      } finally {
        setIsSubmitting(false)
      }
    }
    ```

    Two changes vs Task 1 state:
    1. Line ~89 — `toast.error(result.error.message)` becomes `toast.error(result.error.message, { duration: Infinity, closeButton: true })`
    2. Line ~95 — `toast.error('An unexpected error occurred. Please try again.')` becomes `toast.error('An unexpected error occurred. Please try again.', { duration: Infinity, closeButton: true })`

    Note that the `catch` block's parameter was changed from `catch {` to `catch (err) {` in Task 1 to support the diagnostic log; preserve this signature.
  </action>
  <verify>
    <automated>pnpm test tests/signup-toast-persistence.test.tsx --run 2>&1 | tail -20 — expect at least Test 1 (`'calls toast.error with { duration: Infinity, closeButton: true }'`) to PASS (was RED at Wave 0); pnpm test tests/signup-role-preselect.test.tsx --run — expect all existing tests to PASS (no regression)</automated>
  </verify>
  <acceptance_criteria>
    - `grep -cE "duration: Infinity" src/pages/auth/SignUp.tsx` returns exactly `2` (both named-error path AND catch path have persistent toast)
    - `grep -cE "closeButton: true" src/pages/auth/SignUp.tsx` returns exactly `2`
    - `grep -E "toast.error\\(result\\.error\\.message\\)" src/pages/auth/SignUp.tsx` returns 0 matches (the bare single-arg call is gone)
    - `pnpm test tests/signup-toast-persistence.test.tsx --run` — at minimum the `'calls toast.error with { duration: Infinity, closeButton: true }'` assertion passes (Test 1 GREEN)
    - `pnpm test tests/signup-role-preselect.test.tsx --run` — all assertions pass (zero regression in existing SignUp tests)
    - `pnpm exec tsc -b 2>&1 | grep "src/pages/auth/SignUp.tsx"` — no NEW typescript errors
  </acceptance_criteria>
  <done>
    Both toast.error invocations in SignUp.tsx onSubmit use `{ duration: Infinity, closeButton: true }`. Wave 0 spec is at minimum partially GREEN (Test 1 passes). No regression in existing SignUp tests.
  </done>
</task>

<task type="auto">
  <name>Task 3: Remove transient [SIGNUP-01 DIAGNOSTIC] console.error lines</name>
  <files>src/pages/auth/SignUp.tsx</files>
  <read_first>
    - src/pages/auth/SignUp.tsx (post-Task-2 state with both diagnostic lines AND persistent toast options)
    - CLAUDE.md §3 (diagnose-before-fix discipline — diagnostic is dropped after diagnosis is complete)
  </read_first>
  <action>
    Use the Edit tool to remove the two `[SIGNUP-01 DIAGNOSTIC]` console.error lines from `src/pages/auth/SignUp.tsx`. The catch block parameter `(err)` is RETAINED (no longer needed for the diagnostic log, but harmless and slightly more explicit than the bare `catch {`).

    Final state of the onSubmit handler:

    ```typescript
    const onSubmit = async (data: FormValues) => {
      if (!data.role) return
      setIsSubmitting(true)
      try {
        const result = await signUpWithRole(data.email, data.password, data.role)
        if (result.error) {
          toast.error(result.error.message, {
            duration: Infinity,
            closeButton: true,
          })
        } else {
          navigate('/auth/verify')
        }
      } catch {
        toast.error('An unexpected error occurred. Please try again.', {
          duration: Infinity,
          closeButton: true,
        })
      } finally {
        setIsSubmitting(false)
      }
    }
    ```

    Note: I'm reverting the catch parameter back to bare `catch {` (no `err` binding) since the diagnostic log was the only consumer of `err`. This matches the project lint config (`@typescript-eslint/no-unused-vars`) and the original code style.

    Specifically:
    - Remove the line `// [SIGNUP-01 DIAGNOSTIC] — remove in Task 3 after operator confirms AuthError shape in browser console` (single-line comment above the named-error path log)
    - Remove the line `console.error('[SIGNUP-01]', { message: result.error.message, ... })` (the named-error path log itself)
    - Remove the line `// [SIGNUP-01 DIAGNOSTIC] — remove in Task 3 after operator confirms` (single-line comment above the catch path log)
    - Remove the line `console.error('[SIGNUP-01] caught (non-Error-shape throw):', err)` (the catch path log itself)
    - Change `} catch (err) {` back to `} catch {` (revert the parameter binding)
  </action>
  <verify>
    <automated>grep -E "\\[SIGNUP-01" src/pages/auth/SignUp.tsx — expect 0 matches; pnpm test tests/signup-toast-persistence.test.tsx tests/signup-role-preselect.test.tsx --run 2>&1 | tail -20 — expect all assertions to PASS or remain in their Wave-0-expected state</automated>
  </verify>
  <acceptance_criteria>
    - `grep -E "\\[SIGNUP-01" src/pages/auth/SignUp.tsx` returns 0 matches (all diagnostic markers gone)
    - `grep -E "console.error" src/pages/auth/SignUp.tsx` returns 0 matches (no leftover diagnostic logs)
    - `grep -cE "duration: Infinity" src/pages/auth/SignUp.tsx` STILL returns exactly `2` (Task 2 fix preserved)
    - `grep -cE "closeButton: true" src/pages/auth/SignUp.tsx` STILL returns exactly `2`
    - `pnpm test tests/signup-toast-persistence.test.tsx --run` — Wave 0 spec Test 1 still PASSES (GREEN preserved through diagnostic removal)
    - `pnpm test tests/signup-role-preselect.test.tsx --run` — pre-existing tests still PASS
    - `pnpm exec tsc -b 2>&1 | grep "src/pages/auth/SignUp.tsx"` — zero NEW TypeScript errors
  </acceptance_criteria>
  <done>
    All transient diagnostic instrumentation removed. SignUp.tsx in final post-fix state. Wave 0 spec GREEN. Pre-existing SignUp test suite intact. Ready for Wave 2 prod UAT.
  </done>
</task>

</tasks>

<verification>
After all 3 tasks complete:

```bash
# Diagnostic is gone, fix is in
grep -E "\[SIGNUP-01" src/pages/auth/SignUp.tsx                 # expect 0
grep -cE "duration: Infinity" src/pages/auth/SignUp.tsx          # expect 2
grep -cE "closeButton: true" src/pages/auth/SignUp.tsx           # expect 2

# Wave 0 spec GREEN
pnpm test tests/signup-toast-persistence.test.tsx --run

# Zero regression in existing SignUp test
pnpm test tests/signup-role-preselect.test.tsx --run

# Full suite still healthy
pnpm test --run 2>&1 | tail -5
```

**Atomic commit per CLAUDE §4:** all 3 tasks land as ONE commit. Splitting Task 1 (diagnostic-add) + Task 2 (fix) + Task 3 (diagnostic-remove) into 3 separate commits would produce 3 noisy commits for what is logically one defect closure. Precedent: 17-01 (1c6a0fc) + 17-02 (171d49e) + 20.1-04 (b4c6b4c) — atomic-bundle convention.

Commit message format: `fix(22-01): SIGNUP-01 — persist Sonner toast for email_address_invalid (duration Infinity + closeButton)`

After Wave 2 deploys + UAT Step 1 confirms persistence in prod, REQUIREMENTS.md SIGNUP-01 flips from the post-launch list to closed (handled in plan 22-04, not here).
</verification>

<success_criteria>
- `tests/signup-toast-persistence.test.tsx` Wave 0 RED → GREEN (at minimum Test 1 — duration/closeButton assertion)
- `src/pages/auth/SignUp.tsx` has persistent toast options on BOTH the named-error path AND the catch block
- All diagnostic instrumentation removed (no `[SIGNUP-01]` markers, no `console.error` debris)
- Zero regression in pre-existing tests (`signup-role-preselect`, full vitest suite)
- Single atomic commit covers all 3 tasks
</success_criteria>

<output>
After completion, create `.planning/phases/22-pre-launch-p0-closure/22-01-signup-01-toast-SUMMARY.md` documenting:
- The diagnostic confirmation (Task 1 — operator console output OR justification for skipping local diagnostic)
- The fix (Task 2 — file diff, lines changed, Wave 0 spec RED→GREEN evidence)
- The cleanup (Task 3 — diagnostic removal, final state)
- Atomic commit SHA
- Carryforward: Wave 2 plan 22-04 Step 1 must verify in production
</output>
