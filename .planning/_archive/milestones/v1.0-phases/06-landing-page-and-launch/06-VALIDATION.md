---
phase: 06
slug: landing-page-and-launch
status: draft
nyquist_compliant: true
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
| 06-01-01 | 01 | 1 | LAND-01 thru LAND-06 | unit stubs | `npx vitest run tests/landing-page.test.tsx` | Wave 0 (stubs in 06-01) | pending |
| 06-01-01 | 01 | 1 | LAND-01 | unit stubs | `npx vitest run tests/signup-role-preselect.test.tsx` | Wave 0 (stubs in 06-01) | pending |
| 06-02-01 | 02 | 2 | LAND-01 thru LAND-06 | unit | `npx vitest run tests/landing-page.test.tsx` | Filled in 06-02 | pending |
| 06-02-01 | 02 | 2 | LAND-01 | unit | `npx vitest run tests/signup-role-preselect.test.tsx` | Filled in 06-02 | pending |
| 06-02-02 | 02 | 2 | All | manual | Lighthouse + 320px visual | N/A | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [ ] `tests/landing-page.test.tsx` — stubs (it.todo) for LAND-01 through LAND-06 component rendering (created in Plan 06-01)
- [ ] `tests/signup-role-preselect.test.tsx` — stubs (it.todo) for signup role pre-selection (created in Plan 06-01)
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
| Mobile 320px flows | All | Responsive layout | Resize to 320px, test all critical flows |
| Lighthouse Performance > 90 | All | Performance audit | Run Lighthouse, verify Performance > 90 |
| Lighthouse Accessibility > 90 | All | Accessibility audit | Run Lighthouse, verify Accessibility > 90 |
| WCAG 2.1 AA | All | Accessibility audit | Keyboard nav test, colour contrast check |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
