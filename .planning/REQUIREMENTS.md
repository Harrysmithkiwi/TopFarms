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

- [x] **MAIL-01**: Resend sending domain has SPF and DKIM DNS records configured and verified for production email delivery (reset 2026-04-29 from `[x]` — Phase 13 missing VERIFICATION.md; reassigned to Phase 15 for verification backfill)
- [x] **MAIL-02**: When employer marks a job as filled, all applicants with unresolved status (applied, reviewed, interview, shortlisted) receive an automated notification email (reset 2026-04-29 from `[x]` — `notify-job-filled` Edge Function not deployed live; trigger fires-but-fails-silently. Reassigned to Phase 15)

### Bug Fixes

- [x] **BFIX-01**: Job search cards show "Applied" badge when the logged-in seeker has already applied to that job (replace hardcoded false). Badge appears for any application status (active or terminal); status-suffixed copy distinguishes (e.g. "Applied · Declined"). Apply tab is re-enabled for terminal statuses (re-apply allowed).
- [ ] **BFIX-02**: Employers can view seeker-uploaded documents (CV, certificates, references) via Supabase Storage signed URLs in the applicant dashboard. URL minting goes through an Edge Function with service role; URLs are per-click ephemeral with 15-minute expiry. (reset 2026-04-29 from `[x]` — code shipped + 14-VERIFICATION.md sub-phase 14-03 PARTIAL; PRIV-02 B.9 empirical identity-bypass test deferred. Reassigned to Phase 16)
- [x] **BFIX-03**: Seeker-uploaded documents are categorized by type at upload (CV / certificate / reference / identity / other). Existing untagged documents migrate as 'other' and are re-classifiable by the seeker. Identity documents are NEVER exposed to employers — the document-access Edge Function filters out `document_type='identity'` server-side before minting any signed URL. Employer view in the applicant dashboard is sectioned by non-identity category.

### Job Search

- [ ] **SRCH-13**: Seeker can save current filter combination as a named saved search
- [ ] **SRCH-14**: Seeker can load a previously saved search to restore all filter state
- [ ] **SRCH-15**: Seeker can delete saved searches they no longer need

## Pre-Launch Must-Fix

Items that **block v2.0 launch**. Surfaced during pre-Phase-14 stabilisation. Not assigned to a phase yet — must be scheduled before go-live.

