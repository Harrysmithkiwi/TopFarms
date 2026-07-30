# Phase-1 build notes — locked constraints (operator, 2026-07-03)

*These land in the Phase-1 follow-up PR (with the `system-architecture.md`
Supabase-canonical edit, the final migration, and `eng-issues-to-create.md`).
Fold/delete this file once Phase 1 is done.*

## Migration (the ~6–7 new GTM columns for Option B)

Do NOT draft the final migration until these four are resolved, then **show the
final to the operator before any Studio apply** (write access is read-only per
CLAUDE §2 — applied via Studio, never slipped in):

1. **One stage field, not two.** Reconcile `gtm_stage` with the existing
   `leads.status` (041: new/contacted/onboarded/dead) into a **single source of
   truth for where a lead is**. No duplicate stage columns. Likely: extend/replace
   `status` to carry the 7-stage spine, or map cleanly — decide + justify.
2. **Table placement.** Decide `leads` vs a new `gtm_targets` table vs
   `lead_staging` (the funnel spans pre- and post-approval). Justify before applying.
3. **contact_name vs `contact` jsonb.** Resolve the redundancy — check the live
   schema; do not add a column that duplicates `contact->>'name'` without reason.
4. **Show the final migration before apply.** Verify against the live `leads`
   schema first (read-only SELECT), then present; operator applies in Studio.

## Asana (Option B)

- Free tier, 0 custom fields → **hand-built by operator** (skip OAuth). Four light
  projects: title = farm name, section = stage, description = 14-line summary,
  due date = next action. Claude provides click-by-click at Phase 1.
- The canonical 14-field schema lives in **Supabase columns**, driven via the
  already-connected Supabase MCP.

## Connections

- Phase 0 for the operator = **Linear connect only**. Asana MCP skipped.
- Stripe / Gmail deferred. Skills = last phase.
