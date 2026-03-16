# Phase 5: Revenue Protection - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

The placement fee gate is enforced at the database layer — an employer cannot read seeker contact details until they have acknowledged the placement fee, and follow-up emails fire automatically after shortlisting. Stripe listing fee flows are hardened with idempotency guards, and placement fee invoicing is wired through Stripe Invoices on hire confirmation.

</domain>

<decisions>
## Implementation Decisions

### Placement Fee Structure
- Flat fee by seniority: $200 (entry-level), $400 (experienced), $800 (senior/management)
- Tier determined by salary range as primary method: <$55k = entry ($200), $55k-$80k = experienced ($400), $80k+ = senior ($800)
- Job title keywords ('manager', 'head', 'senior', 'supervisor') can bump the tier UP but never down — catches gaming
- Fee is per-hire, not per-candidate shortlisted — shortlisting is free, acknowledgement creates a paper trail
- Multiple hires from the same job listing each incur a separate placement fee
- Fee amount visible to employers only — seekers never see it

### Shortlist Gate Experience
- When employer selects 'Shortlisted' in the pipeline dropdown, a placement fee acknowledgement modal appears BEFORE the status change
- Modal shows: candidate name, calculated fee tier & amount, "Placement fee applies if you hire this candidate", confirm button: "I understand — release contact details"
- If employer cancels the modal, the candidate stays at their current pipeline stage — shortlist action is blocked until they accept
- After confirmation: `placement_fees.acknowledged_at` written, contact details (phone + email) appear inline in the expanded ApplicantPanel immediately (no page reload)
- Contact details permanently unlocked once acknowledged — no re-locking
- 'Shortlisted' option in the status dropdown has a lock icon and note "Shortlist — unlocks contact details" to make the gate discoverable

### Contact Masking UI
- Before acknowledgement: blurred placeholder text for phone (`••• ••• ••••`) and email (`j•••@gmail.com`) in the ApplicantPanel
- Consistent with the visitor teaser blurred pattern from Phase 3
- After acknowledgement: real phone and email appear inline in the expanded applicant panel, next to seeker name/profile info

### Follow-up Emails
- Both employer and seeker receive follow-up emails at Day 7 and Day 14 after contact release (shortlist acknowledgement)
- Employer emails: friendly nudge tone — Day 7: "How's it going with [name]? Let us know if you've made a hire — it helps us improve matches for you." Day 14: "Just checking in — have you filled this role?"
- Seeker emails: encouragement + status check — Day 7: "You were shortlisted by [farm name]! The employer has your contact details. If you haven't heard from them, hang tight." Day 14: "Any updates on [farm name]? You can update your application status in your dashboard."
- If employer confirms an outcome (hired or not proceeding), follow-up emails stop — no separate unsubscribe, just resolve the outcome
- Sent via Resend Edge Function with pg_cron scheduling

### Hire Confirmation & Invoicing
- Hire confirmation uses the existing pipeline transition to 'hired' status — same dropdown as other transitions
- When 'hired' is selected, a confirmation modal appears: "Confirm hire of [name]? A placement fee invoice of $X will be generated." with optional 1-5 star rating for matching experience
- Stripe Invoice created immediately on hire confirmation — sent via Stripe-hosted page
- Payment terms: Net 14 (due in 14 days) — Stripe handles automatic reminders
- `placement_fees.confirmed_at` written, `stripe_invoice_id` stored
- If employer never confirms a hire: rely on follow-up emails + ToS enforcement — no technical auto-close mechanism for MVP

### Seeker Notifications
- Seeker receives an email when hired: "Congratulations! [Farm name] has confirmed your hire for [job title]. You can view the details in your dashboard."
- Sent via same Resend Edge Function

### Stripe Idempotency Hardening
- Harden existing listing fee PaymentIntent and webhook flows with idempotency keys
- Build new placement fee Stripe Invoice creation with dedup guards on webhook retries
- Duplicate Stripe webhook deliveries must not create duplicate fee records or double-activate listings

### Claude's Discretion
- Resend email template design (React Email)
- pg_cron schedule expression for follow-up email checks
- Stripe Invoice line item description and metadata
- Idempotency key generation strategy
- Error handling and retry patterns for email delivery
- Database migration structure for new columns/tables needed

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Revenue & Placement Fee Spec
- `SPEC.md` §10 — Revenue Model & Protection Mechanisms: revenue events (§10.1), placement fee 7-stage flow (§10.2), circumvention deterrents (§10.3), Stripe integration points (§10.4)
- `SPEC.md` §10.2 — Placement Fee Protection 7-stage flow: the authoritative sequence from job posted through hire confirmed

