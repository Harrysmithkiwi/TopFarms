---
phase: 7
slug: ui-primitives
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.1.1 + @testing-library/react 16.3 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/ui-primitives.test.tsx --reporter=dot` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/ui-primitives.test.tsx --reporter=dot`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | PRIM-01 | unit | `npx vitest run tests/ui-primitives.test.tsx -t "ChipSelector" --reporter=dot` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | PRIM-02 | unit | `npx vitest run tests/ui-primitives.test.tsx -t "StatusBanner" --reporter=dot` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 2 | PRIM-03 | unit | `npx vitest run tests/ui-primitives.test.tsx -t "Breadcrumb" --reporter=dot` | ❌ W0 | ⬜ pending |
| 07-02-02 | 02 | 2 | PRIM-04 | unit | `npx vitest run tests/ui-primitives.test.tsx -t "StatsStrip" --reporter=dot` | ❌ W0 | ⬜ pending |
| 07-02-03 | 02 | 2 | PRIM-05 | unit | `npx vitest run tests/ui-primitives.test.tsx -t "Timeline" --reporter=dot` | ❌ W0 | ⬜ pending |
| 07-02-04 | 02 | 2 | PRIM-06 | unit | `npx vitest run tests/ui-primitives.test.tsx -t "StarRating" --reporter=dot` | ❌ W0 | ⬜ pending |
| 07-02-05 | 02 | 2 | PRIM-07 | unit | `npx vitest run tests/ui-primitives.test.tsx -t "Pagination" --reporter=dot` | ❌ W0 | ⬜ pending |
| 07-03-01 | 03 | 3 | PRIM-08 | unit | `npx vitest run tests/ui-primitives.test.tsx -t "SearchHero" --reporter=dot` | ❌ W0 | ⬜ pending |
| 07-03-02 | 03 | 3 | PRIM-09 | unit | `npx vitest run tests/ui-primitives.test.tsx -t "LivePreviewSidebar" --reporter=dot` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/ui-primitives.test.tsx` — stubs for PRIM-01 through PRIM-09 (14 test cases)
- [ ] No shared fixture gaps — Vitest setup already configured in `tests/setup.ts`
- [ ] No framework install needed — Vitest + Testing Library already in devDependencies

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ChipSelector selected state visual (moss border + rgba bg) | PRIM-01 | Computed style values depend on full CSS rendering | Render ChipSelector with a selected chip; verify green border + light green bg visible |
| StatusBanner declined opacity (bg only, not text) | PRIM-02 | CSS opacity layering not testable via className alone | Render declined variant; verify text is fully readable against dimmed bg |
| SearchHero gradient background | PRIM-08 | Gradient rendering requires visual inspection | Render SearchHero; verify soil→dark green gradient with green glow |
| LivePreviewSidebar sticky positioning | PRIM-09 | Requires scroll context to validate | Place sidebar in scrollable parent; verify it sticks on scroll |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
