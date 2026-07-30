# Migrations — how they actually get applied here

Read this before writing or applying a migration. The normal Supabase workflow does **not** work on
this project, and the reason is not obvious from the tooling.

## The constraint: `supabase db push` does not work

Pooler auth is blocked platform-side (confirmed twice; a Studio password reset does not persist
server-side). `supabase db push` and `supabase migration up` therefore cannot connect. **Do not spend
time debugging this** — it is a known, documented dead end. The migrations CI lane is gated off for
the same reason.

## The write path

Apply migrations through the **claude.ai Supabase connector** (`apply_migration`), which is
write-capable against production and *does* record a `supabase_migrations.schema_migrations` row.
Supabase Studio's SQL editor also works but **does not** write a ledger row — that is what caused the
2026-07 drift.

Whichever path you use:

1. **Save the SQL to a numbered file in this directory first.** The file is the source of truth for
   content.
2. Apply it.
3. **Verify via `pg_catalog` / a read-only `SELECT`.** Never trust the success banner — Studio has
   been observed reporting "Success, no rows" for a paste that partially failed. Verify the actual
   artefact: `pg_proc` for a function, `pg_policies` for a policy, `cron.job` for a schedule,
   `information_schema.columns` for a column.
4. **Add a row to `LEDGER.md`.** CI fails if a `.sql` file has no manifest row
   (`tests/migration-ledger-drift.test.ts`).
5. If you applied via Studio (no automatic ledger row), record it manually — see
   `../maintenance/2026-07-30_ledger_backfill.sql` for the shape.

## Numbering

Sequential three-digit prefix, `NNN_snake_case_slug.sql`. The next free number is the highest on disk
plus one. Note the ledger `version` for a file is **not always** its numeric prefix — migrations
applied via the CLI carry timestamp versions. `LEDGER.md` maps every file to its actual ledger
version; consult it rather than assuming.

## What went wrong in 2026-07 (so it doesn't recur)

Migrations `036`–`056` — including the entire leads pipeline — were applied through Studio and the
connector without ledger rows. By 2026-07-30 the ledger held 45 rows against 64 files, and no tool
could determine what had been applied. Two further ledger rows existed with no dedicated file, which
initially looked like production schema outside version control; on inspection both were "apply a
delta, then amend the source file" and their content **was** on disk (see `LEDGER.md`).

Reconciled 2026-07-30 by verifying each of the 21 migrations' runtime artefact in `pg_catalog` before
backfilling. The manifest plus its CI guard is the prevention.

## Replay from zero

**Untested.** The file sequence `001`→latest is believed to produce the current schema, but nobody has
replayed it against a clean database. Two known wrinkles: `034` reseeds the skills taxonomy and empties
`seeker_skills` (documented in-file), and the two duplicate-content deltas above mean the *path* differs
from production's history even though the *destination* matches. Verifying a clean replay against a
scratch database is tracked for Phase 6.

## Also here

- `LEDGER.md` — file → ledger version manifest, CI-enforced
- `NAMING.md` — naming conventions
- `../maintenance/` — one-off operational scripts that are **not** schema migrations and must not be
  replayed
