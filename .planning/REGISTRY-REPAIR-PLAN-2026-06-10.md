# Migration Registry Repair Plan — 2026-06-10 (DRY-RUN EVIDENCE ONLY, NOT EXECUTED)

Prepared per audit follow-up session item 6. Nothing here has been run against
prod except read-only inspection (`migration list`, `db push --dry-run`).

## Finding 1 — the §6 pooler blocker appears MOOT on current CLI

Both `supabase migration list --linked` and `supabase db push --linked --dry-run`
connected successfully on **CLI 2.98.2** via "Initialising login role..." — a
PAT-based managed connection. No `SUPABASE_DB_PASSWORD`, no SASL 28P01. The
dry-run failed on **registry drift only**, not auth.

Implication: `supabase-deploy.yml` pins CLI **2.95.4** and gates migrations to
`workflow_dispatch` because of pooler auth. Re-test with CLI >= 2.98 in CI; if
the login role works there (it needs `SUPABASE_ACCESS_TOKEN`, already provided),
the migrations job can be un-gated after the repair below — without ever
resolving the stale db password.

## Finding 2 — exact drift (from `migration list --linked`, 2026-06-10)

| Disk (local) | Remote registry | Reality |
|---|---|---|
| 001–017 | 001–017 | aligned |
| 018, 019, 020 | `20260428043338`, `20260428053314`, `20260429031148` | same SQL, applied via MCP under timestamp IDs |
| 021, 022 | `20260503000000`, `20260503210000` | same SQL, applied under timestamp IDs |
| 023–035 | 023–035 | aligned (034/035 registry *names* carry a duplicated prefix — cosmetic only, version IDs align) |
| 036 | — | applied 2026-06-10 via Management API (storage policy); no registry row |

Without repair, `db push` would (a) abort on the 5 remote-only timestamp rows,
and if those were repaired alone — as the old one-time note in
`supabase-deploy.yml` suggests — it would then **re-apply 018–022 and 036**
(re-running DDL that is already live). The yml header's repair command is
INCOMPLETE; do not use it as written.

## The repair (registry-row edits only — no DDL executes)

```bash
# 1. Remove the duplicate timestamp identities:
supabase migration repair --status reverted \
  20260428043338 20260428053314 20260429031148 20260503000000 20260503210000

# 2. Record the disk identities as applied:
#    (038 added 2026-06-10 — marketplace view; 039 added 2026-06-11 — analytics
#     RPCs; both applied via the same Management-API path as 036.
#     037 stays OUT of this list until it is actually applied at pre-launch.)
supabase migration repair --status applied 018 019 020 021 022 036 038 039
```

## Verification (after repair, before any push)

```bash
supabase migration list --linked   # every row must show Local == Remote
supabase db push --linked --dry-run   # must report nothing to push
```

## Blast radius / rollback

- `migration repair` edits rows in `supabase_migrations.schema_migrations`
  only. It cannot run DDL. Worst case is a wrong registry state, fixed by
  another `repair` call — the table can also be inspected/corrected directly
  in Studio.
- The dangerous moment is the FIRST `db push` after repair: if step 2 missed a
  version, push re-runs applied DDL. Mitigate: dry-run first (above), and keep
  the migrations CI job gated until one manual dry-run is green.
- 034/035 double-prefixed registry *names* are cosmetic; do not touch.

## Sequencing for the pre-launch session

1. Run the two repair commands (operator present).
2. Verify per above.
3. Bump `supabase-deploy.yml` CLI pin 2.95.4 → current; re-enable the
   migrations path filter (remove the workflow_dispatch gate) once one CI
   dry-run passes.
4. Retire the stale `SUPABASE_DB_PASSWORD` secret if the login role carries CI
   (per CLAUDE §6: do NOT rotate it — just stop depending on it).
