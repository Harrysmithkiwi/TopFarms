# Phase 18.1 — Out-of-Scope Discoveries

Items observed by 18.1 executors that are NOT in their scope. Logged here for the
phase orchestrator / sibling executor / verifier to pick up.

## 2026-05-08 — Sibling 18.1-02 transform failure observed by 18.1-03 executor

While running `pnpm test` to verify the 18.1-03 (match_scores cleanup trigger)
work landed cleanly, the full suite surfaced one failed file:

```
FAIL tests/mark-job-filled-rpc.test.ts
Error: Transform failed with 1 error:
tests/mark-job-filled-rpc.test.ts:49:28: ERROR: Expected ">" but found "jobId"
```

**Root cause (apparent):** The file contains JSX (`<MarkFilledModal jobId="job-1"
isOpen onClose={onClose} onFilled={onFilled} />`) inside a `.ts` extension. esbuild
won't transform JSX in a `.ts` file. The companion test for sibling plan 18.1-02.

**Scope ruling:** This is **18.1-02's file**, modified during sibling executor's
parallel run. Per 18.1-03 executor's SCOPE BOUNDARY rule (only fix issues DIRECTLY
caused by current task's changes), 18.1-03 does NOT touch this file.

**Recommended fix (for 18.1-02 executor or verifier):**
- Rename to `tests/mark-job-filled-rpc.test.tsx` (matches `tests/saved-search-modal.test.tsx`
  precedent), OR
- Refactor to React-API-only (no JSX literal) — e.g. `React.createElement(MarkFilledModal, { ... })`.

**18.1-03 verification posture:** With this sibling file excluded, the full suite is
`37 passed | 9 skipped | 242 passed | 121 todo | 0 failures` — 18.1-03's contribution
is empirically GREEN. Confirmed via `pnpm exec vitest run --exclude tests/mark-job-filled-rpc.test.ts`.

### CLOSED 2026-05-08 by 18.1-02 executor

Resolved by Rule 1 auto-fix: `git mv tests/mark-job-filled-rpc.test.ts
tests/mark-job-filled-rpc.test.tsx`. Plan 18.1-02 originally listed the file as
`.test.ts` because the Wave 0 stub (no JSX) was created with that extension; the
Wave 1 GREEN body brought in JSX which esbuild rejects in `.ts`. Sibling
`.test.tsx` precedent: `tests/saved-search-modal.test.tsx`,
`tests/admin-login.test.tsx` (every JSX-rendering test in the repo).

Post-fix: `pnpm exec vitest run tests/mark-job-filled-rpc.test.tsx` → 3 passed.
Full suite (post 18.1-01 + 18.1-02 + 18.1-03 land): 245 passed | 121 todo | 0 failures.

## 2026-05-08 — Pre-existing tsc errors in 5 unrelated files

`pnpm exec tsc -b` surfaces 7 errors in files unrelated to Phase 18.1:

```
src/pages/admin/PlacementPipeline.tsx(30,10): TS6133 'stripeUrl' unused
src/pages/admin/PlacementPipeline.tsx(69,19): TS2344 PlacementRow Record<string, unknown> mismatch
src/pages/admin/SeekerList.tsx(4,1): TS6133 'Tag' unused
src/pages/admin/SeekerList.tsx(45,19): TS2344 SeekerRow Record<string, unknown> mismatch
src/pages/dashboard/seeker/MyApplications.tsx(149,40): TS6133 'applicationId' unused
src/pages/jobs/JobDetail.tsx(369,9): TS6133 'isOwnerEmployer' unused
src/pages/onboarding/EmployerOnboarding.tsx(227,32): TS2322 ownership_type union mismatch
```

**Empirical proof of pre-existing:** `git stash && pnpm exec tsc -b` reproduces
all 7 errors on `main` before any 18.1-02 changes. **Not caused by my work**.

**Scope ruling:** Out of scope for 18.1-02 per SCOPE BOUNDARY rule. Recommend
Phase 18.2 (Code Quality & UX Polish) lint sweep or a focused tsc-cleanup
plan. None of these files are touched by Phase 18.1 plans 01/02/03/04/05/06.
