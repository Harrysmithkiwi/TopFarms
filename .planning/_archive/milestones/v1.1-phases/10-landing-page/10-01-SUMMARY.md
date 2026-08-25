---
phase: 10-landing-page
plan: "01"
subsystem: landing-page
tags: [animation, motion, ui, landing]
dependency_graph:
  requires: []
  provides: [hero-stagger-animation, live-counter-badge, match-score-circles, cta-fork-radius]
  affects: [src/components/landing/HeroSection.tsx, src/components/landing/CountersSection.tsx, src/components/landing/FeaturedListings.tsx]
tech_stack:
  added: [motion]
  patterns: [motion stagger variants, animate-pulse, absolute positioned overlay circles]
key_files:
  created: []
  modified:
    - src/components/landing/HeroSection.tsx
    - src/components/landing/CountersSection.tsx
    - src/components/landing/FeaturedListings.tsx
    - tests/landing-page.test.tsx
    - package.json
decisions:
  - "No motion mock needed in tests — motion/react renders fine in jsdom without mocking"
  - "FeaturedListings match score circle uses absolute positioning; card wrapper gets relative class"
  - "Live badge uses pt-8 on its wrapper to maintain visual spacing since section lost top padding"
metrics:
  duration: "~5 minutes"
  completed: "2026-03-22T05:51:31Z"
  tasks_completed: 2
  files_modified: 5
---

# Phase 10 Plan 01: Landing Page SPEC Compliance Summary

Motion library installed; staggered hero animation, pulsing Live counter badge, and match score circles added to bring landing page to SPEC compliance.

## Tasks Completed

| Task | Description | Commit |
| ---- | ----------- | ------ |
| 1 | Install motion, add hero stagger animation + CTA fork 14px radius | 60beb82 |
| 2 | Add Live counter badge and featured listing match score circles | afdd8b4 |

## What Was Built

**Task 1 — Hero animation + CTA fork fix:**
- Installed `motion` npm package
- `HeroSection.tsx`: imported `motion` from `motion/react`; wrapped `<h1>` in `<motion.h1>` with `containerVariants` (staggerChildren: 0.18); each headline line wrapped in `<motion.span variants={lineVariants}>` (opacity 0→1, y 24→0, duration 0.55s)
- CTA fork wrapper: removed `rounded-2xl` class, added `style={{ borderRadius: '14px' }}` inline

**Task 2 — Live badge + match scores:**
- `CountersSection.tsx`: added centered Live badge with `animate-pulse` green dot above the counters grid
- `FeaturedListings.tsx`: added `MOCK_MATCH_SCORES = [94, 87, 91, 82]` constant; `JobCard` receives `matchScore` prop; absolute-positioned circle (`top-3 right-3`) renders `{matchScore}%` in meadow green
- `tests/landing-page.test.tsx`: added "CountersSection renders Live badge" test and "FeaturedListings renders match score circles" test

## Test Results

25 tests passed (4 new tests added in this plan).

## Deviations from Plan

None — plan executed exactly as written. No motion mock was needed in tests (motion/react renders transparently in jsdom).

## Self-Check: PASSED

All key files exist and both task commits verified in git log.
