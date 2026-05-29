# Architecture

**Analysis Date:** 2026-05-29

## Pattern Overview

**Overall:** SPA + BaaS (Backend-as-a-Service) with role-based access control

TopFarms is a Vite + React Router v7 single-page application (SPA) that delegates all backend operations to Supabase. Authentication, authorization, and data persistence are server-enforced through Row-Level Security (RLS) policies. Privileged operations (document signing, email dispatch, admin functions) run on Supabase Edge Functions with SECURITY DEFINER stored procedures.

**Key Characteristics:**
- **Frontend:** React 19 + React Router v7 client-side routing (`src/main.tsx`)
- **Backend:** Supabase (PostgreSQL + Auth + PostgREST API + Edge Functions)
- **Authorization:** Three-tier role model (seeker, employer, admin) backed by RLS policies
- **Data flow:** Frontend → supabase-js client (anon key) → PostgREST → RLS-enforced Postgres; privileged ops → Edge Functions (service-role key) → SECURITY DEFINER RPCs
- **Gateway pattern:** Supabase Auth gateway validates JWT signatures upstream; Edge Functions trust the gateway and decode locally (CLAUDE.md §5)

## Layers

**Presentation (React Components):**
- Purpose: UI rendering, form handling, navigation
- Location: `src/components/`, `src/pages/`
- Contains: Page components (dashboard, onboarding, job search), layout wrappers (DashboardLayout, AdminLayout), UI primitives (buttons, modals, inputs)
- Depends on: AuthContext, custom hooks (useAuth, useWizard, useSavedJobs), supabase client
- Used by: React Router router config in `src/main.tsx`

**State Management (React Context):**
- Purpose: Global auth state, session management, role tracking
- Location: `src/contexts/AuthContext.tsx`
- Contains: useAuth hook, AuthProvider wrapper, session/role/isActive state
- Depends on: supabase-js, Supabase Auth API
- Used by: ProtectedRoute, all authenticated pages via useAuth() hook
- Key pattern: Single app-wide subscription to `onAuthStateChange` (defence-in-depth against multi-tab Web Lock contention per AUTH-FIX-02); role loaded via `user_roles` RLS query; timeout-protected with 3s race (`loadRoleWithTimeout`)

**Access Control (Frontend):**
- Purpose: Route protection, role-based redirects
- Location: `src/components/layout/ProtectedRoute.tsx`
- Contains: ProtectedRoute component with requiredRole prop; guards for session, role, isActive state
- Pattern: Wraps route elements in `src/main.tsx`; redirects unauthenticated users to `/login`, role-mismatched users to their dashboard, suspended users (isActive=false) to `/suspended`

**API Layer (Supabase JS Client):**
- Purpose: Bridging frontend to PostgREST + RPC + Auth APIs
- Location: `src/lib/supabase.ts`
- Contains: createClient() call with anon key; configured for persistent sessions and auto-refresh
- Depends on: @supabase/supabase-js v2.49+
- Used by: AuthContext, custom hooks, page components for `.from()` queries and `.rpc()` calls

**Database (PostgreSQL + RLS):**
- Purpose: Single source of truth; enforces access control server-side
- Location: `supabase/migrations/`
- Contains: 33 migrations (001-033) defining 14+ tables with RLS enabled
- Key tables:
  - `user_roles` — role assignment (seeker/employer/admin) + is_active flag
  - `employer_profiles` — farm details, verification state
  - `seeker_profiles` — work preferences, accommodation needs
  - `jobs` — job listings, status, matching score
  - `applications` — seeker applications, match scores
  - `seeker_documents` — CV, certificates, references (strict RLS)
  - `seeker_contacts` — phone/email (separate table for masking per RLS)
  - `saved_searches` — seeker-owned saved job search filters
  - `admin_audit_log` — mutation trail for admin actions
  - `admin_notes` — admin-added notes on users
- RLS enforced: All tables have `ENABLE ROW LEVEL SECURITY`; policies check `auth.uid()` and role via `get_user_role(p_user_id)` SECURITY DEFINER helper

