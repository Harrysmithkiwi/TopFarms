---
phase: 22-pre-launch-p0-closure
plan: "04"
type: execute
wave: 2
depends_on: ["22-01", "22-02", "22-03"]
files_modified:
  - .planning/REQUIREMENTS.md
  - .planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md
autonomous: false
requirements: [SIGNUP-01, HOMEBUG-01, HOMEBUG-02, HOMEBUG-03, UXBUG-01]
must_haves:
  truths:
    - "Operator has explicitly typed 'authorize push' (or equivalent affirmative) in the chat before the executor pushes Wave 1 commits to main"
    - "Vercel deployment for the post-push commit completes successfully (build green) and the production URL https://top-farms.vercel.app/ serves a fresh build"
    - "All 5 P0 UAT steps in tests/p0-prod-smoke-UAT.md pass empirically against the deployed production frontend"
    - "REQUIREMENTS.md flips SIGNUP-01 + HOMEBUG-01 + HOMEBUG-02 + HOMEBUG-03 + UXBUG-01 to closed state with §7-satisfied evidence pointers"
    - "22-04-UAT-EVIDENCE.md captures Network/DOM evidence per UAT step (pass-state proofs)"
  artifacts:
    - path: ".planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md"
      provides: "Captured Network responses + DOM observations for all 5 UAT steps"
      contains: "Step 1"
    - path: ".planning/REQUIREMENTS.md"
      provides: "5 P0 requirements flipped from [ ] to [x] with §7-satisfied evidence pointers"
      contains: "22-04-UAT-EVIDENCE.md"
  key_links:
    - from: "Wave 1 commits (22-01 + 22-02 + 22-03)"
      to: "Vercel production deployment of main branch"
      via: "git push origin main + Vercel auto-deploy"
      pattern: "Deployment URL https://top-farms.vercel.app"
    - from: "22-04-UAT-EVIDENCE.md"
      to: "REQUIREMENTS.md §7-satisfied notes"
      via: "explicit evidence-pointer references"
      pattern: "22-04-UAT-EVIDENCE\\.md"
---

<objective>
Wave 2 of Phase 22: gated push to main of all Wave 1 fixes (22-01, 22-02, 22-03), then operator-driven prod UAT covering all 5 P0 items (SIGNUP-01, HOMEBUG-02, HOMEBUG-03, HOMEBUG-01, UXBUG-01) against deployed `https://top-farms.vercel.app/`. Captures empirical evidence per CLAUDE §7 and flips REQUIREMENTS.md state.

**Critical gate per CLAUDE §4:** push to main requires EXPLICIT operator authorization typed into chat. Task 1 is a hard STOP — the executor agent MUST NOT proceed past it without operator affirmation. History-rewriting commands (`git push --force`, `git reset --hard`, `git rebase`) remain off-limits per CLAUDE §4 / §8.

**Critical correction per research §Pitfall 1:** UXBUG-01 verification spans BOTH Step 4 (write side — chips render, are selectable, persist) AND Step 7 (read side — preview shows selected chips). The ROADMAP phase description's "Step 7" reference is incomplete; chips LIVE on Step 4.

Purpose: empirical close-out of 5 P0 launch blockers. Each fix lands in production with §7-satisfied evidence before v2.0 milestone close. Without this wave, Phase 22 is just code on disk — no production proof.

Output: 5 UAT pass-states captured; REQUIREMENTS.md updated; 22-04-UAT-EVIDENCE.md is the evidence file. Phase 22 ready for `/gsd:verify-work` (only MAIL-01/02 audit in plan 22-05 remains before milestone close gate).
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

# UAT script
@tests/p0-prod-smoke-UAT.md

# Wave 1 plan SUMMARYs (will exist after Wave 1 completes)
# @.planning/phases/22-pre-launch-p0-closure/22-01-signup-01-toast-SUMMARY.md
# @.planning/phases/22-pre-launch-p0-closure/22-02-homebug-02-listing-tier-SUMMARY.md
# @.planning/phases/22-pre-launch-p0-closure/22-03-homebug-03-accommodation-filter-SUMMARY.md

<interfaces>
This plan has NO new code. It is an operator-action plan. The interfaces consumed are:

1. **Wave 1 deliverables** (must exist before this plan runs):
   - `src/pages/auth/SignUp.tsx` with persistent toast options (from 22-01)
   - `src/components/landing/FeaturedListings.tsx` line 133 with `[2, 3]` int array (from 22-02)
   - `src/pages/jobs/JobSearch.tsx` with `ACCOMMODATION_FILTER_TO_DB` constant + remap (from 22-03)
   - All Wave 1 commits present in local main branch

2. **UAT script** (from Wave 0):
   - `tests/p0-prod-smoke-UAT.md` with 5 numbered steps + Browser URL + Network expectation + DOM expectation per step

3. **REQUIREMENTS.md ledger** to flip:
   - SIGNUP-01 — line 103 (currently in Future Requirements bug-fix list; needs flip note)
   - HOMEBUG-01 — line 99 (Future Requirements list; needs flip note)
   - HOMEBUG-02 — line 100 (Future Requirements list; needs flip note)
   - HOMEBUG-03 — line 101 (Future Requirements list; needs flip note)
   - UXBUG-01 — line 77 (Pre-Launch Must-Fix section, currently `[ ]`)

Per CLAUDE §7 partial-close discipline: every flip MUST cite §7-satisfied evidence in `22-04-UAT-EVIDENCE.md`. NO inference. NO "presumably works" — empirical Network response + DOM observation required for each.

4. **Vercel deployment**:
   - `vercel` CLI (if available) OR git push to main (Vercel auto-deploys via existing project link). Verify deployment URL returns 200 before starting UAT.

Per CLAUDE §3 (diagnose before fix) + §7 (partial-close): if ANY UAT step fails, do NOT flip the requirement. Capture the failure evidence, surface to operator, route to a gap-closure follow-up plan via `/gsd:plan-phase 22 --gaps`.
</interfaces>
</context>

