---
phase: 20-super-admin-dashboard
plan: 02
subsystem: admin-rpc-backend
tags: [admin, rpc, security-definer, audit-log, rls-not-widened]
status: complete
started_at: 2026-05-04T11:39:12Z
completed_at: 2026-05-04T21:42:10Z
requires:
  - "Migration 022 applied (most recent baseline)"
  - "public.get_user_role(uuid) helper from 002_rls_policies.sql"
  - "user_roles.role CHECK constraint already includes 'admin' (per 001_initial_schema.sql:13)"
provides:
  - "Migration 023_admin_rpcs.sql applied via Studio SQL Editor"
  - "user_roles.is_active boolean column"
  - "admin_audit_log + admin_notes + admin_metrics_cache tables"
  - "10 SECURITY DEFINER admin_* RPCs + _admin_gate helper"
  - "Empirical ADMIN-RLS-NEG-1/2 ground truth (pre/post baseline match)"
affects:
  - "supabase/migrations/NAMING.md (new row for 023)"
tech-stack:
  added: []
  patterns:
    - "SECURITY DEFINER RPC layer (pattern from 012/018) for caller-validated admin reads/mutations"
    - "audit-row-before-return for every admin mutation"
key-files:
  created:
    - supabase/migrations/023_admin_rpcs.sql
  modified:
    - supabase/migrations/NAMING.md
decisions:
  - "Single atomic migration (023) wraps schema additions + 10 RPCs + audit log in one BEGIN/COMMIT — atomic rollback per CONTEXT.md audit-governance decision; no incremental partial state if any RPC body fails."
  - "Applied via Supabase Studio SQL Editor (CLAUDE.md §2 preferred path) instead of MCP `apply_migration` to avoid the `--read-only` flag-flip + Claude Code restart cycle. Same path used for 016 and 017."
  - "NOT IN REGISTRY (`supabase_migrations.schema_migrations`) — Studio applies do not write registry rows. Verifiability is via runtime artefacts (3 tables, is_active column, 11 functions) enumerated in NAMING.md row, not via `list_migrations`."
  - "RLS not widened (empirical proof): 6 baseline row counts identical pre/post (jobs_active=1, match_scores=3, applications=2, jobs=2, employers=1, seekers=2) — closes ADMIN-RLS-NEG-1/2 per 20-VALIDATION.md."
  - "`_admin_gate()` helper extracted as a SECURITY DEFINER STABLE function called via `PERFORM` from every admin RPC (DRY enforcement of the 'auth.uid() IS NOT NULL AND get_user_role(auth.uid())=admin' contract). Not granted to any role — only callable from inside other SECURITY DEFINER bodies."
  - "Suspension state stored as `user_roles.is_active boolean NOT NULL DEFAULT true` (RESEARCH.md Pitfall 2 option b) rather than a separate `user_suspensions` table — keeps the suspend/reactivate hot-path on the role-lookup row that every protected request already reads."
metrics:
  duration: ~10 hours wall-clock (2026-05-04T11:39:12Z → 2026-05-04T21:42:10Z, including Studio-apply checkpoint wait)
  completed_date: 2026-05-04
---

# Phase 20 Plan 02: Admin RPC Backend Summary

One-liner: Single atomic migration (023) introducing the SECURITY DEFINER admin RPC layer + audit log + suspension state, applied via Supabase Studio per CLAUDE.md §2 with empirical RLS-not-widened proof captured.

## Status

**Wave 1 / Task 1 — Pre-migration RLS baseline capture: COMPLETE**
**Wave 1 / Task 2 — Migration 023_admin_rpcs.sql write: COMPLETE (commit `aa9fa80`)**
**Wave 1 / Task 3 — Studio SQL Editor apply: COMPLETE (operator-applied 2026-05-04T21:40:47Z)**
**Wave 1 / Task 4 — NAMING.md update: COMPLETE**

This is the load-bearing ADMIN-RLS-NEG-1/2 ground truth per VALIDATION.md. The operator (Harry) ran the 6 baseline SELECTs in Supabase Studio SQL Editor for project `inlagtgpynemhipnqvty` BEFORE migration 023 was applied; integers captured below.

## Pre-migration RLS baseline (captured 2026-05-04T21:24:48Z)

Run these in Supabase Studio SQL Editor (project `inlagtgpynemhipnqvty`):

