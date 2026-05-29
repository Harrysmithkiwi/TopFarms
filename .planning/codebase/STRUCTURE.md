# Codebase Structure

**Analysis Date:** 2026-05-29

## Directory Layout

```
topfarms/
├── index.html                          # SPA entry point
├── src/
│   ├── main.tsx                        # React Router config + AuthProvider root
│   ├── index.css                       # Tailwind CSS
│   ├── pages/                          # Domain-feature folder convention (NOT Next.js Pages Router)
│   │   ├── Home.tsx                    # Landing page
│   │   ├── ForEmployers.tsx            # Employer marketing page
│   │   ├── Pricing.tsx                 # Pricing page
│   │   ├── auth/                       # Authentication flow
│   │   │   ├── Login.tsx
│   │   │   ├── SignUp.tsx
│   │   │   ├── VerifyEmail.tsx
│   │   │   ├── SelectRole.tsx
│   │   │   ├── ForgotPassword.tsx
│   │   │   ├── ResetPassword.tsx
│   │   │   └── Suspended.tsx           # Phase 21: gate for isActive=false users
│   │   ├── onboarding/                 # Wizard flows
│   │   │   ├── EmployerOnboarding.tsx  # 8-step employer setup wizard
│   │   │   ├── SeekerOnboarding.tsx    # 7-step seeker setup wizard
│   │   │   └── steps/
│   │   │       ├── Step1FarmType.tsx
│   │   │       ├── Step2FarmDetails.tsx
│   │   │       ├── Step3Culture.tsx
│   │   │       ├── Step4Accommodation.tsx
│   │   │       ├── Step5Verification.tsx
│   │   │       ├── Step6Pricing.tsx
│   │   │       ├── Step7Preview.tsx
│   │   │       ├── Step8Complete.tsx
│   │   │       ├── SeekerStep1FarmType.tsx
│   │   │       ├── SeekerStep2Experience.tsx
│   │   │       ├── SeekerStep3Qualifications.tsx
│   │   │       ├── SeekerStep4Skills.tsx
│   │   │       ├── SeekerStep5LifeSituation.tsx
│   │   │       ├── SeekerStep6Visa.tsx
│   │   │       └── SeekerStep7Complete.tsx
│   │   ├── dashboard/
│   │   │   ├── EmployerDashboard.tsx   # Employer home
│   │   │   ├── SeekerDashboard.tsx     # Seeker home
│   │   │   ├── employer/
│   │   │   │   ├── ApplicantDashboard.tsx  # Applicant view for one job
│   │   │   │   ├── HireConfirmModal.tsx
│   │   │   │   └── PlacementFeeModal.tsx
│   │   │   └── seeker/
│   │   │       ├── MyApplications.tsx
│   │   │       ├── SavedSearches.tsx
│   │   │       └── SeekerDocuments.tsx
│   │   ├── jobs/
│   │   │   ├── JobSearch.tsx           # Search + filter (internal sidebar, not DashboardLayout)
│   │   │   ├── JobDetail.tsx           # Public job details + seeker apply form
│   │   │   ├── PostJob.tsx             # Create/edit job wizard
│   │   │   └── MarkFilledModal.tsx
│   │   ├── verification/
│   │   │   ├── EmployerVerification.tsx
│   │   │   ├── DocumentUpload.tsx
│   │   │   ├── FarmPhotoUpload.tsx
│   │   │   ├── NzbnVerification.tsx
│   │   │   └── PhoneVerification.tsx
│   │   └── admin/                      # Super admin panel (Phase 20+)
│   │       ├── AdminLoginPage.tsx
│   │       ├── EmployerList.tsx
│   │       ├── SeekerList.tsx
│   │       ├── JobsManagement.tsx
│   │       ├── PlacementPipeline.tsx
│   │       └── AdminDocumentsQueue.tsx # Phase 21: doc verification queue
│   ├── components/
│   │   ├── layout/
│   │   │   ├── ProtectedRoute.tsx      # Role-based route guard (session, role, isActive checks)
│   │   │   ├── DashboardLayout.tsx     # Sidebar + header for /dashboard/*
│   │   │   ├── JobSearchLayout.tsx     # Header-only for /jobs search
│   │   │   └── AdminLayout.tsx         # Sidebar for /admin/*
│   │   ├── landing/                    # Landing page components
│   │   │   ├── HeroSection.tsx
│   │   │   ├── FeaturesSection.tsx
│   │   │   ├── [other landing parts]
│   │   ├── ui/                         # Radix UI + custom primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Dialog.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Checkbox.tsx
│   │   │   ├── Label.tsx
│   │   │   ├── StepIndicator.tsx
│   │   │   ├── [40+ more UI components]
│   │   ├── admin/
│   │   │   ├── EmployerListItem.tsx
│   │   │   ├── [admin-specific components]
│   │   ├── saved-search/
│   │   │   └── [saved search UI components]
│   │   └── stripe/
│   │       ├── StripeProvider.tsx
│   │       └── PaymentForm.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx             # Global auth state (session, role, isActive) + useAuth hook
│   ├── hooks/
│   │   ├── useAuth.ts                  # Re-export of AuthContext's useAuth (convenience)
│   │   ├── useWizard.ts                # Wizard step management
│   │   ├── useSeekerProfileId.ts
│   │   ├── useVerifications.ts
│   │   ├── useSavedJobs.ts
│   │   ├── useAppliedStatuses.ts
│   │   ├── useApplicantDocumentUrl.ts
│   │   ├── useInView.ts
│   │   └── useCountUp.ts
│   ├── lib/
│   │   ├── supabase.ts                 # Supabase client (createClient with anon key)
│   │   ├── routing.ts                  # Helper: dashboardPathFor(role)
│   │   ├── stripe.ts                   # Stripe integration
│   │   ├── constants.ts                # App-wide constants
│   │   ├── utils.ts                    # Utility functions
│   │   ├── wizardUtils.ts              # Wizard step helpers
│   │   └── savedSearch.ts              # Saved search helpers
│   └── types/
│       └── domain.ts                   # TypeScript types (UserRole, DocumentType, JobStatus, etc.)
├── supabase/
│   ├── migrations/                     # 33 migrations (001-033), sequence-prefixed
│   │   ├── 001_initial_schema.sql      # 14 tables (user_roles, employer_profiles, seeker_profiles, jobs, applications, etc.)
│   │   ├── 002_rls_policies.sql        # RLS policies for all tables
│   │   ├── 003_skills_seed.sql
│   │   ├── [004-022: feature migrations]
│   │   ├── 023_admin_rpcs.sql          # Admin RPC layer + audit tables (Phase 20)
│   │   ├── [024-033: ongoing refinements]
│   │   └── NAMING.md                   # Migration naming conventions + schema documentation
│   └── functions/                      # 11 Edge Functions (Deno)
│       ├── get-applicant-document-url/ # Signed URL minting (5-layer auth)
│       ├── send-document-status-email/ # Doc verification notification (Phase 21)
│       ├── send-followup-emails/       # Email reminders
│       ├── notify-job-filled/          # Job-filled webhook
│       ├── create-payment-intent/      # Stripe setup
│       ├── stripe-webhook/             # Stripe signature validation
│       ├── acknowledge-placement-fee/
│       ├── create-placement-invoice/
│       ├── generate-candidate-summary/
│       ├── generate-match-explanation/
│       └── get-resend-stats/
├── tests/
│   └── fk-indexes.test.ts              # Foreign key index integrity tests
├── .planning/                          # Project planning documents
│   ├── codebase/                       # This directory
│   ├── phases/                         # Phase documentation (22 phases)
│   ├── REQUIREMENTS.md                 # Feature requirements + closure tracking
│   ├── ROADMAP.md                      # Phase roadmap + status
│   ├── STATE.md                        # Detailed state of all systems
│   └── [other planning docs]
├── vite.config.ts                      # Vite build config
├── tsconfig.json                       # TypeScript config
├── package.json                        # Dependencies (React 19, React Router v7, @supabase/supabase-js)
├── eslintrc.js                         # Linting rules
├── .prettierrc                         # Code formatting
└── CLAUDE.md                           # House rules for Claude sessions
```

