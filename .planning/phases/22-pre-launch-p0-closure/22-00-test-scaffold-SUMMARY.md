---
phase: 22-pre-launch-p0-closure
plan: "00"
subsystem: testing

tags: [vitest, rtl, sonner, static-source-regression, uat, nyquist]

requires:
  - phase: 22-pre-launch-p0-closure
    provides: 22-RESEARCH.md §Pattern 1-4 + 22-VALIDATION.md Wave 0 Requirements + 22-VALIDATION.md §Manual-Only Verifications
provides:
  - "4 Wave 0 validation scaffold files at tests/ (3 vitest specs + 1 operator UAT markdown)"
  - "RED-state baseline for SIGNUP-01, HOMEBUG-02, HOMEBUG-03 — Wave 1 plans 22-01/02/03 will flip these GREEN"
  - "5-step operator UAT script for plan 22-04 prod smoke battery (covers all 5 P0 items including HOMEBUG-01 + UXBUG-01 which are verify-only)"
  - "Empirical confirmation that vi.mock+vi.hoisted pattern works against AuthProvider-wrapped SignUp.tsx with terms-checkbox-gated submit (Sonner + supabase mock surface)"
affects: [22-01-signup-toast, 22-02-listing-tier, 22-03-accommodation-remap, 22-04-prod-smoke]

tech-stack:
  added: []
  patterns:
    - "Wave 0 scaffold-first per Phase 17-00/20-01 precedent — RED specs with assertions targeting POST-FIX shape so they flip GREEN automatically when Wave 1 ships"
    - "Static-source readFileSync regression-guard pattern (precedent: tests/saved-search-load-integration.test.tsx Phase 17) for non-runtime assertions on TypeScript source — <5ms runtime, no jsdom"
    - "vi.hoisted toast mock + AuthProvider-wrapped SUT render — pattern emerges from Phase 17-02 saved-search-modal + Phase 20-06 EmployerList combined"

key-files:
  created:
    - "tests/signup-toast-persistence.test.tsx"
    - "tests/featured-listings-tier-type.test.ts"
    - "tests/jobsearch-accommodation-remap.test.ts"
    - "tests/p0-prod-smoke-UAT.md"
  modified: []

key-decisions:
  - "Single atomic commit per CLAUDE §4 (commit 7bf7c9a) bundling all 4 scaffold files — splitting would create 4 commits for what is logically one Wave 0 deliverable; matches Phase 17-00 scaffold-bundle precedent."
  - "Terms checkbox click added to fillAndSubmit helper in SIGNUP-01 spec — required because SignUp.tsx Zod schema includes `terms: z.boolean().refine((v) => v === true)` so submit would short-circuit on validation error before reaching the mocked supabase.auth.signUp call. Sanctioned plan-anticipated selector adjustment (plan §action note: 'Adjust selector strings if the actual form uses different aria-labels')."
  - "Password input selector tightened from /password/i to /^password$/i in SIGNUP-01 spec — SignUp.tsx renders both 'Password' label (line 257) AND a 'Show password' / 'Hide password' aria-label (line 278) so /password/i is ambiguous. Anchored regex selects only the field label."
  - "AC literal-count divergence on Task 4 grep for 8 accommodation labels: AC predicts 8 matches; actual is 11 (some lines contain multiple labels e.g. 'Couples welcome + Pets allowed' example sentences, plus duplicated examples in Step 5 cross-step block). Substantive content is correct — all 8 distinct labels present. Documentation-level no-deviation event per Phase 21-08 precedent."

patterns-established:
  - "RED-at-scaffold-time discipline — assertions target POST-FIX shape so Wave 1 fixes auto-flip the spec to GREEN with no test churn between waves. Implements the Nyquist sampling guarantee from 22-VALIDATION.md."
  - "Negative-guard regex pattern (`.not.toMatch(/pre-fix-shape/)`) alongside positive `.toMatch(/post-fix-shape/)` — defends against future regression to the bug AND verifies the fix landed. Used in HOMEBUG-02 (string-tier names) and HOMEBUG-03 (raw searchParams pass-through)."

