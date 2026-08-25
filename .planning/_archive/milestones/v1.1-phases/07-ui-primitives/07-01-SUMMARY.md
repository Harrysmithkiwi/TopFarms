---
phase: 07-ui-primitives
plan: 01
subsystem: ui
tags: [react, tailwind, chip-selector, status-banner, tdd, vitest]

requires:
  - phase: none
    provides: standalone primitives using existing design tokens
provides:
  - ChipSelector component with single/multi select and string[] value shape
  - StatusBanner component with 4 status variants and actions slot
affects: [08-employer-wizard, 09-job-search, 10-seeker-wizard, 11-matching]

tech-stack:
  added: []
  patterns: [variant-map-with-cn, controlled-input-string-array, grid-layout-lookup-object]

key-files:
  created:
    - src/components/ui/ChipSelector.tsx
    - src/components/ui/StatusBanner.tsx
    - tests/chip-status.test.tsx
  modified: []

key-decisions:
  - "ChipSelector uses button elements (not divs) for accessibility"
  - "StatusBanner titleColor varies per variant (text-red for declined, text-ink for others)"

patterns-established:
  - "Grid layout lookup object: map columns prop to mutually exclusive Tailwind class strings"
  - "Variant map with titleColor: extend Tag.tsx pattern to include per-variant text color"

requirements-completed: [PRIM-01, PRIM-02]

duration: 2min
completed: 2026-03-21
---

# Phase 7 Plan 1: ChipSelector + StatusBanner Summary

**ChipSelector with single/multi select modes and StatusBanner with 4 status variants using variant-map pattern and TDD**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-21T00:29:04Z
- **Completed:** 2026-03-21T00:31:23Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- ChipSelector renders single-select (radio) and multi-select (toggle) with moss/fog styling, Check icon on selected state, and grid layout via columns prop
- StatusBanner renders all four variants (shortlisted, interview, offer, declined) with exact SPEC copy, correct background colors, bg-only opacity on declined
- 16 unit tests passing (9 ChipSelector + 7 StatusBanner) via TDD RED-GREEN flow

## Task Commits

Each task was committed atomically:

1. **Task 1: ChipSelector component + tests**
   - `e0505cb` (test) - RED: failing ChipSelector tests
   - `0b24601` (feat) - GREEN: ChipSelector implementation
2. **Task 2: StatusBanner component + tests**
   - `475f46c` (test) - RED: failing StatusBanner tests
   - `690c597` (feat) - GREEN: StatusBanner implementation

## Files Created/Modified
- `src/components/ui/ChipSelector.tsx` - Chip grid selector with single/multi mode, columns prop, optional icons, Check icon on selected
- `src/components/ui/StatusBanner.tsx` - Status banner with 4 variants (shortlisted/interview/offer/declined), actions slot for CTAs
- `tests/chip-status.test.tsx` - 16 unit tests covering both components

## Decisions Made
- ChipSelector uses `<button type="button">` elements for accessibility (keyboard navigable, screen reader friendly)
- StatusBanner uses per-variant titleColor field in variant map (text-red for declined, text-ink for all others)
- Checkmark icon positioned inline with ml-auto (not absolute top-right) for better label alignment across chip widths

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ChipSelector ready for consumption by employer wizard (Phase 8), job posting wizard, and seeker wizard (Phase 10)
- StatusBanner ready for My Applications page (Phase 9)
- Both components export clean TypeScript interfaces for downstream consumers

## Self-Check: PASSED

All 3 files exist. All 4 commits verified.

---
*Phase: 07-ui-primitives*
*Completed: 2026-03-21*
