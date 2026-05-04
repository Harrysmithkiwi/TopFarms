# Phase 20: Super Admin Dashboard - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Internal-only admin panel at `/admin/*` for Harry (solo operator) to monitor and operate the TopFarms marketplace. Never public-facing. Gated to a new `admin` role assigned via one-shot Studio SQL. Built on Phase 19 v2 design system. Read-only inspection across users + jobs + revenue + system health, plus a single mutation surface (suspend/reactivate users) for week-one operational reality.

</domain>

<decisions>
## Implementation Decisions

### Architecture (locked pre-Discuss)
- New `admin` role role-gated via `user_roles` table — schema scout confirmed CHECK constraint already includes `'admin'` (001_initial_schema.sql:13). **No CHECK constraint migration needed.**
- SECURITY DEFINER RPC layer for all admin queries — zero changes to existing RLS policies. Follow `012_platform_stats_rpc.sql` pattern: `RETURNS jsonb`, `SECURITY DEFINER`, `STABLE`, `GRANT EXECUTE TO authenticated`. Each RPC validates `get_user_role(auth.uid()) = 'admin'` server-side.
- Separate `AdminLayout` component (clone DashboardLayout structure with admin-specific nav links).
- `/admin/*` protected route tree inside existing React app — same Vercel deployment, same Supabase project.
- Phase 19 v2 design system tokens + components (Tag, Card, Button, Pagination, Tabs) — no new design primitives.
- First-time setup: one-shot Supabase Studio SQL to assign Harry's `auth.users.id` the admin role. NOT auto-assigned by `handle_new_user` trigger (which COALESCEs to `'seeker'`).

### Route protection
- `role === 'admin'` check via existing `ProtectedRoute` is sufficient. No middleware layer (Vite SPA, no Next.js middleware concept). Frontend role check is UI-only chrome; the SECURITY DEFINER RPC layer is the actual security boundary — even if frontend bypassed (DevTools), every backend call rejects.
- **Required code change:** `ProtectedRoute.tsx:7` — extend `requiredRole?: 'employer' | 'seeker'` to `'employer' | 'seeker' | 'admin'`. One-line type extension.

### MVP scope — 6 admin views

1. **Daily briefing** (`/admin`) — yesterday's signups + jobs posted + applications + ack'd placements; system alerts (Edge Function errors, failed pg_net calls, cron timestamps); revenue snapshot stat strip; **Resend delivery-rate indicator** (carve-out from feature E given recurring MAIL-02 failures per v2.0-MILESTONE-AUDIT)
2. **Employer list** (`/admin/employers`) — searchable table: verification tier, account status, date joined, job count, admin notes column, suspend/reactivate toggle
3. **Seeker list** (`/admin/seekers`) — searchable table: onboarding complete Y/N, match scores computed Y/N, region, date joined, admin notes column, suspend/reactivate toggle
4. **Jobs management** (`/admin/jobs`) — all jobs across platform: status, applicant count, employer link, days live, days since last applicant
5. **Placement fee pipeline** (`/admin/placements`) — read-only: ack date, days since ack (overdue flag at >14d), hire confirmed Y/N, click-through link to Stripe customer/invoice
6. **User profile drawer** (light) — click any row in views 2/3/4 → side drawer with profile state (employer_profiles or seeker_profiles SELECT, no relationship views). Pure inspector.

### MVP mutation surface (single, narrow)
- **Suspend/reactivate toggle** on employer + seeker rows. Boolean status flip. One SECURITY DEFINER RPC `admin_set_user_active(user_id, active)`. Writes row to `admin_audit_log` before returning. Reasoning: bad-actor employers are a week-one operational reality in any marketplace; need to suspend without going to Studio.
- **Admin notes** (additive only — text inserts, no destructive ops) on employer + seeker rows. Trivial column or separate `admin_notes` table.
- **All other mutations DEFER to Phase 21** — verification tier bumps, manual triggers, broadcast comms, doc verification queue.

### Audit governance
- **`admin_audit_log` table** — admin_id, action, target_table, target_id, payload jsonb, created_at. Every admin RPC that mutates writes a row before returning. Future-proof for accountability (second admin, incident response).

### Placement fee invoicing
- Stripe dashboard only for MVP. Admin panel is read-only pipeline visibility with click-through to Stripe customer/invoice for action. No replication of Stripe's invoice UI.

### Migration plan
- **No CHECK constraint migration** (already supports `'admin'`).
- New migration `023_admin_rpcs.sql` (or next available number) — bundles ~6-8 SECURITY DEFINER RPCs + `admin_audit_log` table + `admin_notes` columns/table. Follows established pattern from 012/017/018/021/022.
- One-shot Studio SQL (NOT a migration) — `INSERT INTO user_roles (user_id, role) VALUES ('<harry-uuid>', 'admin') ON CONFLICT (user_id) DO UPDATE SET role = 'admin';`. Documented in plan, not executed by CI.