<tasks>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 1: STOP GATE — Operator authorization required to push Wave 1 to main</name>
  <files>(none — gate task, no file output)</files>
  <read_first>
    - CLAUDE.md §4 (atomic commits + no history-rewriting without explicit operator instruction)
    - CLAUDE.md §8 (git safety incidents — precedent for hard STOPs)
    - .planning/phases/22-pre-launch-p0-closure/22-01-signup-01-toast-SUMMARY.md (confirm Wave 1 22-01 landed)
    - .planning/phases/22-pre-launch-p0-closure/22-02-homebug-02-listing-tier-SUMMARY.md (confirm Wave 1 22-02 landed)
    - .planning/phases/22-pre-launch-p0-closure/22-03-homebug-03-accommodation-filter-SUMMARY.md (confirm Wave 1 22-03 landed)
  </read_first>
  <what-built>
    All three Wave 1 fixes are committed to the local `main` branch:
    - 22-01 — SIGNUP-01 persistent toast in SignUp.tsx
    - 22-02 — HOMEBUG-02 int-typed listing_tier in FeaturedListings.tsx
    - 22-03 — HOMEBUG-03 accommodation_filter remap in JobSearch.tsx

    Pre-push verification (run BEFORE this STOP gate — informational, automated):
    ```bash
    git status
    git log --oneline -n 5 main..origin/main 2>/dev/null && echo "(unpushed commits above)"
    git log --oneline -n 5 origin/main..main 2>/dev/null && echo "(pending push commits above)"
    pnpm test --run 2>&1 | tail -5    # full suite green
    pnpm exec tsc -b 2>&1 | tail -5   # typecheck output (project-wide pre-existing errors tolerated)
    ```
  </what-built>
  <how-to-verify>
    **STOP. Per CLAUDE §4, push to main requires explicit operator authorization. The executor agent MUST NOT run `git push origin main` until the operator has affirmatively typed authorization into the chat.**

    Required affirmation: operator must type something semantically equivalent to "authorize push" (case-insensitive: `authorize push`, `push approved`, `go ahead and push`, `push it`, `confirmed push to main`, etc.). The operator's affirmation must be UNAMBIGUOUS.

    Operator should verify the following BEFORE authorizing:

    1. Review the 3 commits to be pushed:
       ```bash
       git log --oneline origin/main..main
       ```
       Expected: 3 commits, one per Wave 1 plan. Subjects start with `fix(22-01)`, `fix(22-02)`, `fix(22-03)`.

    2. Review the diff one last time:
       ```bash
       git diff origin/main..main --stat
       ```
       Expected: ~3-5 files changed total (SignUp.tsx + FeaturedListings.tsx + JobSearch.tsx + 2 diagnostic .md files).

    3. Confirm full vitest suite GREEN:
       ```bash
       pnpm test --run 2>&1 | tail -5
       ```
       Expected: `X passed | Y todo` with X > baseline (W0 specs flipped GREEN by Wave 1 fixes).

    4. Confirm TypeScript build has no NEW errors on touched files:
       ```bash
       pnpm exec tsc -b 2>&1 | grep -E "SignUp\\.tsx|FeaturedListings\\.tsx|JobSearch\\.tsx"
       ```
       Expected: empty (no new errors). Pre-existing project-wide errors are tolerated.

    5. Confirm Vercel project is linked + ready to auto-deploy on push:
       ```bash
       ls .vercel/ 2>/dev/null  # expect project.json or repo.json
       ```
       Per project STATE precedent (Phase 15-03, 20-08): TopFarms uses Vercel auto-deploy on push to main; no manual deploy step needed.

    If all 5 pre-flight checks pass AND the operator wants to proceed, they affirm push authorization in chat. If anything looks off, operator surfaces the concern instead of authorizing.
  </how-to-verify>
  <resume-signal>
    Operator types something semantically equivalent to "authorize push" (e.g., `authorize push`, `push approved`, `go ahead and push`, `confirmed push to main`).

    On affirmation: proceed to Task 2.

    If operator says STOP / WAIT / NOT YET or surfaces a concern: do NOT proceed. Capture the concern, document it in 22-04-UAT-EVIDENCE.md as a deferred gate, and surface to user via final message. Phase 22 is paused until operator re-engages.

    **Critical:** absence of operator response is NOT permission. The executor MUST receive an affirmative signal.
  </resume-signal>
  <action>
    HALT execution. Display the `<what-built>` block to the operator and run the 5 pre-flight verification commands listed in `<how-to-verify>` (git log + diff + pnpm test + pnpm tsc + ls .vercel/). Capture their output. Then wait for the operator's affirmation per `<resume-signal>` rules. Do NOT proceed to Task 2 until an unambiguous "authorize push" (or semantically equivalent) message is received in the chat. If operator surfaces a concern (STOP / WAIT / NOT YET), stop here and surface to user via final message.
  </action>
  <verify>
    <automated>MISSING — checkpoint gate; resume-signal is operator chat message. Executor reads chat history for affirmation token before proceeding; no automated verify possible at this gate.</automated>
  </verify>
  <done>
    Operator has typed explicit push authorization in chat. Pre-flight verifications captured (status / log / test / tsc / vercel-link) and reviewed. Wave 1 commits are visible in `git log --oneline origin/main..main` and ready to push. NO push has been executed yet — that lands in Task 2.
  </done>
</task>

