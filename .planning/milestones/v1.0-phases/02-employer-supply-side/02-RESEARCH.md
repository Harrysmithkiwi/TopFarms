# Phase 2: Employer Supply Side - Research

**Researched:** 2026-03-15
**Domain:** Multi-step wizard forms, Stripe PaymentIntent, Supabase Storage, job status lifecycle, verification system
**Confidence:** HIGH (stack is verified against project; patterns verified via official docs and Context7)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Onboarding Wizard Flow**
- Auto-save progress after each screen completes — employer returns to where they left off
- Strict linear order through all 8 screens (no skipping)
- Numbered step bar with circles (1-8), current step highlighted, completed steps checked
- After completing onboarding, land on employer dashboard with success toast and "Post your first job" CTA

**Job Posting Wizard**
- Skills picker uses grouped checklist by category (milking, animal health, etc) with proficiency level (basic/intermediate/advanced) per selected skill
- Preview screen shown after all content screens, before tier selection and payment
- Auto-save drafts — job starts as draft on first screen, auto-saves progress, employer can return to drafts from dashboard
- Compensation fields: two number inputs for salary range (min/max NZD annual) plus checkboxes for benefits (accommodation, vehicle, phone, meals, etc)

**Verification & Trust Signals**
- Verification introduced during onboarding wizard (dedicated screen) plus ongoing dashboard nudges to complete remaining steps
- Aggregate trust level badge (e.g., "Basic Verified", "Verified", "Fully Verified") that expands on hover/click to show individual verifications
- Drag-and-drop upload zones with thumbnail preview for documents and farm photos — accept common image/PDF formats with clear file size limit
- NZBN verification shows nothing externally until admin confirms — employer sees "Pending Review" in their own settings only

**Stripe Payment Flow**
- First listing free: show all three tiers (Standard $100 / Featured $150 / Premium $200) with $0 price and "First listing free!" badge — employer still picks a tier to understand future pricing
- Tier selection presented as comparison cards side-by-side, highlight middle option as best value
- Instant activation after Stripe confirms payment — success screen with listing link and share options
- Payment failure: inline error on payment screen (e.g., "Card declined") with retry, job posting preserved

**Job Management After Posting**
- Dashboard shows job cards with status badge (active/paused/expired) and action buttons (pause, edit, archive), days remaining indicator
- Employers can edit active listings directly without pausing
- "Mark as Filled" modal shows applicant list, employer selects hired candidate and hire date — creates audit record linking listing to placement (foundation for Phase 5 placement fees)

**Job Detail Page (Visitor View)**
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

### Deferred Ideas (OUT OF SCOPE)
- Full placement fee flow (acknowledgement modal, contact reveal) — Phase 5
- Employer analytics dashboard (views, applications, conversion) — v2 (GRWT-03)
- Admin NZBN verification workflow UI — Phase TBD (ADMN-02)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EONB-01 | 8-screen onboarding wizard: farm type, farm details, culture, accommodation, verification start, pricing overview, completion | Multi-step wizard pattern with RHF + Zustand + per-step Supabase upsert |
| EONB-02 | Farm type selection (dairy cattle, sheep & beef) | Radio card UI; maps to `farm_type` column in employer_profiles |
| EONB-03 | Farm details capture (herd size, shed type, milking system, region, property size) | Form inputs mapped to existing employer_profiles columns; shed_type is text[] |
| EONB-04 | Culture and work environment description | Missing `culture_description` column — needs migration; long text textarea |
| EONB-05 | Accommodation details with sub-fields (pets, couples, family, utilities included) | Missing employer accommodation columns — needs migration with jsonb or separate columns |
| EONB-06 | Employer profile persisted and editable after completion | Supabase upsert on employer_profiles; needs `onboarding_complete` bool + `onboarding_step` int columns |
| EVER-01 | 5-tier verification system: email (auto), phone SMS, NZBN, document upload, farm photo | Needs `employer_verifications` table; Supabase phone OTP via `supabase.auth.updateUser({ phone })` + `verifyOtp` |
| EVER-02 | Verification badges displayed on employer profile and job listings | Frontend badge component using verification record states; aggregate computed from verifications table |
| EVER-03 | Manual NZBN verification (admin flag, no API integration for MVP) | `nzbn_status` enum column on employer_verifications: pending/confirmed — admin sets via service role |
| EVER-04 | Document and photo upload via Supabase Storage | Supabase Storage bucket + react-dropzone + storage.from().upload() + RLS on storage.objects |
| JPOS-01 | 7-screen job posting wizard: role basics, farm details, skills required, compensation, description, pricing/payment, success | Same wizard pattern as onboarding; job created as draft on screen 1, upserted per screen |
| JPOS-02 | Role basics: title, contract type, start date, duration | Maps to existing jobs table columns (title, contract_type, start_date) |
| JPOS-03 | Skills required with proficiency levels from master skills table | job_skills junction table; skills loaded from skills table, grouped by category |
| JPOS-04 | Compensation: salary range (NZD annual), accommodation offered, other benefits | Maps to salary_min/salary_max; accommodation is jsonb; benefits need a column |
| JPOS-05 | Listing fee payment via Stripe: first listing free, Standard $100, Featured $150, Premium $200 | Supabase Edge Function creates PaymentIntent; @stripe/react-stripe-js renders PaymentElement; webhook activates job |
| JPOS-06 | Job status management: draft, active, paused, filled, expired, archived | Schema gap: 'paused' missing from jobs.status CHECK — needs migration |
| JPOS-07 | 30-day listing expiry with status transitions | pg_cron scheduled daily job updating status='expired' where expires_at < now() and status='active' |
</phase_requirements>

