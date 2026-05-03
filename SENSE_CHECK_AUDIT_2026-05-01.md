# TopFarms — Sense-Check Audit (2026-05-01)

**Type:** Read-only investigation report
**Scope:** Brand version drift, roster fields, couples workflow, accommodation persistence (UXBUG-01), Stripe production-mode posture, trust-tier state
**Constraints honoured:** No edits to code, migrations, planning docs, or config; no API calls; no commits; no git mutations

---

## Critical preface — v2 brand spec not present in repo

The audit prompt names `TopFarms_Brand_Spec_v2.md` as the v2 brand authority and asks for phase-by-phase classification against it. **This file does not exist in the repo or in `/mnt/project/`.**

Searched:
- Repo tree: `find -iname "*brand*"` → only `node_modules/expect-type/dist/branding.*` and `@babel` `assertClassBrand`. No project brand doc.
- `/mnt/project/`: no such mount on this host.
- Sentinel-word search across `src/`, `.planning/`, `PRD.md`, `SPEC.md`, `MILESTONE_LAUNCH.md`, `CLAUDE.md` for `brand-green | brand_v2 | near-white | near_white | font-family: Inter | Inter, sans` → **zero hits**. Every match for "Inter" was the substring inside `Interview` / `Internal` / etc.
- Git history of 325 commits: `git log --grep -E 'brand|design|palette|typograph|restyle|theme|inter|color|colour' -i` → **zero matches**. No commit in repo history mentions a brand or design overhaul.
- `src/index.css` `@theme` block is fully v1: `--font-display: "Fraunces"`, `--font-body: "DM Sans"`, soil/moss/fern/meadow/hay/cream tokens. No v2 tokens or shadow-theme present.

Implication: as far as this repo can tell, **no v2 brand work has landed**. Either (a) the v2 spec lives outside the repo and has not been incorporated, (b) the v2 spec is conceptual / not yet authored, or (c) it was never delivered to this codebase. Phase classification below is performed against the v1 brand because it is the only brand the repo knows about. No `V2_CLEAN` or `MIXED` (v1+v2) classifications are possible from repo state alone — they require the v2 spec to compare against.

---

## Part 1 — Brand version audit by phase

Signal sources used:
- `src/index.css` `@theme` block (single source of truth; fully v1)
- Phase plan / summary directories under `.planning/milestones/v1.0-phases/`, `.planning/milestones/v1.1-phases/`, `.planning/phases/`
- `git log` per phase prefix (sampled commits in `Recent commits` view)
- Wireframes at `TopFarms_Launch_Pack/wireframes/` (referenced by SPEC.md §316; v1 palette by inspection)
- Component drift scan from Part 2