## Directory Purposes

**src/pages/:**
- Purpose: Page-level components organized by domain-feature (NOT Next.js Pages Router; routing is in `src/main.tsx`)
- Contains: Full-page components for each route (Auth, Onboarding, Dashboard, Job Search, Admin, Verification)
- Pattern: Each domain (auth, jobs, dashboard, onboarding, admin) gets its own folder; sub-routes (e.g., /dashboard/seeker/applications) get their own file within that domain folder
- Example: `src/pages/dashboard/seeker/MyApplications.tsx` → route `/dashboard/seeker/applications`

**src/components/:**
- Purpose: Reusable UI components and layout wrappers
- Subfolders:
  - `layout/` — ProtectedRoute (auth guard), DashboardLayout (sidebar + header), JobSearchLayout (header-only), AdminLayout
  - `landing/` — Hero, features, testimonials (Home page sections)
  - `ui/` — Radix UI wrapped components (Button, Input, Dialog, Select, etc.)
  - `admin/` — Admin-specific list components
  - `saved-search/` — Saved search filter UI
  - `stripe/` — Payment form wrapper

**src/contexts/:**
- Purpose: Global state (currently only AuthContext)
- Contains: AuthProvider component, useAuth hook, auth methods (signIn, signOut, signUpWithRole, refreshRole)

