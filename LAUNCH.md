# LAUNCH.md — TopFarms Launch Readiness Backlog

Source of truth for launch readiness. An item is ticked ONLY when fixed **and** independently verified on production (evidence linked). Findings reference `UAT_MASTER_REPORT.md`.

**Score: 62/100 → 93/100 (verified on production 2026-07-23; hardening batch PRs #48–#49 + migrations 059/060).**

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
- [ ] **B14. Leaked-password protection** (TF-011) — **O5 human-owned**: Supabase Auth dashboard toggle (no management-API path from here). One switch; documented below.
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

- [ ] **O1. Legal review of Privacy/Terms** — engineering shipped reviewed-quality NZ drafts; sign-off is a business action.
- [ ] **O2. Purge pre-existing test data** (TF-018) — legacy users + test jobs + the UAT thread. Destructive; operator's call. UAT accounts listed below for removal.
- [ ] **O3. Marketplace cold-start** — one realistic seeded thread exists for UAT; real listings/outreach before marketing push is a GTM decision.
- [x] **O4. Post-launch security hardening batch** — DONE 2026-07-23 (migrations 059/060, PRs #48/#49): get_user_role anon revoke (H8/TF-015 ✔), marketplace view → security_invoker (H7/TF-014 ✔), pg_trgm → `extensions` schema (TF-017 ✔, `similarity()` smoke-tested via compute_match_score=77), deny-all table docs (TF-016 ✔, see "Intentionally deny-all tables" below). Post-migration advisor sweep: `security_definer_view` ERROR and `extension_in_public` WARN cleared; only intentional `get_platform_stats` anon WARN + leaked-password WARN (O5) remain.
- [ ] **O5. Enable Supabase leaked-password protection** (B14/TF-011) — Auth → Passwords → "Leaked password protection" ON. One toggle in the Supabase dashboard.
- [x] **O6. Feature gap: "Duplicate job"** — BUILT (PR #48). JobCard "Duplicate" action copies the listing (minus server-managed fields; start_date deliberately dropped) + its job_skills into a new draft and opens the edit wizard. ✔ verified live: draft `7fe47c88-…` created with all step-2+ fields intact, toast shown, wizard opened. (Original job has 0 job_skills rows so the skills-copy path ran against an empty set — code path exercised, trivially.)
- [x] **O7. Hardening: lazy-chunk load failure = infinite spinner** — FIXED (PR #48). `lazy()` wrapper in main.tsx: on import failure, one forced reload per session (fetches the fresh index + chunk names), then falls through to the router errorElement. ✔ marker string verified in prod bundle `index-kz5ujToH.js`.
- [x] **O9. Past start dates accepted by job wizard** (UAT Part 2 open finding) — FIXED (PR #48). Native `min=today` on the date input + zod refine (timezone-proof string compare) as depth. ✔ verified live: 01/01/2020 blocked at submit, 01/09/2026 advances.
- [ ] **O8. Minor: applicant AI summary renders empty** — "Analyzing candidate fit…" resolves to blank; low priority.

## UAT accounts (created 2026-07-23 — DELETE before/at launch, see O2)

| Role | Email | Password | Status |
|---|---|---|---|
| Employer | uat.employer@topfarms.co.nz | UAT-Employer-2026!kea | Retained for verification — delete at launch |
| Seeker | uat.seeker@topfarms.co.nz | UAT-Seeker-2026!tui | Retained — delete at launch |
| Admin | uat.admin@topfarms.co.nz | UAT-Admin-2026!ruru | Retained — delete at launch |

Associated test data to purge with the accounts: farm "Karapiro Flats Dairy Ltd", job "Herd Manager — 420 Cow Rotary" (id b031bf38-…), its 1 application, and draft job `7fe47c88-…` ("… (Copy)", created verifying the Duplicate feature 2026-07-23). All of it cascades from `DELETE FROM auth.users` for the 3 UAT ids — purge SQL + read-back drafted, awaiting operator confirmation (O2).

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
