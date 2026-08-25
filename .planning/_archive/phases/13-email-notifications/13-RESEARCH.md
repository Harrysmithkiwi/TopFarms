# Phase 13: Email & Notifications - Research

**Researched:** 2026-04-02
**Domain:** Supabase Database Webhooks, Resend email deliverability, Edge Functions
**Confidence:** HIGH

## Summary

Phase 13 has two independent workstreams: (1) DNS deliverability configuration for Resend (MAIL-01) — a documentation/ops task with no code changes — and (2) an event-driven Edge Function that notifies applicants when a job is marked filled (MAIL-02). Both workstreams are self-contained and can be planned as separate waves.

The notification system is built entirely on existing project patterns: Supabase Database Webhooks (pg_net) to trigger a new Edge Function, the `sendEmail()`/`emailWrapper()`/`ctaButton()` helpers from `send-followup-emails`, and seeker email lookup from `seeker_contacts`. No new libraries are needed.

A critical race condition exists in `MarkFilledModal`: it currently updates `jobs.status = 'filled'` BEFORE updating `applications.status = 'hired'`. The database webhook fires after the job update commits, and the Edge Function queries applications at that point — meaning the hired applicant may not yet be marked hired, causing them to receive the ghosting email. The fix is to reorder `MarkFilledModal.handleConfirm()` to mark the hired applicant first, then update the job status. This is a required code change.

**Primary recommendation:** Use Supabase Database Webhooks (not pg_notify, not a direct call from MarkFilledModal) to invoke the new `notify-job-filled` Edge Function. Implement application status filter guard in the Edge Function using `old_record`/`record` diff. Fix the MarkFilledModal ordering before implementing.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Ghosting notification trigger:** Database trigger on `jobs.status` changing to `'filled'` invokes a NEW Edge Function (not the existing `send-followup-emails`). Separation of concerns: `send-followup-emails` is cron-driven for Day 7/14 follow-ups; the filled notification is event-driven. This ensures notifications fire regardless of how the job status changes.
- **Notification email content:** Empathetic + forward-looking tone. Include job title and farm name. CTA button links to job search page (not application dashboard). Use existing `emailWrapper()` and `ctaButton()` HTML template pattern from `send-followup-emails`.
- **Recipient filtering:** Edge Function queries `applications` table for the filled job, filtering to unresolved statuses: `applied`, `reviewed`, `interview`, `shortlisted`. Terminal statuses (`hired`, `declined`, `withdrawn`) excluded. Seeker email fetched from `seeker_contacts` table using service role.
- **SPF/DKIM configuration:** Documentation + verification task — no code changes required. Steps: add SPF and DKIM DNS records from Resend dashboard to domain registrar, verify in Resend dashboard. Plan must include verification acceptance criteria (Resend shows "Verified" status). Test email to Gmail/Outlook must land in inbox, not spam.

### Claude's Discretion

- Exact email subject line wording
- Database trigger implementation details (pg_notify vs direct HTTP call vs Supabase webhook)
- Edge Function naming convention
- Error handling and retry strategy for failed email sends
- Whether to log notification sends in a table for audit trail

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MAIL-01 | Resend sending domain has SPF and DKIM DNS records configured and verified for production email delivery | Resend dashboard provides exact TXT record names/values per domain; verification shown as "Verified" in dashboard; propagation up to 72 hours |
| MAIL-02 | When employer marks a job as filled, all applicants with unresolved status receive automated notification email | Supabase Database Webhooks on `jobs` UPDATE + new Edge Function + existing email helpers; race condition fix required in MarkFilledModal |

</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase Database Webhooks (pg_net) | Built-in | Trigger Edge Function on DB row change | Project already uses pg_cron/Supabase patterns; event-driven without polling |
| Resend API (plain fetch) | REST API | Send transactional email | Established project pattern — all Edge Functions use plain fetch to Resend |
| `@supabase/supabase-js` | v2 (esm.sh) | Service role DB access in Edge Function | Established project pattern |