<task type="auto">
  <name>Task 2: Push Wave 1 commits to main + wait for Vercel deployment</name>
  <files>(no local file output — produces remote main branch update + Vercel deployment URL)</files>
  <read_first>
    - .planning/STATE.md (current branch state, last_activity)
    - CLAUDE.md §4 (push to main is OK; --force / --no-verify / rebase / reset are NOT)
    - .planning/phases/15-email-pipeline-deploy/15-03-SUMMARY.md (if exists — precedent for push-to-main + Vercel deploy verification pattern)
  </read_first>
  <action>
    Per Task 1 operator authorization. Execute:

    1. Push to main (no --force, no --no-verify):
    ```bash
    git push origin main
    ```

    2. Capture the push output (commit SHAs, ref update line) for evidence.

    3. Wait for Vercel deployment to complete. Two approaches:

    **Approach A — Vercel CLI (preferred if `vercel` is installed and project is linked):**
    ```bash
    # List the latest deployment + watch for READY status
    vercel ls --limit 3
    # Or, with a project alias:
    vercel inspect <deployment-url> --wait
    ```

    **Approach B — gh + actions OR Vercel webhook polling (fallback):**
    ```bash
    # If supabase-deploy.yml workflow exists (Phase 15-03 precedent), monitor:
    gh run list --workflow=supabase-deploy.yml --limit 1
    gh run watch  # if a run is in progress
    ```

    **Approach C — manual operator confirmation (fallback if both A and B unavailable):**
    Operator visits https://vercel.com/<account>/topfarms/deployments, confirms the latest deployment is "Ready" (green), and confirms the commit SHA matches the push.

    4. After deployment confirmed ready, verify production URL responds:
    ```bash
    curl -sS -o /dev/null -w "%{http_code}\n" https://top-farms.vercel.app/
    # Expected: 200
    ```

    5. Record evidence in `.planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md` (create file if missing):
    ```markdown
    # Phase 22 — Wave 2 UAT Evidence

    ## Task 2 — Push + Deploy

    **Push timestamp:** 2026-05-{DD}T{HH}:{MM}Z
    **Commits pushed:** {3 SHAs from `git log --oneline origin/main..main` before push, now `git log --oneline -n 3 origin/main` after push}
    **Vercel deployment URL:** {deployment-url}
    **Vercel deployment status:** READY
    **Production URL response:** `curl -sS -o /dev/null -w "%{http_code}\n" https://top-farms.vercel.app/` → 200
    **Deployment commit SHA matches push:** {yes/no}
    ```
  </action>
  <verify>
    <automated>curl -sS -o /dev/null -w "%{http_code}\n" https://top-farms.vercel.app/ — expect 200; test -f .planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md && grep -E "READY" .planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md</automated>
  </verify>
  <acceptance_criteria>
    - `git log --oneline -n 3 origin/main` shows the 3 Wave 1 commits at the tip of origin/main
    - `curl -sS -o /dev/null -w "%{http_code}\n" https://top-farms.vercel.app/` returns `200`
    - `test -f .planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md` exits 0
    - `grep -E "READY|ready" .planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md` returns ≥1 match
    - `grep -E "Vercel deployment URL" .planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md` returns ≥1 match
    - `grep -E "https://top-farms.vercel.app" .planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md` returns ≥1 match
    - **NO** `git push --force` or `git reset --hard` was executed (per CLAUDE §4 / §8)
  </acceptance_criteria>
  <done>
    Wave 1 commits live on origin/main. Vercel auto-deploy completed READY. https://top-farms.vercel.app/ returns 200. Evidence recorded in 22-04-UAT-EVIDENCE.md. Ready for UAT Tasks 3-7.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: UAT Step 1 — SIGNUP-01 toast persistence in prod</name>
  <files>.planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md</files>
  <read_first>
    - tests/p0-prod-smoke-UAT.md §Step 1 (operator script verbatim)
    - .planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md §Pattern 1
  </read_first>
  <what-built>
    Wave 1 plan 22-01 deployed in Task 2 — SignUp.tsx now calls `toast.error(msg, { duration: Infinity, closeButton: true })` for both the named-error path and the catch fallback.
  </what-built>
  <how-to-verify>
    Operator follows `tests/p0-prod-smoke-UAT.md` §Step 1 verbatim. Summary:

    1. Open fresh incognito window
    2. Navigate to `https://top-farms.vercel.app/signup`
    3. Open DevTools → Network tab
    4. Fill form with `not_an_email@example.test` + `ValidPass123!` + select a role
    5. Click "Create account"
    6. Observe:
       - **Network:** `POST .../auth/v1/signup` returns 400 with `email_address_invalid` code
       - **DOM:** Sonner toast appears at top-right with red styling and error text
       - **CRITICAL:** Toast remains visible for AT LEAST 10 seconds without auto-dismiss
       - **CRITICAL:** Toast has a close (X) button or click-to-dismiss affordance
       - Submit button reverts from loading to "Create account"

    Operator captures evidence into `22-04-UAT-EVIDENCE.md` under a `## Task 3 — UAT Step 1 (SIGNUP-01)` heading:
    ```markdown
    ## Task 3 — UAT Step 1 (SIGNUP-01)

    **URL tested:** https://top-farms.vercel.app/signup
    **Browser:** {Chrome/Safari/Firefox} version {X}
    **Test email:** not_an_email@example.test
    **Network observation:**
      - POST .../auth/v1/signup status: 400
      - Response body (snippet): {paste actual response body — should contain "email_address_invalid" or similar}
    **DOM observation:**
      - Toast appeared: YES / NO
      - Toast text: {paste verbatim}
      - Toast persisted 10s+: YES / NO
      - Toast had close affordance: YES / NO
      - Submit button reverted: YES / NO
    **Verdict:** PASS / FAIL
    **Notes:** {anything unexpected}
    ```
  </how-to-verify>
  <resume-signal>
    Operator types `pass` / `fail` / `pass with notes`. On PASS: continue to Task 4. On FAIL: capture evidence, document failure, do NOT proceed to flip REQUIREMENTS.md SIGNUP-01 — surface to user; routing to a follow-up plan via `--gaps`.
  </resume-signal>
  <action>
    Display the `<how-to-verify>` block to operator. Append a `## Task 3 — UAT Step 1 (SIGNUP-01)` section to `.planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md` using the markdown template inside `<how-to-verify>`. Wait for operator to fill in the observation fields + Verdict line. Read the file to confirm operator's verdict line, then act on it per `<resume-signal>` rules (proceed on PASS; surface to user on FAIL).
  </action>
  <verify>
    <automated>grep -E "^## Task 3 — UAT Step 1" .planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md && grep -E "Verdict: (PASS|FAIL)" .planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md</automated>
  </verify>
  <done>
    Task 3 section in 22-04-UAT-EVIDENCE.md has operator-completed observations + explicit Verdict line. On PASS verdict: proceed to Task 4. On FAIL: phase paused; surfaced to operator.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: UAT Step 2 — HOMEBUG-02 featured listings query 200</name>
  <files>.planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md</files>
  <read_first>
    - tests/p0-prod-smoke-UAT.md §Step 2 (operator script verbatim)
    - .planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md §Pattern 2
  </read_first>
  <what-built>
    Wave 1 plan 22-02 deployed in Task 2 — FeaturedListings.tsx:133 now uses `.in('listing_tier', [2, 3])` (int values matching schema).
  </what-built>
  <how-to-verify>
    Operator follows `tests/p0-prod-smoke-UAT.md` §Step 2. Summary:

    1. Open fresh incognito window
    2. Navigate to `https://top-farms.vercel.app/`
    3. DevTools → Network → filter `jobs?`
    4. Refresh
    5. Find the featured-listings query
    6. Observe:
       - **URL:** contains `listing_tier=in.(2,3)` (URL-encoded `%282%2C3%29`), NOT `listing_tier=in.("featured","premium")`
       - **Status:** 200 (NOT 400)
       - **DOM:** featured listings section renders without blank-state; if no featured jobs exist, fallback shows up to 3 recent active jobs

    Append to `22-04-UAT-EVIDENCE.md`:
    ```markdown
    ## Task 4 — UAT Step 2 (HOMEBUG-02)

    **URL tested:** https://top-farms.vercel.app/
    **Network observation:**
      - PostgREST URL: {paste actual URL from DevTools — should contain listing_tier=in.%282%2C3%29}
      - Status: 200 / 400 / other
      - Response body count: {N rows OR empty array}
    **DOM observation:**
      - Featured listings rendered: YES / NO
      - Card count visible: {N}
      - Fallback fired (3 recent active jobs): YES / NO (if N=0 featured)
    **Verdict:** PASS / FAIL
    **Notes:** {anything unexpected — e.g., SQLSTATE in 400 response if still broken}
    ```
  </how-to-verify>
  <resume-signal>
    Operator types `pass` / `fail` / `pass with notes`. On PASS: continue to Task 5. On FAIL: capture evidence, surface to user.
  </resume-signal>
  <action>
    Display the `<how-to-verify>` block to operator. Append a `## Task 4 — UAT Step 2 (HOMEBUG-02)` section to `22-04-UAT-EVIDENCE.md` using the markdown template inside `<how-to-verify>`. Wait for operator to fill in observation fields + Verdict line. Confirm verdict; act per `<resume-signal>`.
  </action>
  <verify>
    <automated>grep -E "^## Task 4 — UAT Step 2" .planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md && grep -cE "Verdict: (PASS|FAIL)" .planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md — expect ≥2 (Task 3 verdict + this one)</automated>
  </verify>
  <done>
    Task 4 section in 22-04-UAT-EVIDENCE.md complete with operator verdict. On PASS: proceed to Task 5. On FAIL: surface to operator.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 5: UAT Step 3 — HOMEBUG-03 accommodation filter Couples + Pet-friendly 200</name>
  <files>.planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md</files>
  <read_first>
    - tests/p0-prod-smoke-UAT.md §Step 3 (operator script verbatim)
    - .planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md §Pattern 3
  </read_first>
  <what-built>
    Wave 1 plan 22-03 deployed in Task 2 — JobSearch.tsx now has `ACCOMMODATION_FILTER_TO_DB` lookup + handler remaps URL values to Title Case before `.overlaps()`.
  </what-built>
  <how-to-verify>
    Operator follows `tests/p0-prod-smoke-UAT.md` §Step 3. Summary:

    1. Open fresh incognito window
    2. Navigate to `https://top-farms.vercel.app/jobs`
    3. DevTools → Network → filter `jobs?`
    4. Open FilterSidebar → toggle "Couples welcome" checkbox
    5. Observe URL bar shows `?accommodation_type=couples`
    6. Observe PostgREST request: `.../jobs?...&employer_profiles.accommodation_extras=ov.%7BCouples+welcome%7D` returns **200**
    7. Toggle "Pet-friendly" additionally
    8. Observe combined PostgREST: `...&accommodation_extras=ov.%7BCouples+welcome,Pets+allowed%7D` returns **200**

    Append to `22-04-UAT-EVIDENCE.md`:
    ```markdown
    ## Task 5 — UAT Step 3 (HOMEBUG-03)

    **URL tested:** https://top-farms.vercel.app/jobs
    **Test 1: Couples toggle**
      - URL bar after toggle: {paste}
      - PostgREST request URL: {paste — should contain ov.%7BCouples+welcome%7D or similar URL-encoded Title Case}
      - Status: 200 / 400 / other
      - Result count: {N}
    **Test 2: Couples + Pet-friendly toggle (additive)**
      - URL bar after toggle: {paste}
      - PostgREST request URL: {paste — should contain BOTH "Couples welcome" AND "Pets allowed" Title Case after remap}
      - Status: 200 / 400 / other
      - Result count: {N}
    **DOM observation:**
      - Listing area renders results OR empty-state copy "No jobs found" (both acceptable; the bug was 400, not zero matches)
      - No console errors related to PostgREST 400
    **Verdict:** PASS / FAIL
    **Notes:** {anything unexpected}
    ```
  </how-to-verify>
  <resume-signal>
    Operator types `pass` / `fail` / `pass with notes`. On PASS: continue to Task 6. On FAIL: capture evidence, surface to user.
  </resume-signal>
  <action>
    Display the `<how-to-verify>` block to operator. Append a `## Task 5 — UAT Step 3 (HOMEBUG-03)` section to `22-04-UAT-EVIDENCE.md` using the markdown template inside `<how-to-verify>`. Wait for operator to fill in observation fields + Verdict line. Confirm verdict; act per `<resume-signal>`.
  </action>
  <verify>
    <automated>grep -E "^## Task 5 — UAT Step 3" .planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md && grep -cE "Verdict: (PASS|FAIL)" .planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md — expect ≥3</automated>
  </verify>
  <done>
    Task 5 section in 22-04-UAT-EVIDENCE.md complete with operator verdict. On PASS: proceed to Task 6. On FAIL: surface to operator.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 6: UAT Step 4 — HOMEBUG-01 get_platform_stats RPC 200</name>
  <files>.planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md</files>
  <read_first>
    - tests/p0-prod-smoke-UAT.md §Step 4 (operator script verbatim)
    - .planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md §Pattern 4 (HOMEBUG-01 — code-side already closed 2026-05-03 BLOCK 3 §2; this verifies prod E2E)
    - .planning/REQUIREMENTS.md line 99 (HOMEBUG-01 current state)
  </read_first>
  <what-built>
    HOMEBUG-01 was code-side closed 2026-05-03 (migration 012 reconciled via BLOCK 3 §2 — `get_platform_stats` RPC present in prod schema). This task verifies the production E2E that was pending per REQUIREMENTS.md line 99 update.

    No Wave 1 code change was needed for HOMEBUG-01. The 2026-05-03 schema reconciliation is the fix; this task is the post-deploy verification that the home page hits the RPC successfully.
  </what-built>
  <how-to-verify>
    Operator follows `tests/p0-prod-smoke-UAT.md` §Step 4. Summary:

    1. Open fresh incognito window
    2. Navigate to `https://top-farms.vercel.app/`
    3. DevTools → Network → filter `get_platform_stats`
    4. Refresh
    5. Observe:
       - **Network:** `POST .../rest/v1/rpc/get_platform_stats` returns 200 with body `{ jobs: N, seekers: M, matches: K }` (numeric values; may be 0 but shape MUST be present — NOT 404, NOT 400)
       - **DOM:** CountersSection widget renders 3 counter blocks (Jobs Posted / Workers Registered / Matches Made) with NUMERIC values count-animating from 0 to target via `useCountUp` ~1800ms

    Append to `22-04-UAT-EVIDENCE.md`:
    ```markdown
    ## Task 6 — UAT Step 4 (HOMEBUG-01)

    **URL tested:** https://top-farms.vercel.app/
    **Network observation:**
      - POST .../rpc/get_platform_stats status: 200 / 404 / 400 / other
      - Response body: {paste — should be {"jobs":N,"seekers":M,"matches":K}}
    **DOM observation:**
      - CountersSection rendered: YES / NO
      - 3 counter blocks visible with numeric values: YES / NO
      - Numbers animated count-up: YES / NO (not just static "0 0 0")
    **Verdict:** PASS / FAIL
    **Notes:** {anything unexpected}
    ```
  </how-to-verify>
  <resume-signal>
    Operator types `pass` / `fail` / `pass with notes`. On PASS: continue to Task 7. On FAIL: capture evidence, surface to user (would imply 2026-05-03 BLOCK 3 §2 reconciliation regressed — needs investigation).
  </resume-signal>
  <action>
    Display the `<how-to-verify>` block to operator. Append a `## Task 6 — UAT Step 4 (HOMEBUG-01)` section to `22-04-UAT-EVIDENCE.md` using the markdown template inside `<how-to-verify>`. Wait for operator to fill in observation fields + Verdict line. Confirm verdict; act per `<resume-signal>`.
  </action>
  <verify>
    <automated>grep -E "^## Task 6 — UAT Step 4" .planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md && grep -cE "Verdict: (PASS|FAIL)" .planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md — expect ≥4</automated>
  </verify>
  <done>
    Task 6 section in 22-04-UAT-EVIDENCE.md complete with operator verdict. On PASS: proceed to Task 7. On FAIL: surface to operator (potentially indicates 2026-05-03 schema reconciliation regression).
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 7: UAT Step 5 — UXBUG-01 accommodation chips Step 4 (write) + Step 7 (read)</name>
  <files>.planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md</files>
  <read_first>
    - tests/p0-prod-smoke-UAT.md §Step 5 (operator script verbatim)
    - .planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md §Pattern 4 + §Pitfall 1 (Step 4 vs Step 7 — write vs read; both must verify)
    - src/types/domain.ts:327-336 (the 8 ACCOMMODATION_EXTRAS_OPTIONS labels — operator reference)
    - .planning/REQUIREMENTS.md line 77 (UXBUG-01 current state — note explicit Pre-Launch Must-Fix [ ] state)
  </read_first>
  <what-built>
    UXBUG-01 was code-side closed in commit `d5e8dfc` (per REQUIREMENTS.md:77) — Step4Accommodation.tsx now reads/writes `accommodation_extras` correctly post-schema reconciliation. This task verifies the production E2E for BOTH:
    - **Step 4 (write side):** chips render with 8 Title Case labels; selection persists to DB
    - **Step 7 (read side):** preview displays the selected chip values back to the user

    Per research §Pitfall 1: the ROADMAP-stage "Step 7" framing is incomplete; chips ARE on Step 4. Verifying ONLY Step 7 would miss the write-side bug if it existed.
  </what-built>
  <how-to-verify>
    Operator follows `tests/p0-prod-smoke-UAT.md` §Step 5. Summary:

    1. Sign in as an employer test account at `https://top-farms.vercel.app/login`
    2. Navigate to onboarding Step 4 Accommodation (or in-progress profile edit if onboarding complete)
    3. Observe Step 4 ChipSelector:
       - **8 chips** render with EXACTLY these Title Case labels: `Pets allowed`, `Couples welcome`, `Family welcome`, `Utilities included`, `Furnished`, `Garden`, `Garage`, `Internet included`
       - Select 2 chips (e.g., `Couples welcome` + `Pets allowed`)
       - Click Continue — no PostgREST 400 in Network tab on the UPDATE
    4. Advance through Steps 5/6 (skip-fill as needed)
    5. Land on Step 7 Preview
    6. Observe Step 7 read side:
       - The 2 selected chips appear in the preview summary as their Title Case labels (`Couples welcome`, `Pets allowed`)
       - No "undefined" / "null" / missing values
    7. Throughout: all PostgREST calls against `employer_profiles` return 200

    Append to `22-04-UAT-EVIDENCE.md`:
    ```markdown
    ## Task 7 — UAT Step 5 (UXBUG-01)

    **URL tested:** https://top-farms.vercel.app/onboarding/employer/step-4 (+ step-7)
    **Test employer account:** {alias or "Test Farm (UAT)"}

    **Step 4 (write side) observation:**
      - Number of chips rendered: {expect 8}
      - Chip labels (paste verbatim): {expect: Pets allowed, Couples welcome, Family welcome, Utilities included, Furnished, Garden, Garage, Internet included}
      - 2 chips selected: {paste which 2}
      - Continue button click: PostgREST UPDATE status: 200 / other
      - Any console errors: YES / NO

    **Step 7 (read side) observation:**
      - Preview shows selected chips: YES / NO
      - Selected chip values in preview: {paste verbatim}
      - Any "undefined" / "null" / missing: YES / NO

    **Verdict:** PASS / FAIL
    **Notes:** {anything unexpected}
    ```
  </how-to-verify>
  <resume-signal>
    Operator types `pass` / `fail` / `pass with notes`. On PASS: continue to Task 8 (REQUIREMENTS flip). On FAIL: capture evidence, surface to user. If only Step 4 OR only Step 7 fails (not both), that's important diagnostic info — surface separately.
  </resume-signal>
  <action>
    Display the `<how-to-verify>` block to operator. Append a `## Task 7 — UAT Step 5 (UXBUG-01)` section to `22-04-UAT-EVIDENCE.md` using the markdown template inside `<how-to-verify>` — note this section has TWO sub-observation blocks (Step 4 write + Step 7 read). Wait for operator to fill in BOTH observation blocks + Verdict line. Confirm verdict; act per `<resume-signal>`. If Step 4 PASSES but Step 7 FAILS (or vice versa), surface that asymmetry explicitly.
  </action>
  <verify>
    <automated>grep -E "^## Task 7 — UAT Step 5" .planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md && grep -E "Step 4 \\(write side\\) observation" .planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md && grep -E "Step 7 \\(read side\\) observation" .planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md && grep -cE "Verdict: (PASS|FAIL)" .planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md — expect ≥5</automated>
  </verify>
  <done>
    Task 7 section in 22-04-UAT-EVIDENCE.md complete with BOTH Step 4 and Step 7 observations + operator verdict. On PASS: proceed to Task 8 (REQUIREMENTS flip). On FAIL: surface to operator with explicit Step 4 vs Step 7 asymmetry if applicable.
  </done>
