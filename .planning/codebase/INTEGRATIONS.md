# External Integrations

**Analysis Date:** 2026-05-29

## APIs & External Services

**Supabase (Primary Backend):**
- **Authentication** - User sign-up, login, session management, JWT tokens
  - SDK: `@supabase/supabase-js` 2.49.4
  - Auth flow: SSR via `@supabase/ssr` 0.6.1 (cookie-based)
  - Verification: Gateway-level `verify_jwt: true` on protected Edge Functions (CLAUDE.md §5)

- **Realtime** - Live data subscriptions for job updates, application status changes
  - SDK: Built into `@supabase/supabase-js`
  - Channel subscriptions for job_id, application_id updates

- **Edge Functions** - Server-side handlers in Deno runtime
  - Deployed via Supabase CLI GitHub Action (`.github/workflows/supabase-deploy.yml`)
  - 11 functions deployed:
    - `notify-job-filled` - DB trigger on `on_job_filled` (migration 017/022); sends email notifications
    - `send-followup-emails` - Cron-driven placement fee followup emails (migration 011)
    - `acknowledge-placement-fee` - Marks placement fee acknowledged (employer dashboard action)
    - `create-placement-invoice` - Creates Stripe invoices for placement fees
    - `stripe-webhook` - Handles Stripe webhook events (payment_intent.succeeded, invoice.payment_succeeded)
    - `create-payment-intent` - Creates Stripe PaymentIntent for listing fees (tier 1-3 pricing)
    - `get-resend-stats` - Cron-polled email metrics fetcher (pg_cron trigger every 15min)
    - `get-applicant-document-url` - Signed URL minter for seeker documents (5-layer authz)
    - `send-document-status-email` - Admin action notifier for document approvals (Phase 21 Track B)
    - `generate-candidate-summary` - AI candidate profile generation (LLM integration)
    - `generate-match-explanation` - AI job match reasoning (LLM integration)

- **Storage** - File hosting for seeker documents and job attachments
  - Bucket: `seeker-documents` (document upload + signed URL retrieval)
  - Used by: `get-applicant-document-url` (90-second signed URLs for employer download)

- **pg_net** - HTTP client for outbound webhook calls from Postgres triggers/functions
  - Used by: `send-followup-emails` via pg_cron job + pg_net.http_post
  - Webhook secret: Stored in Supabase Vault (Phase 18 defence-in-depth pattern)

- **Vault** - Encrypted secret storage
  - `pg_net_webhook_secret` - Webhook signature header for pg_net callbacks (migration 029)
  - Used by: Postgres stored procedures to sign pg_net.http_post calls to Edge Functions

**Stripe (Payment Processing):**
- **API** - Payment intent creation, invoice generation, webhook handling
  - SDK: `stripe@14` (via ESM: `https://esm.sh/stripe@14`)
  - API Version: 2024-06-20 (locked in both Edge Functions)
  - Endpoints:
    - POST `/v1/payment_intents` — create intent for listing fees (tiers $100/$150/$200 NZD)
    - POST `/v1/invoices` — create placement fee invoices
    - Webhook: `/supabase/functions/stripe-webhook` — `payment_intent.succeeded`, `invoice.payment_succeeded`

- **Webhooks** - Incoming events from Stripe
  - Endpoint: `stripe-webhook` function
  - Events: `payment_intent.succeeded` (listing fee paid → activate job + 30d expiry), `invoice.payment_succeeded` (placement fee invoice)
  - Signature validation: `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET`
  - Idempotency: Stripe event ID checked against `listing_fees.stripe_payment_id` and `placement_fees.stripe_invoice_id`

- **Metadata Flow:**
  - Listing fees: `job_id`, `tier`, `employer_id` embedded in PaymentIntent metadata
  - Placement fees: `application_id` embedded in Invoice metadata

