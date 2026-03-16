---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
stopped_at: Phase 4 context gathered
last_updated: "2026-03-16T05:41:02.851Z"
last_activity: "2026-03-15 — Plan 02-06 complete: EmployerDashboard rebuild (job cards, filter tabs, stats, verification nudge), MarkFilledModal, JobDetail (visitor sticky CTA, trust badge), 008_job_expiry_cron.sql, main.tsx route wiring"
progress:
  total_phases: 6
  completed_phases: 3
  total_plans: 17
  completed_plans: 17
  percent: 30
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-15)

**Core value:** Farm employers and seekers can find each other through agriculture-specific matching that no generic platform provides — shed type, accommodation, DairyNZ qualifications, and herd size experience
**Current focus:** Phase 2 — Employer Supply Side (COMPLETE)

## Current Position

Phase: 2 of 6 (Employer Supply Side) — COMPLETE
Plan: 6 of 6 in current phase — COMPLETE
Status: Phase 2 complete — EmployerDashboard with job management, JobDetail public page, MarkFilledModal, pg_cron expiry, all routes wired
Last activity: 2026-03-15 — Plan 02-06 complete: EmployerDashboard rebuild (job cards, filter tabs, stats, verification nudge), MarkFilledModal, JobDetail (visitor sticky CTA, trust badge), 008_job_expiry_cron.sql, main.tsx route wiring

Progress: [██████░░░░] 30%

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: 3.6 min
- Total execution time: 0.2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 4 | 14 min | 3.5 min |
| 02-employer-supply-side | 1 | 5 min | 5 min |

**Recent Trend:**
- Last 5 plans: 01-01 (5 min), 01-02 (2 min), 01-03 (4 min), 01-04 (3 min), 02-01 (5 min)
- Trend: Stable

*Updated after each plan completion*

