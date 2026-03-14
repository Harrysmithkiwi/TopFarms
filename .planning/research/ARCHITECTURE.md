# Architecture Research

**Domain:** Two-sided agricultural job marketplace (employer/seeker)
**Researched:** 2026-03-15
**Confidence:** HIGH (SPEC.md provides authoritative schema, data flows, and component requirements; patterns derived from stack documentation and well-established React + Supabase marketplace conventions)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (Vercel CDN)                     │
├──────────────┬──────────────┬──────────────┬────────────────────────┤
│  Public Pages│  Seeker Pages│Employer Pages│   Auth / Onboarding    │
│  / (landing) │  /jobs       │  /dashboard/ │   /onboarding/seeker   │
│  /jobs/:id   │  /jobs/:id   │    employer  │   /onboarding/employer │
│  /employers/ │  /dashboard/ │  /employers/ │                        │
│     :id      │    seeker    │     :id      │                        │
└──────┬───────┴──────┬───────┴──────┬───────┴───────────┬────────────┘
       │              │              │                   │
       ▼              ▼              ▼                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     REACT APPLICATION LAYER                          │
├──────────────┬──────────────┬──────────────┬────────────────────────┤
│  UI Layer    │  State Layer │  Data Layer  │   Service Layer        │
│  Pages/      │  React Query │  Supabase    │   stripeService.ts     │
│  Components/ │  (server     │  client SDK  │   claudeService.ts     │
│  Design      │  state) +    │  (typed      │   matchService.ts      │
│  System      │  useState    │  queries)    │   emailService.ts      │
│              │  (local UI)  │              │                        │
└──────┬───────┴──────┬───────┴──────┬───────┴───────────┬────────────┘
       │              │              │                   │
       ▼              ▼              ▼                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SUPABASE BACKEND LAYER                          │
├──────────────┬──────────────┬──────────────┬────────────────────────┤
│  PostgreSQL  │  Auth        │  Storage     │   Edge Functions       │
│  (12 tables, │  (email/     │  (documents, │   match-recalculate    │
│  RLS on all) │   password)  │   farm photos│   stripe-webhook       │
│              │              │   CVs)       │   placement-followup   │
│              │              │              │   nightly-batch        │
└──────┬───────┴──────────────┴──────────────┴────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                               │
├──────────────┬──────────────┬─────────────────────────────────────  │
│  Stripe      │  Claude API  │  Resend (email)                       │
│  PaymentInt. │  claude-     │  Transactional emails:                │
│  Invoices    │  sonnet-4-   │  - Day 7 placement follow-up          │
│  Webhooks    │  20250514    │  - Day 14 placement follow-up         │
│              │  Match       │  - Job alert emails                   │
│              │  explanations│  - Verification OTPs (via Supabase)  │
└──────────────┴──────────────┴───────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Pages | Route-level components, data fetching orchestration, layout | React components in `src/pages/` — one file per route |
| Design System | Reusable UI primitives (Button, Card, Tag, MatchCircle, Input, Toggle, InfoBox) | `src/components/ui/` — stateless, prop-driven |
| Feature Components | Business-logic components assembled from design system primitives | `src/components/features/` grouped by domain |
| Supabase Client | Typed query layer, auth session, realtime subscriptions | Singleton in `src/lib/supabase.ts` with generated types |
| React Query | Server state management — caching, background refresh, optimistic updates | Query hooks in `src/hooks/` — one hook per data domain |
| Service Layer | Isolates external API calls (Stripe, Claude, Resend) from UI | `src/services/` — each service is a typed module |
| Edge Functions | Server-side logic: Stripe webhooks, match recalculation, scheduled jobs | Supabase Edge Functions (Deno) in `supabase/functions/` |
| RLS Policies | Access control — enforces data isolation at database level | SQL policies in `supabase/migrations/` |
| Match Engine | PostgreSQL function computing 100-point weighted scores | `supabase/functions/match-score.sql` or PG stored proc |

---

## Recommended Project Structure