</task>

<task type="auto">
  <name>Task 8: Flip REQUIREMENTS.md for 5 P0 items with §7-satisfied evidence pointers</name>
  <files>.planning/REQUIREMENTS.md</files>
  <read_first>
    - .planning/REQUIREMENTS.md (current state lines 77, 99-103)
    - .planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md (Tasks 3-7 evidence — all PASS verdicts confirmed)
    - CLAUDE.md §7 (partial-close discipline — only flip if ALL gaps for a requirement are closed with evidence)
  </read_first>
  <action>
    **PRECONDITION:** Tasks 3 through 7 ALL recorded a `PASS` verdict in `22-04-UAT-EVIDENCE.md`. If any task verdict is FAIL or PASS-with-notes that revealed an unclosed gap, this task DOES NOT flip the corresponding requirement. Per CLAUDE §7, only flip when empirical proof of full requirement is captured.

    For each of the 5 P0 items, apply a single-line edit to `.planning/REQUIREMENTS.md`:

    **1. UXBUG-01 (line 77 — Pre-Launch Must-Fix section, currently `[ ]`):**

    BEFORE:
    ```markdown
    - [ ] **UXBUG-01** *(pre-launch blocker)*: original 2026-04-27 framing (...) Kept `[ ]` per CLAUDE.md §7 partial-close discipline — code shipped + schema reconciled, but production E2E confirmation (employer hits Step 7 → sees accommodation chips populated) pending push + UAT. See `SENSE_CHECK_AUDIT_2026-05-01.md` §"Correction Note 2026-05-03" + `.planning/DRIFT-AUDIT-2026-05-03.md`. Original investigation logged 2026-04-27.
    ```

    AFTER (use Edit tool — change ONLY the `[ ]` to `[x]` and append §7-satisfied closure note):
    ```markdown
    - [x] **UXBUG-01** *(closed 2026-05-{DD} — Phase 22 Wave 2 prod UAT)*: original 2026-04-27 framing (...) Code shipped (`d5e8dfc`) + schema reconciled (BLOCK 1 2026-05-03) + production E2E empirically confirmed 2026-05-{DD} via Phase 22-04 UAT Step 5. **§7-satisfied:** `.planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md` Task 7 records: 8 chips render at Step 4 with Title Case labels matching `src/types/domain.ts:327-336`; 2-chip selection round-trips to Step 7 preview; zero PostgREST 400 on the employer_profiles UPDATE. See `SENSE_CHECK_AUDIT_2026-05-01.md` §"Correction Note 2026-05-03" + `.planning/DRIFT-AUDIT-2026-05-03.md` for original schema-drift context. Original investigation logged 2026-04-27.
    ```

    **2. HOMEBUG-01 (line 99 — Future Requirements bug-fix list, currently bullet `- **HOMEBUG-01**: ...`):**

    Find the current entry:
    ```markdown
    - **HOMEBUG-01**: Home page calls `get_platform_stats` RPC which returns 404. ... **Update 2026-05-03:** root cause identified ... Production E2E confirmation (home page hits RPC → renders stats) pending push + UAT.
    ```

    Update by appending a closure note (do NOT change bullet style — these are NOT checkbox items in REQUIREMENTS.md Future Requirements section; structure them like the other already-closed entries):
    ```markdown
    - **HOMEBUG-01** *(closed 2026-05-{DD} — Phase 22 Wave 2 prod UAT)*: Home page calls `get_platform_stats` RPC which returns 404. ... **Update 2026-05-03:** root cause identified ... **Closed 2026-05-{DD}:** §7-satisfied via `.planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md` Task 6 — POST /rest/v1/rpc/get_platform_stats returns 200 with `{jobs:N,seekers:M,matches:K}` shape; CountersSection widget renders 3 numeric counters with count-up animation in prod.
    ```

    **3. HOMEBUG-02 (line 100):**

    Similarly, append closure note:
    ```markdown
    - **HOMEBUG-02** *(closed 2026-05-{DD} — Phase 22-02 + Wave 2 prod UAT)*: Home page `jobs?select=...` query returns 400 (likely malformed). ... **Closed 2026-05-{DD}:** root cause = `listing_tier` int column receiving string values `['featured', 'premium']` at FeaturedListings.tsx:133 (SQLSTATE 22P02 invalid_text_representation per `.planning/phases/22-pre-launch-p0-closure/22-02-DIAGNOSIS.md`). Fix shipped in Phase 22-02 (1-line change to `[2, 3]` int array). §7-satisfied via `.planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md` Task 4 — PostgREST listing_tier=in.(2,3) returns 200; featured listings render in prod.
    ```

    **4. HOMEBUG-03 (line 101):**

    Similarly, append closure note:
    ```markdown
    - **HOMEBUG-03** *(closed 2026-05-{DD} — Phase 22-03 + Wave 2 prod UAT)*: FilterSidebar Couples and Accommodation filters trigger backend errors when activated. ... **Closed 2026-05-{DD}:** root cause = 3-layer mismatch (UI lowercase emission / handler raw pass-through / DB Title Case storage) per `.planning/phases/22-pre-launch-p0-closure/22-03-DIAGNOSIS.md`. Fix shipped in Phase 22-03 (Layer 2 remap via ACCOMMODATION_FILTER_TO_DB lookup in JobSearch.tsx). §7-satisfied via `.planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md` Task 5 — Couples + Pet-friendly filter toggles return 200 in prod. Out of scope (future plan): house/cottage TYPE-column filter handling (different column — `employer_profiles.accommodation_type` singular).
    ```

    **5. SIGNUP-01 (line 103):**

    Similarly, append closure note:
    ```markdown
    - **SIGNUP-01** *(closed 2026-05-{DD} — Phase 22-01 + Wave 2 prod UAT)*: Signup form silently swallows `email_address_invalid` errors from Supabase. ... **Closed 2026-05-{DD}:** root cause was Sonner default `duration: 4000ms` auto-dismissing the toast before users could read it (Hypothesis A per `.planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md` §Pattern 1; Hypothesis B re: signUpWithRole AuthError swallowing was ruled out by Task 1 diagnostic in Phase 22-01). Fix shipped in Phase 22-01 (`{ duration: Infinity, closeButton: true }` options on both named-error path AND catch-block fallback). §7-satisfied via `.planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md` Task 3 — toast persists 10s+ with close affordance on prod /signup with invalid email.
    ```

    Use the Edit tool for each entry. Make 5 separate Edit calls (one per requirement) to keep diffs surgical. For each Edit, anchor on the bullet/checkbox text to ensure correct line is targeted.

    Update the Traceability table at the bottom of REQUIREMENTS.md if these requirements appear there (HOMEBUG-* + SIGNUP-* + UXBUG-* currently not in the table per current state, but add rows if they belong):

    Read the current Traceability section first. If the table has rows for these 5 IDs, update Status column to "Complete (Phase 22)". If they don't exist in the table, leave alone (they live in Pre-Launch Must-Fix + Future Requirements sections, not the v2.0 milestone Traceability table).

    Also update the Coverage tally at the bottom (line ~199-202) if the v2.0-requirement-count needs adjusting. Since these 5 are in the Pre-Launch Must-Fix + Future Requirements sections (not the v2.0 milestone count), the Coverage line for "v2.0 requirements: 11 total" remains unchanged. Verify this by re-reading line 199-202 before editing.

    Finally, add a closing entry to the trailing change-log at the bottom of REQUIREMENTS.md:
    ```markdown
    *2026-05-{DD} — Phase 22 P0 closure: UXBUG-01 flipped from `[ ]` to `[x]`; SIGNUP-01 + HOMEBUG-01/02/03 closure notes appended in their bullet entries. All 5 P0 items §7-satisfied via Phase 22 Wave 2 prod UAT — see `.planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md` Tasks 3-7. Phase 22 P0 work complete; v2.0 milestone close gated on PEND-01 (Stripe live-mode swap, operator separate-session per 21-09 carryforward) + Phase 22 plan 22-05 MAIL-01/02 docs audit (read-only consistency check, no E2E re-fire — see 22-RESEARCH.md §6).*
    ```
  </action>
  <verify>
    <automated>grep -E "UXBUG-01.*\\[x\\]" .planning/REQUIREMENTS.md && grep -cE "22-04-UAT-EVIDENCE.md" .planning/REQUIREMENTS.md — expect ≥5 references to the evidence file (one per P0 closure); grep -E "closed 2026" .planning/REQUIREMENTS.md | grep -E "HOMEBUG-01|HOMEBUG-02|HOMEBUG-03|SIGNUP-01|UXBUG-01" | wc -l — expect ≥5</automated>
  </verify>
  <acceptance_criteria>
    - `grep -E "^\\- \\[x\\] \\*\\*UXBUG-01\\*\\*" .planning/REQUIREMENTS.md` returns exactly 1 match (flipped from `[ ]` to `[x]`)
    - `grep -E "HOMEBUG-01.*closed 2026" .planning/REQUIREMENTS.md` returns ≥1 match
    - `grep -E "HOMEBUG-02.*closed 2026" .planning/REQUIREMENTS.md` returns ≥1 match
    - `grep -E "HOMEBUG-03.*closed 2026" .planning/REQUIREMENTS.md` returns ≥1 match
    - `grep -E "SIGNUP-01.*closed 2026" .planning/REQUIREMENTS.md` returns ≥1 match
    - `grep -cE "22-04-UAT-EVIDENCE\\.md" .planning/REQUIREMENTS.md` returns ≥5 (one evidence-pointer per P0 closure)
    - `grep -E "§7-satisfied" .planning/REQUIREMENTS.md` returns ≥5 NEW matches (in addition to pre-existing MAIL-01/02 + BFIX-02 + Phase 21 §7-satisfied notes)
    - The change-log entry at the bottom of REQUIREMENTS.md includes the date + Phase 22 P0 closure summary
    - No requirement was flipped to `[x]` for a UAT step that recorded FAIL or PASS-with-unclosed-gaps in 22-04-UAT-EVIDENCE.md (per CLAUDE §7)
  </acceptance_criteria>
  <done>
    REQUIREMENTS.md updated: UXBUG-01 flipped to `[x]`; HOMEBUG-01/02/03 + SIGNUP-01 bullets have closure notes with §7-satisfied evidence pointers to 22-04-UAT-EVIDENCE.md; change-log entry appended. Per CLAUDE §7, only requirements with ALL UAT PASS verdicts are flipped/noted.
  </done>
