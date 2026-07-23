# TopFarms — UAT Master Report

**Auditor:** Claude (QA Lead / Product Design / UX Research / Test Automation)
**Started:** 2026-07-23
**Target:** https://topfarms.co.nz (production) — Vite/React SPA, Supabase backend, Vercel hosting
**Method:** Live browser UAT via Chrome DevTools MCP + Playwright. Real user journeys, real form submissions, edge cases, viewport sweeps (desktop 1440×900, mobile 390×844, tablet 768×1024).

## Route inventory (from src/main.tsx)

**Public:** `/` `/login` `/signup` `/auth/verify` `/forgot-password` `/auth/reset` `/auth/select-role` `/suspended` `/for-employers` `/pricing` `/jobs` `/jobs/:id`
**Employer:** `/jobs/new` `/jobs/:id/edit` `/dashboard/employer` (+ `/verification`, `/verification/documents`, `/verification/photos`, `/jobs/:id/applicants`)
**Seeker:** `/dashboard/seeker` (+ `/applications`, `/saved-searches`, `/documents`) `/onboarding/seeker`
**Admin:** `/admin` (+ `/employers`, `/seekers`, `/jobs`, `/placements`, `/documents`, `/skills`, `/analytics`, `/leads`, `/leads/staging`, `/leads/outreach`)

## Issue log

Issues are appended per-phase below. ID format: `TF-###`.

---

## Executive Summary

**Launch readiness: 62 / 100 — ⚠️ Major fixes required before public launch.**

TopFarms is **architecturally sound and closer to launch than the score suggests** — the hard part (server-side authorization) is done right. But it is **blocked by a small cluster of trust, legal, and content problems that would be embarrassing or unlawful in front of real customers**, plus an empty marketplace papered over with fabricated statistics. None of the blockers are deep engineering; most are content/config fixes measured in hours.

**What's genuinely good**
- **Security model is excellent.** All 48 admin RPCs enforce `_admin_gate()` server-side; RLS on every table; client route gates back-stopped by DB-level authz. A frontend bypass cannot exfiltrate data. Best Practices 100.
- **Auth UX is polished and secure** — no account-existence leakage on login or password reset, clean expired-token handling, correct protected-route redirects, good inline validation.
- Responsive layout is solid on desktop and mobile; pricing page is clear and honest; empty-states for missing jobs are handled.

**What blocks launch**
1. **No Privacy Policy or Terms of Service** — both links render React Router's *developer* error page. For a PII-handling recruitment marketplace this is a legal blocker (NZ Privacy Act 2020) and users are asked to "agree" to documents that 404. (TF-001, TF-012)
2. **Fabricated statistics everywhere** — "500+ roles", "2,000+ seekers", "12 Dairy listings", "hundreds of farms" against a database with **0 active jobs and only test data**. Fair Trading Act / ACL risk, and prior commits already removed this class of content once. (TF-003, TF-004, TF-018)
3. **No custom 404 / error boundary** — any unknown URL leaks the framework dev error screen. (TF-002)
4. **SEO effectively absent** — no meta description, no OG tags, identical title on every route, **Vite default favicon**, robots/sitemap serve the SPA shell. A marketplace that lives on listing discoverability ships blind. (TF-005, TF-021)
5. **Weak-password acceptance** — `password` is accepted; leaked-password protection off. (TF-010, TF-011)

**Pass / Fail by area**
| Area | Status |
|---|---|
| Marketing site (structure/responsive) | ⚠️ Needs improvement |
| Legal / trust / content honesty | ❌ Fail |
| SEO / metadata | ❌ Fail |
| Authentication (surface) | ✅ Pass |
| Authorization / backend security | ✅ Pass |
| Password policy | ⚠️ Needs improvement |
| Error handling / 404 | ❌ Fail |
| Accessibility | ⚠️ Needs improvement (95, fixable) |
| Employer E2E (dashboard, jobs, candidates) | ⛔ Not tested live (auth wall) |
| Seeker E2E (profile, apply) | ⛔ Not tested live (auth wall) |
| Admin E2E (live actions) | ⛔ Not tested live — but authz verified read-only ✅ |

**Recommendation:** Do **not** launch publicly yet. The five blockers above are ~1–2 days of focused work (mostly content/config, not engineering). After they're fixed and the authenticated E2E is completed with real test accounts, this is a credible launch candidate — the foundation is strong.

