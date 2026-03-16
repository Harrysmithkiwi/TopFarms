# Phase 5: Revenue Protection - Research

**Researched:** 2026-03-16
**Domain:** Stripe Invoices, Supabase RLS, Resend email, pg_cron, React modal patterns
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Placement Fee Structure**
- Flat fee by seniority: $200 (entry-level), $400 (experienced), $800 (senior/management)
- Tier determined by salary range as primary method: <$55k = entry ($200), $55k-$80k = experienced ($400), $80k+ = senior ($800)
- Job title keywords ('manager', 'head', 'senior', 'supervisor') can bump the tier UP but never down — catches gaming
- Fee is per-hire, not per-candidate shortlisted — shortlisting is free, acknowledgement creates a paper trail
- Multiple hires from the same job listing each incur a separate placement fee
- Fee amount visible to employers only — seekers never see it

**Shortlist Gate Experience**
- When employer selects 'Shortlisted' in the pipeline dropdown, a placement fee acknowledgement modal appears BEFORE the status change
- Modal shows: candidate name, calculated fee tier & amount, "Placement fee applies if you hire this candidate", confirm button: "I understand — release contact details"
- If employer cancels the modal, the candidate stays at their current pipeline stage — shortlist action is blocked until they accept
- After confirmation: `placement_fees.acknowledged_at` written, contact details (phone + email) appear inline in the expanded ApplicantPanel immediately (no page reload)
- Contact details permanently unlocked once acknowledged — no re-locking
- 'Shortlisted' option in the status dropdown has a lock icon and note "Shortlist — unlocks contact details" to make the gate discoverable

**Contact Masking UI**
- Before acknowledgement: blurred placeholder text for phone (`••• ••• ••••`) and email (`j•••@gmail.com`) in the ApplicantPanel
- Consistent with the visitor teaser blurred pattern from Phase 3
- After acknowledgement: real phone and email appear inline in the expanded applicant panel, next to seeker name/profile info

**Follow-up Emails**
- Both employer and seeker receive follow-up emails at Day 7 and Day 14 after contact release (shortlist acknowledgement)
- Employer emails: friendly nudge tone — Day 7: "How's it going with [name]?" Day 14: "Just checking in — have you filled this role?"
- Seeker emails: encouragement + status check — Day 7: shortlisted notification. Day 14: update request
- If employer confirms an outcome (hired or not proceeding), follow-up emails stop — no separate unsubscribe, just resolve the outcome
- Sent via Resend Edge Function with pg_cron scheduling

**Hire Confirmation & Invoicing**
- Hire confirmation uses the existing pipeline transition to 'hired' status — same dropdown as other transitions
- When 'hired' is selected, a confirmation modal appears: "Confirm hire of [name]? A placement fee invoice of $X will be generated." with optional 1-5 star rating
- Stripe Invoice created immediately on hire confirmation — sent via Stripe-hosted page
- Payment terms: Net 14 (due in 14 days) — Stripe handles automatic reminders
- `placement_fees.confirmed_at` written, `stripe_invoice_id` stored
- If employer never confirms a hire: rely on follow-up emails + ToS enforcement — no technical auto-close mechanism for MVP

**Seeker Notifications**
- Seeker receives an email when hired: "Congratulations! [Farm name] has confirmed your hire for [job title]."
- Sent via same Resend Edge Function

**Stripe Idempotency Hardening**
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REVN-01 | Placement fee acknowledgement modal triggered when employer shortlists a candidate | `handleTransition()` intercept pattern, PlacementFeeModal component following MarkFilledModal template, placement_fees.acknowledged_at write via service role |
| REVN-02 | Contact details (phone, email) remain masked via RLS until placement fee acknowledged | RLS policy already exists in 002_rls_policies.sql lines 122-139; seeker_contacts fetch with blurred placeholder UI pattern |
| REVN-03 | Stripe integration for listing fee collection (PaymentIntent API) | Existing create-payment-intent Edge Function needs idempotency key on PaymentIntent creation; stripe-webhook already has dedup guard via stripe_payment_id check |
| REVN-04 | Stripe webhook handling with idempotency guards | Extend stripe-webhook to handle invoice.payment_succeeded; dedup on stripe_invoice_id; new create-placement-invoice Edge Function |
</phase_requirements>