| Phase 02-employer-supply-side P02 | 4 min | 2 tasks | 11 files |
| Phase 02-employer-supply-side P03 | 3 min | 2 tasks | 5 files |
| Phase 02-employer-supply-side P04 | 4 | 2 tasks | 8 files |
| Phase 02-employer-supply-side P05 | 8 | 2 tasks | 7 files |
| Phase 02-employer-supply-side P06 | 4 min | 2 tasks | 5 files |
| Phase 03-seeker-demand-side P00 | 3min | 2 tasks | 8 files |
| Phase 03-seeker-demand-side P01 | 7 | 2 tasks | 2 files |
| Phase 03-seeker-demand-side P02 | 8 | 2 tasks | 9 files |
| Phase 03-seeker-demand-side P03 | 20 | 2 tasks | 5 files |
| Phase 03-seeker-demand-side P04 | 8min | 2 tasks | 2 files |
| Phase 03-seeker-demand-side P05 | 22 | 2 tasks | 4 files |
| Phase 03-seeker-demand-side P06 | 5 | 2 tasks | 4 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [01-01]: @tailwindcss/vite used for Tailwind v4 — CSS-first @theme directive, no tailwind.config.js
- [01-01]: seeker_contacts is a SEPARATE table from seeker_profiles — contact masking architecture enforced at schema level
- [01-01]: user_roles table is authoritative role source for RLS — get_user_role() security definer prevents recursion
- [01-01]: handle_new_user() trigger creates user_roles row atomically with auth.users insert, defaulting to 'seeker'
- [01-01]: tailwind-merge@3 required — v2 incompatible with Tailwind v4 CSS variable classes
- [01-01]: react-router@7 unified package used (not react-router-dom)
- [Research]: Zod v4 + `@hookform/resolvers` v5 import paths changed — verify correct imports on first form implementation
- [01-02]: Input uses forwardRef for react-hook-form register() compatibility in future form implementations
- [01-02]: Checkbox onCheckedChange normalises Radix boolean | 'indeterminate' to plain boolean for simpler consumer API
- [01-02]: Select uses position=popper with sideOffset=4 for proper dropdown positioning relative to trigger
- [01-02]: data-[state=checked] Radix attribute selectors used directly in Tailwind class strings for stateful styling
- [01-03]: signUpWithRole passes role in metadata.data.role — handle_new_user() DB trigger owns user_roles insert (never from client)
- [01-03]: Auth pages use direct Tailwind + CSS variable inline styles (not Plan 02 design system) — parallel builds, no circular dependency
- [01-03]: ResetPassword waits 5s for PASSWORD_RECOVERY event before showing invalid-link UI
- [01-04]: Router defined with createBrowserRouter in main.tsx — App.tsx replaced with null shell
- [01-04]: Button has no as/polymorphic prop — dashboard CTAs use Link styled via cn() with equivalent class strings
- [01-04]: Login navigation uses useRef didSubmit + useEffect on session/role/loading — avoids premature redirect before role loads
- [01-04]: ProtectedRoute redirects wrong-role users to /dashboard/${role} not /login — employer on seeker route goes straight to their dashboard
- [02-01]: useWizard is 0-indexed with progress = (currentStep / (totalSteps - 1)) * 100 — wizard shell owns database persistence, hook manages navigation state only
- [02-01]: employer_verifications uses UNIQUE(employer_id, method) — each method has one record per employer, upserted on verification event
- [02-01]: TrustLevel computed from verifications: unverified → no verified records; basic → email; verified → email+phone; fully_verified → email+phone+(nzbn or document)+farm_photo
- [02-01]: Storage buckets use path-scoped RLS via storage.foldername(name)[1] = auth.uid()::text to prevent path guessing even in public buckets
- [02-01]: SkillsPicker's requirementMode prop allows reuse for both seeker proficiency (basic/intermediate/advanced) and job posting requirement (required/preferred)
- [02-02]: Wizard shell owns all Supabase persistence — upserts employer_profiles with onboarding_step incremented on each step; last step also sets onboarding_complete: true
- [02-02]: PGRST116 error code used to distinguish no-rows (new user) from real DB error in profile load on mount
- [02-02]: Step5 (Verification) and Step6 (Pricing) pass empty object to onComplete — both are informational screens with no required data
- [02-02]: Step7Preview uses onGoToStep prop from wizard shell for targeted back-navigation while preserving linear-order architecture
- [Phase 02-03]: EmployerVerification hub auto-creates email verification record on mount (after verifications loaded) using useEffect guard on loadingVerifications
- [Phase 02-03]: Phone and NZBN verification expand inline via toggleExpand state — only one method expanded at a time
- [Phase 02-03]: FarmPhotoUpload renders all photos by listing the storage bucket path rather than just the latest document_url — allows multiple photos while keeping verification record schema simple
- [Phase 02-03]: Routes for verification pages deferred to plan 02-06 to avoid main.tsx parallel edit conflicts
- [Phase 02-04]: PostJob shell does INSERT on step 1 (no jobId), UPDATE on re-visit (jobId present from URL param)
- [Phase 02-04]: URL updated via replaceState after draft insert so /jobs/:id/edit works on reload
- [Phase 02-04]: JobStep3Skills uses delete+insert pattern for job_skills to handle edits cleanly
- [Phase 02-04]: JobStep6Preview loads from Supabase with job_skills join rather than wizard state for accuracy
- [Phase 02-05]: employer_profiles.id (not auth.users.id) is the correct employer_id FK for jobs table
- [Phase 02-05]: Stripe v14 imported from esm.sh in Deno Edge Functions for PaymentIntent and webhook
- [Phase 02-05]: First-listing-free: listing_fees count check in Edge Function (server-side) prevents race conditions
- [02-06]: JobDetail loads employer verifications via separate query (not nested join) for clarity and reliability
- [02-06]: /jobs/:id is public (no ProtectedRoute) — component handles auth-gated views internally based on session/role
- [02-06]: /jobs/new route placed before /jobs/:id in router config to prevent 'new' matching as :id param
- [02-06]: MarkFilledModal handles no-applicants case gracefully — employer can mark filled externally before Phase 3 applications exist
- [Phase 03-00]: vitest mergeConfig(viteConfig) pattern used so @ alias from vite.config.ts is inherited automatically
- [Phase 03-00]: CSS disabled in test environment (css: false) to avoid Tailwind v4 parsing overhead in vitest
- [Phase 03-01]: compute_match_score returns jsonb with total_score + breakdown; batch function loops returning TABLE — avoids N+1 on search page
- [Phase 03-01]: Location scoring: open_to_relocate=true gives 16pts (80%), outranking adjacency (60%) — rewards seeker flexibility explicitly
- [Phase 03-01]: Phase 3 types: all seeker-side enums exported as const arrays with value/label shape for direct UI consumption
- [Phase 03-02]: SeekerOnboarding.tsx tracks seekerProfileId in state from first upsert response — enables skills step delete+insert without requiring pre-existing profile row
- [Phase 03-02]: SkillsPicker sector: sheep_beef only if that's the sole sector_pref; otherwise dairy — avoids passing union string type to 'dairy' | 'sheep_beef' prop
- [Phase 03-02]: Post-onboarding redirect: /jobs?sector={firstSector}&region={region} with URLSearchParams for clean param building
- [Phase 03-03]: __salary__ special key used in onFilterChange for atomic salary_min + salary_max batch update via functional setSearchParams — avoids race condition from two sequential calls on same searchParams snapshot
- [Phase 03-03]: handleFilterChange uses functional setSearchParams(prev => ...) for all filter updates — ensures serial calls read latest state
- [Phase 03-03]: Employer verifications fetched in single batch query after job results, stored in Map<employerId> to avoid per-card queries
- [Phase 03-04]: MatchBreakdown uses DIMENSIONS const array for DRY dimension config — label, key, max in one place
- [Phase 03-04]: Visitor teaser uses hardcoded realistic score (VISITOR_TEASER_SCORE=78) to show meaningful blurred preview rather than empty state
- [Phase 03-04]: JobDetail loadJob useEffect depends on [jobId, session, role] to re-fetch seeker data on auth change
- [Phase 03-04]: Apply button disabled (not hidden) when seekerProfileId is null — preserves layout, shows toast 'Complete your profile before applying'
- [Phase 03-05]: ApplicationCard withdraw uses window.confirm() guard before calling onWithdraw callback — prevents accidental withdrawals
- [Phase 03-05]: Supabase seeker_profiles join returns array — normalised to object with Array.isArray check
- [Phase 03-05]: VALID_TRANSITIONS empty array renders 'Final stage' text instead of empty dropdown for hired/declined/withdrawn
- [Phase 03-05]: Status Tag variant mapping: applied=blue, review=hay, interview=orange, shortlisted=purple, offered/hired=green, declined=red, withdrawn=grey
- [Phase 03-06]: Removed Placeholder and OnboardingPlaceholder from main.tsx — all Phase 3 routes now have real components, no future-phase placeholders remain
- [Phase 03-06]: Sidebar seeker nav omits Settings item — no seeker settings page exists yet; employer-only for now

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 4 setup]: Verify `pg_cron` vs Supabase scheduled functions availability in the project's Supabase plan tier before implementing the nightly batch recompute
- [Phase 5 setup]: Resend SPF/DKIM DNS configuration must be initiated before Phase 5 testing begins (24-48h DNS propagation lead time)
- [Phase 6 setup]: E2E testing framework choice (Playwright vs Cypress) needs a decision before Phase 6 begins

## Session Continuity

Last session: 2026-03-16T05:41:02.840Z
Stopped at: Phase 4 context gathered
Resume file: .planning/phases/04-match-scoring-engine/04-CONTEXT.md