```
topfarms/
├── src/
│   ├── pages/                    # Route-level components
│   │   ├── Landing.tsx           # / — public landing page
│   │   ├── jobs/
│   │   │   ├── JobSearch.tsx     # /jobs — filter, search, ranked results
│   │   │   └── JobDetail.tsx     # /jobs/:id — two states (seeker / visitor)
│   │   ├── employers/
│   │   │   └── EmployerProfile.tsx  # /employers/:id — public farm profile
│   │   ├── dashboard/
│   │   │   ├── EmployerDashboard.tsx   # /dashboard/employer — applicant mgmt
│   │   │   └── SeekerDashboard.tsx     # /dashboard/seeker — application tracking
│   │   └── onboarding/
│   │       ├── EmployerOnboarding.tsx  # /onboarding/employer — 8-step wizard
│   │       └── SeekerOnboarding.tsx    # /onboarding/seeker — 8-step wizard
│   │
│   ├── components/
│   │   ├── ui/                   # Design system primitives (stateless)
│   │   │   ├── Button.tsx        # 4 variants: primary, outline, ghost, hay
│   │   │   ├── Card.tsx          # Standard card with border/radius
│   │   │   ├── Tag.tsx           # 7 colour variants
│   │   │   ├── MatchCircle.tsx   # Score circle — 3 sizes × 3 colour states
│   │   │   ├── InfoBox.tsx       # 5 variants: blue, hay, green, purple, red
│   │   │   ├── Input.tsx         # Fern focus ring, fog border
│   │   │   ├── Toggle.tsx        # 34x18px pill switch
│   │   │   └── ProgressBar.tsx   # Gradient 3px bar for wizards
│   │   │
│   │   ├── features/             # Business-logic assembled components
│   │   │   ├── jobs/
│   │   │   │   ├── JobCard.tsx           # Default / featured / new-post variants
│   │   │   │   ├── JobCardExpanded.tsx   # Details / My Match / Apply tabs
│   │   │   │   ├── FilterSidebar.tsx     # 280px sticky desktop, drawer mobile
│   │   │   │   └── MatchBreakdown.tsx    # Per-dimension bars + AI insight
│   │   │   ├── employer/
│   │   │   │   ├── ApplicantCard.tsx     # Ranked candidate row, expandable panels
│   │   │   │   ├── PlacementFeeModal.tsx # Acknowledgement gate
│   │   │   │   ├── LivePreviewSidebar.tsx # Job posting wizard preview
│   │   │   │   └── VerificationLadder.tsx # 5-tier verification UI
│   │   │   ├── seeker/
│   │   │   │   ├── ApplicationCard.tsx   # Pipeline stage variants
│   │   │   │   ├── SkillChips.tsx        # Proficiency + willing-to-learn
│   │   │   │   └── ProfileStrength.tsx   # Completeness nudge
│   │   │   └── shared/
│   │   │       ├── WizardShell.tsx       # Progress bar, step dots, nav
│   │   │       └── StripePayment.tsx     # PaymentElement wrapper
│   │   │
│   │   └── layout/
│   │       ├── Nav.tsx           # Soil 56px sticky, auth-aware
│   │       └── Footer.tsx        # 4-column soil-deep footer
│   │
│   ├── hooks/                    # React Query hooks — one per data domain
│   │   ├── useJobs.ts            # Job search, job detail queries
│   │   ├── useMatchScores.ts     # Match score reads (pre-computed)
│   │   ├── useApplications.ts    # Application CRUD, status updates
│   │   ├── useEmployerProfile.ts # Employer profile read/write
│   │   ├── useSeekerProfile.ts   # Seeker profile read/write
│   │   └── useAuth.ts            # Auth session, user type, sign-in/out
│   │
│   ├── services/                 # External API wrappers
│   │   ├── stripe.ts             # PaymentIntent, Checkout Session helpers
│   │   ├── claude.ts             # Match explanation API calls
│   │   └── email.ts             # Resend transactional email (via Edge Function)
│   │
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client singleton + Database type import
│   │   └── constants.ts          # Region adjacency matrix, salary floors, skill weights
│   │
│   └── types/
│       ├── database.types.ts     # Auto-generated by Supabase CLI
│       └── domain.ts             # Application-level types (MatchBreakdown, etc.)
│
├── supabase/
│   ├── migrations/               # All schema changes as SQL files
│   │   ├── 001_initial_schema.sql   # 12 tables + indexes
│   │   ├── 002_rls_policies.sql     # RLS on all tables
│   │   └── 003_match_function.sql   # match_score() stored procedure
│   │
│   └── functions/                # Edge Functions (Deno)
│       ├── stripe-webhook/       # Confirms payments → activates listings
│       ├── match-recalculate/    # Triggered by job/seeker update
│       ├── nightly-batch/        # Full recalculation for data integrity
│       └── placement-followup/   # Day 7 + Day 14 emails via Resend
│
├── tailwind.config.ts            # All CSS custom properties as Tailwind tokens
└── vite.config.ts
```