## Summary

Phase 5 wires together three revenue protection mechanisms that the database schema already anticipates: the placement fee acknowledgement gate (RLS + modal), automated follow-up emails (Resend + pg_cron), and Stripe Invoice creation on hire confirmation. The schema is already fully provisioned — `placement_fees`, `seeker_contacts`, and their RLS policies exist. No new tables are required; the work is entirely in UI interception, new Edge Functions, and a migration for a follow-up email tracking column.

The placement fee gate is the most visible deliverable: intercepting `handleTransition()` in ApplicantDashboard when `newStatus === 'shortlisted'`, showing a PlacementFeeModal (following the MarkFilledModal pattern), then writing `placement_fees.acknowledged_at` via service role before the status change completes. After acknowledgement, ApplicantPanel fetches from `seeker_contacts` — the RLS policy gates access automatically, so the UI simply shows real values once the row exists.

Stripe Invoice creation follows the same Edge Function pattern as `create-payment-intent`: Deno runtime, `esm.sh/stripe@14`, service role client. The key difference is `collection_method: 'send_invoice'` with `days_until_due: 14` and `auto_advance: true` so Stripe sends and manages reminders automatically. The existing `stripe-webhook` is extended to handle `invoice.payment_succeeded` with a dedup guard on `stripe_invoice_id`.

**Primary recommendation:** Build in this sequence — (1) placement fee modal + RLS contact reveal, (2) hire confirmation modal + Stripe Invoice, (3) Resend follow-up email Edge Function, (4) pg_cron follow-up scheduler, (5) idempotency hardening of listing fee flows. The contact gate (REVN-01/02) must land before REVN-03/04 as it's the primary revenue protection mechanism.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Stripe (esm.sh) | v14 | PaymentIntents, Invoices, webhook verification | Already in use — `esm.sh/stripe@14` established in create-payment-intent |
| Resend (fetch API) | REST v1 | Transactional email delivery | No SDK needed — Supabase docs show native fetch to `api.resend.com/emails` |
| @supabase/supabase-js | v2 | Service role client in Edge Functions | Already in use across all Edge Functions |
| pg_cron | (Supabase extension) | Schedule follow-up email checks | Already enabled — confirmed by 008_job_expiry_cron.sql |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.487.0 | Lock icon on Shortlist dropdown option | Already in project |
| sonner | ^2.0.3 | Toast feedback after modal confirm/cancel | Already in project (note: MarkFilledModal uses sonner `toast`, not react-hot-toast) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| fetch to Resend REST API | `npm:resend@4.0.0` SDK | SDK works in Deno via npm: specifier, but bare fetch is simpler and already shown in Supabase official docs — no extra dependency |
| Stripe Invoice (send_invoice) | Stripe PaymentIntent for placement | Invoice supports Net 14 terms, hosted payment page, Stripe-managed reminders — correct choice for post-hire billing |