**Privileged Operations (Edge Functions + SECURITY DEFINER RPCs):**
- Purpose: Operations requiring server role trust (document signing, email sending, admin mutations)
- Location: `supabase/functions/` (11 functions) + migration 023 (admin RPCs)
- Functions:
  - `get-applicant-document-url` — mints signed URL for seeker document (5-layer auth: method, JWT, role, relationship, type whitelist; see CLAUDE.md §5 gateway-trust pattern)
  - `send-document-status-email` — notifies seeker of document verification outcome (Phase 21)
  - `send-followup-emails` — email reminders (placement fee, job follow-ups)
  - `notify-job-filled` — webhook for job-filled event
  - `create-payment-intent` — Stripe payment setup (service role)
  - `stripe-webhook` — Stripe signature validation + charge recording
  - Admin RPCs in migration 023: `admin_get_daily_briefing`, `admin_get_employers_list`, `admin_set_user_active`, `admin_add_note`, etc. (all SECURITY DEFINER + GRANT EXECUTE TO authenticated)
- Pattern: Service-role-keyed Deno clients; JWT validation by gateway; local decoding of `payload.sub` and `payload.aud` for caller ID

## Data Flow

**Seeker Signup → Onboarding:**

1. User lands on `/signup`, enters email + password
2. Frontend calls `supabase.auth.signUp()` with `options.data = { role: 'seeker' }`
3. Backend: auth.users insert fires trigger `on_auth_user_created` → creates user_roles row (role='seeker')
4. Email sent (if confirmation enabled); user redirected to `/auth/verify`
5. Post-verification, user navigates to `/onboarding/seeker`
6. ProtectedRoute checks: session + role (seeker) + isActive (true)
7. SeekerOnboarding wizard loads existing profile via RLS query, accumulates state across Step{N} components
8. Each step's form data merged into `profileData` state, saved via `supabase.from('seeker_profiles').upsert()`
9. RLS policy "seeker_profiles: seekers manage own" allows write only if user_id = auth.uid() + role = seeker

**Job Search → Application:**

1. Seeker navigates to `/jobs` (JobSearchLayout + JobSearch component)
2. Frontend queries `supabase.from('jobs').select().eq('status', 'open')` + filter conditions
3. RLS policy "jobs: seekers view open jobs" allows SELECT if role = seeker AND job.status = 'open'
4. Match score precomputed in `match_scores` table via `calculate_match_score()` RPC
5. Seeker clicks Apply, frontend calls `supabase.from('applications').insert()`
6. RLS policy enforces: user_id = auth.uid() + role = seeker
7. Trigger `on_application_created` calculates match scores and updates job's applicant count

**Employer Views Applications:**

1. Employer navigates to `/dashboard/employer/jobs/:id/applicants`
2. ProtectedRoute checks: session + role (employer) + isActive (true)
3. Frontend calls `supabase.rpc('get_applicants_for_job', { p_job_id })` (migration 030, SECURITY DEFINER RPC)
4. RPC validates: caller is employer + job.user_id = auth.uid(); returns applicant summaries (match score, seeker name, application date)
5. Employer clicks "View Seeker Document", frontend invokes Edge Function `get-applicant-document-url` (POST, Bearer token)
6. Function validates: 5 layers (method, JWT, role, relationship, document type whitelist)
7. Returns signed URL (15min TTL); frontend redirects to Storage

**Admin Document Verification (Phase 21):**

1. Admin navigates to `/admin/documents`
2. ProtectedRoute: session + role (admin) + isActive (true)
3. Frontend calls `supabase.rpc('admin_get_doc_queue')` (migration 033, SECURITY DEFINER)
4. RPC calls `_admin_gate()` (raises if role ≠ admin); returns pending documents with seeker metadata
5. Admin clicks Approve/Reject, frontend calls `supabase.rpc('admin_update_doc_status', { p_doc_id, p_status })`
6. RPC: `_admin_gate()` + writes admin_audit_log row + invokes Edge Function `send-document-status-email` via `pg_net.http_post()`
7. Function decodes JWT, sends email, returns success

**State Management in Auth:**

