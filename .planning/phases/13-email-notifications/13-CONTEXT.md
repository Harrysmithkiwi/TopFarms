# Phase 13: Email & Notifications - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Production email deliverability via SPF/DKIM DNS configuration for the Resend sending domain, and an auto-ghosting prevention email that notifies applicants when a job they applied to is marked as filled. No new email types beyond the filled notification. No changes to existing Day 7/14 follow-up emails.

</domain>

<decisions>
## Implementation Decisions

### Ghosting notification trigger
- Database trigger on `jobs.status` changing to `'filled'` invokes a NEW Edge Function (not the existing `send-followup-emails`)
- Separation of concerns: `send-followup-emails` is cron-driven for Day 7/14 follow-ups; the filled notification is event-driven
- This ensures notifications fire regardless of how the job status changes (MarkFilledModal, admin action, future automation)

### Notification email content
- Empathetic + forward-looking tone: acknowledge the position is filled, encourage continued job search
- Include job title and farm name in the email so seekers know which application this refers to
- CTA button links to job search page (not application dashboard) — forward-looking, not backward-looking
- Use existing `emailWrapper()` and `ctaButton()` HTML template pattern from `send-followup-emails`

### Recipient filtering
- Edge Function queries `applications` table for the filled job, filtering to unresolved statuses: `applied`, `reviewed`, `interview`, `shortlisted`
- Terminal statuses (`hired`, `declined`, `withdrawn`) are excluded — those applicants already have closure
- The applicant marked as `hired` in MarkFilledModal (if any) does NOT receive the ghosting email — they already know the outcome
- Seeker email fetched from `seeker_contacts` table using service role (same pattern as `send-followup-emails`)

### SPF/DKIM configuration
- Documentation + verification task — no code changes required
- Steps: add SPF and DKIM DNS records from Resend dashboard to domain registrar, verify in Resend dashboard
- Plan should include verification acceptance criteria (Resend shows "Verified" status)
- Test email to Gmail/Outlook must land in inbox, not spam

### Claude's Discretion
- Exact email subject line wording
- Database trigger implementation details (pg_notify vs direct HTTP call vs Supabase webhook)
- Edge Function naming convention
- Error handling and retry strategy for failed email sends
- Whether to log notification sends in a table for audit trail

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Email infrastructure
- `supabase/functions/send-followup-emails/index.ts` — Existing email Edge Function with `sendEmail()`, `emailWrapper()`, `ctaButton()` helpers, Resend integration pattern, seeker email lookup via `seeker_contacts`
- `supabase/functions/create-placement-invoice/index.ts` — Another Edge Function example for Resend integration patterns

### Job filled flow
- `src/pages/jobs/MarkFilledModal.tsx` — Current "mark as filled" UI; updates `jobs.status` to `'filled'` and optionally marks an applicant as `'hired'`
- `src/types/domain.ts` — Application status types and job status types

### Requirements
- `.planning/REQUIREMENTS.md` — MAIL-01 (SPF/DKIM), MAIL-02 (auto-ghosting notification)

### Project context
- `MILESTONE_LAUNCH.md` — Authoritative launch guide, all gaps assessed against it

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `sendEmail()` helper in `send-followup-emails/index.ts`: Resend API call with error handling — extract to shared utility or duplicate pattern
- `emailWrapper()`: TopFarms-branded HTML email template with cream background, white card, soil-green branding
- `ctaButton()`: Styled CTA button for emails matching TopFarms design system
- `processFollowup()` pattern: Fetches employer/seeker profiles, handles missing data gracefully

### Established Patterns
- Edge Functions use `@supabase/supabase-js` with service role key (bypasses RLS)
- Seeker emails fetched from `seeker_contacts` table (not auth.users) via service role
- Employer emails fetched via `supabase.auth.admin.getUserById()`
- Email sent via plain `fetch()` to Resend API (no SDK) — consistent across all Edge Functions
- CORS headers pattern consistent across all Edge Functions

### Integration Points
- `MarkFilledModal.handleConfirm()` updates `jobs.status` to `'filled'` — database trigger fires here
- `applications` table has `status` column with values: applied, reviewed, interview, shortlisted, hired, declined, withdrawn
- `seeker_contacts` table for seeker email lookup
- `employer_profiles` for farm name, `jobs` for job title

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches within the decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 13-email-notifications*
*Context gathered: 2026-04-03*