**Installation:** No new frontend npm packages required. Edge Functions use esm.sh/npm imports declared inline.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── pages/dashboard/employer/
│   ├── ApplicantDashboard.tsx     # handleTransition() intercept added
│   └── PlacementFeeModal.tsx      # NEW — shortlist gate modal
│   └── HireConfirmModal.tsx       # NEW — hire confirmation + invoice trigger
├── components/ui/
│   └── ApplicantPanel.tsx         # Contact section added (masked/revealed)
supabase/
├── functions/
│   ├── create-payment-intent/     # HARDENED — idempotency key on PaymentIntent.create
│   ├── stripe-webhook/            # EXTENDED — invoice.payment_succeeded handler
│   ├── create-placement-invoice/  # NEW — Stripe Invoice creation on hire confirm
│   └── send-followup-emails/      # NEW — Resend email delivery, called by pg_cron
├── migrations/
│   └── 009_placement_fee_followups.sql  # NEW — followup_sent_7d/14d columns + pg_cron job
```

### Pattern 1: handleTransition() Shortlist Interception
**What:** Before performing the status update, check if `newStatus === 'shortlisted'`. If so, show PlacementFeeModal instead of calling the update directly.
**When to use:** Any pipeline transition to 'shortlisted' from any prior stage.
**Example:**
```typescript
// Source: src/pages/dashboard/employer/ApplicantDashboard.tsx
async function handleTransition(
  applicationId: string,
  newStatus: ApplicationStatus,
  _note?: string,
) {
  if (newStatus === 'shortlisted') {
    // Find the applicant to get their profile data for fee calculation
    const applicant = applicants.find((a) => a.id === applicationId)
    if (applicant) {
      setPendingShortlistApp(applicant)
      setShowPlacementFeeModal(true)
      return // Block until modal confirmed
    }
  }
  // ... existing direct update for all other transitions
}
```

### Pattern 2: PlacementFeeModal — Fee Tier Calculation
**What:** Calculate fee tier from job salary range, with title keyword override.
**When to use:** When modal renders, derive fee before showing it.
**Example:**
```typescript
// Source: Design from CONTEXT.md decisions
function calculatePlacementFee(salaryMin: number | null, salaryMax: number | null, jobTitle: string): {
  tier: 'entry' | 'experienced' | 'senior',
  amount: number
} {
  const avgSalary = ((salaryMin ?? 0) + (salaryMax ?? 0)) / 2
  let tier: 'entry' | 'experienced' | 'senior' =
    avgSalary >= 80000 ? 'senior' : avgSalary >= 55000 ? 'experienced' : 'entry'

  // Title keyword can bump UP but never down
  const lowerTitle = jobTitle.toLowerCase()
  const seniorKeywords = ['manager', 'head', 'senior', 'supervisor']
  if (seniorKeywords.some((kw) => lowerTitle.includes(kw))) {
    if (tier === 'entry') tier = 'experienced'
    else if (tier === 'experienced') tier = 'senior'
  }

  const amounts = { entry: 200, experienced: 400, senior: 800 }
  return { tier, amount: amounts[tier] }
}
```

### Pattern 3: Acknowledged Contact Reveal
**What:** After acknowledgement, ApplicantPanel fetches from `seeker_contacts`. The RLS policy handles the gate — no conditional logic needed in the component beyond checking if data is present.
**When to use:** In the expanded ApplicantPanel for any shortlisted/offered/hired applicant.
**Example:**
```typescript
// Source: RLS policy in 002_rls_policies.sql lines 122-139
// After placement_fees.acknowledged_at is set, this query returns real data
const { data: contacts } = await supabase
  .from('seeker_contacts')
  .select('phone, email')
  .eq('user_id', seekerUserId)
  .maybeSingle()
// contacts will be null if not acknowledged (RLS blocks), real data if acknowledged
```

### Pattern 4: Stripe Invoice Creation — Net 14
**What:** Create a Stripe Invoice for a customer with `send_invoice` collection method and 14-day terms.
**When to use:** When hire is confirmed via HireConfirmModal.
**Example:**
```typescript
// Source: Stripe API docs — https://docs.stripe.com/api/invoices/create
// In create-placement-invoice Edge Function (Deno, esm.sh/stripe@14)
const invoice = await stripe.invoices.create({
  customer: stripeCustomerId,
  collection_method: 'send_invoice',
  days_until_due: 14,
  auto_advance: true, // Stripe finalises and sends automatically
  metadata: {
    application_id,
    employer_id,
    seeker_id,
    job_id,
  },
})
// Add line item
await stripe.invoiceItems.create({
  customer: stripeCustomerId,
  invoice: invoice.id,
  amount: feeAmountCents, // 20000 = $200 NZD
  currency: 'nzd',
  description: `TopFarms placement fee — ${jobTitle}`,
})
// Finalise triggers email send if auto_advance: true is set after line items
await stripe.invoices.finalizeInvoice(invoice.id)
```

**Important:** Line items must be created BEFORE finalizing. `auto_advance: true` on the invoice + `finalizeInvoice()` causes Stripe to email the hosted invoice link automatically.

### Pattern 5: Resend via Fetch in Deno Edge Function
**What:** Send email via Resend REST API using native Deno fetch — no SDK import needed.
**When to use:** All transactional emails (follow-up Day 7/14, hire notification).
**Example:**
```typescript
// Source: https://resend.com/docs/send-with-supabase-edge-functions
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'TopFarms <notifications@topfarms.co.nz>',
      to: [to],
      subject,
      html,
    }),
  })
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Resend error: ${error}`)
  }
  return res.json()
}
```

