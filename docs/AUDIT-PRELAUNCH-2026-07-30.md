# TopFarms — Pre-Launch Deep Audit

## 1 · Header

| | |
|---|---|
| **Date** | 2026-07-30 |
| **Commit audited** | `8f5b860706a9289aba1fa42287d9925454d15f72` (`main`) |
| **Model actually used** | **Opus 4.8** (`claude-opus-4-8`). The operator selected Fable 5 via `/model`, but that applies to *new* sessions; this session ran on Opus 4.8. Stated rather than glossed, per the brief. |
| **Live targets** | https://www.topfarms.co.nz · Supabase `inlagtgpynemhipnqvty` (ref verified before the first query) |
| **Method** | Static read of the full repo; read-only SQL against live production (`pg_policies`, `pg_proc`, `pg_trigger`, `pg_constraint`, `cron.job`, `storage.buckets`, row counts); live HTTP against production; all gates executed locally. |

### Auditor conflict-of-interest disclosure

PRs **#65, #66, #67** — the three most recent merges to `main` (CI remediation, Vercel Analytics,
GTM docs) — were authored by this same assistant in the immediately preceding session. Findings
touching that work are **self-review and carry lower confidence** than the rest of this report.
Everything else is arm's-length.

### What was run

```
npx tsc -b · npm run lint · npm run build · npx vitest run · npm audit --omit=dev
git log --all --full-history -p -- '.env*' · git ls-files · curl -I https://www.topfarms.co.nz
```

### What could not be accessed — do not read these as clean

- **`SET ROLE anon` probing** — MCP lacks the privilege (`ERROR: 42501: permission denied to set
  role "anon"`). Anon-reachability conclusions derive from policy predicates plus grants, not live
  impersonation. High confidence, not empirical.
- **Edge Function runtime secrets.** Whether `RESEND_API_KEY`, `WEBHOOK_SECRET` and
  `LEAD_INTAKE_SECRET` are set in production — and whether the Edge `WEBHOOK_SECRET` matches the
  Vault value the DB trigger sends — is **unverified**. If they have drifted, `on_job_filled` silently
  403s and no job-filled email has ever sent.
- **Stripe dashboard.** Mode, webhook registration and event history were inferred from the deployed
  bundle and DB row counts, not read from Stripe.
- **Prompt-injection into the Claude scoring/summary path.** Attacker-controlled CV and job text
  reaches `generate-candidate-summary`. Nobody assessed the injection surface. **Unverified — treat
  as an open question, not a pass.**
- **No live UI walkthrough.** No browser session, no Lighthouse run, no axe scan. Design findings are
  from source and computed contrast ratios. Journey-level defects invisible to static analysis
  may exist.

---

## 2 · Executive summary

**TopFarms is not launch-ready as a commercial product.** It can safely show a marketplace to
visitors; it cannot yet *charge* for one. Production runs **Stripe test keys**, so no money can be
taken at all — and beneath that, the revenue model has three independent bypasses that make both fee
lines optional even once the keys are swapped. Separately, four Edge Functions hold the service-role
key and perform authentication without authorization, so an ordinary signed-up user can read another
employer's candidate data. Composite launch readiness: **53/100**, against the project's own
`LAUNCH.md` score of 93/100. That gap is not a contradiction — `LAUNCH.md` scores a checklist of known
items conscientiously and accurately; it was never an adversarial review of authorization or revenue
enforcement. This audit is.

**The three things that matter most:**

1. **The placement fee — the primary revenue line — is unenforceable.** Seeker contact details are
   correctly paywalled in `seeker_contacts` RLS, but the *same phone and email* sit in the applicant's
   CV, and the CV is released to any employer whose job the seeker applied to, with **no fee
   predicate** (`020_seeker_documents_employer_policy.sql:33-46`). The CV tab is the *default* tab in
   the applicant panel. No exploit is required. Meanwhile the fee *amount* is computed in the browser
   and inserted verbatim server-side, and a live listing's "first free" allowance resets when the job
   is deleted.
2. **Four Edge Functions bypass RLS with no ownership check.** `generate-candidate-summary` and
   `generate-match-explanation` will read and write another tenant's data for any authenticated
   caller — including `visa_status`. The codebase already contains a textbook-correct implementation
   of the check they need (`get-applicant-document-url`); it was simply never extracted into a shared
   helper.
3. **You cannot see production and cannot rebuild it.** There is no error tracking of any kind, and a
   render crash is presented to the user as a *404 page*. Meanwhile 21 migrations live in production
   with no ledger row and **two live migrations have no file in the repository at all** — the database
   is not reproducible from the repo.

**One correction to the brief.** The audit instruction described a Facebook harvest lane storing
individuals' visa status and scoring people 1–10 for commercial value, and asked that this not be
buried. Having verified it against the code and live data: **that description does not match what is
built.** There is no visa field, no 1–10 desirability score, no automated Facebook collection, and
all 62 live rows are *employers* advertising jobs. The lawful-basis position is ordinary B2B outreach
from public job ads. The genuine legal gap is smaller and different: outbound outreach carries **no
unsubscribe line**, which breaches the Unsolicited Electronic Messages Act 2007. Detail in §5.4.

---

## 3 · Scorecard

| Domain | Weight | Score | Band | One-line justification |
|---|---|---|---|---|
| **Security, Privacy & Compliance** | 35 % | **55** | Significant deficiencies *(P0 cap applied)* | Excellent RLS and definer discipline, entirely bypassed by service-role Edge Functions that never check the caller. |
| **Product & System Architecture** | 30 % | **52** | Significant deficiencies | Sound data model and CI; unreproducible migration ledger, zero observability, and the core scoring engine is untested and mis-described. |
| **Product Design & Market Fit** | 20 % | **47** | Not launch-ready in this domain | Both marketplace sides are genuinely built, but all three revenue mechanisms are bypassable and verification is self-service. |
| **Design & Interface Craft** | 15 % | **57** | Significant deficiencies | Clean token layer and one honest component kit, undermined by AA contrast failures on decision-critical UI and two core screens that break at 360 px. |

**Composite Launch Readiness**
`(55 × 0.35) + (52 × 0.30) + (47 × 0.20) + (57 × 0.15)`
`= 19.25 + 15.60 + 9.40 + 8.55` = **52.8 → 53 / 100**

**Band: 50–59 — "Significant deficiencies. Launch is a gamble. Material rework required."**

Per-domain arithmetic in §9. The Security cap is applied under the §4 rule (one unmitigated P0 caps
its domain at 55) for P0-2; Product and Architecture score below the cap on merit.

### Note on the Design P0 I downgraded

The design deep-read classified the `warn`/`info` contrast failures as P0. Against **this report's**
taxonomy — P0 means data exposure, auth bypass, revenue leak, legal exposure or data loss — a
contrast failure is P1: severe, user-visible, trust-damaging, but not in that class. I have
reclassified it to P1 for internal consistency, and no cap was applied to Domain 2. The finding
itself is not weakened: an illegible "Visa sponsorship" chip is the single most consequential
usability defect in the product for the people it most affects.

---

## 4 · Launch blockers (P0)

Ranked by severity. Effort assumes one competent engineer familiar with the codebase.

### P0-1 · The CV releases the very contact details the placement fee exists to sell — **effort M (4 h + a product decision)**

