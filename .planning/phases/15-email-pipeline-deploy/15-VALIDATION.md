---
phase: 15
slug: email-pipeline-deploy
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-01
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

> Populated by gsd-planner. This phase is operational — every task has either an automated CLI/MCP/HTTP check or is in the explicit Manual-Only table below (see "Why Manual" column for justification per Nyquist Dimension 8).

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD     | TBD  | TBD  | TBD         | TBD       | TBD               | TBD         | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Planner MUST fill this table during PLAN.md creation. One row per task.*

---

## Wave 0 Requirements

*No test framework setup — operational phase. Wave 0 is empty.*

Existing infrastructure (Supabase CLI v2.95.4 expected; `gh` CLI; project-scoped MCP at `inlagtgpynemhipnqvty`) covers all phase verification. If `supabase` CLI is missing locally, Wave 1 task 1 must install it (CONTEXT.md §Tooling).

---

## Manual-Only Verifications

Operational phases legitimately have manual verifications. Each row below MUST have an explicit "Why Manual" justification per Nyquist Dimension 8.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Resend dashboard shows `Verified` SPF/DKIM | MAIL-01 | Resend's domain status is exposed only via dashboard UI + authenticated API (`GET /domains/:id`); requires Resend API key not present in CI yet | `curl -H "Authorization: Bearer $RESEND_API_KEY" https://api.resend.com/domains` → status `verified`; OR screenshot Resend dashboard. Attach JSON output / screenshot to 13-VERIFICATION.md |
| Trigger fire produces 2xx + email arrives in test inbox | MAIL-02 | Email delivery is async + external (Resend → real SMTP servers); cannot be unit-tested; requires real DB row + real inbox observation | (1) Insert test job_filled row via Studio SQL, (2) tail `supabase functions logs notify-job-filled --project-ref inlagtgpynemhipnqvty` for 2xx, (3) check test inbox for delivery, (4) capture log snippet + email headers (Message-Id, DKIM-Signature) into 13-VERIFICATION.md |
| Live function callsite cross-reference (no 404 silent failures) | DEPLOY-01 | Requires comparing source-tree `supabase.functions.invoke()` callsites against live deployed functions list — cross-reference is mechanical but produces a structured proof artefact, not a binary pass/fail in CI | (1) `grep -rE "supabase\.functions\.invoke\(['\"]" src/` → list callees, (2) `mcp__supabase__list_edge_functions` → list deployed, (3) diff = ∅. Capture diff command + output in 13-VERIFICATION.md |
| 13-VERIFICATION.md backfill is goal-backward complete | (Phase 13 deliverable) | Document review — verifying narrative coherence + evidence completeness against ROADMAP Phase 13 success criteria is qualitative judgement | Manually verify: every success criterion in ROADMAP Phase 13 has a `Verdict: SATISFIED` block + linked empirical evidence (curl/log/screenshot) below it |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or are listed in Manual-Only table with "Why Manual" justification
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (n/a — operational, but flagged for planner attention)
- [ ] Wave 0 covers all MISSING references (n/a — Wave 0 empty)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s for CLI/MCP checks
- [ ] `nyquist_compliant: true` set in frontmatter (after planner fills Per-Task table)

**Approval:** pending
