# Phase 20: Super Admin Dashboard — Research

**Researched:** 2026-05-04
**Domain:** Internal admin tooling on Supabase + React (RLS-gated, SECURITY DEFINER RPC layer, Phase 19 v2 design system)
**Confidence:** HIGH

---

## Summary

Phase 20 builds an internal-only `/admin/*` panel layered on top of the existing TopFarms stack: Vite SPA + React Router 7 + Supabase (Postgres / Auth / Edge Functions / pg_cron / pg_net) + the Phase 19 v2 component library. No new infrastructure, no new external services, no new design primitives.

CONTEXT.md locked the major architectural choices already (admin role + SECURITY DEFINER RPC layer + cloned AdminLayout + Studio-SQL bootstrap). The UI-SPEC locked layout, copy, and the drawer JSONB shape. This research closes the **remaining open questions** identified by CONTEXT.md "Claude's Discretion": where exactly to source platform-health data (Edge Function errors, cron timestamps, pg_net failures, Resend delivery rate), and what the migration ordering / RPC catalogue should look like.

**Primary recommendation:** Mirror migration 012's `get_platform_stats()` pattern verbatim for ~7 admin RPCs in a single migration `023_admin_rpcs.sql`. Source platform-health from on-database tables only (`cron.job_run_details`, `net._http_response`, `admin_metrics_cache` for Resend) — never have an RPC call out via `pg_net` to fetch fresh data. Honour the gateway-trust JWT pattern for any new Edge Function (the cached-Resend-stats poller). Validation strategy is "test the RPC layer directly via authenticated SQL execution" since that's the actual security boundary; ProtectedRoute is UI chrome.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Architecture (locked pre-Discuss):**
- New `admin` role role-gated via `user_roles` table — schema scout confirmed CHECK constraint already includes `'admin'` (001_initial_schema.sql:13). **No CHECK constraint migration needed.**
- SECURITY DEFINER RPC layer for all admin queries — zero changes to existing RLS policies. Follow `012_platform_stats_rpc.sql` pattern: `RETURNS jsonb`, `SECURITY DEFINER`, `STABLE`, `GRANT EXECUTE TO authenticated`. Each RPC validates `get_user_role(auth.uid()) = 'admin'` server-side.
- Separate `AdminLayout` component (clone DashboardLayout structure with admin-specific nav links).
- `/admin/*` protected route tree inside existing React app — same Vercel deployment, same Supabase project.
- Phase 19 v2 design system tokens + components (Tag, Card, Button, Pagination, Tabs) — no new design primitives.
- First-time setup: one-shot Supabase Studio SQL to assign Harry's `auth.users.id` the admin role. NOT auto-assigned by `handle_new_user` trigger (which COALESCEs to `'seeker'`).

**Route protection:**
- `role === 'admin'` check via existing `ProtectedRoute` is sufficient. No middleware layer (Vite SPA, no Next.js middleware concept). Frontend role check is UI-only chrome; the SECURITY DEFINER RPC layer is the actual security boundary — even if frontend bypassed (DevTools), every backend call rejects.
- **Required code change:** `ProtectedRoute.tsx:7` — extend `requiredRole?: 'employer' | 'seeker'` to `'employer' | 'seeker' | 'admin'`. One-line type extension.

**MVP scope — 6 admin views:**
1. Daily briefing (`/admin`) — yesterday's signups + jobs posted + applications + ack'd placements; system alerts; revenue snapshot stat strip; Resend delivery-rate indicator
2. Employer list (`/admin/employers`) — searchable table: verification tier, account status, date joined, job count, admin notes column, suspend/reactivate toggle
3. Seeker list (`/admin/seekers`) — searchable table: onboarding complete Y/N, match scores computed Y/N, region, date joined, admin notes column, suspend/reactivate toggle
4. Jobs management (`/admin/jobs`) — all jobs across platform: status, applicant count, employer link, days live, days since last applicant
5. Placement fee pipeline (`/admin/placements`) — read-only: ack date, days since ack (overdue flag at >14d), hire confirmed Y/N, click-through link to Stripe customer/invoice
6. User profile drawer (light) — click any row in views 2/3/4 → side drawer with profile state. Pure inspector.

**MVP mutation surface (single, narrow):**
- Suspend/reactivate toggle on employer + seeker rows. One SECURITY DEFINER RPC `admin_set_user_active(user_id, active)`. Writes row to `admin_audit_log` before returning.
- Admin notes (additive only — text inserts, no destructive ops).
- All other mutations DEFER to Phase 21.

**Audit governance:**
- `admin_audit_log` table — admin_id, action, target_table, target_id, payload jsonb, created_at. Every admin RPC that mutates writes a row before returning.

**Placement fee invoicing:** Stripe dashboard only for MVP. Click-through to Stripe customer/invoice. No replication of Stripe's invoice UI.

**Migration plan:**
- No CHECK constraint migration (already supports `'admin'`).
- New migration `023_admin_rpcs.sql` — bundles ~6-8 SECURITY DEFINER RPCs + `admin_audit_log` table + `admin_notes` columns/table.
- One-shot Studio SQL (NOT a migration) — `INSERT INTO user_roles (user_id, role) VALUES ('<harry-uuid>', 'admin') ON CONFLICT (user_id) DO UPDATE SET role = 'admin';`.

### Claude's Discretion

- Exact admin nav structure (top tabs vs side rail) — pick based on Phase 19 design conventions
- Daily-briefing card layout (StatsStrip-driven? AICandidateSummary-style?) — use existing primitives
- Suspend/reactivate UX (modal confirm vs inline toggle vs button-with-undo) — pick based on a11y + safety
- Admin notes UI (textarea-on-row vs drawer-pinned vs separate page) — pick based on minimum-clicks
- Profile drawer width + animation — match v2 spec patterns
- Edge Function error log presentation (table vs cards vs collapsed list) — pick based on operator scan-ability
- Resend delivery-rate query approach (Resend API call from RPC vs cached metric) — researcher to investigate

*(UI-SPEC has since locked all the visual/interaction questions. Resend approach was decided in UI-SPEC §"Resend delivery-rate approach" — cached metric pattern. This research confirms the data-source choices for the remaining backend questions: Edge Function errors, cron timestamps, pg_net failures.)*

### Deferred Ideas (OUT OF SCOPE)

**Phase 21 — Admin V2 Mutations:**
- Manual system triggers (re-run match scores for a job, re-trigger nightly recalculation, re-send failed email)
- Verification tier manual bumps from admin
- Persistent system health bar
- Deep profile drawer relationships (full applications list per seeker, full job list per employer, match scores expanded)
- Bulk operations

**Phase 22 — Admin Operations Suite:**
- Broadcast communications
- Document verification queue
- Moderation queue

**Phase 23 — Admin Analytics:**
- Advanced analytics
- Custom report builder
- Exportable CSVs

**Out of scope (no phase planned):**
- Multi-admin role granularity
- Admin SSO / 2FA hard requirement
</user_constraints>

---

## Standard Stack

This is a brownfield phase — every "standard" library is already pinned in `package.json`. Versions below are what's actually live, not aspirations.