**Resend (Transactional Email):**
- **API** - Send transactional emails to employers and seekers
  - SDK: Native HTTP POST to `https://api.resend.com/emails` (no SDK; custom fetch wrapper)
  - Auth: `RESEND_API_KEY` Bearer token in `Authorization` header
  - Email functions:
    - `send-followup-emails` — Day 7 + Day 14 employer nudges, Day 21 seeker reminder
    - `notify-job-filled` — DB trigger notification (best-effort, no RESEND_API_KEY = silent skip)
    - `send-document-status-email` — Admin document action notifications
    - `create-placement-invoice` — Placement fee invoice email to employer

- **Configuration:**
  - `RESEND_API_KEY` — API key (secret, managed per Phase 15 partial-close discipline)
  - `RESEND_FROM_EMAIL` — Default: `TopFarms <hello@topfarms.co.nz>` (env var override supported)
  - `APP_URL` — Default: `https://topfarms.co.nz` (links in email templates)

- **Failure Mode:** RESEND_API_KEY not set → functions return 200 with skip-flag rather than error (Phase 15 MAIL-02 closure)

## Data Storage

**Databases:**
- Supabase Postgres (inlagtgpynemhipnqvty)
  - Connection: `SUPABASE_URL` + JWT auth (frontend) or `SUPABASE_SERVICE_ROLE_KEY` (Edge Functions)
  - Client: `@supabase/supabase-js` 2.49.4 (frontend + Edge Functions)
  - Pooler: Auth pooler configured but SASL auth broken (CLAUDE.md §6 — migrations gated to `workflow_dispatch` only)
  - Migrations: Applied via Supabase Studio SQL Editor (not CI) pending pooler-auth fix

**File Storage:**
- Supabase Storage (`seeker-documents` bucket)
  - Object upload via `supabaseClient.storage.from('seeker-documents').upload()`
  - Signed URL retrieval via `get-applicant-document-url` Edge Function
  - TTL: 15 minutes (900 seconds)

**Caching:**
- `public.admin_metrics_cache` table (Phase 20) — Resend API metrics cached by `get-resend-stats` every 15 minutes
- No external cache service (Redis, etc.); cache is schema-based

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (self-managed via Postgres `auth.users` + JWT)
  - OAuth: Google, GitHub (configured in Supabase dashboard)
  - JWT: ES256-signed tokens issued by Supabase gateway
  - Verification: Gateway upstream `verify_jwt: true` on protected functions (BFIX-05 gateway-trust pattern, §5)

- **Roles:**
  - `employer` - Job poster, can create listings, view applicants
  - `seeker` - Job applicant, can upload documents, apply for jobs
  - `admin` - Document reviewer, queue page access (Phase 21 Track B)
  - Roles stored in `user_roles` table, checked in Edge Functions

## Monitoring & Observability

**Error Tracking:**
- Supabase Logs - Function logs queried via `get_logs` MCP tool
- Console logging in Edge Functions (Deno.serve handlers)
- No external error tracking service (Sentry, DataDog, etc.)

**Logs:**
- Supabase Edge Function logs (console.log/error in handlers)
- Postgres logs (function execution, trigger invocation)
- GitHub Actions logs (deployments via supabase-deploy.yml)

## CI/CD & Deployment

**Frontend Hosting:**
- Vercel - SPA deployment
  - Config: `vercel.json` (rewrites /(.*) to /index.html for SPA routing)
  - Build: `npm run build` → Vite output to `dist/`
  - Auto-deploy on push to main branch
  - Preview deployments on PR

**Edge Functions & Migrations:**
- Supabase CLI v2.95.4 (GitHub Actions)
- Deployment method:
  - Functions: `supabase functions deploy --use-api` (server-side bundling, no Docker)
  - Migrations: `supabase db push --linked` (gated to `workflow_dispatch` only, CLAUDE.md §6)
  - Workflow: `.github/workflows/supabase-deploy.yml`
  - Trigger: Push to main with path filter on `supabase/functions/**` (migrations path removed 2026-05-21)
  - Concurrency: Single execution queue (never cancel mid-deploy)

**Secrets Management:**
- GitHub Actions secrets (per `.github/workflows/supabase-deploy.yml`):
  - `SUPABASE_ACCESS_TOKEN` - PAT for Supabase API (topfarms-ci-deploy)
  - `SUPABASE_DB_PASSWORD` - Pooler auth (stale as of 2026-05-21; not actively used)

