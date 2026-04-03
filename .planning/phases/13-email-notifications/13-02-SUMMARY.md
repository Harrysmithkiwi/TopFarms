---
phase: 13-email-notifications
plan: 02
subsystem: infra
tags: [resend, email, dns, spf, dkim, deliverability]

# Dependency graph
requires:
  - phase: 13-email-notifications
    provides: Resend API key and sending domain setup
provides:
  - SPF and DKIM DNS records verified on topfarms.co.nz for production email deliverability
affects: [email-notifications, transactional-email, production-launch]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SPF/DKIM verification: Resend dashboard shows Verified status before production sends"

key-files:
  created: []
  modified: []

key-decisions:
  - "DNS record configuration is a manual human-action gate — no code changes required"
  - "SPF merge required if existing SPF TXT record present (only one SPF record per domain)"

patterns-established:
  - "Pattern: Verify Resend domain SPF+DKIM before any transactional email goes to production"

requirements-completed: [MAIL-01]

# Metrics
duration: 5min (executor only — human action pending)
completed: 2026-04-03
---

# Phase 13 Plan 02: DNS Deliverability Configuration Summary

**SPF and DKIM DNS records for topfarms.co.nz configured in Resend — awaiting human action to add records at domain registrar and verify in Resend dashboard**

## Performance

- **Duration:** ~5 min (executor) + human DNS configuration time
- **Started:** 2026-04-03T05:16:06Z
- **Completed:** 2026-04-03T05:16:06Z (checkpoint reached)
- **Tasks:** 0/1 automated (1 human-action checkpoint)
- **Files modified:** 0

## Accomplishments

- Plan context loaded and DNS configuration steps documented for human action
- Checkpoint state returned with full step-by-step instructions
- No code changes required — this is a pure DNS/dashboard ops task

## Task Commits

No task commits — the single task is a human-action checkpoint requiring manual DNS configuration.

## Files Created/Modified

None — DNS record changes are made at the domain registrar, not in the codebase.

## Decisions Made

- None required — plan as specified covers all steps

## Deviations from Plan

None - plan executed exactly as written (checkpoint reached as expected).

## Issues Encountered

None — this plan is intentionally a human-action checkpoint with no automated steps.

## User Setup Required

**Manual DNS configuration required before this plan is complete.** Steps:

1. Log in to Resend Dashboard (https://resend.com/domains) and find the topfarms.co.nz domain
2. If domain not yet added: click "Add Domain" and enter topfarms.co.nz
3. Copy the SPF TXT record value and DKIM TXT record name/value from Resend
4. At domain registrar DNS management for topfarms.co.nz:
   - Add/merge SPF TXT record (only one SPF record per domain — merge if one exists)
   - Add DKIM TXT record(s) exactly as Resend specifies
5. Wait 15 min–72 hours for DNS propagation
6. Verify on MXToolbox: `txt:topfarms.co.nz` (SPF) and `txt:resend._domainkey.topfarms.co.nz` (DKIM)
7. Confirm "Verified" status in Resend Dashboard for both SPF and DKIM
8. Send a test email and confirm it arrives in Gmail inbox (not spam)
9. In Gmail "Show original" verify SPF=PASS and DKIM=PASS

**Test email curl command (once DNS propagated):**
```bash
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer YOUR_RESEND_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "TopFarms <noreply@topfarms.co.nz>",
    "to": ["your-gmail@gmail.com"],
    "subject": "TopFarms DNS Verification Test",
    "html": "<p>This is a test email to verify SPF/DKIM configuration.</p>"
  }'
```

## Next Phase Readiness

- Plan 13-03 (notify-job-filled Edge Function) can proceed in parallel — it does not depend on DNS verification
- MAIL-01 requirement complete once Resend shows "Verified" for both SPF and DKIM and test email lands in inbox

---
*Phase: 13-email-notifications*
*Completed: 2026-04-03*