- Global: `AuthContext` holds session (from `auth.getSession()` + `onAuthStateChange()`), role (from `user_roles` RLS query), isActive (from user_roles.is_active column), loading flag
- Defence-in-depth: `loadRoleWithTimeout()` races the role query against 3s timeout (prevents hung auth-token Web Lock)
- Multi-tab: Single app-wide subscription; TOKEN_REFRESHED event skipped to avoid contending the Web Lock on cross-tab sync
- OAuth new users: Session exists but user_roles row missing → role=null → ProtectedRoute bounces to `/auth/select-role` (SelectRole.tsx then calls `set_user_role` RPC via defensive backfill)

## Key Abstractions

**AuthContext + useAuth Hook:**
- Purpose: Expose session, role, isActive, and auth methods (signIn, signOut, refreshRole) to entire app
- Pattern: React Context with single subscription to `supabase.auth.onAuthStateChange()`
- Key method: `loadRoleWithTimeout()` — race role query against 3s timeout to protect against multi-tab Web Lock contention (AUTH-FIX-02)
- Exports: `AuthProvider` component (app root), `useAuth()` hook (any component)

**ProtectedRoute Component:**
- Purpose: Guard routes by session, role, and account active status
- Pattern: Composition wrapper in `src/main.tsx` router config
- Checks (in order):
  1. loading → spinner
  2. !session → redirect to /login
  3. requiredRole + role=null → spinner (defending AUTH-FIX-02 timeout edge case)
  4. isActive=false → redirect to /suspended (Phase 21 suspension gate)
  5. !role → redirect to /auth/select-role (new OAuth user)
  6. role mismatch → redirect to role's dashboard
  7. else: render children

**Wizard Pattern (Onboarding):**
- Files: `src/pages/onboarding/{EmployerOnboarding,SeekerOnboarding}.tsx` + `src/pages/onboarding/steps/Step{N}{Name}.tsx`
- Pattern: Parent wizard component holds step index + accumulated form data; each step is a sub-component (Step1, Step2, ...) that receives data + setData via props
- useWizard hook: manages currentStep, goToStep(n), nextStep(), prevStep(), isComplete
- Data persistence: On mount, wizard loads existing profile via RLS query; each step's onNext saves partial data via upsert; Step7/Step8Complete finalizes

**RLS Policy Pattern:**
- Helper function: `get_user_role(p_user_id)` — SECURITY DEFINER, reads role once to avoid recursion
- Table-level: `ENABLE ROW LEVEL SECURITY` on all tables
- Policy template (employer_profiles example):
  ```sql
  CREATE POLICY "employer_profiles: employers manage own"
    ON public.employer_profiles
    FOR ALL
    USING (user_id = auth.uid() AND get_user_role(auth.uid()) = 'employer')
    WITH CHECK (user_id = auth.uid() AND get_user_role(auth.uid()) = 'employer');
  ```
- Read-only policies: e.g., "seeker_profiles: employers view open-to-work seekers" — SELECT only, filtered by status + role
- Admin bypass: Some tables (admin_audit_log, admin_notes) have NO RLS policies; access only via SECURITY DEFINER RPCs

**SECURITY DEFINER RPC Pattern (Migration 023 Admin):**
- Each RPC: `CREATE OR REPLACE FUNCTION public.admin_*() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$`
- First line: `PERFORM public._admin_gate();` (raises if role ≠ admin)
- Mutations: Write admin_audit_log row BEFORE returning to caller (audit governance)
- Grants: `GRANT EXECUTE TO authenticated` — callable by any auth user, but _admin_gate() enforces role
- Example: `admin_set_user_active(p_user_id, p_active)` — sets user_roles.is_active, writes audit log, returns updated state

**Edge Function Gateway-Trust Pattern (CLAUDE.md §5):**
- Function config: `verify_jwt: true` in supabase/config.toml
- Signature validation: Gateway validates upstream; function does NOT call adminClient.auth.getUser(token)
- JWT decoding (local):
  ```typescript
  const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  if (payload.aud !== 'authenticated') throw 401
  const callerUserId = payload.sub
  ```