**Evidence.** `seeker_contacts` RLS correctly gates on `placement_fees.acknowledged_at IS NOT NULL`
(`002_rls_policies.sql:123-139`). But:
- `020_seeker_documents_employer_policy.sql:33-46` — the employer SELECT policy on `seeker_documents`
  requires only role=employer, `document_type IN ('cv','certificate','reference')`, and that the
  seeker applied to one of the caller's jobs. **No placement-fee predicate.**
- `supabase/functions/get-applicant-document-url/index.ts:194-256` mints a signed CV URL under those
  same three checks. No fee check.
- `src/components/ui/ApplicantPanel.tsx:119` — **"CV" is the default tab**, rendered for every
  applicant at every status, while the contact block at `:409-410` is UI-gated on
  `shortlisted/offered/hired`.

**Failure scenario.** An employer receives an application, opens the applicant panel — which lands on
the CV tab by default — and reads the candidate's name, phone and email. No fee, no shortlist, no
exploit. The `seeker_contacts` paywall is guarding a *copy* of data that ships freely alongside it.

**Why it matters in this business.** This is simultaneously the revenue model and the worker-facing
promise. New Zealand dairy farming is a small, tightly networked community. The failure mode is not
technical, it is **social**: one employer mentioning at a field day that you never actually have to
pay the placement fee ends the revenue line permanently. A paywall people have learned to route
around cannot be reintroduced.

**Fix.** Decide the product answer first — either (a) redact contact details from CVs shown
pre-placement (server-side, at URL-mint time), or (b) accept that CVs are visible and move
monetisation to a listing-weighted model. Do not ship (c) "hide the CV tab", which fixes only the UI
and leaves the Edge Function open.

### P0-2 · Two Edge Functions read and write across tenants with the service-role key — **effort M (6 h for all four)**

**Evidence.** `supabase/functions/generate-candidate-summary/index.ts:57` takes
`{application_id, job_id, seeker_id}` from the request body; `:62-65` builds a **service-role** client
(RLS bypassed); the 179-line file contains no `auth.uid()`, no JWT decode, no `user_roles` lookup and
no ownership join. `generate-match-explanation/index.ts:45-48` is the same pattern. Both deploy
`verify_jwt: true`, so the gateway proves *a* logged-in user and never *which*.

**Failure scenario.** Anyone signs up and obtains a valid JWT. With an `application_id` they receive,
at `:79-83`, another employer's stored AI assessment of a candidate; on cache-miss the function loads
`seeker_profiles` at `:88-92` — including **`visa_status`** — and returns an LLM summary of it. At
`:155-159` it **writes** attacker-influenced text into `applications.ai_summary`.
`generate-match-explanation` likewise writes `match_scores.explanation` (`:100-104`). Anthropic tokens
burn on your key with a 3-attempt retry loop and no rate limit. UUIDv4 identifiers are the only
barrier — obscurity, not authorization, defeated by one shared screenshot or log line.

**Fix.** Extract the chain already implemented correctly at
`get-applicant-document-url/index.ts:82-94` (gateway-trust decode + `aud` check) and `:161-211`
(employer resolution → ownership check) into `supabase/functions/_shared/`, and route
`generate-candidate-summary`, `generate-match-explanation`, `acknowledge-placement-fee` and
`create-payment-intent` through it.

### P0-3 · Placement-fee amount is whatever the browser says it is — **effort S-M (3 h)**

**Evidence.** `src/pages/dashboard/employer/ApplicantDashboard.tsx:369-384` computes `fee_tier` and
`amount_nzd` client-side via `calculatePlacementFee` (`src/types/domain.ts:471-490`) and posts them.
`acknowledge-placement-fee/index.ts:15,57-67` inserts them verbatim under a service-role client with
**no caller-ownership check and no recomputation**. `create-placement-invoice/index.ts:148-154` then
bills Stripe with `amount: amount_nzd` directly.

**Failure scenario.** Invoke the function directly with `amount_nzd: 0`. The row is written,
`acknowledged_at` is set — and because the `seeker_contacts` policy keys only on
`acknowledged_at IS NOT NULL` and ignores the amount, contact details unlock for free. Separately,
`employer_id` is attacker-controlled, so any authenticated user can fabricate debt rows against a
*different* employer, which `create-placement-invoice` will then bill.

**Fix.** Derive `employer_id` from the JWT and `fee_tier`/`amount_nzd` server-side from the job row.
Never accept them from the body.

### P0-4 · "First listing free" resets on job delete — unlimited free listings — **effort S (2 h)**

**Evidence.** Free eligibility is `count === 0` over `listing_fees` for the employer
(`create-payment-intent/index.ts:63-78`). `listing_fees.job_id` is
`REFERENCES jobs(id) ON DELETE CASCADE` (`001_initial_schema.sql:214`). The `jobs` RLS policy is
**`FOR ALL`** (`002_rls_policies.sql:155-169`), so an employer may DELETE their own job via the REST
API.

**Failure scenario.** Post free job → DELETE it → cascade removes the `listing_fees` row → count
returns to zero → next listing is free. Repeat indefinitely. No UI delete button exists, but RLS
permits it from any authenticated employer client, so a UI is not required. (Archiving does *not*
reset the count — only hard delete.) Note `employer_profiles` has `UNIQUE(user_id)`, so the
multi-profile vector is correctly closed.

**Fix.** Count consumed free listings on an append-only ledger keyed to `employer_id` that does not
cascade, or restrict the `jobs` policy from `FOR ALL` to exclude DELETE.

### P0-5 · Applicant email leaks through the normal UI, pre-payment — **effort S (2 h)**

**Evidence.** The **live** `get_applicants_for_job(p_job_id)` (read from `pg_proc`) is SECURITY
DEFINER, granted to `authenticated`. Its ownership check is correct (employer role +
`jobs → employer_profiles.user_id = auth.uid()`, raising `42501` otherwise) — but it computes
`COALESCE(sc.email, u.email, LEFT(a.id::text, 8)) AS display_name`, joining `seeker_contacts` and
`auth.users` under definer privilege with **no placement-fee condition**. Called from
`src/pages/jobs/MarkFilledModal.tsx:42`.

**Corroborating evidence for P0-8:** the on-disk source
(`030_rls_get_applicants_for_job_rpc.sql:54-72`) references columns that do not exist and would error
at runtime. Disk and production disagree because the live version was patched by
`fix_get_applicants_for_job_joins` — **one of the two migrations with no file in the repository.**

**Fix.** Return a non-identifying display name and gate the email behind the same predicate the
`seeker_contacts` policy uses.

### P0-6 · Any user can self-assign the employer role and read every seeker's personal data — **effort M (4 h)**

**Evidence.** `018_set_user_role_rpc.sql` — SECURITY DEFINER, granted to `authenticated`, checks only
`auth.uid() IS NOT NULL` and `p_role IN ('employer','seeker')`, then upserts. Live policies:
`seeker_profiles: employers view open-to-work seekers` — `qual: open_to_work = true AND
get_user_role(auth.uid()) = 'employer'`; `seeker_skills: employers can view` —
`qual: get_user_role(auth.uid()) = 'employer'`, **no job binding at all**.

**Failure scenario.** Sign up, call `set_user_role('employer')` — unlimited and unaudited — then read
every open-to-work seeker's `visa_status`, `family`, `pets`, `couples_seeking`, `min_salary` and
`region`. No job, no payment, no verification. For a platform serving migrant workers on AEWV visas,
a bulk visa-status dump is the highest-consequence privacy failure available in this system.