| Phase | Brand classification | Evidence | Files of concern |
|-------|---------------------|----------|-----------------|
| 01 Foundation | **V1_CLEAN (light UI)** | DB schema + RLS + auth shells + routing/dashboard shells. Theme tokens established here. | `src/index.css` (v1 @theme), Login/SignUp shells |
| 02 Employer Supply | **V1_CLEAN** | 8-screen onboarding wizard, employer profile, 5-tier verification UI — heavy UI all under v1 theme | `src/pages/onboarding/employer/*`, `src/pages/verification/EmployerVerification.tsx` (19 v1-class refs) |
| 03 Seeker Demand | **V1_CLEAN** | 8-step seeker onboarding, dashboard, job search, job detail — heavy UI all under v1 theme | `src/pages/jobs/JobSearch.tsx` (13 v1-class refs), `src/pages/jobs/JobDetail.tsx` (15 v1-class refs) |
| 04 Match Scoring | **BRAND_NEUTRAL** | DB triggers, RPCs, `generate-match-explanation` edge function — no UI | `supabase/migrations/010`, `supabase/functions/generate-match-explanation/` |
| 05 Revenue Protection | **V1_CLEAN with hardcoded-hex caveat** | Stripe checkout flow + ack modal + RLS contact masking. PaymentForm hardcodes `#4a7c2f` (fern) and `#e2e0dc` (~fog) — values are v1, but bypass theme tokens | `src/components/stripe/PaymentForm.tsx:83-97` (4 hex literals; one-line-fix each) |
| 06 Landing Page (v1.0) | **V1_CLEAN** | Hero, live counters, how-it-works, featured listings — heavy UI all under v1 theme | `src/pages/Landing.tsx` and landing sections |
| 07 UI Primitives (v1.1) | **V1_CLEAN** | 9 UI primitives (ChipSelector, StatusBanner, Breadcrumb, StatsStrip, Timeline, etc.) — all v1 theme tokens | `src/components/ui/*` |
| 08 Wizard Field Extensions | **V1_CLEAN** | UI + DB. Migrations 013/014 (data layer), wizard step UI under v1 theme. **Note:** 013 migrated `accommodation_*` booleans to `accommodation_extras` text[] — see Part 5 | `src/pages/onboarding/employer/Step4Accommodation.tsx`, `Step7Preview.tsx` |
| 09 Page-Level Integrations | **V1_CLEAN** | Job search filters, job detail breadcrumb, applicant dashboard, my-applications — heavy UI all v1 | `src/pages/jobs/JobSearch.tsx`, `src/pages/dashboard/employer/ApplicantDashboard.tsx` (8 v1-class refs) |
| 10 Landing Page (v1.1) | **V1_CLEAN** | Landing SPEC sections (hero animation, AI matching, employer CTA band) — heavy UI all v1 | `src/pages/Landing*.tsx` |
| 11 Backend-Dependent Features | **MIXED scope (mostly BRAND_NEUTRAL)** | Migration 016 (Studio-applied; runtime artefacts present), `seeker-documents` storage bucket, `estimate_match_pool` RPC, plus `LivePreviewSidebar` UI component (v1 theme) | `src/components/ui/LivePreviewSidebar.tsx`, `supabase/migrations/016_phase11_backend_features.sql` (NOT in registry) |
| 12 OAuth Authentication | **V1_CLEAN (light UI)** | OAuth buttons added to Login/SignUp, `SelectRole` page, `AuthProvider` centralisation. Light UI under v1 theme | `src/pages/auth/Login.tsx`, `src/pages/auth/SignUp.tsx`, `src/pages/auth/SelectRole.tsx`, `src/contexts/AuthContext.tsx` |
| 13 Email Notifications | **MIXED scope (mostly BRAND_NEUTRAL)** | `notify-job-filled` edge function + `on_job_filled` trigger + migration 017 — backend. One UI fix in `MarkFilledModal` (race-condition guard) under v1 theme. Email templates inline in edge functions (HTML + Resend), not subject to web theme | `supabase/functions/notify-job-filled/index.ts`, `supabase/migrations/017_*.sql`, `src/pages/jobs/MarkFilledModal.tsx` (7 v1-class refs) |
| 14 Bug Fixes | **V1_CLEAN** | BFIX-01 applied badge in JobCard; BFIX-02 `get-applicant-document-url` edge function + DocumentUploader UI; BFIX-03 doc categorisation UI — all under v1 theme | `src/components/ui/JobCard.tsx`, `src/components/ui/DocumentUploader.tsx` (10 v1-class refs), `src/pages/dashboard/seeker/SeekerDocuments.tsx` (7 v1-class refs) |
| 15 Email Pipeline Deploy | **BRAND_NEUTRAL** | CI workflow (`.github/workflows/supabase-deploy.yml`), `supabase/config.toml`, edge function deployments, migration registry repair — zero UI changes | `.github/workflows/supabase-deploy.yml`, `supabase/config.toml` |

**Phase 1 summary:** 15 phases audited. **Zero phases V2_CLEAN. Zero phases MIXED-with-v1+v2 leakage.** Eleven UI-touching phases all V1_CLEAN; four phases BRAND_NEUTRAL (or mostly so); none built against a v2 brand because the v2 brand has not been applied to this repo. The entire shipped product (~20k LOC, 116 TS files) is a v1-brand codebase.

---

## Part 2 — Component-level drift scan

### A. Hardcoded `font-family: Fraunces` or `font-family: 'DM Sans'` declarations

**Zero hits.** All typography in `src/components/` and `src/pages/` inherits from theme tokens (`var(--font-display)`, Tailwind `font-display` / `font-body` / `font-mono` utility classes). No component bypasses the theme. This is a clean separation — flipping the `@theme` font-family would propagate everywhere.

### B. Hardcoded v1 palette hex colours