### Structure Rationale

- **`src/components/ui/`:** Stateless primitives must be isolated so the design system can be implemented once and consumed everywhere without business logic leaking into atoms.
- **`src/components/features/`:** Domain-grouped feature components prevent circular imports and make it obvious which files to open when working on employer vs seeker flows.
- **`src/hooks/`:** All Supabase queries live in hooks, not in components. This enables React Query caching and prevents duplicate network calls across the component tree.
- **`src/services/`:** External APIs (Stripe, Claude) must never be called directly from components. The service layer provides typed interfaces that can be stubbed in tests.
- **`supabase/migrations/`:** SQL migrations are version-controlled and applied in order. RLS lives in migrations, not in application code — data-layer security cannot be bypassed by frontend bugs.
- **`supabase/functions/`:** Any code that needs a secret (Stripe secret key, Claude API key) runs in Edge Functions, not in the browser.

---

## Architectural Patterns

### Pattern 1: Pre-Computed Match Scores (Read-Heavy Optimisation)

**What:** Match scores are computed and stored in the `match_scores` table when data changes, not at query time. Search queries join against pre-computed scores rather than executing the scoring algorithm live.

**When to use:** Any query that would otherwise compute expensive weighted joins across `jobs`, `seeker_profiles`, `seeker_skills`, and `job_skills` at request time. The NZ ag market is small enough that full recalculation on trigger (all seekers × one job, or one seeker × all active jobs) completes in <60 seconds.

**Trade-offs:** Scores can be momentarily stale after a profile update (maximum lag = recalculation trigger time, target <60s). This is acceptable — search is fast, staleness is brief.

**Example:**
```typescript
// hooks/useJobs.ts — read pre-computed scores, never compute in client
const { data } = useQuery({
  queryKey: ['jobs', filters, seekerId],
  queryFn: () =>
    supabase
      .from('jobs')
      .select(`
        *,
        employer_profiles!jobs_employer_id_fkey(farm_name, verification_tier),
        match_scores!match_scores_job_id_fkey(total_score, breakdown)
      `)
      .eq('status', 'active')
      .eq('match_scores.seeker_id', seekerId)
      .order('match_scores.total_score', { ascending: false })
})
```

### Pattern 2: RLS as the Primary Security Boundary

**What:** Contact masking, cross-user data isolation, and placement fee gating are enforced at the PostgreSQL RLS level, not in React or API route logic. No amount of frontend manipulation can expose masked data.

**When to use:** Any field that must be conditionally visible based on user identity or business state. Specifically: seeker phone/email masked until `placement_fees.acknowledged_at` is set for the relevant job/seeker pair.

**Trade-offs:** RLS policies must be tested as SQL, not in React tests. Requires discipline to write policies correctly. The payoff is that the security model cannot be bypassed by a frontend bug.

**Example:**
```sql
-- supabase/migrations/002_rls_policies.sql
-- Seekers can only read their own contact fields
-- Employers can read contact fields only after placement fee acknowledgement
CREATE POLICY "seeker_contact_masking" ON seeker_profiles
  FOR SELECT
  USING (
    auth.uid() = user_id  -- seeker reads own record always
    OR
    EXISTS (
      SELECT 1 FROM placement_fees pf
      JOIN applications a ON a.id = pf.application_id
      JOIN jobs j ON j.id = a.job_id
      JOIN employer_profiles ep ON ep.id = j.employer_id
      WHERE ep.user_id = auth.uid()
        AND a.seeker_id = seeker_profiles.id
        AND pf.acknowledged_at IS NOT NULL
    )
  );
```

