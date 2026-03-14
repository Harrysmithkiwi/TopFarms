# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-15)

**Core value:** Farm employers and seekers can find each other through agriculture-specific matching that no generic platform provides — shed type, accommodation, DairyNZ qualifications, and herd size experience
**Current focus:** Phase 1 — Foundation

## Current Position

Phase: 1 of 6 (Foundation)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-03-15 — Roadmap created, all 6 phases defined with 76 requirements mapped

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: none yet
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Research]: Contact fields must live in a separate `seeker_contacts` table — not in `seeker_profiles` — or any employer with SELECT on seeker_profiles can read contact data before paying the placement fee
- [Research]: User role must be stored in a `user_roles` table, not JWT metadata — JWT `raw_user_meta_data` is client-readable and not a reliable RLS signal
- [Research]: Tailwind v4 uses CSS-first config (`@theme` directive, no `tailwind.config.js`) — verify `@tailwindcss/vite` peer dep compatibility with Vite 8 on project init
- [Research]: Zod v4 + `@hookform/resolvers` v5 import paths changed — verify correct imports on first form implementation

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 4 setup]: Verify `pg_cron` vs Supabase scheduled functions availability in the project's Supabase plan tier before implementing the nightly batch recompute
- [Phase 5 setup]: Resend SPF/DKIM DNS configuration must be initiated before Phase 5 testing begins (24-48h DNS propagation lead time)
- [Phase 6 setup]: E2E testing framework choice (Playwright vs Cypress) needs a decision before Phase 6 begins

## Session Continuity

Last session: 2026-03-15
Stopped at: Roadmap created — 6 phases, 76 requirements mapped, ROADMAP.md and STATE.md written
Resume file: None
