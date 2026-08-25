---
phase: 22-pre-launch-p0-closure
plan: "00"
type: execute
wave: 0
depends_on: []
files_modified:
  - tests/signup-toast-persistence.test.tsx
  - tests/featured-listings-tier-type.test.ts
  - tests/jobsearch-accommodation-remap.test.ts
  - tests/p0-prod-smoke-UAT.md
autonomous: true
requirements: [SIGNUP-01, HOMEBUG-01, HOMEBUG-02, HOMEBUG-03, UXBUG-01]
must_haves:
  truths:
    - "Four scaffold files exist under tests/ — three vitest specs + one UAT markdown"
    - "Three vitest specs are syntactically valid (vitest can load them) and assert against the post-fix shape — so they run RED at scaffold time and flip GREEN when Wave 1 fixes land"
    - "UAT markdown contains 5 numbered steps, one per P0 item (SIGNUP-01 / HOMEBUG-02 / HOMEBUG-03 / HOMEBUG-01 / UXBUG-01), each with Browser URL + DevTools Network expectation + DOM expectation"
    - "`pnpm test` exits with at least 3 failures (the RED specs) but does NOT error out at load time (no syntax errors, no missing imports)"
  artifacts:
    - path: "tests/signup-toast-persistence.test.tsx"
      provides: "RED spec for SIGNUP-01 — asserts toast.error called with { duration: Infinity, closeButton: true } when supabase.auth.signUp returns email_address_invalid"
      contains: "duration: Infinity"
    - path: "tests/featured-listings-tier-type.test.ts"
      provides: "RED static-source spec for HOMEBUG-02 — asserts FeaturedListings.tsx contains `.in('listing_tier', [2, 3])` and does NOT contain the string literal `'featured'` or `'premium'` inside the `.in('listing_tier', [...])` call"
      contains: "listing_tier"
    - path: "tests/jobsearch-accommodation-remap.test.ts"
      provides: "RED static-source spec for HOMEBUG-03 — asserts JobSearch.tsx contains `ACCOMMODATION_FILTER_TO_DB` lookup constant and that the `.overlaps('employer_profiles.accommodation_extras', ...)` call is fed remapped values"
      contains: "ACCOMMODATION_FILTER_TO_DB"
    - path: "tests/p0-prod-smoke-UAT.md"
      provides: "5-step operator UAT script for plan 22-04 prod smoke battery"
      contains: "https://top-farms.vercel.app"
  key_links:
    - from: "tests/signup-toast-persistence.test.tsx"
      to: "src/pages/auth/SignUp.tsx"
      via: "RTL render + vi.mock @/lib/supabase signUp returning email_address_invalid"
      pattern: "vi.mock\\('@/lib/supabase'"
    - from: "tests/featured-listings-tier-type.test.ts"
      to: "src/components/landing/FeaturedListings.tsx"
      via: "readFileSync + regex assertions"
      pattern: "readFileSync.*FeaturedListings"
    - from: "tests/jobsearch-accommodation-remap.test.ts"
      to: "src/pages/jobs/JobSearch.tsx"
      via: "readFileSync + regex assertions"
      pattern: "readFileSync.*JobSearch"
---

