# Phase 5 — inline-style migration ledger

Generated Stage 1, before any migration, at commit `772ec4c`.
The planning artefact for Task 5.1: what has to move, in what order, and which
files sit on a route the Phase 4 axe gate already watches.

**Totals: 79 files · 445 `style={{` · 466 `var(--color-…)` · 23 hex literals · 433 `text-[Npx]`**

`colour` counts `var(--color-…)` references anywhere in the file — the migration
target. `axe` marks files rendering on one of the six Phase 4 axe routes: those
regress loudest and are migrated first inside their surface class.

Order within each surface is heaviest-first by `style={{` count, per the brief.

## employer — 26 files · 171 `style={{` · 181 colour refs

| # | File | `style={{` | colour | hex | `text-[Npx]` | axe route |
|---|---|---|---|---|---|---|
| 1 | `pages/dashboard/EmployerDashboard.tsx` | 27 | 27 |  | 12 |  |
| 2 | `pages/jobs/steps/JobStep6Preview.tsx` | 13 | 13 |  |  |  |
| 3 | `pages/jobs/MarkFilledModal.tsx` | 12 | 12 |  | 3 |  |
| 4 | `pages/onboarding/steps/Step8Complete.tsx` | 11 | 12 |  | 8 |  |
| 5 | `pages/dashboard/employer/HireConfirmModal.tsx` | 10 | 13 |  | 5 |  |
| 6 | `pages/jobs/steps/JobStep7Payment.tsx` | 10 | 10 |  |  |  |
| 7 | `pages/dashboard/employer/PlacementFeeModal.tsx` | 9 | 9 |  | 9 |  |
| 8 | `pages/jobs/steps/JobStep8Success.tsx` | 8 | 7 |  | 6 |  |
| 9 | `pages/onboarding/steps/Step7Preview.tsx` | 7 | 10 |  | 10 |  |
| 10 | `pages/jobs/steps/JobStep2FarmDetails.tsx` | 6 | 6 |  | 11 |  |
| 11 | `pages/onboarding/steps/Step4Accommodation.tsx` | 6 | 6 |  | 11 |  |
| 12 | `pages/dashboard/employer/ApplicantDashboard.tsx` | 5 | 6 |  | 7 | **yes** |
| 13 | `pages/onboarding/steps/Step5Verification.tsx` | 5 | 6 |  | 5 |  |
| 14 | `pages/jobs/steps/JobStep4Compensation.tsx` | 5 | 5 |  | 7 |  |
| 15 | `pages/onboarding/steps/Step1FarmType.tsx` | 5 | 5 |  | 3 |  |
| 16 | `pages/onboarding/steps/Step6Pricing.tsx` | 4 | 5 |  | 2 |  |
| 17 | `pages/jobs/steps/JobStep1Basics.tsx` | 4 | 4 |  | 3 |  |
| 18 | `pages/onboarding/steps/Step3Culture.tsx` | 4 | 4 |  | 8 |  |
| 19 | `pages/jobs/steps/JobStep5Description.tsx` | 3 | 4 |  | 4 |  |
| 20 | `pages/jobs/PostJob.tsx` | 3 | 3 |  |  |  |
| 21 | `pages/onboarding/EmployerOnboarding.tsx` | 3 | 3 |  |  |  |
| 22 | `pages/onboarding/steps/Step2FarmDetails.tsx` | 3 | 3 |  | 6 |  |
| 23 | `pages/jobs/steps/JobStep3Skills.tsx` | 2 | 2 |  | 2 |  |
| 24 | `pages/verification/DocumentUpload.tsx` | 2 | 2 |  | 9 |  |
| 25 | `pages/verification/EmployerVerification.tsx` | 2 | 2 | 2 | 19 |  |
| 26 | `pages/verification/FarmPhotoUpload.tsx` | 2 | 2 |  | 8 |  |

## admin — 24 files · 181 `style={{` · 192 colour refs