### Core (already installed, MUST reuse)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react` | ^19.1.0 | UI runtime | Already the app's React version |
| `react-router` | ^7.5.0 | Route tree (`createBrowserRouter`) | All existing routes live here |
| `@supabase/supabase-js` | ^2.49.4 | DB / auth / RPC client | Single client (`src/lib/supabase.ts`) used everywhere |
| `@radix-ui/react-switch` | ^1.1.3 | Toggle primitive (suspend/reactivate, Account active state) | Already wraps in `Toggle.tsx` |
| `@radix-ui/react-dialog` | ^1.1.6 | Profile drawer base (Radix Dialog with custom side animation) | Used elsewhere; aligns with v2 motion spec |
| `@radix-ui/react-label` | ^2.1.2 | Form labels for admin notes textarea | Already the project standard |
| `lucide-react` | ^0.487.0 | Icons (LayoutDashboard, Building2, Users, Briefcase, DollarSign, ArrowLeft, X) | Project standard |
| `motion` | ^12.38.0 | Drawer slide-in animation | Phase 19 v2 standard for transitions |
| `sonner` | ^2.0.3 | Toast feedback for RPC errors / saves | Already mounted at app root in `src/main.tsx:206` |
| `tailwind-merge` + `clsx` | — | `cn()` utility | Used in every existing UI component |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | ^3.1.1 | Test runner | All tests in `tests/*.test.{ts,tsx}` |
| `@testing-library/react` | ^16.3.0 | Component tests | Existing `protected-route-oauth.test.tsx` is direct precedent |
| `jsdom` | ^29.0.0 | DOM env for vitest | `vitest.config.ts:6` already configured |

### Don't Add

The only stack-decision question for Phase 20 is "anything new?" — answer is **no**. The Phase 19 v2 component library + Radix + lucide-react covers every surface in the UI-SPEC. The pagination, search, table, drawer, toggle, status tag, audit timeline are all already in `src/components/ui/`. New components (AdminLayout, AdminSidebar, ProfileDrawer, AdminNotesField, AdminTable) compose from existing primitives only.

**Installation:** *(none)* — no new dependencies.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── AdminLayout.tsx        # NEW — clones DashboardLayout, omits top Nav per UI-SPEC
│   │   ├── AdminSidebar.tsx       # NEW — clones Sidebar pattern, admin nav items + "Back to app"
│   │   ├── DashboardLayout.tsx    # existing — pattern source
│   │   ├── ProtectedRoute.tsx     # MODIFIED — add 'admin' to requiredRole union (one-line)
│   │   └── Sidebar.tsx            # existing — pattern source
│   ├── admin/                     # NEW directory
│   │   ├── ProfileDrawer.tsx
│   │   ├── AdminNotesField.tsx
│   │   ├── AdminTable.tsx
│   │   └── EdgeFunctionErrorList.tsx (compact table; daily briefing)
│   └── ui/                        # existing — reuse without modification
├── hooks/
│   ├── useAdminGate.ts            # NEW — small wrapper enforcing role==='admin' inside admin pages (defence-in-depth alongside ProtectedRoute)
│   └── useAuth.ts                 # existing
├── lib/
│   └── supabase.ts                # existing — no change
├── pages/
│   └── admin/                     # NEW directory
│       ├── DailyBriefing.tsx      # GET /admin
│       ├── EmployerList.tsx       # GET /admin/employers
│       ├── SeekerList.tsx         # GET /admin/seekers
│       ├── JobsManagement.tsx     # GET /admin/jobs
│       └── PlacementPipeline.tsx  # GET /admin/placements
└── main.tsx                       # MODIFIED — register /admin/* routes wrapped in <ProtectedRoute requiredRole="admin"><AdminLayout>...

supabase/
├── functions/
│   └── get-resend-stats/          # NEW Edge Function (cached metric pattern; see §Resend approach)
│       └── index.ts
└── migrations/
    └── 023_admin_rpcs.sql         # NEW — admin_audit_log + admin_notes + ~7 RPCs

tests/
└── admin-*.test.{ts,tsx}          # NEW — see §Validation Architecture
```

### Pattern 1: SECURITY DEFINER RPC with Caller Role Validation

**What:** Every admin RPC validates the caller's role server-side before performing any read/write. Mirror migration 018 (which validates auth.uid() + role allowlist) and 012 (which is the simpler READ template).

**When to use:** All admin RPCs without exception. The frontend `role === 'admin'` check via ProtectedRoute is UI chrome, not a security boundary; the RPC layer IS the boundary.

**Example — read RPC pattern:**

```sql
-- Source: pattern derived from supabase/migrations/012_platform_stats_rpc.sql
-- + caller validation borrowed from 018_set_user_role_rpc.sql