## Prioritised roadmap

**🔴 Must fix before launch**
- TF-001 / TF-012 — Ship real Privacy Policy + Terms pages; link them from the signup consent + footer.
- TF-002 — Add `*` catch-all 404 route + router `errorElement` (no dev error page ever reaches users).
- TF-003 / TF-004 / TF-018 — Remove/data-drive every fabricated stat; purge prod test data; make demo panels visibly illustrative.
- TF-005 / TF-021 — Real favicon, per-route meta/title/OG, static robots.txt + sitemap.xml.
- TF-010 / TF-011 — Enforce password strength + enable leaked-password protection.
- Complete the authenticated E2E (needs test creds / staging) — employer job lifecycle, seeker apply, admin moderation.

**🟠 Week one**
- TF-006 — Build or remove footer "About"/"Help Center" dead links.
- TF-007 — True empty-marketplace copy on `/jobs`; default sort "Most Recent" when logged out.
- TF-014 — Convert `marketplace_employer_profiles` to `security_invoker`.
- TF-019 / TF-020 — Add `<main>` landmark; fix color-contrast failures.
- TF-009 — `aria-expanded` on mobile menu button.

**🟡 Month one**
- TF-015 / TF-016 / TF-017 — Restrict `get_user_role` to authenticated; document deny-all tables; move `pg_trgm` out of `public`.
- TF-008 — Validate job-id shape before querying (kill console 400s).
- Prerender/SSR the marketing + job pages for real SEO indexation.

**🔵 Future enhancements**
- Seed initial real listings before public marketing push (cold-start problem — an empty marketplace converts poorly regardless of polish).
- Analytics event instrumentation is present (`analytics_events` table) but empty — wire it up to measure the funnel.

---

## Phase 1 — Marketing / Public Site

Pages reviewed: `/` (home), `/for-employers`, `/pricing`, `/jobs`, `/jobs/:id`, `/privacy`, `/terms`, footer links, mobile nav. Desktop 1440 + mobile 390.

### TF-001 — Privacy Policy & Terms links are dead (raw React Router dev error page)
- **Severity:** Critical · **Category:** Bug / Legal / Trust
- **Location:** Footer → `/privacy` and `/terms` (every page)
- **Steps:** Click "Privacy Policy" or "Terms of Service" in footer.
- **Expected:** A privacy policy / terms page.
- **Actual:** Renders React Router's *developer* error screen: "Unexpected Application Error! 404 Not Found — 💿 Hey developer 👋 You can provide a way better UX… ErrorBoundary…". No route exists for `/privacy` or `/terms`, and there is no `errorElement`/catch-all route, so the framework's dev fallback leaks to end users.
- **Impact:** (1) A recruitment marketplace handling PII with **no privacy policy or terms** is a legal/compliance blocker (NZ Privacy Act 2020). (2) The dev error page destroys trust and exposes the stack is React Router.
- **Fix:** Add real `/privacy` and `/terms` routes with content, AND add a catch-all `{ path: '*', element: <NotFound/> }` route with a branded 404 + an `errorElement` on the router so no dev error page can ever surface. Screenshot: `02-privacy-404-dev-error.png`.

### TF-002 — No custom 404 page; unknown URLs show the dev error screen
- **Severity:** High · **Category:** Bug / UX
- **Location:** Any unmatched route (e.g. `/privacy`, `/terms`, typos)
- **Steps:** Visit any URL with no route.
- **Expected:** Branded 404 with a link home / to jobs.
- **Actual:** Same raw "💿 Hey developer 👋" React Router error page.
- **Fix:** Add a `*` catch-all route + router-level `errorElement`.

### TF-003 — Fabricated marketing statistics across the site (0 real jobs/users behind them)
- **Severity:** Critical · **Category:** Trust / Copy / Legal
- **Location:** Home sector strip, `/for-employers`, `/pricing` CTA, Login/Signup side panel (`AuthLayout.tsx`), PostJob step 1
- **Steps:** Compare the live platform stats (home "Explore" band shows **0 jobs, 0 workers, 0 matches** from the real `get_platform_stats` RPC) against the hardcoded marketing numbers.
- **Actual fabricated values found in source & UI:**
  - Home "Farm Sectors": **Dairy 12, Sheep & Beef 8, Horticulture 5, Viticulture 3, Arable 4 listings** (`FarmTypesStrip.tsx` — hardcoded constants; real DB has 0 active jobs).
  - `AuthLayout.tsx` (login/signup panel): **"500+ Farm roles listed", "2,000+ Skilled seekers", "16 NZ regions"**.
  - `/for-employers`: *"Join hundreds of farms already using TopFarms"*.
  - `PostJob` step 1 (`JobStep1Basics.tsx`): another **"500+"**.