### Deferred to Phase 21 (post-MVP)
- Manual system triggers (re-run match scores, re-trigger nightly recalc, re-send failed email)
- System health bar (persistent indicators) — daily briefing already covers same info
- Verification tier bumps from admin
- Broadcast comms
- Document verification queue
- Moderation queue
- Advanced analytics
- Deep relationship views in profile drawer (match scores list, applications list)

### Claude's Discretion
- Exact admin nav structure (top tabs vs side rail) — pick based on Phase 19 design conventions
- Daily-briefing card layout (StatsStrip-driven? AICandidateSummary-style?) — use existing primitives
- Suspend/reactivate UX (modal confirm vs inline toggle vs button-with-undo) — pick based on a11y + safety
- Admin notes UI (textarea-on-row vs drawer-pinned vs separate page) — pick based on minimum-clicks
- Profile drawer width + animation — match v2 spec patterns
- Edge Function error log presentation (table vs cards vs collapsed list) — pick based on operator scan-ability
- Resend delivery-rate query approach (Resend API call from RPC vs cached metric) — researcher to investigate

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project state + decisions
- `.planning/PROJECT.md` — Vision + non-negotiables
- `.planning/REQUIREMENTS.md` — Active requirement list (admin not in current REQ-IDs; this phase is internal tooling)
- `.planning/ROADMAP.md` §"Phase 20: Super Admin Dashboard" — Phase scope + dependency
- `.planning/SESSION-HANDOFF-2026-05-04.md` §"Next session brief — Super Admin Dashboard phase" — Original brief
- `.planning/SESSION-HANDOFF-2026-05-04-phase20.md` — Phase 20 Discuss-output handoff (this session)
- `.planning/v2.0-MILESTONE-AUDIT.md` — Recurring MAIL-02 issues that justify Resend delivery-rate carve-out