### Database Schema
- `supabase/migrations/001_initial_schema.sql` lines 77-89 — `seeker_contacts` table (separate from seeker_profiles for contact masking)
- `supabase/migrations/001_initial_schema.sql` lines 224-239 — `placement_fees` table (acknowledged_at, confirmed_at, amount_nzd, stripe_invoice_id)
- `supabase/migrations/002_rls_policies.sql` lines 106-138 — `seeker_contacts` RLS policies (seekers manage own, employers view after placement fee acknowledged)
- `supabase/migrations/002_rls_policies.sql` lines 314-340 — `placement_fees` RLS policies

### Existing Stripe Edge Functions
- `supabase/functions/create-payment-intent/` — Existing PaymentIntent Edge Function for listing fees (Deno, esm.sh, Stripe v14)
- `supabase/functions/stripe-webhook/` — Existing webhook handler for listing fee confirmation

### Frontend Integration Points
- `src/pages/dashboard/employer/ApplicantDashboard.tsx` — `handleTransition()` function (line ~198) where shortlist gate must intercept
- `src/components/ui/ApplicantPanel.tsx` — Applicant panel where contact details will appear/be masked
- `src/types/domain.ts` — VALID_TRANSITIONS, ApplicationStatus types, pipeline stage definitions

### Revenue Journey Documentation
- `TopFarms_Launch_Pack/docs/TopFarms_Revenue_Journey.html` — 7-stage employer journey, risk matrix, placement fee mechanism

### Prior Phase Context
- `.planning/phases/04-match-scoring-engine/04-CONTEXT.md` — Phase 4 decisions (Edge Function patterns, pg_cron availability confirmed)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `placement_fees` table — Already exists with correct columns (job_id, application_id, employer_id, seeker_id, acknowledged_at, confirmed_at, amount_nzd, stripe_invoice_id)
- `seeker_contacts` table — Already separated from seeker_profiles with RLS gating on placement_fees.acknowledged_at
- `create-payment-intent` Edge Function — Establishes Deno + esm.sh + Stripe v14 pattern for new invoice Edge Function
- `stripe-webhook` Edge Function — Existing webhook handler to extend with idempotency guards and new invoice events
- `ApplicantPanel` component — Has status tag variant mapping and expanded panel layout; needs contact section added
- `handleTransition()` in ApplicantDashboard — Currently does direct `.update({ status: newStatus })` on applications; needs interception for 'shortlisted' to show modal first
- `VALID_TRANSITIONS` in domain.ts — Already defines `interview → [shortlisted, declined]` and `review → [interview, shortlisted, declined]`
- `008_job_expiry_cron.sql` — Confirms pg_cron extension available; follow-up email scheduling can use same pattern

### Established Patterns
- Pipeline status transitions via dropdown in ApplicantPanel → handleTransition() in ApplicantDashboard
- Edge Functions: Deno runtime, esm.sh imports, Stripe v14 from esm.sh
- Modal pattern: MarkFilledModal in EmployerDashboard — existing modal-before-action pattern to follow
- Blurred teaser: Phase 3 visitor teaser pattern (VISITOR_TEASER_SCORE) — same blurred approach for masked contacts
- Toast notifications for success/error feedback (react-hot-toast)

### Integration Points
- `handleTransition()` must check if newStatus === 'shortlisted' → show PlacementFeeModal instead of direct update
- `ApplicantPanel` must conditionally show contact details (fetch from seeker_contacts, RLS handles access control)
- New Edge Function for Resend email delivery (follow-up emails + hire notification)
- pg_cron job to check for pending follow-up emails (Day 7/14 after acknowledged_at)
- New Edge Function for Stripe Invoice creation on hire confirmation
- Extend stripe-webhook to handle invoice payment events

</code_context>

<specifics>
## Specific Ideas

- The placement fee tiers ($200/$400/$800) are deliberately lower than SPEC's original recommendation ($500/$750/$1,500) — optimised for early adoption in a small market
- Salary-based tier calculation with title keyword override is a trust mechanism — prevents gaming while keeping it hands-off
- The "I understand — release contact details" confirmation copy creates a legal paper trail for ToS enforcement
- Follow-up emails serve dual purpose: nudge employers to confirm hires AND keep seekers informed — both sides feel cared for
- Optional star rating at hire confirmation captures satisfaction data for future testimonials section (Phase 6)
- NZ ag community dynamics (small, reputation-driven) are the primary enforcement mechanism — technical measures create a paper trail, social enforcement does the heavy lifting

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-revenue-protection*
*Context gathered: 2026-03-16*
