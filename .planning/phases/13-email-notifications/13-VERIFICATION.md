---
phase: 13-email-notifications
verified: 2026-05-01
verifier: Claude (gsd-planner+gsd-executor across plans 15-01/15-03/15-04, opus-4-7)
commit_verified: e5c5390
status: gaps_found
score: "2/2 sub-phases shipped; verification backfilled in Phase 15; E2E email delivery deferred (RESEND_API_KEY unset)"
deferrals:
  - "MAIL-01 E2E: Resend domain status_observed is stub-only (resend_domains.json) — RESEND_API_KEY not accessible during Phase 15. Full evidence pending secret set + re-capture."
  - "MAIL-02 E2E: plan 15-02 deferred — notify-job-filled deployed and trigger no longer 404s, but email-delivery chain unverified end-to-end until RESEND_API_KEY is set."
  - "MAIL-03 / MAIL-04 / MAIL-05 / MAIL-06 — Future Requirements per REQUIREMENTS.md §Email Automation; not in v2.0 scope"
backfill_notes: |
  Phase 13 originally shipped 2026-04-03 without VERIFICATION.md. Audit at v2.0 milestone gate
  (2026-04-29) flagged the gap. This file is the retrospective verification produced by Phase 15
  plans 15-01 (manual deploy + evidence capture) and 15-04 (this backfill plan).
  Plan 15-02 (E2E trigger fire + inbox observation) was deferred because RESEND_API_KEY is unset
  in production — the notify-job-filled function is deployed and reachable, but email sends
  silently skip at the Resend boundary. See carryforward in v2.0-MILESTONE-AUDIT.md.
  All evidence files are under .planning/phases/15-email-pipeline-deploy/15-01-EVIDENCE/.
---

# Phase 13: Email & Notifications — Verification Report

**Phase goal (from ROADMAP.md):** "Transactional emails reliably reach inboxes (not spam) and applicants are automatically notified when a job they applied to is marked as filled"

**Verified:** 2026-05-01 (backfilled in Phase 15)
**Method:** goal-backward verification against ROADMAP.md Phase 13's 4 success criteria. Evidence captured during Phase 15 plans 15-01 (deploy + BFIX-05 audit). Plan 15-02 (E2E trigger fire + inbox proof) deferred — RESEND_API_KEY unset in production. No hand-wave verdicts: where evidence is incomplete, verdict is PARTIAL with explicit carryforward.

---

## Sub-phase 13-02 — MAIL-01 SPF/DKIM Verified

