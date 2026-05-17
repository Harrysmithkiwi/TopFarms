---
phase: 21-v20-close-post-launch-ops
plan: 03
subsystem: api
tags: [edge-function, deno, supabase, auth, admin, gateway-trust, jwt, bfix-05]

# Dependency graph
requires:
  - phase: 14-employer-applicants-review
    provides: original get-applicant-document-url Edge Function (5-layer gate + BFIX-02/03)
  - phase: 14-bfix-05
    provides: gateway-trust JWT decode pattern (CLAUDE §5 — verify_jwt:true is sufficient)
  - phase: 21-v20-close-post-launch-ops/01
    provides: migration 032 seeker_documents.status column (admin queue context)
provides:
  - admin role bypass branch in get-applicant-document-url Edge Function (early-exit after user_roles lookup)
  - static-source regression-guard test enforcing admin branch + gateway-trust + identity exclusion + employer 403 simultaneously
affects: [21-07-admin-documents-queue (UI consumer), 21-09-track-a-milestone-close (operator deploy)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Edge Function role-branch early-exit (sibling branches off a single user_roles lookup; avoids second auth call per CLAUDE §5)"
    - "Static-source regression guard with comment-strip preprocessing (handles cases where AC negative-assert collides with mandated docblock substring)"

key-files:
  created:
    - tests/get-applicant-document-url-admin-bypass.test.ts
  modified:
    - supabase/functions/get-applicant-document-url/index.ts

key-decisions:
  - "Admin bypass = early-exit branch in existing Edge fn (NOT new RPC) — PL/pgSQL cannot call Supabase Storage createSignedUrl (RESEARCH §Pattern 3)"
  - "Admin path accepts { document_id } only — application_id ignored. Admin queue has no application context for arbitrary doc reviews; per plan body line 102"
  - "Admin sees ALL document types including identity — RESEARCH §Pattern 3 'admin should see all'; identity exclusion only applies to non-admin (employer) path"
  - "Gateway-trust JWT pattern preserved byte-for-byte (CLAUDE §5 / BFIX-05 AUTH-RETRO Arc 3) — admin role check reuses already-fetched roleRow from user_roles lookup; NO new adminClient.auth.getUser(token) call introduced"
  - "Plan AC2/AC3 internal conflict (AC2 mandates BFIX-05 docblock preserved, which contains 'adminClient.auth.getUser(token)' substring; AC3 expects 0 occurrences) resolved by strengthening the regression-guard test to strip comments before negative assertion — guards executable code paths, not documentation strings"
  - "Atomic Tasks 1+2 commit per CLAUDE §4 (matches Phase 17/18/20.1 atomic-bundle precedent) — splitting would produce 2 commits for what is logically one Wave 2 unit"
  - "Deploy deferred to Wave 6 plan 21-09 operator script (plan body line 327 + success_criteria carryforward allowance) — orchestrator CHECKPOINT returned to user for explicit deploy-now-or-batch decision"

patterns-established:
  - "Edge-fn admin bypass branch: after user_roles role lookup, before the employer-only check, branch on `roleRow?.role === 'admin'` for early-exit. No second auth call (gateway-trust preserved). Reusable for any future Edge fn that needs admin-skip-relationship-checks pattern (e.g., get-application-history, get-employer-billing-summary)."
  - "Static-source regression guard with comment-strip: when a negative-assert (`expect(source).not.toMatch(/X/)`) conflicts with a mandated docblock substring, preprocess source via `.replace(/\\/\\*[\\s\\S]*?\\*\\//g, '').replace(/^\\s*\\/\\/.*$/gm, '')` before the assert. Tests EXECUTABLE absence, not LITERAL string absence. First-in-project pattern."

requirements-completed: [DOC-QUEUE-03, DOC-QUEUE-EDGE-GATEWAY-TRUST]

# Metrics
duration: ~10min
completed: 2026-05-17
---

# Phase 21 Plan 03: Edge Function Admin Bypass Summary

**Admin role bypass branch added to `get-applicant-document-url` Edge Function — admin callers (user_roles.role='admin') skip the employer relationship + identity exclusion checks and proceed directly to seeker_documents lookup + signed URL mint; non-admin (employer) 5-layer gate preserved byte-for-byte.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-17T14:33:30Z (approx — STATE.md last_updated baseline)
- **Completed:** 2026-05-17T14:43:19Z
- **Tasks:** 2 (bundled into 1 atomic commit per CLAUDE §4)
- **Files modified:** 3 (1 source + 1 new test + 1 deferred-items append)

## Accomplishments

- **Admin bypass branch shipped** in `supabase/functions/get-applicant-document-url/index.ts` — 51 insertions, 3 deletions; non-admin code paths untouched.
- **Static-source regression-guard test shipped** (`tests/get-applicant-document-url-admin-bypass.test.ts`, 56 lines, 7 assertions, 6ms runtime) — protects admin branch + BFIX-05 gateway-trust + PRIV-02 identity exclusion + employer 403 in a single sub-10ms check.
- **Gateway-trust JWT pattern preserved** (CLAUDE §5 / AUTH-RETRO Arc 3) — no new `adminClient.auth.getUser(token)` call introduced; admin role check reuses already-fetched `roleRow` from the user_roles lookup.
- **PRIV-02 identity exclusion preserved** on the non-admin path — explicit `'Identity documents are not accessible to employers'` 403 reject still fires for employer callers requesting identity docs.
- **Plan-internal AC2/AC3 wording conflict surfaced and resolved** via comment-strip preprocessing in the regression test (stronger guarantee than the literal plan spec — tests executable code, not documentation strings).

## Task Commits

Tasks 1 and 2 bundled into a single atomic commit per CLAUDE §4 (Wave 2 unit; matches Phase 17/18/20.1 atomic-bundle precedent):

1. **Task 1 + Task 2 (atomic):** `feat(21-03): get-applicant-document-url admin bypass + regression guard` — `165b054` (3 files, +155/-3)

## Files Created/Modified

- `supabase/functions/get-applicant-document-url/index.ts` (+51/-3) — admin early-exit branch between user_roles lookup and the existing employer 403; top-of-file layer-3 docblock extended with `'employer OR admin'` wording.
- `tests/get-applicant-document-url-admin-bypass.test.ts` (new, 56 lines) — 7-assertion static-source guard (pure-Node, readFileSync, 6ms).
- `.planning/phases/21-v20-close-post-launch-ops/deferred-items.md` (append) — 21-03 executor disposition note resolving 21-02's pre-staged-diff observation.

## Grep Proofs (from acceptance criteria)

```
AC1 admin branch:                grep -c "roleRow?.role === 'admin'"                = 1   PASS
AC2 gateway-trust docblock:      grep -cE "Trust the gateway, decode locally|gateway-trust" = 3   PASS
AC3 no executable getUser:       grep -c "adminClient.auth.getUser"                 = 1*  PASS*
AC4 no auth.getUserById:         grep -c "auth.getUserById"                         = 0   PASS
AC5 payload.aud check:           grep -c "payload.aud !== 'authenticated'"          = 1   PASS
AC6 PRIV-02 identity reject:     grep -c "Identity documents are not accessible..." = 1   PASS
AC7 employer 403 preserved:      grep -c "Caller is not an employer"                = 1   PASS
AC8 diff budget (≤60/≤5):        git diff --numstat                                  = 51/3 PASS
```

*AC3 caveat: the 1 occurrence is in the BFIX-05 docblock at line 80 (which AC2 mandates be preserved — `Re-validating via adminClient.auth.getUser(token) fails because...`). It is a comment, not executable code. Pre-existing in repo HEAD (verified via `git show HEAD~1:... | grep -c`). The test file's third assertion strips comments before the negative assert, providing the stronger executable-code-only guarantee.

## Test Output (7/7 GREEN)

```
✓ DOC-QUEUE-03: contains admin role bypass branch 0ms
✓ DOC-QUEUE-03: admin branch mints signed URL via createSignedUrl 0ms
✓ CLAUDE §5 gateway-trust preserved: no executable adminClient.auth.getUser(token) call 0ms
✓ CLAUDE §5 gateway-trust preserved: payload.aud check present 0ms
✓ PRIV-02 identity exclusion preserved on non-admin path 0ms
✓ non-admin non-employer reject preserved 0ms
✓ EMPLOYER_VISIBLE_DOCUMENT_TYPES whitelist preserved on non-admin path 0ms

Test Files  1 passed (1)
Tests       7 passed (7)
Duration    960ms (transform 34ms, setup 110ms, collect 9ms, tests 2ms, ...)
```

Full suite: **267 passed | 137 todo** (todos = Wave 0 scaffold stubs from plan 21-00; not regressions; matches pre-edit baseline).

## Decisions Made

(All key decisions listed in frontmatter `key-decisions`.)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug / Plan-Internal Inconsistency] AC2/AC3 wording conflict resolved via comment-strip in test**
- **Found during:** Task 1 acceptance-criteria verification (after edits applied)
- **Issue:** Plan AC2 (line 219) mandates BFIX-05 docblock preserved (which at line 80 reads "Re-validating via adminClient.auth.getUser(token) fails because..."). Plan AC3 (line 220) expects `grep -c "adminClient.auth.getUser"` to return 0. Both cannot be true — the docblock substring registers in the grep count. Pre-existing repo state at HEAD also showed count=1 (BFIX-05 docblock was already present), confirming this is a plan-spec-vs-repo-reality conflict, not an executor edit regression.
- **Fix:** (a) Kept BFIX-05 docblock byte-frozen (AUTH-RETRO Arc 3 prevention — load-bearing comment that prevents future executors from re-introducing the bug). (b) Strengthened the regression-guard test third assertion to strip comments before the negative assert: `source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')`. The test now guarantees zero EXECUTABLE calls to `adminClient.auth.getUser` / `auth.getUserById`, which is the load-bearing invariant (a comment cannot regress BFIX-05; only an executable call can).
- **Files modified:** tests/get-applicant-document-url-admin-bypass.test.ts (only — Edge fn unchanged from plan spec)
- **Verification:** 7/7 test assertions GREEN; pre-existing repo count of 1 unchanged (`git show HEAD:... | grep -c "adminClient.auth.getUser"` = 1, confirming our edits added zero new occurrences).
- **Committed in:** 165b054 (single atomic commit with Tasks 1+2)

