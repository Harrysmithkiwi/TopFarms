# Pitfalls Research

**Domain:** NZ agricultural job marketplace (two-sided: employer + seeker)
**Researched:** 2026-03-15
**Confidence:** MEDIUM — external search tools unavailable; findings based on Supabase/Stripe official documentation knowledge (training cutoff August 2025) plus two-sided marketplace patterns verified across multiple authoritative sources. Flagged per-section.

---

## Critical Pitfalls

### Pitfall 1: RLS Policies That Pass the Anon Test But Expose Data Between Authenticated Users

**What goes wrong:**
Developers write RLS policies to block unauthenticated access and declare the table "secured." The policy correctly uses `auth.uid()` but only checks ownership — not role. A seeker can query `employer_profiles` for any employer by ID, and an employer can query `seeker_profiles` for any seeker by ID, because both are authenticated users. The `contact masking` requirement (seeker contact details hidden until placement fee acknowledged) fails silently: RLS allows the employer to read the full `seeker_profiles` row including `email` and phone because "employer is authenticated."

**Why it happens:**
Supabase's RLS mental model defaults to "my rows vs not my rows." Developers think "authenticated = safe." They don't model cross-role data access — an employer IS authenticated and SHOULD see seeker profiles in search, but NOT see contact details. This requires attribute-level masking, not row-level, which RLS cannot do natively.

**How to avoid:**
- Contact details (`email`, phone) must NEVER live in `seeker_profiles` directly. Store them in a separate `seeker_contacts` table with its own RLS policy that only allows SELECT if a `placement_fees.acknowledged_at` record exists for that employer+seeker pair.
- Alternatively, use Supabase Edge Functions as the data layer for contact release — the function checks placement fee acknowledgement then returns contact data. Never rely on the frontend to "mask" a field that exists in a row the user can already SELECT.
- For `seeker_profiles` visibility: policy should allow employers to SELECT seekers who are `open_to_work = true` but the contact details table requires the placement fee gate.

**Warning signs:**
- Frontend code that "hides" a field with CSS or conditional rendering instead of the field not being present in the API response
- A seeker's email appearing in any Supabase query response that an employer can run without a placement fee record
- RLS test suite only tests `anon` role, not cross-authenticated-role access

**Phase to address:** Database schema phase (first phase). Cannot retrofit RLS after data model is set without migrations touching every table. Decide the contact separation pattern before writing any table DDL.

---

### Pitfall 2: Match Score Staleness — Pre-Computed Scores That Are Never Invalidated

**What goes wrong:**
The SPEC correctly identifies pre-computed match scores as the architecture (instant search results). The `match_scores` table is populated on job creation and on seeker profile save. But when an employer edits a job posting (changes shed type, salary, accommodation), or a seeker updates their profile (changes visa status, adds a skill), the existing `match_scores` rows for those entities are stale. The seeker sees a 94% match on a job whose requirements they no longer meet. The employer sees a ranked pool that doesn't reflect the seeker's updated skills.

**Why it happens:**
The initial computation path is obvious (create job → compute scores). The invalidation path is non-obvious and gets deferred as "edge case" during MVP. NZ ag hires are seasonal — seekers update their profiles frequently as their situation changes. Profile edits are common, not edge cases.

**How to avoid:**
- Treat `match_scores` as a materialized view, not a write-once table. Add `updated_at` to every score row.
- Use Supabase database triggers on `jobs`, `seeker_profiles`, `seeker_skills`, and `job_skills` to mark affected `match_scores` rows as `stale = true` (add this boolean column) rather than recomputing inline.
- Run a scheduled Edge Function (every 60 seconds or via `pg_cron`) to recompute stale scores in batches. The SPEC's `<60s recalculation` target means this batch process must complete within 60 seconds.
- Never recompute scores synchronously in a user-facing request path — will block the 1.5s search target.

**Warning signs:**
- No database triggers on `jobs` or `seeker_profiles` update events
- Match scores computed only in Edge Functions called during POST, not on PATCH/PUT
- `match_scores.calculated_at` timestamp matches job creation date, not last profile edit date
- Seeker updates their visa status and the search results don't change

**Phase to address:** Match scoring engine phase. Must design staleness handling before writing any scoring logic — retrofitting invalidation into a working scorer is a full rewrite of the trigger chain.