- Supabase Function environment variables:
  - `SUPABASE_URL` - Project URL
  - `SUPABASE_SERVICE_ROLE_KEY` - Service role JWT (for internal queries)
  - `STRIPE_SECRET_KEY` - Stripe API key
  - `STRIPE_WEBHOOK_SECRET` - Stripe webhook signature secret
  - `RESEND_API_KEY` - Resend email API key (not required; functions gracefully skip if unset)
  - `RESEND_FROM_EMAIL` - Email from address (optional; defaults to `TopFarms <hello@topfarms.co.nz>`)
  - `APP_URL` - Frontend URL for email links (optional; defaults to `https://topfarms.co.nz`)
  - `WEBHOOK_SECRET` - pg_net callback signature header (Phase 18 defence-in-depth; stored in Vault per migration 029)

## Environment Configuration

**Required env vars:**
- Frontend (Vite, injected at build time):
  - `VITE_SUPABASE_URL` - Supabase project URL
  - `VITE_SUPABASE_ANON_KEY` - Supabase public anon key

- Edge Functions (set in Supabase dashboard function settings):
  - `SUPABASE_URL` - Project URL
  - `SUPABASE_SERVICE_ROLE_KEY` - Service role key
  - `STRIPE_SECRET_KEY` - Stripe secret (for stripe-webhook, create-payment-intent)
  - `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret (for stripe-webhook validation)
  - `RESEND_API_KEY` - Resend API key (optional; best-effort email)

**Secrets location:**
- Supabase dashboard (Project Settings → Functions → Environment Variables)
- Vault: `pg_net_webhook_secret` for Postgres pg_net.http_post signature

## Webhooks & Callbacks

**Incoming Webhooks:**
- Stripe → `stripe-webhook` function
  - Events: `payment_intent.succeeded`, `invoice.payment_succeeded`
  - Signature validation: `stripe-signature` header + `STRIPE_WEBHOOK_SECRET`
  - URL: `https://inlagtgpynemhipnqvty.functions.supabase.co/stripe-webhook` (inferred)

**Outgoing Webhooks (pg_net):**
- Postgres pg_net.http_post calls (via pg_cron) → Edge Functions
  - Trigger: `placement-fee-followup-job` cron (migration 011) → `send-followup-emails`
  - Trigger: `get-resend-stats-job` cron (Phase 20) → `get-resend-stats`
  - Signature: `X-Webhook-Secret` header with Vault-stored secret (Phase 18 pattern)
  - Polling pattern: pg_cron invokes pg_net.http_post; no HTTP callback from function to Postgres

## Data Flow Summary

### Listing Fee Payment (Job Activation)
1. Employer frontend calls `create-payment-intent` Edge Function
2. Function queries `listing_fees` count; if 0, activates job free (first-listing-free); else creates Stripe PaymentIntent
3. Frontend loads Stripe Elements form, sends payment
4. Stripe calls `stripe-webhook` function with `payment_intent.succeeded` event
5. Function inserts `listing_fees` row, updates job status to `active` + 30d expiry

### Placement Fee Invoice
1. Employer calls `create-placement-invoice` function (from dashboard)
2. Function creates Stripe Invoice with `application_id` metadata
3. Stripe calls `stripe-webhook` with `invoice.payment_succeeded` event
4. Function sends thank-you email via Resend (optional)

### Email Notifications (Followup)
1. pg_cron job `placement-fee-followup-job` fires (Day 7, Day 14, Day 21)
2. Postgres stored procedure calls pg_net.http_post → `send-followup-emails` function
3. Function queries application/job data, sends email via Resend
4. pg_net request includes `X-Webhook-Secret` header for defense-in-depth

### Document Status Notification
1. Admin approves/rejects/requests-resubmission for seeker document
2. Frontend calls RPC (`admin_approve_document`, etc.)
3. RPC updates document status + audit log
4. Frontend calls `send-document-status-email` function
5. Function queries document, builds HTML template, sends via Resend

---

*Integration audit: 2026-05-29*
