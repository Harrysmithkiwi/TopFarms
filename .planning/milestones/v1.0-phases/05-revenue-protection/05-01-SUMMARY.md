---
phase: 05-revenue-protection
plan: 01
subsystem: database
tags: [postgres, pg_cron, typescript, vitest, stripe, placement-fee]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: supabase migrations pattern, domain.ts type conventions
  - phase: 02-employer-supply-side
    provides: employer_profiles table, placement_fees table (001_initial_schema.sql)
  - phase: 04-match-scoring-engine
    provides: pg_cron availability confirmed (008), vitest test infrastructure (03-00)

provides:
  - Migration 011 with follow-up tracking columns on placement_fees (fee_tier, followup_7d/14d_sent/due, rating)
  - stripe_customer_id column on employer_profiles for Stripe Invoice API
  - pg_cron placement-followup-flags job marking 7d/14d due flags at 08:00 UTC
  - PlacementFeeTier, PlacementFeeRecord, SeekerContact types in domain.ts
  - PLACEMENT_FEE_TIERS constant ($200/$400/$800 for entry/experienced/senior)
  - calculatePlacementFee() function with salary-primary + title keyword bump logic
  - Test scaffold in tests/placement-fee.test.ts (8 passing + 5 todo placeholders)

affects:
  - 05-02 (PlacementFeeModal uses calculatePlacementFee, PlacementFeeRecord)
  - 05-03 (HireConfirmModal uses calculatePlacementFee, placement_fees columns)
  - 05-04 (Resend Edge Function reads followup_7d_due/followup_14d_due flags)
  - 05-05 (Stripe Invoice Edge Function reads stripe_customer_id, fee_tier)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - ALTER TABLE ADD COLUMN per-statement (not multi-column ALTER) for migration clarity
    - pg_cron flag-only job pattern (sets boolean columns, Edge Function does the work)
    - calculatePlacementFee salary-primary + title keyword bump-never-down pattern

key-files:
  created:
    - supabase/migrations/011_placement_fee_followups.sql
    - tests/placement-fee.test.ts
  modified:
    - src/types/domain.ts

key-decisions:
  - "Fee tiers: entry=$200 (20000 cents), experienced=$400 (40000), senior=$800 (80000) — deliberately lower than SPEC original to optimise for early adoption"
  - "Salary thresholds: <$55k = entry, $55k-$80k = experienced, $80k+ = senior using avgSalary=(min+max)/2"
  - "Title keyword bump rule: any of ['manager','head','senior','supervisor'] bumps tier UP once but never down — prevents gaming"
  - "pg_cron flag job sets *_due booleans only; Resend Edge Function consumes them and sets *_sent — separation of scheduling and delivery"
  - "confirmed_at IS NULL guard on both UPDATE statements — stops follow-up flags once hire outcome is resolved"

patterns-established:
  - "Placement fee tier calculation: salary-primary, keyword-override pattern for calculatePlacementFee()"
  - "pg_cron flag pattern: cron sets due=true, Edge Function reads due=true and sets sent=true (decoupled scheduling from execution)"

requirements-completed: [REVN-01, REVN-02]

# Metrics
duration: 4min
completed: 2026-03-17
---

# Phase 05 Plan 01: Revenue Protection Foundation Summary

**Migration 011 adds placement fee follow-up tracking and stripe_customer_id; calculatePlacementFee() implements salary+keyword tier logic with 8 passing vitest tests**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-17T19:10:24Z
- **Completed:** 2026-03-17T19:14:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Migration 011 extends placement_fees with 6 new columns (fee_tier, followup_7d/14d_sent/due, rating) and employer_profiles with stripe_customer_id; pg_cron job marks 7d/14d follow-up flags daily at 08:00 UTC
- calculatePlacementFee() function exported from domain.ts implements salary-range primary tier with title keyword bump (never-down rule), plus PlacementFeeTier, PlacementFeeRecord, SeekerContact types and PLACEMENT_FEE_TIERS constant
- Test scaffold in tests/placement-fee.test.ts with 8 passing unit tests for all fee calculation edge cases plus 5 todo placeholders for UI tests in later plans

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration 011 — placement fee follow-up columns, stripe_customer_id, pg_cron flag job** - `9293a2d` (feat)
2. **Task 2: Placement fee types, calculatePlacementFee function, and test scaffolds** - `b12775c` (feat)

## Files Created/Modified

- `supabase/migrations/011_placement_fee_followups.sql` - 7 ADD COLUMN statements + pg_cron placement-followup-flags job (08:00 UTC daily)
- `src/types/domain.ts` - Phase 5 types appended: PlacementFeeTier, PlacementFeeRecord, SeekerContact, PLACEMENT_FEE_TIERS, calculatePlacementFee()
- `tests/placement-fee.test.ts` - 8 passing calculatePlacementFee unit tests + 5 todo placeholders for modal UI tests

## Decisions Made

- Fee amounts stored in cents (20000/40000/80000) matching Stripe integer convention; displayAmount ($200/$400/$800) provided alongside for direct UI rendering
- avgSalary calculated as (min+max)/2 with null-coerce-to-zero — if both null, avgSalary=0 → entry tier (safe default)
- Title keyword bump is single-hop: entry→experienced or experienced→senior per keyword match; multiple keywords don't chain to double-bump

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Migration 011 provides all schema columns required by Plans 02-05
- calculatePlacementFee() is ready for import in PlacementFeeModal (Plan 02) and HireConfirmModal (Plan 03)
- Test scaffold is ready for Plan 02 to fill in contact masking + shortlist intercept tests
- No blockers for Plans 02-05

---
*Phase: 05-revenue-protection*
*Completed: 2026-03-17*
