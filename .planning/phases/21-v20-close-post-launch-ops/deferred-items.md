# Phase 21 — Deferred Items (cross-plan observations)

## 21-02 executor (2026-05-17)

**Observation: pre-staged plan-21-03 Edge Function work in working tree at executor start.**

When plan 21-02 began, `git status` showed an unstaged modification to
`supabase/functions/get-applicant-document-url/index.ts`. Inspection
(`git diff` head -60) revealed the diff implements the admin-bypass
branch (early-exit when `roleRow.role === 'admin'`, mints signed URL
for any `seeker_documents.id`) that is plan 21-03's scope per the
phase plan index.

**Source uncertainty:** May be leftover from a prior session, may be a
hook-injection artefact, may be a parallel-wave bleed. Diagnosis
deferred to plan 21-03's executor — they can either (a) accept the
existing diff as-is if it matches their plan body, or (b) regenerate
fresh from their plan spec.

**21-02 disposition:** Out of scope per the plan's `files_modified`
frontmatter (only migration 033 + admin-doc-queue.test.tsx). NOT
touched. NOT committed under 21-02. Per CLAUDE §4 + §8, no destructive
`git checkout --` issued. The change remains in the working tree.

**Action for plan 21-03 executor:** Read `git diff
supabase/functions/get-applicant-document-url/index.ts` first;
diagnose against your plan body (CLAUDE §3); decide whether to accept
or regenerate.

## 21-03 executor disposition (2026-05-17)

**Disposition: regenerated fresh from plan spec.** Pre-staged diff
discarded by re-applying both edits via `Edit` tool against the HEAD
file content (which was identical to the pre-staged base). Final diff
matches plan spec verbatim (51 insertions, 3 deletions — within
≤60/≤5 budget per AC8). All 8 grep ACs PASS; 7-test static-source guard
GREEN; full suite GREEN (267 passed | 137 todo). BFIX-05 docblock +
gateway-trust JWT decode + employer 5-layer gate all byte-frozen.

**Plan-internal AC2/AC3 conflict surfaced:** AC2 mandates BFIX-05
docblock preserved (which contains `adminClient.auth.getUser(token)`
substring as documented anti-pattern). AC3 expects 0 occurrences of
that substring. Cannot both be true. Resolution: kept docblock (load-
bearing — AUTH-RETRO Arc 3 prevention); test strips comments before
asserting zero EXECUTABLE calls. Stronger regression guard than literal
plan spec. Logged as deviation Rule 2.