---

## Summary

Phase 2 builds the complete employer supply side: an 8-screen onboarding wizard, a 7-screen job posting wizard with Stripe payment, a 5-tier verification system with file uploads, and job lifecycle management. All core libraries are already installed (react-hook-form, zod, @supabase/supabase-js, sonner). The database schema is largely in place from Phase 1 but requires three targeted migrations: adding missing columns to employer_profiles (culture, accommodation, onboarding tracking), creating an employer_verifications table, and fixing the jobs.status CHECK constraint to include 'paused'.

The standard wizard pattern for this stack is: one React Hook Form instance per step (with Zod schema scoped to that step), a parent wizard component that owns step state, and a Supabase upsert call after each step's `onSubmit`. No external state manager (Zustand, Redux) is needed — the parent component's `useState` and database drafts provide sufficient persistence. For Stripe, the flow is: create a PaymentIntent via Supabase Edge Function → render PaymentElement on the frontend → handle `payment_intent.succeeded` webhook to activate the job listing.

**Primary recommendation:** Use per-step RHF instances with Zod, Supabase upsert after each step, react-dropzone for file uploads into Supabase Storage, and a single Edge Function pair (create-payment-intent + stripe-webhook) for the Stripe flow. Keep the wizard state in a parent React component — no state management library is needed for this scope.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-hook-form | ^7.55.0 (installed) | Per-step form state and validation | Already in project; performant controlled forms |
| zod | ^3.24.2 (installed) | Per-step validation schemas | Already in project; TypeScript-first |
| @hookform/resolvers | ^5.0.1 (installed) | zodResolver for RHF | Already in project |
| @supabase/supabase-js | ^2.49.4 (installed) | Database upsert, Storage upload, Phone OTP | Already in project |
| sonner | ^2.0.3 (installed) | Toast notifications for save/success | Already in project |
| lucide-react | ^0.487.0 (installed) | Icons for step indicator, status badges | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-dropzone | ^14.x | Drag-and-drop file upload zone | EVER-04: document/photo upload screens |
| @stripe/stripe-js | ^4.x | Stripe.js loader for browser | JPOS-05: loads Stripe securely |
| @stripe/react-stripe-js | ^2.x | PaymentElement React component | JPOS-05: renders the payment form |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-dropzone | HTML5 native drag events | Native has poor UX; react-dropzone handles edge cases (directory drops, copy-paste, screen readers) |
| Supabase Edge Function for Stripe | Next.js API routes or Express | Project is Vite + SPA — no server; Edge Functions are the only server-side option |
| Per-step RHF instance | Single RHF instance across all steps | Single instance requires `trigger()` per step; per-step is simpler and isolates validation |