**Judgement.** Broad employer visibility of open-to-work seekers is plausibly the intended design.
Free, unlimited, unaudited self-promotion into that role is not.

**Fix.** Restrict `set_user_role` to first assignment only; log changes to `admin_audit_log`; add an
ownership predicate to `seeker_skills`.

### P0-7 · Production runs Stripe **test** keys — no money can be taken — **effort S (1 h)**

**Evidence.** The deployed chunk `assets/PostJob-vzYrVyvw.js`, fetched live from
`https://www.topfarms.co.nz`, contains `pk_test_51Sy…` (loaded at `src/lib/stripe.ts:3`). Corroborated
by `listing_fees` = 0 and `placement_fees` = 0 rows in production — **the revenue path has never
executed.**

**Failure scenario.** A real card is declined outright by test mode and the employer concludes the
product is broken. A test card succeeds, the job activates, and no money moves — while
`listing_fees` accrues rows that look like revenue.

**Fix.** The exact procedure is already written at `.planning/TOPFARMS-REPO-OVERVIEW.html:919-920`:
rotate `STRIPE_SECRET_KEY` → `sk_live_*`, rotate `VITE_STRIPE_PUBLISHABLE_KEY` → `pk_live_*` in
Vercel + redeploy, register the live webhook, copy the live signing secret, run one small real charge
→ confirm webhook → refund.

### P0-8 · The database is not reproducible from the repository — **effort M (4 h)**

**Evidence.** 64 `.sql` files on disk (`001`→`064`, no numbering duplicates); **45** rows in
`supabase_migrations.schema_migrations`. Migrations **036–056** (21 files, including the entire leads
pipeline `041`–`056`, the marketplace view `038`, definer hardening `037`) are live in production with
**no ledger row**. Two applied migrations have **no file on disk**:
`20260722232729 fix_get_applicants_for_job_joins` (1707 chars) and
`20260729095445 leads_list_expose_draft` (1530 chars). Numbers 018–020 appear in neither.

**Failure scenario.** No staging parity, no reproducible disaster recovery, and a second engineer
cannot stand up a working database. P0-5 demonstrates the concrete harm already: two agents reading
the "same" function reached opposite conclusions because disk and production have diverged.

**Root cause is known and documented in project memory** — pooler auth is blocked, so migrations go
via Studio/the connector, and Studio-applied SQL does not write `schema_migrations`. The compensating
step was never taken.

**Fix.** Dump the two orphans' `statements` into numbered files (`065_`, `066_`), backfill ledger rows
for 036–056, then verify by replaying 001→latest onto a scratch database.

### P0-9 · The "verified employer" badge is self-service — **effort M (4 h)**

**Evidence.** `src/pages/verification/DocumentUpload.tsx:47-56` — uploading a document immediately
upserts `employer_verifications` with `status: 'verified'` **from the client**. No human review step
exists for employer documents. Compounding: the `anon view employer verifications` policy is
`USING (true)` (`005_employer_verifications.sql:45`), exposing `nzbn_number` and `document_url` to the
world (currently 0 rows — armed, not yet firing).

**Failure scenario.** A fake employer uploads any PDF and is badged "verified" on a platform whose
entire proposition to workers is trustworthiness. A worker travels to a farm that does not exist.

**Fix.** Set `status: 'pending'` on upload; require an admin transition to `verified` (the admin
document queue already exists); scope the anon policy to
`employer_has_public_job(employer_id) AND status = 'verified'` and drop `document_url` from the three
client `select('*')` calls (`useVerifications.ts:56`, `JobSearch.tsx:422`, `JobDetail.tsx:220`).

### P0-10 · Fabricated statistics shown to an employer who has just paid — **effort S (30 min)**

**Evidence.** `src/pages/jobs/steps/JobStep8Success.tsx:75,83,91` hardcodes **"3 avg days to first
applicant"**, **"120+ seekers in match pool"**, **"85% actively looking"**. Live production has 3
seekers and 0 jobs. All three are false, and they render on the job-publish success screen —
immediately after payment. The 2026-07-08 truth pass caught `TestimonialsSection` and `TrustedByStrip`
(both now empty with "DO NOT RENDER" headers) but missed this block. It is the **only** remaining live
fabricated data found; `CountersSection` correctly uses the real `get_platform_stats` RPC.

**Fix.** Delete the block. It is a consumer-law exposure (Fair Trading Act, misleading
representations) as well as a trust one.

### P0-11 · Commercial outreach has no unsubscribe — UEMA 2007 — **effort S (30 min)**

**Evidence.** Lane-A cold emails are commercial electronic messages. `docs/OUTREACH-EMAIL.md:22-36`
and both AI system prompts (`lead-draft-email/index.ts:25-48`, `lead-intake/index.ts:543-567`) contain
**no unsubscribe facility and no sender contact details**. UEMA ss 10–11 require both in every
message; there is no B2B or low-volume exemption. Penalties reach $200k for an individual.

**Fix.** Add one line to the template and both system prompts — e.g. *"If you'd rather not hear from
me again, reply 'no thanks' and I won't contact you again — Harry Smith, TopFarms, [postal/contact
address]"* — and honour it via the existing reject-with-suppress path. This is the single
cheapest P0 in the report.

---

## 5 · Domain findings

### 5.1 Domain 1 — Product & System Architecture (52/100)

**P1 · Zero error tracking, and crashes are disguised as 404s.** No Sentry, Bugsnag, LogRocket,
Datadog or `window.onerror` anywhere in `src/` or `package.json`. 33 files call `console.error` into a
console nobody reads. Worse, `src/main.tsx:174` sets `errorElement: s(<NotFound />)` — a render crash
shows the user a **"404 Not Found" page**. The user does not report it (nothing looks broken, the URL
merely seems wrong) and you have no telemetry either. A launch-day regression could run for days
undetected. *Fix: an error SDK (free tier suffices at this volume) + split `errorElement` into a real
`<ErrorBoundary>` distinct from the 404 route. Effort S.*

**P1 · Match scoring is not what the docs say, and is still dairy-shaped.**
`compute_match_score()` (`009_seeker_onboarding.sql:113-334`) is deterministic PL/pgSQL with fixed
weights: shed type 25 · location 20 · accommodation 20 · skills 20 · salary 10 · visa 5 · couples 5.
Claude only narrates a score it did not compute. Three consequences:
1. **`shed_type` is a dairy-only concept worth 25 % of the score.** Migration `034` (the ag-broad v2.1
   taxonomy) recomputed scores without touching the weights (`034:131-146`). Cropping, deer and
   machinery roles have no shed type, so their matches structurally cap around 80.
2. **Scores can exceed 100.** Maxima sum to 105 and the only clamp lives inside the recency branch
   (`:312-318`, `LEAST(100, …)` applied *only* when the job is under 7 days old).
   `match_scores.total_score` is `int NOT NULL` (`001:178`) with **no CHECK constraint** (verified via
   `pg_constraint`). A perfect match on an older job stores **105**.
