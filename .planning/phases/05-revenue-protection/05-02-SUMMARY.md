---
phase: 05-revenue-protection
plan: 02
subsystem: frontend
tags: [react, typescript, supabase-edge-functions, revenue, placement-fee, contact-masking]

# Dependency graph
requires:
  - phase: 05-01
    provides: PlacementFeeTier, PlacementFeeRecord, SeekerContact types, calculatePlacementFee(), PLACEMENT_FEE_TIERS
  - phase: 03-seeker-demand-side
    provides: ApplicationStatus pipeline, ApplicantPanel component, ApplicantDashboard component
  - phase: 02-employer-supply-side
    provides: placement_fees table (001_initial_schema.sql), seeker_contacts table with RLS

provides:
  - PlacementFeeModal component with fee tier badge, blurred contact preview, confirm/cancel flow
  - acknowledge-placement-fee Edge Function writing placement_fees via service role with idempotency guard
  - ApplicantDashboard shortlist intercept (setPendingShortlistApp + showPlacementFeeModal state)
  - ApplicantDashboard contact reveal flow: post-confirm fetch + contactsMap state passed to panels
  - ApplicantPanel contact section with blurred/revealed states and dropdown label decoration

affects:
  - 05-03 (HireConfirmModal wiring in same ApplicantDashboard file — already included by linter)
  - 05-04 (contacts revealed = placement_fees.acknowledged_at set = follow-up flags eligible)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Deno.serve + SUPABASE_SERVICE_ROLE_KEY pattern (same as create-payment-intent Edge Function)
    - Idempotency guard: .maybeSingle() check on existing row before insert
    - contacts prop pattern: null = not acknowledged (show blurred), SeekerContact = acknowledged (show real)
    - Shortlist intercept pattern: return early from handleTransition to block direct status update

key-files:
  created:
    - supabase/functions/acknowledge-placement-fee/index.ts
    - src/pages/dashboard/employer/PlacementFeeModal.tsx
  modified:
    - src/pages/dashboard/employer/ApplicantDashboard.tsx
    - src/components/ui/ApplicantPanel.tsx

key-decisions:
  - "Idempotency: check existing placement_fees row with .maybeSingle() before insert — if acknowledged_at IS NOT NULL return early with already_acknowledged:true"
  - "Contacts batch-fetch on load for shortlisted/offered/hired applicants — RLS enforces access (only returns where placement_fees.acknowledged_at IS NOT NULL)"
  - "Contact section only renders for shortlisted/offered/hired status — pre-shortlist stages show no contact section at all (not even blurred)"
  - "transitionOptions label override for shortlisted: 'Shortlist — unlocks contact details' (plain string, no icon injection — Select uses Radix SelectItem.ItemText)"

patterns-established:
  - "Shortlist gate intercept pattern: check newStatus==='shortlisted', setPendingShortlistApp + setShowPlacementFeeModal(true), return early"
  - "Contact reveal pattern: Edge Function sets acknowledged_at, then status update, then single seeker_contacts fetch to update contactsMap in place"

requirements-completed: [REVN-01, REVN-02]

# Metrics
duration: 5min
completed: 2026-03-17
---

# Phase 05 Plan 02: Placement Fee Gate and Contact Masking Summary

**PlacementFeeModal shortlist gate with acknowledge-placement-fee Edge Function writes placement_fees.acknowledged_at via service role; contacts revealed inline in ApplicantPanel after acknowledgement**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-17T08:15:04Z
- **Completed:** 2026-03-17T08:20:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Edge Function `acknowledge-placement-fee` follows `create-payment-intent` pattern with Deno.serve, service role client, idempotency check (maybeSingle on existing row), placement_fees INSERT with acknowledged_at, CORS headers and OPTIONS preflight handler
- PlacementFeeModal component matches UI-SPEC exactly: Lock icon header, fee tier badge (rgba hay bg), fee amount, explanatory text, blurred contact preview (blur-sm + select-none + font-mono), "Keep current stage" cancel, "I understand — release contact details" CTA, Loader2 spinner for "Releasing..." loading state
- ApplicantDashboard modified: pendingShortlistApp/showPlacementFeeModal/contactsMap state, handleTransition intercepts shortlisted and fires modal, handlePlacementFeeConfirm invokes Edge Function then updates status then fetches revealed contacts, batch-loads existing contacts on mount, passes contacts prop to each ApplicantPanel
- ApplicantPanel: contacts prop (SeekerContact | null) added, Contact Details section rendered only for shortlisted/offered/hired, blurred placeholders when contacts=null, real values when contacts present, "Not provided" for null phone, dropdown shortlisted label set to "Shortlist — unlocks contact details"

## Task Commits

Each task was committed atomically:

1. **Task 1: acknowledge-placement-fee Edge Function + PlacementFeeModal + ApplicantDashboard shortlist intercept** - `db024d1` (feat)
2. **Task 2: ApplicantPanel contact section with masked/revealed states and dropdown decoration** - `7806764` (feat)

## Files Created/Modified

- `supabase/functions/acknowledge-placement-fee/index.ts` - Deno.serve Edge Function with service role client, idempotency guard, placement_fees INSERT with acknowledged_at
- `src/pages/dashboard/employer/PlacementFeeModal.tsx` - New modal component with blurred contact preview, fee tier badge, exact UI-SPEC copy
- `src/pages/dashboard/employer/ApplicantDashboard.tsx` - Shortlist intercept, contactsMap state, handlePlacementFeeConfirm, contacts prop pass-through to ApplicantPanel
- `src/components/ui/ApplicantPanel.tsx` - contacts prop, Contact Details section (blurred/revealed), dropdown label decoration for shortlisted

## Decisions Made

- Idempotency implemented via `.maybeSingle()` read before INSERT — if acknowledged_at already set, return `{ already_acknowledged: true }` without duplicate insert
- Batch contacts fetch on load for existing shortlisted/offered/hired applicants — RLS on seeker_contacts handles access control server-side
- Contact section conditionally rendered only for post-shortlist statuses — pre-shortlist shows nothing (not even a placeholder), consistent with UI-SPEC
- Radix SelectItem.ItemText only accepts text content — Lock icon not injectable, plain label string "Shortlist — unlocks contact details" used per UI-SPEC guidance

## Deviations from Plan

### Auto-detected linter additions (not deviations — accepted as beneficial)

The project's linter pre-emptively added HireConfirmModal infrastructure to ApplicantDashboard (plan 03 scope) alongside this plan's changes. TypeScript passes, all plan 02 acceptance criteria still met. The HireConfirmModal component and wiring will be committed as part of plan 03 execution.

## Issues Encountered

None.

## User Setup Required

None - Edge Function will be deployed via `supabase functions deploy acknowledge-placement-fee`. No credentials needed for local dev.

## Next Phase Readiness

- acknowledge-placement-fee Edge Function ready to deploy
- PlacementFeeModal fully functional — wires to Edge Function and reveals contacts on confirm
- ApplicantPanel contact section ready for seeker contacts display
- Plan 03 (HireConfirmModal) can add hire gate intercept at the marked comment in handleTransition
- No blockers for Plans 03-05

## Self-Check: PASSED

- FOUND: supabase/functions/acknowledge-placement-fee/index.ts
- FOUND: src/pages/dashboard/employer/PlacementFeeModal.tsx
- FOUND: src/pages/dashboard/employer/ApplicantDashboard.tsx
- FOUND: src/components/ui/ApplicantPanel.tsx
- FOUND commit: db024d1 (Task 1)
- FOUND commit: 7806764 (Task 2)

---
*Phase: 05-revenue-protection*
*Completed: 2026-03-17*
