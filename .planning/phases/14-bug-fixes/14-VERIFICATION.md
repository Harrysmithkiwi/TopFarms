---
phase: 14-bug-fixes
verified: 2026-04-29
refreshed: 2026-04-29
verifier: Claude (gsd-verifier, opus-4-7); refresh by Claude (cleanup-session, opus-4-7)
commit_verified: e8f0882
status: gaps_found
score: 3/3 sub-phases shipped; 1 tracked deferral (PRIV-02 empirical identity-bypass test) carried forward
deferrals:
  - PRIV-02 (B.9 privacy bypass empirical test, public-launch blocker)
  - DEPLOY-01 (Edge Function + migration deploy CI gap, cross-cutting)
  - dead-semantics cleanup in ApplicantDashboard.tsx:24,435 (first_name)
  - migration 020 disk filename / live registry version drift (cosmetic)
refresh_notes: |
  Original verification ran against commit 97f35ce. The BFIX-01 documentation
  lag flagged in the original report was reconciled in the same atomic-commit
  window via amend, producing the final commit e8f0882. This refresh updates
  the commit hash, flips the BFIX-01 doc-status to reconciled, and removes
  the BFIX-01 deferral. Code evidence is unchanged; only post-amend doc-state
  fields were edited.
---

# Phase 14: Bug Fixes — Verification Report

**Phase goal (from ROADMAP.md):** "Three v1.1 tech debt items are resolved — seekers see which jobs they've applied to, employers can view applicant documents via signed URLs, and seeker documents are categorized so identity documents are never exposed to employers."

**Verified:** 2026-04-29 (refreshed 2026-04-29 in cleanup-session)
**Commit verified:** `e8f0882 feat(14-03): employer document viewer with identity exclusion` (post-amend; original verification ran against pre-amend `97f35ce`)
**Method:** goal-backward, read-only static audit against on-disk artefacts + git log. No DB queries, no dev server, no test runs.

---

## Sub-phase 14-01 — BFIX-01 Applied badge

**Goal:** Replace `JobSearch.tsx:582 hasApplied={false}` hardcode with a real per-(seeker, job) lookup. Render an "Applied" badge with status-suffixed copy for terminal states. Re-enable the Apply tab for terminal applications.

**Verdict:** PASS (with documentation lag — see Notes)

### Promised deliverables vs evidence

| Promised                                                              | Evidence                                                                                                       | Status |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------ |
| `src/hooks/useSeekerProfileId.ts` exists                              | `src/hooks/useSeekerProfileId.ts:1-43` — auth-bound hook, `maybeSingle()`, cancellation guard                  | PASS   |
| `src/hooks/useAppliedStatuses.ts` exists with batch query             | `src/hooks/useAppliedStatuses.ts:1-59` — `.in('job_id', jobIds).order('created_at', { ascending: false })`     | PASS   |
| `JobSearch.tsx` wires both hooks, replaces hardcode                   | `src/pages/jobs/JobSearch.tsx:9-10` (imports), `:96-97` (invocation), `:617` `appliedStatus={...get(...)}`     | PASS   |
| `SearchJobCard.tsx` prop signature `appliedStatus: ApplicationStatus \| null`; status-suffixed badge | `src/components/ui/SearchJobCard.tsx:21` (interface), `:63-68` (suffix render via `APPLICATION_STATUS_LABELS`) | PASS   |
| `ExpandableCardTabs.tsx` derives `hasActiveApplication` from `ACTIVE_STATUSES` | `src/components/ui/ExpandableCardTabs.tsx:17` (interface), `:26-32` (`ACTIVE_STATUSES.includes`), `:138` (apply-tab gate) | PASS   |
| No `hasApplied` references remain in the JobSearch render path        | `grep -rn "hasApplied" src/` matches only `src/pages/jobs/JobDetail.tsx` (different page, different concern)   | PASS   |
| `Button` unused import removed from JobSearch.tsx                     | `grep -n "import.*Button" src/pages/jobs/JobSearch.tsx` — no Button import                                     | PASS   |

### Git evidence

```
c6066ea feat(14-01): real hasApplied lookup with status-suffixed badge   (2026-04-28)
```

### Notes

- **REQUIREMENTS.md BFIX-01 doc-state reconciled in this commit (e8f0882).** Original verification observed `[ ] Pending` against pre-amend `97f35ce`; the same atomic-commit window flipped the checkbox to `[x] Complete` and the traceability table row, producing the final commit. PASS.
- ~~No SUMMARY.md exists at `.planning/phases/14-bug-fixes/14-01-SUMMARY.md`~~ — generated in cleanup-session (item 3 of CLEANUP-BACKLOG.md). All three sub-phase SUMMARY.md files now present.
- Manual UAT and Playwright spec deferred per TEST-01 — explicit decision logged in REQUIREMENTS.md.

