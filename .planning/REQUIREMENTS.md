# Requirements: TopFarms

**Defined:** 2026-04-02
**Core Value:** Farm employers and seekers can find each other through agriculture-specific matching that no generic platform provides

## v2.0 Requirements

Requirements for Launch Readiness. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-06**: User can sign up and log in with Google OAuth via Supabase Auth
- [x] **AUTH-07**: User can sign up and log in with Facebook OAuth via Supabase Auth
- [x] **AUTH-08**: OAuth users are prompted to select role (Employer/Seeker) on first login and routed to role-appropriate onboarding

### Email Deliverability

- [x] **MAIL-01**: Resend sending domain has SPF and DKIM DNS records configured and verified for production email delivery
- [x] **MAIL-02**: When employer marks a job as filled, all applicants with unresolved status (applied, reviewed, interview, shortlisted) receive an automated notification email

### Bug Fixes

- [ ] **BFIX-01**: Job search cards show "Applied" badge when the logged-in seeker has already applied to that job (replace hardcoded false). Badge appears for any application status (active or terminal); status-suffixed copy distinguishes (e.g. "Applied · Declined"). Apply tab is re-enabled for terminal statuses (re-apply allowed).
- [ ] **BFIX-02**: Employers can view seeker-uploaded documents (CV, certificates, references) via Supabase Storage signed URLs in the applicant dashboard. URL minting goes through an Edge Function with service role; URLs are per-click ephemeral with 15-minute expiry.
- [ ] **BFIX-03**: Seeker-uploaded documents are categorized by type at upload (CV / certificate / reference / identity / other). Existing untagged documents migrate as 'other' and are re-classifiable by the seeker. Identity documents are NEVER exposed to employers — the document-access Edge Function filters out `document_type='identity'` server-side before minting any signed URL. Employer view in the applicant dashboard is sectioned by non-identity category.

### Job Search

- [ ] **SRCH-13**: Seeker can save current filter combination as a named saved search
- [ ] **SRCH-14**: Seeker can load a previously saved search to restore all filter state
- [ ] **SRCH-15**: Seeker can delete saved searches they no longer need

## Pre-Launch Must-Fix

Items that **block v2.0 launch**. Surfaced during pre-Phase-14 stabilisation. Not assigned to a phase yet — must be scheduled before go-live.