3. **Skill edits do not rescore.** Live `pg_trigger` shows `job_match_rescore` on `jobs` and
   `seeker_profile_match_rescore` on `seeker_profiles`, but **nothing on `seeker_skills`/`job_skills`**.
   `SeekerStep4Skills.tsx:56-81` deletes and re-inserts skills with no recompute call. 20 points go
   stale on any skills edit not followed by a profile write. (First-run onboarding likely masks this
   via a later profile write; recovery after a *later* edit is **unverified**.)

**P1 · The core scoring engine has zero automated tests.** `tests/match-scoring.test.ts` contains
**0 executing tests and 26 `it.todo`**. Suite-wide: 117 todos (`applications` 15,
`pipeline-transitions` 11, `placement-fee` 5). The Stripe webhook has no automated test — only the
manual `tests/stripe-webhook-events-UAT.md`. *Judgement: 484 green tests is a healthy-looking number
that does not cover the two paths where failure is unrecoverable.*

**P1 · `send-followup-emails` has no caller and has never fired.**
`011_placement_fee_followups.sql:58-80` schedules `placement-followup-flags`, which only sets
`followup_7d_due`/`followup_14d_due` booleans. Live `cron.job` (8 jobs) contains nothing posting to
`/functions/v1/send-followup-emails`, and no `functions.invoke` or `pg_net` call exists in the repo.
`028_pg_net_webhook_secret_headers.sql:17-18` recorded this and moved on. **The collections mechanism
for a Net-14 invoice business has never run.**

**P2 · The webhook records that an invoice was created, never that it was paid.**
`stripe-webhook/index.ts:142-189` handles `invoice.payment_succeeded` by **logging only** (`:188`).
`placement_fees` has no paid/paid_at column (`001:227-237` — only `acknowledged_at`, `confirmed_at`,
where `confirmed_at` means *invoice created*). **You cannot produce an aged-debtors list from the
database.** Idempotency is otherwise reasonable (natural-key dedup on `listing_fees.stripe_payment_id`
`:76-97` and `placement_fees.stripe_invoice_id` `:157-186`); signature verification is correct
(`:41-47`).

**P2 · `create-payment-intent` activates jobs for arbitrary employers.** `:22` takes `employer_id`
from the body; `:48-53` verifies the job belongs to that *supplied* id, never that the caller is that
employer; `:78-117` then sets `status: 'active'`, `listing_tier` and a 30-day expiry.

**P2 · No security headers beyond HSTS.** `curl -I` returns only
`strict-transport-security: max-age=63072000`. No CSP, `X-Frame-Options`, `X-Content-Type-Options`,
`Referrer-Policy` or `Permissions-Policy`; `vercel.json` (4 lines) has no `headers` block. The
authenticated app is iframeable.

**P2 · Plaintext webhook secret in a cron command.** Live `cron.job` jobid 4
(`refresh-resend-stats`) embeds its `x-webhook-secret` literally in `cron.job.command`, while jobid 7
correctly reads `vault.decrypted_secrets`. Inconsistent with migration 029's own pattern.

**P2 · Edge-function deploy failures are silently green.**
`.github/workflows/supabase-deploy.yml` sets `continue-on-error: true` ("notify-only… no
auto-rollback"). Code can merge and be believed deployed when it is not.

**P2 · Bundle: one 684.63 kB / 204.29 kB gzip chunk.** Passes the CI budget (500 kB *gzip*) so the
gate is weaker than the Vite warning implies. Route-level splitting is already in place for pages; the
residue is vendor.

**P2 · Client state is hand-rolled** — no TanStack Query/SWR, manual `useEffect` + `useState`, 27
`react-hooks/set-state-in-effect` warnings. *Judgement: acceptable debt now, expensive later. **Do not
touch this before launch** — see §10.3.*

### 5.2 Domain 2 — Design & Interface Craft (57/100)

**P1 · Semantic colours fail AA badly, on the most decision-critical chip in the product.**
Computed ratios: `--color-warn` #F59E0B on white **2.15:1**; on `--color-warn-bg` **1.93:1**;
`--color-info` #0EA5E9 on white **2.77:1**; on `--color-info-bg` **2.42:1** (AA requires 4.5:1).
Live usages: `src/components/ui/Tag.tsx:13` — `blue: 'bg-info-bg text-info'` at **11 px semibold**, which
renders the **"Visa sponsorship" tag on every job card**. For migrant workers reading a phone in
paddock sunlight, the single most important chip is the least readable element on the card.
`MatchCircle.tsx:24-31` renders the 60–79 band — the most common band — in `text-warn` on `bg-warn/10`
(~2.1:1). `Button.tsx:13`'s `warn` variant is white on #F59E0B (**2.15:1**).
**The fix already exists in the palette**: `--color-warn-text-on-bg` #92400E (6.37:1,
`src/index.css:40`), used correctly by Tag's `warn` variant. An `info` equivalent needs adding.

**P1 · Brand green as text is 3.30:1 — every primary CTA fails AA.** White on #16A34A = 3.30:1;
`Button.tsx:10,18` renders `md` at 15 px medium (normal text, needs 4.5:1). 99 `text-brand`
occurrences plus 71 inline `var(--color-brand)` colour styles, mostly 13–15 px.
`--color-brand-hover` #15803D is **5.02:1** — an AA-passing green already in the palette.

**P1 · Two core app screens break at 360 px.** `ApplicantDashboardSidebar.tsx:25` and
`MyApplicationsSidebar.tsx:38` are `w-[260px] flex-shrink-0` with **no responsive classes**, wrapped in
plain `flex gap-6` (`ApplicantDashboard.tsx:546-548`, `MyApplications.tsx:216,300`). At 360 px the
content column gets ~75 px or forces horizontal scroll. JobSearch (`:520,537,555` — mobile bottom-sheet
+ `hidden md:grid`) and PostJob (`:517` — `hidden lg:block`) do it correctly; copy those patterns.

**P1 · Nested buttons and sub-target-size controls on the job card.**
`SearchJobCard.tsx:91-96` makes the card header a `<button>`; the save control at `:171-184` is a
second `<button>` **inside** it — invalid HTML, unpredictable for screen readers and keyboard. The
bookmark is a bare 16 px icon with no padding (`:183`; same at `JobDetailSidebar.tsx:110`) against a
44×44 mandate in the brand doc (`Brand_and_Design.md:53`). One-handed, gloved, on a phone: unusable.

**P1 · Applicant fetch failure renders as "no applicants".**
`ApplicantDashboard.tsx:198-201` — on error: `console.error`, `setLoading(false)`, `return`. The UI
shows the empty state. An employer on a flaky rural connection is told nobody applied.

**P1 · The match score red-flags a human being.** `MatchCircle.tsx:32-37` renders sub-60 scores in
**danger red** — the same token used for errors — beside an applicant's name
(`ApplicantPanel.tsx:215-217`). *Genuinely mitigating and worth preserving:*
`MatchBreakdown.tsx:9-38` explains the score across 7 named dimensions with per-dimension context for
low scores, and ApplicantPanel derives plain-language "Match Highlights" (`:87,275-282`). The
explanation layer is good; the red coding and the naked integer are the residual problem.
Also `ApplicantDashboard.tsx:268-275` sorts by score on load while `sortBy` state says "newest"
(`:110`) — dead code that contradicts both the UI and the project's own "matched, not sorted" framing.

**P2 · Inline-style sprawl.** 917 `style={{…}}` occurrences in `src/**/*.tsx`; **726 are bare
`var(--color-…)`** for colours that have Tailwind utilities. Pages carry it (JobDetail 54, HeroSection
36, SignUp 33); `components/ui` is mostly clean. Migration artefact, not convention.