### Pattern 6: pg_cron for Follow-up Email Scheduling
**What:** pg_cron job runs daily, queries `placement_fees` for rows where `acknowledged_at` is 7/14 days ago and `followup_7d_sent` / `followup_14d_sent` is false (and `confirmed_at` is null — stop emails once outcome resolved).
**When to use:** In migration 009.
**Example:**
```sql
-- Source: Pattern from 008_job_expiry_cron.sql
SELECT cron.schedule(
  'placement-followup-emails',
  '0 8 * * *',  -- 8:00 AM UTC daily (8 PM NZT)
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-followup-emails',
      headers := '{"Authorization": "Bearer " || current_setting("app.service_role_key")}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);
```

**Alternative approach:** pg_cron calls a SQL function that builds a list of pending follow-ups and inserts them into a queue table, then the Edge Function drains the queue. For MVP simplicity, direct HTTP POST from pg_cron to the Edge Function is sufficient.

### Anti-Patterns to Avoid
- **UI-only contact masking:** Never rely on CSS blur or conditional rendering to mask contact details. RLS is the gate. The UI blurred placeholder is cosmetic — real protection is the RLS policy that returns null rows until acknowledged.
- **Client-side placement fee writing:** `placement_fees.acknowledged_at` must be written via the service role Edge Function, not via the anon key from the browser. The existing RLS comment says "Insert/update via service role only".
- **Creating Stripe Invoice before line items:** Must create invoice → add invoice items → then finalize. Finalizing an empty invoice is a Stripe error.
- **Finalizing invoice with `auto_advance: false` and not finalizing manually:** Use `auto_advance: true` or explicitly call `finalizeInvoice()` — draft invoices don't get sent.
- **Duplicate placement_fee rows:** The `placement_fees` table has no UNIQUE constraint on `(application_id)`. The frontend and Edge Function must check for existing acknowledged rows before inserting.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Invoice payment terms and reminders | Custom cron + email for invoice reminders | Stripe Invoice with `days_until_due: 14` | Stripe sends hosted invoice, manages past-due state, retries, and PDF — all handled |
| Idempotency for webhook retries | Custom retry dedup table | Check existing record by `stripe_payment_id` or `stripe_invoice_id` before insert | Already proven pattern in stripe-webhook — extend same guard |
| Email delivery with retry | Custom SMTP with retry logic | Resend fetch API — managed deliverability | SPF/DKIM handled by Resend, not our infrastructure |
| Stripe Customer creation | Custom customer ID management | `stripe.customers.create()` in Edge Function | Required for Invoice API — invoices are customer-linked |

**Key insight:** Stripe Invoice does the heavy lifting for placement fee billing — payment page, reminders, PDF receipt. The custom work is only the trigger (hire confirmation modal) and recording the result (write `stripe_invoice_id`).

## Common Pitfalls

### Pitfall 1: Missing Stripe Customer ID for Invoice Creation
**What goes wrong:** `stripe.invoices.create()` requires a Stripe Customer (`customer` param). The existing listing fee flow uses PaymentIntents which do NOT require a customer. Employers do not have a `stripe_customer_id` stored anywhere in the schema.
**Why it happens:** PaymentIntents work without a customer; Invoice API does not.
**How to avoid:** The `create-placement-invoice` Edge Function must call `stripe.customers.create({ email: employerEmail, name: farmName })` OR `stripe.customers.list({ email })` to upsert before creating the invoice. Store the resulting `stripe_customer_id` on `employer_profiles` — add a column in migration 009.
**Warning signs:** `StripeInvalidRequestError: Missing required param: customer` in Edge Function logs.

### Pitfall 2: seeker_contacts.user_id vs seeker_profiles.id
**What goes wrong:** The `seeker_contacts` RLS policy joins through `seeker_profiles` via `sp.user_id = seeker_contacts.user_id`. The `placement_fees.seeker_id` references `seeker_profiles.id` (the profile UUID), not `auth.users.id`. When fetching contacts from the frontend, the query must use `seeker_contacts.user_id` which is `auth.users.id` — requiring a lookup of the seeker's `auth.users.id` from their profile.
**Why it happens:** `seeker_contacts` is keyed by `user_id` (auth.users FK) but `placement_fees.seeker_id` is the profile UUID. These are different UUIDs.
**How to avoid:** When loading applicant data in ApplicantDashboard, include `seeker_profiles.user_id` in the select so ApplicantPanel can query `seeker_contacts` with the correct `user_id`.
**Warning signs:** Contact fetch returns null even after acknowledgement.