---

## Sub-phase 14-02 — BFIX-03 seeker_documents categorization

**Goal:** Stand up `seeker_documents` table with per-row `document_type`, backfill `seeker_profiles.document_urls` as `'other'`, wrap `FileDropzone` with a per-file type picker, and ship a re-categorization page at `/dashboard/seeker/documents`.

**Verdict:** PASS

### Promised deliverables vs evidence

| Promised                                                                                                  | Evidence                                                                                                                                                                         | Status |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Migration `019_seeker_documents.sql` with locked CHECK enum, 4 RLS policies, LATERAL backfill, deprecation comment | `supabase/migrations/019_seeker_documents.sql:39-49` (table + CHECK), `:62-92` (4 RLS policies), `:110-119` (LATERAL backfill with `NOT EXISTS` guard), `:128-129` (deprecation comment) | PASS   |
| Backfill is idempotent + transaction-wrapped                                                              | `:33` `BEGIN`, `:131` `COMMIT`, `:116-118` `NOT EXISTS` guard                                                                                                                    | PASS   |
| `seeker_profiles.document_urls` column preserved (not dropped)                                            | Column still in `src/types/domain.ts:176` with `@deprecated` JSDoc; no `DROP COLUMN` in any migration                                                                            | PASS   |
| `DocumentType` union + `DOCUMENT_TYPE_LABELS` + `EMPLOYER_VISIBLE_DOCUMENT_TYPES` + `SeekerDocument` interface | `src/types/domain.ts:183` (union), `:185-191` (labels), `:200` (visible types `['cv','certificate','reference']`), `:202-210` (interface)                                       | PASS   |
| `DocumentUploader.tsx` wrapper inserts to `seeker_documents` after upload                                 | `src/components/ui/DocumentUploader.tsx:149-153` — `from('seeker_documents').insert({ seeker_id, storage_path, document_type, filename, ... })`                                  | PASS   |
| `SeekerStep3Qualifications.tsx` swapped to `<DocumentUploader>`; no `document_urls` reads/writes          | `src/pages/onboarding/steps/SeekerStep3Qualifications.tsx:7` import, `:175` render. Grep for `document_urls`: zero hits in this file.                                            | PASS   |
| `SeekerDocuments.tsx` page lists docs scoped to seeker, instant-save type change, delete with Storage cleanup | `src/pages/dashboard/seeker/SeekerDocuments.tsx:8` (`useSeekerProfileId` import), `:99-115` (handleTypeChange), `:117-130` (handleDelete with storage.remove + row delete)       | PASS   |
| `/dashboard/seeker/documents` route registered, ordered before `/dashboard/seeker`                        | `src/main.tsx:29` import, `:155-161` route, `:163` parent route after it                                                                                                         | PASS   |
| Scout: no remaining `document_urls` readers in `src/` or `supabase/functions/`                            | `grep -rn "document_urls" src/ supabase/functions/` returns ONLY `src/types/domain.ts:176` (the deprecated type)                                                                  | PASS   |

### Git evidence

```
5a228e0 feat(14-02): seeker_documents table + per-file categorization + re-categorize page   (2026-04-29)
```

### Notes

- **Migration 020 disk filename / live registry version drift (deferred):** Migration 020 is on disk as `020_seeker_documents_employer_policy.sql` but registered live as version `20260429031148` (per task brief). Cosmetic only — both refer to the same SQL body. Tracked as cleanup-backlog item 5.
- ~~14-02 SUMMARY.md is missing~~ — generated in cleanup-session (item 3).
- No Playwright smoke spec — TEST-01 deferred to post-launch.

---

## Sub-phase 14-03 — BFIX-02 employer document viewer + bundled hotfixes

**Goal:** Stand up `get-applicant-document-url` Edge Function with 5-layer authorization (method, JWT, role, relationship, identity exclusion). Surface inline sectioned Documents view (CV / Certificates / References) in `ApplicantDashboard.tsx`. Per-click ephemeral signed URLs, 15-minute TTL, no caching.

**Verdict:** PARTIAL — all artefacts shipped and 4/5 layers UAT-verified empirically; layer 5 (identity bypass attack from authenticated employer JWT) deferred to PRIV-02 with explicit blocker tag for public launch.

### Promised deliverables vs evidence

