# Dev Notes

Tooling, process, and environmental knowledge that's not a project requirement but is durable wisdom for future sessions.

## DEV-NOTE-01: Supabase MCP must be per-repo, not global

**Date:** 2026-04-28
**Severity:** High — cross-project contamination risk

**What happened:** During TopFarms Phase 14-01 UAT diagnostic, the Supabase MCP was pointed at the wrong project (Shaypa, an unrelated build). A diagnostic `LEFT JOIN public.user_roles` query failed with `relation "public.user_roles" does not exist`, surfacing the misconfiguration. `list_tables` confirmed the wrong-project tables: `board_orders`, `cad_files`, `repair_requests`, `xero_connections` — none of which are TopFarms.

**Risk that didn't materialise:** The next planned step was an `INSERT INTO public.user_roles ...` to unblock the seeker onboarding flow. Had it run against Shaypa's database, at best a column-mismatch no-op, at worst silent data corruption.

**Root cause:** A single global `~/.claude/mcp.json` (or equivalent) configured the supabase MCP with one project ref. When working in either repo (`~/dev/topfarms` or `~/dev/shaypa`), the MCP defaulted to whichever project was last configured — Shaypa won.

**Mitigation (locked):** Per-project `.mcp.json` in each repo root. Each repo's MCP config points at its own project ref with its own access token. Global config never references a project ref directly.

**Required setup per repo:**
- `.mcp.json` at repo root with the supabase MCP entry scoped to that project's ref
- Each project's access token generated separately from the Supabase dashboard for that org
- Verify: after starting a fresh Claude Code session in the repo, `list_tables` shows the expected tables for that project

**TopFarms project ref:** `inlagtgpynemhipnqvty` (URL: `https://inlagtgpynemhipnqvty.supabase.co`)

**Verification gate:** Before any write-side MCP call (apply_migration, deploy_edge_function, INSERT/UPDATE/DELETE via execute_sql), confirm `list_tables` shows TopFarms-domain tables (seeker_profiles, jobs, applications, etc.). If the list looks foreign, halt and re-check MCP config.