---

### Pitfall 3: Supabase RLS Infinite Recursion via Self-Referencing Policies

**What goes wrong:**
A policy on `employer_profiles` references `applications` to check whether an employer has access. A policy on `applications` references `employer_profiles` to validate the employer. Supabase (PostgreSQL) evaluates both policies and enters infinite recursion, crashing queries with `ERROR: infinite recursion detected in policy for relation`. This is a real, documented PostgreSQL RLS failure mode that has surprised many Supabase developers.

**Why it happens:**
Job marketplace schemas are circular by nature: jobs belong to employers, applications reference jobs and seekers, match scores reference both. When RLS policies cross-reference tables to validate access, they create policy evaluation cycles.

**How to avoid:**
- Use `security definer` functions to break recursion. A `get_employer_id_for_user()` function with `security definer` reads `employer_profiles` bypassing RLS and returns the ID safely, then the policy on `applications` can call this function without triggering recursive policy evaluation.
- Maintain a single source of truth: store `user_id` and `role` (employer/seeker) in a `profiles` table that is accessed by all other policies. Policies read from `profiles` to determine role without needing to join back to the table being protected.
- Test every policy in isolation using `SET ROLE` in psql before deploying.

**Warning signs:**
- Policy definitions that JOIN to more than one table
- `USING` clauses that reference the same table they're protecting
- Queries hanging or returning `ERROR: infinite recursion` in development
- Policies that call subqueries on tables that themselves have RLS policies referencing the outer table

**Phase to address:** Database schema phase. Write and test all RLS policies before writing any application code.

---

### Pitfall 4: Stripe Webhooks Processed Without Idempotency — Double Job Activations and Double Fee Acknowledgements

**What goes wrong:**
Stripe delivers `payment_intent.succeeded` webhooks with at-least-once guarantees. If your Edge Function takes >5 seconds (Supabase Edge Function cold start + database write), Stripe retries the webhook. Without idempotency checks, the Edge Function activates the job listing twice, creates two `listing_fees` rows for one payment, or acknowledges a placement fee twice. On retry, the employer sees two "Payment received" emails and the job appears twice in the admin queue.

**Why it happens:**
Developers test Stripe locally with the CLI which delivers each event once. Production Stripe delivers duplicates on retries and network errors. The retry window can be hours — long after the developer forgets the original event. The Stripe testing environment (`--webhook-cli-path`) doesn't simulate retries by default.

**How to avoid:**
- Every webhook handler must begin with: check `stripe_payment_id` in `listing_fees` — if it already exists, return HTTP 200 immediately without processing.
- Use a unique constraint: `UNIQUE (stripe_payment_id)` on `listing_fees.stripe_payment_id` and `placement_fees.stripe_invoice_id`. The database will reject duplicate inserts at the constraint level as a safety net.
- For the `first listing free` logic: track first-listing eligibility in `employer_profiles.first_listing_used` (boolean). The webhook should set this atomically in a transaction with the job activation.
- Log every webhook receipt with its Stripe event ID for debugging.

**Warning signs:**
- Edge Function handler has no `stripe_payment_id` lookup at the top
- No UNIQUE constraint on `listing_fees.stripe_payment_id`
- Testing was done exclusively with local Stripe CLI without simulating retry scenarios
- "First listing free" logic lives only in frontend code, not enforced in the webhook handler

**Phase to address:** Stripe integration phase. Add idempotency before writing any payment flow logic — it is not a "nice to have" to add later.

---

### Pitfall 5: Multi-Role Auth Confusion — User Type Stored in Metadata, Not Enforced at Database Level

**What goes wrong:**
At signup, the user selects "Employer" or "Seeker." The role is stored in `auth.users.raw_user_meta_data.user_type`. Frontend routes check this metadata to show the employer dashboard or seeker dashboard. But RLS policies don't verify role — they check `auth.uid()` ownership. An employer who modifies their JWT metadata client-side (or via Supabase API calls) can access seeker-only endpoints. More commonly: a user signs up as a seeker, decides they want to be an employer, and creates an `employer_profiles` row alongside an existing `seeker_profiles` row. The application code doesn't expect dual-profile users and breaks silently.

