---
phase: 08
slug: wizard-field-extensions
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 08 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
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
| 08-01-01 | 01 | 1 | EONB-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | EONB-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 1 | PJOB-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 1 | SONB-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for employer onboarding field extensions
- [ ] Test stubs for post job wizard field extensions
- [ ] Test stubs for seeker onboarding field extensions
- [ ] Boolean-to-chip migration utility tests

*Existing vitest infrastructure covers framework needs — no new install required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| LivePreviewSidebar sticky positioning in PostJob | PJOB-07 | CSS sticky behavior requires visual inspection | Open PostJob wizard, scroll steps 2-5, verify sidebar stays fixed |
| Completion screen two-column layout | EONB-09 | Layout rendering requires visual inspection | Complete employer onboarding, verify two-column layout on desktop |
| Chip pre-population from boolean data | EONB-05 | Requires existing v1.0 user data in DB | Create v1.0 user, re-open wizard, verify chips are pre-selected |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