**Installation (new packages only):**
```bash
npm install react-dropzone @stripe/stripe-js @stripe/react-stripe-js
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── pages/
│   ├── onboarding/
│   │   ├── EmployerOnboarding.tsx      # Wizard shell (step router)
│   │   └── steps/
│   │       ├── Step1FarmType.tsx
│   │       ├── Step2FarmDetails.tsx
│   │       ├── Step3Culture.tsx
│   │       ├── Step4Accommodation.tsx
│   │       ├── Step5Verification.tsx
│   │       ├── Step6Pricing.tsx
│   │       ├── Step7Preview.tsx
│   │       └── Step8Complete.tsx
│   ├── jobs/
│   │   ├── PostJob.tsx                 # Job posting wizard shell
│   │   ├── JobDetail.tsx               # Public job detail page
│   │   └── steps/
│   │       ├── JobStep1Basics.tsx
│   │       ├── JobStep2FarmDetails.tsx
│   │       ├── JobStep3Skills.tsx
│   │       ├── JobStep4Compensation.tsx
│   │       ├── JobStep5Description.tsx
│   │       ├── JobStep6Preview.tsx
│   │       ├── JobStep7Payment.tsx
│   │       └── JobStep8Success.tsx
│   └── dashboard/
│       └── EmployerDashboard.tsx       # (exists — extend with job cards)
├── components/
│   ├── ui/                             # (exists — extend with new components)
│   │   ├── StepIndicator.tsx           # Numbered circles with check marks
│   │   ├── VerificationBadge.tsx       # Aggregate trust badge, expandable
│   │   ├── FileDropzone.tsx            # react-dropzone wrapper with preview
│   │   ├── SkillsPicker.tsx            # Grouped checklist by category
│   │   ├── TierCard.tsx                # Stripe tier comparison card
│   │   └── JobCard.tsx                 # Dashboard job listing card
│   └── stripe/
│       └── PaymentForm.tsx             # Elements provider + PaymentElement
├── hooks/
│   ├── useWizard.ts                    # Step navigation, guard logic
│   └── useVerifications.ts            # Load/refresh employer verifications
└── lib/
    └── stripe.ts                       # loadStripe() singleton
supabase/
└── functions/
    ├── create-payment-intent/
    │   └── index.ts                    # Creates Stripe PaymentIntent
    └── stripe-webhook/
        └── index.ts                    # Handles payment_intent.succeeded
supabase/migrations/
    ├── 004_employer_profile_columns.sql
    ├── 005_employer_verifications.sql
    ├── 006_jobs_paused_status.sql
    └── 007_storage_buckets.sql
```

### Pattern 1: Wizard Shell with Per-Step Forms

The shell owns step state and an `employer_profile_id`. Each step is a self-contained form with its own RHF instance. On submit, the step calls `onStepComplete(data)` passed from the shell, which upserts to Supabase and advances to the next step.

```typescript
// Source: react-hook-form.com/advanced-usage (Wizard Form section)
// Pattern: parent manages step index; each step is a standalone RHF form

// EmployerOnboarding.tsx (shell)
export function EmployerOnboarding() {
  const [currentStep, setCurrentStep] = useState(0)
  const [profileId, setProfileId] = useState<string | null>(null)
  const { user } = useAuth()

  // Resume from last saved step
  useEffect(() => {
    async function loadProgress() {
      const { data } = await supabase
        .from('employer_profiles')
        .select('id, onboarding_step')
        .eq('user_id', user!.id)
        .single()
      if (data) {
        setProfileId(data.id)
        setCurrentStep(data.onboarding_step ?? 0)
      }
    }
    loadProgress()
  }, [])

  async function handleStepComplete(stepData: Record<string, unknown>, step: number) {
    const { data } = await supabase
      .from('employer_profiles')
      .upsert({
        user_id: user!.id,
        ...stepData,
        onboarding_step: step + 1,
      }, { onConflict: 'user_id' })
      .select('id')
      .single()
    if (data && !profileId) setProfileId(data.id)
    setCurrentStep(step + 1)
  }

  return (
    <div>
      <StepIndicator currentStep={currentStep} totalSteps={8} />
      {currentStep === 0 && <Step1FarmType onComplete={(d) => handleStepComplete(d, 0)} />}
      {currentStep === 1 && <Step2FarmDetails onComplete={(d) => handleStepComplete(d, 1)} />}
      {/* ...etc */}
    </div>
  )
}

// Step1FarmType.tsx (per-step form)
const schema = z.object({
  farm_type: z.enum(['dairy', 'sheep_beef']),
})

export function Step1FarmType({ onComplete }: { onComplete: (data: z.infer<typeof schema>) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })
  return (
    <form onSubmit={handleSubmit(onComplete)}>
      {/* Farm type radio cards */}
    </form>
  )
}
```

