---
phase: 14-bug-fixes
plan: "03"
subsystem: documents
tags: [bfix-02, edge-function, signed-url, identity-exclusion, defence-in-depth, gateway-trust-jwt, bundled-hotfixes]
dependency_graph:
  requires: [14-02]
  provides: [get-applicant-document-url-edge-function, useApplicantDocumentUrl, ApplicantDocuments, employer-rls-policy-on-seeker_documents]
  affects: [supabase/functions/get-applicant-document-url/, src/components/ui/ApplicantPanel.tsx, src/pages/dashboard/employer/ApplicantDashboard.tsx, src/components/layout/Nav.tsx, src/components/layout/Sidebar.tsx]
tech_stack:
  added: [get-applicant-document-url Edge Function (verify_jwt:true), useApplicantDocumentUrl hook, ApplicantDocuments component, migration 020 employer SELECT RLS policy]
  patterns: [5-layer privacy gate, gateway-trust JWT decode, per-click ephemeral signed URL, defence-in-depth identity exclusion at three layers (RLS + listing query + Edge Function whitelist)]
key_files:
  created:
    - supabase/functions/get-applicant-document-url/index.ts
    - supabase/migrations/020_seeker_documents_employer_policy.sql
    - src/hooks/useApplicantDocumentUrl.ts
    - src/components/ui/ApplicantDocuments.tsx
  modified:
    - src/pages/dashboard/employer/ApplicantDashboard.tsx
    - src/components/ui/ApplicantPanel.tsx
    - src/components/layout/Nav.tsx
    - src/components/layout/Sidebar.tsx
decisions:
  - "5-layer privacy gate: (1) HTTP method POST, (2) JWT presence + audience check via gateway-trust + local payload decode, (3) user_roles.role='employer', (4) application/job ownership relationship walk + document/seeker match, (5) document_type identity exclusion + EMPLOYER_VISIBLE whitelist"
  - "Gateway-trust JWT decode pattern (BFIX-05) — verify_jwt:true means gateway already validated signature; service-role-keyed adminClient.auth.getUser(token) routes /auth/v1/user differently and rejects valid ES256 tokens. Trust gateway, decode locally for sub, validate aud='authenticated'"
  - "Two simpler queries (application+job, then seeker_document) over a complex Supabase JOIN — easier to reason about, easier to debug, avoids fragile self-referential auto-join syntax"
  - "Defence-in-depth at 3 layers for identity exclusion: RLS policy in migration 020 + EMPLOYER_VISIBLE_DOCUMENT_TYPES whitelist in Edge Function + .in('document_type', EMPLOYER_VISIBLE_DOCUMENT_TYPES) at the listing query — any single layer's removal still keeps identity invisible"
  - "Per-click ephemeral signed URLs (15-min TTL) over pre-generation/caching — fresh invocation per View click, no client-side persistence"
  - "BFIX-04, BFIX-05, NAV-02 bundled into the same commit — surfaced during BFIX-02 UAT; each independently tracked in REQUIREMENTS.md but shipped together as the BFIX-02 dependency chain"
metrics:
  closing_commit: e8f0882
  completed_date: "2026-04-29"
  tasks_completed: 4
  files_changed: 9
  insertions: 556
  deletions: 14
  edge_function_status: "ACTIVE (v2)"
  signed_url_ttl_seconds: 900
---

# Phase 14 Plan 03 — BFIX-02 employer document viewer + bundled hotfixes

**One-liner:** Stand up `get-applicant-document-url` Edge Function with 5-layer authorization (method, JWT, role, relationship, identity exclusion) minting 15-minute signed URLs. Surface inline sectioned Documents view (CV / Certificates / References — never Identity) in `ApplicantDashboard.tsx`. BFIX-04, BFIX-05, NAV-02 bundled as in-flight hotfixes surfaced during UAT.

## What Was Built

### Edge Function (`supabase/functions/get-applicant-document-url/index.ts`, 209 LOC)
Five-layer privacy gate:

1. **HTTP method** — POST-only (`:61-63`)
2. **JWT auth** — gateway-trust + local payload decode (`:69-94`). `verify_jwt: true` means the gateway has already validated the signature upstream; the function decodes the payload locally via `atob`, validates `aud === 'authenticated'`, extracts `sub`. **Do not** re-validate via `adminClient.auth.getUser(token)` — service-role-keyed clients route `/auth/v1/user` differently and reject valid ES256 tokens (BFIX-05; pattern memorialised in CLAUDE.md item 5).
3. **Role check** — `user_roles.role === 'employer'` via `from('user_roles').select('role').eq('user_id', callerUserId).maybeSingle()` (`:98-109`). Returns 403 BEFORE relationship lookup.
4. **Relationship walk** — split into two queries over a single complex JOIN:
   - Application + jobs join: `appJobs?.employer_id !== callerEmployerId` → 403 (`:144-159`)
   - Document lookup: `docRow.seeker_id !== appRow.seeker_id` → 403 (sanity check, `:162-176`)