### No New Libraries
The phase requires no new dependencies. All building blocks exist in the project.

### Environment Variables (already present)
- `RESEND_API_KEY` — Resend API key (used in `send-followup-emails`)
- `RESEND_FROM_EMAIL` — From address, defaults to `TopFarms <noreply@topfarms.co.nz>`
- `APP_URL` — Site URL for CTA links
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Service role access

---

## Architecture Patterns

### Recommended Structure

```
supabase/
├── functions/
│   ├── send-followup-emails/     # Existing — cron-driven Day 7/14
│   └── notify-job-filled/        # NEW — event-driven on jobs.status = 'filled'
│       └── index.ts
└── migrations/
    └── 017_notify_job_filled_webhook.sql  # NEW — pg_net extension + DB webhook trigger
src/
└── pages/jobs/
    └── MarkFilledModal.tsx        # MODIFY — reorder hired-applicant update before job update
```

### Pattern 1: Supabase Database Webhook → Edge Function

**What:** A PostgreSQL trigger using `supabase_functions.http_request()` fires an async HTTP POST to the Edge Function URL after a row UPDATE is committed. This is the "Database Webhooks" feature in Supabase — a managed wrapper around `pg_net`.

**When to use:** Any event-driven action triggered by a DB state change, where the trigger must fire regardless of which client caused the change.

**Migration SQL:**
```sql
-- Migration 017: pg_net extension + database webhook for notify-job-filled
-- Requires: pg_net (Supabase Database Webhooks built on pg_net)

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger function: fires after jobs.status changes
CREATE OR REPLACE FUNCTION notify_job_filled()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only fire when status transitions TO 'filled'
  IF OLD.status IS DISTINCT FROM 'filled' AND NEW.status = 'filled' THEN
    PERFORM supabase_functions.http_request(
      current_setting('app.settings.service_role_key', true),  -- or use SUPABASE_SERVICE_ROLE_KEY secret
      url := (current_setting('app.settings.supabase_url', true) || '/functions/v1/notify-job-filled'),
      method := 'POST',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := row_to_json(NEW)::text,
      timeout_ms := 5000
    );
  END IF;
  RETURN NEW;
END;
$$;
```

**Simpler alternative — use the Supabase Dashboard webhook UI:**

The Supabase Dashboard (Database → Webhooks) provides a click-through UI to create a webhook on `jobs` UPDATE that calls a selected Edge Function. It handles the URL, Authorization header (ANON key), and pg_net setup automatically. **This is the recommended approach** — it does not require custom SQL for the trigger function, and the project has no existing SQL webhook pattern to follow.

**Dashboard webhook configuration:**
- Table: `jobs`
- Event: `UPDATE`
- Edge Function: `notify-job-filled`
- The webhook sends the full payload including `old_record` and `record`

**Edge Function guard (REQUIRED):**
The webhook fires on ALL updates to `jobs`, not just status changes. The Edge Function must guard:
```typescript
// Source: Supabase webhook payload spec
if (payload.old_record?.status === 'filled' || payload.record?.status !== 'filled') {
  return new Response(JSON.stringify({ skipped: true }), { status: 200 })
}
```

### Pattern 2: Recipient Query in Edge Function

**What:** Query `applications` table for all applicants on the filled job with unresolved status, then loop and send emails.

**Key implementation detail — correct status values:**
The CONTEXT.md mentions "applied, reviewed, interview, shortlisted" but `src/types/domain.ts` uses:
- Unresolved: `applied`, `review` (NOT `reviewed`), `interview`, `shortlisted`, `offered`
- Terminal: `hired`, `declined`, `withdrawn`

The Edge Function filter must use the values from `domain.ts`, not the informal names in CONTEXT.md. Specifically: `review` not `reviewed`, and `offered` should be included as an unresolved status (the applicant has an offer pending but the position is being filled by someone else).

**Recipient query:**
```typescript
const UNRESOLVED_STATUSES = ['applied', 'review', 'interview', 'shortlisted', 'offered']

const { data: applications } = await supabaseClient
  .from('applications')
  .select('id, seeker_id, status')
  .eq('job_id', filledJobId)
  .in('status', UNRESOLVED_STATUSES)
```

