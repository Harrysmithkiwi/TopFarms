---
phase: 02-employer-supply-side
plan: 05
subsystem: payments
tags: [stripe, stripe-elements, supabase-edge-functions, react, typescript]

# Dependency graph
requires:
  - phase: 02-01
    provides: TierCard component, listing_fees table schema, domain types (ListingTier)
  - phase: 02-04
    provides: PostJob wizard shell requiring payment step wiring
provides:
  - Stripe payment flow with first-listing-free logic
  - Edge Function create-payment-intent with server-side idempotency
  - Edge Function stripe-webhook activating jobs on payment_intent.succeeded
  - PaymentForm component with Stripe Elements and TopFarms theme
  - JobStep7Payment with tier selection + free/paid flow
  - JobStep8Success with listing link and share options
affects:
  - 02-06: verification/routing
  - phase-03: seeker platform
  - phase-06: testing

# Tech tracking
tech-stack:
  added: []  # @stripe/react-stripe-js and @stripe/stripe-js were already in package.json
  patterns:
    - Stripe Edge Function pattern: create PaymentIntent server-side, return client_secret to frontend
    - First-listing-free: listing_fees count check in Edge Function (not client-side) prevents race conditions
    - Webhook idempotency: check stripe_payment_id exists in listing_fees before processing
    - Stripe Elements: Elements provider wraps inner form component using useStripe/useElements hooks
    - Job activation: both free and paid paths set status=active, listing_tier, expires_at=+30days

key-files:
  created:
    - supabase/functions/create-payment-intent/index.ts
    - supabase/functions/stripe-webhook/index.ts
    - src/lib/stripe.ts
    - src/components/stripe/PaymentForm.tsx
    - src/pages/jobs/steps/JobStep7Payment.tsx
    - src/pages/jobs/steps/JobStep8Success.tsx
  modified:
    - src/pages/jobs/PostJob.tsx

key-decisions:
  - "Stripe v14 imported from esm.sh in Deno Edge Functions: https://esm.sh/stripe@14"
  - "Supabase service role client used in Edge Functions (not anon key) for DB writes"
  - "PaymentForm inner component pattern: Elements provider separate from useStripe/useElements form to avoid hook context errors"
  - "JobStep7Payment has two phases: tier-selection and payment; back button returns to tier-selection not previous wizard step"
  - "employer_profiles.id (not auth.users.id) is the employer_id FK for jobs table — PostJob.tsx bug fixed to use profile.id"
  - "Free activation: job activated synchronously in create-payment-intent Edge Function (no webhook needed)"
  - "Stripe test keys required in Supabase Edge Function secrets (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) and .env (VITE_STRIPE_PUBLISHABLE_KEY)"

patterns-established:
  - "Stripe Edge Function pattern: CORS headers + OPTIONS preflight + service role client + Stripe SDK from esm.sh"
  - "Webhook idempotency pattern: check existing record by stripe_payment_id before insert"
  - "First-listing-free pattern: server-side listing_fees count check prevents race conditions"

requirements-completed: [JPOS-05, JPOS-07]

# Metrics
duration: 8min
completed: 2026-03-15
---

# Phase 02 Plan 05: Stripe Payment Flow Summary

**Stripe payment integration with first-listing-free logic: two Edge Functions (PaymentIntent creation + webhook), Stripe Elements PaymentForm, tier selection step, and success screen with share options**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-15T11:37:00Z
- **Completed:** 2026-03-15T11:45:54Z
- **Tasks:** 2 (+ 1 auto-approved checkpoint)
- **Files modified:** 7

## Accomplishments
- Two Supabase Edge Functions for complete Stripe payment flow with server-side security
- First-listing-free logic in Edge Function prevents race conditions (count check server-side)
- Stripe webhook handler with idempotency guard (stripe_payment_id uniqueness check)
- Frontend PaymentForm with Stripe Elements, TopFarms colour theme, and inline error display
- JobStep7Payment with tier selection cards, free activation flow, and paid payment flow
- JobStep8Success with listing URL display, clipboard share, and navigation CTAs
- Fixed PostJob.tsx bug: employer_id now correctly uses employer_profiles.id (not auth.users.id)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Supabase Edge Functions for Stripe payment flow** - `023612c` (feat)
2. **Task 2: Create frontend payment components and wire into wizard** - `a7d0259` (feat)
3. **Task 3: Verify Stripe integration** - Auto-approved (checkpoint:human-verify, auto_advance=true)

