---
phase: 5
slug: revenue-protection
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^3.1.1 + @testing-library/react ^16.3.0 |
| **Config file** | vitest.config.ts (merges viteConfig for @ alias) |
| **Quick run command** | `npx vitest run tests/placement-fee.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/placement-fee.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | REVN-01 | unit | `npx vitest run tests/placement-fee.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | REVN-01 | unit | `npx vitest run tests/placement-fee.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | REVN-02 | unit | `npx vitest run tests/placement-fee.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | REVN-02 | unit | `npx vitest run tests/placement-fee.test.ts` | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 2 | REVN-03 | manual | Manual Stripe CLI webhook replay | N/A | ⬜ pending |
| 05-04-01 | 04 | 2 | REVN-04 | manual | Manual Stripe CLI webhook replay | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/placement-fee.test.ts` — stubs for REVN-01 (modal intercept, cancel behavior), REVN-02 (fee calculation, contact masking UI)
- [ ] `tests/setup.ts` — already exists, no change needed

*Existing infrastructure covers framework and config.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stripe idempotency: duplicate payment_intent.succeeded webhook | REVN-03 | Requires Stripe CLI webhook replay against live Edge Function | `stripe trigger payment_intent.succeeded` twice, verify single listing_fee row |
| Invoice idempotency: duplicate invoice.payment_succeeded webhook | REVN-04 | Requires Stripe CLI webhook replay against live Edge Function | `stripe trigger invoice.payment_succeeded` twice, verify single confirmed_at write |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
