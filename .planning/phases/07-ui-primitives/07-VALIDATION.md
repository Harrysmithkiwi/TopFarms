---
phase: 7
slug: ui-primitives
status: approved
nyquist_compliant: true
wave_0_complete: true
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
| **Quick run command** | `npx vitest run tests/chip-status.test.tsx tests/ui-primitives-batch.test.tsx tests/search-preview.test.tsx --reporter=dot` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | PRIM-01 | unit | `npx vitest run tests/chip-status.test.tsx -t "ChipSelector" --reporter=dot` | ✅ | ✅ green |
| 07-01-02 | 01 | 1 | PRIM-02 | unit | `npx vitest run tests/chip-status.test.tsx -t "StatusBanner" --reporter=dot` | ✅ | ✅ green |
| 07-02-01 | 02 | 2 | PRIM-03 | unit | `npx vitest run tests/ui-primitives-batch.test.tsx -t "Breadcrumb" --reporter=dot` | ✅ | ✅ green |
| 07-02-02 | 02 | 2 | PRIM-04 | unit | `npx vitest run tests/ui-primitives-batch.test.tsx -t "StatsStrip" --reporter=dot` | ✅ | ✅ green |
| 07-02-03 | 02 | 2 | PRIM-05 | unit | `npx vitest run tests/ui-primitives-batch.test.tsx -t "Timeline" --reporter=dot` | ✅ | ✅ green |
| 07-02-04 | 02 | 2 | PRIM-06 | unit | `npx vitest run tests/ui-primitives-batch.test.tsx -t "StarRating" --reporter=dot` | ✅ | ✅ green |
| 07-02-05 | 02 | 2 | PRIM-07 | unit | `npx vitest run tests/ui-primitives-batch.test.tsx -t "Pagination" --reporter=dot` | ✅ | ✅ green |
| 07-03-01 | 03 | 3 | PRIM-08 | unit | `npx vitest run tests/search-preview.test.tsx -t "SearchHero" --reporter=dot` | ✅ | ✅ green |
| 07-03-02 | 03 | 3 | PRIM-09 | unit | `npx vitest run tests/search-preview.test.tsx -t "LivePreviewSidebar" --reporter=dot` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/chip-status.test.tsx` — ChipSelector (9 tests) + StatusBanner (7 tests)
- [x] `tests/ui-primitives-batch.test.tsx` — Breadcrumb (7), StatsStrip (2), Timeline (6), StarRating (5), Pagination (7)
- [x] `tests/search-preview.test.tsx` — SearchHero (8) + LivePreviewSidebar (7+)
- [x] No shared fixture gaps — Vitest setup already configured in `tests/setup.ts`
- [x] No framework install needed — Vitest + Testing Library already in devDependencies

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

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-23

## Validation Audit 2026-03-23
| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 9 PRIM requirements covered by existing tests across 3 test files. Tests were created during Phases 8-10 execution when primitives were built inline.