### Pattern 2: Job Auto-Save as Draft

Job starts as a database row with status='draft' on step 1 submission. Subsequent steps upsert that row. Payment step is only triggered once the preview is approved.

```typescript
// Job posting wizard: create draft on step 1
async function handleJobStep1Complete(data: JobStep1Data) {
  const { data: job } = await supabase
    .from('jobs')
    .insert({
      employer_id: employerProfileId,
      status: 'draft',
      sector: data.sector,
      title: data.title,
      contract_type: data.contract_type,
      region: data.region,
      role_type: data.role_type,
    })
    .select('id')
    .single()
  setJobId(job!.id)
  setCurrentStep(1)
}

// Subsequent steps upsert:
async function handleJobStepNComplete(data: Record<string, unknown>, step: number) {
  await supabase
    .from('jobs')
    .update({ ...data })
    .eq('id', jobId!)
  setCurrentStep(step + 1)
}
```

### Pattern 3: Stripe PaymentIntent Flow

Server-side Edge Function creates the PaymentIntent; client renders the PaymentElement; webhook activates the job.

```typescript
// supabase/functions/create-payment-intent/index.ts
import Stripe from 'https://esm.sh/stripe@14'

Deno.serve(async (req) => {
  const { job_id, tier } = await req.json()
  const TIER_PRICES = { 1: 10000, 2: 15000, 3: 20000 } // cents NZD

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' })

  const paymentIntent = await stripe.paymentIntents.create({
    amount: TIER_PRICES[tier as keyof typeof TIER_PRICES],
    currency: 'nzd',
    metadata: { job_id, tier: String(tier) },
  })

  return new Response(JSON.stringify({ client_secret: paymentIntent.client_secret }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

// Frontend PaymentForm.tsx
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

export function PaymentForm({ clientSecret, onSuccess }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = await stripe!.confirmPayment({
      elements: elements!,
      confirmParams: { return_url: `${window.location.origin}/jobs/success` },
      redirect: 'if_required',
    })
    if (result.error) { /* show inline error */ }
    else { onSuccess() }
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <form onSubmit={handleSubmit}>
        <PaymentElement />
        <button type="submit">Pay Now</button>
      </form>
    </Elements>
  )
}
```

### Pattern 4: Supabase Storage Upload with react-dropzone

```typescript
// Source: supabase.com/docs/reference/javascript/storage-from-upload
// Source: react-dropzone.js.org

// components/ui/FileDropzone.tsx
import { useDropzone } from 'react-dropzone'
import { supabase } from '@/lib/supabase'

interface FileDropzoneProps {
  bucket: string
  path: string // e.g. `${userId}/documents`
  accept: Record<string, string[]>
  maxSize?: number
  onUploadComplete: (url: string) => void
}

export function FileDropzone({ bucket, path, accept, maxSize = 5 * 1024 * 1024, onUploadComplete }: FileDropzoneProps) {
  const [preview, setPreview] = useState<string | null>(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    maxSize,
    onDrop: async ([file]) => {
      // Show preview for images
      if (file.type.startsWith('image/')) {
        setPreview(URL.createObjectURL(file))
      }
      // Upload to Supabase Storage
      const filePath = `${path}/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from(bucket).upload(filePath, file, { upsert: true })
      if (!error) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
        onUploadComplete(data.publicUrl)
      }
    },
  })

  return (
    <div {...getRootProps()} className={cn('border-2 border-dashed rounded-lg p-8 text-center cursor-pointer', isDragActive && 'border-fern bg-green-lt')}>
      <input {...getInputProps()} />
      {preview && <img src={preview} className="mx-auto mb-4 max-h-40 rounded" />}
      <p>{isDragActive ? 'Drop here...' : 'Drag and drop, or click to select'}</p>
    </div>
  )
}
```

### Pattern 5: Supabase Phone OTP Verification (EVER-01)

For phone SMS verification of an already-logged-in employer (not login, but profile verification):

```typescript
// Step 1: Send OTP to phone
const { error } = await supabase.auth.updateUser({ phone: '+64211234567' })
// Supabase sends SMS with 6-digit OTP

