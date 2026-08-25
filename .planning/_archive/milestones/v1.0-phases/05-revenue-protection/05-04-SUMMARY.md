---
phase: 05-revenue-protection
plan: "04"
subsystem: api
tags: [resend, email, edge-functions, deno, pg-cron, placement-fees]

# Dependency graph
requires:
  - phase: 05-01
    provides: placement_fees table with followup_7d_due/followup_14d_due/followup_7d_sent/followup_14d_sent columns and pg_cron flag job
provides:
  - send-followup-emails Deno Edge Function that drains pg_cron-flagged follow-up rows by sending Day 7 / Day 14 emails via Resend
  - Employer Day 7 email ("How's it going with...") and Day 14 email ("Just checking in...")
  - Seeker Day 7 email ("You were shortlisted by...") and Day 14 email ("Any updates on...")
  - confirmed_at null guard that stops emails once hire is confirmed
affects: [05-03, testing]

# Tech tracking
tech-stack:
  added: [Resend REST API (fetch-based, no SDK)]
  patterns: [pg-cron flag consumer pattern — pg_cron sets due=true, Edge Function consumes flag and sets sent=true]

key-files:
  created:
    - supabase/functions/send-followup-emails/index.ts
  modified: []

key-decisions:
  - "Resend called via plain fetch() (not React Email / Resend SDK) — consistent with RESEARCH.md spec and avoids Deno SDK compatibility concerns"
  - "hire notification email deferred to create-placement-invoice Edge Function (Plan 03) for immediate delivery on hire confirmation — this function handles scheduled Day 7/14 only"
  - "emailSent flag: if at least one of employer or seeker email sends successfully, the row is marked sent — prevents re-sending to the delivered recipient if one side is missing an address"
  - "Seeker name displayed as 'Seeker from {region}' to preserve anonymity in employer-facing emails — real name not stored on seeker_profiles"

patterns-established:
  - "pg-cron flag consumer: Edge Function queries due=true AND sent=false AND confirmed_at IS NULL, sends email, then sets sent=true and due=false in a single update"
  - "Admin email lookup: supabaseClient.auth.admin.getUserById(user_id) for employer email from auth.users; seeker_contacts table for seeker email"
  - "Email HTML: emailWrapper() provides cream/white layout shell; body functions return inner HTML; ctaButton() produces moss-colored CTA anchor"

requirements-completed: [REVN-04]

# Metrics
duration: 5min
completed: 2026-03-17
---

# Phase 05 Plan 04: send-followup-emails Edge Function Summary

**Deno Edge Function querying placement_fees for pg_cron-set Day 7/14 flags, sending employer + seeker follow-up emails via Resend REST API with UI-SPEC-compliant HTML templates**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-17T08:15:00Z
- **Completed:** 2026-03-17T08:20:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created `send-followup-emails` Edge Function that queries `placement_fees` for rows flagged by pg_cron (`followup_7d_due = true`, `followup_14d_due = true`)
- Sends 4 email variants (employer Day 7, employer Day 14, seeker Day 7, seeker Day 14) via Resend REST API with confirmed subject lines from copywriting contract
- Marks rows as sent and clears due flag atomically after delivery; `confirmed_at IS NULL` guard prevents emails after hire confirmed
- HTML email templates follow UI-SPEC design tokens: `#F7F2E8` cream background, `#FFFFFF` card, `#2D5016` moss CTA button, DM Sans typography

## Task Commits

1. **Task 1: send-followup-emails Edge Function** - `5ef6556` (feat)

**Plan metadata:** (docs commit — in progress)

## Files Created/Modified
- `supabase/functions/send-followup-emails/index.ts` - Edge Function: queries due follow-ups, sends Day 7/14 emails to employer + seeker via Resend, marks sent

## Decisions Made
- Resend called via plain `fetch()` matching the RESEARCH.md REST API pattern — no SDK dependency
- Hire notification email belongs in `create-placement-invoice` (Plan 03) for immediate delivery on hire confirmation; this function handles only scheduled follow-ups
- `emailSent = atLeastOneSent` logic: if employer or seeker email delivers, the row is marked sent to prevent duplicate sends
- Seeker name shown as "Seeker from {region}" in employer-facing emails to match existing anonymity pattern before shortlisting

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration.**

- `RESEND_API_KEY` — Resend Dashboard → API Keys → Create API Key
- `RESEND_FROM_EMAIL` — set to `TopFarms <noreply@topfarms.co.nz>` after domain verification
- `APP_URL` — set to `https://topfarms.co.nz` in production
- Domain verification: Resend Dashboard → Domains → Add Domain → verify `topfarms.co.nz` with SPF/DKIM DNS records (24-48h propagation)

## Next Phase Readiness

- Follow-up email system complete: pg_cron (Plan 01) sets daily flags at 08:00 UTC, this Edge Function drains the queue
- Resend DNS setup (SPF/DKIM) must be completed before Phase 5 testing can validate email delivery end-to-end
- Phase 5 remaining: Plan 05 (idempotency hardening) and Plan 06 (integration testing)

---
*Phase: 05-revenue-protection*
*Completed: 2026-03-17*