- Relationship check: After getting caller ID, query database (service-role client) to verify access (e.g., application.job.user_id = callerUserId)
- Defence-in-depth: 5-layer check in get-applicant-document-url (method, JWT, role, relationship, type whitelist)

## Entry Points

**index.html:**
- Location: `index.html`
- Triggers: Browser loads TopFarms URL
- Responsibilities: Defines `<div id="root">`, loads `/src/main.tsx` as module script

**src/main.tsx:**
- Location: `src/main.tsx`
- Triggers: Loaded by index.html
- Responsibilities:
  - Creates React Router (createBrowserRouter) with 30+ route definitions
  - Wraps app in AuthProvider (context root)
  - Renders to `#root`
  - Adds Sonner toast notifications
- Routes:
  - Public: / (Home), /login, /signup, /auth/*, /for-employers, /pricing, /jobs (JobSearch), /jobs/:id (detail)
  - Employer: /jobs/new, /jobs/:id/edit, /dashboard/employer/*, /onboarding/employer, /dashboard/employer/verification/*
  - Seeker: /dashboard/seeker/*, /onboarding/seeker
  - Admin: /admin, /admin/employers, /admin/seekers, /admin/jobs, /admin/placements, /admin/documents
  - Suspended: /suspended (no ProtectedRoute wrapper; user has session but isActive=false)

## Error Handling

**Strategy:** Try-catch in async code; RLS + SECURITY DEFINER enforce server-side validation; frontend fallback to error pages/modals

**Patterns:**

1. **RLS Violations:** Frontend calls `.from('table').insert()` → if RLS policy fails, PostgREST returns 403 + error message → frontend catches error, logs, shows toast
   - Example: Seeker tries to update another seeker's profile → RLS policy "seeker_profiles: seekers manage own" rejects → toast "Permission denied"

2. **SECURITY DEFINER RPC Failures:** Frontend calls `.rpc('admin_set_user_active', ...)` → if `_admin_gate()` fails, RPC raises exception → PostgREST returns 400 + error → frontend catches, shows toast
   - Example: Non-admin tries to call admin RPC → _admin_gate() raises "Forbidden: admin role required" → toast "Only admins can perform this action"

3. **Edge Function Auth Failures:** POST to Edge Function → JWT validation fails → function returns jsonResponse({ error }, 401) → frontend catches, shows modal with error message
   - Example: Employer requests document but is not the job's owner → relationship check fails → returns 403 + error → modal "You don't have access to this document"

4. **Auth Context Failures:** loadRole query times out → loadRoleWithTimeout returns { ok: false, reason: 'timeout' } → ProtectedRoute keeps previous role (doesn't clobber known-good value)
   - Edge case: Real OAuth-new-user with no user_roles row + loadRole timeout → ProtectedRoute spinner, user manually navigates to /auth/select-role

5. **SignUp Backfill:** signUp returns session but user_roles row missing (email confirmation disabled) → defensive backfill calls `set_user_role` RPC → if RPC fails, signUp returns AuthError with status 500

## Cross-Cutting Concerns

**Logging:** Console.log/console.error in frontend (dev only via build tools); Edge Functions log to Supabase function logs; Postgres triggers log via POST to pg_net + Edge Function (notification pattern)

**Validation:** 
- Frontend: React Hook Form + Zod schema validation (e.g., EmployerOnboarding Step1)
- Backend: Postgres CHECK constraints (e.g., role IN ('employer', 'seeker', 'admin')) + RLS predicates

**Authentication:**
- Supabase Auth (JWT-based)
- Session persistence: localStorage (via @supabase/supabase-js config persistSession=true)
- Token refresh: auto on expiration via onAuthStateChange + autoRefreshToken=true
- Multi-tab: Single app-wide subscription; TOKEN_REFRESHED skipped to avoid Web Lock contention

**Authorization:**
- Frontend: useAuth() → role + ProtectedRoute guards
- Backend: RLS policies + SECURITY DEFINER helpers (_admin_gate, get_user_role)
- Edge Functions: 5-layer checks (method, JWT, role, relationship, type)

---

*Architecture analysis: 2026-05-29*
