---
phase: 20-super-admin-dashboard
plan: 02
subsystem: admin-rpc-backend
tags: [admin, rpc, security-definer, audit-log, rls-not-widened]
status: in-progress
started_at: 2026-05-04T11:39:12Z
completed_at: null
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
decisions: []
metrics:
  duration: TBD
  completed_date: TBD
---

# Phase 20 Plan 02: Admin RPC Backend Summary

One-liner: Single atomic migration (023) introducing the SECURITY DEFINER admin RPC layer + audit log + suspension state, applied via Supabase Studio per CLAUDE.md §2 with empirical RLS-not-widened proof captured.

## Status

**Wave 1 / Task 1 — Pre-migration RLS baseline capture: AWAITING OPERATOR**

This is the load-bearing ADMIN-RLS-NEG-1/2 ground truth per VALIDATION.md. The operator (Harry) must run the 6 baseline SELECTs in Supabase Studio SQL Editor for project `inlagtgpynemhipnqvty` BEFORE migration 023 is applied, capture the integers below, and reply with the resume signal.

## Pre-migration RLS baseline (captured TBD)

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
| 1 | jobs (status='active') | _TBD_ | _TBD_ | _TBD_ |
| 2 | match_scores (all rows) | _TBD_ | _TBD_ | _TBD_ |
| 3 | applications (all rows) | _TBD_ | _TBD_ | _TBD_ |
| 4 | jobs (all rows) | _TBD_ | _TBD_ | _TBD_ |
| 5 | employer_profiles | _TBD_ | _TBD_ | _TBD_ |
| 6 | seeker_profiles | _TBD_ | _TBD_ | _TBD_ |

Captured at: _TBD_ (ISO8601 UTC timestamp)
Operator confirmation: _awaiting `approved: baselines=[...]`_

## 023_admin_rpcs.sql apply (TBD)

_Pending Task 3 (Studio apply checkpoint). This section populated when migration is live._

## ADMIN-RLS-NEG verdict

_Pending baseline diff. Both ADMIN-RLS-NEG-1 and ADMIN-RLS-NEG-2 will be marked empirically green when pre/post integers match exactly._
