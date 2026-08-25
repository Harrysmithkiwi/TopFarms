---
phase: 13
slug: email-notifications
status: complete
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

<!-- SC-6 finalised 2026-05-10: Phase 13 predates the Nyquist Wave 0 scaffolding workflow adoption.
Retroactively assessed as nyquist_compliant: false (definitive, not draft).
The primary deliverable — notify-job-filled Edge Function — has no automated Vitest/unit tests.
Validation was performed via UAT in Phase 15-02 (empirical trigger fire, email delivery observed).
UAT is the appropriate mechanism for a Deno Edge Function that exercises pg_net and Resend.
status: complete (validation was performed; just not via automated unit tests). -->

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | MAIL-02 | unit+integration | `npx vitest run tests/notify-job-filled.test.ts` | ❌ W0 | ⬜ pending |
| 13-02-01 | 02 | 1 | MAIL-01 | manual | N/A (DNS config) | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/notify-job-filled.test.ts` — stubs for MAIL-02 ghosting notification Edge Function
- [ ] `supabase/functions/notify-job-filled/index.ts` — Edge Function scaffold

*SPF/DKIM (MAIL-01) is DNS configuration — no test scaffolds needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SPF/DKIM DNS records verified | MAIL-01 | Requires Resend dashboard + DNS registrar access | 1. Add SPF/DKIM records from Resend dashboard to domain registrar 2. Verify in Resend dashboard shows "Verified" 3. Send test email to Gmail/Outlook, confirm inbox delivery |
| Email arrives in inbox not spam | MAIL-01 | Requires real email delivery | Send test email via Resend, check Gmail/Outlook inbox |
| Webhook fires on job filled | MAIL-02 | Requires Supabase webhook + real database trigger | Mark a test job as filled, verify Edge Function invocation in Supabase logs |

*Automated tests cover the Edge Function logic (filtering, email content). Manual tests cover the infrastructure trigger chain.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