### Pattern 3: Edge Functions for All Secret-Key Operations

**What:** Stripe webhook processing, Claude API calls for bulk match explanations, and Resend email sending all happen in Supabase Edge Functions (Deno runtime). The React client never holds Stripe secret keys or Claude API keys.

**When to use:** Whenever the operation requires a secret key, needs to run on a schedule, or must be triggered by a database event (Supabase Database Webhooks → Edge Function).

**Trade-offs:** Edge Functions add latency for AI insight generation (~1–3s for Claude). Mitigate by generating explanations asynchronously: match score is shown immediately, AI text loads 1–2 seconds later.

**Example:**
```typescript
// supabase/functions/match-recalculate/index.ts
// Triggered by database webhook when job or seeker_profile updates
Deno.serve(async (req) => {
  const { job_id, seeker_id, trigger_type } = await req.json()

  if (trigger_type === 'job_updated') {
    // Recalculate for all active seekers whose sector matches this job
    await recalculateForJob(job_id)
  } else if (trigger_type === 'seeker_updated') {
    // Recalculate for all active jobs matching seeker's sector preferences
    await recalculateForSeeker(seeker_id)
  }

  return new Response(JSON.stringify({ status: 'ok' }))
})
```

### Pattern 4: Multi-Step Wizard with Persistent Draft State

**What:** Both employer onboarding (8 screens) and job posting (7 screens) are multi-step wizards. Each step writes incrementally to the database as a draft, so browser refreshes or navigation away don't lose data. The wizard shell handles progress state; each step is a dumb form that reads/writes one logical section.

**When to use:** Any wizard longer than 3 steps where losing form state would be frustrating. At 7–8 steps, in-browser state alone (useState) is too fragile.

**Trade-offs:** More database writes during onboarding. Drafts must be cleaned up if not completed (nightly job or expiry timestamp). Adds `status: 'draft'` requirement to jobs table (already in schema).

**Example:**
```typescript
// components/features/employer/WizardShell.tsx
// Parent orchestrates step rendering; each step auto-saves on blur/next
const WizardShell = ({ steps, entityId }: WizardProps) => {
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = async (stepData: Partial<EmployerProfile>) => {
    // Upsert draft data immediately — don't wait for wizard completion
    await supabase.from('employer_profiles').upsert({ id: entityId, ...stepData })
    setCurrentStep(prev => prev + 1)
  }

  return (
    <div>
      <ProgressBar current={currentStep + 1} total={steps.length} />
      {steps[currentStep].component({ onNext: handleNext })}
    </div>
  )
}
```

### Pattern 5: Stripe Webhook → Database State Machine

**What:** Listing status transitions are driven by Stripe webhook events, not by client-side confirmation. The client calls `stripe.createPaymentIntent()`, Stripe fires a webhook to the Edge Function, and the Edge Function sets `jobs.status = 'active'` and creates the `listing_fees` row. This prevents listings going live without confirmed payment.

**When to use:** Any state transition that depends on external payment confirmation. This pattern prevents the race condition where a slow network causes a user to think they've paid when they haven't.

**Trade-offs:** Adds async delay (~2–5s) between Stripe payment confirmation and listing activation. Show a "Processing..." state in the UI. Stripe webhooks require correct endpoint secret configuration in production.

---

## Data Flow

### Request Flow — Job Search (Most Critical Path)

```
Seeker types filter selections
    ↓
FilterSidebar component updates URL search params
    ↓
useJobs hook re-runs (React Query cache-aware)
    ↓
Supabase query: jobs + employer_profiles + match_scores
    WHERE status = 'active' AND sector matches
    AND match_scores.seeker_id = current_user
    ORDER BY match_scores.total_score DESC
    ↓
RLS validates: authenticated seeker can read active jobs
    ↓
Results returned (pre-computed scores — target <1.5s)
    ↓
JobCard components render with MatchCircle colour-coded
    ↓
[On expand to "My Match" tab]
    ↓
Claude Edge Function called with match_scores.breakdown jsonb
    ↓
2–3 sentence AI explanation returned and displayed
```

