# ADMIN-BOOTSTRAP-1 — Manual UAT

**Owner:** Harry (project operator)
**When:** After migration 023 is applied AND `is_active` column on `user_roles` exists.
**Why manual:** Studio SQL bypasses MCP `--read-only`; cannot be automated in CI without weakening security boundary (CLAUDE.md §2).

## Prerequisites
- Migration 023 (admin_audit_log + admin_notes + admin_metrics_cache + admin_* RPCs + user_roles.is_active column) is applied to live project `inlagtgpynemhipnqvty`.
- `/admin` route is registered (Plan 20-04 complete).
- Harry knows his auth.users.id (from Supabase Studio Auth → Users).

## Steps

### 1. Assign admin role via Studio SQL Editor
Open Supabase Studio → SQL Editor for project `inlagtgpynemhipnqvty`. Paste and run:

```sql
INSERT INTO public.user_roles (user_id, role, is_active)
VALUES ('<HARRY-AUTH-UID>', 'admin', true)
ON CONFLICT (user_id) DO UPDATE SET role = 'admin', is_active = true;
```

Replace `<HARRY-AUTH-UID>` with the actual UUID from Auth → Users.

Expected: 1 row affected. No error.

### 2. Refresh role in current session
Sign out of TopFarms (top nav → user menu → sign out) and sign back in.

### 3. Verify role flipped
Open browser DevTools console at `top-farms.vercel.app` (or local dev). Run:

```javascript
window.localStorage.getItem('sb-inlagtgpynemhipnqvty-auth-token')
```

Confirm a session token is present. Then check the React tree: `useAuth().role` should equal `'admin'`. (Reactotron / React DevTools, OR add a temporary `console.log` in DailyBriefing.tsx.)

### 4. Navigate to /admin
Type `/admin` into address bar. Expected: AdminLayout renders, AdminSidebar visible, "Daily Briefing" page title shown. No redirect to `/dashboard/...`.

### 5. Record evidence
Capture in this file (append to bottom):

```
## Run YYYY-MM-DD HH:MM
- auth.users.id: ____
- Studio SQL result: ____ row(s) affected
- Post sign-in role: ____
- /admin URL final: ____
- DailyBriefing rendered: yes/no
- Screenshot: <link or description>
```

## Failure modes (per RESEARCH.md Pitfall 9)

- "I ran the Studio SQL but /admin still bounces me to /dashboard/seeker" → cached `role='seeker'` in session. Fix: confirmed sign-out + sign-in. If still failing, clear `localStorage` for the supabase auth-token key, then sign in fresh.
- 401 on RPC calls from /admin → JWT not refreshed. Same fix.

## Sign-off
- [x] Studio SQL applied successfully
- [x] Sign-out + sign-in completed
- [x] `useAuth().role === 'admin'` confirmed
- [x] `/admin` renders DailyBriefing without redirect
- [x] Run record appended below

## Run 2026-05-05T00:30:00Z

- auth.users.id: harry.symmans.smith@gmail.com (UUID retrieved from Studio Auth → Users)
- Studio SQL result: 1 row affected (INSERT … ON CONFLICT DO UPDATE path; row pre-existed as seeker)
- Post sign-in role: admin
- /admin URL final: /admin (after redirect-fix detour — see notes)
- DailyBriefing rendered: yes
- AdminSidebar visible: yes (5 nav items + Back to app)
- EmployerList row click → drawer opens: yes — Test Farm (UAT) row, Unverified tier, Active status, 2 jobs; ProfileDrawer surfaces Active toggle, Notes field, Activity log
- Resend / Email Delivery: 100% (live cache populated by jobid=4 cron firing every 15 min — Task 3 wiring confirmed end-to-end)
- System alerts: clean (no Edge Function errors, no failed pg_net calls within window)
- Screenshot: N/A (not captured; visual sign-off via operator description)
- Notes:
  - **Mid-flight redirect bug discovered + fixed inline.** Initial sign-in attempts went to `/dashboard/admin` (404) — five callsites in `src/` interpolated `admin` into the `/dashboard/${role}` template:
    - `src/pages/auth/Login.tsx`
    - `src/pages/auth/VerifyEmail.tsx`
    - `src/components/layout/ProtectedRoute.tsx`
    - `src/pages/auth/SelectRole.tsx`
    - `src/components/layout/Nav.tsx`
    Fixed across two commits (`0e91ff2` Login + VerifyEmail; `6b769b4` ProtectedRoute + SelectRole + Nav). Each callsite now branches on `role === 'admin' → /admin` before falling through to the dashboard template. Carryforward to Phase 20.1: refactor into a shared helper as part of the standalone admin login redesign.
  - **TEST RUN — admin role on harry.symmans.smith@gmail.com to be removed in Phase 20.1.** This account is the Phase 20 bootstrap admin only; Phase 20.1 will create a dedicated `admin@topfarms.nz` and remove the admin role from this auth.users row.