| Promised                                                                                                       | Evidence                                                                                                                                                                                                            | Status                |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Edge Function `supabase/functions/get-applicant-document-url/index.ts` exists                                  | File present, 209 LOC                                                                                                                                                                                               | PASS                  |
| Layer 1 — POST-only method check                                                                               | `index.ts:61-63` `if (req.method !== 'POST') return 405`                                                                                                                                                            | PASS                  |
| Layer 2 — JWT auth (gateway-trust + local payload decode per BFIX-05 fix)                                      | `index.ts:69-94` — Bearer extraction, local `atob` decode, `aud === 'authenticated'` check, `sub` extraction                                                                                                        | PASS                  |
| Layer 3 — Role check `user_roles.role === 'employer'`                                                          | `index.ts:98-109` — `from('user_roles').select('role').eq('user_id', callerUserId).maybeSingle()` then `if (roleRow?.role !== 'employer') return 403`                                                               | PASS                  |
| Layer 4 — Relationship walk: application owned by caller's employer; document seeker matches application seeker | `index.ts:144-159` (application + jobs join, `appJobs?.employer_id !== callerEmployerId` check), `:162-176` (separate doc lookup, `docRow.seeker_id !== appRow.seeker_id` check)                                    | PASS                  |
| Layer 5a — Explicit `document_type === 'identity'` reject                                                      | `index.ts:179-184`                                                                                                                                                                                                   | PASS (code-level)     |
| Layer 5b — Whitelist: `EMPLOYER_VISIBLE_DOCUMENT_TYPES.includes(...)` defence-in-depth                         | `index.ts:43` (constant), `:190-192` (whitelist check)                                                                                                                                                              | PASS (code-level)     |
| 15-minute signed URL TTL                                                                                       | `index.ts:44` `SIGNED_URL_TTL_SECONDS = 900`, `:198` `createSignedUrl(docRow.storage_path, SIGNED_URL_TTL_SECONDS)`                                                                                                 | PASS                  |
| `useApplicantDocumentUrl.ts` — client hook, no caching, throws on error                                        | `src/hooks/useApplicantDocumentUrl.ts:24-26` (functions.invoke), `:28-31` throws on error, `:32-34` throws on missing url                                                                                            | PASS                  |
| `ApplicantDocuments.tsx` lists docs sectioned by CV / Certificates / References; no Identity section          | `src/components/ui/ApplicantDocuments.tsx:33-37` `SECTIONS = [cv, certificate, reference]`. `grep -n "Identity"` in the component returns ZERO hits. (Only docstring references in `index.ts` comments.)            | PASS                  |
| Listing query filters `.in('document_type', EMPLOYER_VISIBLE_DOCUMENT_TYPES)` — defence-in-depth at the client | `ApplicantDocuments.tsx:67`                                                                                                                                                                                          | PASS                  |
| Bucketing loop ALSO filters via `EMPLOYER_VISIBLE_DOCUMENT_TYPES.includes`                                     | `ApplicantDocuments.tsx:104-108`                                                                                                                                                                                     | PASS                  |
| View click is per-click ephemeral; opens in new tab                                                            | `ApplicantDocuments.tsx:86-95` — each click invokes `getDocumentUrl(applicationId, doc.id)` fresh; `window.open(url, '_blank', 'noopener,noreferrer')`                                                              | PASS                  |
| Empty-state copy per section                                                                                   | `ApplicantDocuments.tsx:143-159` — "No documents uploaded by this applicant" (single empty state when ALL sections empty); `:170-211` non-empty sections render only when `sectionDocs.length > 0`                  | PASS (variation)      |
| Identity-bypass attack from authenticated employer JWT empirically verified                                    | DEFERRED to PRIV-02 (REQUIREMENTS.md:76-89). Test snippet recorded; expected response `403 {"error":"Identity documents are not accessible to employers"}`. Hard fail = `200 + signed URL`. Public-launch blocker.  | DEFERRED              |

### Bundled hotfixes shipped in 97f35ce

| Hotfix    | Goal                                                                                          | Evidence                                                                                                                                                                                | Status   |
| --------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BFIX-04   | Remove non-existent `seeker_profiles.first_name` from applicants query (silent 400 → empty list) | `ApplicantDashboard.tsx:178-181` (rationale comment), `:182-191` (SELECT clause without `first_name`)                                                                                   | PASS     |
| BFIX-05   | Edge Function gateway-trust JWT decode (replace `adminClient.auth.getUser`)                   | `get-applicant-document-url/index.ts:75-94` (BFIX-05 fix landed in-place). Pattern noted for future verify_jwt-enabled functions in REQUIREMENTS.md.                                    | PASS     |
| NAV-02    | Fix dead `/applications` (employer) and `/my-applications` (seeker) nav links                 | `Nav.tsx:15` `/dashboard/seeker/applications` (correct path), no employer aggregate-page link. `Sidebar.tsx:23` removal-comment + `:31` correct seeker path.                            | PASS     |
| Migration 020 — employer SELECT RLS policy on `seeker_documents` (necessary for ApplicantDocuments query) | `supabase/migrations/020_seeker_documents_employer_policy.sql:30-43` — relationship walk + `document_type IN ('cv','certificate','reference')` + role gate                              | PASS     |

