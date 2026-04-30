---
phase: 15
slug: email-pipeline-deploy
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-01
populated: 2026-05-01
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — operational/deploy phase, validation is empirical (CLI output, MCP queries, HTTP checks, inbox observation) |
| **Config file** | n/a |
| **Quick run command** | `supabase functions list --project-ref inlagtgpynemhipnqvty` |
| **Full suite command** | `gh workflow run supabase-deploy.yml --ref main && gh run watch` (post-implementation) |
| **Estimated runtime** | ~30s for `functions list`; ~2-4 min for full CI workflow run |

---

## Sampling Rate

- **After every task commit:** Re-run the task's automated CLI/MCP check (e.g. `supabase functions list`, `list_edge_functions` MCP, `curl` against trigger). All checks complete in <30s.
- **After every plan wave:** Run all wave checks together; verify no regression in earlier waves.
- **Before `/gsd:verify-work`:** Empirical proof artefacts attached to `13-VERIFICATION.md` (deploy outputs, function-list snapshot, Resend domain JSON, trigger fire log, inbox screenshot/header).
- **Max feedback latency:** 30 seconds for CLI/MCP checks; ~2-4 min for full CI workflow run.

---

## Per-Task Verification Map

Populated during /gsd:plan-phase. Every task has either an automated CLI/MCP/HTTP check OR a row in the Manual-Only table below (per Nyquist Dimension 8 — operational phases legitimately have manual verifications, and each one carries an explicit "Why Manual" justification).

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command (or "Manual — see Manual-Only table") | Status |
|---------|------|------|-------------|-----------|----------------------------------------------------------|--------|
| 15-01-T1 | 15-01 | 1 | MAIL-02, DEPLOY-01 | static check (grep) | `test -f .planning/phases/15-email-pipeline-deploy/15-01-EVIDENCE/bfix05_audit.txt && grep -q "AUDIT RESULT: PASS" .planning/phases/15-email-pipeline-deploy/15-01-EVIDENCE/bfix05_audit.txt` | ⬜ pending |
| 15-01-T2 | 15-01 | 1 | MAIL-02, DEPLOY-01 | MCP query (post-deploy snapshot) | `grep -q "notify-job-filled" .planning/phases/15-email-pipeline-deploy/15-01-EVIDENCE/list_edge_functions.json && grep -q "send-followup-emails" ... && grep -q "acknowledge-placement-fee" ... && grep -q "create-placement-invoice" ...` | ⬜ pending |
| 15-01-T3 | 15-01 | 1 | MAIL-01 | curl + jq | `grep -q '"verified"' .planning/phases/15-email-pipeline-deploy/15-01-EVIDENCE/resend_domains.json` (curl evidence path; or screenshot fallback documented in Manual-Only) | ⬜ pending |
| 15-01-T4 | 15-01 | 1 | MAIL-02, MAIL-01, DEPLOY-01 | static check + frontmatter validate | `grep -q "topfarms-ci-deploy" 15-01-SUMMARY.md && grep -qE "Option (A\|B) chosen" ... && gsd-tools frontmatter validate --schema summary` | ⬜ pending |
| 15-02-T1 | 15-02 | 2 | MAIL-02 | jq check | `test -f 15-02-EVIDENCE/test_setup.json && jq -e '.job_id and (.applicants \| length >= 2)' ...` | ⬜ pending |
| 15-02-T2 | 15-02 | 2 | MAIL-02 | jq check (pg_net response) | `grep -qE '"status_code"\s*:\s*200' .planning/phases/15-email-pipeline-deploy/15-02-EVIDENCE/pg_net_response.json` | ⬜ pending |
| 15-02-T3 | 15-02 | 2 | MAIL-02, MAIL-01 | Manual — see Manual-Only table row "Trigger fire produces 2xx + email arrives in test inbox" | (checkpoint:human-verify; resume signal records per-applicant verdicts) | ⬜ pending |
| 15-02-T4 | 15-02 | 2 | MAIL-02 | static + frontmatter validate | `grep -q "Per-Applicant Inbox Verdict" 15-02-SUMMARY.md && grep -q "Trigger Fire Log" ... && gsd-tools frontmatter validate --schema summary` | ⬜ pending |
| 15-03-T1 | 15-03 | 2 | DEPLOY-01 | Manual — see Manual-Only table row "User approval of CI gated sub-decisions" | (checkpoint:decision; resume signal = "default" / "override: ..." / "defer") | ⬜ pending |
| 15-03-T2 | 15-03 | 2 | DEPLOY-01 | static + YAML parse | `test -f .github/workflows/supabase-deploy.yml && grep -q "supabase functions deploy --use-api" ... && grep -q "supabase db push --linked" ... && grep -q "supabase/setup-cli" ... && grep -q "PROJECT_ID: inlagtgpynemhipnqvty" ... && python3 -c "import yaml; yaml.safe_load(open('.github/workflows/supabase-deploy.yml'))"` | ⬜ pending |
| 15-03-T3 | 15-03 | 2 | DEPLOY-01 | static check (TOML) | `test -f supabase/config.toml && grep -q "\[functions.notify-job-filled\]" supabase/config.toml && grep -q "\[functions.send-followup-emails\]" ... && grep -q "\[functions.acknowledge-placement-fee\]" ... && grep -q "\[functions.create-placement-invoice\]" ...` | ⬜ pending |
| 15-03-T4 | 15-03 | 2 | DEPLOY-01 | Manual — see Manual-Only table row "GitHub Actions secrets seeded BEFORE first run" | (checkpoint:human-action; resume signal = `gh secret list` output) | ⬜ pending |
| 15-03-T5 | 15-03 | 2 | DEPLOY-01 | gh CLI + frontmatter validate | `test -f 15-03-EVIDENCE/first_run.json && grep -q "Approved Decision Tuple" 15-03-SUMMARY.md && grep -q "First Run Outcome" ... && gsd-tools frontmatter validate --schema summary` | ⬜ pending |
| 15-04-T1 | 15-04 | 3 | MAIL-01, MAIL-02 | static check (line count + grep) | `test -f .planning/phases/13-email-notifications/13-VERIFICATION.md && grep -q "Sub-phase 13-01" ... && grep -q "Sub-phase 13-02" ... && grep -q "MAIL-01" ... && grep -q "MAIL-02" ... && grep -q "15-01-EVIDENCE" ... && grep -q "15-02-EVIDENCE" ... && [ "$(wc -l < .planning/phases/13-email-notifications/13-VERIFICATION.md)" -ge 80 ]` | ⬜ pending |
| 15-04-T2 | 15-04 | 3 | MAIL-01, MAIL-02 | static check (REQUIREMENTS + ROADMAP edits) | `grep -q "^- \[x\] \*\*MAIL-01\*\*" .planning/REQUIREMENTS.md && grep -q "^- \[x\] \*\*MAIL-02\*\*" .planning/REQUIREMENTS.md && grep -q "^- \[x\] \*\*Phase 15:" .planning/ROADMAP.md && grep -q "13-VERIFICATION.md" .planning/REQUIREMENTS.md` | ⬜ pending |
| 15-04-T3 | 15-04 | 3 | MAIL-01, MAIL-02 | static + frontmatter validate | `test -f 15-04-SUMMARY.md && grep -q "Cross-Plan Evidence Map" ... && grep -q "Phase 15 Outcome" ... && gsd-tools frontmatter validate --schema summary` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Sampling continuity check:** No 3 consecutive tasks lack automated verification. The 3 manual tasks (15-02-T3 inbox observation, 15-03-T1 decision checkpoint, 15-03-T4 secrets seeded) are interleaved with automated tasks on either side. Phase passes Nyquist sampling continuity.