**src/hooks/:**
- Purpose: Custom React hooks for data fetching, state management
- Examples:
  - `useAuth.ts` — convenience re-export of AuthContext's useAuth
  - `useWizard.ts` — wizard state (currentStep, goToStep, nextStep, prevStep, isComplete)
  - `useSavedJobs.ts` — saved job queries
  - `useApplicantDocumentUrl.ts` — fetch signed URL for document

**src/lib/:**
- Purpose: Utility functions and client setup
- `supabase.ts` — Supabase JS client singleton (anon key)
- `routing.ts` — dashboardPathFor(role) — returns /dashboard/employer or /dashboard/seeker based on role
- `stripe.ts` — Stripe SDK initialization
- `wizardUtils.ts` — Step validation helpers, data merging
- `savedSearch.ts` — Filter serialization/deserialization
- `constants.ts` — STEP_LABELS, farm types, regions, visa statuses, etc.

**supabase/migrations/:**
- Purpose: Database schema and RPC definitions
- Pattern: Sequence-prefixed files (001, 002, ..., 033) applied in order; each atomic
- Contents:
  - 001-002: Base schema (14 tables) + RLS policies
  - 003: Skills seed data
  - 004-022: Feature migrations (employer verification, seeker documents, admin panel, etc.)
  - 023: Admin RPC layer (10 RPCs for Phase 20)
  - 024-033: Performance, webhook, and doc queue refinements
- Naming: `{sequence}_{description}.sql` (e.g., `023_admin_rpcs.sql`)

**supabase/functions/:**
- Purpose: Serverless Edge Functions (Deno) for privileged operations
- Pattern: Each function in its own directory with `index.ts` + `deno.json` config
- Common pattern:
  - `verify_jwt: true` in config → gateway validates JWT upstream
  - POST-only; Bearer token in Authorization header
  - Local JWT decode (trust gateway per CLAUDE.md §5)
  - Service-role Supabase client for database access
  - Multi-layer auth checks (role, relationship, type whitelist)
  - CORS headers (wildcard origin, scoped in post-launch follow-up)

**tests/:**
- Purpose: Automated testing (currently minimal)
- `fk-indexes.test.ts` — Vitest suite checking foreign key indexes are defined

## Key File Locations