**Why it happens:**
Supabase Auth stores user metadata in the JWT, which feels like the natural place for "user type." RLS policies see `auth.uid()` but not `auth.jwt()->>'user_type'` unless explicitly written. The frontend gate (show employer dashboard) is not the same as the database gate (allow INSERT to employer_profiles).

**How to avoid:**
- Create a `user_roles` table (user_id, role: `'employer'|'seeker'|'admin'`, created_at) with a UNIQUE constraint on `(user_id, role)`.
- RLS policies read `user_roles` to determine what actions are permitted: `SELECT role FROM user_roles WHERE user_id = auth.uid()`.
- Enforce one-role-per-user at the application level with a CHECK constraint or trigger on `user_roles` that prevents a user from having both 'employer' and 'seeker' roles simultaneously — unless dual-role is an explicit product decision.
- Never rely on JWT metadata for security enforcement. Use it only for frontend routing hints, never as the database access gate.
- The admin role (`user_roles.role = 'admin'`) must be set server-side only (Edge Function or direct DB access) — never from client.

**Warning signs:**
- RLS policies use `auth.jwt()->'user_meta_data'->>'user_type'` for access control
- No `user_roles` table exists — role is only in auth metadata
- A user can successfully INSERT to both `employer_profiles` and `seeker_profiles` tables simultaneously
- Admin access controlled by a client-readable metadata field

**Phase to address:** Authentication phase (phase 1 of any roadmap). User role architecture must be correct before any profile or listing table is created.

---

### Pitfall 6: Contact Masking at CSS/Frontend Level Instead of Data Layer

**What goes wrong:**
The SPEC correctly specifies "contact masking via RLS until placement fee confirmed." Teams implement this by fetching the full `seeker_profiles` row (including email and phone) and showing a "Contact details locked" overlay in CSS. The data is in the browser's network tab. A motivated employer can open DevTools → Network → Response and copy the seeker's email without paying the placement fee. For a platform whose revenue model depends on placement fee integrity, this is a critical business risk.

**Why it happens:**
Frontend masking is fast to implement. Developers think "the UI gate is sufficient" and don't realize the data is in the response payload. This is the most common marketplace security mistake: treating the UI as the security layer.

**How to avoid:**
- Contact details must not exist in tables that employers can SELECT directly. Use a separate `seeker_contacts` table (user_id, email, phone) with RLS: `SELECT allowed WHERE EXISTS (SELECT 1 FROM placement_fees WHERE employer_id = auth.uid() AND seeker_id = [target] AND acknowledged_at IS NOT NULL)`.
- Alternatively: never expose contact details via Supabase client directly. Use an Edge Function `release-contact` that verifies placement fee acknowledgement server-side before returning contact data.
- Verify with Supabase's built-in `anon` and `authenticated` role testing — log in as an employer without a placement fee record and attempt to query the seeker's contact details. The query should return no rows or empty contact fields.

**Warning signs:**
- `seeker_profiles` table contains `email` column (email lives in `auth.users` — seeker_profiles should only contain ag-specific fields)
- A raw Supabase SELECT on `seeker_profiles` from an employer session returns any contact information
- Frontend "masking" achieved with CSS class toggling or conditional rendering of a field that exists in the response JSON

