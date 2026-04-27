# Phase 14: Bug Fixes - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Three v1.1 tech-debt items resolved:

1. **BFIX-01** — `JobSearch.tsx:582 hasApplied={false}` hardcode replaced with real per-(seeker, job) lookup. Badge visible for any application status; status-suffixed copy distinguishes terminal states. Apply tab re-enabled when most recent application is in a terminal status (re-apply allowed).
2. **BFIX-02** — Employers view applicant CV / certificates / references via Supabase Storage signed URLs minted by an Edge Function with service role. Per-click ephemeral 15-min expiry. Edge Function validates the employer→job→application→seeker relationship server-side.
3. **BFIX-03 (deliberate scope expansion)** — `seeker_documents` table + per-file `document_type` enum (cv / certificate / reference / identity / other). Existing `seeker_profiles.document_urls` data migrates as 'other'. Seeker upload UI gains required per-file type picker. Identity documents are NEVER exposed to employers — server-side filter in the document-access Edge Function before signed-URL minting. Employer view sectioned by non-identity category (CV / Certificates / References).

**Out of scope** (do not build):

- Saved search (Phase 15)
- Reverse seeker browsing
- Messaging UI / Expressions of Interest
- Drop the deprecated `seeker_profiles.document_urls` column (follow-up cleanup phase, not Phase 14)
- Identity document categorization in the upload UI counts as a privacy gate, not a feature — no UI flow for "promote identity doc to verification flow"

</domain>

<decisions>
## Implementation Decisions

### Applied status badge (BFIX-01)
- Badge shows for ANY application status (active or terminal). Seekers always know they've engaged with a listing.
- Status-suffixed copy for terminal states: "Applied" (active) | "Applied · Declined" | "Applied · Withdrawn" | "Applied · Hired".
- `hasApplied` prop signature change: replace `hasApplied: boolean` with `appliedStatus: ApplicationStatus | null` on `SearchJobCard` and `ExpandableCardTabs`. Components derive `hasActiveApplication = appliedStatus !== null && ACTIVE_STATUSES.includes(appliedStatus)` for Apply-tab gating.
- Apply tab is hidden ONLY when `hasActiveApplication`. Terminal statuses (declined / withdrawn / hired) re-enable the Apply tab — re-apply allowed.
- Lookup: single batch query `applications WHERE seeker_id = $1 AND job_id = ANY($2) ORDER BY created_at DESC`. Build `Map<jobId, latestStatus>` client-side. One round trip per page of search results.
- Badge copy finalization: locked direction is "Applied" / "Applied · {Status}". Final wording reviewed at plan-14-01 SUMMARY.md if a cleaner pattern emerges from existing UI copy.

### Document access architecture (BFIX-02)
- **Edge Function with service role.** Name: `get-applicant-document-url`.
- Validates: caller is authenticated employer; the application belongs to a job owned by this employer; the document belongs to the applicant of that application; `document_type != 'identity'`. All checks server-side before any URL is minted.
- `seeker-documents` bucket RLS stays seeker-only. Do NOT extend RLS to employers. Matches the contact-masking and placement-fee patterns from v1.0.
- Pattern reference: `supabase/functions/send-followup-emails/index.ts` for service-role + CORS scaffolding.

### Signed URL expiry (BFIX-02)
- `createSignedUrl(path, 900)` — 15 minutes, per-click ephemeral.
- No pre-generation, no caching, no batch-mint of all docs at panel-expand time. Each click on a "View" link fires the Edge Function, gets a fresh URL, opens in a new tab.

### Document categorization (BFIX-03 / FULL_DOC_CATEGORIZATION)
- **New table `seeker_documents`**: `id uuid pk`, `seeker_id uuid fk → seeker_profiles(id)`, `storage_path text`, `document_type text CHECK IN ('cv','certificate','reference','identity','other')`, `filename text`, `uploaded_at timestamptz default now()`, `file_size_bytes bigint`.
- **RLS**: seekers SELECT/INSERT/UPDATE/DELETE own rows. No employer policy — Edge Function uses service role.
- **Backfill** (idempotent, transaction-wrapped, LATERAL pattern not double-unnest):

  ```sql
  INSERT INTO seeker_documents (seeker_id, storage_path, document_type, filename)
  SELECT sp.id, doc.path, 'other', regexp_replace(doc.path, '^.*/', '')
  FROM seeker_profiles sp,
       LATERAL unnest(sp.document_urls) AS doc(path)
  WHERE sp.document_urls IS NOT NULL
    AND array_length(sp.document_urls, 1) > 0
    AND NOT EXISTS (
      SELECT 1 FROM seeker_documents sd
      WHERE sd.storage_path = doc.path AND sd.seeker_id = sp.id
    );
  ```