**P2 · Undefined token classes that silently render nothing — two real bugs.**
`EmployerDashboard.tsx:618-619` uses `className="bg-red …"` (**`red` is not a token** — the class does
nothing) papered over with `style={{ backgroundColor: '#dc3545' }}` — *Bootstrap's* red, not
`--color-danger` #DC2626. And `ProtectedRoute.tsx:19,47` / `SelectRole.tsx:20` spin on
`border-t-moss` — `moss` is not a token, so the top-border colour never applies and **the loading
spinner is a uniform circle with no visible rotation cue.**

**P2 · 34 hardcoded hex values outside `src/index.css`.** Sanctioned: `PaymentForm.tsx:89-103` (Stripe
Elements iframes cannot read CSS vars) and the Google/Facebook logo fills. Findings: a second blue
`#2563eb` (`JobCard.tsx:25`, `JobDetail.tsx:466-467`, `EmployerVerification.tsx:405,410`), an untokened
gradient green `#1a3a10` (`SearchHero.tsx:45`), traffic-light dots including a second green `#28c840`
(`AIMatchingSection.tsx:75-77`), `#7A5C00` (`VerifyEmail.tsx:101`, `ForgotPassword.tsx:58`).

**P2 · `prefers-reduced-motion` is not honoured by JS animation.** The CSS clamp
(`src/index.css:83-92`) reaches CSS only; `motion` v12 ignores it and there is **zero**
`useReducedMotion`/`MotionConfig` in `src/` (only `useCountUp.ts:15-17` checks manually). 8 files
animate regardless. One `<MotionConfig reducedMotion="user">` at the root fixes all of them.

**P2 · No focus trap in any modal; focus visibility leaks outside the kit.**
`HireConfirmModal.tsx` lacks `role="dialog"`/`aria-modal` entirely (siblings have them); Escape-to-close
exists only in saved-search and admin components. No global `:focus-visible` rule; 40
`outline-none` usages against 17 `focus-visible:` — raw `<select>`/`<textarea>` suppress the outline
and rely on a border-colour change (`JobSearch.tsx:752`, `ExpandableCardTabs.tsx:174`,
`MarkFilledModal.tsx:241`).

**P2 · Other contrast liabilities.** `--color-text-subtle` #8A968D = **3.08:1** on white, used for
11–12 px labels. Applied-status badge (`SearchJobCard.tsx:119-127`) = 3.72:1 at 11 px. For the record,
passing: `text-muted` 5.66, `danger` 4.83, `ai` 4.23, body text 16.6.

**P2 · Loading states split-brain; offline unhandled.** Skeletons where it matters (JobSearch,
ApplicantDashboard, MyApplications, admin) but centred `Loading...` text in `SeekerDashboard.tsx:129`,
`EmployerDashboard.tsx:264`, `ProtectedRoute.tsx:23,51`. No `navigator.onLine` listener, no service
worker, no retry affordance — for rural connections a failed load is a silent toast at best and a fake
empty state at worst.

**P3 · v1 residue is cosmetic and matches the brand doc's own note.** Three dead `border-t-moss`
classes plus stale soil/fern/cream comments. **No brown renders anywhere and no non-Inter family
exists** (grep-verified) — the one-green rule holds in tokens. `Tag.tsx:14`'s `orange` variant
(1.93:1) is unused — delete before someone uses it.

**Component architecture verdict.** 43 components in `src/components/ui/`, **one** Button (4 variants ×
3 sizes, 44 px mobile heights), one Input, one Select — no duplicate primitives, which is better than
most codebases this age. Sprawl is at the composite level: `JobCard` vs `SearchJobCard` are
near-duplicates used on one page each, and five bespoke sidebars share no shell.

### 5.3 Domain 3 — Product Design & Market Fit (47/100)

Revenue findings are P0-1, P0-3, P0-4, P0-5 above. Remaining:

**P2 · The pricing page promises an unbuilt feature.** `src/pages/Pricing.tsx:70-71` — "upgrade a live
listing… pay only the difference." No prorate or upgrade logic exists; `TIER_PRICES` is flat
(`create-payment-intent:9-13`).

**P2 · The landing page sells sectors the database rejects.**
`src/components/landing/FarmTypesStrip.tsx:8-9` advertises **Horticulture 🌱** and **Viticulture 🍇**;
the live CHECK constraint permits only `dairy, sheep_beef, cropping, deer, mixed, other`. Canon places
both in v3.0+. A viticulture worker who signs up because they saw a grape icon finds zero jobs and no
way for a vineyard to post one. *(Also: emoji-as-UI, which the admin design uplift explicitly banned.)*

**P2 · `listing_fees` has no uniqueness on `job_id`** (`001:212-220`) — the free-path insert is not
idempotent; a retried free activation could double-insert.

**Verified clean — do not "fix" these:**
- **Workers never pay.** No payment, pricing, upgrade or checkout affordance anywhere in the seeker
  surface (grep of `src/pages/dashboard/seeker*`, `onboarding/steps/Seeker*`). `Pricing.tsx` is
  entirely employer-facing and the copy is honest. No seeker `stripe_customer_id` write path. **The
  core brand promise holds in code.**
- **No messaging UI leak.** `message_threads`/`messages` exist as Growth-phase stubs (`001:242-258`)
  with **zero references in `src/`** and no routes. *Caveat: the tables are nonetheless writable — see
  F-S2 — and `ForEmployers.tsx:26` advertises "message" to employers, which is a copy defect, not a
  code leak.*
- **Saved searches** is a fully shipped feature, not a stub.
- **Job activation is server-side on both paths** — `create-payment-intent:102` (free) and
  `stripe-webhook:122` (paid). The client never writes `status='active'`. This is correct and was the
  most likely place to find a catastrophic bypass; it is not there.
- **Cold-start empty states are honest** — `JobSearch.tsx:793` "No jobs listed right now",
  `ApplicantDashboard.tsx:642-649` "No applicants yet".

### 5.4 Domain 4 — Security, Privacy & Compliance (55/100)

**The RLS layer is genuinely well built.** All 27 public tables have `relrowsecurity = true`. Every
tenant-table policy binds to `auth.uid()` through a real ownership chain
(`jobs.employer_id → employer_profiles.user_id`), and **no cross-tenant read is constructible through
PostgREST**. **All 64 SECURITY DEFINER functions pin `search_path`** — a discipline most teams never
achieve. All 45 `admin_*` functions call `_admin_gate()`, which is itself sound. `employer_profiles`
carries *column-level* grants that exclude `stripe_customer_id`, verified via `pg_attribute.attacl`.
**Every material hole is above the database**, in Edge Functions holding the service-role key.

**F-S1 · P1 · `employer_verifications` is world-readable including `document_url`.**
Policy `anon view employer verifications` — `SELECT, TO {anon}, qual: true`
(`005_employer_verifications.sql:45`). Columns include `nzbn_number` and `document_url` (a path into
the private `employer-documents` bucket). Three client `select('*')` sites, two on public pages
(`useVerifications.ts:56`, `JobSearch.tsx:422`, `JobDetail.tsx:220`). **Live row count is 0** — armed,
not firing. It arms itself the moment the first employer verifies (see P0-9).