// Step 2: Verify OTP
const { error } = await supabase.auth.verifyOtp({
  phone: '+64211234567',
  token: '123456',
  type: 'phone_change', // use 'phone_change' when updating existing user's phone
})

// Step 3: Record verification in employer_verifications table
await supabase.from('employer_verifications').upsert({
  employer_id: profileId,
  method: 'phone',
  verified_at: new Date().toISOString(),
}, { onConflict: 'employer_id,method' })
```

Note: Supabase phone OTP requires a third-party SMS provider (Twilio, MessageBird, Vonage). For development/MVP, Supabase provides a phone testing mode. Requires configuration in Supabase Auth settings.

### Pattern 6: Job Expiry via pg_cron

```sql
-- Source: supabase.com/docs/guides/cron/quickstart
-- Migration 004: schedule daily expiry job
select cron.schedule(
  'expire-job-listings',
  '0 2 * * *',  -- 2:00 AM daily NZT-ish (UTC)
  $$
    update public.jobs
    set status = 'expired'
    where status = 'active'
      and expires_at < now()
  $$
);
```

### Anti-Patterns to Avoid

- **Single giant RHF form across all wizard steps:** Causes validation bleeding across steps and forces `trigger()` calls per step. Use per-step forms instead.
- **Saving to localStorage only:** localStorage is lost if browser clears storage. Auto-save to database (Supabase upsert) is the only reliable persistence for a paid onboarding flow.
- **Creating a Stripe PaymentIntent client-side:** Never pass the Stripe secret key to the browser. Always create PaymentIntents from an Edge Function (server-side).
- **Hardcoding tier prices in the frontend:** Prices live in the Edge Function and webhook handler only — never trust client-sent amounts for payment.
- **Polling for payment status:** Use the Stripe webhook (`payment_intent.succeeded`) to activate the job, not client-side polling.
- **Public Supabase Storage buckets without path scoping:** Use user-ID-prefixed paths in storage (`uploads/{user_id}/documents/...`) even in a public bucket to prevent path guessing.
- **Modifying the jobs.status CHECK without a migration:** The current schema has `('draft', 'active', 'filled', 'expired', 'archived')` — 'paused' is missing. Attempting to set `status='paused'` will throw a Postgres constraint violation.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File drag-and-drop | Custom drag event handlers | react-dropzone | Handles directory drops, clipboard paste, keyboard navigation, MIME type filtering, size validation, accessible ARIA |
| Stripe payment UI | Custom card input fields | @stripe/react-stripe-js PaymentElement | PCI compliance — custom card fields require SAQ D certification; Elements is SAQ A |
| Phone OTP | Custom SMS + code storage | Supabase Auth `updateUser + verifyOtp` | Rate limiting, expiry, provider abstraction all handled |
| Wizard step indicator | Custom progress component | Extend existing ProgressBar from Phase 1 | ProgressBar already exists; add step circles via StepIndicator wrapper |
| Job expiry cronjob | Edge Function polling | pg_cron scheduled SQL | pg_cron runs inside the database — no cold starts, no network, more reliable |

**Key insight:** The payment flow (Stripe Elements + webhook) and file upload flow (react-dropzone + Supabase Storage) each encapsulate significant security/compliance complexity. Building custom solutions for either would introduce PCI scope problems and reliability issues.

---

## Common Pitfalls

### Pitfall 1: Schema Gaps Blocking Implementation

**What goes wrong:** Three things in the existing schema block Phase 2 as-is: (1) `employer_profiles` has no `culture_description`, accommodation columns, or onboarding progress tracking. (2) No `employer_verifications` table exists. (3) `jobs.status` CHECK constraint is missing `'paused'`.

**Why it happens:** Phase 1 schema was designed for full v1 but the employer profile model was kept minimal.

**How to avoid:** Wave 0 must include three targeted migrations before any feature work begins.

**Warning signs:** Postgres constraint violation errors when setting `status='paused'`; upsert of culture/accommodation data silently ignored (columns don't exist).

### Pitfall 2: First-Listing-Free Logic Race Condition

**What goes wrong:** If first-listing-free is determined client-side (checking listing count), an employer could open two tabs and submit simultaneously, getting two free listings.

**Why it happens:** Count check and payment creation are not atomic.

**How to avoid:** Check `listing_fees` count in the Edge Function before creating the PaymentIntent. If count === 0, return `{ client_secret: null, is_free: true }` and activate the job directly without going through Stripe payment flow.

**Warning signs:** Multiple free listings in `listing_fees` table with `amount_nzd = 0`.

### Pitfall 3: Stripe Webhook Idempotency

**What goes wrong:** Stripe retries webhooks if your endpoint doesn't respond 200 within 30 seconds. Duplicate `payment_intent.succeeded` events can activate a job twice or create duplicate `listing_fees` records.

**Why it happens:** Network failures, slow Edge Function cold starts.

**How to avoid:** Check for existing `listing_fees.stripe_payment_id` before inserting. Use `INSERT ... ON CONFLICT DO NOTHING`.

**Warning signs:** Duplicate rows in `listing_fees` table with same `stripe_payment_id`.

### Pitfall 4: Supabase Phone OTP Requires Provider Setup

**What goes wrong:** Phone OTP calls to `supabase.auth.updateUser({ phone })` silently fail or return generic errors if no SMS provider is configured in the Supabase project.

**Why it happens:** Default Supabase projects have no SMS provider.

**How to avoid:** Configure Twilio (or Vonage) in Supabase Auth settings before testing phone verification. Use Supabase's "Phone testing mode" during development (allows specific test numbers without real SMS).

**Warning signs:** `updateUser({ phone })` returns no error but user never receives SMS.

### Pitfall 5: Supabase Storage RLS Not Set on storage.objects

**What goes wrong:** Uploads return 403 errors despite the user being authenticated.

**Why it happens:** Supabase Storage requires explicit RLS policies on `storage.objects`. Creating the bucket alone is insufficient.

**How to avoid:** Migration 007 must include INSERT + SELECT policies on `storage.objects` scoped to the employer's user ID path prefix.

**Warning signs:** `supabase.storage.from().upload()` returns `{ error: { message: 'new row violates row-level security policy' } }`.

### Pitfall 6: Zod v3 + @hookform/resolvers v5 Import Paths

**What goes wrong:** Using wrong import paths causes runtime errors.

**Why it happens:** STATE.md flags this: "Zod v4 + @hookform/resolvers v5 import paths changed — verify correct imports on first form implementation". Note: the project uses Zod v3 (^3.24.2), not v4.

**How to avoid:**
```typescript
// Correct for this project (Zod v3 + resolvers v5):
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
// NOT: import { zodResolver } from '@hookform/resolvers' (old path)
```

**Warning signs:** `Cannot find module '@hookform/resolvers/zod'` or resolver not working silently.

---

## Code Examples

### Stripe Webhook Edge Function

```typescript
// Source: supabase.com/docs/guides/functions/examples/stripe-webhooks
// supabase/functions/stripe-webhook/index.ts
import Stripe from 'https://esm.sh/stripe@14'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' })

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')!
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, Deno.env.get('STRIPE_WEBHOOK_SECRET')!)
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent
    const { job_id, tier } = pi.metadata

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Idempotency: skip if already processed
    const { data: existing } = await supabase
      .from('listing_fees')
      .select('id')
      .eq('stripe_payment_id', pi.id)
      .single()

    if (!existing) {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      await supabase.from('jobs').update({
        status: 'active',
        listing_tier: Number(tier),
        expires_at: expiresAt,
      }).eq('id', job_id)

      await supabase.from('listing_fees').insert({
        job_id,
        stripe_payment_id: pi.id,
        amount_nzd: pi.amount,
        tier: Number(tier),
        paid_at: new Date().toISOString(),
      })
    }
  }

  return new Response('ok', { status: 200 })
})
```

### Storage RLS Migration

```sql
-- Source: supabase.com/docs/guides/storage/security/access-control
-- 007_storage_buckets.sql

