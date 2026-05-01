---
phase: 15-email-pipeline-deploy
verified: 2026-05-01T00:00:00Z
status: gaps_found
score: 3/6 truths verified (deploy-layer truths pass; E2E delivery and smoke-test truths deferred)
gaps:
  - truth: "MAIL-01: Resend domain shows Verified status (SPF + DKIM) in production"
    status: failed
    reason: "resend_domains.json is a stub only — RESEND_API_KEY was not set in production or locally during plan 15-01; no API call was made; status_observed is 'pending-confirmation', not 'verified'"
    artifacts:
      - path: ".planning/phases/15-email-pipeline-deploy/15-01-EVIDENCE/resend_domains.json"
        issue: "Stub file documents the gap: evidence_type=stub-pending-api-key. MAIL-01 domain verification unconfirmed with artefact evidence."
    missing:
      - "Set RESEND_API_KEY via: supabase secrets set RESEND_API_KEY=<key> --project-ref inlagtgpynemhipnqvty"
      - "Re-run: curl -sX GET 'https://api.resend.com/domains' -H 'Authorization: Bearer $RESEND_API_KEY' | jq '.' > 15-01-EVIDENCE/resend_domains.json"
      - "Confirm status: verified for topfarms.co.nz in the response"

  - truth: "MAIL-01: A test email from the configured Resend domain arrives in an inbox (not spam)"
    status: failed
    reason: "Plan 15-02 was explicitly deferred — RESEND_API_KEY unset in production means every email send silently skips at the Resend API boundary. No inbox evidence exists. 15-02-EVIDENCE directory does not exist."
    artifacts:
      - path: ".planning/phases/15-email-pipeline-deploy/15-02-EVIDENCE/"
        issue: "Directory does not exist — plan 15-02 was not executed"
    missing:
      - "Execute .planning/phases/15-email-pipeline-deploy/15-02-PLAN.md end-to-end once RESEND_API_KEY is set"
      - "Produce: pg_net_response.json (trigger fire 200), inbox_screenshot.png (email visible in inbox), email_headers.txt (DKIM=pass)"

  - truth: "MAIL-02: notify-job-filled delivers an email to NOTIFY_STATUSES applicants when a job is marked filled (E2E chain verified)"
    status: failed
    reason: "Deploy layer is complete (notify-job-filled ACTIVE v1, trigger on_job_filled live), but the full chain trigger → function → Resend → inbox has not been empirically verified because RESEND_API_KEY is unset. Plan 15-02 deferred."
    artifacts:
      - path: ".planning/phases/15-email-pipeline-deploy/15-01-EVIDENCE/list_edge_functions.json"
        issue: "Confirms deploy (notify-job-filled ACTIVE v1) but cannot confirm email delivery — RESEND_API_KEY guard in index.ts causes silent skip on every send attempt"
    missing:
      - "Set RESEND_API_KEY as Supabase Edge Function secret"
      - "Execute plan 15-02: fire trigger, observe pg_net 200 response, confirm inbox receipt per NOTIFY_STATUSES applicant"

  - truth: "DEPLOY-01: CI workflow runs successfully on push to main (first smoke test passes)"
    status: failed
    reason: "supabase-deploy.yml is committed and substantive (85 lines, correct trigger/jobs/secrets). However, as of closeout all 12 phase-15 commits were local-only — 19 commits ahead of origin/main. The workflow has never been indexed by GitHub Actions and has never executed. First smoke test is deferred pending user push."
    artifacts:
      - path: ".planning/phases/15-email-pipeline-deploy/15-03-EVIDENCE/first_run.json"
        issue: "status=deferred: workflow file not on remote default branch at phase closeout; gh workflow run returned HTTP 404"
    missing:
      - "git push (to put workflow file on origin/main)"
      - "gh workflow run supabase-deploy.yml --ref main (or wait for path-filter-matching push)"
      - "Confirm migrations job and functions job both pass (or functions NOTIFY-ONLY per design)"

carryforward_reference: ".planning/v2.0-MILESTONE-AUDIT.md §Carryforward Items (post-Phase-15 close)"
---

# Phase 15: Email Pipeline Deploy & Verify — Verification Report

**Phase Goal:** Close MAIL-02 (unsatisfied to satisfied), MAIL-01 (partial to satisfied), DEPLOY-01 (closed).

**Verified:** 2026-05-01
**Status:** gaps_found
**Re-verification:** No — initial verification