- [ ] **UXBUG-01** *(pre-launch blocker)*: `Step7Preview.tsx` references `accommodation_pets`, `accommodation_couples`, `accommodation_family`, `accommodation_utilities_included` on `EmployerProfileData`, but those properties don't exist on the type. At runtime these access `undefined` and render as empty fields on the employer onboarding preview step (Step 7). Every employer hitting onboarding sees a half-broken preview before publishing. Investigate whether the fields were renamed during a migration, never added to the type, or never persisted at all. Found via `tsc -b` errors at `Step7Preview.tsx:129,161-164` (2026-04-27).
- [x] **AUTH-01** *(resolved 2026-04-28, config-only — no commit)*: Google OAuth login fails on signup/login flow. Email signup works. Was a Supabase Auth provider config issue — Google OAuth client_id/secret + whitelisted redirect URIs (localhost:5173, https://top-farms.vercel.app, future custom domain) verified at the OAuth handshake layer. End-to-end OAuth round-trip smoke test deferred — see UAT-04 in Deferred Validations. Closed.
- [x] **AUTH-02** *(resolved 2026-04-28 in cdc9df7)*: Email signup may not create `user_roles` row reliably. Symptom was new email-signup users landing on `/onboarding/seeker` but Step 1 Continue button silently failing because `seeker_profiles` upsert was RLS-rejected. Root cause was twofold: (a) `SelectRole.tsx` did a direct `.insert()` into `user_roles` that RLS rejected silently (no INSERT policy), and (b) the `handle_new_user` trigger row creation has occasional gaps. Fixed via migration 018's `set_user_role(p_role)` RPC (SECURITY DEFINER, validates auth + role, idempotent UPSERT, role allowlist excludes 'admin'); `SelectRole.tsx` now calls the RPC; `signUpWithRole` defensively backfills via the RPC if signUp returns an immediate session and no row exists. UAT 5 (idempotency) + UAT 6.1/6.2/6.3 (anon/admin/garbage) all passed. UAT 1/2 satisfied via synthetic `INSERT auth.users` Option B (form-based UAT blocked by Supabase email rate limit). UAT 4 (OAuth end-to-end) deferred — see UAT-04 in Deferred Validations. Closed.
- [x] **JOBS-01** *(resolved 2026-04-28 in c6066ea)*: `JobSearch.tsx` `fetchJobs` useEffect overfired due to `[searchParams, session?.user?.id, role]` deps, triggering three concurrent supabase queries that contended the auth-token Web Lock and produced AbortError lock-stealing. Symptom: `/jobs` rendered "0 jobs found" for authenticated seekers despite seeded UAT data. Fixed by gating the effect on `authLoading` from `useAuth` so `fetchJobs` fires exactly once after auth resolves (anonymous OR signed-in). Closed.
- [x] **BFIX-04** *(resolved 2026-04-29 in this commit)*: `ApplicantDashboard.tsx` selected `seeker_profiles.first_name` in the applicants listing query, but the column doesn't exist on the table. Postgres rejected the entire query with a 400 — silently to the user — so the employer applicant dashboard rendered "No applicants" even when applications existed in the DB. Fixed by removing `first_name` from the select. Note: type def at `ApplicantDashboard.tsx:24` and reference at `~:431` are now dead semantics (always `null`); cleanup deferred. Discovered during BFIX-02 UAT B.4 (sectioned UI render) — applicant row wasn't rendering until this query was repaired.
- [x] **NAV-02** *(resolved 2026-04-29 in this commit)*: `Sidebar.tsx` and `Nav.tsx` linked employers to `/applications` (no aggregate page exists — employer flow is per-job at `/dashboard/employer/jobs/:id/applicants`) and seekers to `/my-applications` (also non-existent — actual route is `/dashboard/seeker/applications`). Both produced 404s if clicked. Fixed by removing the employer entry entirely (kept comment marker for future aggregate-page consideration) and re-pointing the seeker link to the correct route. Discovered during BFIX-02 UAT navigation traversal.
- [x] **BFIX-05** *(resolved 2026-04-29 in this commit)*: Edge Functions configured with `verify_jwt: true` must NOT re-validate JWTs via `adminClient.auth.getUser(token)` — service-role-keyed clients route the `/auth/v1/user` API call differently and return errors on otherwise-valid ES256 tokens. Symptom in `get-applicant-document-url`: every authenticated employer call returned 401 "Invalid auth token" despite the gateway already accepting the same JWT signature. Fix: trust the gateway's signature verification (which is the whole point of `verify_jwt: true`), decode the JWT payload locally for `sub`, validate `aud === 'authenticated'`. Pattern: gateway-trust + local payload decode for any verify_jwt-enabled Edge Function. **Pattern check required for all future verify_jwt-enabled functions in Milestone 4+** — currently only `get-applicant-document-url` exhibited this, but any function copying the rejected pattern will break the same way.

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
- **SIGNUP-01**: Signup form silently swallows `email_address_invalid` errors from Supabase. Repro: enter an undeliverable address (e.g. `*@example.com`, `*@topfarms.test`) in `/signup`, submit — Supabase returns `400 email_address_invalid` and the button reverts to "Create account" with no toast or visible feedback. Discovered during AUTH-02 UAT 1/2 attempts (2026-04-28). The flow in `src/pages/auth/SignUp.tsx:88` does call `toast.error(result.error.message)`, so either Sonner is auto-dismissing before the user can see it, the toast region is being rendered off-screen, or `signUpWithRole` is not surfacing the AuthError correctly to `result.error`. Investigate the error-handling path and ensure the specific Supabase message is presented persistently until dismissed. Out of scope for AUTH-02 (the toast plumbing is unchanged in that commit). Logged 2026-04-28.
- **CORS-01**: Privacy-critical Edge Functions (currently `get-applicant-document-url`; future doc/PII handlers) use `Access-Control-Allow-Origin: '*'` for consistency with existing functions (notify-job-filled, send-followup-emails). Scope down to `https://top-farms.vercel.app` + `http://localhost:5173` once the production custom domain is stable. Browser will still send Authorization headers cross-origin, so this is principle-of-least-exposure rather than a security boundary. Logged 2026-04-29.
- **PRIV-01**: `get-applicant-document-url` returns a 404 vs 403 split (function lines ~152 "Application not found" and ~158 "Application does not belong to a job you own") which technically leaks application/document existence — a UUID that exists but is not owned by the caller produces a different status code than a UUID that doesn't exist. Low severity given application/document UUIDs are not enumerable, but consider unifying both to `403 "Document not accessible"` for hardening. Logged 2026-04-29.
- **DOC-TAB-01**: `ApplicantDocuments` is currently rendered inline within the applicant CV tab in `ApplicantPanel.tsx`. Inline placement matches the Phase 14-03 plan and ships with launch. Promotion to a dedicated "Documents" tab (alongside CV / Status & Notes / Match) is post-launch UX polish. Logged 2026-04-29.

### Deferred Investigations

- **AUTH-FIX** *(resolved 2026-04-28 in 2fce4b7)*: Root cause behind the loading-state hang surfaced by JOBS-01 — `useAuth.loadRole()` was hanging under Supabase auth-lock contention (StrictMode double-mount + 22 independent `useAuth` hook instances each spinning up their own `getSession + onAuthStateChange + loadRole` chain, contending the auth-token Web Lock). Mitigated in c6066ea via 3s `Promise.race` timeout. Fully fixed in 2fce4b7 by centralising auth state in a single `AuthProvider` context — one `getSession` + one `onAuthStateChange` subscription for the whole app, plus `TOKEN_REFRESHED` skip so cross-tab token sync doesn't reload role and falsely flip it to null. The 3s timeout from c6066ea kept as defence-in-depth. Closed.
- **AUTH-FIX-02** *(symptom mitigated 2026-04-29 in this commit)*: ProtectedRoute redirected to `/auth/select-role` when `loading=false, session=true, role=null`, which is the state produced by the c6066ea 3s `loadRole` timeout when the actual role lookup races past 3s. Symptom: any `requiredRole`-protected route (e.g. `/dashboard/seeker/documents`) briefly bounced through `/auth/select-role` and landed on `/dashboard/${resolved-role}` — pinwheel UX, route appeared "unreachable." Mitigated in ProtectedRoute by guarding `requiredRole && role === null` to render the loading spinner instead of redirecting. **Mitigation only — root cause is loadRole exceeding 3s under normal conditions.** Remaining work: investigate why loadRole exceeds 3s on normal navigation. Candidates: auth-token Web Lock contention surviving the 2fce4b7 AuthProvider centralisation; Supabase client cold-init on first navigation; subtle race between INITIAL_SESSION and loadRole chains. Either fix the latency, raise the timeout thoughtfully, or replumb AuthContext to expose a separate "role load attempted" flag so ProtectedRoute can differentiate "still resolving" from "definitively null." Note for whoever picks this up: 2fce4b7 was meant to resolve Web Lock contention by collapsing 22 independent useAuth instances into one provider, but Phase 14-02 UAT showed three loadRole timeouts firing on a single page navigation — meaning the centralisation didn't fully eliminate the latency. The remaining cause is something other than (or in addition to) multi-instance lock contention. Edge case not covered by mitigation: an OAuth user with `session=true` but no DB `user_roles` row who manually navigates to a `requiredRole` protected route would now see a perpetual spinner instead of bouncing to `/auth/select-role`. Acceptable for MVP — they can manually navigate. Logged 2026-04-29 from Phase 14-02 UAT.

### Deferred Validations

- **UAT-04**: AUTH-02 OAuth end-to-end smoke test deferred. AUTH-01 validated at OAuth handshake layer (UAT 1-3 in 2026-04-28 session, Google consent screen reachable, no 400). AUTH-02 `set_user_role` RPC independently validated by UAT 5 (idempotency) and UAT 6.1/6.2/6.3 (negative cases). The `SelectRole.tsx` RPC integration is unexercised end-to-end. To run when first real user signs up via Google, OR before MVP public launch — whichever comes first. ~5 min: clear site data → Google OAuth → SelectRole → verify `user_roles` row has chosen role (not default 'seeker'). Test idempotency on second login.
- **PRIV-02**: BFIX-02 UAT step B.9 (privacy bypass test) deferred from Phase 14-03 UAT. The `get-applicant-document-url` Edge Function defends against authenticated identity-doc requests via the document_type whitelist + explicit identity exclusion at the function layer (defence-in-depth — RLS already filters identity from the listing payload), but empirical confirmation by direct API attack from an authenticated employer JWT was not run before commit. **Must execute against the deployed function before public launch.** Test snippet (run in employer-authenticated browser console at top-farms.vercel.app):
   ```js
   const tokenJson = localStorage.getItem('sb-inlagtgpynemhipnqvty-auth-token')
   const sess = JSON.parse(tokenJson)
   await fetch('https://inlagtgpynemhipnqvty.supabase.co/functions/v1/get-applicant-document-url', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sess.access_token}` },
     body: JSON.stringify({
       application_id: '2a91e3db-a02a-4f44-96e7-2be9897bcadf',
       document_id: '31ed32e7-5581-4f26-930a-8051f40049a3'
     })
   }).then(async r => `${r.status} ${JSON.stringify(await r.json())}`)
   ```
   Expected: `403 {"error":"Identity documents are not accessible to employers"}`. Acceptable variants: `404` (if PRIV-01 unification applied), or any 4xx without a `signed_url`/`url` field. **Hard fail: 200 with signed URL.** Owner: harry. **Blocker for: public launch.** Logged 2026-04-29.

### Operations

- **DEPLOY-01**: Live Supabase DB was 2 migrations behind repo head during 14-01 work — migrations 016 and 017 had not been applied to production. 016 was applied manually via Supabase Studio in 14-01 session; **017 applied via Studio in cleanup-session 2026-04-29** (runtime artefacts verified: `pg_net` extension, `public.handle_job_filled` function, `on_job_filled` trigger on `public.jobs`). **Sub-finding:** Studio-applied migrations don't write `supabase_migrations.schema_migrations` rows, so `list_migrations` is not the full source of truth for what's deployed. Both 016 and 017 are functionally live but registry-rowless — see `supabase/migrations/NAMING.md` lookup table for the dual-state convention. Process gap: deployments don't auto-apply Supabase migrations, so repo and DB drift silently. Action: add a migration-apply step to the Vercel deploy pipeline (`supabase db push` or `supabase migration up` against the linked project) gated behind a dry-run check. Logged 2026-04-28 from 14-01 UAT prep. **Updated 2026-04-29 — Edge Function deploy drift discovered**: in addition to migration drift, 4 Edge Functions exist on disk under `supabase/functions/` (`acknowledge-placement-fee`, `create-placement-invoice`, `notify-job-filled`, `send-followup-emails`) but are NOT deployed live. The function-deploy gap mirrors the migration-apply gap and has the same root cause (no CI step). Note: the 017 trigger applied above calls `notify-job-filled` Edge Function via `pg_net`; that function is part of the undeployed set, so the trigger fires-but-fails-silently until the function ships. Action: extend the migration-apply CI step above to also `supabase functions deploy --project-ref` for any function whose source on disk has changed since the last deployment. Pre-Milestone-4 audit: cross-reference all `supabase.functions.invoke` callsites in `src/` against `list_edge_functions` output to identify any other client-referenced functions that aren't actually deployed.
- **MCP-QUIRK-01**: Supabase MCP `list_tables` tool rejects its own documented `schemas: ["public"]` array argument with `ZodError: expected array, received string` (observed 2026-04-28 during Phase 14-02 migration 019 verification). Workaround: verify table existence via `pg_constraint` / `pg_indexes` / `pg_policies` queries against the table name instead — those return non-empty results only when the table exists, so they're a functional substitute. Tool-side bug, not a DB issue. Re-test on next supabase-mcp version bump; if still broken, file upstream. Logged 2026-04-28.

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
| MAIL-01 | Phase 15 | Pending (reassigned 2026-04-29 from Phase 13 — VERIFICATION backfill) |
| MAIL-02 | Phase 15 | Pending (reassigned 2026-04-29 from Phase 13 — function deploy + verify) |
| BFIX-01 | Phase 14 | Complete |
| BFIX-02 | Phase 16 | Pending (reassigned 2026-04-29 from Phase 14 — PRIV-02 empirical test) |
| BFIX-03 | Phase 14 | Complete |
| SRCH-13 | Phase 17 | Pending (reassigned 2026-04-29 from Phase 15) |
| SRCH-14 | Phase 17 | Pending (reassigned 2026-04-29 from Phase 15) |
| SRCH-15 | Phase 17 | Pending (reassigned 2026-04-29 from Phase 15) |

**Coverage:**
- v2.0 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-29 — gap closure planning per `/gsd:audit-milestone` v2.0-MILESTONE-AUDIT.md. Reset MAIL-01/MAIL-02/BFIX-02 from `[x]` to `[ ]` and reassigned to gap closure phases: MAIL-01 + MAIL-02 → Phase 15 (Email Pipeline Deploy & Verify), BFIX-02 → Phase 16 (Privacy Bypass Empirical Test). Renumbered Saved Search Phase 15 → Phase 17. Added Phase 18 (Tech Debt Cleanup) per cleanup-pass discipline (drift risks compound; better than v2.1 defer). BFIX-01 + BFIX-03 retained `[x]` (verification PASS; SUMMARY frontmatter cosmetic gap to be addressed in Phase 18).*

*Earlier same-day: closed Phase 14-03 BFIX-02 code (employer document viewer with 5-layer privacy gate; identity hard-filtered at three layers — RLS / Edge Function whitelist / listing-query filter; B.9 privacy bypass test deferred to PRIV-02 — blocker for public launch). Logged BFIX-04 (silent applicants query failure from non-existent column), NAV-02 (broken /applications + /my-applications routes), BFIX-05 (Edge Function `verify_jwt` + service-role `auth.getUser` quirk — pattern check required for all future verify_jwt functions), CORS-01 (scope Allow-Origin post-launch), PRIV-01 (404/403 unification post-launch), DOC-TAB-01 (dedicated docs tab post-launch UX polish). Widened DEPLOY-01 with Edge Function deploy drift (4 functions on disk, none deployed). Earlier same-day: closed Phase 14-02 BFIX-03 (seeker_documents migration + per-file categorization + re-categorize page); logged AUTH-FIX-02 (mitigated symptom of c6066ea 3s timeout) and MCP-QUIRK-01 (Supabase MCP list_tables Zod bug)*
