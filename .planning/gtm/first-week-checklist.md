# TopFarms GTM — First-Week Setup Checklist

*2026-07-02 · Ordered steps to stand this up. **[I do]** = Harry, manually (accounts, OAuth consent, running commands). **[Claude via MCP]** = Claude does it once the connection is live. Per guardrails: Claude proposes every command; Harry runs it. Nothing is connected/installed until Harry says go.*

## Phase 0 — Accounts + connections (Harry)

1. **[I do]** Create/confirm an **Asana** account (free tier is fine). 
2. **[I do]** Asana developer console → create an **MCP app** → copy `client_id` + `client_secret`; set redirect URI `http://localhost:8080/callback`. (V2 needs a pre-registered app; no PAT, no auto-registration.)
3. **[I do]** Confirm a **Linear** account + workspace.
4. **[I do]** Run the MCP add commands (from `tooling-decision.md`):
   ```bash
   claude mcp add --transport http linear-server https://mcp.linear.app/mcp
   claude mcp add --transport http --client-id <ASANA_CLIENT_ID> --client-secret --callback-port 8080 asana https://mcp.asana.com/v2/mcp
   claude mcp login asana
   ```
   Then `claude mcp list` to confirm both are green. (Supabase is already connected.)
5. **[I do]** **Stripe MCP** — ask Claude to confirm the *current* official `claude mcp add` command first (do not use a guessed one), then run it. Gmail MCP is deferred (lowest priority).

## Phase 1 — Boards (Claude, once connected)

6. **[Claude via MCP]** Create Asana project **"Employer Pipeline"** with sections = the 7 funnel stages and the **14 custom fields** (`system-architecture.md`).
7. **[Claude via MCP]** Create Asana projects **"Content Calendar"** (4 theme sections), **"Partnerships"** (escalation-ladder sections), **"Founder Cadence"** (recurring weekly tasks from `weekly-operating-rhythm.md`).
8. **[Claude via MCP]** Create Linear team **"TopFarms Eng"**; add the three quality gates as issues (`tsc -b` errors, no frontend CI, bundle size); labels `quality-gate` / `bug` / `feature`.

## Phase 2 — Load the funnel (Harry + Claude)

9. **[I do]** Build the first **50 rows** of the 200-employer target list (Playbook week-1 goal), dairy-first, Tier A identified. Paste into Supabase (existing lead capture) or a sheet Claude can read.
10. **[Claude via MCP]** Promote the first worked Tier-A leads from Supabase into Asana "Employer Pipeline" cards (one-way Supabase → Asana), populating the 14 fields.
11. **[Claude via MCP]** Load the **first 10 templates** as reusable Asana task descriptions / a snippets doc: employer FB (cold + 3 follow-ups + breakup), employer email 4-touch, seeker FB (cold + follow-up) — from `outreach-templates.md`.

## Phase 3 — Skills (Harry)

12. **[I do]** Confirm the 5 Corey skills are installed; point them at `TopFarms_Outreach_Reply_Config.md` + the word-lists.
13. **[I do]** Copy `create-html-carousel`'s `SKILL.md` from GitHub (not the CLI), fork as `topfarms-carousel`, bind to `Brand_and_Design.md`. Strip US spelling + banned words.

## Phase 4 — First real motion (Harry, in the non-milking windows)

14. **[I do]** Pin the "free profile, workers never pay" post in the owned FB group (seeker engine).
15. **[I do]** First cold-call session (Tier A) + first ~10 employer touches. Log via Claude into Asana.
16. **[I do]** Start the FB-DM baseline capture (DMs sent / replies / signups per day) for the first two weeks — this sets your real DM thresholds (`metrics-dashboard.md`).
17. **[Claude via MCP]** Friday: pull the weekly review numbers (Supabase + Asana + Stripe).

## Guardrail reminders

- Placeholders only for `client_id`/secret/keys — never commit real values. Asana secret lives in the OS keychain, not `.mcp.json`.
- No named testimonials until per-name consent is logged (`outreach-templates.md`).
- FB DMs: ~20–40/day cap, ramp from ~10–15 in week 1, non-milking windows, plain-text cold first touch (no link).