| File | Line | Hex | Context | Fix |
|------|------|-----|---------|-----|
| `src/components/stripe/PaymentForm.tsx` | 83 | `#4a7c2f` (fern) | Stripe Elements `appearance.variables.colorPrimary` | one-line-fix |
| `src/components/stripe/PaymentForm.tsx` | 84 | `#f8f6f2` (off-mist) | Stripe Elements `colorBackground` (~near-mist, doesn't match published v1 palette exactly) | one-line-fix |
| `src/components/stripe/PaymentForm.tsx` | 93 | `#e2e0dc` (~fog) | Stripe Elements `borderColor` (close to fog `#EEE8DC` but not identical) | one-line-fix |
| `src/components/stripe/PaymentForm.tsx` | 97 | `#4a7c2f` (fern) | Stripe Elements active `borderColor` | one-line-fix |

Stripe Elements' `appearance.variables` API requires literal hex strings (does not parse CSS custom properties), so these values are structurally locked to the component. The fix is to read them from `getComputedStyle(document.documentElement)` at mount time and feed CSS-variable-resolved values into the Stripe Elements options object. Currently a small but real coupling point.

No hits for the `#F5F1EB` and `#D4C8A8` values mentioned in the audit prompt — those don't appear anywhere in `src/`. They may have been from an earlier draft palette.

### C. v1 class-name references

Token names used: `bg-soil`, `text-soil`, `bg-soil-deep`, `bg-moss`, `text-moss`, `bg-fern`, `text-fern`, `bg-meadow`, `text-meadow`, `bg-hay`, `bg-hay-lt`, `bg-cream`, `bg-fog`, `bg-mist` (and their border-/text- variants).

Top files by density (top 10):

| File | v1-class refs |
|------|--------------|
| `src/pages/verification/EmployerVerification.tsx` | 19 |
| `src/pages/jobs/JobDetail.tsx` | 15 |
| `src/pages/jobs/JobSearch.tsx` | 13 |
| `src/components/ui/FileDropzone.tsx` | 13 |
| `src/components/ui/JobDetailSidebar.tsx` | 10 |
| `src/components/ui/DocumentUploader.tsx` | 10 |
| `src/components/ui/ApplicantPanel.tsx` | 9 |
| `src/pages/dashboard/employer/ApplicantDashboard.tsx` | 8 |
| `src/pages/jobs/MarkFilledModal.tsx` | 7 |
| `src/pages/dashboard/seeker/SeekerDocuments.tsx` | 7 |

**Total v1-class references across audited tree: 282**

These are not "drift" in the classic sense — they are correct usage of the v1 theme. They are flagged here because if a v2 theme were dropped in (with new token names like `brand`, `surface`, `surface-strong`), every one of these 282 references would need to be re-mapped. A v1→v2 transition is a 282-class-name find/replace plus 4 hex literals plus the `@theme` block plus removing the Fraunces+DM Sans Google Fonts import — meaningful but not architecturally hard. No new v2 theme stack would land cleanly without touching these.

---

## Part 3 — Roster field check

**Verdict: PARTIAL (DB schema + types exist; UI surfaces absent).**

| Location | State | Evidence |
|----------|-------|----------|
| Database | PRESENT | `supabase/migrations/013_phase8_wizard_fields.sql:64` adds `weekend_roster text` to `jobs` table |
| TypeScript types | PRESENT | `src/types/domain.ts:223,284-290` defines `WeekendRoster` enum: `'every_weekend' | 'alternate' | 'one_in_three' | 'occasional' | 'none'`, plus `WEEKEND_ROSTER_OPTIONS` array with NZ-relevant labels ("Alternate weekends", "1 in 3 weekends") |
| Job posting wizard | ABSENT | None of `JobStep1Basics` … `JobStep7Payment` collect a roster value. Step 5 (compensation) does not include `weekend_roster`. |
| Filter UI (FilterSidebar.tsx) | ABSENT | No roster chip / checkbox / selector. `ACCOMMODATION_OPTIONS` (lines 43-49) covers couples/pets/family but not roster patterns. |

**Net effect:** The column exists and the enum is defined, but no employer can set the value (wizard never collects it) and no seeker can filter on it. The field is dead data. NZ dairy roster patterns (8/2, 11/3, 6/2, 5/2) — described in PRD/SPEC as a key sector differentiator — are non-functional in product. This is a feature-gap, not a bug: nothing breaks, but a stated capability isn't delivered. There is no requirement (`SRCH-XX`, `JOB-XX`) that captures this gap in `REQUIREMENTS.md` from what I observed.

---

## Part 4 — Couples workflow surfacing

**Verdict: PRESENT_PROMINENTLY across all three checks** (with one nuance on c).

a) **Seeker onboarding — PRESENT_PROMINENTLY.**
- `src/pages/onboarding/steps/SeekerStep5LifeSituation.tsx:84-110` renders a "Seeking work as a couple?" toggle plus an optional partner name field.
- Persisted as `couples_seeking boolean` on `seeker_profiles` (defined in `001_initial_schema.sql:62`).

