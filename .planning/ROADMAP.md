# Roadmap: TopFarms

## Milestones

<details>
<summary>v1.0 MVP (Phases 1-6) — SHIPPED 2026-03-17</summary>

- [x] Phase 1: Foundation (4/4 plans) — completed 2026-03-15
- [x] Phase 2: Employer Supply Side (6/6 plans) — completed 2026-03-15
- [x] Phase 3: Seeker Demand Side (7/7 plans) — completed 2026-03-16
- [x] Phase 4: Match Scoring Engine (4/4 plans) — completed 2026-03-16
- [x] Phase 5: Revenue Protection (4/4 plans) — completed 2026-03-17
- [x] Phase 6: Landing Page and Launch (2/2 plans) — completed 2026-03-17

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>v1.1 SPEC Compliance (Phases 7-11) — SHIPPED 2026-03-23</summary>

- [x] Phase 7: UI Primitives (3/3 plans) — completed 2026-03-22
- [x] Phase 8: Wizard Field Extensions (5/5 plans) — completed 2026-03-21
- [x] Phase 9: Page-Level Integrations (6/6 plans) — completed 2026-03-22
- [x] Phase 10: Landing Page (3/3 plans) — completed 2026-03-22
- [x] Phase 11: Backend-Dependent Features (2/2 plans) — completed 2026-03-22

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

### v2.0 Launch Readiness (In Progress)

**Milestone Goal:** Close 6 launch-critical gaps so TopFarms can go live — OAuth signup, production email, bug fixes, and saved search.

- [ ] **Phase 12: OAuth Authentication** — Add Google and Facebook OAuth with role selection for new OAuth users
- [ ] **Phase 13: Email & Notifications** — Production email deliverability and auto-ghosting prevention
- [ ] **Phase 14: Bug Fixes** — hasApplied badge and document viewing via signed URLs
- [ ] **Phase 15: Saved Search** — Seeker can save, load, and delete filter combinations

## Phase Details

### Phase 12: OAuth Authentication
**Goal**: A user can sign up and log in with Google or Facebook, select their role on first OAuth login, and be routed to the correct onboarding — matching the existing email/password flow
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-06, AUTH-07, AUTH-08
**Plans:** 1/2 plans executed
Plans:
- [ ] 12-01-PLAN.md — OAuth buttons on Login/SignUp, useAuth extensions, Wave 0 test scaffolds
- [ ] 12-02-PLAN.md — SelectRole page, ProtectedRoute role-null redirect, route wiring
**Success Criteria** (what must be TRUE):
  1. A new user can click "Sign in with Google" on the login/signup page, complete the Google OAuth flow, and land on the role selection screen
  2. A new user can click "Sign in with Facebook" on the login/signup page, complete the Facebook OAuth flow, and land on the role selection screen
  3. An OAuth user who has not yet selected a role is prompted to choose Employer or Seeker before proceeding — selecting a role creates the user_roles record and routes to the correct onboarding wizard
  4. A returning OAuth user who already has a role is logged in and routed directly to their dashboard without re-selecting a role

### Phase 13: Email & Notifications
**Goal**: Transactional emails reliably reach inboxes (not spam) and applicants are automatically notified when a job they applied to is marked as filled
**Depends on**: Nothing (independent of Phase 12)
**Requirements**: MAIL-01, MAIL-02
**Success Criteria** (what must be TRUE):
  1. SPF and DKIM DNS records are configured for the Resend sending domain and pass verification — confirmed via Resend dashboard showing "Verified" status
  2. A test email sent via Resend from the configured domain arrives in Gmail/Outlook inbox (not spam folder)
  3. When an employer marks a job as "filled", every applicant with status applied, reviewed, interview, or shortlisted receives an email notifying them the position has been filled
  4. Applicants who already have a terminal status (hired, declined, withdrawn) do NOT receive the filled notification

### Phase 14: Bug Fixes
**Goal**: Two known v1.1 tech debt items are resolved — seekers see which jobs they've applied to, and employers can view uploaded documents
**Depends on**: Nothing (independent)
**Requirements**: BFIX-01, BFIX-02
**Success Criteria** (what must be TRUE):
  1. A logged-in seeker viewing job search results sees an "Applied" badge on every job card they have already submitted an application to
  2. The applied status is fetched efficiently (single batch query for all visible job IDs, not per-card)
  3. An employer viewing an applicant's panel in the applicant dashboard can click to view the seeker's uploaded CV, certificates, and references — documents open via Supabase Storage signed URLs
  4. Signed URLs expire after a reasonable time window (e.g., 60 minutes) and are not permanently accessible

### Phase 15: Saved Search
**Goal**: A seeker can save their current filter state as a named search, reload it later, and delete searches they no longer need
**Depends on**: Nothing (independent)
**Requirements**: SRCH-13, SRCH-14, SRCH-15
**Success Criteria** (what must be TRUE):
  1. A logged-in seeker with active filters can click "Save search", enter a name, and have the current filter combination persisted to the database
  2. A seeker can view their list of saved searches and click one to restore all filter state — the URL updates and results refresh to match
  3. A seeker can delete a saved search from their list — it is removed from the database and no longer appears
  4. Saved searches persist across sessions — a seeker who logs out and back in can still access their saved searches

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-6 | v1.0 | 27/27 | Complete | 2026-03-17 |
| 7-11 | v1.1 | 19/19 | Complete | 2026-03-23 |
| 12. OAuth Authentication | 1/2 | In Progress|  | — |
| 13. Email & Notifications | v2.0 | 0/? | Pending | — |
| 14. Bug Fixes | v2.0 | 0/? | Pending | — |
| 15. Saved Search | v2.0 | 0/? | Pending | — |