### Request Flow — Shortlist + Contact Release (Revenue Critical Path)

```
Employer clicks "Shortlist" on ApplicantCard
    ↓
PlacementFeeModal renders — employer must confirm
    ↓
On "I understand" click:
    ↓
placement_fees row written (acknowledged_at = now())
    ↓
RLS policy on seeker_profiles now allows employer to read
  phone and email for this seeker/job pair
    ↓
Contact details visible in dashboard
    ↓
[Async] Day 7 + Day 14 Edge Functions scheduled
  via pg_cron or Supabase scheduled functions
    ↓
[Later] Employer clicks "Confirm hire"
    ↓
placement_fees.confirmed_at written
    ↓
Stripe Invoice created via Edge Function
```

### Request Flow — Match Score Recalculation

```
Employer updates job (or seeker updates profile)
    ↓
Supabase Database Webhook fires
    ↓
match-recalculate Edge Function invoked
    ↓
PostgreSQL match_score() stored procedure runs:
  SELECT all active seekers (or jobs) in matching sector
  FOR EACH: compute 8-dimension weighted score
  UPSERT into match_scores table
    ↓
Recalculation complete (target: <60 seconds)
    ↓
[Parallel] Nightly batch Edge Function re-runs all scores
  for data integrity (catches any missed triggers)
```

### State Management

```
Supabase (source of truth)
    ↓ (React Query fetch)
useQuery hooks (server state cache)
    ↓ (component subscription)
Page components receive data
    ↓
Feature components receive via props
    ↓
UI primitives render

Local state (useState) → wizard step progress, modal open/close, filter sidebar open
Server state (React Query) → all Supabase data
No global client state store needed (no Redux/Zustand) — React Query + URL params handle all coordination
```

### Key Data Flows

1. **Profile → Match Scores:** Seeker profile update triggers recalculation of `match_scores` for all active jobs matching `sector_pref`. This is the trigger for ranked search to reflect updated seeker data.
2. **Stripe Webhook → Job Activation:** Payment confirmed → Edge Function → `jobs.status = 'active'` → listing appears in search results. Stripe is the authority, not the client.
3. **Shortlist Acknowledgement → Contact Visibility:** `placement_fees.acknowledged_at` written → RLS policy change → phone/email readable. The database row controls visibility, not UI state.
4. **Hire Confirmation → Invoice:** `placement_fees.confirmed_at` → Edge Function → Stripe Invoice created and emailed to employer.
5. **Filter Selection → URL Params → Query:** Filter state lives in URL, not component state, so links are shareable and browser back/forward work correctly.

---

## Component Boundaries (What Talks to What)

| Component | Communicates With | Direction |
|-----------|-------------------|-----------|
| React pages | Supabase client (via hooks) | Page reads/writes data through hooks only |
| React pages | Service layer | Page calls stripe.ts, claude.ts via services |
| Feature components | React Query hooks (via props or direct hook call) | Components read server state from hooks |
| Feature components | UI primitives | One-way: features compose primitives |
| Supabase client | PostgreSQL (via RLS) | All queries filtered by auth.uid() automatically |
| Edge Functions | Stripe API | Uses Stripe secret key, never in browser |
| Edge Functions | Claude API | Uses Claude API key, never in browser |
| Edge Functions | Resend API | Sends transactional email with templates |
| Edge Functions | PostgreSQL | Direct DB access via service_role key |
| Stripe | Edge Function (stripe-webhook) | Stripe POSTs to Edge Function endpoint |