b) **Employer applicant view — PRESENT_PROMINENTLY.**
- `src/components/ui/ApplicantPanel.tsx:28-39` declares `SeekerProfile` with `couples_seeking?: boolean`.
- The flag flows into the panel's rendered match-highlights (lines 82-95) when the couples bonus applies.
- Not buried in expanded view; present on the summary card.

c) **Job listing for couple-flagged seekers — PRESENT (but indirect).**
- `src/pages/jobs/JobSearch.tsx:263` filters via `query.overlaps('accommodation_extras', accommodationTypes)` where `accommodationTypes` may include `'Couples welcome'`.
- `FilterSidebar.tsx:43-49` exposes 'couples' as an `ACCOMMODATION_OPTIONS` value.
- `JobCard` renders `accommodation_extras` as chips/tags — couples-friendly accommodation appears alongside other accommodation extras (pets/family/utilities) rather than as a dedicated couples lozenge.
- Classification: PRESENT_PROMINENTLY because the chip is rendered visibly on the card, not behind a click. Borderline PRESENT_BURIED if you require a dedicated dedicated-couples banner — the chip is one of several rather than spotlighted.

---

## Part 5 — Accommodation field persistence (UXBUG-01 root cause)

**Verdict: RENAMED.** The four `accommodation_*` boolean columns existed in v1.0 and were migrated + dropped in v1.1. `Step7Preview.tsx` is reading column names that haven't existed since 2026-03-21.

Evidence chain:

1. **Original boolean columns existed (Phase 02 / Migration 004).**
   - `supabase/migrations/004_employer_profile_columns.sql:17-20` created `accommodation_pets`, `accommodation_couples`, `accommodation_family`, `accommodation_utilities_included` as `bool NOT NULL DEFAULT false` on `employer_profiles`.

2. **Migration 013 converted to text[] and dropped the booleans (Phase 08).**
   - `supabase/migrations/013_phase8_wizard_fields.sql:32-44` runs an `UPDATE ... SET accommodation_extras = ARRAY[...]` mapping each boolean to a string literal ('Pets allowed', 'Couples welcome', etc.), then `ALTER TABLE ... DROP COLUMN accommodation_pets`, `accommodation_couples`, `accommodation_family`, `accommodation_utilities_included`.
   - This was a clean migration — data preserved, column shape changed to `accommodation_extras text[]`.

3. **TypeScript model updated (Phase 08).**
   - `EmployerProfileData` (in `EmployerOnboarding.tsx` lines 32-65) now defines `accommodation_extras: string[]` only. The four old boolean properties are not on the type.
   - `src/types/domain.ts:301-310` defines `ACCOMMODATION_EXTRAS_OPTIONS` enumerating the new string-literal values.

4. **Wizard Step4Accommodation persists correctly.**
   - `Step4Accommodation.tsx:16-25,54-71` collects via `ChipSelector` and writes `accommodation_extras` array.
   - `EmployerOnboarding.tsx:150-161,273` includes `accommodation_extras` in the `upsert` payload to `employer_profiles`.

5. **Seeker filter targets the correct column.**
   - `JobSearch.tsx:263` uses `query.overlaps('accommodation_extras', accommodationTypes)` — hitting the live column.

6. **Step7Preview is the orphan.**
   - `Step7Preview.tsx` (lines 129, 161-164) reads `profileData.accommodation_pets`, `accommodation_couples`, `accommodation_family`, `accommodation_utilities_included` directly. None of those properties exist on `EmployerProfileData`. They will always be `undefined` at runtime — TypeScript's `tsc -b` flags this (the source of the original `Step7Preview.tsx:129,161-164` UXBUG-01 finding 2026-04-27).
   - Result: every employer onboarding hits Step 7 with the accommodation section showing four "Not provided" / empty fields (or whatever the truthy-fallback shows). The data exists in `accommodation_extras` but the preview never renders it.

