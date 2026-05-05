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