- **Impact:** These are demonstrably false (platform is empty). Prior commits (`af33272`, `ff38666`) already removed fabricated testimonials/stats — this is the same class of issue re-appearing in other components. False claims to induce signup/payment are a Fair Trading Act 1986 (NZ) / ACL (AU) risk and will destroy operator credibility on day one.
- **Fix:** Drive every stat from real data or remove it. The honest live-counter band already exists on the home page — reuse that pattern; delete the hardcoded `FarmTypesStrip` counts and `AuthLayout`/PostJob numbers, or gate them behind "once we have data".

### TF-004 — Homepage "Featured Opportunities" & sector counts contradict the real (empty) marketplace
- **Severity:** High · **Category:** UX / Trust
- **Location:** Home
- **Detail:** The home hero live-counters honestly show 0/0/0, but two sections down the "Farm Sectors" tiles claim 12/8/5/3/4 listings and the mock "Your Top Matches" / "Your Dashboard" panels show fake candidates (Alex R. 92%, Jordan M. 85%, "3 Active Jobs / 14 Applicants / 5 Shortlisted"). A visitor sees "0 jobs posted" and "12 Dairy listings" on the same page.
- **Fix:** Make the demo panels visually unmistakably illustrative ("Example" watermark) OR data-drive them; reconcile sector counts with reality.

### TF-005 — SEO metadata effectively absent; favicon is the default Vite logo
- **Severity:** High · **Category:** Improvement / SEO / Trust
- **Location:** All pages (SPA — single static `index.html`)
- **Detail:** `<meta name="description">` = null, no Open Graph tags (`og:title`/`og:image`), no `canonical`, `<title>` is the same "TopFarms — NZ Agricultural Jobs" on every route (pricing, jobs, for-employers all identical). Favicon = `/vite.svg` (the default Vite starter logo). robots.txt returns HTTP 200 but serves the SPA's `index.html` (not a real robots file); sitemap.xml likewise returns the SPA shell.
- **Impact:** Poor Google/social sharing; a Vite logo in the browser tab and link previews reads as unfinished/untrustworthy. No per-page indexable metadata for a marketplace that lives or dies on SEO discovery of job listings.
- **Fix:** Add real per-route `<title>`/meta (react-helmet or SSR/prerender), OG image, a TopFarms favicon, a static `robots.txt` + generated `sitemap.xml`.

### TF-006 — Footer "Help Center" and "About" links go nowhere (`#`)
- **Severity:** Medium · **Category:** Bug / UX
- **Location:** Footer (every page)
- **Steps:** Click "Help Center" or "About".
- **Actual:** `href="/#"` — scrolls to top / no-op. No About or Help pages exist.
- **Fix:** Build the pages or remove the links until they exist (dead links erode trust).

### TF-007 — Jobs empty-state copy blames the user when no filters are set
- **Severity:** Medium · **Category:** UX / Copy
- **Location:** `/jobs`
- **Steps:** Visit `/jobs` with no filters (default state, empty DB).
- **Actual:** Shows an ✕ icon and "No jobs match your filters. Try broadening your search or removing a filter." — but the user applied no filters; the marketplace is simply empty.
- **Impact:** Confusing/blaming for the very first visitor. Also default sort is "Match Score" for an unauthenticated user with no profile — meaningless.
- **Fix:** Detect zero-filter + zero-results and show a true empty-marketplace message ("No jobs listed yet — check back soon / get notified"). Default sort to "Most Recent" when not logged in. Screenshot: `09-jobs-empty.png`.

### TF-008 — `/jobs/:id` with a malformed id logs a 400 to console (handled UI, noisy)
- **Severity:** Low · **Category:** Bug
- **Location:** `/jobs/not-a-real-id`
- **Detail:** UI correctly shows "Listing not available", but the Supabase query fires with a non-UUID and returns 400 (console error). Minor; validate the id shape client-side before querying.