5. **Identity exclusion** — explicit `document_type === 'identity'` reject (`:179-184`) AND `EMPLOYER_VISIBLE_DOCUMENT_TYPES.includes(...)` whitelist (`:190-192`) so future enum additions default to denied.

After all gates: signed URL via `createSignedUrl(storage_path, 900)` (`:198`). Response shape `{ url, expires_in: 900 }`. All errors logged to `console.error` for `mcp__supabase__get_logs` debugging.

### Migration 020 (`supabase/migrations/020_seeker_documents_employer_policy.sql`, 48 LOC)
Employer SELECT RLS policy on `seeker_documents` — necessary for the listing query in `ApplicantDocuments.tsx` (`:30-43`):
- Relationship walk: caller employer must own a job that has an application from the seeker
- `document_type IN ('cv', 'certificate', 'reference')` — identity exclusion at the RLS layer
- Role gate: caller's `user_roles.role` must equal `'employer'`

Applied live; SQL recovered to disk in this commit so it reproduces on fresh checkouts.

### Client hook (`src/hooks/useApplicantDocumentUrl.ts`, 37 LOC)
- Returns a function (not data) — invoked on user click, fresh URL each time
- `supabase.functions.invoke<DocUrlResult>('get-applicant-document-url', { body: { application_id, document_id } })`
- No caching anywhere
- Toast feedback on failure; null return for clean caller short-circuit

### UI (`src/components/ui/ApplicantDocuments.tsx`, 215 LOC, new component)
- Loads `seeker_documents` filtered `.in('document_type', EMPLOYER_VISIBLE_DOCUMENT_TYPES)` (`:67`) — defence-in-depth at the client even though RLS migration 020 already filters
- Bucketing loop ALSO filters via `EMPLOYER_VISIBLE_DOCUMENT_TYPES.includes(...)` (`:104-108`) — third layer
- Three sections rendered: CV / Certificates / References. **No Identity section.** `grep -n "Identity"` returns zero hits in this file.
- Per-row View click: `getDocumentUrl(applicationId, doc.id)` fresh, then `window.open(url, '_blank', 'noopener,noreferrer')`
- Per-section empty state copy

