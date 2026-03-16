---
phase: 3
slug: seeker-demand-side
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-03-16
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + @testing-library/react |
| **Config file** | `vitest.config.ts` (Wave 0 installs) |
| **Quick run command** | `npx vitest run --reporter=dot` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=dot`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | SONB-01 | unit | `npx vitest run tests/seeker-onboarding.test.tsx` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | SONB-07 | integration | `npx vitest run tests/seeker-profile.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | SRCH-01 | unit | `npx vitest run tests/job-search.test.tsx` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | SRCH-12 | smoke | Manual — measure network tab | manual-only | ⬜ pending |
| 03-03-01 | 03 | 2 | APPL-01 | integration | `npx vitest run tests/applications.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 2 | APPL-03 | unit | `npx vitest run tests/applications.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-03 | 03 | 2 | APPL-05 | unit | `npx vitest run tests/pipeline-transitions.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `vitest.config.ts` + `tests/setup.ts` — framework config
- [x] `npm install -D vitest @testing-library/react @testing-library/user-event jsdom` — framework install
- [x] `tests/seeker-onboarding.test.tsx` — stubs for SONB-01 through SONB-08
- [x] `tests/job-search.test.tsx` — stubs for SRCH-01 through SRCH-11
- [x] `tests/applications.test.ts` — stubs for APPL-01 through APPL-06
- [x] `tests/pipeline-transitions.test.ts` — state machine logic for APPL-05
- [x] `tests/seeker-profile.test.ts` — profile CRUD for SONB-07

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Search results load in <1.5s | SRCH-12 | Performance measurement requires real network/DB | Open /jobs, apply 3+ filters, measure network tab total time |
| Mobile filter drawer UX | SRCH-06 | Visual/interaction testing | Resize to 375px, tap filter icon, verify bottom drawer opens with "Show X results" button |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