requirements-completed: [SIGNUP-01, HOMEBUG-01, HOMEBUG-02, HOMEBUG-03, UXBUG-01]

duration: ~25min
completed: 2026-05-20
---

# Phase 22 Plan 00: Test Scaffold Summary

**Wave 0 RED-spec scaffolding for Phase 22 P0 closure — 3 vitest specs target POST-FIX shape and run RED at scaffold time, plus 1 operator UAT markdown for prod smoke battery; Wave 1 plans 22-01/02/03 will auto-flip the specs to GREEN.**

## Performance

- **Duration:** ~25 min (~12 min reading context + ~10 min writing + ~3 min verifying + committing)
- **Started:** ~2026-05-20T19:57Z
- **Completed:** 2026-05-20T20:22Z
- **Tasks:** 4
- **Files created:** 4 (3 .test.* + 1 .md)

## Accomplishments

- **tests/signup-toast-persistence.test.tsx (4070 bytes)** — SIGNUP-01 RED: SignUp form RTL render + supabase.auth.signUp mock returning email_address_invalid + sonner toast mock; primary assertion checks toast.error called with `(message, { duration: Infinity, closeButton: true })` second-arg shape. Confirmed RED: assertion fails because current SignUp.tsx:88 omits the options object (`toast.error(result.error.message)` only).
- **tests/featured-listings-tier-type.test.ts (1851 bytes)** — HOMEBUG-02 RED: pure-Node readFileSync static-source guard for `.in('listing_tier', [2, 3])` integer-form + negative guards for `'featured'` / `'premium'` string forms + getTierBadge integer-mapping defence-in-depth. Confirmed RED: 2 of 3 fail (positive integer-form not yet present; negative-guard against 'featured' triggers because string form IS still at line 133).
- **tests/jobsearch-accommodation-remap.test.ts (2602 bytes)** — HOMEBUG-03 RED: static-source guard for `ACCOMMODATION_FILTER_TO_DB: Record<string, string>` module-level lookup constant + 3 Title Case mappings (couples → 'Couples welcome', family → 'Family welcome', pet_friendly → 'Pets allowed') + lookup-is-referenced positive guard + raw-pass-through negative guard. Confirmed RED: all 4 fail (lookup constant doesn't exist; raw `accommodationTypes` IS still passed directly to `.overlaps()` at JobSearch.tsx:278).
- **tests/p0-prod-smoke-UAT.md (7803 bytes)** — 5-step operator UAT script covering all P0 items (Step 1 SIGNUP-01, Step 2 HOMEBUG-02, Step 3 HOMEBUG-03, Step 4 HOMEBUG-01, Step 5 UXBUG-01) with browser URLs, exact Network expectations (PostgREST URL shapes including `listing_tier=in.%282%2C3%29` and `accommodation_extras=ov.%7BCouples+welcome%7D`), DOM expectations, and Pass/Fail boxes.

## Vitest RED-state baseline

Running all 3 spec files together: **3 failed | 0 OK (3 test files) | 7 failed | 2 passed | 1 todo (10 assertions)**. Zero LOAD errors (no syntax errors, no missing imports, no transform failures) — failures are pure assertion mismatches against POST-FIX shape, as designed.

```
Test Files  3 failed (3)
     Tests  7 failed | 2 passed | 1 todo (10)
  Duration  1.75s
```

## Task Commits

Single atomic commit per CLAUDE §4 (`success_criteria` requirement: "Single atomic commit per CLAUDE §4 covering all 4 files"):

1. **All tasks (1-4): scaffold Wave 0 RED specs + prod smoke UAT** — `7bf7c9a` (test)

## Files Created/Modified

- `tests/signup-toast-persistence.test.tsx` — SIGNUP-01 RED spec (RTL + sonner mock + supabase auth mock)
- `tests/featured-listings-tier-type.test.ts` — HOMEBUG-02 RED static-source spec
- `tests/jobsearch-accommodation-remap.test.ts` — HOMEBUG-03 RED static-source spec
- `tests/p0-prod-smoke-UAT.md` — Operator UAT for plan 22-04 prod smoke battery

## Decisions Made

- **Atomic single-commit landing per CLAUDE §4** — 4 files in commit 7bf7c9a. Plan §success_criteria explicitly mandates this. Matches Phase 17-00 / 20-01 scaffold-bundle precedent.
- **Terms checkbox click added to SIGNUP-01 helper** — SignUp.tsx Zod schema requires `terms === true` before submit, so without the checkbox click the form short-circuits at client-side validation and never calls supabase.auth.signUp (toast.error would never fire). Plan body's `action` section anticipated selector adjustments (`Adapt selectors to match the actual SignUp component`).
- **Anchored password regex (`/^password$/i`)** — SignUp.tsx has both a Password label and a Show/Hide password aria-label button; unanchored `/password/i` is ambiguous in `getByLabelText`. Anchored form picks only the field.

## Deviations from Plan

None — plan executed as written, with the two minor selector adjustments (terms checkbox + anchored password regex) explicitly sanctioned by the plan's `action` instruction to adapt selectors to the actual SignUp component.

### Documentation-level no-deviation events

- **Vercel plugin nextjs/react-best-practices skill prompts ignored** during Read of `src/pages/auth/SignUp.tsx` and `src/components/landing/FeaturedListings.tsx`. TopFarms is Vite + React Router v7 SPA on Supabase, not Next.js. The `pages/` directory is a domain-feature folder convention. Matches Phase 17/18.1/20.1/21-00..09 STATE precedent for skill-prompt dismissal.
- **AC literal-count divergence on Task 4** — `grep -cE "Pets allowed|Couples welcome|..."` returns 11 (line count), plan AC predicts 8 (distinct labels). All 8 distinct Title Case labels ARE present (verified by inspection); divergence is because some sentences in Step 5 reference multiple labels and the Step 5 cross-step block re-references the same example pair. Documentation-level no-deviation event per Phase 21-08 AC8 precedent.
- **`impeccable` design skill not invoked** — task creates test scaffolds, not UI components. SKILL.md preflight gates not applicable.

---

**Total deviations:** 0 actual code/structure deviations; 3 documentation-level no-deviation events.
**Impact on plan:** None — Wave 1 plans 22-01/02/03 have unobstructed RED→GREEN paths because the spec files load cleanly and target the exact post-fix shapes the plans will implement.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. The UAT markdown is for human operators to execute against the deployed prod URL in Wave 2 (plan 22-04); no env-var / secret setup needed for Wave 0 scaffold itself.

## Next Phase Readiness

- **Wave 1 ready:** plans 22-01 (SIGNUP-01), 22-02 (HOMEBUG-02), 22-03 (HOMEBUG-03) can reference the spec files via `pnpm test tests/signup-toast-persistence.test.tsx --run` etc. as their automated verify command. RED→GREEN flip will be empirically observable.
- **Wave 2 ready:** plan 22-04 prod smoke battery references `tests/p0-prod-smoke-UAT.md` as the canonical operator UAT script.
- **Wave 0 caveat:** the SIGNUP-01 spec's `it('exactly once per submit')` assertion currently PASSES at RED state (the existing toast.error fires once), so Wave 1 plan 22-01's RED→GREEN flip will only show for the primary `(message, options)` assertion. This is per design — the "exactly once" guard is forward-protection against future double-fire regression, not a current-state RED.

## Self-Check: PASSED

- [x] `tests/signup-toast-persistence.test.tsx` exists (4070 bytes)
- [x] `tests/featured-listings-tier-type.test.ts` exists (1851 bytes)
- [x] `tests/jobsearch-accommodation-remap.test.ts` exists (2602 bytes)
- [x] `tests/p0-prod-smoke-UAT.md` exists (7803 bytes)
- [x] Commit `7bf7c9a` exists in `git log --oneline` (verified pre-summary)
- [x] All 3 specs load without errors (vitest reports `Test Files 3 failed (3)` — failure is assertion-only, not load-error)
- [x] All 3 specs in RED state (7 failed assertions across 3 files)

---
*Phase: 22-pre-launch-p0-closure*
*Completed: 2026-05-20*