### Pitfall 3: pg_cron HTTP Call Requires pg_net Extension
**What goes wrong:** Calling an Edge Function from pg_cron via `net.http_post()` requires the `pg_net` extension (separate from pg_cron). If pg_net is not enabled, the cron job silently does nothing.
**Why it happens:** pg_cron only schedules SQL — HTTP calls to Edge Functions require pg_net.
**How to avoid:** Alternative approach — pg_cron runs a SQL UPDATE that flags pending follow-ups, and a separately-invoked Edge Function (called from a lightweight scheduled invoke via Supabase Dashboard) drains them. OR: verify pg_net is available before committing to the HTTP-from-cron approach. The `008_job_expiry_cron.sql` uses pure SQL (no HTTP) — follow that pattern: pg_cron calls SQL that queries `placement_fees` and updates flag columns, then an Edge Function (triggered by webhook or a separate Supabase scheduled function) reads those flags and sends emails.
**Warning signs:** `ERROR: function net.http_post does not exist` in cron logs.

**Recommended approach:** pg_cron SQL sets `followup_7d_due = true` / `followup_14d_due = true` flags on `placement_fees`. A separate Supabase scheduled Edge Function (using Supabase's built-in function scheduler, not pg_cron HTTP) reads flagged rows and sends via Resend.

### Pitfall 4: Placement Fee Row Uniqueness on Re-acknowledgement
**What goes wrong:** If an employer goes to shortlist the same candidate twice (e.g., after declining and re-shortlisting via a different path), a second `placement_fees` row could be inserted.
**Why it happens:** No UNIQUE constraint on `placement_fees(application_id)`.
**How to avoid:** The `acknowledge-placement-fee` Edge Function (or the acknowledgement path) should do `upsert` on `(application_id)` or check for an existing row with `maybeSingle()` before inserting. Since `VALID_TRANSITIONS` defines `shortlisted -> ['offered', 'declined']` and once declined goes to final state, this is low risk — but the insert guard is still good practice.

### Pitfall 5: Resend From-Address Domain Verification Required
**What goes wrong:** Resend will not send from `notifications@topfarms.co.nz` until that domain is verified with SPF/DKIM DNS records. DNS propagation takes 24-48 hours.
**Why it happens:** Email providers require domain ownership verification before allowing custom from-addresses.
**How to avoid:** Use `onboarding@resend.dev` as the from-address during development. Initiate `topfarms.co.nz` domain verification in the Resend dashboard before Phase 5 testing begins (STATE.md already flags this: "Resend SPF/DKIM DNS configuration must be initiated before Phase 5 testing begins").
**Warning signs:** Resend API returns 403 or "Domain not verified" error.

### Pitfall 6: ApplicantPanel Does Not Currently Receive seeker_contacts Data
**What goes wrong:** `ApplicantPanel` currently only receives `application` (with nested `seeker_profiles`) and `matchScore`. Contact details from `seeker_contacts` must be fetched separately and passed as a prop, or fetched inside the panel.
**Why it happens:** Phase 3 built the panel without contact data — it was deferred to Phase 5.
**How to avoid:** Either (a) fetch all contact data for the current job's acknowledged applicants in `ApplicantDashboard.loadData()` and pass down via prop, or (b) have `ApplicantPanel` fetch contacts on expand if `application.status` is in `['shortlisted', 'offered', 'hired']`. Option (a) is cleaner — single fetch at load time for the employer, consistent with the existing `scoreMap` pattern.

## Code Examples

Verified patterns from official sources and existing codebase:

### Existing Idempotency Guard (stripe-webhook/index.ts)
```typescript
// Source: supabase/functions/stripe-webhook/index.ts lines 62-83
// Pattern to replicate for invoice.payment_succeeded
const { data: existingFee } = await supabaseClient
  .from('listing_fees')
  .select('id')
  .eq('stripe_payment_id', pi.id)
  .maybeSingle()

if (existingFee) {
  console.log('Duplicate webhook event — skipping')
  return new Response(JSON.stringify({ received: true }), { status: 200 })
}
```

### Stripe Invoice Create + Finalize (Deno)
```typescript
// Source: Stripe API docs — https://docs.stripe.com/api/invoices/create
import Stripe from 'https://esm.sh/stripe@14'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
})

// 1. Upsert Stripe customer
const customers = await stripe.customers.list({ email: employerEmail, limit: 1 })
const customer = customers.data[0] ?? await stripe.customers.create({
  email: employerEmail,
  name: farmName,
  metadata: { employer_id },
})

// 2. Create invoice (draft)
const invoice = await stripe.invoices.create({
  customer: customer.id,
  collection_method: 'send_invoice',
  days_until_due: 14,
  auto_advance: false, // We manually finalize after adding line items
  metadata: { application_id, employer_id, seeker_id, job_id },
})

// 3. Add line item
await stripe.invoiceItems.create({
  customer: customer.id,
  invoice: invoice.id,
  amount: feeAmountCents, // 20000, 40000, or 80000
  currency: 'nzd',
  description: `TopFarms placement fee — ${jobTitle} (${tierLabel})`,
})

// 4. Finalize — triggers Stripe to send hosted invoice email
const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id)
```

### Follow-up Email Check SQL (pg_cron body)
```sql
-- Source: Pattern from 008_job_expiry_cron.sql, adapted for follow-ups
-- Marks fees eligible for Day 7 follow-up
UPDATE public.placement_fees
SET followup_7d_due = true
WHERE acknowledged_at IS NOT NULL
  AND confirmed_at IS NULL
  AND followup_7d_sent = false
  AND followup_7d_due = false
  AND acknowledged_at <= now() - INTERVAL '7 days';

-- Marks fees eligible for Day 14 follow-up
UPDATE public.placement_fees
SET followup_14d_due = true
WHERE acknowledged_at IS NOT NULL
  AND confirmed_at IS NULL
  AND followup_14d_sent = false
  AND followup_14d_due = false
  AND acknowledged_at <= now() - INTERVAL '14 days';
```

### Contact Section in ApplicantPanel (Masked/Revealed)
```typescript
// Source: CONTEXT.md design decisions
// Blurred pattern consistent with Phase 3 VISITOR_TEASER_SCORE pattern

// Before acknowledgement (contacts prop is null):
<div className="font-mono text-[13px] text-mid select-none blur-sm">••• ••• ••••</div>
<div className="font-mono text-[13px] text-mid select-none blur-sm">j•••@gmail.com</div>

// After acknowledgement (contacts prop has real data):
<div className="text-[13px] font-body text-ink">{contacts.phone}</div>
<div className="text-[13px] font-body text-ink">{contacts.email}</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `npm:resend` SDK in Deno | Bare `fetch` to Resend REST API | Current (Supabase docs 2025) | No dependency, same capability for basic sends |
| PaymentIntent for all Stripe billing | PaymentIntent for upfront, Invoice for post-hire | N/A — design decision | Invoice supports Net 14, hosted page, auto reminders |
| RLS as only guard | RLS + modal paper trail | Phase 5 design | Legal paper trail for ToS enforcement |

**Deprecated/outdated:**
- `react-hot-toast`: MarkFilledModal uses `sonner` — Phase 5 modals must use `sonner` (not `react-hot-toast`) for consistency.

## Open Questions

1. **pg_net availability**
   - What we know: pg_cron is confirmed available (008_job_expiry_cron.sql). pg_net is a separate extension.
   - What's unclear: Whether pg_net is enabled in this Supabase project.
   - Recommendation: Design the follow-up email scheduling to NOT require pg_net. Use pg_cron for SQL flag-setting only (pure SQL, like the existing expiry cron). Use Supabase's built-in Edge Function scheduler (available in Supabase Dashboard under Functions → Schedule) to invoke `send-followup-emails` independently. This avoids pg_net entirely.

2. **stripe_customer_id storage**
   - What we know: `employer_profiles` has no `stripe_customer_id` column. Invoice API requires a customer.
   - What's unclear: Whether to add the column in migration 009 or look it up fresh each time.
   - Recommendation: Add `stripe_customer_id text` to `employer_profiles` in migration 009. Upsert on first invoice creation. Avoids repeated Stripe API calls for subsequent invoices.

3. **seeker_contacts completeness**
   - What we know: `seeker_contacts` has `phone` (nullable) and `email` (not null). Some seekers may not have provided a phone number.
   - What's unclear: Whether all seekers have a `seeker_contacts` row populated.
   - Recommendation: ApplicantPanel contact section must handle `contacts.phone === null` gracefully — show "Not provided" rather than an empty blurred placeholder.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^3.1.1 + @testing-library/react ^16.3.0 |
| Config file | vitest.config.ts (merges viteConfig for @ alias) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REVN-01 | PlacementFeeModal renders with correct fee tier for given salary | unit | `npx vitest run tests/placement-fee.test.ts` | Wave 0 |
| REVN-01 | handleTransition intercepts 'shortlisted' and shows modal instead of direct update | unit | `npx vitest run tests/placement-fee.test.ts` | Wave 0 |
| REVN-01 | Modal cancel keeps applicant at prior stage | unit | `npx vitest run tests/placement-fee.test.ts` | Wave 0 |
| REVN-02 | calculatePlacementFee returns correct tier for salary bands and title keywords | unit | `npx vitest run tests/placement-fee.test.ts` | Wave 0 |
| REVN-02 | ApplicantPanel shows masked placeholder when contacts prop is null | unit | `npx vitest run tests/placement-fee.test.ts` | Wave 0 |
| REVN-02 | ApplicantPanel shows real contact data when contacts prop is provided | unit | `npx vitest run tests/placement-fee.test.ts` | Wave 0 |
| REVN-03 | Stripe idempotency: duplicate payment_intent.succeeded webhook does not create second listing_fee row | manual-only | Manual Stripe CLI webhook replay test | N/A |
| REVN-04 | Invoice webhook idempotency: duplicate invoice.payment_succeeded does not create second placement_fee.confirmed_at | manual-only | Manual Stripe CLI webhook replay test | N/A |

**Note:** REVN-03 and REVN-04 idempotency guards are best verified manually using `stripe trigger payment_intent.succeeded` and re-delivery via Stripe Dashboard. Unit tests can cover the guard logic in isolation (mock Supabase returning existing row → assert early return).

### Sampling Rate
- **Per task commit:** `npx vitest run tests/placement-fee.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/placement-fee.test.ts` — covers REVN-01 (modal intercept, cancel behavior), REVN-02 (fee calculation, contact masking UI)
- [ ] `tests/setup.ts` — already exists, no change needed

## Sources

### Primary (HIGH confidence)
- Supabase migrations (local) — `seeker_contacts` schema, RLS policies, `placement_fees` schema confirmed
- `supabase/functions/create-payment-intent/index.ts` — Stripe v14 + esm.sh pattern confirmed
- `supabase/functions/stripe-webhook/index.ts` — idempotency guard pattern confirmed
- `supabase/migrations/008_job_expiry_cron.sql` — pg_cron extension and pattern confirmed
- [Resend Supabase Edge Function docs](https://resend.com/docs/send-with-supabase-edge-functions) — fetch-based pattern confirmed
- [Stripe Invoice create API](https://docs.stripe.com/api/invoices/create) — `days_until_due`, `collection_method`, `auto_advance` parameters confirmed

### Secondary (MEDIUM confidence)
- [Supabase send emails guide](https://supabase.com/docs/guides/functions/examples/send-emails) — confirms `npm:resend` as alternative import specifier
- Stripe API docs — `days_until_due` confirmed for Net 14, requires `collection_method: 'send_invoice'`

### Tertiary (LOW confidence)
- pg_net availability: assumed NOT available based on absence from 008 migration and the pattern it uses (pure SQL only). Verify before committing to HTTP-from-cron approach.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use or verified via official docs
- Architecture: HIGH — schema pre-built, RLS pre-built, modal pattern already in codebase (MarkFilledModal)
- Pitfalls: HIGH — identified from actual code inspection (missing stripe_customer_id, user_id vs profile.id, pg_net uncertainty)

**Research date:** 2026-03-16
**Valid until:** 2026-06-16 (stable — Stripe v14, Supabase RLS patterns don't change frequently)