-- Create private buckets
insert into storage.buckets (id, name, public) values
  ('employer-documents', 'employer-documents', false),
  ('employer-photos', 'employer-photos', true);  -- photos are public for display

-- INSERT policy: employers can upload to their own user_id folder
create policy "employers upload own documents"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'employer-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.get_user_role(auth.uid()) = 'employer'
);

-- SELECT policy: employers can view their own documents
create policy "employers view own documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'employer-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Farm photos: public read
create policy "anyone can view farm photos"
on storage.objects for select
using (bucket_id = 'employer-photos');

-- Employers can upload their own farm photos
create policy "employers upload own farm photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'employer-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.get_user_role(auth.uid()) = 'employer'
);
```

### Employer Verifications Table Migration

```sql
-- 005_employer_verifications.sql
create table public.employer_verifications (
  id             uuid primary key default gen_random_uuid(),
  employer_id    uuid not null references public.employer_profiles(id) on delete cascade,
  method         text not null check (method in ('email', 'phone', 'nzbn', 'document', 'farm_photo')),
  status         text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  nzbn_number    text,                    -- for nzbn method only
  document_url   text,                    -- for document/farm_photo methods
  verified_at    timestamptz,
  created_at     timestamptz not null default now(),
  constraint employer_verifications_employer_method_key unique (employer_id, method)
);