## Files Created/Modified
- `supabase/functions/create-payment-intent/index.ts` - Edge Function: first-listing-free logic, PaymentIntent creation, Stripe v14
- `supabase/functions/stripe-webhook/index.ts` - Edge Function: payment_intent.succeeded handler with idempotency
- `src/lib/stripe.ts` - Stripe.js promise export via VITE_STRIPE_PUBLISHABLE_KEY
- `src/components/stripe/PaymentForm.tsx` - Stripe Elements wrapper with PaymentElement and TopFarms theme
- `src/pages/jobs/steps/JobStep7Payment.tsx` - Tier selection + payment/free-activation phases
- `src/pages/jobs/steps/JobStep8Success.tsx` - Success screen with listing link and share button
- `src/pages/jobs/PostJob.tsx` - Added step 7/8 rendering, TOTAL_STEPS 7→8, fixed employer_id bug

## Decisions Made
- Stripe v14 imported from esm.sh in Deno Edge Functions — compatible pattern for Supabase Edge Functions
- First-listing-free checked server-side in Edge Function (not client-side) to prevent race conditions
- PaymentForm uses separate Elements provider wrapper + inner component pattern required by Stripe React SDK
- Free activation is synchronous in create-payment-intent (no webhook needed for $0 listings)
- employer_profiles.id is the correct employer_id FK (not auth.users.id) — bug fixed in PostJob.tsx

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed employer_id bug in PostJob.tsx**
- **Found during:** Task 2 (frontend payment wiring)
- **Issue:** PostJob.tsx was passing `session.user.id` (auth user UUID) as `employer_id` to the jobs INSERT, but `jobs.employer_id` is a FK to `employer_profiles.id`, not `auth.users.id`
- **Fix:** Added `id` field to `EmployerProfileDefaults` interface, capture `profile.id` in load, use `employerProfile.id` in INSERT with null guard
- **Files modified:** `src/pages/jobs/PostJob.tsx`
- **Verification:** TypeScript compiles without errors, FK relationship now correct
- **Committed in:** a7d0259 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Essential correctness fix — without it, every job creation would fail with FK constraint violation. No scope creep.

## Issues Encountered
- Plan 04 (PostJob wizard) had been partially created but not committed. Files existed on disk for steps 1-5 and PostJob.tsx, but JobStep6Preview existed with a slightly different implementation from what plan 04 specified. Plan 05 built on top of these existing files without needing to recreate them.

## User Setup Required
**External services require manual configuration before Stripe integration can be tested:**

1. Create a Stripe account at https://dashboard.stripe.com/register
2. Set in Supabase Edge Function secrets:
   - `STRIPE_SECRET_KEY` — Stripe Dashboard > Developers > API keys > Secret key (test mode)
   - `STRIPE_WEBHOOK_SECRET` — Stripe Dashboard > Developers > Webhooks > Add endpoint > Signing secret
3. Set in `.env` file:
   - `VITE_STRIPE_PUBLISHABLE_KEY` — Stripe Dashboard > Developers > API keys > Publishable key (test mode)
4. Add Supabase Edge Function URL as webhook endpoint in Stripe Dashboard:
   - Endpoint URL: `{SUPABASE_URL}/functions/v1/stripe-webhook`
   - Events: `payment_intent.succeeded`

Test with Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC.

## Next Phase Readiness
- Payment flow complete — employers can select listing tier and pay (or get first listing free)
- Job activation on payment is handled by webhook; free listings activate synchronously
- Plan 02-06 can add routing/navigation and verification page integration
- Stripe manual testing required before going to production (test keys work for development)

---
*Phase: 02-employer-supply-side*
*Completed: 2026-03-15*