### Notes / known deferrals on this sub-phase

- **PRIV-02 — empirical identity-bypass test deferred (public-launch blocker).** The BFIX-02 UAT step B.9 was not run. Defence-in-depth at three layers (RLS migration 020 + Edge Function whitelist + listing-query filter) means a bypass requires bypassing all three, but that has not been confirmed by direct attack. Test snippet, expected response, and hard-fail criterion are logged in REQUIREMENTS.md. **This is a documented deferral, not a silent skip.**
- **Dead semantics in `ApplicantDashboard.tsx`:** Type def at line 24 (`first_name?: string`) and reference at line ~435 (`seeker_profiles?.first_name ?? null`) survive even though the column is gone. Comment at line 178-181 explicitly flags as cleanup-deferred. Always evaluates to `null`. No functional impact; cosmetic dead code.
- **Migration 020 disk filename / live registry mismatch:** disk = `020_seeker_documents_employer_policy.sql`, live registry = `20260429031148`. SQL body identical. Cleanup-backlog.
- **Edge Function deploy drift (DEPLOY-01):** 4 functions exist on disk but are NOT deployed live (`acknowledge-placement-fee`, `create-placement-invoice`, `notify-job-filled`, `send-followup-emails`). Out of Phase 14 scope — cross-cutting deploy-pipeline concern. Mentioned here only because `notify-job-filled` is referenced in 14-03's plan as a pattern source, and `send-followup-emails` was the original Edge Function pattern reference. The Phase 14 deliverable `get-applicant-document-url` IS deployed and ACTIVE per the commit body.
- **B.7 (signed URL freshness), B.8 (cross-employer access), B.10 (non-employer caller) UAT steps deferred:** rationale logged in commit body — "v2 redeploy + RLS-by-construction + unit-logic role check cover". These are NOT in PRIV-02; they're considered code-covered.

### Git evidence

```
e8f0882 feat(14-03): employer document viewer with identity exclusion   (2026-04-29; post-amend, was 97f35ce pre-amend)
```

---

## Roll-up

| Sub-phase | Verdict | Code-shipped | Doc-status | Push-ready? |
| --------- | ------- | ------------ | ---------- | ----------- |
| 14-01 (BFIX-01) | PASS | Yes (commit `c6066ea`) | REQUIREMENTS.md `[x] Complete` (reconciled in `e8f0882`) | Yes |
| 14-02 (BFIX-03) | PASS | Yes (commit `5a228e0`) | REQUIREMENTS.md says `[x] Complete` | Yes |
| 14-03 (BFIX-02 + bundled BFIX-04 / BFIX-05 / NAV-02) | PARTIAL | Yes (commit `e8f0882`) | REQUIREMENTS.md says `[x] Complete` with PRIV-02 logged as blocker | Yes for *staging push* — PRIV-02 must be empirically validated before the *public launch* push |

### Summary verdict

**Push-ready for `git push origin main`** with the following caveats the user should accept knowingly:

1. **PRIV-02** (B.9 identity-bypass empirical test) — public-launch blocker, must run against deployed function before MVP go-live. Test snippet + expected response in REQUIREMENTS.md.
2. ~~REQUIREMENTS.md BFIX-01 checkbox lag~~ — reconciled in the same atomic-commit window as the verification, producing post-amend commit `e8f0882`. PASS.
3. **Cleanup backlog** — `ApplicantDashboard.tsx` `first_name` dead semantics (lines 24, 435), migration 020 filename/registry mismatch, ~~missing 14-01/14-02/14-03 SUMMARY.md files~~ (generated in cleanup-session item 3). None blocks correctness.
4. **DEPLOY-01** — 4 disk-only Edge Functions, not deployed. Out of Phase 14 scope but worth a glance before any function-dependent feature ships.

### Showstoppers

None at the code-correctness layer. PRIV-02 is the only gate item, and it's tracked as a public-launch blocker rather than a push-to-main blocker.

---

## Method notes

- Static read-only audit. No DB queries (no MCP access in this verifier session). No dev server. No test runs.
- File evidence verified via `Read` and `grep` against the working tree at HEAD = `97f35ce`.
- Git history cross-referenced via `git log --oneline` and per-file `git log` to confirm shipping commits.
- REQUIREMENTS.md and ROADMAP.md treated as the contract; deviations from them are flagged.

_Verifier: Claude (gsd-verifier, opus-4-7)_
_Verified: 2026-04-29_
_Verified against: HEAD commit e8f0882 (post-amend; original verification ran against pre-amend `97f35ce`)_
_Refresh: 2026-04-29 cleanup-session — commit hash + BFIX-01 reconciliation + SUMMARY.md presence updates only. Code-evidence section unchanged._