**F-S2 · P1 · Anyone can inject a message into any thread.** Policy `messages: sender can insert` —
`INSERT, TO public, with_check: (sender_id = auth.uid())`; `thread_id` is unchecked
(`031_rls_initplan_performance.sql:354`, originally `002:357`). Any authenticated user writes into any
employer↔seeker thread. They cannot read it back (SELECT is correctly bound), but both legitimate
participants see the injected content. **A harassment and phishing vector against workers, on a
feature that has no UI and is therefore unmonitored.**

**F-S3 · P2 · Employers' private notes are readable by the candidate.**
`applications: seekers insert and view own` is `FOR ALL` with no column restriction and no column
grants, so a seeker can read their own `application_notes` and `ai_summary` via
`/rest/v1/applications?seeker_id=eq.<own>`. The same policy grants them DELETE.

**F-S4 · P2 · Default `GRANT ALL` (incl. TRUNCATE) on all 27 tables.** **TRUNCATE is not subject to
RLS.** PostgREST cannot emit it, so this is not currently reachable — but the deny-all leads tables are
protected *solely* by "RLS on + zero policies" with full grants underneath. One accidentally permissive
policy and the entire leads pipeline is public. Also `admin_leads_staging_list` has EXECUTE granted to
`anon` and `PUBLIC` (harmless — `_admin_gate()` runs first — but inconsistent; revoke).

**F-S5 · P2 · Live Supabase management PAT unencrypted on disk.** `.mcp.json:12` holds an `sbp_…`
token granting full project control. Correctly gitignored (`.gitignore:14`, absent from
`git ls-files`) but plaintext. **Value not reproduced here.** Consider rotation + keychain-backed env.
Secondary: `CLAUDE.md` mandates the project-scoped `.mcp.json`, yet it is gitignored — a new engineer
gets no MCP config and no note that they must create one.

**Storage is correct.** `seeker-documents` and `employer-documents` are **private**;
`employer-photos` public (intended). Six `storage.objects` policies, all scoped to
`(storage.foldername(name))[1] = auth.uid()::text`. Employer access to seeker documents is exclusively
via the signed-URL function, TTL **900 s** (`get-applicant-document-url/index.ts:48`).

**Client-side is clean.** Zero occurrences of `service_role`/`SERVICE_ROLE`/`sb_secret` in `src/`.
Eleven `.select('*')` calls, all `.eq()`-scoped, **none on `employer_profiles`**. No secrets in git
history — `git log --all --full-history` over `.env*` matches only `.env.example`.

#### The leads pipeline vs the Privacy Act 2020 — correcting the brief

**Facts, live-verified.** All 60 `lead_staging` rows and both `leads` rows are `type='employer'`.
Sources: 57 `nzfarmingjobs` (a public commercial job board), 3 `fb_manual_capture`. **Zero seeker
rows.** There is **no visa column, no visa jsonb key, and no visa field in either extraction schema**
(`lead-harvest/index.ts:76-95`, `lead-intake/index.ts:428-475`). The only score is
`confidence numeric CHECK (0..1)` (`041:58`) — LLM extraction fidelity, **not** desirability scoring
of a person. The **only automated harvester** is `lead-harvest`, whose `BOARDS` array contains exactly
one entry: nzfarmingjobs.co.nz (`:34-50`). Facebook material enters solely by the founder manually
pasting into an admin UI behind a JWKS-verified admin JWT. The design doc is explicit: *"No unattended
scraping of groups the founder doesn't own — no lawful basis, not built, not configurable"*
(`.planning/PHASE-LEADS-DESIGN.md:105`). Contact details are captured **only when printed in the ad** —
"NEVER infer" is enforced in both prompts (`lead-harvest:71-73`, `lead-intake:420-423`). Nothing is
ever sent automatically: `lead-draft-email/index.ts:9` — *"this never sends anything"*; the founder
sends via `mailto:` (`AdminLeads.tsx:185-187`).

**Assessment (judgement).** IPP 1/2/4 (purpose, source, manner): **compliant** — collection of
business contact details from publicly available publications for directly related B2B outreach, with
a never-infer rule and a human approval gate. IPP 5 (security): **strong** — deny-all RLS, admin-gated
RPCs, service-role-only intake, audit logging, Vault-held cron secrets. IPP 10/11: **compliant**.
IPP 3 (notification): low residual risk; the cleanest cure is naming the source in the first outreach
message. Facebook platform terms: **low risk as built** — a human reading groups and pasting is not
automated scraping.

**The real gaps** are narrower than the brief assumed but genuine:
- **UEMA unsubscribe — P0-11 above.** The one hard legal breach.
- **P1 · Two retention leaks (IPP 9).** `lead-staging-purge` (jobid 5, live) never removes
  `review_status='approved'` staging rows — 2 live rows from 2026-06-11 still hold full contact
  details duplicating `leads`. And rows stuck at `outreach_status='drafted'` are exempt forever —
  2 live rows from 2026-06-27 will never age out. Both are one-line SQL changes to the cron.
- **P2 · Offshore processing undisclosed.** Anthropic receives ad text and contact details at draft
  time. Worth a line in the privacy policy (IPP 12 adjacency).

#### Verification documents — lifecycle

Access control is genuinely good: private buckets, own-folder writes, identity documents excluded at
**three** layers (RLS `020:34-36`, an equality check, and a whitelist at
`get-applicant-document-url/index.ts:231-245`), 15-minute URLs, and seekers can delete their own
documents (`SeekerDocuments.tsx:117-137`). **The weakness is the end of the lifecycle:**

- **P1 · Identity documents are kept indefinitely (IPP 9).** No purge after verification completes;
  live `cron.job` has nothing touching documents or storage. There is no in-app account deletion —
  `Privacy.tsx:95` directs requests to email and `:78-80` promises deletion — and while
  `seeker_documents` rows cascade on profile delete (`019:41`), **no code path removes the storage
  objects**. Orphaned passport scans would survive the row cascade. Whether an ops runbook covers this
  is **unverified**. Live volume today: 3 documents, 1 of them identity.
- **P1 · No audit trail of who viewed whose identity document.** The admin URL-mint branch
  (`index.ts:116-152`) writes no audit row; only approve/reject/request-more-info are audited
  (`033_admin_doc_rpcs.sql:96-103,143-150,186-193`). Live `admin_audit_log` contains only
  `lead_approve` (2 rows) — **zero document actions ever recorded.** Fix is ~5 lines. *Note: the admin
  queue UI as built has no view button (`AdminDocumentsQueue.tsx:244-281` renders only the three
  decision actions), so admins currently adjudicate without opening documents — the unaudited fetch
  path is live but UI-unused.*
- **P2 · No bucket-level size/MIME limits** — client-side only (`DocumentUpload.tsx:112`).

---

## 6 · Documentation-vs-reality delta

