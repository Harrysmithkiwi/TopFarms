# LAUNCH.md — TopFarms Launch Readiness Backlog

> ## ⚠️ NOT the source of truth for launch readiness. Two banners below say so.
>
> **The live figure is 72/100, engineering ceiling ~81**, and it lives in
> **`.planning/PRE-LAUNCH-CHECKLIST.md`** — the honest eight-dimension re-walk of
> 2026-08-21. That file owns the number; this one is a closed backlog.
>
> This header used to open with **93/100** and then correct itself four lines later, so a
> reader who stopped at the top left with a figure 21 points optimistic and five weeks old.
> Six different scores appear across this repo's live documents. That is the defect the
> documentation audit (`docs/DOC-AUDIT-2026-08-25.md` §1) exists to end: **one score, one
> file, everywhere else cites it.**
>
> Kept as a decision record — the item-by-item evidence below is real and 25 documents cite
> it. Read it for *what was fixed and how it was proved*, never for *where we are*.

Historical backlog. An item is ticked ONLY when fixed **and** independently verified on production (evidence linked). Findings reference `UAT_MASTER_REPORT.md`.

**Checklist score at close: 62/100 → 93/100** (verified on production 2026-07-23; hardening batch PRs #48–#49 + migrations 059/060). See the correction immediately below — this measured the checklist, not the product.

> ### ⚠️ SUPERSEDED 2026-07-30 — why the 93 above is not a readiness score
>
> An adversarial four-domain audit at commit `8f5b860` scored TopFarms **53/100**
> (Security 55 · Architecture 52 · Product 47 · Design 57) — see
> **`docs/AUDIT-PRELAUNCH-2026-07-30.md`**.
>
> **This is not a contradiction.** The 93 is an accurate score of *this checklist* — every
> item below was genuinely closed and evidenced. What it never asked was whether
> authorization and revenue enforcement hold up against a hostile user. They do not:
>
> - The CV releases the phone/email the placement fee exists to sell — no fee predicate on
>   `seeker_documents`, and the CV is the **default** tab.
> - Two Edge Functions read/write across tenants with the service-role key and **zero**
>   caller check (incl. `visa_status`).
> - Placement fee `amount_nzd` is computed in the browser and trusted server-side.
> - "First listing free" resets when a job is deleted.
> - Any user can `set_user_role('employer')` and read every open-to-work seeker.
> - The "verified employer" badge is self-service.
> - **Production runs Stripe TEST keys** — `listing_fees` and `placement_fees` are both 0
>   rows; the revenue path has never executed.
>
> **Do not launch against the 93.** The uplift programme to ≥90 across all four domains is
> `docs/UPLIFT-ROADMAP-2026-07-30.md` (8 phases, ~150 h). Live Stripe keys are deliberately
> the *last* step (Phase 7), after every revenue fix is proved in test mode.
>
> **Phase 0 (foundations) — COMPLETE 2026-07-30**, PRs #68–#72, `main` green at `c23e205`,
> 484 → 527 tests. Delivered: last fabricated stats removed (verified absent from the built
> bundle); UEMA unsubscribe compliance across all three outreach surfaces; migration ledger
> reconciled 45 → 67 rows with a CI drift guard; error boundary so crashes stop rendering as
> 404s; Stripe test harness + first automated webhook coverage; token/hygiene fixes.
> Carry-forward is tracked in the roadmap, not here.

---

## Readiness rerun — 2026-08-11, against live prod at `dac7e06`

**Both standing scores above were stale.** The 93 predates the adversarial audit; the 53 predates
uplift Phases 1–5, which have all since landed. This rerun re-tested the severe findings against
live production state rather than trusting either number or any commit message.

**Prod == main, proved by content not status.** `EmployerOnboarding-DiFTwXT7.js` is **byte-identical**
(`cmp`) between the local build of `dac7e06` and what prod serves. A first attempt polled `/`'s
asset hashes and saw no change for 10 minutes — `/` is code-split away from every file in the
commit, so its bundle is genuinely unchanged. *Choosing a signal the change cannot reach reads
exactly like a failed deploy.*

### The four severe findings from `AUDIT-PRELAUNCH-2026-07-30.md` — all closed, verified live

| Finding | State | Evidence |
|---|---|---|
| CV releases the contact the placement fee sells | ⚠️ **partially closed — corrected 2026-08-11, see the probe below** | A server-enforced predicate now exists (`employer_has_placement_access`), which closes the *tampering* half. But that function tests `acknowledged_at IS NOT NULL` — **acknowledgement, not payment** — so the contact is still released before any money moves. |
| Any user can `set_user_role('employer')` and read every open-to-work seeker | ✅ closed | live `prosrc`: requires `auth.uid()`, whitelists `('employer','seeker')`, and is **first-assignment-only** — a second call raises `42501` |
| Two Edge Functions cross-tenant with service-role and zero caller check | ✅ closed | `stripe-webhook` verifies `stripe-signature` against `STRIPE_WEBHOOK_SECRET`; `lead-harvest` checks `x-webhook-secret` against `LEAD_INTAKE_SECRET` (`index.ts:123-124`). Both `verify_jwt=false` deliberately, documented in `config.toml` |
| Placement fee `amount_nzd` computed in the browser | ✅ closed | uplift Phase 2 Task 2.1, PR #77 — server-derived |

**A correction on my own method:** a grep for caller-guard identifiers reported both Edge Functions
as unguarded. Both are guarded; the pattern simply did not include `x-webhook-secret` or
`stripe-signature`. The grep was the false positive, not the code.

### Measured this run

- **Supabase advisors: 0 ERROR, 71 WARN, 10 INFO.** `authenticated_security_definer_function_executable`
  fell **67 → 65** — exactly the two functions revoked in `080`, independent confirmation that landed.
- **5 anon-executable definer functions are a non-finding.** Three return `trigger`, so they cannot be
  invoked by PostgREST or directly; the other two (`get_platform_stats`, `employer_has_public_job`)
  are deliberately public.
- **E2E against live prod: 37 passed, 0 failed, 6 skipped.** All six skips need an active listing.
- **a11y sweep: 27 passed** at 1200px and 360px, `/onboarding/employer` and `/onboarding/seeker` green.
- **Truth pass holds:** no `500+`, `2,000+`, `hundreds of farms` or `85%` in the served landing page.
- **Infra plumbing:** `/robots.txt`, `/sitemap.xml` (7 urls), `/llms.txt`, `/favicon.svg`, `/privacy`,
  `/terms` all 200.

### New finding this run

- [ ] **S1. `/definitely-not-a-page` returns HTTP 200, not 404** — soft 404. The branded page renders
  correctly ("This paddock's empty", no dev error screen), which is all B3 ever checked; the **status
  code** was never asserted. Search engines will index nonexistent URLs as valid pages. Engineering-owned,
  **not launch-blocking** — week one. The catch-all falls through to the SPA shell, which Vercel serves
  200; the fix belongs with the hybrid SSR route config, not the component.
- [ ] **S2. One RLS policy is `TO public` where the regime says `TO authenticated`** —
  `seeker_documents: employers select applicant visible documents`. **Not exploitable**
  (`get_user_role(auth.uid()) = 'employer'` is false for anon), but inconsistent with the hardening
  regime. Tidy-up, not a defect.

### Score — 2026-08-11

| Domain | Score | Why |
|---|---|---|
| Security & authorization | **92** | 0 ERROR advisors; every severe finding re-verified closed against live catalog; last vestigial grant revoked. Open: leaked-password protection off (operator toggle), S2. |
| Architecture & infra | **90** | prod == main byte-proved; SSR live; error boundary, offline banner, ledger drift guard, full SEO plumbing. Open: S1 soft 404. |
| Design & accessibility | **90** | axe clean on every swept route at both widths; form primitives now carry names, required and error association. Open: `color-contrast` on wizard step 8, `landmark-unique`, the 14px/16px ramp rulings. |
| **Product & revenue** | **55** | **The weak domain, and it is not a code defect.** 0 jobs · 0 applications · 0 `listing_fees` · 0 `placement_fees` · 0 `employer_entitlements` · 0 `placements`. The revenue path has never executed even in test mode, and the employer/seeker lifecycle cannot be walked end to end without inventory. |

**Engineering-owned readiness: 91/100** — holds the standing bar.
**Whole-business launch readiness: ⚠️ not ready**, and no amount of engineering moves it.

**Recommendation: ⚠️ Ready with human-owned blockers.** The platform is sound. What is unproven is
everything that needs a real listing to exist. Directive §1.15 forbids seeding production, so this
cannot be closed by engineering — **note this prompt's §3 explicitly authorises seeding, and
`CLAUDE.md` overrides it.** That conflict should be resolved in the prompt.

**Gating on a human, in order of leverage:** go-live ticket 01 (inventory ruling — nothing downstream
starts without it) · ~~ticket 02~~ ✅ **CLOSED 2026-08-11** — Site URL moved to `www`; `redirect_to` now honoured,
verified landing on `https://www.topfarms.co.nz/reset-password` where it previously fell back
to the apex · PEND-01 (Stripe test→live) · legal review
· ticket 04 purge.

---

## Revenue-path probe — 2026-08-11, live prod, Phase A (no Stripe call)

First execution of the placement chain in production history. Ran through the **real
RLS-enforced path with real user JWTs**, not service role: employer published a job → seeker
applied → employer acknowledged the placement fee. **Fully torn down**; every table verified
back to its pre-probe count (jobs 0, applications 0, placement_fees 0, placements 0,
match_scores 0, listing_fees 0).

### ✅ Server-derived pricing is real — proven, not asserted

The acknowledge call deliberately carried **tampered** values: `fee_tier: 'entry'`,
`amount_nzd: 1`. The row written was **`senior` / `80000` cents ($800)**, derived from the job
(`Farm Manager`, $60–70k → avg $65k → `experienced`, then the "Manager" keyword bumps to
`senior`). The server ignored the body entirely. Uplift Task 2.1 holds under adversarial input.

### 🔴 R1. The paywall releases on acknowledgement, not payment

**This corrects the row above, which I had marked closed.** Measured live: after acknowledging —
a free, self-service action with no money moved — the employer could read
`seeker_contacts.email`. The gate function is exactly:

```sql
SELECT EXISTS (SELECT 1 FROM placement_fees pf … WHERE ep.user_id = auth.uid()
  AND pf.seeker_id = p_seeker_id AND pf.acknowledged_at IS NOT NULL);
```

`acknowledged_at IS NOT NULL` — not `paid_at`, not even `confirmed_at`. So an employer clicks
"I hired them", receives the contact and CV immediately, and the invoice is a **promise**.
Nothing technical prevents never paying.

**This is probably the deliberate Option C product decision** (trust-then-invoice — the 7d/14d
followup crons exist for exactly this), so it is filed as a **business risk to confirm, not a
bug to fix**. But it is the single largest revenue leak in the model and it is now demonstrated
rather than theorised. **Operator: confirm this is the intended model.**

*Method note:* `seeker_documents` returned empty for the probe seeker and I nearly reported the
CV as "still gated". It is not — that seeker simply has **0 documents**. The CV rides the same
acknowledgement gate as the contact. An empty result is not a denial.

### 🟠 R2. `E2E_SEEKER_EMAIL` is the operator's personal account, not `+ci-seeker`

`.env` points the seeker E2E role at `harry.symmans.smith@gmail.com`, which carries a real
onboarded profile from 2026-05-05. `+ci-seeker` exists with the seeker role but **has never
onboarded** (no `seeker_profiles` row, no `seeker_contacts` row). So the E2E suite has been
exercising the operator's own profile. The probe was reworked to *read* that profile and never
create or delete it. **This invalidates a ticket-04 assumption**: purging on the belief that
`+ci-seeker` is the E2E seeker would leave CI green but pointed at personal data — or break it.

### ✅ R3. RESOLVED 2026-08-11 — matching works; the probe deleted its own evidence

**Not a defect — a measurement error, mine.** The probe inserted the job `active` (which fires
`job_match_rescore` and writes the scores), then patched it to `draft` to pull it off the board.
That fires `cleanup_match_scores_on_status_change`, whose guard is
`OLD.status = 'active' AND NEW.status IS DISTINCT FROM 'active'` → `DELETE FROM match_scores`.
The count was taken *after* the withdrawal, so it read the deletion, not a failure.

Re-run counting **before** withdrawal:

```
match_scores while ACTIVE:      3 rows — scores 55, 64, 58 across all three seekers
match_scores after WITHDRAWAL:  0 rows
```

**The match engine is fine**, and the dependency the whole seeker plan rests on is clear.
`profile_complete_pct = 0` does not gate scoring; the real filter is
`WHERE NEW.sector = ANY(sp.sector_pref)`, and all three seekers carry `["dairy","sheep_beef"]`.

**One real consequence for the seeker funnel, though:** `sector_pref` is the only thing standing
between a seeker and every match. A thin two-minute onboarding that skips it produces a profile
that matches *nothing* — so sector must be in the minimum capture, alongside region and role.

### ✅ Phase B — the Stripe half, run 2026-08-11. The revenue path works end to end.

**Test mode confirmed by evidence, not assumption:** the hosted invoice URL Stripe returned is
`invoice.stripe.com/i/…/test_…`. That is the proof; everything before it was inference.

State written, then removed:

| Field | Value |
|---|---|
| `fee_tier` / `amount_nzd` | `senior` / `80000` (= $800) — **body again sent `entry` / `1`, again ignored** |
| `stripe_invoice_id` | `in_1U34IuRpIiAQpOa7zzJznHFi`, status `open` |
| `acknowledged_at` / `confirmed_at` | both set |
| `paid_at` | `null` — correct, the invoice is open and unpaid |
| `placements` | **1 row, `employer_confirmed_at` set — the first placement in production history** |

### 🔴 R4. The test→live swap must NULL `employer_profiles.stripe_customer_id` (PEND-01)

`create-placement-invoice` creates a Stripe customer and **caches its id on the employer
profile**, reusing it on every later invoice. A test-mode customer id **does not exist in live
mode**, so after the key swap the first live invoice for any previously-test employer fails at
customer lookup. Add to the PEND-01 checklist:

```sql
UPDATE public.employer_profiles SET stripe_customer_id = NULL;
```

Found because the probe left exactly this residue on `+ci-employer`; cleared via migration
`clear_test_mode_stripe_customer_id_probe_residue`. One row today, every transacting employer
later.

### 🟠 R5. The Stripe MCP is connected to a different account than production uses

MCP session account: `acct_1SyPEB2LRklZaY5B` ("TopFarms", livemode false). The invoice
production actually created landed in **`acct_1SyPEbRpIiAQpOa7`** — and the MCP account lists
**0 invoices** before and after. So prod's `STRIPE_SECRET_KEY` belongs to a different Stripe
account, and the connector can neither verify nor manage production's Stripe state.

**This matters for PEND-01:** confirm *which* account goes live, and that its live keys are the
ones that land in Supabase secrets. Two TopFarms-ish Stripe accounts is itself worth resolving.

### Left behind, deliberately

Test invoice `in_1U34IuRpIiAQpOa7zzJznHFi` is still `open` in production's Stripe **test**
account. It cannot be voided from here (wrong account, see R5). Harmless test data — void it in
the dashboard if you want a clean test ledger.

### Prod state after teardown — verified, not assumed

`jobs 0 · applications 0 · placement_fees 0 · placements 0 · match_scores 0 · listing_fees 0 ·
profiles_with_stripe_customer 0`, seeker_profiles 3 and employer_profiles 2 unchanged. Identical
to the pre-probe baseline.

## 🔴 Launch blockers (engineering-owned) — ALL CLOSED

- [x] **B1. Privacy Policy page** (TF-001) — `/privacy` live, NZ Privacy Act 2020 draft content. _Flag O1: legal review._ ✔ prod title "Privacy Policy — TopFarms".
- [x] **B2. Terms of Service page** (TF-001) — `/terms` live. _Flag O1._ ✔ prod.
- [x] **B3. Custom 404 + router errorElement** (TF-002) — `*` route + root `errorElement`. ✔ prod `/definitely-not-a-page` → "This paddock's empty", no dev screen. Screenshot `10-prod-404-fixed.png`.
- [x] **B4. Signup consent links** (TF-012) — Terms/Privacy are real `/terms` `/privacy` links (new tab). ✔ verified on prod signup.
- [x] **B5. Sector counts** (TF-003) — hardcoded 12/8/5/3/4 removed. ✔ no "N listings" in rendered home.
- [x] **B6. Auth panel stats** (TF-003) — "500+/2,000+" gone (16 regions / 5 sectors / Free). ✔ `has500:false, has2000:false` on prod.
- [x] **B7. PostJob 500+** (TF-003) — replaced with honest "Free / Matched / 30 days". ✔ seen live in wizard.
- [x] **B8. "hundreds of farms"** (TF-003) — removed from /for-employers.
- [x] **B9. Demo panels = examples** (TF-004) — Example badges on Home mock dashboard + match browser; both `aria-hidden`. ✔ 3 Example badges rendered.
- [x] **B10. Favicon** (TF-005) — TopFarms leaf mark replaces vite.svg. ✔ prod `favicon.svg` 200.
- [x] **B11. Per-route meta** (TF-005) — `usePageMeta` on home/pricing/for-employers/jobs/legal/auth. ✔ distinct titles verified.
- [x] **B12. robots.txt + sitemap.xml** (TF-021) — real static files. ✔ prod robots serves directives, SEO Lighthouse 100.
- [x] **B13. Password policy** (TF-010) — min 10 + letter + number. ✔ tsc + schema.
- [~] **B14. Leaked-password protection** (TF-011) — **DEFERRED for MVP (accepted risk).** The Supabase toggle is **Pro-plan-gated** ("Only available on Pro plan and above"); operator is not upgrading to Pro for launch (2026-07-23). Mitigation: app already enforces min-10 + letter + number (B13) — the weakest/most-guessable passwords are blocked. Revisit ~3 months post-launch (≈ Oct 2026) alongside a Pro-upgrade review. See O5.
- [x] **B15. Landing CTAs → signup** (TF-004) — `/onboarding/*` CTAs now `/signup?role=…`. ✔ `onboardingLinks:0` on prod home.

## 🟠 High (engineering-owned) — ALL CLOSED

- [x] **H1. Footer dead links** (TF-006) — Help Center/About removed; Pricing added.
- [x] **H2. Jobs empty-state** (TF-007) — true empty-marketplace copy + Most Recent default sort for anon; Match Score hidden when logged out. ✔ verified.
- [x] **H3. `<main>` landmark** (TF-019) — Home/for-employers/pricing/legal/404 wrap `<main>`. ✔ prod `hasMain:true`; Lighthouse landmark pass.
- [x] **H4. Color-contrast** (TF-020) — eyebrows brand-700/brand-300, tab, watermarks aria-hidden. Accessibility 95 → 96. (12 decorative/brand-chip nodes remain; above the ≥95 gate.)
- [x] **H5. `aria-expanded` mobile menu** (TF-009). ✔
- [x] **H6. Job-id UUID guard** (TF-008). ✔
- [x] **H7. `marketplace_employer_profiles` review** (TF-014) — **CONVERTED to security_invoker** (migrations 059+060, PRs #48/#49). Backed by a real "has a publicly-visible job" SELECT policy + column grants: anon sees only the 10 marketplace columns; authenticated everything except `stripe_customer_id` (now server/admin-RPC-only). ✔ advisor `security_definer_view` ERROR gone; anon/seeker/employer REST probes green; E1 seeker path re-verified.
- [x] **H8. Restrict `get_user_role` from anon** (TF-015) — done (migration 059). All 18 `get_user_role`-referencing policies scoped `TO authenticated` first, then EXECUTE revoked from anon/PUBLIC. ✔ anon RPC → 42501; anon jobs board + `get_platform_stats` unaffected (live probes).

## 🟢 Live E2E verification (UAT accounts) — DONE

- [x] **V1. UAT accounts** — employer/seeker/admin provisioned + email-confirmed (see table).
- [x] **V2. Employer journey** — 8-step onboarding → post job (7-step wizard) → edit (fixed 2020 start date via Edit) → preview → publish (free first listing) → pause → resume → archive-confirm → applicants → shortlist (with $800 placement-fee + contact-release gate). ✔ Job live publicly. Screenshots `11-job-preview.png`, `12-job-live-public.png`.
- [x] **V3. Seeker journey** — 7-step onboarding → search (match sort) → save job → apply (cover note) → withdraw → **re-apply** (now works) → My Applications tracking. ✔
- [x] **V4. Admin journey** — admin login → Daily Briefing (real counts) → Seekers/Employers/Jobs/Documents lists → all RPCs repaired and loading. ✔
- [x] **V5. Seeded realistic NZ data** — Karapiro Flats Dairy Ltd (Waikato, 420-cow rotary) + Herd Manager listing + 1 seeker + 1 shortlisted application. (Single realistic thread, not bulk — see O3.)
- [x] **V6. Regression** — marketing + auth surface re-checked post-deploy (bundle index-BRMuAfti).
- [x] **V7. Post-fix Lighthouse** — mobile: SEO **100**, Accessibility **96**, Best Practices **100**.

## Bugs found & fixed DURING live E2E (not in original audit)

- [x] **E1. Seeker onboarding completion crash** — `Cannot read properties of null (reading 'farm_name')`; RLS blocked the direct employer_profiles embed. Fixed via marketplace view + null guard (PR #42).
- [x] **E2. Admin lists unrunnable (42703)** — `admin_list_seekers`, `admin_get_user_profile`, `admin_list_document_queue`, `get_applicants_for_job` referenced dropped columns (schema drift). Repaired, migrations 057/058, applied to prod (PR #44).
- [x] **E3. Withdraw permanently locked re-apply** — UNIQUE(job_id,seeker_id) + insert. Now upserts; applied-state checks exclude 'withdrawn' (PR #43). ✔ re-apply verified live.
- [x] **E4. Applicant QUICK STATS hid under-review candidates** — 'Applied' recomputed as all live applicants, relabelled 'Active' (PR #44).
- [x] **E5. Dead "View Farm Profile" link** — `/farms/:id` had no route; removed (PR #43).
- [x] **E6. Wizard micro-stat fabrications** — 76%/40%/30%/2x/"market rate $55–75k" replaced with honest copy (PR #43).
- [x] **E7. Withdraw copy** "cannot be undone" corrected (re-apply now possible).

## ⚪ Human / business-owned (do not block engineering completion)

- [x] **O1. Legal review of Privacy/Terms** — operator accepted the drafted NZ `/privacy` + `/terms` as-is for launch (2026-07-23). Contact address confirmed as **hello@topfarms.co.nz** — already the only contact email in Privacy, Terms, 404, and Suspended pages (verified by codebase sweep; no change needed).
- [x] **O2. Purge UAT test data** (TF-018) — DONE 2026-07-23. `DELETE FROM auth.users` for the 3 UAT ids executed via write-capable connector; cascade removed the Karapiro farm, both seeded jobs (`b031bf38-…` + Copy `7fe47c88-…`), the application, 4 match scores, 5 seeker skills, listing/placement fees, saved job, 3 role rows. ✔ read-back: `uat_users_remaining=0, karapiro_farm=0, seeded_jobs=0, orphan_applications=0, orphan_match_scores=0`; DB 9→6 users, 5→3 jobs. **Still open:** 3 legacy test jobs on the operator's *personal* accounts (not UAT) — see note below.
- [~] **O3. Marketplace cold-start** — direction chosen 2026-07-23: **Option A** (launch quiet, hand-recruit the first real listings, then market). Public board is a clean 0-active cold-start. **Tooling shipped to enable it** (Leads pipeline v2, PR #54, migrations 061/062): outreach email template (`docs/OUTREACH-EMAIL.md`), staging-queue segmentation (expired + international badges/filters), and a screenshot/text manual drop-in — all verified live. **Remaining is human:** operator approves the ~19 contactable-farm shortlist in `/admin/leads/staging` and sends the personalised outreach (founder-to-farmer, by hand). Then real listings fill the board.
- [x] **O4. Post-launch security hardening batch** — DONE 2026-07-23 (migrations 059/060, PRs #48/#49): get_user_role anon revoke (H8/TF-015 ✔), marketplace view → security_invoker (H7/TF-014 ✔), pg_trgm → `extensions` schema (TF-017 ✔, `similarity()` smoke-tested via compute_match_score=77), deny-all table docs (TF-016 ✔, see "Intentionally deny-all tables" below). Post-migration advisor sweep: `security_definer_view` ERROR and `extension_in_public` WARN cleared; only intentional `get_platform_stats` anon WARN + leaked-password WARN (O5) remain.
- [~] **O5. Supabase leaked-password protection** (B14/TF-011) — **DEFERRED (accepted MVP risk, 2026-07-23).** Toggle lives in Auth → Sign In/Providers → Email → "Prevent use of leaked passwords" but is **Pro-plan-only**; operator declined the Pro upgrade for MVP. Server-side password floor also left as-is for MVP (min length 6, no character-class requirement) — the app's own min-10 + letter + number policy (B13) is the enforced control at the UI. **3-month post-launch review (≈ Oct 2026):** revisit Pro upgrade → enable leaked-password check; optionally raise server min length to 10 + require letters+digits to match the app policy at the API layer.
- [x] **O6. Feature gap: "Duplicate job"** — BUILT (PR #48). JobCard "Duplicate" action copies the listing (minus server-managed fields; start_date deliberately dropped) + its job_skills into a new draft and opens the edit wizard. ✔ verified live: draft `7fe47c88-…` created with all step-2+ fields intact, toast shown, wizard opened. (Original job has 0 job_skills rows so the skills-copy path ran against an empty set — code path exercised, trivially.)
- [x] **O7. Hardening: lazy-chunk load failure = infinite spinner** — FIXED (PR #48). `lazy()` wrapper in main.tsx: on import failure, one forced reload per session (fetches the fresh index + chunk names), then falls through to the router errorElement. ✔ marker string verified in prod bundle `index-kz5ujToH.js`.
- [x] **O9. Past start dates accepted by job wizard** (UAT Part 2 open finding) — FIXED (PR #48). Native `min=today` on the date input + zod refine (timezone-proof string compare) as depth. ✔ verified live: 01/01/2020 blocked at submit, 01/09/2026 advances.
- [ ] **O8. Minor: applicant AI summary renders empty** — "Analyzing candidate fit…" resolves to blank; low priority.

## UAT accounts (created 2026-07-23 — ✅ PURGED 2026-07-23, see O2)

| Role | Email | Password | Status |
|---|---|---|---|
| Employer | uat.employer@topfarms.co.nz | UAT-Employer-2026!kea | ✅ DELETED |
| Seeker | uat.seeker@topfarms.co.nz | UAT-Seeker-2026!tui | ✅ DELETED |
| Admin | uat.admin@topfarms.co.nz | UAT-Admin-2026!ruru | ✅ DELETED |

All associated data cascade-deleted (Karapiro farm, both jobs, application, match scores, skills, fees). Read-back verified all-zero.

### Legacy test data — ✅ CLEARED 2026-07-23

Operator approved removing the leftover test jobs + farm. Deleted (accounts left intact):
- ✅ Farm **"Test Farm (UAT)"** employer profile + its 2 jobs ("UAT Farm Assistant — Applied" filled, "UAT Herd Manager — Declined" archived) + their 2 applications (cascaded).
- ✅ "TAX-04 Playwright Smoke Test Job" (draft) — farm "Corebeef farms" **kept**.

Read-back: `total_jobs_now=0` (fully clean cold-start, 0 active on public board), `corebeef_farm_kept=1`, `total_users=6` (no accounts deleted).

**Still present (not in the jobs+farm scope, operator's call):** bare seeker account `at-seeker-b@topfarms.test` (its test applications were removed with the jobs above). Harmless — no listings, not customer-facing. Say the word to delete it too.

## Intentionally deny-all tables (TF-016)

These 8 tables have RLS enabled with **no policies by design** — they are written/read exclusively via `service_role` (Edge Functions, cron) or SECURITY DEFINER admin RPCs gated by `_admin_gate()`. The `rls_enabled_no_policy` INFO advisors on them are expected, not gaps: `admin_audit_log`, `admin_metrics_cache`, `admin_notes`, `lead_harvest_runs`, `lead_outreach_config`, `lead_staging`, `lead_suppression`, `leads`. Client roles get zero rows; that is the contract.

## Evidence log

- PRs #41 (blockers/SEO/truth pass), #42 (seeker crash), #43 (apply lifecycle + wizard truth), #44 (admin RPCs + stats) — all merged to main, auto-deployed to prod.
- PR #48 (hardening batch: O4 migration 059 + O6 duplicate job + O7 chunk recovery + O9 date guard), PR #49 (migration 060 recursion hotfix) — merged 2026-07-23, bundle `index-kz5ujToH.js` verified live.
- Migrations 057, 058 applied to prod project inlagtgpynemhipnqvty; 059 (`security_hardening_o4`) + 060 (`fix_marketplace_policy_recursion`) applied 2026-07-23 via write-capable Supabase MCP connector, recorded in `schema_migrations` (versions 20260723032451 / 20260723032721) and verified via pg_catalog read-backs.
- **Incident note (fixed same session):** 059's marketplace policy subqueried `jobs` while jobs' owner policy subqueries `employer_profiles` → 42P17 infinite policy recursion for authenticated users (~10 min window on prod). 060 moved the check into a narrow SECURITY DEFINER boolean (`employer_has_public_job`) — cycle broken, all probes re-verified green. Lesson: an RLS policy that subqueries another RLS'd table can create a cycle with that table's policies; use a definer helper for cross-table policy predicates.
- Live post-hardening verification 2026-07-23: 7 anon REST probes (jobs board, marketplace view, get_user_role denied 42501, get_platform_stats OK, stripe column denied, safe columns OK, view embed OK) + 8 authenticated probes as UAT seeker/employer (E1 path, applications+embed, own profile, applicant list, own jobs incl. drafts, stripe denied even authed) — all green. Browser E2E: employer login → dashboard → Duplicate → prefilled wizard → past-date blocked → future date advances → public /jobs renders off invoker view.
- Screenshots in `docs/uat/screenshots/`: 10-prod-404-fixed, 11-job-preview, 12-job-live-public.
- Post-fix prod Lighthouse (mobile): SEO 100, Accessibility 96, Best Practices 100.