**Implication for couples (28%) and accommodation (76%) differentiators:**
- **Search + filter pipeline: FUNCTIONAL** — JobSearch reads `accommodation_extras`, FilterSidebar writes to it, employer wizard persists it. All three layers agree.
- **Preview/confirmation step: BROKEN** — Step7 shows nothing for the "Accommodation" subsection, which is cosmetic-but-visible. An employer reviewing their profile before publishing sees a blank-looking accommodation section despite having ticked options on Step 4.

**One-line characterisation for STATUS handoff:** *"UXBUG-01 is a Step7Preview-only display bug. The data layer was correctly migrated in Phase 08 (013); only the preview component was missed during the rename. Fix is to read `accommodation_extras` and render it as chips, ~10 LOC."*

---

## Part 6 — Stripe production-mode posture

### Code-level state

| File | Pattern | Behaviour |
|------|---------|-----------|
| `supabase/functions/create-payment-intent/index.ts:126` | reads `STRIPE_SECRET_KEY` only; pins API version `2024-06-20` | mode-agnostic — runs in whatever mode the supplied key is |
| `supabase/functions/stripe-webhook/index.ts:15-16` | reads `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`; both required, no env-conditional switching | single webhook secret; mode follows secret prefix |
| `supabase/functions/create-placement-invoice/index.ts:38` | reads `STRIPE_SECRET_KEY`; pins API version; `collection_method: 'send_invoice'`, `days_until_due: 14` | mode-agnostic |
| `supabase/functions/acknowledge-placement-fee/index.ts` | no Stripe API calls; only writes placement-fee row | n/a |
| `.env.example` (lines 1-2) | only `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` declared. **No Stripe key template.** | undocumented |
| `.env` (local; not for repo) | `STRIPE_SECRET_KEY=sk_test_...` (test prefix); `STRIPE_WEBHOOK_SECRET=whsec_...` | dev environment is in test mode |
| Phase 05 (Revenue Protection) plans | No mention of production-mode posture, live-key migration, or webhook endpoint registration to production URLs | undocumented |

**Observation: "production mode" is not encoded anywhere in the repo.** The code is mode-neutral by design (single env var, prefix determines mode). This is the right pattern, but it pushes the entire production-mode question into Supabase secrets configuration — invisible to the repo.

### Pre-launch verification checklist (what to confirm in dashboards, not in code)

1. **Supabase secrets — production project ref `inlagtgpynemhipnqvty`:**
   - `STRIPE_SECRET_KEY` starts with `sk_live_` (not `sk_test_`).
   - `STRIPE_WEBHOOK_SECRET` is the live-mode webhook secret from the production Stripe account, not the test-mode one.
   - Verify via `supabase secrets list --project-ref inlagtgpynemhipnqvty` (does not reveal values, only names).

2. **Stripe dashboard — production account, "Live mode" toggle ON:**
   - Webhook endpoint registered at `https://inlagtgpynemhipnqvty.supabase.co/functions/v1/stripe-webhook` for the live account (separate from any test-mode endpoint).
   - Webhook signing secret matches the value set in Supabase secrets.
   - Webhook subscribes to the events `stripe-webhook/index.ts` handles (read source for the event-type list — likely `payment_intent.succeeded`, `invoice.paid`, etc.).
   - At least one PaymentIntent + Invoice listed in Live transactions, ideally a $0.50 test charge and immediate refund to confirm flow.

3. **`.env.example` should document Stripe env vars even though they're server-side only** — currently silent. Adding `STRIPE_SECRET_KEY=sk_live_...` (commented) and `STRIPE_WEBHOOK_SECRET=whsec_...` would prevent accidental dev-only deployments.

