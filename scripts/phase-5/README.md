# Phase 5 migration tooling — temporary

Delete this directory at Phase 5 exit. These are not gates (that is
`scripts/contrast.mjs`); they are the tools that make a 947-edit migration
reviewable. Committed because Phase 5 spans sessions and rebuilding them each
time is pure waste.

| Script | Use |
|---|---|
| `ledger.mjs` | Regenerates `docs/design/phase-5-ledger.md` — the work list, by surface |
| `migrate.mjs <file>` | Single-property inline colour styles → Tailwind utilities, merged into the enclosing tag className. **Reports what it cannot handle rather than dropping it.** Run on ONE file at a time and read the diff |
| `shot.mjs <label> <route...>` | Before/after screenshots at 1200 and 360 into the scratchpad. Stubs the Supabase REST `/jobs` response so `/jobs` and `/jobs/:id` render against an empty production marketplace — no seeding |

## Non-negotiable

`migrate.mjs` output is **not** trustworthy without reading the diff. During the
seeker sweep a companion perl one-liner stripped `borderColor` without adding the
replacement class; `tsc -b` and 609 tests were green with 11 spinners broken.
Gates did not catch it. Reading the diff did.

`shot.mjs` needs `npx vite preview --port 4173` running, and verify it serves
from the repo root (`lsof -p <pid> | awk '$4=="cwd"'`) — Phase 4 lost a
screenshot diff to two preview servers serving the same stale build.