</task>

</tasks>

<verification>
After all 8 tasks complete:

```bash
# Push happened
git log --oneline -n 5 origin/main | grep -E "fix\\(22-0[123]\\)"
# Expected: 3 commits visible at tip of origin/main

# Production deployed
curl -sS -o /dev/null -w "%{http_code}\n" https://top-farms.vercel.app/
# Expected: 200

# All 5 UAT steps recorded
grep -cE "^## Task [3-7] — UAT Step [1-5]" .planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md
# Expected: 5

# All 5 UAT verdicts captured (PASS or FAIL)
grep -cE "Verdict: (PASS|FAIL)" .planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md
# Expected: ≥5

# REQUIREMENTS.md flipped (only if all PASS)
grep -E "UXBUG-01.*\[x\]" .planning/REQUIREMENTS.md
grep -cE "22-04-UAT-EVIDENCE\.md" .planning/REQUIREMENTS.md
# Expected: ≥5
```

**Atomic commit per CLAUDE §4:** This plan produces TWO commits (per atomic-bundle precedent — separating remote ops from local docs):
1. **Push commit** — `git push origin main` (no local commit; pushes the 3 Wave 1 commits)
2. **Local docs commit** — `docs(22-04): P0 prod UAT evidence + REQUIREMENTS.md closures (UXBUG-01 + HOMEBUG-01/02/03 + SIGNUP-01)` includes `22-04-UAT-EVIDENCE.md` + `REQUIREMENTS.md`. This commit happens AFTER all UAT tasks complete with PASS verdicts.

