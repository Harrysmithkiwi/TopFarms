# Phase 2: Employer Supply Side - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

An employer can complete their 8-screen onboarding profile, post a job through a 7-screen wizard with Stripe listing fee payment, and have their verification badges displayed on their profile and job listings. This creates the supply side of the marketplace that seekers will search in later phases.

</domain>

<decisions>
## Implementation Decisions

### Onboarding Wizard Flow
- Auto-save progress after each screen completes — employer returns to where they left off
- Strict linear order through all 8 screens (no skipping)
- Numbered step bar with circles (1-8), current step highlighted, completed steps checked
- After completing onboarding, land on employer dashboard with success toast and "Post your first job" CTA

### Job Posting Wizard
- Skills picker uses grouped checklist by category (milking, animal health, etc) with proficiency level (basic/intermediate/advanced) per selected skill
- Preview screen shown after all content screens, before tier selection and payment
- Auto-save drafts — job starts as draft on first screen, auto-saves progress, employer can return to drafts from dashboard
- Compensation fields: two number inputs for salary range (min/max NZD annual) plus checkboxes for benefits (accommodation, vehicle, phone, meals, etc)

### Verification & Trust Signals
- Verification introduced during onboarding wizard (dedicated screen) plus ongoing dashboard nudges to complete remaining steps
- Aggregate trust level badge (e.g., "Basic Verified", "Verified", "Fully Verified") that expands on hover/click to show individual verifications
- Drag-and-drop upload zones with thumbnail preview for documents and farm photos — accept common image/PDF formats with clear file size limit
- NZBN verification shows nothing externally until admin confirms — employer sees "Pending Review" in their own settings only

### Stripe Payment Flow
- First listing free: show all three tiers (Standard $100 / Featured $150 / Premium $200) with $0 price and "First listing free!" badge — employer still picks a tier to understand future pricing
- Tier selection presented as comparison cards side-by-side, highlight middle option as best value
- Instant activation after Stripe confirms payment — success screen with listing link and share options
- Payment failure: inline error on payment screen (e.g., "Card declined") with retry, job posting preserved

### Job Management After Posting
- Dashboard shows job cards with status badge (active/paused/expired) and action buttons (pause, edit, archive), days remaining indicator
- Employers can edit active listings directly without pausing
- "Mark as Filled" modal shows applicant list, employer selects hired candidate and hire date — creates audit record linking listing to placement (foundation for Phase 5 placement fees)

### Job Detail Page (Visitor View)
- Full listing information visible to non-logged-in visitors (title, farm details, compensation, skills, description) — only match scores and apply button gated behind signup
- Sticky CTA bar at bottom of screen: "Sign up to see how you match and apply"
- Single-column layout with clear sections: header (title + farm + salary), description, skills, accommodation, farm details
- Employer's aggregate trust badge visible in the job header next to farm name, expandable on click

### Claude's Discretion
- Job expiry handling (warning before expiry, auto-expire behavior, repost flow)
- Loading skeletons and transition animations between wizard screens
- Exact spacing, typography, and responsive breakpoints within design system
- Error state handling for non-payment errors (network, validation)
- Employer profile editing UX after onboarding (inline vs wizard re-entry)

</decisions>

<specifics>
## Specific Ideas

- "Mark as Filled" audit trail is critical — links listing fee to eventual placement fee. Phase 5 (REVN-01 through REVN-04) builds on this data.
- Tier comparison cards should make the value difference between Standard/Featured/Premium clear without being pushy
- Verification badges should build trust for seekers — the aggregate badge with expandable detail balances simplicity with transparency

</specifics>

<deferred>
## Deferred Ideas

- Full placement fee flow (acknowledgement modal, contact reveal) — Phase 5
- Employer analytics dashboard (views, applications, conversion) — v2 (GRWT-03)
- Admin NZBN verification workflow UI — Phase TBD (ADMN-02)

</deferred>

---

*Phase: 02-employer-supply-side*
*Context gathered: 2026-03-15*