### Design system (Phase 19 — live in production)
- `.planning/v2-migration/DESIGN.md` — Stitch-format design contract; AdminLayout + admin pages use these tokens + components
- `.planning/v2-migration/PRODUCT.md` — Brand voice, anti-chrome paranoia principle (applies even to internal admin)
- `.planning/v2-migration/TopFarms_Brand_Spec_v2.md` — Authoritative v2 brand spec
- `.planning/v2-migration/PHASE-19-KNOWN-STATE.md` — Post-Phase-19 polish carryforward (admin shouldn't introduce new amber-dark hardcoded values)

### Reusable code
- `src/components/layout/ProtectedRoute.tsx` — Existing role-gating component; needs `'admin'` added to `requiredRole` union (one-line type extension)
- `src/components/layout/DashboardLayout.tsx` — Clone structure for AdminLayout
- `src/components/layout/Nav.tsx` — Pattern for top nav with role-conditional links
- `src/components/layout/Sidebar.tsx` — Pattern for left sidebar nav
- `src/contexts/AuthContext.tsx` — `useAuth().role` already wired throughout
- `src/main.tsx` — Route tree registration (where `/admin/*` routes get added; protect each with `<ProtectedRoute requiredRole="admin">`)

### Reusable migrations (SECURITY DEFINER RPC pattern)
- `supabase/migrations/001_initial_schema.sql` §line 13 — confirms admin role already in CHECK constraint
- `supabase/migrations/012_platform_stats_rpc.sql` — TEMPLATE for admin RPCs: SECURITY DEFINER, STABLE, GRANT EXECUTE TO authenticated, jsonb return
- `supabase/migrations/018_set_user_role_rpc.sql` — RPC that mutates user_roles, includes caller validation
- `supabase/migrations/017_notify_job_filled_webhook.sql` — pg_net.http_post pattern (relevant for any RPC calling Edge Functions)
- `supabase/migrations/022_fix_pg_net_http_post_signature.sql` — most recent migration; new file should be 023

### Reusable Phase 19 v2 primitives (admin pages compose from these)
- `src/components/ui/Tag.tsx` — variants: green/warn/blue/grey/orange/purple/red (use warn for "overdue" placement-fee badges)
- `src/components/ui/Card.tsx` — wrapper for daily briefing cards
- `src/components/ui/Button.tsx` — primary/outline/ghost/warn variants
- `src/components/ui/Pagination.tsx` — for long employer/seeker/jobs lists
- `src/components/ui/StatsStrip.tsx` — daily briefing stat blocks
- `src/components/ui/Timeline.tsx` — admin_audit_log display if useful

### External (Stripe)
- Stripe dashboard — placement fee pipeline rows link out to Stripe customer/invoice URL pattern (TBD by researcher: `https://dashboard.stripe.com/customers/<cus_id>` and `/invoices/<in_id>`)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **ProtectedRoute** — admin-gating becomes `<ProtectedRoute requiredRole="admin">` after one-line union extension
- **AuthContext.useAuth().role** — single source of truth for current user role; wire AdminLayout to read this
- **DashboardLayout** — pattern to clone for AdminLayout (Nav + Sidebar + main)
- **Phase 19 v2 design system** — Tag, Card, Pagination, Button, StatsStrip, Timeline all spec-aligned, ready to compose
- **`get_platform_stats()` SECURITY DEFINER pattern (012)** — clean template for all admin RPCs
- **`get_user_role(auth.uid())` helper** — already used in RLS policies; admin RPCs call this for caller validation
- **`pg_net.http_post` pattern (017, 022)** — reference if any admin action triggers Edge Functions

### Established Patterns
- **All RPC callsites in src/** use `supabase.rpc('fn_name')` (CountersSection.tsx:48, LivePreviewSidebar, AuthContext, SelectRole)
- **CHECK constraint role validation** lives in 001 — never re-define
- **handle_new_user trigger** COALESCEs missing role to 'seeker' — admin role is explicit-assignment-only by design
- **Migration naming** uses 3-digit sequence prefix (next: 023)
- **Frontend role check + backend RPC validation** = defense in depth (Vite SPA has no middleware layer)

### Integration Points
- **`src/main.tsx`** — register `/admin/*` route tree with `<ProtectedRoute requiredRole="admin">` wrappers
- **`supabase/migrations/`** — new file `023_admin_rpcs.sql`
- **`src/components/layout/`** — new `AdminLayout.tsx` cloning DashboardLayout structure
- **`src/pages/admin/`** — new directory for the 6 admin pages (DailyBriefing, EmployerList, SeekerList, JobsManagement, PlacementPipeline) + ProfileDrawer component
- **`src/lib/supabase.ts`** — no change needed (RPCs called via supabase.rpc)
- **One-shot Studio SQL** — documented in plan, executed manually by Harry post-deploy (Harry's auth.users.id needs to be retrieved first)

</code_context>

<specifics>
## Specific Ideas

- **Operator-first ergonomics**: solo founder reviewing the marketplace post-evening-milking. Daily briefing should answer "what happened yesterday and is anything broken?" in one screen, no clicking.
- **Stripe-style click-through**: don't replicate Stripe's UI for invoice management — link out instead. Same principle as not replicating Supabase Studio for raw SQL.
- **Anti-chrome paranoia (Phase 19 PRODUCT.md principle) applies even here**: admin panel should feel like Linear's admin or Stripe Dashboard's audit log — confident clarity, no decoration that doesn't earn its presence.
- **Suspend/reactivate audit**: every flip writes admin_audit_log row with admin_id + before/after status + timestamp. Two admins (now + future) need that traceability.
- **MAIL-02 motivation for Resend indicator**: v2.0-MILESTONE-AUDIT documents recurring silent email failures (RESEND_API_KEY unset, missed deploys). Daily briefing surfacing delivery rate prevents repeating that pattern.

</specifics>

<deferred>
## Deferred Ideas

### Phase 21 — Admin V2 Mutations
- Manual system triggers (re-run match scores for a job, re-trigger nightly recalculation, re-send failed email)
- Verification tier manual bumps from admin (currently NZBN admin-flag is via Studio per PRD §9)
- Persistent system health bar (Supabase connectivity, Stripe webhook last-received) — beyond just Resend on daily briefing
- Deep profile drawer relationships (full applications list per seeker, full job list per employer, match scores expanded)
- Bulk operations (multi-select rows + batch suspend, batch admin-note)

### Phase 22 — Admin Operations Suite
- Broadcast communications (in-app announcements, email blasts to user segments)
- Document verification queue (review uploaded employer docs/farm photos)
- Moderation queue (flagged employer profiles, reported jobs)

### Phase 23 — Admin Analytics
- Advanced analytics (cohort analysis, funnel conversion, retention, GMV trending)
- Custom report builder
- Exportable CSVs

### Out of scope (no phase planned)
- Multi-admin role granularity (super admin vs read-only admin vs support admin) — solo founder for foreseeable future
- Admin SSO / 2FA hard requirement — single admin, password is sufficient initially

</deferred>

---

*Phase: 20-super-admin-dashboard*
*Context gathered: 2026-05-04*
