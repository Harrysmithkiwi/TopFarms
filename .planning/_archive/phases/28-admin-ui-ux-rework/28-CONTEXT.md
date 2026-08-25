# Phase 28 — Admin Dashboard UI/UX Rework (CONTEXT)

**Milestone:** v2.2 Lead Acquisition & Admin Ops · **Status:** SHIPPED — redesign shipped 2026-06-28 (PR #7); triage-power follow-up Phase 28b (T-1..T-5) shipped 2026-06-29 (HEAD cd8966a). Only P-9 (admin-login password toggle) remains open — see PUNCHLIST.md. (Originally: in progress 2026-06-28)

## Goal
Bring the admin surfaces — **Daily Briefing, Lead Staging, Outreach, Leads, admin login** — to a
cohesive, polished standard that **conforms to the existing v2 design system**, fixing
alignment / spacing / hierarchy / formatting and the specific card/display issues. **No drift to
generic SaaS** (the Executive Playbook explicitly warns against it).

## Scope (absorbs punch-list)
- **P-4** full UI/UX rework of the admin surfaces above.
- **P-5** display-name formatting (clean business/farm name, not raw listing headline).
- **P-8** surface the locality alongside region on cards/rows.
- **P-9** password show/hide (eye) toggle on the admin login.
- **P-10** show the matched term/locality on search-result rows.

## Out of scope
- **P-11** admin-door hardening (block admin via `/login`, 2FA) — future/optional.
- No new admin *features*; polish/consistency only.
- No data-model changes except what display needs. **P-5 may want an `emit_leads` prompt tweak →
  that is an Edge Fn redeploy = GATE 2** (isolate + surface).

## Design constraints (conform, don't reinvent)
- `frontend-design` skill for craft, **bound to** the v2 system:
  - Tokens: `src/index.css` `@theme` — one green `--color-brand #16A34A` (+ `--color-brand-hover
    #15803D`, `--color-brand-900 #0F3D22`, `--color-brand-50 #E8F5EC`); surfaces/borders/text
    tokens; semantic `--color-warn/danger/info/ai` + `-bg` pairs; **Inter** (`--font-display` =
    `--font-body`), JetBrains Mono for code.
  - `Brand_and_Design.md` v2: tinted neutrals, **4-pt grid** spacing, **8 / 12 / 16** radii, pill
    chips, WCAG AA, 44×44 touch targets.
- **Reuse existing primitives** — `AdminTable`, `AdminLayout`, `Card`, `Tag`, `StatsStrip`,
  `Pagination`, `LeadContact`, `Input`, `Button`, lucide-react icons. Do not hand-roll what a
  primitive already does.
- **Daily Briefing is the in-house reference** for the cohesive pattern (h1 + uppercase section
  labels + Card + Tag + disciplined type scale). Bring the lead surfaces up to it.

## Run model (operator-approved)
Autonomous execution with **two gates**:
- **GATE 1 (taste):** after the design audit (`28-AUDIT.md`), STOP and present audit + proposed
  direction. One approval, then run. *(← we are here)*
- **GATE 2 (safety/irreversible):** STOP before anything touching prod or that the agent can't do —
  DB migration (Studio), merge to main, prod deploy. Operator actions; agent continues.
- Between/around: full autonomy — build, refactor, typecheck, verify on Vercel preview, iterate.

## GATE 1 — APPROVED 2026-06-28 (operator)
Audit + direction approved. Three calls:
1. **Detail pattern → `ProfileDrawer`.** Replace the inline `border-2` green panels on the lead
   pages with the established right-side `ProfileDrawer` (unify with Employer/Seeker/Jobs).
2. **Capture → demoted but ONE prominent click away.** Queue is primary; capture moves behind a
   single obvious **"Capture / Paste post" button** (NOT buried in a menu). Pasting FB posts is the
   most frequent go-to-market action — it must stay fast to reach.
3. **Scope → Lead Staging + Outreach ONLY this run.** Daily Briefing + Leads (and **P-9** admin-login
   password toggle, a separate surface) **deferred** to a follow-up extension after these two land
   well. (First autonomous run — contained scope, then extend.)

Everything else per the audit's proposed direction: Daily-Briefing visual language, `Tag` badges
(fix the `warn` overload), `lucide-react` icons (replace emoji/glyphs), `px-4` alignment, standard
section labels + type scale, unified `ProfileDrawer` detail. **This run lands P-4 (scoped to Staging
+ Outreach), P-5, P-8, P-10.** Deferred: P-9 + Daily Briefing + Leads.

## Success criteria
- Audit issues resolved against v2 tokens; **ADMINUX-01..04** satisfied (P-5/8/9/10 implemented +
  preview-verified); no design-system drift; no generic-SaaS patterns; admin-only (no public
  impact); `tsc` clean.