| # | File | `style={{` | colour | hex | `text-[Npx]` | axe route |
|---|---|---|---|---|---|---|
| 1 | `pages/admin/AdminLeadsStaging.tsx` | 23 | 27 |  | 23 |  |
| 2 | `components/admin/ProfileDrawer.tsx` | 21 | 24 |  | 15 |  |
| 3 | `components/layout/AdminSidebar.tsx` | 12 | 13 |  | 2 |  |
| 4 | `pages/admin/AdminDocumentsQueue.tsx` | 11 | 11 |  | 13 |  |
| 5 | `pages/admin/AdminLoginPage.tsx` | 10 | 15 |  | 2 |  |
| 6 | `components/admin/AdminTable.tsx` | 9 | 11 |  | 1 |  |
| 7 | `pages/admin/AdminLeads.tsx` | 9 | 9 |  | 9 |  |
| 8 | `pages/admin/AdminLeadsOutreach.tsx` | 9 | 9 |  | 10 |  |
| 9 | `components/admin/DrawerShell.tsx` | 8 | 9 |  |  |  |
| 10 | `components/admin/LeadsFunnel.tsx` | 8 | 9 |  | 3 |  |
| 11 | `pages/admin/AdminRevenue.tsx` | 8 | 8 |  | 13 |  |
| 12 | `components/admin/LeadsWorklist.tsx` | 7 | 9 |  | 3 |  |
| 13 | `pages/admin/AdminAnalytics.tsx` | 7 | 7 |  | 14 |  |
| 14 | `pages/admin/JobsManagement.tsx` | 5 | 5 |  | 5 |  |
| 15 | `pages/admin/PlacementPipeline.tsx` | 5 | 5 |  | 5 |  |
| 16 | `pages/admin/DailyBriefing.tsx` | 5 | 0 |  | 12 |  |
| 17 | `components/admin/LeadContact.tsx` | 4 | 4 |  | 6 |  |
| 18 | `pages/admin/AdminSkillCoverage.tsx` | 4 | 4 |  | 4 |  |
| 19 | `pages/admin/EmployerList.tsx` | 4 | 4 |  | 4 |  |
| 20 | `pages/admin/SeekerList.tsx` | 4 | 4 |  | 4 |  |
| 21 | `components/admin/AdminNotesField.tsx` | 3 | 4 |  | 3 |  |
| 22 | `components/admin/AdminPageHeader.tsx` | 2 | 0 |  | 2 |  |
| 23 | `components/admin/KpiCard.tsx` | 2 | 0 |  | 3 |  |
| 24 | `components/layout/AdminLayout.tsx` | 1 | 1 |  |  |  |

## auth — 3 files · 5 `style={{` · 4 colour refs

| # | File | `style={{` | colour | hex | `text-[Npx]` | axe route |
|---|---|---|---|---|---|---|
| 1 | `components/layout/AuthLayout.tsx` | 2 | 4 |  |  |  |
| 2 | `pages/auth/SignUp.tsx` | 2 | 0 | 7 |  |  |
| 3 | `pages/auth/Login.tsx` | 1 | 0 | 7 |  |  |

## marketing — 8 files · 15 `style={{` · 13 colour refs

| # | File | `style={{` | colour | hex | `text-[Npx]` | axe route |
|---|---|---|---|---|---|---|
| 1 | `components/landing/HeroSection.tsx` | 4 | 0 |  | 6 | **yes** |
| 2 | `components/landing/AIMatchingSection.tsx` | 3 | 0 | 3 | 1 | **yes** |
| 3 | `pages/Pricing.tsx` | 2 | 7 | 1 |  |  |
| 4 | `pages/legal/Terms.tsx` | 2 | 0 |  |  |  |
| 5 | `components/landing/HowItWorksSection.tsx` | 1 | 3 |  |  | **yes** |
| 6 | `components/landing/FeaturedListings.tsx` | 1 | 2 |  | 3 | **yes** |
| 7 | `components/landing/TestimonialsSection.tsx` | 1 | 1 |  |  | **yes** |
| 8 | `components/landing/CountersSection.tsx` | 1 | 0 |  |  | **yes** |