**Entry Points:**
- `index.html` — HTML entry point, loads src/main.tsx as module
- `src/main.tsx` — React Router setup, AuthProvider root, 30+ route definitions
- `src/lib/supabase.ts` — Supabase client singleton (used by all pages/hooks)
- `src/contexts/AuthContext.tsx` — Auth state provider (wraps entire app in main.tsx)

**Configuration:**
- `vite.config.ts` — Build config (React plugin, path aliases)
- `tsconfig.json` — TypeScript strictness settings
- `package.json` — Dependencies: React 19, React Router v7, @supabase/supabase-js, Tailwind, Stripe, Zod
- `eslintrc.js` — Linting rules
- `.prettierrc` — Code formatter settings
- `supabase/migrations/NAMING.md` — Schema documentation + migration conventions
- `CLAUDE.md` — Project-scoped house rules (MCP scoping, auth patterns, git safety, partial-close discipline)

**Core Logic:**
- `src/pages/onboarding/{EmployerOnboarding,SeekerOnboarding}.tsx` — Wizard orchestration
- `src/pages/onboarding/steps/Step*.tsx` — Individual wizard step components
- `src/pages/jobs/JobSearch.tsx` — Job search + filter UI (internal sidebar, no DashboardLayout)
- `src/pages/dashboard/employer/ApplicantDashboard.tsx` — Employer views applicants for one job
- `src/pages/admin/AdminDocumentsQueue.tsx` — Admin doc verification UI (Phase 21)
- `src/components/layout/ProtectedRoute.tsx` — Auth guard (session, role, isActive checks)
- `supabase/migrations/023_admin_rpcs.sql` — Admin RPC layer (10 functions with SECURITY DEFINER)
- `supabase/functions/get-applicant-document-url/index.ts` — Document URL signing (5-layer auth)

**Testing:**
- `tests/fk-indexes.test.ts` — FK index verification (run with `npm test`)

## Naming Conventions

**Files:**
- Pages: PascalCase (e.g., `Home.tsx`, `EmployerOnboarding.tsx`)
- Components: PascalCase (e.g., `ProtectedRoute.tsx`, `StepIndicator.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useAuth.ts`, `useWizard.ts`)
- Utilities: camelCase (e.g., `utils.ts`, `routing.ts`)
- Migrations: `{sequence}_{description}.sql` (e.g., `023_admin_rpcs.sql`)
- Edge Functions: kebab-case folder, `index.ts` (e.g., `get-applicant-document-url/index.ts`)

**Directories:**
- Domain folders (pages): lowercase (e.g., `auth/`, `jobs/`, `onboarding/`, `dashboard/`, `admin/`)
- Component subfolders: lowercase (e.g., `layout/`, `landing/`, `ui/`, `admin/`, `saved-search/`, `stripe/`)
- Supabase: lowercase (e.g., `migrations/`, `functions/`)

**Functions & Variables:**
- Exported functions: PascalCase for components (`export function Home() { ... }`), camelCase for utilities (`export function dashboardPathFor(role) { ... }`)
- Custom hooks: `useXxx` pattern (e.g., `useAuth`, `useWizard`, `useSavedJobs`)
- RLS helper functions: PascalCase + prefix (e.g., `get_user_role()`, `handle_new_user()`, `_admin_gate()`)
- SECURITY DEFINER RPCs: snake_case + `admin_` prefix (e.g., `admin_set_user_active()`, `admin_get_employers_list()`)
- Migrations: snake_case table/column names (e.g., `user_roles`, `is_active`, `created_at`)

**Types:**
- TypeScript enums/unions: PascalCase (e.g., `UserRole`, `DocumentType`, `JobStatus`)
- Database types (Postgres enums): lowercase (role IN ('employer', 'seeker', 'admin'))

## Where to Add New Code