**Context note:** Plan 15-02 was explicitly deferred during execution because `RESEND_API_KEY` is not set in production. The user approved this path. This verification does not penalise the deferral as a process failure — it records it truthfully as a gap so the carryforward mechanism can close it. `gaps_found` is the correct verdict; the carryforward entries in `.planning/v2.0-MILESTONE-AUDIT.md` are the tracking mechanism.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | MAIL-01: notify-job-filled and email-sending functions deployed live | VERIFIED | `list_edge_functions.json` — notify-job-filled ACTIVE v1 at 2026-04-30T22:43:45Z; all 4 previously-disk-only functions now ACTIVE |
| 2 | MAIL-02: DB trigger on_job_filled no longer 404s (deploy gap closed) | VERIFIED | `list_edge_functions.json` — notify-job-filled ACTIVE; trigger resolves to live endpoint not 404 |
| 3 | MAIL-02: BFIX-05 antipattern absent from all deployed functions | VERIFIED | `bfix05_audit.txt` — AUDIT RESULT: PASS; zero `auth.getUser(token)` antipattern calls across all 4 functions |
| 4 | MAIL-01: Resend domain shows Verified (SPF + DKIM) with artefact evidence | FAILED | `resend_domains.json` — stub only; `status_observed: pending-confirmation`; RESEND_API_KEY unset |
| 5 | MAIL-01/02: E2E email delivery chain verified (trigger fires → Resend sends → inbox receives) | FAILED | 15-02-EVIDENCE directory does not exist; plan 15-02 deferred pending RESEND_API_KEY |
| 6 | DEPLOY-01: CI workflow executed and passed first smoke test | FAILED | `first_run.json` — `status: deferred`; 19 commits unpushed; workflow never indexed by GitHub Actions |