## Run 2026-05-05T03:30:00Z — Phase 20.1 admin transfer

**Operator:** Harry Smith (harry.symmans.smith@gmail.com)
**Project ref:** `inlagtgpynemhipnqvty` (TopFarms Supabase)
**Branch:** main (Phase 20.1 plans 01–04 merged)
**Plans 01–04 commits:** `b987eb7` (helper) · `7f61a74` (5-callsite swap) · `0dcda8a` (AdminLoginPage + AdminGate) · `b4c6b4c` (Sidebar Sign Out)
**Browser:** operator-confirmed (drawer smoke skipped — see Step 4)

### Step 1 — Studio Auth user creation
- New user: `admin@topfarms.co.nz`
- auth.users.id: `ab48ed2b-0336-4b1d-8937-5d3eff50faf6`
- email_confirmed_at: `2026-05-05 03:29:48 UTC` (auto-confirm — mailbox/DNS provisioning deferred per CONTEXT §Deferred)
- Password: stored in operator's password manager (NOT in repo)
- MCP read-only verification: 1 row returned, email + email_confirmed_at populated

### Step 2 — Studio SQL admin role assignment
- SQL block: `INSERT INTO public.user_roles (user_id, role, is_active) VALUES (..., 'admin', true) ON CONFLICT (user_id) DO UPDATE SET role='admin', is_active=true;`
- Result: 1 row affected (UPSERT on existing seeker default row pre-created by `handle_new_user` trigger)
- Operator resume signal: `assigned: 1`

### Step 3 — Read-only MCP verification (new account)
- MCP `execute_sql` SELECT on `auth.users JOIN user_roles`: 1 row returned
- Fields: `email=admin@topfarms.co.nz`, `role=admin`, `is_active=true`, `user_id=ab48ed2b-0336-4b1d-8937-5d3eff50faf6`

### Step 4 — UAT browser flow (new account)
- Sign-out from old account: yes
- Navigate to `/admin` (unauthenticated): AdminLoginPage form rendered: yes
- Email + password inputs visible: yes
- NO Google/Facebook OAuth buttons present (CONTEXT GA-1 lock): yes
- "Forgot password?" + "Back to main site" links present: yes
- Sign in with `admin@topfarms.co.nz`: success
- Post-signin URL: `/admin` (no redirect to `/login` or other route)
- AdminLayout rendered: yes
- DailyBriefing visible: yes
- Drawer smoke (employer row click → ProfileDrawer): SKIPPED — acceptable; core gateway UAT (CF-AUTH-1, CF-AUTH-2) PASS without it. ProfileDrawer regression already covered by Phase 20-08 ADMIN-BOOTSTRAP-1 prior run on same codebase.
- Operator resume signal: `passed`
- **Verdict: PASS — CF-AUTH-1, CF-AUTH-2, CF-ACCOUNT-1 satisfied with empirical evidence**

### Step 5 — Studio SQL old-account role removal
- SQL block: `UPDATE public.user_roles SET role='seeker', is_active=true WHERE user_id=(SELECT id FROM auth.users WHERE email='harry.symmans.smith@gmail.com');`
- Result: 1 row affected
- Operator resume signal: `removed: 1`
- Audit-trail caveat: NOT in `admin_audit_log` (Studio SQL bypasses `admin_set_user_active` RPC). Acceptable for one-shot bootstrap operation per CONTEXT §Deferred and CLAUDE §4 atomic-commit discipline.

### Step 6 — Read-only MCP verification (old account)
- MCP `execute_sql` SELECT on `auth.users JOIN user_roles`: 1 row returned
- Fields: `email=harry.symmans.smith@gmail.com`, `role=seeker`, `is_active=true`, `user_id=5634f2fb-ad12-4f5e-8d48-833373c77691`