CREATE OR REPLACE FUNCTION public.admin_get_daily_briefing()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Caller validation — single source of truth for admin gate
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF public.get_user_role(auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;

  -- Aggregate yesterday's signal in one round-trip
  SELECT jsonb_build_object(
    'signups_yesterday', (
      SELECT count(*) FROM auth.users
      WHERE created_at >= (now() - interval '1 day')
        AND created_at <  now()
    ),
    'jobs_posted_yesterday', (
      SELECT count(*) FROM public.jobs
      WHERE created_at >= (now() - interval '1 day')
        AND created_at <  now()
    ),
    'applications_yesterday', (
      SELECT count(*) FROM public.applications
      WHERE created_at >= (now() - interval '1 day')
        AND created_at <  now()
    ),
    'placements_acked_yesterday', (
      SELECT count(*) FROM public.placement_fees
      WHERE acknowledged_at >= (now() - interval '1 day')
        AND acknowledged_at <  now()
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_daily_briefing() TO authenticated;
```

**Example — mutation RPC pattern (suspend/reactivate, with audit):**

```sql
CREATE OR REPLACE FUNCTION public.admin_set_user_active(
  p_user_id uuid,
  p_active boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_before boolean;
  v_after  boolean;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF public.get_user_role(v_caller_id) != 'admin' THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;

  -- Capture before-state for audit
  SELECT NOT banned_until IS NULL INTO v_before
  FROM auth.users WHERE id = p_user_id;
  -- (Or whichever column we use — see §Suspension implementation)

  -- Perform the mutation. Suspension implementation in 023:
  -- using a new column on user_roles `is_active boolean DEFAULT true` is
  -- simpler than touching auth.users.banned_until and avoids RLS-on-auth
  -- complexity. Application code reads role + is_active in one query.
  UPDATE public.user_roles
  SET is_active = p_active
  WHERE user_id = p_user_id;

  v_after := p_active;

  -- Write audit row BEFORE returning
  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, payload)
  VALUES (
    v_caller_id,
    CASE WHEN p_active THEN 'reactivate_user' ELSE 'suspend_user' END,
    'user_roles',
    p_user_id,
    jsonb_build_object('before', v_before, 'after', v_after)
  );

  RETURN jsonb_build_object('ok', true, 'before', v_before, 'after', v_after);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_active(uuid, boolean) TO authenticated;
```

### Pattern 2: Frontend RPC Call Pattern

**What:** All admin pages call RPCs via `supabase.rpc('fn_name', args)` and surface errors via Sonner toast. Empty/loading/error states use existing v2 patterns from `JobSearch.tsx` and `EmployerDashboard.tsx`.

**Source:** `src/contexts/AuthContext.tsx:156`, `src/pages/auth/SelectRole.tsx:34`, `src/components/landing/CountersSection.tsx:48`, `src/components/ui/LivePreviewSidebar.tsx:90`.

**Example:**

```typescript
// Source: pattern from SelectRole.tsx:34 + EmployerDashboard.tsx error handling
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

async function loadDailyBriefing() {
  const { data, error } = await supabase.rpc('admin_get_daily_briefing')

  if (error) {
    // RLS / role rejection lands here. Frontend cannot distinguish
    // "I'm not admin" vs "function exploded" — both render the same
    // generic "Failed to load" copy per UI-SPEC error states.
    toast.error('Failed to load daily briefing. Refresh the page.')
    return null
  }
  return data as DailyBriefingPayload
}
```

### Pattern 3: AdminLayout Composition

**What:** AdminLayout is a structural clone of DashboardLayout MINUS the top `<Nav />`. UI-SPEC explicitly chose single-sidebar (Stripe Dashboard / Linear admin convention). Cloning is two-file work, not abstraction work.

**When to use:** Wrap every `/admin/*` route. Each page renders inside `<AdminLayout>{...}</AdminLayout>`.

**Example:**

```typescript
// Source: clones src/components/layout/DashboardLayout.tsx structure
import type { ReactNode } from 'react'
import { AdminSidebar } from './AdminSidebar'

interface AdminLayoutProps {
  children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-[1200px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
```

### Pattern 4: Cached External-Metric Edge Function

**What:** When admin views need data from outside Postgres (Resend delivery rate), a scheduled Edge Function polls the external API and caches the result in a new `admin_metrics_cache` table. Admin RPCs read from the cache only — they NEVER call out via `pg_net` for read-time data.

**When to use:** Resend delivery-rate indicator (locked in UI-SPEC). Reusable for any future external integration.

**Why:** Resend's `GET /emails` requires Bearer authentication with a secret API key. Calling out from a SECURITY DEFINER RPC means storing the API key in the DB (vault) and using `pg_net` synchronously, which (a) bypasses pg_net's intended async pattern, (b) couples admin page latency to Resend availability, (c) enables rate-limit hammering if multiple admins refresh, (d) leaks the secret across more layers than necessary. The cache pattern is conventional for "dashboard wants external metric."

**Schema (additions for migration 023):**

```sql
CREATE TABLE public.admin_metrics_cache (
  metric_key   text PRIMARY KEY,
  value        jsonb NOT NULL,
  cached_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_metrics_cache ENABLE ROW LEVEL SECURITY;

-- Service role only writes; admins read via SECURITY DEFINER RPC.
-- No client-facing RLS policy needed because admins never read this table directly.
```

**Edge Function (Phase 20 scope):** `get-resend-stats` — cron-driven (e.g., every 15 minutes via pg_cron `SELECT cron.schedule('refresh-resend-stats', '*/15 * * * *', 'SELECT net.http_post(...)')` or simpler: schedule a `pg_cron` job that directly issues a `pg_net` call to the Edge Function URL, paralleling 011's placement-followup-flags pattern).

**Edge Function MUST follow:**
- `verify_jwt = false` in `supabase/config.toml` (cron-driven, no user JWT in flight)
- Phase 18 hardening item #15 — add `X-Webhook-Secret` header validation inside the function (since defence-in-depth is lost when verify_jwt is off). Generate a secret, store in vault, include in pg_cron call, validate inside function.
- Resend listing endpoint: `GET https://api.resend.com/emails?limit=100` (returns up to 100 with `last_event` per email; aggregate delivered/bounced/complained → delivery rate)
- Authorization header: `Bearer ${RESEND_API_KEY}` (same env var used by `notify-job-filled`)
- On success, `INSERT INTO admin_metrics_cache (metric_key, value, cached_at) VALUES ('resend_stats', '{...}', now()) ON CONFLICT (metric_key) DO UPDATE SET value = EXCLUDED.value, cached_at = now()`

### Pattern 5: Profile Drawer JSONB Contract

**What:** `admin_get_user_profile(user_id)` returns the role-keyed JSONB shape locked in UI-SPEC §SECURITY DEFINER RPC contract. Frontend type-asserts the shape and renders sections.

**Already locked.** The migration must produce exactly:

```jsonc
{
  "role": "employer" | "seeker",
  "name": "...",
  "email": "...",
  "region": "...",
  "join_date": "ISO8601 timestamp",
  "last_sign_in": "ISO8601 timestamp | null",
  // Employer-only:
  "verification_tier": "unverified" | "email" | "nzbn" | "featured",
  "total_jobs_posted": "integer",
  // Seeker-only:
  "onboarding_complete": "boolean",
  "onboarding_step": "integer 1..7",
  "match_scores_computed": "boolean"
}
```

Key constraints:
- `email` for employers comes from `auth.users.email`. For seekers, comes from `seeker_contacts.email` (PRIVACY: this is fine — admin reads ALL seeker_contacts via SECURITY DEFINER, but the audit row records every drawer open).
- `last_sign_in` is `auth.users.last_sign_in_at`.
- `verification_tier` requires reverse-mapping the integer column on `employer_profiles.verification_tier` to the string variants — see §Schema gotcha below.

### Anti-Patterns to Avoid

- **Adding admin policies to existing RLS tables.** CONTEXT.md explicitly forbids this — the SECURITY DEFINER RPC layer is the entire point. Adding `OR get_user_role(auth.uid()) = 'admin'` to existing policies widens RLS holes for the marginal benefit of one or two list pages. Don't.
- **Calling `auth.admin.getUserById` or `adminClient.auth.getUser(token)` from a `verify_jwt: true` Edge Function.** This is BFIX-05. The gateway-trust pattern is mandatory. (No Phase 20 Edge Functions need this — `get-resend-stats` is `verify_jwt: false` cron-driven — but if the planner ever adds a verify_jwt Edge Function, this rule applies.)
- **Using `pg_net` from inside a read-time SECURITY DEFINER RPC.** Read RPCs are STABLE and execute in milliseconds. Network calls block, fail, time out, and (critically) `pg_net.http_post` returns immediately with a request ID — you can't wait for the response inside a transaction. Cache externally; read internally.
- **Stripe invoice replication.** CONTEXT.md says click-through only. The placement-pipeline view links out to `https://dashboard.stripe.com/customers/<cus_id>` and `https://dashboard.stripe.com/invoices/<in_id>`. (Note: when in test mode, prefix paths with `/test/` — see §Stripe URL gotcha below.)
- **Adding a global "admin" badge to Nav.** Admin is a separate route tree with its own sidebar. The user's primary role (employer/seeker) is the one their Nav header reflects.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Admin role gate at backend | New custom auth check | Existing `get_user_role(auth.uid())` helper from migration 002 | Already used in every RLS policy. Single source of truth. |
| Pagination | Custom pager | `Pagination` from `src/components/ui/Pagination.tsx` | Already a11y-correct, focus-visible, brand-token wired |
| Status tags | Custom CSS | `Tag` variants (green/warn/blue/grey/orange/purple/red) from `src/components/ui/Tag.tsx` | Phase 19 v2 spec-compliant, hardcoded amber-dark text already correct |
| Toggle (suspend/reactivate) | Native checkbox | `Toggle` from `src/components/ui/Toggle.tsx` (wraps Radix Switch) | Already has a11y label binding, focus ring, brand-coloured checked state |
| Drawer | Custom transitions | Radix Dialog + `motion` (already in deps) | Existing v2 motion patterns; `prefers-reduced-motion` baseline |
| Stat strip | Custom flex layout | `StatsStrip` from `src/components/ui/StatsStrip.tsx` | Tabular nums + 4-slot grid + responsive 2-col already wired |
| Audit log display | Custom timeline CSS | `Timeline` from `src/components/ui/Timeline.tsx` | Already styled with brand dot + connecting line |
| Cron status / job inspection | Polling Edge Function logs API | `cron.job` + `cron.job_run_details` (Postgres tables) | Built into pg_cron; queryable in same SQL transaction. See §Platform health data sources |
| pg_net failure tracking | Custom request log | `net._http_response` (Postgres table, 6h retention) | Built into pg_net. Filter `WHERE status_code >= 500` |
| Edge Function errors | Polling external API | Supabase BigQuery `function_edge_logs` + `function_logs` | Available via Logs Explorer SQL — but see §Platform health for trade-off |
| Resend delivery rate | Direct API call from page | Cached metric pattern (Edge Function poller + `admin_metrics_cache` read RPC) | Avoids rate-limiting + decouples admin page from Resend availability |

**Key insight:** Phase 20 is 95% composition. The temptation to "improve" existing primitives or build a "more admin-y" variant of any of them is wrong. Single-admin internal tools earn nothing from polish that didn't already ship in Phase 19.

---

## Common Pitfalls

### Pitfall 1: `verification_tier` integer/string mismatch

**What goes wrong:** UI-SPEC's `verification_tier` enum is `"unverified" | "email" | "nzbn" | "featured"`, but `employer_profiles.verification_tier` is `int NOT NULL DEFAULT 1` (001_initial_schema.sql:37).

**Why it happens:** v1 schema used integer tiers; UI-SPEC adopted human-readable strings.

**How to avoid:** The `admin_get_user_profile` RPC must reverse-map. Decision required at plan time: either (a) hard-code a CASE expression in the RPC mapping `1→unverified, 2→email, 3→nzbn, 4→featured`, or (b) cross-reference `employer_verifications` table (migration 005) to compute the most-advanced verified method per employer. (a) is simpler; (b) is more accurate. Recommend (b) since `employer_verifications` is the actual source of truth for verification methods, and the integer column is legacy. Confirm correct integer-tier semantics before plan writes the CASE statement.

**Warning signs:** Type errors in the drawer when you flip the API mock to live data.

### Pitfall 2: Suspension implementation choice (auth.users.banned_until vs new column)

**What goes wrong:** Two reasonable implementations of "suspended":
- (a) Set `auth.users.banned_until` (Supabase Auth's native banning — login is blocked at gateway)
- (b) Add `is_active boolean DEFAULT true` to `user_roles` and check it in RLS policies + ProtectedRoute

**Why it happens:** Both work, but they have different blast radii.

**How to avoid:** Use option (b). Reasoning:
- (a) requires SECURITY DEFINER access to `auth.users` UPDATE, which is more privileged than necessary.
- (a) blocks login at the gateway — no error message rendered, just a 401. Suspended users don't see "your account has been suspended" copy; they think their password broke.
- (b) keeps the "you have been suspended" UX possible in a future Phase 21 (login screen could detect `is_active=false` after auth and show appropriate copy).
- (b) is auditable in plain Postgres tooling — `SELECT user_id, is_active FROM user_roles` is more discoverable than `auth.users.banned_until` for an operator.
- (b) requires updating no existing RLS policy if Phase 20 just hides suspended users from search results client-side. Actual login-blocking can wait for Phase 21.

**Warning signs:** Don't propose option (a) unless explicitly justified — it's a bigger surface change than option (b).

### Pitfall 3: pg_net response retention is 6 hours

**What goes wrong:** Daily briefing surfaces "pg_net failures in last 24h" → most rows are gone before the briefing reads them.

**Why it happens:** `net._http_response` defaults to 6h retention to prevent table bloat.

**How to avoid:** Either (a) extend the retention window via pg_net config (`UPDATE net.config SET ...` — check pg_net docs at apply time), or (b) write a separate trigger / scheduled job that copies failures into a project-owned `pg_net_failure_log` table with longer retention. (b) is the safer option for a 24h reporting window.

**Recommend:** scope this to "last 6 hours of pg_net failures" on the briefing for MVP; add the longer-retention failure log in Phase 21 if it becomes operationally relevant.

**Warning signs:** Empty failure log on briefing despite known failures the day before.

### Pitfall 4: cron.job_run_details unbounded growth

**What goes wrong:** `cron.job_run_details` accumulates one row per cron execution forever.

**Why it happens:** pg_cron has no auto-cleanup.

**How to avoid:** Don't worry about it for Phase 20 — TopFarms has 2 cron jobs (008 + 011), running daily. That's ~700 rows/year. Briefing reads only the most recent run per job_id (LATERAL join or `DISTINCT ON`). Self-cleaning job is a Phase 21+ ops task.

### Pitfall 5: Edge Function logs are NOT in Postgres

**What goes wrong:** Operator expects "Edge Function errors in last 24h" to be a Postgres query.

**Why it happens:** Supabase Edge Function logs (`function_edge_logs`, `function_logs`) live in BigQuery, queried via the Logs Explorer / Logs Drains API — NOT a Postgres table.

**How to avoid:** Three options at plan time:
- (a) Render a deep link to the Supabase Logs Explorer for each error tier ("View errors in Supabase Logs"). Simplest; no new code; honest about the data location.
- (b) Build a periodic Edge Function that calls the Logs API + caches into `admin_metrics_cache` (mirrors Resend pattern). More complex; introduces a Logs API dependency.
- (c) Trigger-side capture: the only Edge Function whose failures we genuinely care about is `notify-job-filled` (driven by 017 trigger via pg_net). Filter `net._http_response WHERE url LIKE '%/notify-job-filled' AND status_code >= 400` — this ALREADY captures what matters for the daily briefing without adding Logs API surface.

**Recommend:** option (c) for MVP. The "Edge Function errors" card on the briefing reads from `net._http_response` filtered to known internal Edge Function URLs + status >= 400. This is honest ("here's what our trigger calls failed") without requiring a Logs API integration. UI copy: "Webhook errors (last 6 hours)" rather than the more ambitious "Edge Function errors (last 24h)" — accurate to data source.

**Warning signs:** Plan proposes "query function_edge_logs from RPC" — that's a BigQuery call, not Postgres. Doesn't work in-process.

### Pitfall 6: Stripe URL test/live mode prefix

**What goes wrong:** Phase 18 carryforward #13 notes Stripe is currently in test mode; production swap is pending. Test-mode URLs are `https://dashboard.stripe.com/test/customers/<cus_id>`; production are `https://dashboard.stripe.com/customers/<cus_id>` (no `/test`).

**Why it happens:** Stripe's web app uses `/test/` as a path-segment marker when test-mode keys are in use; live-mode omits it.

**How to avoid:** Plan should not hard-code one or the other. Either (a) read the env mode from a setting and prefix conditionally, or (b) link to `/customers/<cus_id>` (no prefix) — Stripe will route to test or live based on the dashboard's last-active mode. Option (b) is simpler. Confirm at plan time.

**Warning signs:** Operator clicks "View in Stripe" → 404 on live dashboard.

### Pitfall 7: Migration `apply_migration` name mismatch

**What goes wrong:** Apply via `mcp__supabase__apply_migration({ name: 'admin_rpcs', ... })` instead of `'023_admin_rpcs'`. Live registry name lacks the `NNN_` prefix.

**Why it happens:** NAMING.md documents prior drift (018 + 020 omitted prefix; 019 included it). Going-forward convention is "include the prefix."

**How to avoid:** Pass `name: '023_admin_rpcs'` exactly. Also document the migration in NAMING.md lookup table after apply.

### Pitfall 8: ProtectedRoute `requiredRole` union must include 'admin' BEFORE wiring routes

**What goes wrong:** Adding `<ProtectedRoute requiredRole="admin">` in main.tsx without first widening the type union → TypeScript build fails.

**Why it happens:** ProtectedRoute.tsx:7 is `requiredRole?: 'employer' | 'seeker'`.

**How to avoid:** Sequence in plan: (1) widen the union to include `'admin'`, (2) THEN register routes. Trivial but easy to put in wrong order.

### Pitfall 9: AUTH-FIX-02 perpetual spinner on first admin nav

**What goes wrong:** The first time Harry navigates to `/admin` after Studio-SQL bootstrap, his session has cached `role='seeker'` (or whatever his existing role was). ProtectedRoute redirects him away because `role !== 'admin'`. Even a hard refresh + new session may need `refreshRole()` since the role was set under a different `user_roles.role` value than his cached one.

**Why it happens:** After running the Studio SQL `INSERT INTO user_roles ... ON CONFLICT (user_id) DO UPDATE SET role = 'admin'`, Harry's existing client session still has the pre-update role cached.

**How to avoid:** Documented sign-out + sign-in step in the plan's first-time-setup section. Or expose the existing `refreshRole()` from AuthContext via a temporary "Refresh role" button. Sign-out is simpler and one-time.

**Warning signs:** Bug report from Harry: "I ran the Studio SQL but /admin still bounces me to /dashboard/seeker."

---

## Code Examples

Verified patterns from existing code or official sources.

### Wiring `/admin/*` routes (from `src/main.tsx` pattern)

```typescript
// Source: src/main.tsx:114-120 + extension for admin
{
  path: '/admin',
  element: (
    <ProtectedRoute requiredRole="admin">
      <AdminLayout>
        <DailyBriefing />
      </AdminLayout>
    </ProtectedRoute>
  ),
},
{
  path: '/admin/employers',
  element: (
    <ProtectedRoute requiredRole="admin">
      <AdminLayout>
        <EmployerList />
      </AdminLayout>
    </ProtectedRoute>
  ),
},
// ...etc for /admin/seekers, /admin/jobs, /admin/placements
```

### Querying `cron.job_run_details` for cron health

```sql
-- Source: Supabase Cron docs https://supabase.com/docs/guides/cron
-- Plus pattern derived from migration 011 cron job names

-- Most recent run per job
SELECT
  j.jobname,
  rd.status,
  rd.return_message,
  rd.start_time,
  rd.end_time
FROM cron.job j
LEFT JOIN LATERAL (
  SELECT *
  FROM cron.job_run_details
  WHERE jobid = j.jobid
  ORDER BY start_time DESC
  LIMIT 1
) rd ON true
ORDER BY j.jobname;
```

This goes inside `admin_get_cron_health()` SECURITY DEFINER RPC.

### Querying `net._http_response` for webhook failures

```sql
-- Source: Supabase pg_net docs https://supabase.com/docs/guides/database/extensions/pg_net
-- Filtered to failures only

SELECT
  id,
  status_code,
  content::text AS error_body,
  created
FROM net._http_response
WHERE status_code IS NULL OR status_code >= 400
ORDER BY created DESC
LIMIT 50;
```

NOTE: `status_code IS NULL` catches in-flight or pre-response failures (DNS, connection refused). The `created` column is the response-receive time. Retention is 6 hours by default.

This goes inside `admin_get_webhook_failures()` SECURITY DEFINER RPC.

### Resend list-emails poller (Edge Function body)

```typescript
// Source: pattern derived from supabase/functions/notify-job-filled/index.ts
// + Resend list emails endpoint https://resend.com/docs/api-reference/emails/list-emails

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const ADMIN_METRICS_WEBHOOK_SECRET = Deno.env.get('ADMIN_METRICS_WEBHOOK_SECRET')

Deno.serve(async (req) => {
  // Phase 18 hardening — secret check (verify_jwt = false)
  if (req.headers.get('x-webhook-secret') !== ADMIN_METRICS_WEBHOOK_SECRET) {
    return new Response('forbidden', { status: 403 })
  }

  if (!RESEND_API_KEY) {
    return new Response('RESEND_API_KEY unset', { status: 503 })
  }

  // Pull last 100 emails (max page size)
  const res = await fetch('https://api.resend.com/emails?limit=100', {
    headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
  })

  if (!res.ok) {
    return new Response(`resend error: ${await res.text()}`, { status: 502 })
  }

  const { data: emails } = await res.json()

  // Aggregate by last_event
  const counts = emails.reduce((acc: Record<string, number>, e: any) => {
    const event = e.last_event ?? 'unknown'
    acc[event] = (acc[event] ?? 0) + 1
    return acc
  }, {})
  const total = emails.length
  const delivered = (counts.delivered ?? 0) + (counts.opened ?? 0) + (counts.clicked ?? 0)
  const rate = total > 0 ? delivered / total : 1

  // Upsert into admin_metrics_cache via Supabase service-role client (omitted — uses service role to bypass RLS on cache table)
  // ...

  return new Response(JSON.stringify({ ok: true, rate, total }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Admin via direct table queries with RLS broadened | SECURITY DEFINER RPC layer | TopFarms-specific decision (CONTEXT.md) | Zero touch to existing RLS policies |
| `auth.admin.getUser(token)` to validate JWT in verify_jwt:true Edge Functions | Decode payload locally, trust gateway (BFIX-05) | 2026-04-29 | Mandatory pattern for any future admin Edge Function |
| pg_net `body text` signature | pg_net `body jsonb` (v0.20.0) | 2026-05-03 (migration 022) | Any new admin RPC calling pg_net must use jsonb |
| Direct INSERT into `user_roles` from frontend | RPC `set_user_role` (migration 018) | 2026-04-28 | Admin-role bootstrap is Studio-SQL or future admin RPC; never frontend INSERT |
| v1 brand tokens (soil/moss/meadow) | v2 brand tokens (brand/brand-50/brand-900/warn/danger) | Phase 19 (2026-05-04) | All admin-page styling uses v2 tokens; no hardcoded amber-dark hex (PHASE-19-KNOWN-STATE) |

**Deprecated/outdated:**
- v1 design tokens — DO NOT use in admin pages. Phase 19 v2 is the contract.
- `pg_net.http_post(body text)` — gone in 0.20.0. Use jsonb.
- `verify_jwt: true` + `auth.getUser(token)` re-validation — banned per BFIX-05.

---

## Platform Health Data Sources (Open Question Resolution)

CONTEXT.md "Claude's Discretion" listed the platform-health data-source question for the researcher. Locked recommendations:

| Surface | Data source | Confidence | Notes |
|---------|-------------|------------|-------|
| Yesterday's signups | `auth.users.created_at` | HIGH | Standard Supabase auth schema |
| Yesterday's jobs posted | `public.jobs.created_at` | HIGH | Existing column |
| Yesterday's applications | `public.applications.created_at` | HIGH | Existing column |
| Yesterday's placements ack'd | `public.placement_fees.acknowledged_at` | HIGH | Existing column from migration 011 |
| Cron timestamps | `cron.job` JOIN `cron.job_run_details` (most recent per jobname) | HIGH | Verified via Supabase Cron docs |
| pg_net failures | `net._http_response WHERE status_code >= 400 OR status_code IS NULL` | HIGH | 6h retention; honest scoping in copy |
| Edge Function errors (broad) | Out of scope for MVP — link to Supabase Logs Explorer | HIGH | BigQuery-based; not Postgres-queryable in-process |
| Edge Function errors (notify-job-filled specifically) | Subset of `net._http_response` filtered by URL pattern | HIGH | Captures the failure path that actually matters operationally |
| Resend delivery rate | `admin_metrics_cache` populated by `get-resend-stats` Edge Function (cron, 15min) | HIGH | UI-SPEC locked the pattern; this confirms the implementation |
| Active job count per employer | `count(*) FROM jobs WHERE employer_id = ... AND status = 'active'` | HIGH | Existing schema |
| Onboarding-complete per seeker | `seeker_profiles.onboarding_complete` | HIGH | Existing column |
| Match-scores-computed per seeker | `EXISTS (SELECT 1 FROM match_scores WHERE seeker_id = ...)` | HIGH | Existing schema |
| Last sign-in | `auth.users.last_sign_in_at` | HIGH | Standard Supabase auth schema |
| Admin notes | new `admin_notes` table (admin_id + target_user_id + content + created_at) — see schema below | HIGH | UI-SPEC says additive only; new table is simpler than column-on-profile |
| Audit trail | new `admin_audit_log` table | HIGH | CONTEXT.md locked |

### `admin_notes` schema (additive only)

```sql
CREATE TABLE public.admin_notes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  content      text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;
CREATE INDEX admin_notes_target_idx ON public.admin_notes (target_user_id, created_at DESC);
-- No RLS policies — read/write only via SECURITY DEFINER RPCs
```

### `admin_audit_log` schema

```sql
CREATE TABLE public.admin_audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action       text NOT NULL,        -- 'suspend_user', 'reactivate_user', 'add_note', etc.
  target_table text NOT NULL,        -- 'user_roles', 'admin_notes', etc.
  target_id    uuid,                 -- FK to the affected row (uuid)
  payload      jsonb,                -- before/after diff or context
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX admin_audit_log_target_idx ON public.admin_audit_log (target_table, target_id, created_at DESC);
CREATE INDEX admin_audit_log_admin_idx ON public.admin_audit_log (admin_id, created_at DESC);
-- No RLS policies — read/write only via SECURITY DEFINER RPCs
```

### RPC catalogue (proposed for migration 023)

| RPC | Returns | Notes |
|-----|---------|-------|
| `admin_get_daily_briefing()` | jsonb (counts) | Yesterday's signups/jobs/apps/placements + revenue snapshot |
| `admin_get_system_alerts()` | jsonb (array of alerts) | webhook failures + cron health + Resend stats from cache |
| `admin_list_employers(p_search text, p_limit int, p_offset int)` | jsonb (rows + total) | Searchable employers list |
| `admin_list_seekers(p_search text, p_limit int, p_offset int)` | jsonb (rows + total) | Searchable seekers list |
| `admin_list_jobs(p_search text, p_limit int, p_offset int)` | jsonb (rows + total) | All jobs with applicant count |
| `admin_list_placements(p_limit int, p_offset int)` | jsonb (rows + total) | Placement-fee pipeline with overdue flag |
| `admin_get_user_profile(p_user_id uuid)` | jsonb (UI-SPEC shape) | Drawer payload — locked contract |
| `admin_set_user_active(p_user_id uuid, p_active bool)` | jsonb (ok + diff) | Suspend/reactivate + audit row |
| `admin_add_note(p_target_user_id uuid, p_content text)` | jsonb (note row) | Insert admin_notes + audit row |
| `admin_get_user_audit(p_user_id uuid)` | jsonb (timeline rows) | Drawer "Activity" section |

**~10 RPCs.** All in one migration `023_admin_rpcs.sql` to keep the audit trail atomic. Each uses the same caller-validation header.

---

## Open Questions

1. **`verification_tier` integer/string mapping rule**
   - What we know: `employer_profiles.verification_tier` is `int NOT NULL DEFAULT 1` (001:37); UI-SPEC enum is `unverified|email|nzbn|featured`.
   - What's unclear: whether the integer encodes `1=unverified, 2=email, 3=nzbn, 4=featured` or whether `employer_verifications` (migration 005) is the truth source.
   - Recommendation: planner reads 005 + checks live data with read-only MCP `execute_sql`; encode the mapping in `admin_get_user_profile` definitively.

2. **`onboarding_step` source**
   - What we know: UI-SPEC shows `onboarding_step` as integer 1..7. `seeker_profiles.onboarding_complete` is a boolean (existing). 
   - What's unclear: whether seeker onboarding step is tracked granularly. `employer_profiles` has `onboarding_step int NOT NULL DEFAULT 0` (004:24) — does seeker have an analogous column?
   - Recommendation: planner inspects `seeker_profiles` schema (`information_schema.columns`); if no per-step tracking, derive step heuristically (step 1 if profile created, step 7 if onboarding_complete=true, otherwise compute from filled-field count). Acceptable for MVP.

3. **Suspension implementation: `is_active` column on `user_roles` vs separate table**
   - What we know: prefer adding `is_active boolean NOT NULL DEFAULT true` to `user_roles` (Pitfall 2).
   - What's unclear: whether to also enforce `is_active=true` in existing `get_user_role()` helper (which would make all RLS policies suspension-aware automatically) — that's a bigger blast radius than Phase 20 wants.
   - Recommendation: column-only for MVP. RLS policies still pass for suspended users; admin UI uses a separate filter to hide them. Login-blocking deferred to Phase 21 if needed.

4. **`pg_net` failure log retention**
   - What we know: 6h default in `net._http_response`.
   - What's unclear: whether to extend retention or build a project-owned failure log table.
   - Recommendation: stay with 6h for MVP; honestly scope copy ("last 6 hours of webhook activity"). Extension is Phase 21 ops work if Harry actually finds 6h too short in operation.

5. **Resend Edge Function scheduling**
   - What we know: cron-driven Edge Function pattern is the recommended architecture (UI-SPEC locked).
   - What's unclear: whether to schedule via pg_cron + pg_net call (parallels migration 011) or via Supabase's built-in scheduled-edge-functions feature (newer, dashboard-managed).
   - Recommendation: pg_cron + pg_net via migration 023, paralleling 011. Keeps everything in-repo + version-controlled. Dashboard-managed schedule is opaque to git history.

---

## Validation Architecture

> nyquist_validation in `.planning/config.json` — not explicitly set, treat as enabled. Section included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.1.1 + @testing-library/react 16.3.0 |
| Config file | `vitest.config.ts` (jsdom, globals, setupFiles `./tests/setup.ts`) |
| Quick run command | `pnpm test -- tests/admin-protected-route.test.tsx` (single test file) |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

CONTEXT.md confirms no public REQ-IDs. Validation derives from CONTEXT.md "MVP must-haves" + UI-SPEC contract + the three things that MUST be empirically true to ship: (a) non-admins cannot reach /admin/* UI, (b) non-admins cannot call admin RPCs, (c) admin role assignment works, (d) each MVP view returns correct data, (e) RLS holes weren't widened.

| ID | Behavior | Test Type | Automated Command | File Exists? |
|----|----------|-----------|-------------------|-------------|
| ADMIN-GATE-FE-1 | Anonymous user redirected from /admin to /login | unit (RTL) | `pnpm test tests/admin-protected-route.test.tsx` | Wave 0 |
| ADMIN-GATE-FE-2 | Authenticated employer (role='employer') redirected from /admin to /dashboard/employer | unit (RTL) | `pnpm test tests/admin-protected-route.test.tsx` | Wave 0 |
| ADMIN-GATE-FE-3 | Authenticated seeker (role='seeker') redirected from /admin to /dashboard/seeker | unit (RTL) | `pnpm test tests/admin-protected-route.test.tsx` | Wave 0 |
| ADMIN-GATE-FE-4 | Authenticated admin reaches /admin and sees DailyBriefing | unit (RTL) | `pnpm test tests/admin-protected-route.test.tsx` | Wave 0 |
| ADMIN-GATE-BE-1 | Anonymous JWT calling `admin_get_daily_briefing` returns "Not authenticated" error | integration (SQL via MCP `execute_sql` with anon API key) | `pnpm test tests/admin-rpc-gate.test.ts` (mocks supabase client to use anon key) | Wave 0 |
| ADMIN-GATE-BE-2 | Employer-role JWT calling any `admin_*` RPC returns "Forbidden: admin role required" | integration | `pnpm test tests/admin-rpc-gate.test.ts` | Wave 0 |
| ADMIN-GATE-BE-3 | Seeker-role JWT calling any `admin_*` RPC returns "Forbidden: admin role required" | integration | `pnpm test tests/admin-rpc-gate.test.ts` | Wave 0 |
| ADMIN-GATE-BE-4 | Admin-role JWT calling each `admin_*` RPC returns 200 + valid jsonb shape | integration | `pnpm test tests/admin-rpc-shapes.test.ts` | Wave 0 |
| ADMIN-BOOTSTRAP-1 | After Studio SQL `INSERT ... admin`, the new admin's session refresh returns role='admin' | manual UAT | `tests/admin-bootstrap-UAT.md` | Wave 0 |
| ADMIN-VIEW-DAILY | Daily briefing returns yesterday's counts within 1 of expected (test seed) | integration | `pnpm test tests/admin-daily-briefing.test.ts` | Wave 0 |
| ADMIN-VIEW-EMPL | Employer list returns paginated rows + matches search filter | integration | `pnpm test tests/admin-employer-list.test.ts` | Wave 0 |
| ADMIN-VIEW-SEEK | Seeker list returns paginated rows + matches search filter | integration | `pnpm test tests/admin-seeker-list.test.ts` | Wave 0 |
| ADMIN-VIEW-JOBS | Jobs list returns rows with applicant count | integration | `pnpm test tests/admin-jobs-list.test.ts` | Wave 0 |
| ADMIN-VIEW-PLAC | Placement pipeline returns ack'd-not-confirmed rows; >14d marked overdue | integration | `pnpm test tests/admin-placement-list.test.ts` | Wave 0 |
| ADMIN-MUT-SUS | `admin_set_user_active(uuid, false)` flips state + writes audit row | integration | `pnpm test tests/admin-suspend.test.ts` | Wave 0 |
| ADMIN-MUT-REA | `admin_set_user_active(uuid, true)` flips back + writes audit row | integration | `pnpm test tests/admin-suspend.test.ts` | Wave 0 |
| ADMIN-MUT-NOTE | `admin_add_note(uuid, text)` inserts note + audit row + returns note row | integration | `pnpm test tests/admin-notes.test.ts` | Wave 0 |
| ADMIN-RLS-NEG-1 | Existing seeker still sees only own match_scores (no new admin policy widened RLS) | integration | `pnpm test tests/admin-rls-not-widened.test.ts` (calls existing seeker queries with seeker JWT, asserts row counts unchanged from baseline) | Wave 0 |
| ADMIN-RLS-NEG-2 | Existing employer still sees only own jobs/applications (RLS unchanged) | integration | `pnpm test tests/admin-rls-not-widened.test.ts` | Wave 0 |
| ADMIN-DRAWER | `admin_get_user_profile(uuid)` returns the UI-SPEC JSONB shape exactly | integration | `pnpm test tests/admin-drawer-shape.test.ts` (asserts JSON keys + types per UI-SPEC) | Wave 0 |
| ADMIN-AUDIT | Every admin mutation appears in `admin_audit_log` with correct admin_id + target | integration | `pnpm test tests/admin-audit.test.ts` | Wave 0 |
| ADMIN-VIEW-RESEND | Daily briefing reads `admin_metrics_cache.resend_stats` and renders rate; "unavailable" copy when cache stale | integration + manual | `pnpm test tests/admin-resend-cache.test.ts` + UAT for live Resend | Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test -- tests/admin-*.test.{ts,tsx}` (admin-only suite; under 30 seconds)
- **Per wave merge:** `pnpm test` (full vitest suite green)
- **Phase gate:** Full suite green + manual ADMIN-BOOTSTRAP-1 UAT recorded with admin's auth.users.id, refreshed-role state captured

### Wave 0 Gaps

Existing test infrastructure is sufficient — vitest config + setup.ts exist, `protected-route-oauth.test.tsx` is direct precedent. New test files needed:

- [ ] `tests/admin-protected-route.test.tsx` — covers ADMIN-GATE-FE-1..4
- [ ] `tests/admin-rpc-gate.test.ts` — covers ADMIN-GATE-BE-1..3 (mocks supabase client, asserts RPC errors)
- [ ] `tests/admin-rpc-shapes.test.ts` — covers ADMIN-GATE-BE-4 (admin call returns valid jsonb)
- [ ] `tests/admin-daily-briefing.test.ts` — covers ADMIN-VIEW-DAILY
- [ ] `tests/admin-employer-list.test.ts`, `tests/admin-seeker-list.test.ts`, `tests/admin-jobs-list.test.ts`, `tests/admin-placement-list.test.ts` — covers ADMIN-VIEW-*
- [ ] `tests/admin-suspend.test.ts` — covers ADMIN-MUT-SUS, ADMIN-MUT-REA
- [ ] `tests/admin-notes.test.ts` — covers ADMIN-MUT-NOTE
- [ ] `tests/admin-rls-not-widened.test.ts` — covers ADMIN-RLS-NEG-1, ADMIN-RLS-NEG-2 (CRITICAL — proves we didn't punch holes in existing RLS)
- [ ] `tests/admin-drawer-shape.test.ts` — covers ADMIN-DRAWER (JSONB shape contract test)
- [ ] `tests/admin-audit.test.ts` — covers ADMIN-AUDIT
- [ ] `tests/admin-resend-cache.test.ts` — covers ADMIN-VIEW-RESEND
- [ ] `tests/admin-bootstrap-UAT.md` — manual UAT script for ADMIN-BOOTSTRAP-1 (one-shot Studio SQL + sign-out + sign-in)

**Framework install:** none needed — vitest + RTL + jsdom already present.

**Integration tests note:** "integration" tests in this matrix call live Supabase via the existing client mocks pattern (see `tests/applications.test.ts` for precedent of testing supabase queries). For tests that need the actual RPC to exist (ADMIN-GATE-BE-*, ADMIN-VIEW-*), they should be runnable against a local supabase instance OR against the deployed test/staging project. The plan should specify which target.

### Critical Validation: RLS not-widened proof

The single most important test for Phase 20 is **ADMIN-RLS-NEG-1 and ADMIN-RLS-NEG-2**: empirical proof that introducing the admin role + admin RPCs did not change any existing seeker's or employer's data access. Methodology:

1. Before applying migration 023, capture row-count baselines for representative queries: `SELECT count(*) FROM jobs WHERE status='active'` (seeker view), `SELECT count(*) FROM applications` (employer view, scoped via existing JWT), `SELECT count(*) FROM match_scores` (seeker scope).
2. Apply migration 023.
3. Re-run the same queries with the same seeker / employer JWTs.
4. Assert counts are identical. Any drift means a policy was widened — investigate before phase merge.

This is the empirical equivalent of CONTEXT.md's "don't widen existing RLS holes" decision.

---

## Sources

### Primary (HIGH confidence)
- `supabase/migrations/001_initial_schema.sql:13` — confirms admin role in CHECK constraint
- `supabase/migrations/002_rls_policies.sql:13-21` — `get_user_role()` helper (reuse for admin gate)
- `supabase/migrations/012_platform_stats_rpc.sql` — TEMPLATE for read RPCs
- `supabase/migrations/018_set_user_role_rpc.sql` — TEMPLATE for caller-validated mutation RPCs
- `supabase/migrations/017_notify_job_filled_webhook.sql` + `022_fix_pg_net_http_post_signature.sql` — pg_net pattern + signature gotcha
- `supabase/migrations/008_job_expiry_cron.sql` + `011_placement_fee_followups.sql` — pg_cron pattern + the two cron jobs the briefing surfaces
- `supabase/migrations/NAMING.md` — migration naming convention (sequence-prefix on disk; pass with prefix to apply_migration)
- `supabase/config.toml` — verify_jwt per-function settings; pattern for new Edge Function
- `src/contexts/AuthContext.tsx` — `useAuth().role` source of truth + `refreshRole()` for post-Studio-SQL session
- `src/components/layout/ProtectedRoute.tsx:7` — the union to widen
- `src/components/layout/DashboardLayout.tsx`, `Sidebar.tsx`, `Nav.tsx` — clone targets for AdminLayout / AdminSidebar
- `src/components/ui/Toggle.tsx`, `Tag.tsx`, `StatsStrip.tsx`, `Timeline.tsx`, `Pagination.tsx` — verified primitive contracts
- `src/main.tsx` — route registration pattern
- `tests/protected-route-oauth.test.tsx` — direct precedent for the gate-test pattern
- `vitest.config.ts` + `tests/setup.ts` — test framework already wired
- `package.json` — dependency versions verified
- `.planning/phases/20-super-admin-dashboard/20-CONTEXT.md` — locked decisions (read end-to-end)
- `.planning/phases/20-super-admin-dashboard/20-UI-SPEC.md` — visual + JSONB contracts (read end-to-end)
- [Supabase Cron docs](https://supabase.com/docs/guides/cron) — `cron.job` + `cron.job_run_details` schema (verified 2026-05-04)
- [Supabase pg_net docs](https://supabase.com/docs/guides/database/extensions/pg_net) — `net._http_response` schema + 6h retention (verified 2026-05-04)
- [Resend list emails docs](https://resend.com/docs/api-reference/emails/list-emails) — `GET /emails?limit=100` + cursor pagination + `last_event` field (verified 2026-05-04)
- [Supabase RBAC docs](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) — SECURITY DEFINER schema-placement guidance

### Secondary (MEDIUM confidence)
- WebSearch ([Supabase pg_cron debugging](https://supabase.com/docs/guides/troubleshooting/pgcron-debugging-guide-n1KTaz), [Webhook debugging](https://supabase.com/docs/guides/troubleshooting/webhook-debugging-guide-M8sk47), [pg_net cleanup issue #97](https://github.com/supabase/pg_net/issues/97)) — failure-monitoring patterns + retention defaults; aligned with primary docs
- [Supabase Edge Function logs / BigQuery](https://supabase.com/docs/guides/telemetry/logs) — confirms function logs are NOT in Postgres; cross-referenced with [Logs & Analytics features](https://supabase.com/features/logs-analytics)
- [makerkit RLS best practices](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) + [supabase RBAC discussion #346](https://github.com/orgs/supabase/discussions/346) — community + Supabase official guidance on SECURITY DEFINER + admin patterns

### Tertiary (LOW confidence — flagged)
- None. All claims have either a code reference, a migration reference, or an official-docs link.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every dep already in package.json, versions verified
- Architecture: HIGH — patterns mirror existing migrations 012 + 018 + 017, all in production
- Pitfalls: HIGH — 9 pitfalls all derived from existing code or documented incidents (BFIX-05, MAIL-02 chain, Phase 18 carryforwards)
- Platform health data sources: HIGH — every source either documented in Supabase docs or already used in repo
- Validation architecture: HIGH — vitest infrastructure already present; test patterns documented; precedent in `tests/protected-route-oauth.test.tsx`
- Open questions: explicitly flagged 5 items; none block planning

**Research date:** 2026-05-04
**Valid until:** 2026-06-04 (30 days; stable Supabase + React stack, no fast-moving libraries in scope)
