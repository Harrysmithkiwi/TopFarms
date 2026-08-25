---
phase: 10-landing-page
plan: "03"
subsystem: landing-page
tags: [landing, social-proof, cta, testimonials, trusted-by]
dependency_graph:
  requires: [10-01, 10-02]
  provides: [TrustedByStrip, FinalCTASection, testimonial-stat-blocks]
  affects: [src/pages/Home.tsx]
tech_stack:
  added: []
  patterns: [motion/react scroll-reveal, dual-CTA buttons, stat grid with dividers]
key_files:
  created:
    - src/components/landing/TrustedByStrip.tsx
    - src/components/landing/FinalCTASection.tsx
  modified:
    - src/components/landing/TestimonialsSection.tsx
    - src/pages/Home.tsx
    - tests/landing-page.test.tsx
decisions:
  - "getAllByRole used for Find Farm Work/Post a Job in tests — links appear in both HeroSection and FinalCTASection"
  - "react-router import used (not react-router-dom) — project uses react-router v7"
metrics:
  duration: "8 minutes"
  completed_date: "2026-03-22"
  tasks_completed: 2
  files_modified: 5
---

# Phase 10 Plan 03: Social Proof, Trusted-by Strip, and Final CTA Summary

Social proof stat blocks + Trusted-by strip + Final CTA section completing the landing page bottom-of-funnel with 4 stat blocks in TestimonialsSection and two new sections before the footer.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add social proof stat blocks to TestimonialsSection | 28ba9e2 | TestimonialsSection.tsx |
| 2 | Create TrustedByStrip, FinalCTASection, finalize Home.tsx | 4b1f8b6 | TrustedByStrip.tsx, FinalCTASection.tsx, Home.tsx, tests |

## What Was Built

**TestimonialsSection stat blocks:** 4 connected stat blocks (500+ Farms, 2,000+ Workers, 48hr Avg Match Time, 95% Satisfaction) placed above the testimonial heading in a `grid-cols-2 md:grid-cols-4` layout. Each block has vertical `border-r` dividers on desktop using `rgba(255,255,255,0.12)`.

**TrustedByStrip:** Cream background section with 5 greyed-out farm brand name placeholders (Fonterra Sharemilkers, Silver Fern Farms, Greenfield Agriculture, Highview Station, Valley View Dairy) rendered at 50% opacity to simulate faded brand logos. Scroll-reveal motion animation.

**FinalCTASection:** Soil-deep background with centered headline "Ready to Find Your Perfect Match?", subtext, and dual buttons — meadow-filled "Find Farm Work" linking to `/seeker/onboarding` and hay-bordered outline "Post a Job" linking to `/employer/onboarding`.

**Home.tsx:** All 11 sections in complete SPEC order: Nav, HeroSection, CountersSection, AIMatchingSection, HowItWorksSection, FarmTypesStrip, FeaturedListings, EmployerCTABand, TestimonialsSection, TrustedByStrip, FinalCTASection, LandingFooter.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Wrong router import package**
- **Found during:** Task 2 test run
- **Issue:** Plan specified `react-router-dom` but project uses `react-router` v7 (no -dom package)
- **Fix:** Changed `import { Link } from 'react-router-dom'` to `import { Link } from 'react-router'`
- **Files modified:** FinalCTASection.tsx
- **Commit:** 4b1f8b6

**2. [Rule 3 - Blocking] getByRole ambiguity for duplicate link text**
- **Found during:** Task 2 test run
- **Issue:** "Find Farm Work" and "Post a Job" links exist in both HeroSection and FinalCTASection; `getByRole` throws on multiple matches
- **Fix:** Changed `getByRole` to `getAllByRole(...).length > 0` assertion
- **Files modified:** tests/landing-page.test.tsx
- **Commit:** 4b1f8b6

## Verification

- All 28 landing page tests pass (`npx vitest tests/landing-page.test.tsx --run`)
- Home.tsx imports and renders 11 sections in SPEC order
- TestimonialsSection contains 500+, 2,000+, 48hr, 95% stat values
- TrustedByStrip shows Fonterra Sharemilkers and 4 other brands
- FinalCTASection shows dual CTA buttons on soil-deep background

## Self-Check: PASSED