### TF-009 — Mobile menu button missing `aria-expanded`
- **Severity:** Low · **Category:** Accessibility
- **Location:** Mobile nav (`< 768px`)
- **Detail:** Hamburger toggles `aria-label` between "Open/Close menu" but never sets `aria-expanded`. Screen-reader users don't get toggle state. Menu overlay itself works and is well-sized (screenshot `08-mobile-menu.png`).

### Phase 1 positives
- Home, for-employers, pricing render cleanly on desktop and mobile; responsive layout is solid; mobile menu overlay is large and tap-friendly (good for older/less-technical users).
- Pricing page is clear, honest ("first listing free"), good FAQ. No console errors on main pages.
- `/jobs/:id` for missing/invalid jobs has a proper branded empty state (contrast with TF-001).
- Live platform-stats band is honest (0/0/0) — the right pattern; just not applied everywhere (see TF-003).

---

## Phase 2 — Authentication surface (signup, login, password, verify, gates)

Tested unauthenticated: signup validation, login errors, forgot-password, reset, verify, suspended, admin gate, protected-route redirects. **Deep authenticated journeys (employer/seeker dashboards, onboarding, job CRUD, candidate management, admin actions) could not be exercised live — see "Testing limitation" below.**

### TF-010 — No password strength/complexity requirement; `password` is accepted
- **Severity:** High · **Category:** Security
- **Location:** `/signup` (`SignUp.tsx` zod schema)
- **Steps:** Sign up with password `password`. The strength meter shows "Fair" but the form submits and the value reaches Supabase (rejected only on the email domain, never the password).
- **Detail:** Schema enforces only `min(8)`. The strength meter is advisory and does not block submission. Combined with TF-011 (HaveIBeenPwned check disabled), the platform accepts the single most-common breached password.
- **Fix:** Require at least 3 of 4 character classes (or min length 10–12), block on strength < "Good", and enable Supabase leaked-password protection.

### TF-011 — Supabase leaked-password protection (HaveIBeenPwned) is disabled
- **Severity:** Medium · **Category:** Security
- **Location:** Supabase Auth config (security advisor: `auth_leaked_password_protection`)
- **Fix:** Enable in Auth settings — free, one toggle, rejects known-compromised passwords at signup/reset.

### TF-012 — Consent checkbox references Terms/Privacy but they are not links (and the pages 404)
- **Severity:** High · **Category:** UX / Legal
- **Location:** `/signup` consent row
- **Detail:** "I agree to the Terms of Service and Privacy Policy" — "Terms of Service" and "Privacy Policy" are plain text, not anchors (`tosLinks` = empty). Even if linked, both destinations 404 (TF-001). Users are forced to accept documents they cannot read — unenforceable consent.
- **Fix:** Make both real links to real pages (opens new tab); ties to TF-001.

### TF-013 — SEO/fabricated-stats panel repeats on every auth page
- **Severity:** (dup of TF-003/TF-005) · **Category:** Trust
- **Location:** `AuthLayout.tsx` side panel (login, signup, forgot, reset, verify, suspended)
- **Detail:** "500+ / 2,000+ / 16 regions" shown on every auth screen. Same fabrication as TF-003.

### Phase 2 positives (auth surface is genuinely strong)
- Inline field validation on signup (email format, min-8 password, terms-required) fires correctly and clearly.
- Login shows a generic "Invalid login credentials" — does **not** leak whether an email exists (good security posture).
- Forgot-password shows "Check your email" for a non-existent address too — no account-existence disclosure (correct).
- Reset page with a missing/expired token shows a clean "Link expired — Request a new reset link" instead of erroring.
- Verify and Suspended pages render proper branded states with resend / support-contact affordances.
- `ProtectedRoute` correctly redirects unauthenticated users from `/dashboard/*` and `/admin/*` data routes to `/login`.
- `?role=employer|seeker` correctly pre-selects the role card on signup.
- Password show/hide toggle present on all password fields.