- **Migration file**: `supabase/migrations/018_seeker_documents.sql`. Confirmed next free number (017 is the Phase 13 `notify_job_filled_webhook.sql`).
- **Keep `seeker_profiles.document_urls` for now** — deprecated, drop in a follow-up cleanup phase. No dual-write needed; new uploads write to `seeker_documents` only.
- **Per-file document type picker, LOCKED**: each file gets its own type at upload. A seeker uploading a CV alongside reference letters needs different types per file. Implementation: per-file picker shown after drop in the files-list section of `FileDropzone` (or a wrapper around it). Required before upload commits to storage.
- **Re-categorization UI**: seekers can change `document_type` of existing documents. Single dropdown per row, instant save (no submit button). Location locked — see OD-1 below.

### Employer document view (BFIX-02 + BFIX-03)
- Inline section in the existing applicant expanded panel in `ApplicantDashboard.tsx`. No new modal pattern.
- Sectioned by category — three sections: "CV", "Certificates", "References". Identity docs are absent from the response (server-side filter), so they don't appear at all.
- Per row: filename + type badge + "View" action. Empty state per section: "No CV uploaded" / "No certificates uploaded" / "No references uploaded".
- View action: `window.open(signedUrl, '_blank')`. Browser handles MIME type natively — PDFs/images preview inline, .doc/.docx force download.

### Standing UAT mechanism (Phase 14 onward)
- **Playwright** for deterministic smoke specs. Install: `npm i -D @playwright/test` + `npx playwright install chromium` (chromium only, lean install).
- Smoke specs in `e2e/` (single directory, not `tests/e2e/`). Run locally; no CI step yet (separate later concern).
- Each plan from 14-01 onward ships with at least one smoke spec covering its happy path. Spec is part of the plan SUMMARY.md acceptance criteria.
- For pre-existing UAT debt (Select fixes click-test): handled via you-click + log-tail on 2026-04-27, no Playwright spec retrofitted.
- **Spec quality bar**: smoke specs must cover the primary success criterion of each plan, not a trivial smoke. Concrete per-plan targets:
  - **14-01**: assert badge appears for an applied job and is suffixed correctly for a terminal-state application
  - **14-02**: assert per-file type picker appears at upload and a `seeker_documents` row is created with the correct `document_type`
  - **14-03**: assert sectioned employer view renders and identity-typed docs are absent from the response payload (network-level assertion)

### Constraint: TS errors deferred
- 22 pre-existing TS errors stay deferred. Tracked as a separate cleanup phase.
- Do NOT introduce new TS errors during Phase 14. If a Phase 14 change touches a file with existing errors and the fix is cheap in-flight, do it and note in plan SUMMARY.md. If non-trivial, leave and flag.
- The pile shouldn't grow.
- **Note for the planner**: when 14-01 / 14-02 / 14-03 SUMMARY.md files are written, each plan must explicitly list any pre-existing TS errors in its touched files and decide cheap-fix-in-flight or leave-flag per error. Don't wing this at execution time.

### Claude's Discretion
- Exact UI styling of the per-file document type picker (chip group vs dropdown vs segmented control).
- Exact UI for the "View" action affordance (icon vs text link).
- Exact section header styling in the employer document view.
- Edge Function naming convention beyond `get-applicant-document-url` (e.g., variable names, internal helper structure).
- Loading states / skeletons during Edge Function call.
- Error message copy for failed signed-URL mint (relationship invalid, etc.).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase contract (locked)
- `.planning/REQUIREMENTS.md` — BFIX-01, BFIX-02, BFIX-03 (v2.0 Bug Fixes section); Pre-Launch Must-Fix UXBUG-01; Future Requirements PERF-01, HOMEBUG-01-03
- `.planning/ROADMAP.md` — Phase 14 section: 6 success criteria
- `MILESTONE_LAUNCH.md` — Authoritative launch guide; §2.3 Resend DNS blocker (separate from Phase 14); §5.10 marketing-pages audit-trail note
- `.planning/KNOWN_QUIRKS.md` — QUIRK-01 (herd_size multi-select intended), QUIRK-02 (StrictMode dev noise)