**2. [Rule 2 - Missing Critical / Cross-Plan Hygiene] Resolved sibling 21-02's deferred-items observation**
- **Found during:** Pre-Task-1 working-tree inspection (sibling executor's deferred-items.md flagged pre-staged 21-03-scope diff in working tree)
- **Issue:** When this plan's executor started, `git status` already showed `M supabase/functions/get-applicant-document-url/index.ts` from a prior session / parallel-wave bleed. Sibling 21-02's executor (correctly per scope discipline) did NOT touch the file; left a deferred-items.md observation asking this executor to diagnose.
- **Fix:** Per CLAUDE §3 (diagnose before fix), inspected the pre-staged diff vs plan body — they were equivalent. Discarded the working-tree state by re-applying both edits via the `Edit` tool against the HEAD file content (deterministic regeneration from plan spec), rather than blindly committing the pre-staged state. Final diff matches plan spec verbatim (51/3 within AC8 budget). Appended an executor-disposition note to `deferred-items.md` closing the loop.
- **Files modified:** .planning/phases/21-v20-close-post-launch-ops/deferred-items.md
- **Verification:** `git diff` after re-application matches plan-spec line-counts exactly; sibling's observation explicitly closed.
- **Committed in:** 165b054 (bundled with the same atomic commit)

---

**Total deviations:** 2 auto-fixed (1 plan-internal-inconsistency bug-fix, 1 cross-plan hygiene)
**Impact on plan:** Both auto-fixes preserve the load-bearing invariants (BFIX-05 gateway-trust + plan-spec-verbatim diff) while improving regression-guard strength. No scope creep — both stay within plan 21-03's `files_modified` frontmatter scope plus the cross-plan deferred-items note.

## Issues Encountered

- **Vercel-storage / context7 / Supabase MCP-instruction hook noise on Read** of the Deno Edge Function source file. Dismissed as no-deviation event per Phase 17/18/20.1 STATE precedent (lines 114, 121, 129, 155) — TopFarms is Vite + RR v7 SPA on Supabase (not Vercel Storage), and the file in question is a Deno Edge Function (not a Vercel Function). Skill-tool invocation declined.

## User Setup Required

**Edge Function NOT yet deployed.** Per plan body line 327 + success_criteria carryforward allowance, deploy is batched into Wave 6 plan 21-09 operator script. Orchestrator's prompt requested a CHECKPOINT pause for explicit deploy-now-or-batch decision — see **Next Phase Readiness** below.

When deploy happens (either now or in plan 21-09):

```bash
# Operator command (Studio CLI):
supabase functions deploy get-applicant-document-url
```

**Post-deploy verification (deferred to Wave 6 Track A UAT per plan body line 329):**

```bash
# Admin caller — should return signed URL for ANY seeker_documents row:
curl -X POST \
  -H "Authorization: Bearer ${ADMIN_JWT}" \
  -H "Content-Type: application/json" \
  -d '{"document_id":"<some-uuid>"}' \
  "https://inlagtgpynemhipnqvty.supabase.co/functions/v1/get-applicant-document-url"
# Expected: 200 + { url, expires_in: 900 }

# Employer caller (non-admin) — existing 5-layer gate, must include application_id:
curl -X POST \
  -H "Authorization: Bearer ${EMPLOYER_JWT}" \
  -H "Content-Type: application/json" \
  -d '{"application_id":"<uuid>","document_id":"<uuid>"}' \
  "https://inlagtgpynemhipnqvty.supabase.co/functions/v1/get-applicant-document-url"
# Expected: 200 + { url, expires_in: 900 } if ownership + whitelist pass; 403 otherwise

# Employer caller requesting identity doc — must still 403:
# Expected: 403 + { error: "Identity documents are not accessible to employers" }
```

## Next Phase Readiness

- **Plan 21-03 source-level scope: COMPLETE.** Admin bypass branch shipped, regression guard GREEN, full suite GREEN, BFIX-05 + PRIV-02 + employer 403 all preserved.
- **Plan 21-04 unblocked** (auth-context-is-active is independent of this Edge fn deploy).
- **Plan 21-07 (AdminDocumentsQueue UI)** is the runtime consumer of this admin branch — it will start working empirically once the Edge fn is deployed (Wave 6 plan 21-09 batch deploy is the canonical timing).
- **DEPLOY CHECKPOINT** returned to orchestrator for explicit operator decision: deploy now to enable plan 21-07 earlier empirical UAT, OR batch deploy into plan 21-09 per original plan body wording.

## Self-Check: PASSED

- `supabase/functions/get-applicant-document-url/index.ts` modified: **FOUND** (51/3 diff)
- `tests/get-applicant-document-url-admin-bypass.test.ts` created: **FOUND** (56 lines, 7 tests GREEN)
- `.planning/phases/21-v20-close-post-launch-ops/deferred-items.md` modified: **FOUND** (executor-disposition section appended)
- Commit `165b054` exists: **FOUND** (`git log --oneline | grep 165b054` → `feat(21-03): get-applicant-document-url admin bypass + regression guard`)
- Full suite GREEN: **CONFIRMED** (267 passed | 137 todo; todos = pre-existing Wave 0 scaffold)

---
*Phase: 21-v20-close-post-launch-ops*
*Plan: 03*
*Completed: 2026-05-17*
