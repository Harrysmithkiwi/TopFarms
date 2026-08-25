# Archive — records of shipped work

Moved here 2026-08-25 by the documentation consolidation (`docs/DOC-AUDIT-2026-08-25.md`).
**Nothing was deleted.** These are decision records: read them to understand why something
was built, never to decide what to build.

| Directory | What it records | Closed |
|---|---|---|
| `milestones/` | v1.0 MVP and v1.1, phase plans and verifications | shipped |
| `phases/` | phases 12–28 — OAuth, email, saved search, admin, leads triage | shipped |
| `design-gate/` | the 11-ticket portal design gate | complete 2026-08-07 |
| `admin-design-gate/` | admin portal design pass | complete |
| `go-live/` | launch programme | launched 2026-08-14 |
| `v2-migration/` | the v1 → v2 brand migration | complete |
| `snapshots/` | point-in-time PRD captures | superseded |

**If a `/gsd:*` command reports no phases, this is why.** GSD reads `.planning/phases/`; that
directory is now empty because every phase in it had shipped. Move a directory back if you
resume the roadmap — the tooling paths are unchanged, only the contents moved.

Current state is `.planning/NOW.md`. Readiness is `.planning/PRE-LAUNCH-CHECKLIST.md`.