4. **Vercel project env (front-end side):**
   - No publishable key (`pk_live_...`) is set in Vite env (`.env.example` shows only Supabase). If `PaymentForm.tsx` or its parent uses `loadStripe(publishableKey)`, that publishable key needs `pk_live_...` in production env (Vercel) — confirm this from `PaymentForm.tsx:1-30` or wherever Stripe.js is initialised. *(This audit didn't deep-read `PaymentForm.tsx` for the publishable-key wiring — flag for separate confirmation.)*

5. **Idempotency keys + retries:** verify `stripe-webhook/index.ts` and `create-payment-intent` use `idempotency_key` headers (audit didn't read those lines explicitly). Phase 05 success criterion mentions "idempotency guards" — should be live-tested with a duplicate webhook delivery in Stripe's "resend" tooling.

6. **Net 14 invoice flow:** `create-placement-invoice` uses `collection_method: 'send_invoice'`. Verify in production that an invoice is actually emailed (Stripe-hosted email; depends on customer.email being set) and that the Net 14 due-date renders correctly on the invoice PDF. Currently: zero artefacts in `.planning/` confirm this has been smoke-tested in production mode.

**Status from repo state alone:** *cannot* be confident the stack is in production mode. Code is correct; the unknowns are entirely in Supabase secrets + Stripe dashboard configuration, neither of which leave a trail in the repo.

---

## Part 7 — Trust tier state

### Implemented tiers + promotion mechanism

| Tier | Method | Component | DB column | Status |
|------|--------|-----------|-----------|--------|
| 1 | Email verified | (auto) | `verification_tier int DEFAULT 1` on `employer_profiles` (`001_initial_schema.sql:37`) | auto-assigned on signup |
| 2 | Phone SMS OTP | `PhoneVerification.tsx` | row in `employer_verifications` (table from `005`) | implemented; uses Supabase Auth `verifyOtp` |
| 3 | NZBN lookup | `NzbnVerification.tsx` | `nzbn_number` on verification row | implemented (manual entry + admin flag — no automated NZBN API integration; documented decision in PRD §9) |
| 4 | Document upload | `DocumentUpload.tsx` | `document_url` on verification row; uploaded to `employer-photos` bucket | implemented |
| 5 | Farm photo | `FarmPhotoUpload.tsx` | uploaded to `employer-photos` bucket | implemented |

### Computed `TrustLevel` mapping

`useVerifications.ts:19-35` derives a `TrustLevel` enum from the rows in `employer_verifications`:

- `unverified` — no verified methods
- `basic` — email verified only
- `verified` — email + phone both verified
- `fully_verified` — email + phone + (nzbn OR document) + farm_photo all verified

**Note the discrepancy:** the `verification_tier` integer column on `employer_profiles` (1-5) and the computed `TrustLevel` enum (4 values) are not 1-to-1. The integer column may be stale or unused; the runtime UI reads `useVerifications` (computed). Worth confirming whether `verification_tier` is ever updated — if not, it's dead data.

### User-facing surfaces where tier is visible

| Surface | File | Line |
|---------|------|------|
| Verification badge component | `src/components/ui/VerificationBadge.tsx` | 4 |
| Job search result card | `src/components/ui/SearchJobCard.tsx` | (badge via prop) |
| Employer dashboard | `src/pages/dashboard/EmployerDashboard.tsx` | 10 (calls `useVerifications`) |
| Verification hub page | `src/pages/verification/EmployerVerification.tsx` | 1-102 (5 method cards w/ status icons) |
| Job detail page (employer card) | inferred from VerificationBadge usage | not line-confirmed in this audit |

### Can an employer move beyond Tier 1?

**Yes — every method has a working UI flow.** The hub page `/dashboard/employer/verification` exposes all 5 methods, each as a card with a "Start" / status icon. Each card opens an inline form or routes to a verification component. Status persists to `employer_verifications` table; trust badge updates on next mount.

No tier-gating exists in product — listing fees, posting, applicant access are all tier-agnostic. Tier is currently informational signal-only ("here's how trustworthy this employer looks"). No premium features behind higher tiers.

### Stub vs implemented

- **All 5 methods have implementations.** None are stubs.
- **Caveat — NZBN (Tier 3) is "manual entry + admin flag" by deliberate design** per PRD §9 ("Manual NZBN verification for MVP — API integration deferred"). It works, but it doesn't actually validate the NZBN against the official register. An employer can type any 13-digit number and (if/when admin flips the verified flag) reach Tier 3.
- **`verification_tier` integer column may be unused at runtime** — UI reads computed `TrustLevel` from `useVerifications`. Audit didn't confirm whether any code writes to `verification_tier` or whether it's purely a static `1` for every employer in the live DB.

---

## Findings Summary

1. **No v2 brand spec exists in this repo.** The audit prompt's premise — that the codebase has shipped phases against two different brand versions — does not match repo state. Every UI-touching phase (1-3, 5-10, 11 partial, 12, 14) is V1_CLEAN; every other phase is BRAND_NEUTRAL. There is zero v2 brand leakage because there is no v2 brand to leak. **This is the most consequential discovery for the sense-check** — if the v2 spec exists elsewhere, the team needs to decide whether to import it and migrate, or whether v1 is the launch brand.

2. **A v1→v2 brand migration would touch ~282 v1-class references plus 4 hardcoded hex values plus the `@theme` block and Google Fonts import.** Mechanically tractable (find/replace, theme rebuild) but not trivial — top-density files are `EmployerVerification.tsx` (19 refs), `JobDetail.tsx` (15 refs), `JobSearch.tsx` (13 refs), `FileDropzone.tsx` (13 refs). Effort estimate: 1-2 days for a careful sweep + visual regression review. Not bundle-into-Phase-18 territory; it's a milestone of its own.

3. **UXBUG-01 root cause confirmed: Step7Preview.tsx is the only orphan from the Phase-08 boolean→array migration.** Data persists correctly via `accommodation_extras text[]`. The couples/pets/family/utilities differentiators *function* in search and filter; they only fail to render in the employer's pre-publish preview. This is a 10-LOC fix, not the systemic data-layer break implied by the original bug report. Recommend reclassifying UXBUG-01 from "investigation needed" to "small UI fix" and bundling into Phase 18.

4. **Roster (weekend_roster) is dead data — DB column + enum exist, but neither the wizard nor the filter UI surfaces it.** This is a feature gap, not a bug. NZ dairy roster patterns (8/2, 11/3, etc.) are described in PRD/SPEC as a sector differentiator but are not deliverable in product. Either the column should be exercised (add wizard step + filter chip — small phase of work) or dropped (cleanup migration). No `REQUIREMENTS.md` entry currently captures this gap.

5. **Stripe production-mode posture cannot be verified from repo state.** Code is mode-agnostic (single `STRIPE_SECRET_KEY`, prefix determines mode), which is correct. Local `.env` shows `sk_test_` — meaning at least one developer environment is test mode. Production mode requires Supabase secrets verification (`sk_live_` keys, live webhook secret matching production webhook endpoint). `.env.example` doesn't document Stripe env vars at all — a small but real onboarding gap. **Pre-launch checklist gap: Stripe live-mode confirmation has no artefact in `.planning/`.**

6. **Trust tiers are fully implemented (Tiers 1-5 all wired) but un-gated.** Every employer can progress through phone/NZBN/document/farm-photo flows; status persists; verification badge reflects computed TrustLevel. No product features are gated by tier — it's signal-only. Worth confirming that this is intentional (PRD/SPEC strategy) vs an unfinished gating layer. Also: `verification_tier int` column may be dead data (UI reads computed `TrustLevel`); a Phase-18 cleanup item.

7. **NZBN verification (Tier 3) is "type any 13-digit number"** — by deliberate design (PRD §9), no API integration. An employer can self-claim a fictional NZBN; only an admin's manual flag flips them to verified. Worth surfacing as a launch-positioning question — the trust badge says "verified" without any real NZBN check until an admin reviews. If "trust" is part of the marketing claim against Facebook groups, this gap deserves an explicit decision.

8. **Couples workflow surfaces correctly across onboarding → applicant view → job listing**, but on the listing card "Couples welcome" is one chip among several `accommodation_extras`, not a dedicated lozenge. For a product where 28% of seekers are couples and couples-friendliness is a stated decision factor, the surfacing could be more deliberate (e.g., a dedicated badge or sort boost when the seeker is `couples_seeking=true`). Not a bug, but a design-intent question worth raising during sense-check.

9. **PaymentForm.tsx hardcodes 4 hex values into Stripe Elements `appearance.variables`** because the API doesn't parse CSS custom properties. They are v1 palette values today, but they are the only place in the codebase where a brand change wouldn't propagate via the `@theme` block alone. A v2 brand migration must remember this file. Could be neutralised by reading `getComputedStyle(document.documentElement).getPropertyValue('--color-fern')` at mount.

10. **Outside-scope flag: `verification_tier` integer column on `employer_profiles` (set on signup, default 1) is likely never updated** — the UI reads the computed `TrustLevel` from `useVerifications`. If true, every employer in the DB has `verification_tier=1` regardless of how many methods they've completed. This isn't user-facing harm (UI doesn't read it) but creates schema confusion and a future sync-drift risk. Worth confirming with a one-shot query in Supabase Studio:
    ```sql
    SELECT verification_tier, COUNT(*) FROM employer_profiles GROUP BY 1;
    ```
    If the answer is "all rows = 1", the column is dead and should either be wired up or dropped in Phase 18.

---

*Audit generated 2026-05-01. Read-only. No edits to code, migrations, planning docs, or config. No git operations beyond `git log` reads. No API calls to Stripe, Supabase, Resend, or Claude. File written: `SENSE_CHECK_AUDIT_2026-05-01.md` at repo root. Not committed.*

---

## CORRECTION NOTE — 2026-05-03

Two findings in this audit need correction in light of the 2026-05-03 drift discovery and remediation. The Part 5 UXBUG-01 framing needs reframing entirely; HOMEBUG-01 needs adding (not surfaced in original audit). A third item — methodology — is captured for future-audit guidance.

### Part 5 UXBUG-01 reframe

**Original framing (lines 135–168):** verdict was "RENAMED" — characterised UXBUG-01 as a Step7Preview-only display bug, claiming the data layer was correctly migrated in Phase 08 (013) and only the preview component was missed during the v1.1 rename. The "one-line characterisation" recommended a ~10 LOC fix to read `accommodation_extras` and render it as chips.

**Corrected framing:** Migration 013 was **phantom-applied** — registry row present with full SQL body recorded, schema effects absent. The four `accommodation_*` boolean columns from migration 004 were never actually dropped, because 013's `ALTER TABLE ... DROP COLUMN` statements never ran against the live schema. The `accommodation_extras text[]` column 013 declared was likewise absent.

Implication: Step7Preview reading the booleans was **correct** against the actual live schema state. The `accommodation_extras` reads in `JobSearch` and `Step4Accommodation` were the surfaces that would have failed — `JobSearch:263`'s `.overlaps('accommodation_extras', ...)` filter returned PostgREST 400 (swallowed by the frontend error handler, manifesting as empty search results); `Step4Accommodation` SELECTs of a non-existent column silently returned no data. Both rooted in the same drift.

True cause of UXBUG-01: schema-vs-types drift across the 011–014 phantom-applied range, not a single missed-orphan in Step7Preview.

**Remediation (this session):** BLOCK 1 (re-applied 013) + BLOCK 2 (re-applied 014). After remediation, `accommodation_extras` is now the canonical column; the boolean columns are dropped. Frontend simplification commit `d5e8dfc` updated Step7Preview to read `accommodation_extras` chips.

### HOMEBUG-01 root cause

This audit didn't surface HOMEBUG-01, but the same drift class explains it: 012 was phantom-applied (`platform_stats()` RPC absent despite registry row). Remediated via BLOCK 3 §2 in the 2026-05-03 session. Logged here so future readers connecting to this audit have the link.

### Methodology gap

Claims about live schema state in this audit were inferred from migration files on disk rather than verified against the running database. The audit's read-only constraint did not preclude read-only MCP queries against schema layers (`information_schema.columns`, `pg_proc`, `cron.job`); those would have caught the phantom-applied state immediately. A 30-second sample query against `placement_fees` columns would have invalidated the Part 5 framing.

**Recommendation for future audits:** sample-check schema state via Supabase MCP read-only queries when claiming what the live database does or doesn't have. Migration files on disk describe intent; only the live schema is authoritative.

### Parts unaffected

Parts 1 (brand version), 2 (component drift), 3 (roster field), 4 (couples workflow), 6 (Stripe posture), 7 (trust tier) don't depend on schema-state inference and remain accurate.

### See also

- `.planning/DRIFT-AUDIT-2026-05-03.md` — canonical record of the audit, BLOCK 1/2/3 reconciliation, and post-remediation state.
- `.planning/STATUS-2026-05-03.md` — session accomplishments.
- `.planning/SUPABASE-TICKET-UPDATE-2026-05-03.md` — platform-event hypothesis.

*Correction note appended 2026-05-03. Original audit body above unmodified — the correction is additive so future readers see both the original framing and the post-discovery reality.*