<objective>
Scaffold the 4 Wave 0 validation artefacts listed in `22-VALIDATION.md` Wave 0 Requirements: 3 vitest specs (one per code-defect requirement) + 1 operator UAT markdown for the prod smoke battery. The 3 vitest specs are written to be RED at scaffold time (assert against the post-fix shape that doesn't exist yet) and will flip GREEN automatically when Wave 1 fixes land — this is the Nyquist sampling guarantee.

Purpose: Per `22-VALIDATION.md` and `22-RESEARCH.md §Validation Architecture`, every Wave 1 plan needs an automated verify command. Wave 0 creates the spec files so the Wave 1 plans can reference them with `pnpm test <pattern>` without RED→nothing-to-run gaps.

Output: 4 files (3 .test.* + 1 .md) ready for Wave 1 fixes to make GREEN.
</objective>

<execution_context>
@/Users/harrysmith/.claude/get-shit-done/workflows/execute-plan.md
@/Users/harrysmith/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md
@.planning/phases/22-pre-launch-p0-closure/22-VALIDATION.md
@CLAUDE.md

# Reference test for mock pattern (canonical Sonner + supabase mock in this repo)
@tests/admin-login.test.tsx
@tests/saved-search-modal.test.tsx

# Files under test (Wave 0 specs read these; Wave 1 fixes modify them)
@src/pages/auth/SignUp.tsx
@src/components/landing/FeaturedListings.tsx
@src/pages/jobs/JobSearch.tsx
@src/types/domain.ts

<interfaces>
Key contracts the specs assert against (extracted from existing code + research):

src/pages/auth/SignUp.tsx — current state (POST-FIX target shape):
```typescript
// Line 87-88 (current): toast.error(result.error.message)
// Wave 1 target shape:
toast.error(result.error.message, {
  duration: Infinity,
  closeButton: true,
})
```

src/components/landing/FeaturedListings.tsx — current state (POST-FIX target shape at line 133 ONLY; line 147 is the fallback query with no listing_tier filter):
```typescript
// Line 133 (current): .in('listing_tier', ['featured', 'premium'])
// Wave 1 target shape:
.in('listing_tier', [2, 3])  // 2=featured, 3=premium per getTierBadge helper
```

src/pages/jobs/JobSearch.tsx — POST-FIX target shape (module-level + handler):
```typescript
// Module-level (new constant; near other imports/constants):
const ACCOMMODATION_FILTER_TO_DB: Record<string, string> = {
  couples: 'Couples welcome',
  family: 'Family welcome',
  pet_friendly: 'Pets allowed',
}

// In fetchJobs (replacing lines 276-279):
const accommodationTypes = searchParams.getAll('accommodation_type')
if (accommodationTypes.length > 0) {
  const dbValues = accommodationTypes
    .map((v) => ACCOMMODATION_FILTER_TO_DB[v])
    .filter(Boolean)
  if (dbValues.length > 0) {
    query = query.overlaps('employer_profiles.accommodation_extras', dbValues)
  }
}
```

src/types/domain.ts:327-336 — ACCOMMODATION_EXTRAS_OPTIONS (8 Title Case values: Pets allowed / Couples welcome / Family welcome / Utilities included / Furnished / Garden / Garage / Internet included)
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create tests/signup-toast-persistence.test.tsx (SIGNUP-01 RED spec)</name>
  <files>tests/signup-toast-persistence.test.tsx</files>
  <read_first>
    - src/pages/auth/SignUp.tsx (current onSubmit handler at lines 82-97 — line 88 is the defect)
    - src/contexts/AuthContext.tsx (signUpWithRole at lines 150-194 — confirms { data, error } return shape)
    - src/main.tsx (lines 290-300 — Toaster mount with `position="top-right" richColors`)
    - tests/admin-login.test.tsx (canonical Sonner + supabase mock pattern for this repo)
    - tests/saved-search-modal.test.tsx (vi.hoisted pattern for static-imported SUT)
    - .planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md §Pattern 1 + §Example 1 + §Example 4 (mock setup + assertion shape)
    - .planning/phases/22-pre-launch-p0-closure/22-VALIDATION.md Wave 0 Requirements row 1
  </read_first>
  <behavior>
    - Test 1: when supabase.auth.signUp rejects with `email_address_invalid` AuthError shape, the Sonner `toast.error` is called with the error message AS THE FIRST ARGUMENT, and a `{ duration: Infinity, closeButton: true }` options object as the SECOND ARGUMENT.
    - Test 2: the toast.error mock is called exactly ONCE per submit attempt (no double-fire under React 19 StrictMode in test env).
    - Test 3 (optional/`it.todo`): the persistent toast survives 10+ simulated seconds without auto-dismiss — vitest `vi.useFakeTimers()` + `vi.advanceTimersByTime(10000)` shows the toast still in DOM (this is informational, not gating; Sonner's internal timer is what we're testing indirectly via the options arg).
  </behavior>
  <action>
    Create `tests/signup-toast-persistence.test.tsx` with the following structure (use this as the spec body verbatim; substitute repo-specific imports as needed by reading `tests/admin-login.test.tsx` for the canonical pattern):

    ```typescript
    /**
     * SIGNUP-01 — Sonner toast persistence for email_address_invalid
     *
     * RED at scaffold time (Wave 0); flips GREEN when Wave 1 plan 22-01 adds
     * `{ duration: Infinity, closeButton: true }` to the toast.error call at
     * SignUp.tsx:88.
     *
     * Pattern: vi.mock of @/lib/supabase + vi.mock of sonner. Static import
     * of SignUp component requires vi.hoisted for the toast mock (see
     * tests/saved-search-modal.test.tsx for the canonical hoisted pattern).
     *
     * Reference: .planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md
     * §Pattern 1, §Example 4.
     */
    import { describe, it, expect, vi, beforeEach } from 'vitest'
    import { render, screen, fireEvent, waitFor } from '@testing-library/react'
    import { MemoryRouter } from 'react-router'

    const { toastErrorMock } = vi.hoisted(() => ({ toastErrorMock: vi.fn() }))

    vi.mock('sonner', () => ({
      toast: { error: toastErrorMock, success: vi.fn(), warning: vi.fn(), info: vi.fn() },
      Toaster: () => null,
    }))

    vi.mock('@/lib/supabase', () => ({
      supabase: {
        auth: {
          signUp: vi.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: {
              message: 'Unable to validate email address: invalid format',
              name: 'AuthError',
              code: 'email_address_invalid',
              status: 400,
            },
          }),
          signInWithOAuth: vi.fn(),
          getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
          onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        },
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        })),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
    }))

    // Static SUT imports come AFTER vi.mock (hoisted) but compile-time-resolved
    // since vi.mock is itself hoisted to top of file by vitest's transformer.
    import { SignUp } from '@/pages/auth/SignUp'
    import { AuthProvider } from '@/contexts/AuthContext'

    function renderSignUp() {
      return render(
        <MemoryRouter>
          <AuthProvider>
            <SignUp />
          </AuthProvider>
        </MemoryRouter>,
      )
    }

    describe('SIGNUP-01 — toast persistence for email_address_invalid', () => {
      beforeEach(() => {
        toastErrorMock.mockClear()
      })

      it('calls toast.error with { duration: Infinity, closeButton: true } when supabase returns email_address_invalid', async () => {
        renderSignUp()

        // Fill form: pick role first (gates form submit), then email + password
        // Adapt selectors to match the actual SignUp component — see
        // src/pages/auth/SignUp.tsx for the form structure. If the role
        // selector is a card-style button, fireEvent.click on "Seeker" or
        // "Employer"; if password has a strength meter, any password >= 8 chars
        // that meets Zod schema is fine. The TARGET ASSERTION is the toast call shape.

        // Example shape (adapt selectors):
        const seekerRoleButton = await screen.findByRole('button', { name: /seeker/i })
        fireEvent.click(seekerRoleButton)

        const emailInput = screen.getByLabelText(/email/i)
        const passwordInput = screen.getByLabelText(/password/i)
        fireEvent.change(emailInput, { target: { value: 'not_an_email@example.test' } })
        fireEvent.change(passwordInput, { target: { value: 'ValidPass123!' } })

        const submitButton = screen.getByRole('button', { name: /create account/i })
        fireEvent.click(submitButton)

        await waitFor(() => {
          expect(toastErrorMock).toHaveBeenCalled()
        })

        // PRIMARY ASSERTION (will be RED until Wave 1 plan 22-01 ships):
        expect(toastErrorMock).toHaveBeenCalledWith(
          'Unable to validate email address: invalid format',
          expect.objectContaining({
            duration: Infinity,
            closeButton: true,
          }),
        )
      })

      it('calls toast.error exactly once per submit (no double-fire)', async () => {
        renderSignUp()

        const seekerRoleButton = await screen.findByRole('button', { name: /seeker/i })
        fireEvent.click(seekerRoleButton)

        const emailInput = screen.getByLabelText(/email/i)
        const passwordInput = screen.getByLabelText(/password/i)
        fireEvent.change(emailInput, { target: { value: 'not_an_email@example.test' } })
        fireEvent.change(passwordInput, { target: { value: 'ValidPass123!' } })

        const submitButton = screen.getByRole('button', { name: /create account/i })
        fireEvent.click(submitButton)

        await waitFor(() => {
          expect(toastErrorMock).toHaveBeenCalled()
        })

        expect(toastErrorMock).toHaveBeenCalledTimes(1)
      })

      it.todo('toast remains visible >10s when duration: Infinity (Sonner integration)')
    })
    ```

    Adjust selector strings if the actual form uses different aria-labels (read `src/pages/auth/SignUp.tsx` to confirm). The CRITICAL assertion is the second argument to `toastErrorMock` — that is the RED→GREEN signal.

    DO NOT modify `src/pages/auth/SignUp.tsx` in this task. The spec exists to BE red; Wave 1 plan 22-01 makes it green.
  </action>
  <verify>
    <automated>pnpm test tests/signup-toast-persistence.test.tsx --run 2>&1 | tail -30 — expect 1 failed (the first `it` assertion) + 1 passed (the "called exactly once" assertion may also fail at RED state if SignUp doesn't currently fire toast in test env, in which case both fail — either way the spec LOADS without error)</automated>
  </verify>
  <acceptance_criteria>
    - `test -f tests/signup-toast-persistence.test.tsx` exits 0
    - `grep -E "duration: Infinity" tests/signup-toast-persistence.test.tsx` returns ≥1 match
    - `grep -E "closeButton: true" tests/signup-toast-persistence.test.tsx` returns ≥1 match
    - `grep -E "email_address_invalid" tests/signup-toast-persistence.test.tsx` returns ≥1 match
    - `grep -E "vi.mock\\('sonner'" tests/signup-toast-persistence.test.tsx` returns 1 match
    - `pnpm test tests/signup-toast-persistence.test.tsx --run` exits non-zero (file loads, tests fail RED) — do NOT accept exit 0 here, RED is the required state
    - The vitest output mentions "Unable to validate email address: invalid format" OR shows expected vs received toast call signature mismatch (proves the assertion ran and failed on the missing options arg)
  </acceptance_criteria>
  <done>
    Spec file exists; loads without syntax errors; first `it` assertion fails RED because `src/pages/auth/SignUp.tsx:88` does not yet include the `{ duration: Infinity, closeButton: true }` options object. Wave 1 plan 22-01 will flip this GREEN.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create tests/featured-listings-tier-type.test.ts (HOMEBUG-02 RED spec)</name>
  <files>tests/featured-listings-tier-type.test.ts</files>
  <read_first>
    - src/components/landing/FeaturedListings.tsx (lines 124-156 — note that ONLY line 133 has the `.in('listing_tier', ...)` call; line 147 is the FALLBACK query without that filter)
    - supabase/migrations/001_initial_schema.sql lines 125-135 (verify `listing_tier int NOT NULL DEFAULT 1`)
    - .planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md §Pattern 2 + §Example 2 (root cause + fix shape)
    - tests/saved-search-load-integration.test.tsx (canonical static-source readFileSync regression-guard pattern in this repo)
    - .planning/phases/22-pre-launch-p0-closure/22-VALIDATION.md Wave 0 Requirements row 2
  </read_first>
  <behavior>
    - Test 1: `FeaturedListings.tsx` contains the substring `.in('listing_tier', [2, 3])` (positive assertion — the post-fix shape).
    - Test 2: `FeaturedListings.tsx` does NOT contain the string literal `'featured'` or `'premium'` INSIDE a `.in('listing_tier', [...])` call (negative assertion — guards against the pre-fix string-tier shape).
    - Test 3: `getTierBadge` helper at FeaturedListings.tsx:33-38 still handles the integer form (so badge labels still render after the fix) — assert via substring `t === '3'` AND `t === '2'`.
  </behavior>
  <action>
    Create `tests/featured-listings-tier-type.test.ts` using the static-source readFileSync regression-guard pattern (precedent: `tests/saved-search-load-integration.test.tsx` lines 1-40 — pure-Node test, no jsdom). Use this body verbatim, adjusting only the resolve path if the repo root is detected differently in this CWD:

    ```typescript
    /**
     * HOMEBUG-02 — listing_tier int type drift static-source guard
     *
     * RED at scaffold time (Wave 0); flips GREEN when Wave 1 plan 22-02 changes
     * FeaturedListings.tsx:133 from `.in('listing_tier', ['featured', 'premium'])`
     * to `.in('listing_tier', [2, 3])`.
     *
     * Pattern: pure-Node readFileSync + regex assertions. <5ms runtime.
     * Reference: .planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md §Pattern 2.
     */
    import { describe, it, expect } from 'vitest'
    import { readFileSync } from 'node:fs'
    import { resolve } from 'node:path'

    const SOURCE_PATH = resolve(__dirname, '..', 'src', 'components', 'landing', 'FeaturedListings.tsx')
    const source = readFileSync(SOURCE_PATH, 'utf-8')

    describe('HOMEBUG-02 — listing_tier int type guard', () => {
      it('uses integer values in .in(listing_tier, [...]) — Postgres schema is int NOT NULL DEFAULT 1', () => {
        // POST-FIX shape (RED until Wave 1 plan 22-02 ships):
        expect(source).toMatch(/\.in\(\s*'listing_tier'\s*,\s*\[\s*2\s*,\s*3\s*\]\s*\)/)
      })

      it('does NOT use string tier names ("featured", "premium") inside .in(listing_tier, [...]) — that yields Postgres 22P02 invalid_text_representation', () => {
        // Negative guard against pre-fix shape:
        expect(source).not.toMatch(/\.in\(\s*'listing_tier'\s*,\s*\[\s*'featured'/)
        expect(source).not.toMatch(/\.in\(\s*'listing_tier'\s*,\s*\[[^\]]*'premium'[^\]]*\]/)
      })

      it('getTierBadge helper still maps integer tier values to badge labels (defence-in-depth: post-fix badge rendering)', () => {
        // The helper at lines 33-38 handles BOTH t === '3'/'premium' and t === '2'/'featured';
        // after the fix it will only receive integer tier values from the data path,
        // but the helper should continue to handle them.
        expect(source).toMatch(/t === '3'/)
        expect(source).toMatch(/t === '2'/)
      })
    })
    ```

    DO NOT modify `src/components/landing/FeaturedListings.tsx` in this task.
  </action>
  <verify>
    <automated>pnpm test tests/featured-listings-tier-type.test.ts --run 2>&1 | tail -30 — expect 1 failed (the positive `.in('listing_tier', [2, 3])` assertion will fail because line 133 still has the string form) + 1 passed (the negative-guard test currently passes BECAUSE the string form IS present — wait, no: the negative guard test currently FAILS because the string form is present and `not.toMatch` rejects it). Either way, the file LOADS and RUNS.</automated>
  </verify>
  <acceptance_criteria>
    - `test -f tests/featured-listings-tier-type.test.ts` exits 0
    - `grep -E "readFileSync" tests/featured-listings-tier-type.test.ts` returns ≥1 match
    - `grep -E "FeaturedListings.tsx" tests/featured-listings-tier-type.test.ts` returns ≥1 match
    - `grep -E "listing_tier" tests/featured-listings-tier-type.test.ts` returns ≥3 matches (positive + negatives + comments)
    - `pnpm test tests/featured-listings-tier-type.test.ts --run` exits non-zero (RED state expected — at least the positive `.in('listing_tier', [2, 3])` assertion fails because the source still has the string form at line 133)
    - vitest output mentions the regex `\.in\(\s*'listing_tier'\s*,\s*\[\s*2\s*,\s*3\s*\]` not matched OR shows the negative-guard regex DID match (meaning the string literal IS present pre-fix)
  </acceptance_criteria>
  <done>
    Spec file exists; loads without syntax errors; runs RED because `FeaturedListings.tsx:133` still has the string form `['featured', 'premium']`. Wave 1 plan 22-02 will flip this GREEN.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Create tests/jobsearch-accommodation-remap.test.ts (HOMEBUG-03 RED spec)</name>
  <files>tests/jobsearch-accommodation-remap.test.ts</files>
  <read_first>
    - src/pages/jobs/JobSearch.tsx (lines 273-279 — current `.overlaps()` handler with raw URL values)
    - src/components/ui/FilterSidebar.tsx (lines 43-49 — `ACCOMMODATION_OPTIONS` UI emission layer)
    - src/types/domain.ts:327-336 (`ACCOMMODATION_EXTRAS_OPTIONS` Title Case values — the DB-stored format)
    - supabase/migrations/013_phase8_wizard_fields.sql lines 17-44 (column shape + Title Case migration values)
    - .planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md §Pattern 3 + §Example 3 (3-layer mismatch + fix shape)
    - tests/saved-search-load-integration.test.tsx (canonical static-source pattern)
    - .planning/phases/22-pre-launch-p0-closure/22-VALIDATION.md Wave 0 Requirements row 3
  </read_first>
  <behavior>
    - Test 1: `JobSearch.tsx` contains a module-level `ACCOMMODATION_FILTER_TO_DB` constant declaration (asserts the lookup table exists).
    - Test 2: the constant maps at minimum 3 keys — `couples → 'Couples welcome'`, `family → 'Family welcome'`, `pet_friendly → 'Pets allowed'` (asserts the value shape matches `src/types/domain.ts:327-336` Title Case format).
    - Test 3: the `.overlaps('employer_profiles.accommodation_extras', ...)` call is fed a remapped variable (NOT the raw `accommodationTypes` array from `searchParams.getAll(...)` directly) — asserts the remap is wired into the handler, not just defined as dead code.
  </behavior>
  <action>
    Create `tests/jobsearch-accommodation-remap.test.ts` using the static-source readFileSync regression-guard pattern. Use this body verbatim:

    ```typescript
    /**
     * HOMEBUG-03 — accommodation filter Layer 2 remap static-source guard
     *
     * RED at scaffold time (Wave 0); flips GREEN when Wave 1 plan 22-03 adds
     * the ACCOMMODATION_FILTER_TO_DB lookup constant and wires it into the
     * .overlaps() call in fetchJobs (replacing the raw searchParams pass-through).
     *
     * Pattern: pure-Node readFileSync + regex assertions. <5ms runtime.
     * Reference: .planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md §Pattern 3.
     */
    import { describe, it, expect } from 'vitest'
    import { readFileSync } from 'node:fs'
    import { resolve } from 'node:path'

    const SOURCE_PATH = resolve(__dirname, '..', 'src', 'pages', 'jobs', 'JobSearch.tsx')
    const source = readFileSync(SOURCE_PATH, 'utf-8')

    describe('HOMEBUG-03 — accommodation filter Layer 2 remap', () => {
      it('declares ACCOMMODATION_FILTER_TO_DB lookup constant at module level', () => {
        // POST-FIX shape (RED until Wave 1 plan 22-03 ships):
        expect(source).toMatch(/const\s+ACCOMMODATION_FILTER_TO_DB\s*:\s*Record<string,\s*string>\s*=\s*\{/)
      })

      it('maps URL param values to Title Case DB values (couples → "Couples welcome", family → "Family welcome", pet_friendly → "Pets allowed")', () => {
        // Asserts the 3 minimum mappings (Title Case values match src/types/domain.ts:327-336).
        // Open Question from research (house/cottage TYPE values) is OUT OF SCOPE per planner discretion —
        // those flow through a different column (accommodation_type singular, not accommodation_extras array).
        expect(source).toMatch(/couples\s*:\s*'Couples welcome'/)
        expect(source).toMatch(/family\s*:\s*'Family welcome'/)
        expect(source).toMatch(/pet_friendly\s*:\s*'Pets allowed'/)
      })

      it('uses ACCOMMODATION_FILTER_TO_DB in the .overlaps() call (lookup is wired, not dead code)', () => {
        // After the fix, fetchJobs maps accommodationTypes through the lookup before .overlaps().
        // The lookup constant must be REFERENCED (not just declared) for the bug to be closed.
        expect(source).toMatch(/ACCOMMODATION_FILTER_TO_DB\[/)
      })

      it('does NOT pass raw searchParams.getAll values directly to .overlaps(employer_profiles.accommodation_extras) (the pre-fix shape)', () => {
        // Negative guard against pre-fix shape — the direct pass-through of `accommodationTypes` (raw
        // URL values) into .overlaps() is exactly the bug.
        // We assert the pattern `.overlaps('employer_profiles.accommodation_extras', accommodationTypes)` is GONE.
        expect(source).not.toMatch(/\.overlaps\(\s*'employer_profiles\.accommodation_extras'\s*,\s*accommodationTypes\s*\)/)
      })
    })
    ```

    DO NOT modify `src/pages/jobs/JobSearch.tsx` in this task.
  </action>
  <verify>
    <automated>pnpm test tests/jobsearch-accommodation-remap.test.ts --run 2>&1 | tail -30 — expect all 4 assertions to FAIL RED (constant doesn't exist yet; remap not wired; pre-fix shape IS still present)</automated>
  </verify>
  <acceptance_criteria>
    - `test -f tests/jobsearch-accommodation-remap.test.ts` exits 0
    - `grep -E "ACCOMMODATION_FILTER_TO_DB" tests/jobsearch-accommodation-remap.test.ts` returns ≥3 matches
    - `grep -E "Couples welcome|Family welcome|Pets allowed" tests/jobsearch-accommodation-remap.test.ts` returns ≥3 matches (one per Title Case value)
    - `grep -E "readFileSync" tests/jobsearch-accommodation-remap.test.ts` returns ≥1 match
    - `pnpm test tests/jobsearch-accommodation-remap.test.ts --run` exits non-zero (RED state expected — at least 3 of 4 assertions fail; the negative-guard test fails because raw pass-through IS still present)
    - vitest output references the missing `ACCOMMODATION_FILTER_TO_DB` constant
  </acceptance_criteria>
  <done>
    Spec file exists; loads without syntax errors; runs RED because the lookup constant and remap are not yet implemented. Wave 1 plan 22-03 will flip this GREEN.
  </done>
</task>

<task type="auto">
  <name>Task 4: Create tests/p0-prod-smoke-UAT.md (operator UAT checklist for plan 22-04)</name>
  <files>tests/p0-prod-smoke-UAT.md</files>
  <read_first>
    - .planning/phases/22-pre-launch-p0-closure/22-VALIDATION.md §Manual-Only Verifications (5 rows — verbatim source for the 5 steps)
    - .planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md §Pattern 4 (HOMEBUG-01 + UXBUG-01 verification recipe) + §Pitfall 1 (UXBUG-01 Step 4 vs Step 7)
    - .planning/REQUIREMENTS.md lines 77, 99-103 (verbatim UXBUG-01 + HOMEBUG-01/02/03 + SIGNUP-01 text)
    - src/types/domain.ts:327-336 (the 8 ACCOMMODATION_EXTRAS_OPTIONS — UXBUG-01 step references the exact labels)
  </read_first>
  <action>
    Create `tests/p0-prod-smoke-UAT.md` as a numbered 5-step operator checklist. Format follows the precedent of `tests/admin-bootstrap-UAT.md` (existing — Phase 20-08) and `tests/saved-search-list-UAT.md` if present (Phase 17 precedent). Each step has: Step N heading; Browser URL; What to do; Network expectation; DOM expectation; Pass/Fail box.

    Use this verbatim body:

    ```markdown
    # Phase 22 — P0 Prod Smoke UAT

    **Purpose:** Operator-driven verification of all 5 P0 fixes against the deployed production frontend at `https://top-farms.vercel.app/`. Executed in plan 22-04 Wave 2 AFTER Wave 1 fixes (22-01, 22-02, 22-03) have been pushed to main and Vercel deployment is confirmed live.

    **Prerequisite:** Operator has typed `authorize push` in chat and Wave 1 fixes are deployed live (Vercel deployment URL returns 200 on `/`).

    **Test accounts required:** None for steps 1-4 (anonymous). Step 5 requires sign-in as an employer test account (use any existing UAT employer; if onboarding is already complete, navigate via `/dashboard/employer` → edit profile to reach Step 4).

    ---

    ## Step 1 — SIGNUP-01 (toast persistence)

    **URL:** `https://top-farms.vercel.app/signup`

    **What to do:**
    1. Open the URL in a fresh incognito/private window.
    2. Click the role selector (either "Seeker" or "Employer" — does not affect SIGNUP-01).
    3. In the email field, enter an obviously-undeliverable address: `not_an_email@example.test`
    4. In the password field, enter a valid-shape password: `ValidPass123!`
    5. Click **Create account**.
    6. Open DevTools → Network tab BEFORE clicking. Find the `POST .../auth/v1/signup` request after click.

    **Network expectation:**
    - `POST https://inlagtgpynemhipnqvty.supabase.co/auth/v1/signup` returns status `400` with response body containing `"code":"email_address_invalid"` OR `"error_code":"email_address_invalid"` OR message `"Unable to validate email address"`.

    **DOM expectation:**
    - A Sonner toast appears at top-right with red error styling and text like `"Unable to validate email address: invalid format"` (exact text depends on Supabase response).
    - **CRITICAL: the toast remains visible for at least 10 seconds without auto-dismissing.**
    - The toast has a close affordance (X button or click-to-dismiss area).
    - The submit button reverts from loading state back to "Create account".

    **Pass:** [ ]  **Fail:** [ ]  **Notes:** _____

    ---

    ## Step 2 — HOMEBUG-02 (featured listings query)

    **URL:** `https://top-farms.vercel.app/`

    **What to do:**
    1. Open the URL in a fresh incognito/private window.
    2. Open DevTools → Network tab → filter by `jobs?` BEFORE the page finishes loading (refresh if needed).
    3. Scroll to the "Live Listings" / featured-jobs section.

    **Network expectation:**
    - `GET https://inlagtgpynemhipnqvty.supabase.co/rest/v1/jobs?select=...&status=eq.active&listing_tier=in.%282%2C3%29&order=created_at.desc&limit=6` returns status `200` (NOT 400).
    - The URL must contain `listing_tier=in.(2,3)` (URL-encoded as `listing_tier=in.%282%2C3%29`), NOT `listing_tier=in.("featured","premium")`.
    - The response body is a JSON array (possibly empty if no featured jobs in DB — empty array is acceptable; the bug is the 400, not the count).

    **DOM expectation:**
    - The featured listings section renders WITHOUT a blank/broken-image state. If at least one featured/premium job exists, cards render with Title + Region + Salary + Premium/Featured badge.
    - If no featured jobs exist, the fallback query fires and renders up to 3 recent active jobs (per FeaturedListings.tsx:144-151 fallback path).

    **Pass:** [ ]  **Fail:** [ ]  **Notes:** _____

    ---

    ## Step 3 — HOMEBUG-03 (accommodation filter)

    **URL:** `https://top-farms.vercel.app/jobs`

    **What to do:**
    1. Open the URL in a fresh incognito/private window (anonymous is fine).
    2. Open DevTools → Network tab → filter by `jobs?` BEFORE toggling any filter.
    3. Open the FilterSidebar (left side on desktop; tap "Filters" on mobile).
    4. Under "Accommodation" section, toggle the **Couples welcome** checkbox.
    5. Observe the URL parameter change and the resulting Network request.
    6. Then toggle the **Pet-friendly** checkbox in addition.
    7. Observe the URL parameter change and the resulting Network request.

    **Network expectation:**
    - After toggling Couples: the URL bar shows `?accommodation_type=couples`. The PostgREST `GET .../jobs?...employer_profiles.accommodation_extras=ov.{Couples+welcome}` (URL-encoded as `ov.%7BCouples+welcome%7D`) returns status `200`.
    - After toggling Pet-friendly: URL becomes `?accommodation_type=couples&accommodation_type=pet_friendly`. PostgREST request has `accommodation_extras=ov.{Couples+welcome,Pets+allowed}` (URL-encoded) and returns `200`.
    - Neither request returns `400`.

    **DOM expectation:**
    - The job listing area renders results (or shows the empty-state "No jobs found" copy if filter produces zero matches — empty is acceptable; the bug is the 400, not the count).
    - No console errors related to PostgREST 400.

    **Pass:** [ ]  **Fail:** [ ]  **Notes:** _____

    ---

    ## Step 4 — HOMEBUG-01 (platform stats RPC)

    **URL:** `https://top-farms.vercel.app/`

    **What to do:**
    1. Open the URL in a fresh incognito/private window.
    2. Open DevTools → Network tab → filter by `get_platform_stats` BEFORE the page finishes loading (refresh if needed).
    3. Scroll to the CountersSection widget (typically near the top of the home page) showing three counter blocks: "Jobs Posted" / "Workers Registered" / "Matches Made".

    **Network expectation:**
    - `POST https://inlagtgpynemhipnqvty.supabase.co/rest/v1/rpc/get_platform_stats` returns status `200`.
    - Response body is a JSON object of shape `{ "jobs": N, "seekers": M, "matches": K }` where N, M, K are non-negative integers (may be 0 if DB is empty, but the SHAPE must be present — NOT 404, NOT 400).

    **DOM expectation:**
    - The three counter blocks render with NUMERIC values (animated count-up from 0 to target via `useCountUp` over ~1800ms). Final state is three legible numbers, not three dashes or three zeroes-that-never-tick.

    **Pass:** [ ]  **Fail:** [ ]  **Notes:** _____

    ---

    ## Step 5 — UXBUG-01 (accommodation chips, Step 4 + Step 7)

    **URL:** `https://top-farms.vercel.app/onboarding/employer/step-4` (after sign-in)

    **What to do:**
    1. Sign in as an employer test account (any existing UAT employer).
    2. Navigate to onboarding **Step 4 — Accommodation**. If onboarding is already complete, you may need to use the in-progress profile editor at `/dashboard/employer/profile` → "Edit Step 4" (path may vary; the operator should know the route from prior UAT sessions).
    3. Observe the ChipSelector for "Accommodation extras".

    **DOM expectation (Step 4 write side):**
    - **8 chips render** with EXACTLY these Title Case labels (matches `src/types/domain.ts:327-336`):
      1. Pets allowed
      2. Couples welcome
      3. Family welcome
      4. Utilities included
      5. Furnished
      6. Garden
      7. Garage
      8. Internet included
    - Selecting 2 chips (e.g., "Couples welcome" + "Pets allowed") toggles their visual state (active background).
    - Clicking "Continue" persists the selection (no PostgREST 400 in Network tab on the underlying UPDATE).

    **Cross-step verification (Step 7 read side — Pitfall 1 from research):**
    4. Advance through Steps 5 / 6 (whatever you can skip-fill).
    5. Land on **Step 7 — Preview**.
    6. Locate the accommodation summary block in the preview.

    **DOM expectation (Step 7 read side):**
    - The 2 chips selected on Step 4 (e.g., "Couples welcome" + "Pets allowed") appear in the preview summary as their Title Case labels.
    - No "undefined" / "null" / missing values.

    **Network expectation (across both steps):**
    - All PostgREST UPDATE/SELECT calls against `employer_profiles` return `200` — no `400` on the `accommodation_extras` column read or write.

    **Pass:** [ ]  **Fail:** [ ]  **Notes:** _____

    ---

    ## Overall Verdict

    - [ ] All 5 steps PASS — Phase 22 P0 closure verified empirically against production.
    - [ ] N steps PASS, M steps FAIL — note which fail and gather Network/DOM evidence; route to gap-closure follow-up plan.

    **Operator signature:** _____  **Date:** _____  **Vercel deployment commit SHA:** _____
    ```
  </action>
  <verify>
    <automated>test -f tests/p0-prod-smoke-UAT.md && grep -cE "^## Step [1-5] —" tests/p0-prod-smoke-UAT.md — expect output `5`</automated>
  </verify>
  <acceptance_criteria>
    - `test -f tests/p0-prod-smoke-UAT.md` exits 0
    - `grep -cE "^## Step [1-5] —" tests/p0-prod-smoke-UAT.md` returns exactly `5`
    - `grep -E "https://top-farms.vercel.app" tests/p0-prod-smoke-UAT.md` returns ≥4 matches (one per anonymous-accessible step)
    - `grep -E "Network expectation" tests/p0-prod-smoke-UAT.md` returns ≥5 matches
    - `grep -E "DOM expectation" tests/p0-prod-smoke-UAT.md` returns ≥5 matches
    - `grep -E "Pets allowed|Couples welcome|Family welcome|Utilities included|Furnished|Garden|Garage|Internet included" tests/p0-prod-smoke-UAT.md` returns 8 matches (exactly the 8 ACCOMMODATION_EXTRAS_OPTIONS labels)
    - `grep -E "listing_tier=in" tests/p0-prod-smoke-UAT.md` returns ≥1 match (Step 2 PostgREST URL contains the expected int-form filter)
    - `grep -E "get_platform_stats" tests/p0-prod-smoke-UAT.md` returns ≥1 match (Step 4 references the RPC)
  </acceptance_criteria>
  <done>
    UAT markdown exists with 5 numbered operator steps; each step has Browser URL + Network expectation + DOM expectation + Pass/Fail box. Plan 22-04 references this file as the canonical UAT script.
  </done>
</task>

</tasks>

<verification>
After all 4 tasks complete:

```bash
# All 4 files present
test -f tests/signup-toast-persistence.test.tsx && \
  test -f tests/featured-listings-tier-type.test.ts && \
  test -f tests/jobsearch-accommodation-remap.test.ts && \
  test -f tests/p0-prod-smoke-UAT.md && echo "OK: 4 files"

# Vitest can LOAD all 3 specs without syntax/import errors
pnpm test tests/signup-toast-persistence.test.tsx tests/featured-listings-tier-type.test.ts tests/jobsearch-accommodation-remap.test.ts --run 2>&1 | tail -40

# Expected: at least 3 RED tests (one per .test.* file). Full suite may still pass overall since we're only running these 3 files.
```

The 3 spec files MUST be in RED state at this wave's close — they are the failing assertions Wave 1 will make pass. If they accidentally pass at scaffold time, the assertion targets are wrong (likely matching pre-fix shape; need re-checking).
</verification>

<success_criteria>
- All 4 files exist under `tests/`
- 3 vitest specs load and run without errors (no missing imports, no syntax issues)
- 3 vitest specs are in RED state (assertions fail because the source files have not yet been fixed by Wave 1)
- UAT markdown contains 5 numbered steps with full operator script
- `pnpm test` overall exit code may be non-zero (expected — RED specs); but NOT due to load errors
- Single atomic commit per CLAUDE §4 covering all 4 files
</success_criteria>

<output>
After completion, create `.planning/phases/22-pre-launch-p0-closure/22-00-test-scaffold-SUMMARY.md` documenting:
- 4 files created with byte counts
- vitest exit code from running the 3 specs (proving RED state)
- Confirmation that no `pnpm test` LOAD errors occurred (only assertion failures)
- Atomic commit SHA
</output>
