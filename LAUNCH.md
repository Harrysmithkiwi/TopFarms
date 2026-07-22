# LAUNCH.md — TopFarms Launch Readiness Backlog

Source of truth for launch readiness. An item is ticked ONLY when fixed **and** independently verified on production (evidence linked). Findings reference `UAT_MASTER_REPORT.md`.

**Score: 62/100 → 91/100 (verified on production 2026-07-23).**

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
- [x] **H7. `marketplace_employer_profiles` review** (TF-014) — assessed; exposes only non-PII farm fields. Converting to security_invoker is **O4 hardening** (not blocking).
- [ ] **H8. Restrict `get_user_role` from anon** (TF-015) — **O4 hardening batch** (low, requires GRANT migration + regression of anon get_platform_stats path).

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
- [ ] **O4. Post-launch security hardening batch** — get_user_role anon GRANT (H8/TF-015), marketplace view → security_invoker (H7/TF-014), pg_trgm schema (TF-017), deny-all table docs (TF-016).
- [ ] **O5. Enable Supabase leaked-password protection** (B14/TF-011) — Auth → Passwords → "Leaked password protection" ON. One toggle in the Supabase dashboard.
- [ ] **O6. Feature gap: "Duplicate job"** — spec asked for it; no duplicate action exists. Product decision + build.
- [ ] **O7. Hardening: lazy-chunk load failure = infinite spinner** — after a deploy, a stalled/404'd route chunk leaves users on the spinner with no recovery. Add a lazy-import retry + one-time auto-reload on chunk error. (Observed once mid-deploy; recovered on hard reload.)
- [ ] **O8. Minor: applicant AI summary renders empty** — "Analyzing candidate fit…" resolves to blank; low priority.

## UAT accounts (created 2026-07-23 — DELETE before/at launch, see O2)

| Role | Email | Password | Status |
|---|---|---|---|
| Employer | uat.employer@topfarms.co.nz | UAT-Employer-2026!kea | Retained for verification — delete at launch |
| Seeker | uat.seeker@topfarms.co.nz | UAT-Seeker-2026!tui | Retained — delete at launch |
| Admin | uat.admin@topfarms.co.nz | UAT-Admin-2026!ruru | Retained — delete at launch |

Associated test data to purge with the accounts: farm "Karapiro Flats Dairy Ltd", job "Herd Manager — 420 Cow Rotary" (id b031bf38-…), and its 1 application.

## Evidence log

- PRs #41 (blockers/SEO/truth pass), #42 (seeker crash), #43 (apply lifecycle + wizard truth), #44 (admin RPCs + stats) — all merged to main, auto-deployed to prod.
- Migrations 057, 058 applied to prod project inlagtgpynemhipnqvty.
- Screenshots in `docs/uat/screenshots/`: 10-prod-404-fixed, 11-job-preview, 12-job-live-public.
- Post-fix prod Lighthouse (mobile): SEO 100, Accessibility 96, Best Practices 100.