### Pattern 3: Seeker Email Lookup

Established pattern from `send-followup-emails` — fetch from `seeker_contacts` table using service role:

```typescript
// Source: supabase/functions/send-followup-emails/index.ts
const { data: seekerContact } = await supabaseClient
  .from('seeker_contacts')
  .select('email')
  .eq('user_id', seekerUserId)
  .maybeSingle()
const seekerEmail = seekerContact?.email
```

Seeker's `user_id` comes from `seeker_profiles` table — need to join or do two queries.

### Pattern 4: Email HTML Templates

Reuse existing helpers exactly as-is from `send-followup-emails`:

```typescript
// emailWrapper(content): full branded HTML email shell (cream background, white card, soil-green brand)
// ctaButton(href, label): green CTA button matching design system
```

Job title and farm name for the filled notification email:
- `jobs.title` — query by `job_id` from webhook payload
- `employer_profiles.farm_name` — query by `jobs.employer_id`

### Anti-Patterns to Avoid

- **Modifying `send-followup-emails`:** Keep the cron-driven function separate. The filled notification is event-driven.
- **Calling the Edge Function from MarkFilledModal frontend:** Creates a dependency on UI flow. Webhook approach fires regardless of client.
- **Using `reviewed` as status value:** The domain type uses `review` — using the wrong string silently excludes applicants.
- **Not including `offered` status:** Applicants with `offered` status have not accepted/declined — they need notification too.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Event-triggered HTTP call on DB change | Custom pg_notify + listener | Supabase Database Webhooks (Dashboard UI) | Built-in, managed, no custom plumbing |
| Email HTML templates | New template system | Existing `emailWrapper()` + `ctaButton()` | Already branded, tested in production |
| Supabase service role client | Custom auth | `createClient(SUPABASE_URL, SERVICE_ROLE_KEY)` | Established pattern across all Edge Functions |
| Seeker email lookup | Query `auth.users` directly | `seeker_contacts` table via service role | Established pattern — auth.users not exposed via regular queries |

---

## Common Pitfalls

### Pitfall 1: Race Condition — MarkFilledModal Update Order (CRITICAL)

**What goes wrong:** `MarkFilledModal.handleConfirm()` currently runs in this order:
1. `UPDATE jobs SET status = 'filled'` → database webhook fires HERE (async, after commit)
2. `UPDATE applications SET status = 'hired'` → runs AFTER job update

The Edge Function queries `applications` immediately after receiving the webhook. At that point, the hired applicant may still have status `shortlisted` (or whatever), so they receive the ghosting email despite being hired.

**Why it happens:** Two sequential Supabase calls with no transaction boundary. The webhook fires after step 1, before step 2 completes.

**How to avoid:** Reorder `MarkFilledModal.handleConfirm()`:
1. If `selectedApplicantId` is set: `UPDATE applications SET status = 'hired'` FIRST
2. Then: `UPDATE jobs SET status = 'filled'` → webhook fires

The hired applicant is now in terminal status before the webhook fires.

**Warning signs:** In testing, the hired applicant receives the filled notification.

### Pitfall 2: Wrong Status Values in Filter

**What goes wrong:** CONTEXT.md informally says "reviewed" but `domain.ts` defines `review`. Using `reviewed` in the `.in('status', [...])` query silently excludes `review` applicants.

**How to avoid:** Import or inline the actual values from `domain.ts` (or hardcode them matching `domain.ts` exactly): `['applied', 'review', 'interview', 'shortlisted', 'offered']`.

### Pitfall 3: Webhook Fires on All `jobs` UPDATE Events

**What goes wrong:** The webhook fires every time any field on `jobs` is updated (title, description, region, etc.) — not just status changes. Without an early-return guard, the Edge Function queries and iterates applicants for every job edit.