alter table public.employer_verifications enable row level security;

-- Employer can view and insert their own verifications
create policy "employers manage own verifications"
on public.employer_verifications for all
using (
  employer_id in (select id from public.employer_profiles where user_id = auth.uid())
  and public.get_user_role(auth.uid()) = 'employer'
)
with check (
  employer_id in (select id from public.employer_profiles where user_id = auth.uid())
  and public.get_user_role(auth.uid()) = 'employer'
);

-- Seekers can view verifications (for trust badge display on job listings)
create policy "seekers view employer verifications"
on public.employer_verifications for select
using (public.get_user_role(auth.uid()) = 'seeker');

-- Public (anon) can view verifications for job detail page visitor view
create policy "anon view employer verifications"
on public.employer_verifications for select
using (true);
```

### Employer Profile Missing Columns Migration

```sql
-- 004_employer_profile_columns.sql

-- Culture & work environment (EONB-04)
alter table public.employer_profiles
  add column if not exists culture_description text,
  add column if not exists team_size int;

-- Accommodation details (EONB-05)
-- Using structured columns rather than jsonb for easier querying
alter table public.employer_profiles
  add column if not exists accommodation_available bool not null default false,
  add column if not exists accommodation_type text,        -- 'house', 'flat', 'cottage', etc.
  add column if not exists accommodation_pets bool not null default false,
  add column if not exists accommodation_couples bool not null default false,
  add column if not exists accommodation_family bool not null default false,
  add column if not exists accommodation_utilities_included bool not null default false;

-- Onboarding progress tracking (EONB-06)
alter table public.employer_profiles
  add column if not exists onboarding_step int not null default 0,
  add column if not exists onboarding_complete bool not null default false;

-- Property size (EONB-03)
alter table public.employer_profiles
  add column if not exists property_size_ha int;

-- 006_jobs_paused_status.sql
-- Fix missing 'paused' status in jobs table
alter table public.jobs
  drop constraint jobs_status_check;

alter table public.jobs
  add constraint jobs_status_check
  check (status in ('draft', 'active', 'paused', 'filled', 'expired', 'archived'));

-- Add benefits jsonb for job compensation (JPOS-04)
alter table public.jobs
  add column if not exists benefits jsonb default '[]';
```

### StepIndicator Component

```typescript
// src/components/ui/StepIndicator.tsx
interface StepIndicatorProps {
  currentStep: number   // 0-indexed
  totalSteps: number
  labels?: string[]
}