### BFIX-01 (applied badge)
- `src/pages/jobs/JobSearch.tsx` — line 582 hardcode `hasApplied={false}`; lines 100-137 setSearchParams pattern; lines 167-339 fetchJobs/useEffect
- `src/components/ui/SearchJobCard.tsx` — `hasApplied?: boolean` prop (line 20) → must change to `appliedStatus`; line 187 prop forwarding to ExpandableCardTabs
- `src/components/ui/ExpandableCardTabs.tsx` — `hasApplied: boolean` prop (line 16); Apply-tab gating logic (lines 26, 132)
- `src/types/domain.ts` — `ApplicationStatus` type, `ACTIVE_STATUSES` constant (per Phase 13 decision log: applied | reviewed | interview | shortlisted | offered)
- `src/hooks/useAuth.ts` — current seeker_id derivation pattern (auth.uid → user_roles → seeker_profile.id)

### BFIX-02 + BFIX-03 (documents)
- `supabase/migrations/016_phase11_backend_features.sql` — current `seeker-documents` bucket setup, RLS policies, `document_urls text[]` column
- `supabase/migrations/007_storage_buckets.sql` — pattern reference (`employer-documents` bucket, similar RLS structure)
- `supabase/functions/send-followup-emails/index.ts` — Edge Function pattern reference (Resend + service role + CORS scaffolding); `sendEmail()` helper structure
- `supabase/functions/notify-job-filled/index.ts` — Phase 13 Edge Function (most recent example)
- `src/pages/onboarding/steps/SeekerStep3Qualifications.tsx` — current seeker upload entry point (lines 169-197 FileDropzone usage)
- `src/components/ui/FileDropzone.tsx` — upload component with `bucket`, `path`, `privateMode`, `existingPaths`, `onUploadsComplete` props; needs extension or wrapper for per-file type picker
- `src/pages/dashboard/employer/ApplicantDashboard.tsx` — 755 lines, currently zero document references; new "Documents" inline section lives here
- `src/types/domain.ts` — `SeekerProfileData.document_urls` field; new `DocumentType` enum + row type to add
- `src/lib/supabase.ts` — auth-bound client used by `useApplicantDocumentUrl` hook

