---
phase: 06-landing-page-and-launch
plan: "01"
subsystem: ui
tags: [react, tailwind, supabase, intersection-observer, requestAnimationFrame, rpc]

requires:
  - phase: 02-employer-supply-side
    provides: jobs table with status/listing_tier for featured listings query
  - phase: 03-seeker-demand-side
    provides: seeker_profiles table for counter RPC
  - phase: 04-match-scoring-engine
    provides: match_scores table for counter RPC

provides:
  - Public landing page at / with hero, counters, how-it-works, featured listings, testimonials, footer
  - useCountUp hook (requestAnimationFrame, ease-out cubic, prefers-reduced-motion)
  - useInView hook (IntersectionObserver, one-shot trigger)
  - get_platform_stats() Supabase RPC function (SECURITY DEFINER, anon-accessible)
  - SignUp role pre-selection from ?role= URL parameter
  - Test stub files for Wave 2 TDD implementation

affects:
  - 06-landing-page-and-launch (06-02 tests will fill in stub bodies)

tech-stack:
  added: []
  patterns:
    - useInView + useCountUp composed for scroll-triggered counter animation
    - SECURITY DEFINER RPC pattern for anon aggregate reads without RLS bypass
    - Landing section components each self-contained with own Supabase fetch

key-files:
  created:
    - src/hooks/useCountUp.ts
    - src/hooks/useInView.ts
    - src/components/landing/HeroSection.tsx
    - src/components/landing/CountersSection.tsx
    - src/components/landing/HowItWorksSection.tsx
    - src/components/landing/FeaturedListings.tsx
    - src/components/landing/TestimonialsSection.tsx
    - src/components/landing/LandingFooter.tsx
    - supabase/migrations/012_platform_stats_rpc.sql
    - tests/landing-page.test.tsx
    - tests/signup-role-preselect.test.tsx
  modified:
    - src/pages/Home.tsx
    - src/pages/auth/SignUp.tsx

key-decisions:
  - "FeaturedListings queries listing_tier in ('featured','premium') and falls back to 3 most-recent active jobs when no featured jobs exist — ensures page always shows content"
  - "get_platform_stats RPC uses SECURITY DEFINER to give anon users aggregate read access without exposing RLS-protected seeker_profiles/match_scores tables directly"
  - "useInView disconnects after first intersection (one-shot) — counters animate once on scroll, not repeatedly"
  - "HeroSection uses CSS-only dark background (var(--color-soil-deep)) with radial gradient blobs — avoids LCP image penalty per wireframe approach"
  - "SignUp role pre-selection uses useEffect to call setValue('role', initialRole) after form initialisation — ensures react-hook-form schema validation is satisfied"

patterns-established:
  - "useInView + useCountUp: compose hooks for any scroll-triggered counter section"
  - "SECURITY DEFINER RPC: use for aggregate stats that anon users need but shouldn't have direct table access to"

requirements-completed: [LAND-01, LAND-02, LAND-03, LAND-04, LAND-05, LAND-06]

duration: 6min
completed: "2026-03-17"
---

# Phase 6 Plan 01: Landing Page Sections Summary

**Full-bleed landing page with soil-deep hero, scroll-triggered live counters via SECURITY DEFINER RPC, how-it-works tab toggle, featured job listings with empty-state, static testimonials, and footer — plus SignUp role pre-selection from ?role= URL param**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-17T09:37:07Z
- **Completed:** 2026-03-17T09:43:05Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- Complete landing page at `/` with all 6 sections replacing placeholder Home.tsx
- get_platform_stats() SECURITY DEFINER RPC enables anonymous counter reads without direct table access
- SignUp.tsx pre-selects role from `?role=seeker` or `?role=employer` URL parameter, wiring the CTA fork to the signup form

## Task Commits

1. **Task 1: Create hooks, RPC migration, landing sections, test stubs** - `fa3ff84` (feat)
2. **Task 2: Replace Home.tsx and wire SignUp role pre-selection** - `12115bc` (feat)

## Files Created/Modified

- `src/hooks/useCountUp.ts` - requestAnimationFrame count-up with ease-out cubic and prefers-reduced-motion support
- `src/hooks/useInView.ts` - IntersectionObserver one-shot scroll trigger with cleanup
- `supabase/migrations/012_platform_stats_rpc.sql` - SECURITY DEFINER RPC for anon aggregate stats
- `src/components/landing/HeroSection.tsx` - Dark hero with radial blobs, topo lines, dual CTA fork, decorative cards
- `src/components/landing/CountersSection.tsx` - Live counters calling get_platform_stats RPC with scroll animation
- `src/components/landing/HowItWorksSection.tsx` - 4-step cards with seeker/employer tab toggle (ARIA role=tab)
- `src/components/landing/FeaturedListings.tsx` - Featured jobs query with empty-state and fallback to recent jobs
- `src/components/landing/TestimonialsSection.tsx` - 3 static testimonial cards on soil background
- `src/components/landing/LandingFooter.tsx` - 4-column footer with nav and legal links
- `tests/landing-page.test.tsx` - it.todo stubs for LAND-01 through LAND-06
- `tests/signup-role-preselect.test.tsx` - it.todo stubs for role pre-selection tests
- `src/pages/Home.tsx` - Replaced placeholder with composition of all 6 landing sections
- `src/pages/auth/SignUp.tsx` - Added useSearchParams + initialRole + useEffect setValue sync

## Decisions Made

- FeaturedListings falls back to 3 most-recent active jobs when no featured/premium listings exist — page always shows content rather than empty state
- SECURITY DEFINER RPC pattern used so anonymous visitors can read aggregate counts (jobs, seekers, matches) without direct table access bypassing RLS
- useInView one-shot trigger: counters animate once per page load, not on every re-entry
- HeroSection uses CSS background approach (no img tag) to avoid LCP penalty

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 6 landing sections are live at `/` route
- Test stub files ready for Wave 2 TDD implementation (06-02)
- No blockers for next plan

---
*Phase: 06-landing-page-and-launch*
*Completed: 2026-03-17*