**How to avoid:** Guard at the top of the Edge Function handler:
```typescript
const payload = await req.json()
if (payload.old_record?.status === 'filled' || payload.record?.status !== 'filled') {
  return new Response(JSON.stringify({ skipped: true }), { status: 200 })
}
```

### Pitfall 4: Resend DNS Propagation Delay

**What goes wrong:** DNS TXT records can take up to 72 hours to propagate. Verifying too soon shows "unverified" even after correct records are added.

**How to avoid:** Add records, wait at least 15-30 minutes before checking. Resend dashboard shows individual SPF and DKIM verification status. Use an external DNS checker (e.g., MXToolbox) to confirm records are visible before expecting Resend to see them.

### Pitfall 5: seeker_profiles join required for user_id

**What goes wrong:** `applications` table has `seeker_id` (the `seeker_profiles.id`), not `user_id`. The `seeker_contacts` table is keyed by `user_id`. Need to join through `seeker_profiles` to get `user_id`.

**How to avoid:** Query `seeker_profiles.user_id` for each seeker before looking up `seeker_contacts.email`. Pattern: one query per applicant, or a join.

---

## Code Examples

### Webhook Early-Return Guard

```typescript
// Source: Supabase Database Webhook payload format
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const payload = await req.json()

  // Guard: only process when status transitions to 'filled'
  if (payload.type !== 'UPDATE' ||
      payload.old_record?.status === 'filled' ||
      payload.record?.status !== 'filled') {
    return new Response(JSON.stringify({ skipped: true }), { status: 200, headers: corsHeaders })
  }

  const filledJobId = payload.record.id
  // ... proceed with notification logic
})
```

### Recipient Query with Correct Statuses

```typescript
// Source: domain.ts ApplicationStatus + ACTIVE_STATUSES
const NOTIFY_STATUSES = ['applied', 'review', 'interview', 'shortlisted', 'offered']

const { data: applications, error } = await supabaseClient
  .from('applications')
  .select('id, seeker_id')
  .eq('job_id', filledJobId)
  .in('status', NOTIFY_STATUSES)
```

### Seeker Email Lookup (with user_id join)

```typescript
// Source: send-followup-emails/index.ts pattern
// Step 1: get seeker user_id from seeker_profiles
const { data: seekerProfile } = await supabaseClient
  .from('seeker_profiles')
  .select('user_id')
  .eq('id', application.seeker_id)
  .single()

// Step 2: get email from seeker_contacts
const { data: seekerContact } = await supabaseClient
  .from('seeker_contacts')
  .select('email')
  .eq('user_id', seekerProfile.user_id)
  .maybeSingle()

const seekerEmail = seekerContact?.email
```

### Filled Notification Email Body