**New Feature (e.g., Job Matching Algorithm):**
- Primary code: `src/lib/matching.ts` (utility functions) or new RPC in `supabase/migrations/{next}.sql`
- Tests: `tests/matching.test.ts`
- Component usage: Import in `src/pages/jobs/JobDetail.tsx` or create new job-related component in `src/components/`

**New Page (e.g., Seeker Profile Edit):**
- Implementation: `src/pages/dashboard/seeker/EditProfile.tsx`
- Route: Add to `src/main.tsx` router config under `/dashboard/seeker/*` section
- Layout: Wrap with `<ProtectedRoute requiredRole="seeker"><DashboardLayout><EditProfile /></DashboardLayout></ProtectedRoute>` in main.tsx
- Styling: Tailwind classes (no separate CSS files; index.css imports Tailwind)

**New Onboarding Step:**
- Implementation: `src/pages/onboarding/steps/Step{N}{Name}.tsx`
- Parent update: Edit `src/pages/onboarding/EmployerOnboarding.tsx` (or SeekerOnboarding.tsx):
  - Import new step: `import { Step9NewStep } from './steps/Step9NewStep'`
  - Add to STEP_LABELS and render switch case
  - Increment TOTAL_STEPS
- Data type: Add fields to `EmployerProfileData` interface (or `SeekerProfileData` equivalent)

**New Database Table:**
- Migration: `supabase/migrations/{next}_{description}.sql`
- Pattern:
  ```sql
  CREATE TABLE public.new_table (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- columns
    created_at timestamptz NOT NULL DEFAULT now()
  );
  ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;
  -- RLS policies:
  CREATE POLICY "new_table: users manage own" ON public.new_table
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  ```
- RLS: Always ENABLE ROW LEVEL SECURITY; define at least one policy

**New Edge Function (e.g., Send SMS):**
- Implementation: `supabase/functions/send-sms/index.ts` + `supabase/functions/send-sms/deno.json`
- Auth pattern: `verify_jwt: true` in deno.json; POST-only; Bearer token decode locally
- Relationship checks: Query database to verify caller owns the resource
- Deployment: `supabase functions deploy send-sms`

**New Admin RPC:**
- Migration: Add to `supabase/migrations/023_admin_rpcs.sql` (or create new migration if too large)
- Pattern:
  ```sql
  CREATE OR REPLACE FUNCTION public.admin_do_something(p_param type)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  VOLATILE
  SET search_path = public
  AS $$
  BEGIN
    PERFORM public._admin_gate();
    -- mutation logic
    INSERT INTO public.admin_audit_log (admin_id, action, target_table, payload)
    VALUES (auth.uid(), 'do_something', 'target_table', jsonb_build_object(...));
    RETURN jsonb_build_object('success', true, ...);
  END;
  $$;
  GRANT EXECUTE ON FUNCTION public.admin_do_something TO authenticated;
  ```
- Frontend call: `supabase.rpc('admin_do_something', { p_param: value })`

**New UI Component (e.g., Tooltip):**
- Implementation: `src/components/ui/Tooltip.tsx`
- Pattern: Wrap Radix UI primitive with Tailwind styling
- Export from `src/components/ui/` for import in pages

**Utilities & Helpers:**
- Shared across multiple pages: `src/lib/{name}.ts`
- Specific to one feature: `src/pages/{feature}/helpers.ts` or inline in component
- Custom hooks: `src/hooks/use{Name}.ts`

## Special Directories

**node_modules/:**
- Purpose: Installed dependencies
- Generated: Yes (via npm install)
- Committed: No (.gitignore)

**.planning/:**
- Purpose: Project documentation, phase plans, requirements, roadmap
- Committed: Yes (project knowledge base)
- Key files: REQUIREMENTS.md (requirement closure), ROADMAP.md (phase status), STATE.md (current system state)

**supabase/.temp/ (if created locally):**
- Purpose: Local development Supabase instance
- Generated: Yes (via `supabase start`)
- Committed: No

**.git/:**
- Purpose: Git repository history
- Committed: N/A (git internal)

---

*Structure analysis: 2026-05-29*
