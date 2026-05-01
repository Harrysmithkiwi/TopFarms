# Migration Registry Repair — Studio INSERT Method

**Repaired at:** 2026-05-01
**Context:** Plan 15-03 Task 4 — pre-flight before enabling `supabase db push` in CI

## Why CLI Repair Failed

`supabase migration repair --status applied 20260428043338 20260428053314 20260429031148`
failed with a file-glob mismatch error. This is the registry-vs-disk drift documented in
15-01-SUMMARY.md §Migration Registry Quirk Decision:

- Remote registry has timestamp-style version IDs: `20260428043338`, `20260428053314`, `20260429031148`
- Local disk files use sequence-prefix convention: `018_set_user_role_rpc.sql`, `019_seeker_documents.sql`, `020_seeker_documents_employer_policy.sql`
- The CLI's `migration repair` command attempts to glob-match disk files by version ID and
  cannot reconcile sequence-prefix filenames with timestamp registry IDs.
- This is a known limitation of the CLI for projects that mix Studio-applied migrations
  (which generate timestamp IDs) with locally-authored migrations (which use sequence-prefix naming).

## Resolution — Studio SQL INSERT

The correct repair approach for this drift class is a direct INSERT into
`supabase_migrations.schema_migrations` via Supabase Studio SQL Editor.

**SQL executed in Supabase Studio (project: inlagtgpynemhipnqvty):**

```sql
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES
  ('20260428043338', 'set_user_role_rpc', ARRAY[]::text[]),
  ('20260428053314', '019_seeker_documents', ARRAY[]::text[]),
  ('20260429031148', 'seeker_documents_employer_policy', ARRAY[]::text[])
ON CONFLICT (version) DO NOTHING;
```

**Why ARRAY[]::text[] for statements:** These migrations were already applied to the database
before the registry row was created. The `statements` column is used by the CLI for replaying
migrations — since the schema is already live, an empty array is the correct value (same as
what `supabase migration repair --status applied` would set).

**Why ON CONFLICT DO NOTHING:** Safe idempotent re-run if this INSERT is ever executed again.

## Verification SELECT

**Query run after INSERT:**

```sql
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version IN ('20260428043338', '20260428053314', '20260429031148');
```

**Result confirmed by user (all 3 rows present):**

| version          | name                               |
|------------------|------------------------------------|
| 20260428043338   | set_user_role_rpc                  |
| 20260428053314   | 019_seeker_documents               |
| 20260429031148   | seeker_documents_employer_policy   |

Registry is now consistent. `supabase db push --linked --dry-run` should no longer report
"Remote migration versions not found in local migrations directory."

## Pattern for This Project

**For TopFarms: registry-vs-disk drift on Supabase migrations caused by MCP `apply_migration`
should be repaired via Studio SQL INSERT into `supabase_migrations.schema_migrations`, not via
`supabase migration repair` CLI command.**

Reason: `supabase migration repair` requires disk files whose names match the remote timestamp
version IDs. TopFarms uses sequence-prefix naming for locally-authored migrations; MCP-applied
migrations use timestamp IDs. These two conventions are incompatible with the CLI's file-glob
matching logic.

**Future mitigation (see 15-04 NAMING.md update):** Document this pattern in
`supabase/migrations/NAMING.md` so future contributors know to use Studio INSERT for any
registry repair involving timestamp-ID migrations that have no matching local disk file.

## Impact on CI Workflow

After this repair:
- `supabase db push --linked --dry-run` will succeed without registry mismatch errors
- `supabase db push --linked` in CI (supabase-deploy.yml) is now safe to run
- All 3 previously-mismatch migrations (018/019/020) are correctly registered as applied
- No new migrations will be applied (they are already live in the database)