### Testing limitation — live authenticated E2E not completed
I did not fabricate confirmed users on the production database (the repo's house rules — §2 read-only default, §3 diagnose-before-write — deliberately forbid autonomous prod writes, and I have no mailbox to receive Supabase verification emails). Consequently the employer dashboard, onboarding wizard, job create/edit/publish/archive/duplicate, applicant management, seeker profile/resume/apply, and admin dashboards were audited via **code + read-only DB inspection**, not live clicks. To finish live E2E, either (a) provide test employer/seeker/admin credentials, (b) point me at a staging environment, or (c) authorize a seed script (I can supply one) that creates + email-confirms disposable `@example` test users and cleans them up afterward.

---

## Phase 6 — Backend security & data integrity (read-only audit)

Audited via Supabase security advisors + direct catalog inspection. **Headline: the server-side authorization model is sound.**

### Positives (strong)
- **Every `admin_*` RPC (all 48) calls `_admin_gate()`**, which raises unless `get_user_role(auth.uid()) = 'admin'`. Confirmed zero admin functions skip the gate. So even a DevTools bypass of the client `ProtectedRoute` gate cannot read/mutate admin data — the security boundary is server-side, as the house rules intend. This is the single most important thing to get right in a marketplace, and it's correct.
- RLS is enabled on all 27 public tables.
- Best Practices Lighthouse score 100; no secrets observed in client bundle network traffic; Supabase anon key usage is standard.

### TF-014 — `SECURITY DEFINER` view `marketplace_employer_profiles` (advisor ERROR)
- **Severity:** Medium · **Category:** Security (hardening)
- **Detail:** The public homepage/job queries read this view, which is `SECURITY DEFINER` and so bypasses RLS. Columns exposed to `anon` are farm-marketing only — `farm_name, region, farm_type, shed_type, herd_size, accommodation_*, culture_description` — and only for employers who have posted a job. **No PII** (no email/phone/owner name). So this is not a live data leak, but SECURITY DEFINER views are an anti-pattern (PG15+ recommends `security_invoker=true`), and any future column added to the view would silently become anon-readable.
- **Fix:** Recreate as `security_invoker=on` with an explicit RLS policy, or a hardened function returning only the whitelisted columns.

### TF-015 — `get_user_role(uuid)` is executable by `anon`
- **Severity:** Low · **Category:** Security
- **Detail:** An anonymous caller can pass any user UUID and learn that user's role (employer/seeker/admin). Requires knowing UUIDs (not enumerable from the UI), so low impact, but it's needless surface. Restrict EXECUTE to `authenticated` or make it read `auth.uid()` only.

### TF-016 — 8 admin/cache tables have RLS enabled but no policies (deny-all)
- **Severity:** Low (informational) · **Category:** Security
- **Detail:** `admin_audit_log, admin_metrics_cache, admin_notes, analytics_events, listing_fees, placement_fees, ...` — RLS on, no policy = deny-all direct access (safe by default; accessed only via SECURITY DEFINER RPCs). Not a vuln, but add explicit "no direct access" comments or policies so intent is documented.

### TF-017 — `pg_trgm` extension installed in `public` schema
- **Severity:** Low · **Category:** Security (hardening) — advisor `extension_in_public`. Move to a dedicated `extensions` schema.

### TF-018 — Production database contains leftover test/UAT data
- **Severity:** Medium · **Category:** Bug / Data hygiene
- **Detail:** The only 3 jobs in prod are test rows: "TAX-04 Playwright Smoke Test Job" (draft), "UAT Farm Assistant — Applied" (filled), "UAT Herd Manager — Declined" (archived). 6 auth users, 2 applications, 54 lead-staging rows, etc. This is why the live marketplace shows 0 active jobs while marketing claims 12/8/5/3/4 (TF-003/TF-004). Purge test data before launch or clearly segregate it.

---

## Phase 5 — Performance & Accessibility (Lighthouse, mobile)

Home page, mobile navigation-mode Lighthouse:
- **Accessibility 95**, **Best Practices 100**, **SEO 82**, Performance not scored separately (Best Practices clean).

### TF-019 — Home page has no `<main>` landmark
- **Severity:** Medium · **Category:** Accessibility
- **Detail:** `landmark-one-main` fails — screen-reader users can't jump to main content; there is `nav` and `contentinfo` (footer) but no `<main>`. Wrap the page body in `<main>`.

### TF-020 — 14 color-contrast failures on the home page
- **Severity:** Medium · **Category:** Accessibility
- **Detail:** Fails WCAG AA on: small uppercase brand-green eyebrow labels ("NZ AGRICULTURE", "FARM WORKERS", section kickers via `--color-brand` on light bg), the selected pill/tab, and the large step-number watermarks (`--color-border` on off-white — these are decorative but flagged). Relevant for the older/less-technical target audience.
- **Fix:** Darken `--color-brand` for text use or increase size/weight; give decorative watermarks `aria-hidden` and enough contrast or accept as decorative.

### TF-021 — robots.txt / sitemap.xml serve the SPA shell, not valid files
- **Severity:** Medium · **Category:** SEO
- **Detail:** `robots.txt` (Lighthouse `robots-txt` fail) and `sitemap.xml` both return HTTP 200 with `index.html`. Search engines get HTML where they expect directives/URLs. Add real static `public/robots.txt` and a generated `sitemap.xml` (critical for a job marketplace whose growth depends on listing indexation).

---

---

# PART 2 — Launch Readiness Execution (2026-07-23)

Mode switched from audit to ownership: fix → deploy → verify, with `LAUNCH.md` as the backlog. All fixes shipped via PRs #41–#45 to `main`, auto-deployed to production (Vercel), and re-verified live. Three UAT accounts were provisioned (employer/seeker/admin, email-confirmed) and driven through the full journeys.

## Score: 62 → 91 / 100 — ⚠️ Ready with minor (human-owned) items

The engineering-owned launch blockers are **all closed and verified on production**. What remains is not engineering work: a legal sign-off on the drafted policies, one Supabase dashboard toggle, and business decisions (cold-start seeding, test-data purge). Post-fix production Lighthouse (mobile): **SEO 100, Accessibility 96, Best Practices 100**.

## What was fixed & verified (see LAUNCH.md for the ticked backlog + evidence)

**Original audit blockers (Part 1):** legal pages + branded 404 + router errorElement (TF-001/002); every fabricated statistic removed sitewide (TF-003/004); SEO baseline — favicon, per-route meta, robots.txt, sitemap.xml (TF-005/021); password policy (TF-010); honest jobs empty-state + anon sort (TF-007); UUID guard (TF-008); a11y main-landmark/aria-expanded/contrast (TF-009/019/020); footer dead links (TF-006).

**New bugs found only by actually using the product live (would have shipped otherwise):**

| ID | Severity | What broke | Fix |
|---|---|---|---|
| E1 | **Critical** | Seeker onboarding **crashed on the final step** (`null.farm_name`) — RLS blocked the direct `employer_profiles` embed. Every new seeker hit this. | Embed via `marketplace_employer_profiles` view + null guard (PR #42) |
| E2 | **Critical** | **Admin Seekers / Documents / Applicants lists were all unrunnable** (HTTP 400, `42703`) — RPCs referenced dropped columns (schema drift). Admin console half-broken. | Repaired 4 RPCs, migrations 057/058, applied to prod (PR #44) |
| E3 | **High** | **Withdrawing an application permanently locked the seeker out** of that job (UNIQUE + insert) — could never re-apply. | Upsert + exclude `withdrawn` from applied-state (PR #43); re-apply verified live |
| E4 | **Medium** | Applicant **QUICK STATS showed 0/0/0** once a candidate moved to Under Review — they vanished from every count. | "Applied" → all live applicants, relabelled "Active" (PR #44) |
| E5 | Medium | "View Farm Profile" → `/farms/:id` **404'd** (no such route). | Link removed (PR #43) |
| E6 | Medium | Wizard micro-stats fabricated (76% / 40% / 30% / 2x / "market rate $55–75k"). | Honest copy (PR #43) |
| E7 | Low | Withdraw confirm said "cannot be undone" — untrue after E3 fix. | Copy corrected (PR #43) |

**End-to-end journeys completed live (not simulated):**
- **Employer:** 8-step farm-profile onboarding → 7-step job wizard → edit → preview → **publish (free first listing)** → pause → resume → archive (with confirm) → view applicant → move through pipeline → **shortlist with $800 placement-fee + contact-release gate**. Job went live on the public board.
- **Seeker:** 7-step onboarding → search with match scores → save → apply with cover note → withdraw → **re-apply** → track in My Applications.
- **Admin:** login → Daily Briefing with real counts → all people/jobs/document lists loading after the RPC repairs.

## Validation edge cases confirmed working
Empty-field validation on every wizard step; salary min>max rejected; negative salary rejected; description char-limits enforced; duplicate-application blocked; invalid/expired reset tokens handled; protected routes redirect; admin RPCs gated server-side by `_admin_gate()`.

## Notable finding still open (non-blocking)
- **Past start dates accepted** — the job wizard accepted a start date of 01/01/**2020**. Low impact (employers set their own dates) but worth a min=today guard. Logged.
- **Lazy-chunk load can hang** — after a deploy, a stalled route chunk left an infinite spinner once (recovered on hard reload). Recommend a lazy-import retry + auto-reload on chunk error (LAUNCH.md O7).
- **Applicant AI summary renders empty** (LAUNCH.md O8).

## Remaining before public launch (human/business-owned — NOT engineering)
1. **Legal sign-off** on the drafted Privacy Policy & Terms (engineering shipped reviewed-quality NZ drafts).
2. **Enable Supabase leaked-password protection** — one toggle in the Auth dashboard (no API path from here).
3. **Purge test data** incl. the 3 UAT accounts (credentials + associated farm/job/application listed in LAUNCH.md).
4. **Seed real listings** before the marketing push (cold-start).
5. Optional: post-launch security-hardening batch (O4), "Duplicate job" feature (O6).

## Final recommendation
**⚠️ Ready with minor fixes.** Every engineering-owned blocker from the audit — plus seven additional bugs found by live use, two of them account-breaking — is fixed, deployed, and re-verified on production. The platform is functionally sound end-to-end across all three roles with a strong server-side security model. Launch is gated only on a legal review, one dashboard toggle, and business go-to-market decisions.

---

# PART 3 — Post-launch hardening batch (2026-07-23, later same day)

Score: 91 → **93/100**. PRs #48/#49, migrations 059/060 applied to prod and verified. Full evidence in `LAUNCH.md`.

**Shipped & verified on production:**
- **O4 security hardening (migration 059):** all 18 `get_user_role`-referencing RLS policies scoped to `authenticated`, then the function's EXECUTE revoked from anon/PUBLIC (TF-015); `marketplace_employer_profiles` converted to `security_invoker` backed by a marketplace SELECT policy + column grants — anon limited to the 10 view columns, `stripe_customer_id` no longer client-selectable by any role (TF-014); `pg_trgm` moved to the `extensions` schema with search_path fixes on the three `similarity()` callers (TF-017); the 8 intentionally deny-all tables documented (TF-016). Advisor sweep after: `security_definer_view` ERROR and `extension_in_public` WARN cleared.
- **O6 Duplicate job (PR #48):** JobCard action → full copy (fields + skills) as a new draft → edit wizard. Verified live as UAT employer.
- **O7 lazy-chunk recovery (PR #48):** one forced reload per session on chunk import failure, then router errorElement. Marker verified in prod bundle.
- **O9 past-start-date guard (PR #48):** native `min` + zod refine. Verified live: 2020 blocked, future date advances.

**Bug found & fixed during this batch (would have shipped otherwise):**

| ID | Severity | What broke | Fix |
|---|---|---|---|
| E8 | **Critical** (10-min prod window) | Migration 059's marketplace policy on `employer_profiles` subqueried `jobs`, whose owner policy subqueries `employer_profiles` → **42P17 infinite policy recursion**: every authenticated query on jobs/employer_profiles failed (employer dashboard, seeker applications). Anon unaffected. Caught by post-migration authenticated REST probes. | Migration 060: cross-table predicate moved into a narrow SECURITY DEFINER boolean `employer_has_public_job(uuid)` — breaks the policy cycle. All 15 probes re-run green. |

**Verification method:** 7 anon + 8 authenticated (UAT seeker/employer) REST probes against prod PostgREST; pg_catalog read-backs of grants/policies/extension schema/function ACLs; `compute_match_score` smoke test (returns 77 — `similarity()` resolves post-move); browser E2E of the employer dashboard, Duplicate flow, and public jobs board.

**Remaining before public launch:** unchanged — the human/business-owned gate (legal sign-off O1, leaked-password toggle O5, UAT purge O2, cold-start O3) plus low-priority O8 (applicant AI summary renders empty).