**Phase to address:** Database schema phase. Design the contact separation architecture before writing the first migration.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing role in JWT metadata only | No extra table needed | Role enforcement gaps; role-change flows are complex; audit trail missing | Never — `user_roles` table takes 10 minutes to add |
| Skipping RLS on `match_scores` table | Faster query setup | Any authenticated user can see any match score for any seeker/job pair | Never — seeker match breakdowns are private data |
| Computing match scores in real-time on search query | No background job complexity | Search takes 5-10 seconds at 100 concurrent seekers; breaks 1.5s SLA | Never for production; acceptable for a single dev testing session only |
| Using Stripe client-side only (no webhook handler) | Faster integration | Payment confirmation can be spoofed; job never activates on payment failure | Never — webhooks are mandatory for production Stripe |
| Hardcoding `first listing free` in frontend only | Quick to ship | Employer who inspects code can call Supabase directly to activate jobs without payment | Never — enforce server-side in Edge Function |
| Skipping `unique` constraint on `stripe_payment_id` | One less migration line | Double-processing webhooks creates duplicate records and revenue leakage | Never |
| Flat JSON blob for match score breakdown instead of typed breakdown columns | Faster schema iteration | Cannot query "all seekers who scored >15 on shed type" for analytics | Acceptable for MVP; add typed columns in growth phase |
| No staleness flag on `match_scores` | Simpler initial implementation | Scores go stale silently with no recovery path except full recompute | Never — add `stale` boolean in initial migration |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase RLS | Writing `auth.uid() = user_id` on every table and calling it done | Also validate role-based access for cross-table operations; test with each role independently |
| Supabase RLS | Forgetting to enable RLS after creating a table — Supabase tables are public by default | Run `ALTER TABLE [table] ENABLE ROW LEVEL SECURITY` as first step for every new table; add a CI check |
| Supabase Auth | Using `supabase.auth.getUser()` on the client and trusting the result for security decisions | `getUser()` on the client returns the cached JWT user — use `supabase.auth.getUser()` from a server context (Edge Function) which validates the JWT against the Auth server |
| Stripe Checkout | Redirecting to Stripe Checkout and trusting the redirect URL's `session_id` to confirm payment | Always verify payment via webhook `payment_intent.succeeded` — never trust URL params as payment confirmation |
| Stripe | Using `amount` in dollars instead of cents | Stripe accepts amounts in the smallest currency unit — NZD charges must be in cents ($100 NZD = 10000 cents) |
| Claude API | Sending full seeker + job profiles in every match explanation request | Token cost compounds at scale — send only the match breakdown JSONB (5-10 fields) not full profiles; use `claude-haiku` for batch scoring explanations |
| Claude API | Not handling API rate limits / errors in the match explanation path | Claude API calls can fail or be rate-limited; match explanation should be async with graceful degradation ("Explanation generating…") not a blocking operation |
| Supabase Storage | Storing farm verification photos in a public bucket | Use a private bucket with signed URLs for document uploads (verification tier 4–5) — these are identity documents |
| Resend | Sending transactional email without configuring SPF/DKIM on the sending domain | Emails land in spam; configure DNS records before any email goes to real users |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| No index on `match_scores (job_id, total_score DESC)` | Search results take 2-5 seconds instead of <200ms as job count grows | Add composite index on `(job_id, total_score DESC)` in initial migration | ~500 seekers per job listing |
| No index on `jobs (status, expires_at)` for active listing queries | Landing page "live job counter" and search become slow | Index `(status, expires_at)` for the common filter pattern `WHERE status = 'active' AND expires_at > now()` | ~200 active jobs |
| Full-table scan on `seeker_skills JOIN job_skills` for match scoring | Recompute batch takes 10+ minutes instead of <60 seconds | Index `seeker_skills(seeker_id)` and `job_skills(job_id)` — these are the join keys in every score computation | ~1,000 seekers × 50 jobs = 50,000 score pairs |
| Synchronous Claude API calls in search hot path | P95 search latency >5 seconds because AI explanation fetch is blocking | AI explanations are pre-generated and cached in `match_scores.explanation` text column; refresh async not inline | First user who triggers it |
| Fetching entire `seeker_profiles` row for every search result card | High bandwidth, slow mobile load | Use a dedicated view or SELECT projection for search cards (score, region, role_type, availability_date only) | ~50 results on mobile 4G |
| No `LIMIT` on match scores query in seeker job search | If a job has 500 applicants, employer dashboard fetches all 500 on page load | Always paginate: `LIMIT 20 OFFSET n` with total count via `COUNT(*)` in a separate query | ~100 applicants per job |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Admin role gated only by frontend routing, not RLS | Any authenticated user who navigates to `/admin` or calls admin Edge Functions can access all platform data | Add `user_roles.role = 'admin'` check in every admin Edge Function AND in RLS policies on sensitive tables; admin routes must 401 without server-side role verification |
| Placement fee acknowledgement tracked only in frontend state | Employer can shortlist candidates and view contact details without a `placement_fees` record existing in the database | Placement fee acknowledgement must create a database row atomically; contact release Edge Function must verify `placement_fees.acknowledged_at IS NOT NULL` before returning any contact data |
| Job listings publicly queryable without status check | Draft and expired listings appear in search results or can be fetched by ID | RLS SELECT policy on `jobs` must include `AND status = 'active'` for public/seeker access; employers can see their own drafts only |
| No rate limiting on application submission | A seeker applies to 500 jobs in a script, flooding employer dashboards and gaming match ranking | Supabase Edge Function rate limiting via `x-forwarded-for` header + a `daily_applications_count` counter per seeker; hard cap at reasonable number (e.g., 10/day) |
| SMS OTP verification (employer tier 2) without rate limiting | Attacker abuses verification endpoint to send SMS to arbitrary phone numbers (SMS bombing) | Rate limit OTP send by IP and by user: max 3 sends per phone number per hour |
| Seeker profile scraping via authenticated enumeration | Authenticated employer iterates seeker UUIDs and builds an offline candidate database without paying placement fees | RLS policy should not allow direct SELECT of seeker_profiles by ID for employers without an existing application/match relationship; require job context for seeker profile access |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Match score shown without explanation | Seekers don't understand why they scored 67% and can't improve — frustration and churn | Show match breakdown (shed type: 25/25, location: 14/20, accommodation: 0/20) alongside the total score on every job detail view |
| Employer sees 0 applicants on a new listing for 48+ hours | Employer thinks the platform is broken; churns before getting value | Show "match pool estimate" (N seekers in region with matching shed experience) while pipeline is empty, as designed in wireframes — this set expectation is critical |
| Wizard state lost on browser refresh | User loses 8-screen onboarding progress and abandons | Persist wizard state to `localStorage` or to a `draft_profiles` Supabase table on every step completion; resume on return |
| Contact details released but employer has no phone/email format guidance | Employer calls the wrong number, has no SMS template | When contact is released, show a structured contact card with phone (click-to-call), email (mailto link), and a suggested intro message template for ag context |
| Placement fee acknowledgement modal with no "what happens next" | Employer clicks "I understand" without understanding they'll be invoiced — disputes and payment failures | Placement fee modal must state exact amount (NZD), payment timeline, and that an invoice will be sent to their email — not just a terms checkbox |
| Seeker shown jobs they fundamentally can't match (visa incompatible, wrong region) | Wasted time, poor platform perception | Hard-filter visa incompatible jobs from search results; don't show "0% visa match" jobs at all — they erode trust in the matching system |
| Application pipeline status visible to employer before seeker updates | Seeker doesn't know they've been declined; employer sees stale "review" status | Notify seekers via email on every status change; provide a "withdraw application" button that immediately updates pipeline visibility on both sides |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **RLS on all tables:** Run `SELECT tablename FROM pg_tables WHERE schemaname = 'public'` and verify every table has `rowsecurity = true` — Supabase does NOT enable RLS automatically on tables you create.
- [ ] **Stripe webhook handler:** The Stripe dashboard shows payments succeeding in test mode, but without a webhook handler the job listing never activates server-side — always test with the Stripe CLI forwarding events locally.
- [ ] **Match score coverage:** Every job has `match_scores` rows for every seeker — verify with `SELECT j.id FROM jobs j LEFT JOIN match_scores ms ON ms.job_id = j.id WHERE ms.id IS NULL` — missing score rows mean seekers don't see certain jobs in ranked results.
- [ ] **First listing free bypass:** The UI skips Stripe for the first listing but the Edge Function must enforce this check server-side — verify by calling the activation endpoint directly without going through the UI flow.
- [ ] **Email verification trigger:** Supabase Auth sends a confirmation email at signup by default, but the link must be tested end-to-end — if the user clicks the link and is not redirected to the correct post-verification screen, they bounce.
- [ ] **RLS cross-role test:** Log in as employer A, try to SELECT seeker B's contact details — the query should return empty/null. Log in as seeker B, try to SELECT employer A's `stripe_customer_id` — should return null. These must be manual or automated tests, not assumed.
- [ ] **Claude API failure graceful degradation:** Kill Claude API in dev (wrong API key) and verify that job detail pages still load — match explanations should show a placeholder, not crash the entire detail page.
- [ ] **Expired listings cleanup:** Jobs with `expires_at < now()` still appear on the seeker job search if no scheduled function updates `status` to `'expired'` — verify with a job posted with a past `expires_at` date.
- [ ] **Accommodation score on null:** A seeker with `accommodation_needed = false` should not score 0 on the accommodation dimension — the scorer must handle null/false accommodation need as "neutral" not "incompatible."
- [ ] **Couples score edge case:** Seeker has `couples_seeking = true` but the job has `couples_welcome = false` — this should subtract points or flag incompatibility, not silently score 0 on that dimension with no signal.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Contact data stored in seeker_profiles (not separated) | HIGH | Write a migration to create `seeker_contacts` table, move data, update all RLS policies, update all Edge Functions that query contact data — likely 2-3 days plus re-testing all contact flows |
| Stale match scores with no invalidation mechanism | MEDIUM | Add `stale` boolean column to `match_scores`, write a migration that marks all existing rows as stale, deploy the batch recompute Edge Function — can run without downtime but recompute takes time proportional to seeker × job count |
| Double-processed Stripe webhooks (no idempotency) | MEDIUM | Add UNIQUE constraint on `stripe_payment_id`, write a script to deduplicate `listing_fees` rows keeping the earliest, manually reconcile affected jobs in Supabase dashboard — revenue accounting needs manual audit |
| User role in JWT metadata only (no user_roles table) | HIGH | Create `user_roles` table, backfill from `auth.users.raw_user_meta_data`, update all RLS policies to use `user_roles` instead of JWT metadata claims — touches every table's policies |
| Admin access via frontend route only | MEDIUM | Add `user_roles.role = 'admin'` check to each admin Edge Function, test every admin endpoint — can be done without schema changes if `user_roles` table exists |
| Match scores not pre-computed (real-time scoring in production) | HIGH | Requires introduction of a background job system (pg_cron or Supabase scheduled functions), initial full recompute across all job×seeker pairs, adding staleness tracking — 3-5 days |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Contact masking at data layer | Phase 1: Database schema | Automated test: employer query for seeker contact returns null |
| RLS recursive policy loops | Phase 1: Database schema | `SET ROLE` test each policy in psql before deploying |
| Multi-role auth confusion | Phase 1: Authentication | `user_roles` table created with correct constraints before any profile table |
| RLS not enabled on new tables | Phase 1: Database schema | CI check or migration linter that flags tables without `rowsecurity = true` |
| Match score staleness | Phase 2: Match scoring engine | Integration test: update seeker skill → verify score marked stale within 1 minute |
| Match score pre-computation at scale | Phase 2: Match scoring engine | Load test with 500 seekers × 50 jobs; confirm recompute completes in <60s |
| Stripe webhook idempotency | Phase 3: Stripe integration | Replay the same `payment_intent.succeeded` event twice; verify only one `listing_fees` row created |
| First listing free server-side enforcement | Phase 3: Stripe integration | Call job activation Edge Function directly (bypass UI); verify second listing is rejected without payment |
| Stripe NZD amount in cents | Phase 3: Stripe integration | Verify `amount_nzd` is stored as cents (10000 for $100); verify Stripe charge amount matches |
| Claude API graceful degradation | Phase 4: AI integration | Kill Claude API key in staging; verify job detail page loads with placeholder text |
| Admin role server-side enforcement | Phase 5: Admin tools | Call admin Edge Function with a seeker JWT; verify 403 returned |
| Expired listings not updated | Phase 6: Operations | Create a listing with past `expires_at`; verify cron marks it expired and it disappears from search |

---

## Sources

- Supabase RLS documentation (official, training data Aug 2025) — HIGH confidence on policy structure, MEDIUM confidence on specific function signatures that may have changed
- PostgreSQL RLS recursive policy behavior — HIGH confidence, this is a core PostgreSQL behavior documented in pg docs
- Stripe webhook delivery guarantees (at-least-once) — HIGH confidence, this is a fundamental Stripe guarantee stated in their official docs and has been consistent since 2019
- Stripe NZD currency handling (smallest unit = cents) — HIGH confidence, NZD is a supported Stripe currency with standard cents behavior
- Two-sided marketplace contact masking patterns — MEDIUM confidence, based on multiple marketplace post-mortems and Supabase community discussions (training data)
- Claude API rate limits and graceful degradation patterns — MEDIUM confidence, rate limits can change; verify current limits at https://docs.anthropic.com/en/api/rate-limits
- Agricultural seasonal worker marketplace patterns (NZ-specific) — MEDIUM confidence, derived from NZ ag sector knowledge in training data; no primary source verification possible without web access

---
*Pitfalls research for: NZ agricultural job marketplace (TopFarms)*
*Researched: 2026-03-15*
