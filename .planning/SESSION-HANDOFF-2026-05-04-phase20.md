# Phase 20 Session Handoff — 2026-05-04 evening

**Purpose:** Drop-in resume for the next Claude session after `/clear`. Read this first; it pre-loads the Discuss output for Phase 20 (Super Admin Dashboard) so the fresh session can launch straight into `/gsd:plan-phase 20`.

---

## Where we are

- **Phase 19 (v2 brand migration) shipped to production** earlier this session. Merge commit `50dd5b8` on main, deployed live at `top-farms.vercel.app`.
- **Phase 20 Discuss completed.** Full GSD Discuss workflow ran end-to-end. Decisions captured in `.planning/phases/20-super-admin-dashboard/20-CONTEXT.md`.
- **Next:** `/gsd:plan-phase 20` (the fresh session does this as its second action, after reading this handoff).

## Read these in order

1. **This file** (you're here) — session resume + Discuss summary
2. **`.planning/phases/20-super-admin-dashboard/20-CONTEXT.md`** — canonical Discuss output that `/gsd:plan-phase` consumes. Contains: phase boundary, 18 implementation decisions, canonical refs, code context, deferred ideas.
3. **`.planning/v2-migration/DESIGN.md`** + **`.planning/v2-migration/PRODUCT.md`** — Phase 19 design system; admin UI composes from the v2 primitives (Tag, Card, Button, Pagination, StatsStrip, Timeline)
4. **`.planning/SESSION-HANDOFF-2026-05-04.md`** §"Next session brief — Super Admin Dashboard phase" — original Phase 20 brief from yesterday

## Critical scout finding (changes the migration plan)

**`user_roles` CHECK constraint already includes `'admin'`** since v1.0 (`supabase/migrations/001_initial_schema.sql:13`):

```sql
role text NOT NULL CHECK (role IN ('employer', 'seeker', 'admin'))
```

So the original "migration 023 to extend the CHECK constraint" framing is OBSOLETE. The migration plan is now:
- **No CHECK migration needed.**
- New migration `023_admin_rpcs.sql` (or next available number) bundles: ~6-8 SECURITY DEFINER RPCs + `admin_audit_log` table + `admin_notes` columns/table
- One-shot Supabase Studio SQL (NOT a migration) to assign Harry's `auth.users.id` the admin role: `INSERT INTO user_roles (user_id, role) VALUES ('<harry-uuid>', 'admin') ON CONFLICT (user_id) DO UPDATE SET role = 'admin';`
- One-line code change: `ProtectedRoute.tsx:7` `requiredRole?: 'employer' | 'seeker'` → `'employer' | 'seeker' | 'admin'`

## Discuss decisions — quick reference

### Architecture (locked pre-Discuss, confirmed)
- `admin` role via existing `user_roles` table + new SECURITY DEFINER RPC layer
- Separate `AdminLayout` (clone of DashboardLayout structure)
- `/admin/*` protected route tree
- Phase 19 v2 design tokens + components — no new primitives
- `role === 'admin'` check via existing ProtectedRoute is sufficient. No middleware layer needed (Vite SPA, RPC layer is the security boundary)

### MVP scope — 6 admin views
1. **Daily briefing** (`/admin`) — yesterday's signups/jobs/applications/ack'd placements + system alerts + revenue snapshot stat strip + **Resend delivery-rate indicator** (carve-out from feature E)
2. **Employer list** (`/admin/employers`) — searchable + admin notes + suspend/reactivate toggle
3. **Seeker list** (`/admin/seekers`) — searchable + admin notes + suspend/reactivate toggle
4. **Jobs management** (`/admin/jobs`) — all platform jobs (NEW — feature A include)
5. **Placement fee pipeline** (`/admin/placements`) — read-only with click-through to Stripe
6. **User profile drawer** (light, NEW — feature D include) — click any row → side drawer

### MVP mutations (single, narrow)
- **Suspend/reactivate user toggle** — boolean active/suspended on employer + seeker. One SECURITY DEFINER RPC `admin_set_user_active(user_id, active)`. Writes admin_audit_log row before returning.
- **Admin notes** — additive text only on employer + seeker rows
- **Everything else DEFER to Phase 21** (manual triggers, tier bumps, broadcast, moderation)

### Open questions — resolved
| Q | Resolution |
|---|---|
| Admin audit log? | **INCLUDE** — `admin_audit_log` table; every mutating RPC writes row before returning |
| Quick actions vs read-only? | **READ-ONLY + admin notes day one + suspend/reactivate toggle**. All other mutations Phase 21 |
| Placement fee invoicing? | **Stripe dashboard only**. Admin panel is read-only pipeline visibility with click-through |
| Route protection? | **role === 'admin' check sufficient**. No middleware needed |

### Features A-E — evaluated
| # | Feature | Verdict |
|---|---|---|
| A | Jobs management table | **INCLUDE** — marketplace operator needs listing health visibility |
| B | Manual system triggers | **DEFER** Phase 21 — mutation paths with edge cases; Studio acceptable for now |
| C | Revenue snapshot | **INCLUDE** — trivial scope, sits on daily briefing stat strip |
| D | User profile drawer (light) | **INCLUDE** — pure inspector, massively improves operator workflow |
| E | System health bar | **DEFER** Phase 21 — except Resend delivery-rate indicator (carve-out on daily briefing, motivated by recurring MAIL-02 silent failures) |

## What the fresh session does

1. Read this handoff + `20-CONTEXT.md`
2. Run `/gsd:plan-phase 20` — researcher investigates RPC patterns, planner breaks into atomic plans, plan-checker verifies goal coverage
3. After Plan checkpoint → `/gsd:execute-phase 20` → atomic per-plan commits, Vercel preview verifies per phase
4. After Execute → `/gsd:verify-work 20` (or `/gsd:audit-milestone` if Phase 20 closes the v2.0 milestone)
5. **Stop for user approval at end of Plan before Execute.** Same gate the user wants between Discuss and Plan held this session.

## State at handoff

- **Branch:** main (Phase 19 merged via `50dd5b8`)
- **Working tree:** clean except for the in-flight Phase 20 Discuss artifacts (CONTEXT.md + this handoff). Will be committed before /clear.
- **All Phase 19 commits pushed.** Production verified.
- **No active blockers.** v2.0 milestone audit shows MAIL-02 RESEND_API_KEY still pending (separate concern, doesn't gate Phase 20).
- **Context budget at session end:** ~22% remaining when this handoff was written. Fresh session starts at 100%.

## Carryforward / known state

- `.planning/v2-migration/PHASE-19-KNOWN-STATE.md` — post-Phase-19 polish items (MatchCircle sizing, hardcoded amber-darks consolidation, italic-emphasis on landing). Phase 20 must NOT introduce new instances of these patterns.
- ROADMAP.md Phase 20 entry stands as written; status will flip from "Pending (discuss next session)" to "In progress" once Plan starts.

---

*Drop-in handoff written 2026-05-04 evening, end of Phase 20 Discuss session. Working tree clean post-commit.*