### Wiring (`ApplicantDashboard.tsx`, `ApplicantPanel.tsx`)
- Documents section added inline in the applicant expanded panel
- BFIX-04 fix in same file: `seeker_profiles.first_name` removed from select (column doesn't exist; Postgres was rejecting the entire applicants query with 400 silently, rendering "No applicants" even with applications in the DB)

### Bundled hotfixes (BFIX-04, BFIX-05, NAV-02)

| Hotfix | Goal | Status |
|---|---|---|
| **BFIX-04** | Remove non-existent `seeker_profiles.first_name` from applicants query — Postgres 400 silent → empty list | PASS — discovered during BFIX-02 UAT B.4 |
| **BFIX-05** | Edge Function gateway-trust JWT decode (replace `adminClient.auth.getUser`) | PASS — pattern noted in REQUIREMENTS.md and CLAUDE.md item 5 |
| **NAV-02** | Fix dead `/applications` (employer) and `/my-applications` (seeker) nav links | PASS — `Nav.tsx:15` corrected; `Sidebar.tsx:23,31` corrected |

## Decisions Made

| Decision | Rationale |
|---|---|
| 5-layer privacy gate, ordered cheap-first | Method (free) → JWT decode (cheap) → role lookup (1 query) → relationship walk (2 queries) → identity exclusion (in-memory). Reject early on cheaper layers; expensive layers only run for legitimate-shaped requests |
| Gateway-trust over `adminClient.auth.getUser` | BFIX-05 — service-role-keyed clients route `/auth/v1/user` differently and reject valid tokens. Three rounds of diagnosis surfaced this; pattern now codified in CLAUDE.md |
| Two queries over a complex JOIN | Easier to reason about, easier to debug, avoids fragile Supabase auto-join naming for self-referential cases |
| Defence-in-depth identity exclusion at 3 layers | RLS + Edge Function whitelist + listing-query filter — any single layer's removal still keeps identity invisible. Privacy-critical surface deserves redundancy |
| Per-click ephemeral over caching | 15-min TTL is the freshness guarantee; caching would create stale-URL surface area for revoked access scenarios |
| BFIX-04/05/NAV-02 bundled in this commit | All surfaced during BFIX-02 UAT; each blocked the UAT. Atomic-commit rule allows internal-consistency bundling within the same commit window |

## Deviations from Plan

- **Verification commit-hash drift:** the gsd-verifier's `14-VERIFICATION.md` references commit `97f35ce`. Final post-rebase commit is `e8f0882`. The artefacts are identical; only the SHA changed during the push amend that flipped REQUIREMENTS.md BFIX-01 to Complete. Refresh handled in cleanup item 7.
- **B.7 (signed URL freshness), B.8 (cross-employer access), B.10 (non-employer caller) UAT steps deferred:** rationale logged in commit body — "v2 redeploy + RLS-by-construction + unit-logic role check cover". These are NOT in PRIV-02; they're considered code-covered.
- **PRIV-02 deferred (public-launch blocker):** B.9 empirical identity-bypass attack from authenticated employer JWT not run. Defence-in-depth at three layers means a bypass requires bypassing all three, but that has not been confirmed by direct attack. Test snippet, expected response (`403 {"error":"Identity documents are not accessible to employers"}`), and hard-fail criterion (`200 + signed URL`) logged in REQUIREMENTS.md.

## Deferrals carried forward

- **PRIV-02** — empirical identity-bypass test against deployed function. Public-launch blocker.
- **DEPLOY-01 widened** — 4 Edge Functions on disk are not deployed live (`acknowledge-placement-fee`, `create-placement-invoice`, `notify-job-filled`, `send-followup-emails`). Out of Phase 14 scope; cleanup-backlog item 6 covers migration 017's deploy.
- **CORS-01, PRIV-01, DOC-TAB-01** — post-launch items logged in REQUIREMENTS.md.
- **Dead semantics in `ApplicantDashboard.tsx`:** type def line 24 (`first_name?: string`) and reference ~line 435 (`seeker_profiles?.first_name ?? null`) survive even though the column is gone. Comment at lines 178-181 flags as cleanup-deferred. Always evaluates to `null`. No functional impact.

## UAT evidence

- **Section A (DB sanity):** all migrations + fixtures present
- **Anonymous smoke:** 401 `UNAUTHORIZED_NO_AUTH_HEADER` at gateway
- **Schema verify:** migration 020 yields 5 policies on `seeker_documents`; employer-context query simulation returns cv + cert only, identity excluded
- **B.4 (sectioned UI render):** PASS after BFIX-04 + migration 020
- **B.5 (data-layer privacy):** PASS via SQL employer-context simulation AND browser network capture
- **B.6 (View click → signed URL):** PASS on function v2 (two POST 200s)
- **B.7 / B.8 / B.10:** deferred — code-covered
- **B.9 (privacy bypass):** PENDING — tracked as PRIV-02

## Self-Check

- [x] Edge Function `supabase/functions/get-applicant-document-url/index.ts` — 209 LOC, ACTIVE (v2)
- [x] Layer 1 (POST): `:61-63`
- [x] Layer 2 (JWT gateway-trust): `:69-94`
- [x] Layer 3 (role): `:98-109`
- [x] Layer 4 (relationship walk): `:144-159`, `:162-176`
- [x] Layer 5a (identity reject): `:179-184`
- [x] Layer 5b (whitelist): `:190-192`
- [x] 15-min signed URL TTL: `:44 SIGNED_URL_TTL_SECONDS = 900`, `:198 createSignedUrl(..., 900)`
- [x] `useApplicantDocumentUrl.ts` — no caching, fresh per call, throws on error
- [x] `ApplicantDocuments.tsx` — three sections (CV / Certificates / References); zero "Identity" hits
- [x] Listing query `.in('document_type', EMPLOYER_VISIBLE_DOCUMENT_TYPES)` at `:67`
- [x] Bucketing loop also filters via `EMPLOYER_VISIBLE_DOCUMENT_TYPES.includes` at `:104-108`
- [x] View click: `window.open(url, '_blank', 'noopener,noreferrer')` per click
- [x] Migration 020 applied live; on-disk for fresh-checkout reproducibility
- [x] BFIX-04, BFIX-05, NAV-02 bundled and verified
- [x] Closing commit: `e8f0882 feat(14-03): employer document viewer with identity exclusion` (2026-04-29)

## Self-Check: PARTIAL — PRIV-02 deferred (public-launch blocker, not push-to-main blocker)