```typescript
// Empathetic + forward-looking tone per CONTEXT.md
function jobFilledNotificationBody(seekerName: string, jobTitle: string, farmName: string): string {
  const jobSearchLink = `${APP_URL}/jobs`
  return `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1A1208;line-height:1.2;">
      ${farmName} has filled their ${jobTitle} position
    </h2>
    <p style="margin:0 0 16px;font-size:14px;color:#1A1208;line-height:1.5;">Hi ${seekerName},</p>
    <p style="margin:0 0 16px;font-size:14px;color:#1A1208;line-height:1.5;">
      We wanted to let you know that <strong>${farmName}</strong> has filled their 
      <strong>${jobTitle}</strong> position.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#6B5D4A;line-height:1.5;">
      Don't be discouraged — there are plenty of great farm roles still available. 
      Keep your profile up to date and explore what's open right now.
    </p>
    <p style="margin:0 0 0;">
      ${ctaButton(jobSearchLink, 'Browse Open Roles')}
    </p>
  `
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling/cron for event-driven emails | Database Webhooks (pg_net) | Supabase stable feature | Immediate notification, no polling lag |
| Custom trigger SQL | Dashboard webhook UI | Supabase feature maturation | No SQL needed for webhook setup |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected (no test config files found) |
| Config file | None — see Wave 0 |
| Quick run command | Manual: deploy Edge Function + send test webhook payload |
| Full suite command | Manual: end-to-end test via MarkFilledModal in staging |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MAIL-01 | Resend domain shows "Verified" in dashboard | Manual verification | Check Resend dashboard | ❌ Manual only — DNS state |
| MAIL-01 | Test email from topfarms.co.nz lands in inbox (not spam) | Manual verification | Send test email via Resend dashboard or API | ❌ Manual only |
| MAIL-02 | Edge Function returns 200 with `skipped: true` for non-status changes | Unit/smoke | `curl` POST with non-filled payload | ❌ Wave 0 |
| MAIL-02 | Edge Function sends emails to all unresolved applicants when job filled | Integration | `curl` POST with filled payload to staging function | ❌ Wave 0 |
| MAIL-02 | Hired/declined/withdrawn applicants do NOT receive email | Integration | Verify via Resend activity log | ❌ Wave 0 |
| MAIL-02 | Race condition fix: hired applicant not emailed | Integration | Confirm via MarkFilledModal test in staging | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** Manual test of changed function with curl payload
- **Per wave merge:** End-to-end in staging (use MarkFilledModal on a job with known test applicants)
- **Phase gate:** Resend dashboard "Verified" + inbox delivery test + end-to-end notification test

### Wave 0 Gaps

- [ ] No automated test infrastructure exists for Edge Functions in this project — acceptance tests are manual
- [ ] Test plan: create test jobs with applicants in varied statuses in staging environment before executing

*(Note: project has no test framework. All validation is manual smoke + staging. This is consistent with existing Edge Functions.)*

---

## Open Questions

1. **Should `offered` status be included in notification recipients?**
   - What we know: `domain.ts` lists `offered` as an `ACTIVE_STATUS` (non-terminal). An applicant with `offered` status has received an offer but not yet accepted/declined.
   - What's unclear: CONTEXT.md says "applied, reviewed, interview, shortlisted" without mentioning `offered`. However, `offered` applicants also have unresolved status.
   - Recommendation: Include `offered` — they have a pending offer that is now moot. The planner should confirm this decision.

2. **seeker_profiles.region as display name fallback**
   - What we know: `send-followup-emails` uses `seeker.region` as a display name fallback: `const seekerName = seeker.region ? 'Seeker from ${seeker.region}' : 'Your shortlisted candidate'`
   - What's unclear: `seeker_profiles` may have a first name field — check schema for a better display name.
   - Recommendation: Use same fallback pattern as existing code unless a name field is available.

---

## Sources

### Primary (HIGH confidence)
- Read: `supabase/functions/send-followup-emails/index.ts` — full email helper patterns, Resend integration, seeker_contacts lookup, service role pattern
- Read: `src/types/domain.ts` — authoritative application status values (line 74-108)
- Read: `src/pages/jobs/MarkFilledModal.tsx` — race condition source identified (handleConfirm ordering)
- [Supabase Database Webhooks Docs](https://supabase.com/docs/guides/database/webhooks) — UPDATE payload format, `supabase_functions.http_request()`, Dashboard UI approach
- [Resend Domain Management Docs](https://resend.com/docs/dashboard/domains/introduction) — DNS record requirements, "Verified" status meaning

### Secondary (MEDIUM confidence)
- [Supabase pg_net Docs](https://supabase.com/docs/guides/database/extensions/pg_net) — extension enablement via `CREATE EXTENSION IF NOT EXISTS pg_net`
- Search results confirming ANON key used as Authorization header in Dashboard-configured webhooks

### Tertiary (LOW confidence)
- Community pattern: use `old_record`/`record` diff in Edge Function handler for status-change guard — consistent with payload spec but not from a canonical example

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are existing project patterns, no new dependencies
- Architecture: HIGH — Supabase webhook pattern verified with official docs; race condition identified from code reading
- Pitfalls: HIGH — race condition confirmed from code; status naming confirmed from domain.ts; filter logic confirmed from webhook payload spec

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable patterns; Supabase webhook API is mature)