If any UAT step fails, the docs commit is reduced to capture the partial state + carryforward notes for `/gsd:plan-phase 22 --gaps`. NO requirement is flipped for a non-passing UAT.

**Phase 22 carryforward after this plan:**
- Plan 22-05 (Wave 3) — MAIL-01/02 docs audit — depends on Wave 0 (22-00) but NOT on this plan. Can run any time post-Wave-0 in parallel with this plan if operator chooses. Per ROADMAP wave structure: Wave 3 sequencing.
- Phase 22 verification (`/gsd:verify-work`) — runs after plans 22-04 AND 22-05 both complete.
- v2.0 milestone close — blocked on PEND-01 (Stripe live-mode swap, separate-session per 21-09 carryforward) + Phase 22 completion.
</verification>

<success_criteria>
- Operator authorization gate (Task 1) satisfied with explicit "authorize push" affirmation
- Wave 1 commits (22-01 + 22-02 + 22-03) pushed to origin/main
- Vercel deployment confirmed READY; production URL returns 200
- All 5 UAT steps (Tasks 3-7) record PASS verdicts in 22-04-UAT-EVIDENCE.md
- REQUIREMENTS.md: UXBUG-01 flipped `[ ]` → `[x]`; HOMEBUG-01/02/03 + SIGNUP-01 closure notes appended with §7-satisfied evidence pointers
- No use of `git push --force`, `git reset --hard`, `git rebase`, or `git checkout --` (per CLAUDE §4 / §8)
- Per CLAUDE §7: only flip requirements with empirically PASS UAT steps; carry-forward partial-close notes for any FAILs
- Local docs commit lands with all evidence + REQUIREMENTS updates
</success_criteria>

<output>
After completion, create `.planning/phases/22-pre-launch-p0-closure/22-04-p0-prod-smoke-SUMMARY.md` documenting:
- Operator authorization timestamp + form of affirmation
- Push outcome (3 SHAs at tip of origin/main)
- Vercel deployment status (URL + READY confirmation)
- All 5 UAT verdicts (PASS / FAIL / PASS-with-notes) with brief evidence excerpts
- REQUIREMENTS.md state changes (which requirements flipped, which deferred)
- Local docs commit SHA
- Carryforward (if any FAILs): which P0s need gap closure via `/gsd:plan-phase 22 --gaps`
- Pointer to next plan: 22-05 MAIL-01/02 docs audit (Wave 3)
</output>
