# TopFarms — Data Architecture (Canonical)

> **Status:** CANONICAL · **Consolidated:** 2026-06-20
> **Authoritative live source:** `supabase/migrations/` (schema ground truth) + Edge Function source under `supabase/functions/`.
> **Consolidated from:** `SPEC.md` (feature/schema reference — note its design system is dead and schema section is dated), `.planning/v2-migration/TopFarms_Migration_Audit.md`, live migrations 001–046, and the leads-pipeline memory notes.
> **Supersedes (archived / misleading if trusted):** `_archive/2026-06-20/TopFarms_Launch_Pack/docs/TopFarms_Data_Architecture.html` (Apify + `raw_posts`/`parsed_jobs` — wrong vendor & dead tables) and the Drive `TopFarms_Engineering_Spec_v1.docx` (wrong entity names `worker_profiles`/`job_listings`, wrong model id, messaging-as-core).

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 · TypeScript · Vite 6 · React Router 7 · Tailwind v4 |
| Backend / DB | Supabase — Postgres, Auth, Storage, Realtime, Edge Functions |
| AI matching | Claude API (model id per live Edge Function config) |
| Payments | Stripe (Checkout/Elements + Invoices) |
| Email | Resend |
| Hosting | Vercel |
| Leads harvesting (admin track) | **Firecrawl** (commercial lane live) |

## Core marketplace schema (still accurate)

`jobs` · `employer_profiles` · `seeker_profiles` · `skills` · `job_skills` · `seeker_skills` ·
`match_scores` · `applications` · `listing_fees` · `placement_fees`.

- `message_threads` / `messages` exist but are **Growth Phase — unused at MVP** (no UI).
- **Naming note:** the live schema uses `seeker_profiles` / `jobs` / `applications`. Legacy
  eng-spec names (`worker_profiles` / `job_listings` / `job_applications`) were never built.

> For exact columns, constraints, RLS and the current taxonomy tables, read `supabase/migrations/`.
> `SPEC.md` is a useful feature reference but predates ~30 migrations — do not treat its schema
> section as current.

## Leads / ingestion pipeline (the part the old diagram got wrong)

The current ingestion model is **not** the archived Apify diagram. It is:

- **Harvest:** Firecrawl commercial lane (admin-only), scheduled via `lead_harvest_cron`
  (migration 043), runs tracked in `lead_harvest_runs` (migration 045). Background execution via
  `EdgeRuntime.waitUntil` to clear the 60s gateway ceiling.
- **Staging → review → publish:** `lead_staging` → `leads` → `lead_suppression`
  (migrations 041–046), with `normalise()` board-guard + region canonicalisation.
- **Privacy / gating:** access flows through **SECURITY DEFINER RPCs** with an admin gate and a
  **human approval** step. Leads do **not** auto-insert into the public `jobs` table.
- This is a **separate build track** from the public marketplace and is admin-facing only.

## Edge Functions & auth

- ~11 Edge Functions (auth, email pipeline, Stripe webhooks, document signed-URLs, admin RPCs, leads).
- **Gateway-trust JWT pattern:** for `verify_jwt: true` functions the Supabase gateway has already
  validated the JWT upstream — handlers decode the payload locally for `sub` and check
  `aud === 'authenticated'` rather than re-calling `auth.getUser()`. Reference:
  `supabase/functions/get-applicant-document-url/index.ts`.
- **Auth methods:** email/password + Google + Facebook OAuth.

## Migrations

Sequential `supabase/migrations/` 001 → 046+ (latest wins). Apply via Supabase Studio SQL Editor
per house rules (`CLAUDE.md` §2) when CI is gated; verify via `list_migrations` / runtime artefacts.

## Source-of-truth hierarchy

`supabase/migrations/` + Edge Function source (live) → this canonical summary → `SPEC.md`
(feature reference, dated). The archived `TopFarms_Data_Architecture.html` and
`Engineering_Spec_v1.docx` are historical only.