**Score:** 3/6 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/functions/notify-job-filled/index.ts` | Edge Function with NOTIFY_STATUSES filter | VERIFIED | 204 lines; NOTIFY_STATUSES = ['applied', 'review', 'interview', 'shortlisted', 'offered']; RESEND_API_KEY guard at line 17 |
| `.github/workflows/supabase-deploy.yml` | CI workflow with migrations + functions jobs | VERIFIED | 85 lines; correct trigger (push/main path-filter + workflow_dispatch); sequential jobs; SUPABASE_ACCESS_TOKEN + SUPABASE_DB_PASSWORD secrets; continue-on-error on functions job |
| `supabase/config.toml` | Per-function verify_jwt pinned | VERIFIED | File exists; created in plan 15-03 commit edcde3a |
| `15-01-EVIDENCE/list_edge_functions.json` | All 9 functions ACTIVE post-deploy | VERIFIED | All 9 functions ACTIVE; 4 newly-deployed at version 1 |
| `15-01-EVIDENCE/bfix05_audit.txt` | BFIX-05 audit PASS | VERIFIED | AUDIT RESULT: PASS confirmed |
| `15-01-EVIDENCE/resend_domains.json` | Resend domain status: verified | STUB | `evidence_type: stub-pending-api-key`; no actual API call made; MAIL-01 evidence incomplete |
| `15-02-EVIDENCE/` | E2E trigger fire evidence (pg_net response, inbox screenshot, email headers) | MISSING | Directory does not exist; plan 15-02 not executed |
| `15-03-EVIDENCE/first_run.json` | CI first smoke test pass | FAILED | `status: deferred` — workflow not on remote at closeout |
| `15-03-EVIDENCE/secrets_seeded.txt` | SUPABASE_ACCESS_TOKEN + SUPABASE_DB_PASSWORD in GitHub Actions | VERIFIED | Both secrets confirmed present via `gh secret list` at 2026-05-01 |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `on_job_filled` DB trigger | `notify-job-filled` Edge Function | `pg_net.http_post` to `/functions/v1/notify-job-filled` | WIRED (deploy layer) | Function ACTIVE v1; trigger no longer 404s. Email delivery unverified (RESEND_API_KEY unset). |
| `notify-job-filled` | Resend API | `fetch('https://api.resend.com/emails')` with `Authorization: Bearer $RESEND_API_KEY` | PARTIAL | Code correct at line 21 of index.ts; send is guarded by `if (!RESEND_API_KEY)` at line 17 — silently skips when secret absent |
| `supabase-deploy.yml` | Supabase project `inlagtgpynemhipnqvty` | `SUPABASE_ACCESS_TOKEN` secret + `supabase functions deploy --use-api` | NOT WIRED (smoke test pending) | Workflow committed; secrets seeded; but workflow never triggered — 19 local commits not pushed to origin/main at closeout |

---

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| MAIL-01 | 15-01, 15-02 (deferred), 15-04 | SPF and DKIM DNS records configured and verified for production email delivery | PARTIAL | DNS configuration steps documented in Phase 13-02-SUMMARY; `resend_domains.json` is stub only — no artefact confirms "Verified" status. Kept `[ ]` in REQUIREMENTS.md with partial-close note. |
| MAIL-02 | 15-01, 15-02 (deferred), 15-04 | Applicants with unresolved status receive notification when job marked filled | PARTIAL | `notify-job-filled` deployed (ACTIVE v1); trigger live; NOTIFY_STATUSES filter correct at code level. Email delivery unverified E2E (RESEND_API_KEY unset). Kept `[ ]` in REQUIREMENTS.md with partial-close note. |
| DEPLOY-01 | 15-03 | CI workflow for automatic Supabase migration + function deploy | PARTIAL-CLOSE | `supabase-deploy.yml` committed (commit edcde3a); CI secrets seeded; migration registry repaired. Marked `[x]` in REQUIREMENTS.md because CI infrastructure is complete. First smoke test deferred pending push. |

**REQUIREMENTS.md state confirmed:**
- MAIL-01: `[ ]` — partial-close note added 2026-05-01
- MAIL-02: `[ ]` — partial-close note added 2026-05-01
- DEPLOY-01: `[x]` — closed with caveat (first smoke test pending push)

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `supabase/functions/notify-job-filled/index.ts` | 17-19 | `if (!RESEND_API_KEY)` silent skip | Info | By design — the guard prevents crashes when secret absent. Becomes a blocker only if secret is never set. Not a code defect; a configuration dependency. |
| `.github/workflows/supabase-deploy.yml` | Header comment | "REQUIRED ONE-TIME ACTION before this workflow first runs migrations" | Warning | The registry repair comment acknowledges that `supabase db push --linked --dry-run` will fail on first CI run unless the Studio INSERT fix from plan 15-03 has already been applied. The registry was repaired in plan 15-03 via Studio INSERT, so this is a documentation warning, not a live blocker — provided the Studio INSERT persisted. |

No blocker anti-patterns found in the code itself. The gaps are configuration-level (RESEND_API_KEY) and operational (push + smoke test), not implementation defects.

---

## Human Verification Required

### 1. Resend Domain Status

**Test:** Log into Resend dashboard at https://resend.com/domains. Check if topfarms.co.nz shows "Verified" status for both SPF and DKIM records.

**Expected:** Green "Verified" badge for topfarms.co.nz. SPF record: `include:_spf.resend.com`. DKIM record: present and verified.

**Why human:** Resend dashboard status is external; RESEND_API_KEY is not set in the codebase so programmatic capture is blocked.

### 2. RESEND_API_KEY Secret Setup

**Test:** Run `supabase secrets list --project-ref inlagtgpynemhipnqvty` and confirm RESEND_API_KEY is present.

**Expected:** RESEND_API_KEY appears in the secrets list alongside the existing keys.

**Why human:** Secret must be retrieved from Resend dashboard and set manually — cannot be done programmatically without the key value.

### 3. CI First Smoke Test

**Test:** Run `git push`, then `gh workflow run supabase-deploy.yml --ref main`, then `gh run list --workflow=supabase-deploy.yml --limit 1`.

**Expected:** migrations job: PASS (supabase db push --linked exits 0). functions job: PASS or NOTIFY-ONLY (continue-on-error; functions already deployed so redeploy is idempotent).

**Why human:** Requires pushing 19 local commits to origin/main — an action the agent was explicitly constrained not to perform.

### 4. E2E Email Delivery (plan 15-02)

**Test:** Execute `.planning/phases/15-email-pipeline-deploy/15-02-PLAN.md` end-to-end once RESEND_API_KEY is set. Mark a test job as filled; observe pg_net response, inbox receipt, DKIM=pass in headers.

**Expected:** Per-applicant verdict table confirms NOTIFY_STATUSES applicants received email; hired/declined/withdrawn applicants did not.

**Why human:** Requires a live Resend API key and production trigger fire — cannot be simulated programmatically.

---

## Gaps Summary

Phase 15 delivered its deploy-layer objectives completely: all 4 previously-disk-only Edge Functions are now ACTIVE in production; the BFIX-05 antipattern is absent from all deployed functions; the CI infrastructure (workflow, config.toml, secrets, migration registry repair) is committed and ready. These are genuine achievements.

Three gaps remain, all traceable to a single root cause — RESEND_API_KEY is not set in production:

1. **MAIL-01 domain evidence gap:** `resend_domains.json` is a stub because RESEND_API_KEY was not available during plan 15-01. The DNS records were configured in Phase 13-02 per human-action checkpoint, but no artefact confirms "Verified" status.

2. **MAIL-01/MAIL-02 E2E delivery gap:** Plan 15-02 (trigger fire + inbox observation) was explicitly deferred because RESEND_API_KEY is unset. The trigger fires correctly; the function receives the call; but every email send silently skips at the Resend API boundary. The full chain is unverified.

3. **DEPLOY-01 smoke test gap:** The CI workflow was never triggered because 19 phase-15 commits remained unpushed to origin/main at closeout (per the critical constraint: DO NOT push from this agent). The workflow infrastructure is correct; it simply has no run history to verify against.

These gaps are intentional and tracked. They are not abandoned. The carryforward entries in `.planning/v2.0-MILESTONE-AUDIT.md §Carryforward Items (post-Phase-15 close)` document the exact action steps, effort estimates, and unblocking sequence. The verdict is `gaps_found` — truthful, not a pessimistic reframing of success.

**Estimated carryforward effort:** ~5 min to set RESEND_API_KEY + ~15-30 min to execute plan 15-02 + ~5 min to push and observe first CI run.

---

_Verified: 2026-05-01_
_Verifier: Claude (gsd-verifier, sonnet-4-6)_
_Verified against: commit 8355b45 (post-15-04 docs, pre-push)_
_Carryforward tracking: .planning/v2.0-MILESTONE-AUDIT.md §Carryforward Items (post-Phase-15 close)_