- [ ] **UXBUG-01** *(pre-launch blocker)*: `Step7Preview.tsx` references `accommodation_pets`, `accommodation_couples`, `accommodation_family`, `accommodation_utilities_included` on `EmployerProfileData`, but those properties don't exist on the type. At runtime these access `undefined` and render as empty fields on the employer onboarding preview step (Step 7). Every employer hitting onboarding sees a half-broken preview before publishing. Investigate whether the fields were renamed during a migration, never added to the type, or never persisted at all. Found via `tsc -b` errors at `Step7Preview.tsx:129,161-164` (2026-04-27).
- [ ] **AUTH-01** *(pre-launch blocker)*: Google OAuth login fails on signup/login flow. Email signup works. Likely Supabase Auth provider config issue — check Google OAuth client_id/secret + whitelisted redirect URIs (localhost:5173, https://top-farms.vercel.app, future custom domain). Pre-launch blocker. Logged 2026-04-28 from 14-01 UAT prep.
- [ ] **AUTH-02** *(pre-launch blocker)*: Email signup may not create `user_roles` row reliably. Symptom: new email-signup users land on `/onboarding/seeker` but the Step 1 Continue button silently fails because `seeker_profiles` upsert is RLS-rejected (policy at `002_rls_policies.sql:88` requires `get_user_role(auth.uid()) = 'seeker'`). The error path fires `toast.error('Failed to save progress. Please try again.')` but the toast auto-dismisses in ~4s and is easy to miss. Investigate `src/pages/auth/SignUp.tsx` and `useAuth.signUpWithRole` (Phase 12) — verify the `user_roles` INSERT is firing and committing on the email-signup path. Manually unblockable via direct INSERT into `user_roles`. Discovered 2026-04-28 from harry.symmans.smith@gmail.com signup during 14-01 UAT prep.
- [x] **JOBS-01** *(resolved 2026-04-28 in c6066ea)*: `JobSearch.tsx` `fetchJobs` useEffect overfired due to `[searchParams, session?.user?.id, role]` deps, triggering three concurrent supabase queries that contended the auth-token Web Lock and produced AbortError lock-stealing. Symptom: `/jobs` rendered "0 jobs found" for authenticated seekers despite seeded UAT data. Fixed by gating the effect on `authLoading` from `useAuth` so `fetchJobs` fires exactly once after auth resolves (anonymous OR signed-in). Closed.

## Future Requirements

Deferred to post-launch. Tracked but not in current roadmap.

### Performance

- **PERF-01**: AbortController on `JobSearch.tsx` `fetchJobs` useEffect. Currently no abort on filter rapid-change — slow first response can overwrite a fresh second response. Low-priority quality fix; not a launch blocker. Logged 2026-04-27 during StrictMode investigation.

### Testing

- **TEST-01**: Playwright smoke specs for Phase 14 deliverables (BFIX-01 badge + BFIX-02 employer doc view + BFIX-03 categorization). Install `@playwright/test` + chromium binary, write specs covering primary success criterion of each phase, wire into CI gate. Deferred from Phase 14 in favour of manual you-click UAT during pre-launch development. Reasoning: pre-launch with ~15 active screens, manual UAT works at this scale; smoke specs add 75-140 LOC/plan (~30% bloat) for regression coverage we don't yet need. Playwright value comes at scale (multiple devs, regression risk, CI gates) — post-launch territory. Logged 2026-04-27.

### Bug Fixes (Post-Launch)

- **HOMEBUG-01**: Home page calls `get_platform_stats` RPC which returns 404. Function may be missing, renamed, or never deployed in Supabase. Affected: home page platform stats widget renders silently empty. Logged 2026-04-27 from prod-build smoke (`localhost:4173/`).
- **HOMEBUG-02**: Home page `jobs?select=id,title,region,...` query returns 400 (likely malformed). Affected: home page featured jobs preview renders silently empty. Investigate query construction in landing page component. Logged 2026-04-27 from prod-build smoke.
- **HOMEBUG-03**: FilterSidebar Couples and Accommodation filters trigger backend errors when activated. Likely a UI/backend mismatch — filter UI exists but the corresponding query parameter or database column may be missing or named differently. Investigate: (1) does the UI emit the right query param, (2) does the jobs query handler accept it, (3) does the underlying jobs table have the necessary column. Affected: seeker job search filters (Couples + Accommodation sub-options). Logged 2026-04-27 from Bug 1 UAT side-finding.
- **NAV-01**: `/jobs` route renders without `DashboardLayout` / `Nav` wrapper, so the page has no top-level nav (logo + role-aware links visible on `/dashboard/seeker` are absent on `/jobs`). Pre-existing from phase 03-03 (`a5f56b2 feat(03-03): wire JobSearch to /jobs route`); the route was scaffolded as bare `<JobSearch />` and never re-wrapped. Cosmetic, not blocking. Fix is either to wrap `<JobSearch />` in `<DashboardLayout hideSidebar>` or render `<Nav />` directly inside `JobSearch.tsx` (matches the public marketing-page pattern). Logged 2026-04-28 from 14-01 UAT.

### Deferred Investigations

- **AUTH-FIX**: Root cause behind the loading-state hang surfaced by JOBS-01 — `useAuth.loadRole()` can hang indefinitely under Supabase auth-lock contention (StrictMode double-mount + concurrent `loadRole` chains contending the auth-token Web Lock; the `INITIAL_SESSION` guard in `onAuthStateChange` muzzles the only fallback that could call `setLoading(false)`). Mitigated in c6066ea via 3s `Promise.race` timeout + `.catch()` on `getSession().then()` so `useAuth.loading` always resolves within ≤3s + getSession latency. **Mitigation only — root cause still present.** Full fix deferred to a dedicated AUTH-FIX session — investigate Supabase v2 lock-stealing behaviour, evaluate moving away from the `INITIAL_SESSION` guard pattern, and consider a session-aware fetch wrapper (or fetch instrumentation) globally so client code never re-enters the same trap. Logged 2026-04-28 from 14-01 UAT.

### Operations

- **DEPLOY-01**: Live Supabase DB was 2 migrations behind repo head during 14-01 work — migrations 016 and 017 had not been applied to production. 016 was applied manually via Supabase Studio this session; 017 still deferred. Process gap: deployments don't auto-apply Supabase migrations, so repo and DB drift silently. Action: add a migration-apply step to the Vercel deploy pipeline (`supabase db push` or `supabase migration up` against the linked project) gated behind a dry-run check. Logged 2026-04-28 from 14-01 UAT prep.

### Email Automation

- **MAIL-03**: Weekly job digest email for seekers with matching jobs
- **MAIL-04**: 90-day inactive profile nudge ("Are you still looking?")
- **MAIL-05**: 120-day auto-hide notification and profile deactivation
- **MAIL-06**: Email alerts triggered by saved search (new matching jobs)

### Features

- **FEAT-01**: Google Maps integration for location-based job search
- **FEAT-02**: Interview scheduling with time slot proposals
- **FEAT-03**: AI-drafted job descriptions via Claude API in posting wizard
- **FEAT-04**: message_threads and messages tables (Growth Phase prep)

### Growth

- **GRWT-01**: Expressions of Interest for seekers
- **GRWT-02**: Employer analytics dashboard
- **GRWT-03**: In-app messaging UI

## Out of Scope

| Feature | Reason |
|---------|--------|
| Messaging UI | Growth Phase — wireframe exists, tables deferred to post-launch |
| Horticulture/viticulture sectors | Future milestone per constraints |
| Native mobile apps | Mobile web only per constraints |
| Reverse seeker search | Not in MVP model — pure job-board |
| Ratings and reviews | Post-launch feature |
| SMS notifications | Email sufficient for MVP |
| PostGIS geographic search | Region-based filtering sufficient for NZ ag |
| Career Passport | Post-launch feature |
| Automated Stripe subscription billing | Manual invoicing for placement fees at MVP |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-06 | Phase 12 | Complete |
| AUTH-07 | Phase 12 | Complete |
| AUTH-08 | Phase 12 | Complete |
| MAIL-01 | Phase 13 | Complete |
| MAIL-02 | Phase 13 | Complete |
| BFIX-01 | Phase 14 | Pending |
| BFIX-02 | Phase 14 | Pending |
| BFIX-03 | Phase 14 | Pending |
| SRCH-13 | Phase 15 | Pending |
| SRCH-14 | Phase 15 | Pending |
| SRCH-15 | Phase 15 | Pending |

**Coverage:**
- v2.0 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-28 — logged JOBS-01 (closed in c6066ea), AUTH-FIX, DEPLOY-01, NAV-01 from 14-01 UAT session*
