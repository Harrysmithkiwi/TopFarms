---
phase: 06
slug: landing-page-and-launch
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | LAND-01 | visual | Manual browser check | N/A | ⬜ pending |
| 06-01-02 | 01 | 1 | LAND-02 | unit | `npx vitest run tests/landing.test.ts` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | LAND-03 | visual | Manual browser check | N/A | ⬜ pending |
| 06-02-02 | 02 | 2 | LAND-04 | visual | Manual browser check | N/A | ⬜ pending |
| 06-02-03 | 02 | 2 | LAND-05 | visual | Manual browser check | N/A | ⬜ pending |
| 06-02-04 | 02 | 2 | LAND-06 | visual | Manual browser check | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/landing.test.ts` — stubs for LAND-02 counter logic
- Existing vitest infrastructure covers test needs

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hero renders with dual CTA | LAND-01 | Visual layout | Open /, verify hero section with both buttons |
| Counters animate on scroll | LAND-02 | Intersection Observer visual | Scroll to counters section, verify count-up animation |
| How-it-works toggle | LAND-03 | Interactive UI | Click employer/seeker tabs, verify content switches |
| Featured listings display | LAND-04 | Real data dependent | Verify featured jobs from DB appear |
| Testimonials render | LAND-05 | Visual layout | Check testimonial cards display |
| Footer navigation | LAND-06 | Link verification | Click each footer link, verify navigation |
| Mobile 320px flows | LAND-03 | Responsive layout | Resize to 320px, test all critical flows |
| WCAG 2.1 AA | LAND-03 | Accessibility audit | Run Lighthouse, keyboard nav test |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