**Goal (ROADMAP success criterion #1):** "SPF and DKIM DNS records are configured for the Resend sending domain and pass verification — confirmed via Resend dashboard showing 'Verified' status"

**Verdict:** PARTIAL

**Rationale:** Phase 13-02 documented the DNS configuration steps as a human-action checkpoint (13-02-SUMMARY.md). During plan 15-01, an attempt was made to capture the Resend domain status via curl, but RESEND_API_KEY is not set locally or in Supabase secrets, blocking the capture. The DNS records were configured per 13-02-SUMMARY instructions; status is plausibly verified but not confirmed with artefact evidence in this phase.

### Evidence

| Promised | Evidence | Status |
|----------|----------|--------|
| SPF record configured for topfarms.co.nz | 13-02-SUMMARY.md documents steps to configure SPF at domain registrar; no artefact confirming completion | PLAUSIBLE (unconfirmed) |
| DKIM record configured | Same — 13-02-SUMMARY.md human-action checkpoint executed per plan; no DKIM=pass artefact captured | PLAUSIBLE (unconfirmed) |
| Confirmed via Resend dashboard showing "Verified" | `.planning/phases/15-email-pipeline-deploy/15-01-EVIDENCE/resend_domains.json` — **STUB ONLY** — RESEND_API_KEY not accessible; file documents the gap and required action | DEFERRED |

**Prior phase context:** 15-01-SUMMARY.md §Verification Notes for Plan 15-04 states: "resend_domains.json — INCOMPLETE stub — MAIL-01 evidence requires user to set RESEND_API_KEY and re-run curl."

**Carryforward:** Set `RESEND_API_KEY` as Supabase Edge Function secret, then re-run:
```bash
curl -sX GET 'https://api.resend.com/domains' \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  | jq '.' > .planning/phases/15-email-pipeline-deploy/15-01-EVIDENCE/resend_domains.json
```
Confirm `"status": "verified"` for topfarms.co.nz. Once confirmed, this criterion flips to SATISFIED.

Source plan: 15-01 (blocked), carryforward to post-Phase-15 (see v2.0-MILESTONE-AUDIT.md).

---

## Sub-phase 13-02 (cont.) — MAIL-01 Test Email in Inbox

**Goal (ROADMAP success criterion #2):** "A test email sent via Resend from the configured domain arrives in Gmail/Outlook inbox (not spam folder)"

**Verdict:** DEFERRED

**Rationale:** Plan 15-02 (end-to-end MAIL-02 trigger fire + per-applicant inbox observation) was deferred because RESEND_API_KEY is unset. Without the secret, `notify-job-filled`, `send-followup-emails`, and `create-placement-invoice` all log "RESEND_API_KEY not set — skipping email" and silently return false. No inbox evidence exists. The functions are deployed and will receive trigger calls; they just won't send emails until the secret is set.

### Evidence

| Promised | Evidence | Status |
|----------|----------|--------|
| Test email arrives in inbox (not spam) | No inbox evidence — plan 15-02 deferred; 15-02-EVIDENCE directory does not exist | DEFERRED |
| DKIM signature passes in email headers | No email_headers.txt — plan 15-02 not executed | DEFERRED |

**Carryforward:** Execute `.planning/phases/15-email-pipeline-deploy/15-02-PLAN.md` end-to-end once RESEND_API_KEY is set. That plan produces inbox screenshots and email headers as artefacts.

Source plan: 15-02 (deferred).

---

## Sub-phase 13-01 — MAIL-02 Filled-Job Notification (Positive Case / Deploy Readiness)

**Goal (ROADMAP success criterion #3):** "When an employer marks a job as 'filled', every applicant with status applied, reviewed, interview, or shortlisted receives an email notifying them the position has been filled"

**Verdict:** PARTIAL — deploy gap closed; email delivery chain unverified end-to-end

**Rationale:** Plan 15-01 deployed `notify-job-filled` (v1, ACTIVE). The DB trigger `on_job_filled` no longer 404s — it now reaches a live function. However, the full chain (trigger → function → Resend → inbox) has not been empirically verified because RESEND_API_KEY is unset. Plan 15-02 would have provided that evidence; it was deferred. The recipient filter logic (NOTIFY_STATUSES) has been verified at code level in 13-01-SUMMARY.md.

### Evidence

| Promised | Evidence | Status |
|----------|----------|--------|
| `notify-job-filled` Edge Function deployed live | `.planning/phases/15-email-pipeline-deploy/15-01-EVIDENCE/list_edge_functions.json` — function ACTIVE v1 at `2026-04-30T22:43:45Z`; note: "NEW DEPLOYMENT — closes MAIL-02 silent failure" | PASS |
| DB trigger fires successfully (no longer 404) | `on_job_filled` trigger deployed via migration 017 (confirmed in 13-01-SUMMARY.md Task 2 commit `3742a9f`); `notify-job-filled` now ACTIVE — trigger resolves to live endpoint | PASS (deploy level) |
| Email actually delivered to NOTIFY_STATUSES applicants | No pg_net_response.json or inbox evidence — plan 15-02 deferred | DEFERRED |
| BFIX-05 antipattern absent | `.planning/phases/15-email-pipeline-deploy/15-01-EVIDENCE/bfix05_audit.txt` ends with `AUDIT RESULT: PASS` — zero `auth.getUser(token)` calls across all 4 functions | PASS |
| Recipient filter matches NOTIFY_STATUSES | `notify-job-filled/index.ts` queries `status IN ('applied', 'review', 'interview', 'shortlisted', 'offered')` per 13-01-SUMMARY.md §Task 1 | PASS (code level) |

**Note:** NOTIFY_STATUSES is `applied | review | interview | shortlisted | offered`. ROADMAP wording says "applied, reviewed, interview, or shortlisted" — these match (schema uses `review`, ROADMAP prose says `reviewed`; same set). `offered` is also in the inclusive list per Phase 13-01 design — that is an additive benefit. Terminal statuses (hired, declined, withdrawn) are excluded by the IN clause.

Source plans: 15-01 (deploy); 15-02 (deferred).

---

## Sub-phase 13-01 (cont.) — MAIL-02 Terminal-Status Negative Case

**Goal (ROADMAP success criterion #4):** "Applicants who already have a terminal status (hired, declined, withdrawn) do NOT receive the filled notification"

**Verdict:** PARTIAL — code-level exclusion verified; empirical negative-case observation deferred

**Rationale:** The Edge Function query uses an IN clause that only includes NOTIFY_STATUSES. Terminal statuses (hired, declined, withdrawn) are not in that list and will not be selected. The MarkFilledModal race condition fix (hired update runs before job status update) further guards the just-hired applicant. Code-level verification PASS; empirical confirmation (plan 15-02 per-applicant inbox verdict table for expected_email:false rows) is deferred with plan 15-02.

### Evidence

| Promised | Evidence | Status |
|----------|----------|--------|
| Terminal-status applicants excluded at query level | `notify-job-filled/index.ts` — query filter `status IN ('applied', 'review', 'interview', 'shortlisted', 'offered')` excludes `hired`, `declined`, `withdrawn` by omission | PASS (code level) |
| Race fix: applicant marked `hired` in same modal flow excluded | 13-01-SUMMARY.md documents order-of-operations fix: `applications.update({ status: 'hired' })` BEFORE `jobs.update({ status: 'filled' })`; commit `17378fc` | PASS (code level) |
| Empirical: just-hired applicant did NOT receive email | No per-applicant inbox verdict — plan 15-02 deferred | DEFERRED |

Source plans: 15-01 (code audit); 15-02 (deferred).

---

## Cross-cutting: DEPLOY-01 CI Infrastructure

Plan 15-03 closed the cross-cutting CI gap that allowed Phase 13 to ship with `notify-job-filled` undeployed for ~4 weeks. `.github/workflows/supabase-deploy.yml` committed (commit `edcde3a`); migration registry repaired via Studio INSERT; CI secrets (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`) seeded. First workflow smoke test deferred — 12 commits not yet pushed to `origin/main`. Status: CI infrastructure COMPLETE; first run smoke test PENDING user push.

See `.planning/phases/15-email-pipeline-deploy/15-03-SUMMARY.md` for full details.

---

## Deferrals

- **RESEND_API_KEY production secret** — blocks both MAIL-01 domain evidence and MAIL-02 E2E delivery. ~5 min to set: `supabase secrets set RESEND_API_KEY=<key> --project-ref inlagtgpynemhipnqvty`. See carryforward in `.planning/v2.0-MILESTONE-AUDIT.md`.
- **Plan 15-02** — execute end-to-end once RESEND_API_KEY is set. Produces: pg_net 200 response, inbox screenshots, email headers, per-applicant verdict table.
- **MAIL-01 satisfied criteria (1 + 2)** — pending plan 15-02 execution + resend_domains.json evidence.
- **MAIL-02 satisfied criteria (3 + 4)** — pending plan 15-02 execution.
- **MAIL-03 / MAIL-04 / MAIL-05 / MAIL-06** — Future Requirements per REQUIREMENTS.md §Email Automation; not in v2.0 scope.
- **Phase 13 nyquist_compliant** — VALIDATION.md still in draft state; Wave 0 test file `tests/notify-job-filled.test.ts` was listed but never created. Phase 18 territory.

---

## Git Evidence

```
edcde3a feat(15-03): supabase-deploy workflow + per-function config.toml
6070b1a feat(15-01): deploy 4 disk-only edge functions via supabase CLI --use-api
3742a9f feat(13-01): add database webhook migration for notify-job-filled Edge Function
17378fc feat(13-01): fix MarkFilledModal race condition and create notify-job-filled Edge Function
```

Key artefacts:
- `list_edge_functions.json`: all 9 functions ACTIVE including notify-job-filled v1 (2026-04-30T22:43:45Z)
- `bfix05_audit.txt`: AUDIT RESULT: PASS — 4 functions safe to deploy
- `resend_domains.json`: STUB ONLY — pending RESEND_API_KEY

---

## Overall Verdict

| Criterion | Verdict | Blocked by |
|-----------|---------|------------|
| #1 SPF/DKIM Verified | PARTIAL | RESEND_API_KEY + resend_domains.json evidence |
| #2 Test email in inbox | DEFERRED | Plan 15-02 (needs RESEND_API_KEY) |
| #3 NOTIFY_STATUSES notification fires | PARTIAL | Deployed; E2E unverified (plan 15-02) |
| #4 Terminal-status excluded | PARTIAL | Deployed; empirical negative-case unverified (plan 15-02) |

**Overall: PARTIAL (gaps_found)** — core code is deployed and the deploy gap is closed. All four criteria have a clear carryforward path via plan 15-02 once RESEND_API_KEY is set. This is not a code failure — it is a secret-configuration gap.

---

_Verifier: Claude (gsd-executor, 15-04)_
_Verified: 2026-05-01_
_Verified against: commit e5c5390 (post-15-03 docs)_
_Backfill method: retrospective against Phase 15 evidence; plan 15-02 deferred (RESEND_API_KEY unset)_