**Hard rules:**
- React components NEVER call Stripe secret key operations directly
- React components NEVER call Claude API directly (API key would be exposed)
- Contact details are NEVER fetched without RLS validation — there is no admin bypass in client code
- All database mutations go through the typed Supabase client — no raw SQL from the frontend

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–1k users | Current architecture is correct. Supabase free tier handles this. Match recalculation batch is small enough to run in a single Edge Function invocation. |
| 1k–10k users | Add Supabase connection pooling (PgBouncer — built into Supabase). Consider caching match_scores reads in Redis or Supabase Realtime for hot jobs. Index `match_scores.total_score` for sort performance. |
| 10k–100k users | Match recalculation must be chunked (batch seekers in pages of 500). Consider background queue (Supabase Queue or external). Claude AI insights become expensive — cache per job/seeker pair. |
| 100k+ users | Not in scope for TopFarms MVP. NZ agriculture market caps well below this. |

### Scaling Priorities

1. **First bottleneck: match recalculation volume.** As seeker count grows, "seeker profile updated → recalculate all active jobs" becomes expensive. Fix: implement incremental scoring and chunked background jobs before this becomes a problem (rough threshold: >5,000 active seekers).
2. **Second bottleneck: Claude API costs.** At scale, generating AI explanations for every match combination becomes expensive. Cache in `match_scores.explanation` column. Regenerate only when `breakdown` jsonb changes.

---

## Anti-Patterns

### Anti-Pattern 1: Contact Fields Masked in CSS Only

**What people do:** Blur or hide contact details with CSS/JavaScript and rely on the frontend to enforce the placement fee gate.

**Why it's wrong:** Any developer can inspect the DOM, disable JavaScript, or call the Supabase API directly and retrieve the raw data. The masking is trivially bypassed.

**Do this instead:** Enforce contact field access in the RLS policy. The `seeker_profiles` select policy must check for `placement_fees.acknowledged_at` before returning phone/email columns. Use a Supabase security definer function or column-level security to return NULL for masked fields.

### Anti-Pattern 2: Computing Match Scores at Query Time

**What people do:** Join `seeker_skills`, `job_skills`, `seeker_profiles`, and `jobs` on every search request and compute the weighted score in the query.

**Why it's wrong:** A job search with 500 active jobs and a seeker with 15 skills would compute 500 × 15 skill comparisons + 500 × 8 dimension calculations on every page load. This violates the <1.5s search target.

**Do this instead:** Pre-compute and store in `match_scores`. Trigger recalculation on data change events (job update, seeker profile update). The SPEC's decision here is correct — implement it exactly as specified.

### Anti-Pattern 3: Stripe Secret Key in React Environment Variables

**What people do:** Put the Stripe secret key in `VITE_STRIPE_SECRET_KEY` to make server-side Stripe calls from the client.

**Why it's wrong:** Vite environment variables prefixed with `VITE_` are bundled into the JavaScript payload. The secret key is publicly readable in the browser.

**Do this instead:** All Stripe secret key operations (creating PaymentIntents server-side, creating invoices, processing webhooks) run in Supabase Edge Functions. The client only uses the publishable key (`VITE_STRIPE_PUBLISHABLE_KEY`) and the Stripe.js library to collect card details.

### Anti-Pattern 4: Wizard State in React Only (No Draft Persistence)

**What people do:** Use `useState` or a context to hold 8 wizard steps of form data. If the user refreshes or navigates away, all data is lost.

**Why it's wrong:** An 8-step employer onboarding wizard with farm details, accommodation toggles, and verification steps represents significant user effort. Losing this on a browser refresh creates real friction and churn.

**Do this instead:** Upsert draft data to `employer_profiles` (or `jobs` with `status: 'draft'`) on each "Next" click. On wizard load, query for an existing draft and pre-populate. This also supports returning users who started but didn't finish.

### Anti-Pattern 5: Filter State in React State Only

**What people do:** Store job search filters in `useState` inside the FilterSidebar component.

**Why it's wrong:** Users cannot bookmark filtered search results. The browser back button doesn't restore filters. Sharing a search URL requires additional work. Filter state is reset on any navigation.