---

## Wave 0 Requirements

*No test framework setup — operational phase. Wave 0 is empty.*

Existing infrastructure (Supabase CLI v2.95.4 expected; `gh` CLI; project-scoped MCP at `inlagtgpynemhipnqvty`) covers all phase verification. If `supabase` CLI is missing locally, plan 15-01 Task 2 installs it via `brew install supabase/tap/supabase` (CONTEXT.md §Tooling).

---

## Manual-Only Verifications

Operational phases legitimately have manual verifications. Each row below has an explicit "Why Manual" justification per Nyquist Dimension 8.

| Behavior | Requirement | Tied To Task | Why Manual | Test Instructions |
|----------|-------------|--------------|------------|-------------------|
| Resend dashboard shows `Verified` SPF/DKIM | MAIL-01 | 15-01-T3 (curl path is automated; screenshot fallback is the manual variant) | Resend's domain status is exposed only via dashboard UI + authenticated API (`GET /domains/:id`); requires Resend API key. The curl path produces structured JSON (automatable); the screenshot fallback is required only if the API key is genuinely unavailable in the executor's environment. | (Curl, automated) `curl -H "Authorization: Bearer $RESEND_API_KEY" https://api.resend.com/domains \| jq '.'` → `status: verified`; OR (screenshot, manual) navigate to https://resend.com/domains, capture `topfarms.co.nz` row showing green Verified SPF + DKIM. |
| Trigger fire produces 2xx + email arrives in test inbox | MAIL-02 | 15-02-T3 | Email delivery is async + external (Resend → real SMTP servers → Gmail/Outlook); cannot be unit-tested; requires real DB row + real inbox observation. Per-applicant negative case (terminal-status applicants did NOT receive email) requires walking each test inbox. | (1) Insert / mark test job_filled row via UI or Studio SQL (per 15-02 Task 2). (2) Query `SELECT id, status_code, content, created FROM net._http_response ORDER BY created DESC LIMIT 5;` for 2xx (this part automated). (3) For each applicant in `test_setup.json`, check inbox — capture screenshot + headers (`Message-Id`, `DKIM-Signature`, `Authentication-Results`) into `15-02-EVIDENCE/`. (4) Report per-applicant verdict (CORRECT / PARTIAL / FAIL) in checkpoint resume signal. |
| User approval of CI gated sub-decisions (trigger / scope / permissions / failure mode) | DEPLOY-01 | 15-03-T1 | Per CONTEXT.md the four CI design decisions are explicitly user-locked; plan-phase produced defaults via /gsd:research-phase, but the user must explicitly approve before any workflow YAML is committed. Cannot be auto-decided — user choice point by design. | Reply with `default` (accept all four RESEARCH.md tuples), `override: (a) <new>; (b) <new>; ...` (specific overrides), or `defer` (skip 15-03 entirely). The chosen tuple must be quoted verbatim in 15-03-SUMMARY.md `decisions:` frontmatter. |
| GitHub Actions secrets seeded BEFORE first workflow run | DEPLOY-01 | 15-03-T4 | `gh secret set` requires interactive auth + a value the executor doesn't possess (the PAT and DB password live on the developer's machine / Supabase dashboard, not in the repo). Verifying secret existence via `gh secret list` is automatable but seeding is human-action. | (1) `gh secret set SUPABASE_ACCESS_TOKEN --body '<paste-PAT-from-15-01>'`. (2) `gh secret set SUPABASE_DB_PASSWORD --body '<paste-DB-password-from-Supabase-dashboard>'`. (3) `gh secret list` — confirm both names appear (values are masked, GH cannot reveal them). (4) Reply `secrets seeded` with the `gh secret list` output. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are listed in Manual-Only table with "Why Manual" justification
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (manual tasks 15-02-T3, 15-03-T1, 15-03-T4 are interleaved with automated tasks; longest manual streak = 1)
- [x] Wave 0 covers all MISSING references (n/a — operational phase, Wave 0 empty)
- [x] No watch-mode flags
- [x] Feedback latency < 30s for CLI/MCP checks
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved by gsd-planner 2026-05-01.
