---
phase: 05-revenue-protection
plan: "03"
subsystem: payments
tags: [stripe, stripe-invoices, resend, react, supabase-edge-functions, idempotency]

requires:
  - phase: 05-01
    provides: "placement fee domain types (PlacementFeeTier, calculatePlacementFee, PLACEMENT_FEE_TIERS), employer_profiles.stripe_customer_id migration"
  - phase: 05-02
    provides: "PlacementFeeModal, shortlist gate intercept in ApplicantDashboard, contactsMap, empProfileId state"

provides:
  - "HireConfirmModal component (fee warning, optional star rating, Confirming... loading)"
  - "create-placement-invoice Edge Function (Stripe Invoice creation, customer upsert, seeker hire email via Resend)"
  - "stripe-webhook extended with invoice.payment_succeeded handler and idempotency guard"
  - "create-payment-intent hardened with Stripe-native idempotencyKey on PaymentIntent creation"
  - "ApplicantDashboard hired gate intercept wired to HireConfirmModal and create-placement-invoice"

affects:
  - 05-04
  - 06-launch-readiness

tech-stack:
  added: []
  patterns:
    - "Stripe Invoice creation pattern: draft → add line items → finalizeInvoice (triggers email send)"
    - "Stripe customer upsert: check employer_profiles.stripe_customer_id → list by email → create new"
    - "Fire-and-forget Resend email in Edge Function: catch error, log, never rethrow"
    - "Stripe-native idempotencyKey on PaymentIntents: listing-fee-{job_id}"
    - "invoice.payment_succeeded webhook with maybeSingle() idempotency guard via stripe_invoice_id"

key-files:
  created:
    - supabase/functions/create-placement-invoice/index.ts
    - src/pages/dashboard/employer/HireConfirmModal.tsx
  modified:
    - src/pages/dashboard/employer/ApplicantDashboard.tsx
    - supabase/functions/stripe-webhook/index.ts
    - supabase/functions/create-payment-intent/index.ts

key-decisions:
  - "create-placement-invoice uses auto_advance: false and explicit finalizeInvoice() call — line items must be added before finalize"
  - "Seeker hire email is fire-and-forget (try/catch, log error) — hire confirmation must not fail if Resend is unavailable"
  - "seeker_email sourced from contactsMap in ApplicantDashboard (already loaded for shortlisted/offered/hired applicants via seeker_contacts)"
  - "idempotencyKey for listing fee: listing-fee-{job_id} — prevents duplicate PaymentIntents on double-click/retry"
  - "first_name added to seeker_profiles select in ApplicantDashboard — used as seeker_name in hire notification email"

patterns-established:
  - "Stripe Invoice workflow: create (draft, auto_advance=false) → invoiceItems.create → finalizeInvoice — this order is non-negotiable per Stripe API"
  - "Hire gate: same intercept pattern as shortlist gate — applicant found → state set → return early → modal renders"

requirements-completed: [REVN-03, REVN-04]

duration: 5min
completed: "2026-03-17"
---

# Phase 5 Plan 03: Revenue Protection — Hire Confirmation & Invoice Creation Summary

**Stripe Invoice creation on hire confirmation (Net 14 terms), HireConfirmModal with star rating, seeker hire email via Resend, idempotency hardening on webhook and PaymentIntent flows**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-17T08:14:58Z
- **Completed:** 2026-03-17T08:19:59Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created `create-placement-invoice` Edge Function: Stripe Invoice (Net 14, send_invoice), customer upsert, confirmed_at + stripe_invoice_id write, seeker congratulations email via Resend
- Created `HireConfirmModal` with invoice warning box, optional 1-5 star rating, and "Confirming..." loading state
- Wired hire gate into ApplicantDashboard: `handleTransition` intercepts `hired`, shows modal, invokes Edge Function, updates status
- Extended `stripe-webhook` with `invoice.payment_succeeded` handler using idempotency guard on `stripe_invoice_id`
- Hardened `create-payment-intent` with Stripe-native `idempotencyKey: listing-fee-{job_id}` on PaymentIntent creation

## Task Commits

Each task was committed atomically:

1. **Task 1: create-placement-invoice Edge Function + HireConfirmModal** - `1626488` (feat)
2. **Task 2: Wire HireConfirmModal into ApplicantDashboard + extend stripe-webhook + harden idempotency** - `ca383bb` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `supabase/functions/create-placement-invoice/index.ts` — Edge Function: Stripe Invoice creation, customer upsert, placement_fees update, seeker hire email via Resend
- `src/pages/dashboard/employer/HireConfirmModal.tsx` — Modal with fee warning, optional star rating, loading state
- `src/pages/dashboard/employer/ApplicantDashboard.tsx` — Added hired gate intercept, handleHireConfirm, farmName state, first_name in seeker_profiles select, HireConfirmModal render
- `supabase/functions/stripe-webhook/index.ts` — Extended with invoice.payment_succeeded handler and idempotency guard
- `supabase/functions/create-payment-intent/index.ts` — Added Stripe-native idempotencyKey on paymentIntents.create

## Decisions Made
- `auto_advance: false` used on Stripe Invoice with explicit `finalizeInvoice()` call — ensures line items are added before finalization (per anti-patterns in RESEARCH.md)
- Seeker hire email is fire-and-forget in the Edge Function — email failure should never block hire confirmation (revenue critical path)
- `seeker_email` is sourced from `contactsMap` (which is already loaded for shortlisted/offered/hired applicants) — no extra DB query needed
- `farmName` added to state and loaded from `employer_profiles.farm_name` in `loadData()` — needed for both Edge Function call and future display

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added first_name to seeker_profiles select**
- **Found during:** Task 2 (ApplicantDashboard wire-up)
- **Issue:** Plan specifies passing `seeker_name: pendingHireApp.seeker_profiles?.first_name` but `first_name` was not in the seeker_profiles select query
- **Fix:** Added `first_name` to the seeker_profiles join select in `loadData()`
- **Files modified:** src/pages/dashboard/employer/ApplicantDashboard.tsx
- **Verification:** Field appears in select, passed to Edge Function
- **Committed in:** `ca383bb` (Task 2 commit)

**2. [Rule 1 - Bug] Replaced `buildSeekerLabel` call (undefined) with local function**
- **Found during:** Task 2 (ApplicantDashboard wire-up)
- **Issue:** Plan JSX used `buildSeekerLabel(pendingHireApp)` helper but no such function existed in the file; PlacementFeeModal was using inline ternary logic instead
- **Fix:** Created `buildSeekerLabel(app: Applicant): string` helper function in the file and used it consistently for both modals
- **Files modified:** src/pages/dashboard/employer/ApplicantDashboard.tsx
- **Verification:** Both PlacementFeeModal and HireConfirmModal use the same helper
- **Committed in:** `ca383bb` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical field, 1 bug fix)
**Impact on plan:** Both fixes were required for correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required (Stripe and Resend keys are already managed via Supabase environment variables set up in Phase 2/prior phases).

## Next Phase Readiness
- Plan 05-03 complete: hire confirmation flow fully wired — employer sees HireConfirmModal, Stripe Invoice created with Net 14 terms, seeker notified via Resend, webhook handles payment events idempotently
- Plan 05-04 (follow-up emails / pg_cron) can proceed immediately — schema columns for followup flags are not yet added (that's 05-04's job)
- Stripe idempotency hardening complete across all payment flows

---
*Phase: 05-revenue-protection*
*Completed: 2026-03-17*