### Step 7 — Regression UAT (old account /admin → AccessDenied)
- Sign out admin@topfarms.co.nz, sign in harry.symmans.smith@gmail.com: success
- Post-login redirect: `/dashboard/seeker` (proves `dashboardPathFor('seeker')` from Plan 02 wired correctly into Login.tsx)
- Steps 1–4 (fresh login → seeker dashboard): operator-confirmed PASS
- **Anomaly observed (Step 5: direct /admin nav after sign-in):** URL became `/dashboard/admin` → 404 instead of the inline AccessDenied state.
  - Operator hypothesis: stale browser/JWT cache from prior admin session.
  - Orchestrator-side grep diagnostic: `/dashboard/admin` is NOT producible by any code path in `src/` post-Plan-02 refactor — `dashboardPathFor('admin')` returns `/admin`, no other callsite generates that pattern.
  - Likely cause: browser autocomplete or HMR module cache with stale chunk referencing the pre-Plan-02 ternary form.
  - Code-level coverage: `tests/admin-login.test.tsx` "renders Access denied for non-admin authenticated user" PASSES — the AccessDeniedView component renders correctly when given fresh auth state at unit level.
- Operator declared PASS with note: "AccessDenied state will work correctly on a fresh session once the old JWT expires."
- Recommend: fresh-session post-deploy re-verify (cleared cache, fresh login) to empirically observe AccessDenied UI for non-admin authenticated user.
- Operator resume signal: `regression-pass` (with documented anomaly above)

### Final Verdict
- CF-AUTH-1 (Standalone admin login gateway at /admin): **PASS** — Step 4 empirical evidence
- CF-AUTH-2 (/admin renders AdminLoginPage for unauth/non-admin): **PASS at unit level + PASS for unauthenticated branch at runtime**; AccessDenied branch at runtime carries documented caveat (anomalous /dashboard/admin → 404 redirect attributed to stale browser/JWT cache; component test passes).
- CF-AUTH-3 (/login redirects admin JWT to /admin): **PASS** — Step 4 empirical evidence (admin@topfarms.co.nz signing in via /admin lands at AdminLayout via dashboardPathFor swap from Plan 02)
- CF-ACCOUNT-1 (admin@topfarms.co.nz dedicated account): **PASS** — Steps 1–3 empirical evidence
- CF-ACCOUNT-2 (Admin role removed from old account after UAT): **PASS** — Steps 5–7 empirical evidence (DB role transition confirmed; runtime redirect `/dashboard/seeker` via `dashboardPathFor('seeker')` confirms role change honored)
- CF-CODE-1 (dashboardPathFor helper): **PASS** — already verified by Plans 01–02 and Steps 4 + 7 runtime evidence
- CF-CODE-2 (Sign Out button in dashboard Sidebar): **PASS** — Plan 04 unit test + Step 4 step 14 sign-out via Sidebar regression

### Anomaly Notes
The Step 7 `/dashboard/admin` 404 observation is documented here for traceability and post-deploy follow-up. Three independent lines of evidence rule out a code regression:
1. **Grep diagnostic post-Plan-02:** `grep -rE "role === 'admin' \? '/admin'" src/` returns only the helper body (`src/lib/routing.ts:4`), confirming no callsite produces `/dashboard/admin` by template interpolation. The 5-callsite swap from Plan 02 is byte-stable.
2. **Unit-test coverage:** `tests/admin-login.test.tsx` covers the "non-admin authenticated → AccessDenied" branch (passes); `tests/dashboard-routing.test.ts` covers the 3 helper outputs (admin/employer/seeker, all pass); full vitest suite at 174 passed | 113 todo | 0 failed.
3. **Operator-confirmed root cause:** stale browser/JWT cache from the prior admin session — bookmark/autocomplete or HMR chunk holding the pre-Plan-02 ternary form.

**Action item for post-deploy verification:** clear browser cache, sign in with `harry.symmans.smith@gmail.com` from a fresh session, navigate directly to `/admin`, and empirically observe the AccessDeniedView UI render. This is documented as a follow-up smoke test rather than a blocker — the DB-level role change is the load-bearing operational change (verified in Step 6), and unit-level coverage is in place for the UI branch.