## shared — 18 files · 73 `style={{` · 76 colour refs

| # | File | `style={{` | colour | hex | `text-[Npx]` | axe route |
|---|---|---|---|---|---|---|
| 1 | `components/layout/Nav.tsx` | 15 | 18 |  | 1 | **yes** |
| 2 | `components/ui/MatchBreakdown.tsx` | 9 | 10 |  | 10 | **yes** |
| 3 | `components/ui/ApplicantDocuments.tsx` | 8 | 8 |  | 12 | **yes** |
| 4 | `pages/NotFound.tsx` | 6 | 8 |  |  |  |
| 5 | `components/layout/AppErrorBoundary.tsx` | 6 | 6 |  | 3 |  |
| 6 | `components/ui/ApplicantPanel.tsx` | 6 | 6 |  | 46 | **yes** |
| 7 | `components/ui/AICandidateSummary.tsx` | 6 | 3 |  | 4 | **yes** |
| 8 | `components/layout/Sidebar.tsx` | 3 | 4 |  |  | **yes** |
| 9 | `components/ui/SearchHero.tsx` | 2 | 1 | 1 | 4 | **yes** |
| 10 | `components/tremor/AreaChart.tsx` | 2 | 0 | 1 |  |  |
| 11 | `components/tremor/BarChart.tsx` | 2 | 0 | 1 |  |  |
| 12 | `components/ui/Skeleton.tsx` | 2 | 0 |  |  |  |
| 13 | `components/ui/SearchJobCard.tsx` | 1 | 4 |  | 3 | **yes** |
| 14 | `components/ui/ExpandableCardTabs.tsx` | 1 | 3 |  | 10 |  |
| 15 | `components/ui/MyApplicationsSidebar.tsx` | 1 | 3 |  | 11 | **yes** |
| 16 | `components/layout/DashboardLayout.tsx` | 1 | 1 |  |  | **yes** |
| 17 | `components/ui/FilterSidebar.tsx` | 1 | 1 |  | 5 | **yes** |
| 18 | `components/ui/ProgressBar.tsx` | 1 | 0 |  |  |  |

## Batch plan

Landed first, before any page (every migration consumes them):

| Order | Commit | Why first |
|---|---|---|
| 1 | canon amendment — `Brand_and_Design.md:53` | The 44×44 line is wrong (AA vs AAA) and the code already contradicts it. Migrating pages against a false spec bakes it in |
| 2 | type scale tokens (Task 5.2) | Every page migration maps `text-[Npx]` onto these. Late = migrate twice |

Then page commits, heaviest-first within surface, seeker/employer before admin
(the axe gate watches them; admin has no automated visual coverage):

| Order | Scope | Rationale |
|---|---|---|
| 3 | `JobDetail.tsx` | Heaviest file in the repo (55) and on an axe route |
| 4 | `SeekerDashboard.tsx` + seeker dashboard children | Axe route, mobile-first surface |
| 5 | `EmployerDashboard.tsx`, `ApplicantDashboard.tsx` | Axe route (applicants); Task 5.6's false-empty-state lives here |
| 6 | `SignUp.tsx` + `auth/*` | Every user passes through once, usually on a phone |
| 7 | onboarding steps (seeker, then employer) | High file count, low per-file weight — grouped commits |
| 8 | `jobs/steps/*` (PostJob wizard) | Grouped |
| 9 | `admin/*` + `components/admin/*` | Full cheat-sheet density applies here; desktop-only |
| 10 | `components/*` residue (layout, ui, saved-search, tremor) | Shared shells last — they are consumed by everything above, so migrating them early would churn the pages twice |
| 11 | marketing (`Home`, landing/*, `ForEmployers`, `Pricing`, legal) | Out of cheat-sheet scope; keeps its airier scale. Colour tokens still migrate |

**Not migrated:** `components/stripe/PaymentForm.tsx` — the Stripe Elements
`appearance` object takes hex strings through Stripe's API, not CSS classes.
Sanctioned exception per Task 5.3; gets a comment saying why.