**Do this instead:** Sync filter state with URL search parameters (`?region=waikato&shed_type=rotary`). React Query key includes URL params. `useSearchParams` from React Router reads and writes filter state. Users can bookmark, share, and navigate with correct state.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Stripe | PaymentElement (client) + Edge Function (server) | Client uses publishable key only. Edge Function holds secret key. Webhooks must be verified with `stripe.webhooks.constructEvent()`. |
| Claude API | Edge Function only | Never called from client. Pass `match_scores.breakdown` jsonb to generate 2–3 sentence explanations. Cache result in `match_scores.explanation` column. |
| Resend | Edge Function only | React Email templates for placement follow-ups and job alerts. Triggered via Supabase scheduled functions or database webhooks. |
| Supabase Auth | Client SDK (`supabase.auth`) | Email/password only for MVP. User type (employer/seeker) stored in `user_metadata` at signup. |
| Supabase Storage | Client SDK for upload, Edge Function for admin review notifications | Documents, farm photos, CVs stored in Supabase Storage buckets with appropriate access policies. |
| Vercel | CI/CD via GitHub integration | Edge Functions live in `supabase/functions/`, not Vercel's runtime — do not confuse the two. Frontend deploys to Vercel CDN. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| React pages ↔ Supabase | React Query hooks wrapping Supabase JS SDK | Never call `supabase` directly in components — always through a hook |
| React ↔ Stripe | Stripe.js PaymentElement + fetch to Edge Function | Client creates PaymentIntent via Edge Function, not directly |
| Edge Function ↔ Database | Supabase service_role key | Full access — RLS bypassed for server operations. Use carefully. |
| Job search page ↔ Filter sidebar | URL search params | Single source of truth for filter state — no prop drilling or context |
| Employer dashboard ↔ Placement gate | Modal component + `applications` status mutation | Modal fires before any contact data is queried — avoid fetching then hiding |

---

## Suggested Build Order (Dependencies)

The SPEC's milestone order reflects correct dependency sequencing. The architectural rationale:

1. **Foundation first (Milestone 1):** Schema + RLS + auth + design system. Nothing else is buildable without the database schema and security policies. Design system must be built before any screen. This is not negotiable.

2. **Employer supply side (Milestone 2):** Employers create jobs before seekers can search them. The job posting wizard + Stripe integration + job detail page form the supply side. Build the full employer flow so there is data to search.

3. **Seeker demand side (Milestone 3):** Seeker onboarding + job search + application. Depends on jobs existing (Milestone 2). Match scores are consumed here but can be stubbed with a simple calculation until Milestone 4.

4. **Match engine (Milestone 4):** Depends on both employer jobs (Milestone 2) and seeker profiles (Milestone 3) existing. The scoring function and recalculation triggers are refinements to what Milestone 3 stubbed.

5. **Revenue + verification (Milestone 5):** Depends on the full match pipeline (Milestone 4) because shortlisting (the placement fee trigger) happens in the ranked applicant dashboard. Stripe webhooks, RLS contact masking, and verification tiers are all isolated to this milestone.

6. **Polish + launch (Milestone 6):** Landing page, mobile QA, E2E tests, production deployment. Depends on all prior milestones being functionally complete.

**Build order principle:** Each milestone delivers a working vertical slice. Never build a layer (e.g., all database tables) separately from the feature that uses it — build schema + feature + RLS together per milestone.

---

## Sources

- SPEC.md v3.0 (authoritative): database schema, RLS requirements, match scoring algorithm, Stripe integration points, milestone breakdown — HIGH confidence
- Supabase documentation (pattern validation): RLS policies, Edge Functions, Storage — HIGH confidence (well-established platform)
- React Query documentation: server state patterns for Supabase — HIGH confidence (standard pattern)
- Stripe documentation: PaymentElement, webhook verification pattern — HIGH confidence (official Stripe docs pattern)
- Pattern confidence notes:
  - Pre-computed match scores: HIGH — explicitly specified in SPEC, correct for <1.5s search target
  - RLS contact masking: HIGH — specified in SPEC Section 13.2, correct architecture
  - URL-param filter state: MEDIUM — standard React Router pattern, validated against React Router v6 conventions
  - Wizard draft persistence: MEDIUM — standard UX practice, not explicitly specified but implied by 8-step wizard complexity

---

*Architecture research for: NZ agricultural job marketplace (TopFarms)*
*Researched: 2026-03-15*
