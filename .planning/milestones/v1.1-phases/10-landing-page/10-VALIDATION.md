---
phase: 10
slug: landing-page
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.1.x + Testing Library React 16.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest tests/landing-page.test.tsx --run` |
| **Full suite command** | `npx vitest --run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest tests/landing-page.test.tsx --run`
- **After every plan wave:** Run `npx vitest --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | LAND-01 | unit | `npx vitest tests/landing-page.test.tsx --run` | ✅ (partial) | ⬜ pending |
| 10-01-02 | 01 | 1 | LAND-02 | unit | `npx vitest tests/landing-page.test.tsx --run` | ❌ W0 | ⬜ pending |
| 10-01-03 | 01 | 1 | LAND-06 | unit | `npx vitest tests/landing-page.test.tsx --run` | ❌ W0 | ⬜ pending |
| 10-01-04 | 01 | 1 | LAND-10 | unit | `npx vitest tests/landing-page.test.tsx --run` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 1 | LAND-04 | unit | `npx vitest tests/landing-page.test.tsx --run` | ❌ W0 | ⬜ pending |
| 10-02-02 | 02 | 1 | LAND-05 | unit | `npx vitest tests/landing-page.test.tsx --run` | ❌ W0 | ⬜ pending |
| 10-02-03 | 02 | 1 | LAND-07 | unit | `npx vitest tests/landing-page.test.tsx --run` | ❌ W0 | ⬜ pending |
| 10-03-01 | 03 | 2 | LAND-03 | unit | `npx vitest tests/landing-page.test.tsx --run` | ❌ W0 | ⬜ pending |
| 10-03-02 | 03 | 2 | LAND-08 | unit | `npx vitest tests/landing-page.test.tsx --run` | ❌ W0 | ⬜ pending |
| 10-03-03 | 03 | 2 | LAND-09 | unit | `npx vitest tests/landing-page.test.tsx --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/landing-page.test.tsx` — add test cases for LAND-02 through LAND-10
- [ ] `tests/setup.ts` — add motion/react mock if needed after motion install
- [ ] `npm install motion` — install motion library (LAND-01 dependency)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Staggered fadeUp animation timing | LAND-01 | Animation timing requires visual verification | Load page, confirm hero lines animate in sequence (not simultaneously), ~150-200ms stagger |
| Pulsing green dot animation | LAND-02 | CSS animation requires visual check | Verify green dot pulses smoothly alongside counters |
| Mock browser window visual fidelity | LAND-04 | Layout/styling check | Confirm mock browser has address bar dots, rounded corners, 4 bullet points visible |
| Section ordering matches funnel flow | All | Page structure verification | Scroll page top to bottom, verify section order matches CONTEXT.md spec |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
