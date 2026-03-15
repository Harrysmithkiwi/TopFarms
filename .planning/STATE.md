# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-15)

**Core value:** Farm employers and seekers can find each other through agriculture-specific matching that no generic platform provides — shed type, accommodation, DairyNZ qualifications, and herd size experience
**Current focus:** Phase 1 — Foundation

## Current Position

Phase: 1 of 6 (Foundation)
Plan: 2 of 4 in current phase
Status: In progress
Last activity: 2026-03-15 — Plan 01-02 complete: 10 design system UI components with Radix UI primitives and TopFarms Tailwind v4 theme

Progress: [██░░░░░░░░] 8%

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: 3.5 min
- Total execution time: 0.1 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 2 | 7 min | 3.5 min |

**Recent Trend:**
- Last 5 plans: 01-01 (5 min), 01-02 (2 min)
- Trend: Faster

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [01-01]: @tailwindcss/vite used for Tailwind v4 — CSS-first @theme directive, no tailwind.config.js
- [01-01]: seeker_contacts is a SEPARATE table from seeker_profiles — contact masking architecture enforced at schema level
- [01-01]: user_roles table is authoritative role source for RLS — get_user_role() security definer prevents recursion
- [01-01]: handle_new_user() trigger creates user_roles row atomically with auth.users insert, defaulting to 'seeker'
- [01-01]: tailwind-merge@3 required — v2 incompatible with Tailwind v4 CSS variable classes
- [01-01]: react-router@7 unified package used (not react-router-dom)
- [Research]: Zod v4 + `@hookform/resolvers` v5 import paths changed — verify correct imports on first form implementation
- [01-02]: Input uses forwardRef for react-hook-form register() compatibility in future form implementations
- [01-02]: Checkbox onCheckedChange normalises Radix boolean | 'indeterminate' to plain boolean for simpler consumer API
- [01-02]: Select uses position=popper with sideOffset=4 for proper dropdown positioning relative to trigger
- [01-02]: data-[state=checked] Radix attribute selectors used directly in Tailwind class strings for stateful styling

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 4 setup]: Verify `pg_cron` vs Supabase scheduled functions availability in the project's Supabase plan tier before implementing the nightly batch recompute
- [Phase 5 setup]: Resend SPF/DKIM DNS configuration must be initiated before Phase 5 testing begins (24-48h DNS propagation lead time)
- [Phase 6 setup]: E2E testing framework choice (Playwright vs Cypress) needs a decision before Phase 6 begins

## Session Continuity

Last session: 2026-03-15
Stopped at: Completed 01-02-PLAN.md — 10 design system UI components (Button, Card, Tag, MatchCircle, InfoBox, ProgressBar, Input, Toggle, Checkbox, Select)
Resume file: None