export function StepIndicator({ currentStep, totalSteps, labels }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-1 mb-8">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <React.Fragment key={i}>
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0',
            i < currentStep && 'bg-moss text-white',          // completed
            i === currentStep && 'bg-fern text-white',         // active
            i > currentStep && 'bg-fog text-light',            // future
          )}>
            {i < currentStep ? <Check size={14} /> : i + 1}
          </div>
          {i < totalSteps - 1 && (
            <div className={cn('flex-1 h-0.5', i < currentStep ? 'bg-moss' : 'bg-fog')} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stripe Charges API | PaymentIntents API | ~2019, required by Stripe | PaymentIntents handles SCA/3DS automatically; Charges API is legacy |
| Single monolithic form for wizard | Per-step RHF instances | 2022-onward community pattern | Cleaner validation, better UX, easier testing |
| Supabase TUS resumable uploads | Standard upload for < 6MB | Always existed as two options | Use standard upload for documents/photos (small files) |
| Separate `@hookform/resolvers/zod` package | Still separate, but import path changed in resolvers v5 | resolvers v5 (2024) | Must import from `@hookform/resolvers/zod` not `@hookform/resolvers` |

**Deprecated/outdated:**
- Stripe Charges API: Don't use `stripe.charges.create()` — use PaymentIntents. Project has `REVN-03` which references PaymentIntent API, confirming correct choice.
- react-dropzone-uploader: A separate community library. Use the official `react-dropzone` (maintained by react-dropzone org) not the uploader fork.

---

## Open Questions

1. **SMS provider for phone OTP (EVER-01)**
   - What we know: Supabase phone OTP requires Twilio, MessageBird, or Vonage configured in Supabase Auth settings
   - What's unclear: Whether the Supabase project already has a provider configured
   - Recommendation: Check Supabase Auth settings before implementing EVER-01. If no provider configured, use Supabase's phone testing mode for development. This doesn't block planning but must be resolved before shipping phone verification.

2. **Stripe keys and webhook endpoint**
   - What we know: Stripe requires a `STRIPE_SECRET_KEY` env var in Edge Functions and a `STRIPE_WEBHOOK_SECRET` for webhook signature verification
   - What's unclear: Whether Stripe account is created/configured
   - Recommendation: Create Stripe account and add test keys as Supabase secrets before JPOS-05 work begins. Does not block planning.

3. **Employer profile editing UX after onboarding (Claude's Discretion)**
   - What we know: The CONTEXT.md marks this as Claude's discretion
   - Recommendation: Implement as inline editing on a dedicated `/dashboard/employer/profile` page (not wizard re-entry). Each section (farm details, accommodation, culture) is an editable card with an Edit button that opens an inline form. This is simpler than re-entering the wizard and allows partial edits.

4. **Aggregate trust badge computation**
   - What we know: Badge shows "Basic Verified", "Verified", "Fully Verified" based on verifications
   - Recommendation: Compute in the frontend from the `employer_verifications` records:
     - Basic Verified: email verified (auto at signup)
     - Verified: email + phone
     - Fully Verified: email + phone + (NZBN confirmed or document verified) + farm photo

---

## Validation Architecture

> `workflow.nyquist_validation` is not present in `.planning/config.json` — this section is omitted per instructions.

---

## Sources

### Primary (HIGH confidence)
- `https://react-hook-form.com/advanced-usage` - Wizard Form pattern, per-step form approach
- `https://supabase.com/docs/reference/javascript/storage-from-upload` - Storage upload API, getPublicUrl
- `https://supabase.com/docs/guides/storage/security/access-control` - Storage RLS policies, INSERT/SELECT on storage.objects
- `https://supabase.com/docs/guides/cron/quickstart` - pg_cron scheduling syntax, `cron.schedule()`
- `https://supabase.com/docs/guides/auth/phone-login` - Phone OTP: `updateUser({ phone })`, `verifyOtp()`, `type: 'phone_change'`
- `https://docs.stripe.com/payments/payment-intents` - PaymentIntent flow: create server-side, client_secret to frontend, confirm client-side, webhook server-side
- `https://docs.stripe.com/sdks/stripejs-react` - @stripe/react-stripe-js: Elements, PaymentElement, useStripe, useElements

### Secondary (MEDIUM confidence)
- `https://supabase.com/docs/guides/functions/examples/stripe-webhooks` - Stripe webhook Edge Function pattern (referenced official docs, GitHub link returned 429)
- `https://blog.logrocket.com/building-reusable-multi-step-form-react-hook-form-zod/` - Multi-step RHF + Zod pattern with local storage (verified against official RHF docs)
- `https://react-dropzone.js.org/` - react-dropzone API: useDropzone, accept, maxSize, onDrop

### Tertiary (LOW confidence)
- WebSearch results on Stripe + Supabase integration patterns — general pattern confirmed by multiple sources but specific code verified against official docs above

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed (except react-dropzone, @stripe/react-stripe-js); verified against package.json and official docs
- Architecture: HIGH — wizard pattern verified against react-hook-form official docs; Stripe flow verified against stripe.com docs; Storage verified against supabase docs
- Schema gaps: HIGH — directly read from source migration files; gaps identified with certainty
- Pitfalls: MEDIUM-HIGH — most verified by official docs; SMS provider requirement verified by Supabase docs; Stripe idempotency is Stripe's own recommendation
- pg_cron syntax: HIGH — verified from official Supabase cron docs

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable stack — Stripe, Supabase, RHF APIs don't change frequently)