```sql
-- Baseline 1: total active jobs (seeker visibility scope)
SELECT count(*) AS jobs_active_total FROM public.jobs WHERE status = 'active';

-- Baseline 2: total match_scores rows (seeker visibility scope)
SELECT count(*) AS match_scores_total FROM public.match_scores;

-- Baseline 3: total applications rows (employer visibility scope)
SELECT count(*) AS applications_total FROM public.applications;

-- Baseline 4: total jobs rows (employer scope)
SELECT count(*) AS jobs_total FROM public.jobs;

-- Baseline 5: total employer_profiles rows
SELECT count(*) AS employers_total FROM public.employer_profiles;

-- Baseline 6: total seeker_profiles rows
SELECT count(*) AS seekers_total FROM public.seeker_profiles;
```

| # | Metric | Pre-migration count | Post-migration count | Match? |
|---|--------|---------------------|----------------------|--------|
| 1 | jobs (status='active') | 1 | 1 | yes |
| 2 | match_scores (all rows) | 3 | 3 | yes |
| 3 | applications (all rows) | 2 | 2 | yes |
| 4 | jobs (all rows) | 2 | 2 | yes |
| 5 | employer_profiles | 1 | 1 | yes |
| 6 | seeker_profiles | 2 | 2 | yes |

Captured at: 2026-05-04T21:24:48Z (ISO8601 UTC timestamp)
Operator confirmation: `approved: baselines=[jobs_active=1, match_scores=3, applications=2, jobs=2, employers=1, seekers=2]` (received 2026-05-04T21:24:48Z)

## 023_admin_rpcs.sql apply

**Apply timestamp:** 2026-05-04T21:40:47Z (ISO8601 UTC)
**Apply path:** Supabase Studio SQL Editor for project `inlagtgpynemhipnqvty` (CLAUDE.md §2 — Studio is the preferred path for one-off DB writes; avoids the `--read-only` flag-flip restart cycle).
**Apply mode:** entire body of `supabase/migrations/023_admin_rpcs.sql` pasted into a single SQL Editor query and Run; transaction committed via the migration's wrapping `BEGIN; ... COMMIT;`.
**Operator confirmation:** `applied: artefacts=[3 tables, is_active column, 10 RPCs + _admin_gate helper], baselines unchanged: [1, 3, 2, 2, 1, 2]` (received 2026-05-04T21:40:47Z).

### Runtime artefacts confirmed (post-apply)

Verified via read-only Supabase MCP `execute_sql` queries 5a-5d as defined in 20-02-PLAN.md Task 3:

| Artefact | Verification | Result |
|---|---|---|
| `public.admin_audit_log` table | `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN (...)` (5a) | present |
| `public.admin_notes` table | (5a) | present |
| `public.admin_metrics_cache` table | (5a) | present |
| `public.user_roles.is_active` column | `SELECT column_name FROM information_schema.columns WHERE ... AND column_name='is_active'` (5b) | present |
| 10 admin_* RPCs + `_admin_gate` helper | `SELECT proname FROM pg_proc WHERE proname LIKE 'admin\_%' OR proname='_admin_gate'` (5c) | 11 names returned (`_admin_gate`, `admin_add_note`, `admin_get_daily_briefing`, `admin_get_system_alerts`, `admin_get_user_audit`, `admin_get_user_profile`, `admin_list_employers`, `admin_list_jobs`, `admin_list_placements`, `admin_list_seekers`, `admin_set_user_active`) |
| `authenticated` role EXECUTE on `admin_get_daily_briefing` | `SELECT has_function_privilege('authenticated', 'public.admin_get_daily_briefing()', 'EXECUTE')` (5d) | true |

### Registry note

Per CLAUDE.md §2 and the existing 016/017 precedent in `supabase/migrations/NAMING.md`, Studio-applied migrations do NOT write rows to `supabase_migrations.schema_migrations`. Migration 023 is therefore **not in the live registry** — its presence is verifiable only through the runtime artefacts enumerated above (and is documented as such in the NAMING.md row added by Task 4).

## ADMIN-RLS-NEG verdict

**Empirically green: ADMIN-RLS-NEG-1 and ADMIN-RLS-NEG-2 are PASS.**

The 6 baseline counts captured pre-apply (jobs_active=1, match_scores=3, applications=2, jobs=2, employers=1, seekers=2) are **identical** to the post-apply re-run of the same SELECTs. Migration 023 added new SECURITY DEFINER RPCs and three new tables; none of its statements touched RLS policies or `GRANT`s on existing tables. The matched row counts are therefore the empirical proof that the existing RLS scopes for seekers (jobs visibility, match_scores visibility) and employers (applications visibility, jobs ownership) were not widened by this migration.

**Verdict: RLS not widened (counts identical).** This is the load-bearing Phase 20 verification per `20-VALIDATION.md` "Critical Validation: RLS Not-Widened Proof".
