---
phase: 4
slug: match-scoring-engine
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-16
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^3.1.1 + @testing-library/react |
| **Config file** | `vitest.config.ts` (mergeConfig with vite.config.ts) |
| **Quick run command** | `npx vitest run tests/match-scoring.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/match-scoring.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-00-01 | 00 | 0 | MTCH-01/02/03/06 | scaffold | `npx vitest run tests/match-scoring.test.ts tests/match-breakdown-ui.test.tsx` | Created by 04-00 | pending |
| 04-01-01 | 01 | 1 | MTCH-01 | unit | `npx vitest run tests/match-scoring.test.ts` | Created by 04-00 | pending |
| 04-01-02 | 01 | 1 | MTCH-02 | unit | `npx vitest run tests/match-scoring.test.ts` | Created by 04-00 | pending |
| 04-01-03 | 01 | 1 | MTCH-03 | unit | `npx vitest run tests/match-scoring.test.ts` | Created by 04-00 | pending |
| 04-03-01 | 03 | 2 | MTCH-06 | unit | `npx vitest run tests/match-breakdown-ui.test.tsx` | Created by 04-00 | pending |
| 04-XX-XX | XX | X | MTCH-04 | manual | Manual — requires live Supabase | N/A | pending |
| 04-XX-XX | XX | X | MTCH-05 | manual | Manual — requires live Supabase + timer | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [x] `tests/match-scoring.test.ts` — stubs for MTCH-01, MTCH-02, MTCH-03 (pure TS scoring logic unit tests) — created by 04-00-PLAN.md
- [x] `tests/match-breakdown-ui.test.tsx` — stubs for MTCH-06 (MatchBreakdown renders explanation conditionally) — created by 04-00-PLAN.md

*Existing infrastructure covers framework: `vitest.config.ts`, `tests/setup.ts`, `@testing-library/react` are all present — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pre-computed scores exist in match_scores after trigger fires | MTCH-04 | Requires live Supabase with deployed triggers | 1. Deploy migration 2. Insert/update a seeker profile 3. Query match_scores table for new rows |
| Score updates within 60s of seeker profile change | MTCH-05 | Requires live Supabase + wall-clock timer | 1. Deploy migration 2. Update seeker profile 3. Poll match_scores and verify updated_at < 60s |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
