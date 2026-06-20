# Archive Manifest — 2026-06-20

Documentation audit & consolidation cull. All entries moved via `git mv` (history preserved,
fully reversible). **No files were deleted.** Canonical replacements live in `docs/_canonical/`.

To reverse any move: `git mv _archive/2026-06-20/<path> <original-path>`.

## Moved files

| Original path | Archived to | Reason |
|---|---|---|
| `MILESTONE_LAUNCH.md` | `_archive/2026-06-20/MILESTONE_LAUNCH.md` | April-2026 pre-build launch guide; superseded by live `.planning/REQUIREMENTS.md` + `ROADMAP.md`. Product is now v2.1 / post-launch. |
| `docs/design-system.md` | `_archive/2026-06-20/docs/design-system.md` | **Stale v1 brand** (soil/moss + Fraunces/DM Sans) sitting in the published `docs/` tree — a live trap. Superseded by `TopFarms_Brand_Spec_v2.md` + `DESIGN.md` (match `src/index.css`). SUPERSEDED banner added to the archived copy. |
| `TopFarms_Launch_Pack/` (whole dir, 15 files) | `_archive/2026-06-20/TopFarms_Launch_Pack/` | March-2026 pre-build deliverable package, wholesale superseded by shipped `src/` + live planning docs. See breakdown below. |

### `TopFarms_Launch_Pack/` breakdown
| File | Reason |
|---|---|
| `docs/TopFarms_PRD_v3.docx` | Pre-build origin spec; obsolete status. Superseded by `PRD.md` + live `REQUIREMENTS.md`. (Distinct from the divergent Drive `_v3.docx` — see Drive list.) |
| `docs/TopFarms_Data_Architecture.html` | Apify scraping pipeline diagram with dead tables (`raw_posts`/`parsed_jobs`). Live ingestion is Firecrawl + `lead_staging`/`leads`/`lead_suppression` (migrations 041–046). Misleading if trusted. |
| `docs/TopFarms_Revenue_Journey.html` | Static explainer centred on deferred in-app messaging; superseded design artifact. |
| `WIREFRAME_SPECS.md` | March as-built screen specs; captured by `WIREFRAME_SPECS_FULL.md` `[BUILT]` tags and superseded by shipped UI. |
| `WIREFRAME_SPECS_FULL.md` | March SPEC-target screen specs; superseded by shipped UI. |
| `wireframes/*.html` (9 files) | Static v1-brand mockups predating the React/Vite app; superseded by `src/`. (`_v2` suffix on Worker_Job_Search is vestigial — no v1 ever existed in-repo.) |

## Related edits (not moves)
- `.prettierignore`, `eslint.config.js` — added `_archive` to ignore globs so tooling skips archived content.
- `.planning/PROJECT.md` — updated two pointers (MILESTONE_LAUNCH authority; wireframes location) to reflect supersession + archive path.

## Not actioned here (out of band)
- **Google Drive** (no move/delete API available to the agent) — manual cull list provided to operator: collapse the two identical `TopFarms_PRD_v3.docx` copies; archive/delete the divergent Drive PRD, `Engineering_Spec_v1.docx`, `Rejuvenation_Guide.docx`, the three legacy GDocs, and the `Untitled document` orphan. Leave `Top Farms Employer Database old version` (owned by a third party).
- **Claude Project knowledge uploads** — re-upload only the `docs/_canonical/` set; remove stale uploads manually.
- **Left in place** (historical records, already tucked in `.planning/`): `TopFarms_Migration_Audit.md`, `PHASE-19-KNOWN-STATE.md`, `TOPFARMS-REPO-OVERVIEW.html`, `SENSE_CHECK_AUDIT_2026-05-01.md`, `AUDIT-AGENTIC-2026-06-10.md`.