### Project context
- `.planning/PROJECT.md` — "Identity documents are NEVER sent to Claude API" constraint; NZ Privacy Act 2020 alignment; 5-tier verification trust ladder reference
- `MILESTONE_LAUNCH.md §1.4` — locked tech stack: React + TypeScript + Vite, Tailwind, Supabase, Stripe, Vercel

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FileDropzone` (`src/components/ui/FileDropzone.tsx`) — supports `privateMode`, multi-file, max-size, accept types. Already wired to `seeker-documents` bucket from Phase 11. Extension/wrapper needed to capture per-file `document_type` before upload commits.
- `ApplicationStatus` type + `ACTIVE_STATUSES` constant in `src/types/domain.ts` — per Phase 13 decision log, exact values are `applied | reviewed | interview | shortlisted | offered`. Used directly by BFIX-01 prop change.
- `Tag` and `VerificationBadge` components in `src/components/ui/` — pattern reference for the document-type badge in the employer view.
- `MatchCircle`, `StatusBanner` patterns — existing employer dashboard styling vocabulary; section headers in the new Documents inline section should match.
- Edge Function CORS scaffolding from `send-followup-emails` and `notify-job-filled` — copy pattern exactly.

### Established Patterns
- Edge Functions use service-role client (`@supabase/supabase-js` + `SUPABASE_SERVICE_ROLE_KEY`) and bypass RLS. Relationship validation done in TypeScript inside the function, not in SQL/RLS.
- Contact masking + placement fee + AI summary cache pattern: relationship-gated reads sit in Edge Functions, RLS stays simple. BFIX-02 follows this exactly.
- All Supabase queries from React go through `src/lib/supabase.ts` (auth-bound anon client). Never direct from a component for sensitive reads.
- URL-state-as-source-of-truth in `JobSearch.tsx` (single `setSearchParams` call per state mutation, `{ replace: true }` consistent across handlers — see Bug 1 fix `a75957d`).
- Migrations: numeric prefix + descriptive name, transaction-wrapped, idempotent backfills (`ON CONFLICT DO NOTHING`, `NOT EXISTS` guards).
- `seeker-documents` is a private bucket; storage paths are persisted to the database, never the public URL.

### Integration Points
- `useAppliedStatuses(jobIds, seekerId)` hook (NEW) — single batch query against `applications`, returns `Map<jobId, ApplicationStatus>`. Wires into `JobSearch.tsx` after seeker_profile_id is loaded.
- `useApplicantDocumentUrl()` hook (NEW) — invokes the `get-applicant-document-url` Edge Function on click, returns the signed URL.
- New Edge Function `supabase/functions/get-applicant-document-url/` — sits alongside `send-followup-emails` and `notify-job-filled`.
- Migration `018_seeker_documents.sql` — new table + backfill; `seeker_profiles.document_urls` column is preserved (deprecated comment added).
- `SeekerStep3Qualifications.tsx` — wrapped/extended FileDropzone usage; downstream effect on EmployerOnboarding wizard validation if any (none expected).
- New route `/dashboard/seeker/documents` registered in `src/main.tsx` — host for the re-categorization UI.

</code_context>

<specifics>
## Specific Ideas

### `FULL_DOC_CATEGORIZATION` flag
This phase deliberately expands BFIX-02 scope to include document categorization (BFIX-03). The decision was made on 2026-04-27 during gray-area discussion. Reasoning, captured for downstream agents:

- Shipping a flat (uncategorized) document model now would force a painful migration in Phase 16+ when categorization eventually became required.
- An uncategorized model creates a privacy gap on identity documents in the meantime — every employer review session would expose any identity doc the seeker had uploaded into the same bucket.
- BFIX-03 closes both: clean data model from day one, server-side identity exclusion enforced at the data-access layer.

This is **not scope creep** — it's a deliberate, contract-locked expansion of Phase 14. Verifier scores Phase 14 against all three BFIX-** items.

### Identity-document handling
- Per `PROJECT.md`: identity documents are **never** sent to the Claude API. Phase 14 extends this with: identity documents are **never exposed to employers** either.
- Enforcement at TWO layers (defense in depth): server-side filter in the Edge Function (primary), and category-sectioned UI that never has an "Identity" section (secondary).
- If a future verification flow needs identity-doc viewing by an admin/verification reviewer, that's a separate authorization model — not Phase 14.

### Manual UAT click-test from Bug 1 (2026-04-27)
- Confirmed: Apply 4 filters → Clear all → all pills cleared, URL params dropped, results reset (commit `a75957d`).
- Surfaces the standing UAT discipline for Phase 14: every plan ships with a Playwright smoke spec.

</specifics>

<open_decisions>
## Open Decisions

### OD-1: Re-categorization UI location — RESOLVED

**Decision: Option (a) — new `/dashboard/seeker/documents` route. LOCKED 2026-04-27.**

Rationale (folded in for downstream agents):
- Smallest scope, matches existing dashboard pattern (`/dashboard/seeker/applications`).
- The broken `/settings` Nav link is a separate problem — don't conflate "build a Settings page" with "host the re-categorize UI somewhere".
- Building a Settings page shell to host one feature is overengineering. Real Settings pages get built when there are 5+ preferences to host. We have zero others.
- If a Settings page is needed in v3+, the docs UI can move OR stay dedicated. No regret either way.

</open_decisions>

<deferred>
## Deferred Ideas

- **Drop deprecated `seeker_profiles.document_urls` column** — follow-up cleanup phase. Not Phase 14.
- **Saved Search** (Phase 15 / SRCH-13/14/15).
- **AbortController on JobSearch fetch** (PERF-01 — REQUIREMENTS.md Future).
- **Home page bugs** HOMEBUG-01 (`get_platform_stats` 404), HOMEBUG-02 (featured jobs 400), HOMEBUG-03 (FilterSidebar Couples/Accommodation backend mismatch) — REQUIREMENTS.md Future.
- **UXBUG-01** Step7Preview accommodation fields rendering empty — REQUIREMENTS.md Pre-Launch Must-Fix.
- **22 pre-existing TS errors** — separate cleanup phase.
- **CI integration of Playwright smoke specs** — local-only for Phase 14; CI is a later concern.
- **Vercel build hardening** (typecheck gate in CI) — separate cleanup.
- **Seeker `/profile` and `/settings` Nav links currently dead** — track as `NAV-01` if still relevant after a future Settings phase.

</deferred>

---

*Phase: 14-bug-fixes*
*Context gathered: 2026-04-27*
*Contract locked: REQUIREMENTS.md + ROADMAP.md commit `26deab1`*