| # | Doc claim | Reality | Direction |
|---|---|---|---|
| D1 | `docs/_canonical/PRD.md:13,47` + Compendium `:40,62` — "**Claude-powered match scoring**", "core — not deferred" | Deterministic PL/pgSQL with fixed weights (`009:113-334`); Claude only narrates | **Doc overstates code** |
| D2 | Compendium `:3` — product state "**launched**" | `LAUNCH.md:5` — pre-launch, cold-start open; prod has 0 jobs | Doc stale |
| D3 | `AUDIT-AGENTIC-2026-06-10.md` — three open gates (`tsc -b`, no CI, bundle) | `tsc -b` = 0 errors; CI green with branch protection; bundle still monolithic | Doc stale (code improved) |
| D4 | `supabase/config.toml:12,20` — "Phase 18 hardening: **add** X-Webhook-Secret validation" | Already implemented (`notify-job-filled:118-130`, `send-followup-emails:177-189`), guarded by `tests/webhook-secret-presence.test.ts:19-36` | Doc stale (safe direction) |
| D5 | `config.toml:76-78` — the secret "**is ALSO validated**" in `send-document-status-email` | The handler explicitly declines, with sound reasoning at `:23-30` | **Doc asserts a control that does not exist** |
| D6 | `lead-draft-email/index.ts:173` — "deployed `verify_jwt=false`; WE verify" | Live flag is `verify_jwt: true` | Comment wrong (harmless double gate) |
| D7 | Compendium — horticulture/viticulture are "future v3.0+" | `FarmTypesStrip.tsx:8-9` advertises both; DB CHECK rejects both | Code contradicts doc, both directions |
| D8 | PRD — messaging is Growth phase, **tables only, no UI** | Tables live and attacker-writable (F-S2); `ForEmployers.tsx:26` promises "message" to employers | Code contradicts doc |
| D9 | Root `PRD.md` (384 lines, 2026-04-02) | Superseded by `docs/_canonical/PRD.md` (76 lines, 2026-06-22), never archived | Duplicate — the stale copy has the more obvious path |
| D10 | `030_rls_get_applicants_for_job_rpc.sql` on disk | Live `pg_proc` differs — patched by a migration with **no file in the repo** | **Repo does not describe production** |
| D11 | `.planning/gtm/eng-issues-to-create.md` — "`main` has zero branch protection AND red CI" | Both fixed 2026-07-29 (PRs #65–#67), protection verified via API | Doc stale *(self-authored — see §1)* |

---

## 7 · Folder & workspace hygiene

**Should not be in the tree:** `.tmp-audit/` (3.4 MB) and `docs/design/` (11 MB) are untracked **and
un-gitignored**, so they pollute every `git status`; likewise `content/`, `docs/index.docx`,
`docs/_canonical/TopFarms_Master_Report.docx`, `.claude/skills/playwright-skill/`. Root is a
documentation dumping ground: `AUDIT-AGENTIC-2026-06-10.md` (31 KB), `SPEC.md` (68 KB), `PRD.md`
(21 KB), `SENSE_CHECK_AUDIT_2026-05-01.md` (34 KB), `UAT_MASTER_REPORT.md` (30 KB), `audit-state.json`,
`next-steps.sh` — none belong at root when `docs/` exists.

**Duplicated:** root `PRD.md` vs `docs/_canonical/PRD.md` (D9). Two divergent PRDs, and the stale one
has the filename a newcomer opens first.

**Archive boundary:** `_archive/2026-06-20/` is correctly quarantined and the "do not cite" rule
holds. The leak is the *other* direction — superseded root docs were never moved into it.

**Missing:** an onboarding note recording the pooler-auth constraint and the Studio migration path
(the cause of P0-8); `RESEND_API_KEY` and the webhook secrets are absent from `.env.example`, which
lists only the three `VITE_*` client vars.

**What a new engineer misreads on day one:** opens root `PRD.md` and reads an April product
definition as current → reads the canonical PRD and believes scoring is Claude-powered → reads the
compendium header and believes the product has launched → reads `config.toml` and believes one
function has a secret gate it lacks and two lack gates they have → clones, tries to stand up a
database, and discovers it is not reproducible, with no note saying so → follows `CLAUDE.md` to
`.mcp.json` and finds it gitignored and absent.

---

## 8 · What is genuinely good

Short, specific, and here so remediation does not break it.

- **`supabase/functions/get-applicant-document-url/index.ts`** — the best-authored file in the repo.
  Six independent authorization layers, correct gateway-trust JWT handling with `aud` validation,
  explicit identity-document rejection *plus* a whitelist. **The template for every P0 fix above.**
- **The RLS design on tenant tables.** Every ownership chain resolves through
  `employer_profiles.user_id = auth.uid()`. Column-level grants excluding `stripe_customer_id` are a
  sophisticated touch most teams never reach for.
- **All 64 definer functions pin `search_path`**, and `_admin_gate()` is a single correct admin choke
  point applied at 45 sites.
- **`stripe-webhook` signature verification** and **`lead-intake`'s genuine JWKS verification** — both
  do the hard thing rather than the convenient thing.
- **Deny-all posture on the leads pipeline** — five tables, zero policies, definer-RPC-only.
- **`src/pages/jobs/JobSearch.tsx:788-800`** — the cold-start empty state distinguishes "no jobs
  exist" from "your filters excluded everything", uses honest copy, and converts the dead end into an
  employer CTA. **This is the state most launch-day visitors will see, and it is the best-designed
  state in the app.**
- **`src/components/ui/MatchBreakdown.tsx`** — the 7-dimension score explanation with per-dimension
  context for low scores. This is what makes a match number defensible rather than oracular.
- **`src/components/ui/Button.tsx` / `Input.tsx` / `Select.tsx` / `Pagination.tsx`** — one primitive
  each, Radix labels wired via `htmlFor`, 44 px mobile targets, proper `focus-visible`.
- **`tests/webhook-secret-presence.test.ts`** — a regression guard on a security control.
- **The `it.todo` list.** 117 unwritten tests honestly *declared* rather than silently absent — a rare
  and genuinely useful form of intellectual honesty.

---

## 9 · Score arithmetic

**Domain 1 — Architecture**

| Dimension | Wt | Score | Weighted |
|---|---|---|---|
| Data model integrity | 20 | 60 | 12.00 |
| Boundaries & coupling | 15 | 60 | 9.00 |
| Edge Function design | 15 | 45 | 6.75 |
| Integration robustness | 15 | 45 | 6.75 |
| Client state & data flow | 10 | 60 | 6.00 |
| Observability & operability | 10 | 30 | 3.00 |
| Testing & CI | 10 | 50 | 5.00 |
| Scalability posture | 5 | 60 | 3.00 |
| | | | **51.5 → 52** |

**Domain 2 — Design** · tokens 20×55=11.00 · a11y 20×35=7.00 · hierarchy 15×70=10.50 · components
15×70=10.50 · responsive 15×50=7.50 · states 10×60=6.00 · brand 5×80=4.00 → **56.5 → 57**

**Domain 3 — Product** · two-sided 20×70=14.00 · funnel 20×45=9.00 · monetisation 20×25=5.00 ·
cold-start 15×60=9.00 · trust 10×25=2.50 · scope 10×35=3.50 · admin 5×85=4.25 → **47.25 → 47**

**Domain 4 — Security** · authz 25×40=10.00 · authn 15×70=10.50 · secrets 15×70=10.50 · PII 15×55=8.25
· exposure 15×55=8.25 · injection 10×55=5.50 · deps 5×80=4.00 → 57.00 → **capped at 55** (P0-2).

**Composite** = 55(.35) + 52(.30) + 47(.20) + 57(.15) = **52.8 → 53/100**

---

## 10 · Prioritised remediation roadmap

### Pre-launch (must) — sequenced by dependency

| Seq | Item | Effort |
|---|---|---|
| 1 | **Extract the shared authorization helper** (`_shared/`), port from `get-applicant-document-url` | 3 h |
| 2 | Apply it to `generate-candidate-summary`, `generate-match-explanation` (P0-2) | 2 h |
| 3 | Apply it + server-derive `amount_nzd`/`fee_tier` in `acknowledge-placement-fee` (P0-3) | 3 h |
| 4 | Apply it to `create-payment-intent`; bind `employer_id` to caller (P0-2) | 1 h |
| 5 | **Decide the CV/contact product question**, then implement (P0-1) | 4 h + decision |
| 6 | Gate the email in `get_applicants_for_job` (P0-5) — *must follow 5, same decision* | 2 h |
| 7 | Restrict `set_user_role`; add ownership predicate to `seeker_skills` (P0-6) | 4 h |
| 8 | Free-listing ledger or restrict `jobs` DELETE (P0-4) | 2 h |
| 9 | Employer verification → `pending` + admin transition; fix anon policy (P0-9) | 4 h |
| 10 | Delete the fabricated stats block (P0-10) | 0.5 h |
| 11 | UEMA unsubscribe + sender identification (P0-11) | 0.5 h |
| 12 | Reconcile the migration ledger; commit the two orphans (P0-8) | 4 h |
| 13 | **Stripe live keys + webhook registration + one real charge → refund (P0-7)** — *do this last, after 1-12, so the first real transaction runs against fixed code* | 1 h |

**Total P0: ≈ 31 h ≈ 4 focused days.** With verification, regression testing and one product decision,
**budget 6–8 working days to a defensible launch.**

### First 14 days post-launch (P1)
Error tracking + real `<ErrorBoundary>` · warn/info contrast tokens · brand-hover for text/CTAs ·
stack the two 260 px sidebars · un-nest and enlarge the save button · real error state on applicant
fetch failure · stop rendering sub-60 humans in red · `messages` INSERT thread predicate ·
`employer_verifications` anon policy · identity-document retention + admin view audit row ·
leads retention gaps A and B · wire or delete `send-followup-emails` · add a `paid_at` column and
handle `invoice.payment_succeeded`.

### Quarter 1 (P2)
Security headers in `vercel.json` · `MotionConfig reducedMotion="user"` · focus traps + global
`:focus-visible` · inline-style consolidation · `JobCard`/`SearchJobCard` merge · seeker column grants
on `applications` · revoke default `GRANT ALL` · vendor-chunk splitting · write down the 117 `it.todo`
tests, starting with match-scoring and the webhook · dedupe root docs into `docs/`.

### Ten quick wins, each under 30 minutes
1. Delete `JobStep8Success.tsx:75-91` (fabricated stats) — **also a P0.**
2. Add the unsubscribe line to `OUTREACH-EMAIL.md` + both system prompts — **also a P0.**
3. `Tag.tsx:13` → add `--color-info-text-on-bg` and use it (fixes the visa chip).
4. Delete the unused `orange` Tag variant (`Tag.tsx:14`).
5. `EmployerDashboard.tsx:618-619` → `bg-danger`, drop the Bootstrap hex.
6. `border-t-moss` → `border-t-brand` in `ProtectedRoute.tsx:19,47` + `SelectRole.tsx:20` (makes the
   spinner actually spin).
7. Wrap the app in `<MotionConfig reducedMotion="user">`.
8. `REVOKE EXECUTE ON admin_leads_staging_list FROM anon, PUBLIC`.
9. Add a `headers` block to `vercel.json` (CSP-report-only, X-Frame-Options, nosniff, Referrer-Policy).
10. Archive root `PRD.md`; add `.tmp-audit/`, `docs/design/`, `content/` to `.gitignore`.

---

## 11 · The three questions

### 11.1 Launch in seven days — what would you fix, what would you knowingly accept?

**Fix, without negotiation:** the four Edge-Function authorization holes (P0-2/3), the placement-fee
amount derivation, the fabricated stats, the UEMA line, `set_user_role`, and the Stripe key swap. That
is roughly 15 of the 31 hours and it is achievable in seven days.

**Consciously accept, with the reasoning written down:** the contrast failures, the two mobile
sidebars, the migration ledger, the >100 score, and the absent test coverage. These are real and they
are P1 — but at Option A quiet-launch volumes, with hand-recruited employers you are personally
speaking to, they degrade experience rather than cause loss.

**The one that is neither** is P0-1, the CV paywall. It cannot be *fixed* in seven days because it
needs a product decision, not code. So decide it in week one: either redact contacts from
pre-placement CVs, or accept that CVs are open and reprice around listings. **What you must not do is
launch, take placement-fee money from the first few employers, and then discover the fee was optional
all along** — that is the version where you have to claw back trust from the exact people you most
need.

Framing that matters: with 0 jobs and 6 users, most of these findings are *latent*, not active. Risk
is a function of traffic and you currently have none. That is a genuine advantage — use it to fix the
enforcement layer before volume arrives, not as a reason to defer.

### 11.2 What is most likely to blow up in month one that you are not thinking about?

**Not a security breach — a collections failure.**

The placement fee is invoiced Net 14. `send-followup-emails` — the chaser — **has never fired**, has
no caller, and nobody noticed for the ~14 months since migration 011. Simultaneously,
`invoice.payment_succeeded` only writes a log line, and `placement_fees` has **no paid column at all**.
So: you cannot chase an unpaid invoice automatically, and you cannot produce a list of who owes you
from the database. Three placements in month one is $600–$2,400 outstanding, invisible, and unchased,
discovered when you manually reconcile Stripe — if you think to.

This is the blind spot because every review so far has asked "can we *charge*?" and none has asked
"can we *collect*?" A marketplace that bills on trust and cannot see its own debtors does not find out
it has a problem until the quarter closes.

*(The runner-up, and the reason P0-1 is ranked first in §4: the CV bypass spreading socially through a
small farming community. That is a slower fuse but a permanent one.)*

### 11.3 The single highest-leverage architectural change — and what does *not* need changing

**Do this: extract one shared authorization helper into `supabase/functions/_shared/` and route every
service-role function through it.**

It closes four P0s at once, but that is not why it is the highest-leverage change. The reason is that
`get-applicant-document-url` proves the team already knows exactly how to do this correctly — six
layers, gateway-trust decode, ownership chain, whitelist. The knowledge exists; it just was never made
*reusable*, so each new function re-derived the problem and four of them got it wrong. Extracting the
helper converts a per-function judgement call into a default. Function #15 then inherits correctness
instead of re-litigating it. Every hour spent here pays back on every function you write afterwards.

**Do NOT do this: rewrite the client state layer.** 917 inline styles, no TanStack Query, 27
`set-state-in-effect` warnings — it looks like the obvious modernisation, and it is a trap. It works,
it is typed, `tsc -b` is clean, and 484 tests are green. Rewriting it touches every page, delivers
nothing a user can perceive, and creates a large regression surface across exactly the flows you most
need stable at launch. Consolidate opportunistically when you are already in a file; never as a
project.

**Second thing not to change: the RLS layer.** It is the best-engineered part of this system. When you
fix the Edge Functions, the temptation will be to "simplify" policies to match. Resist it — the
policies are not the problem, the code that bypasses them is.

---

*Report ends. Findings without a `file:line` or quoted command output are labelled unverified and
listed in §1. Nothing here was fixed as part of this audit; the only file written was this one.*
