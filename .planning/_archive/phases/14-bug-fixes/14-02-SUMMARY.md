---
phase: 14-bug-fixes
plan: "02"
subsystem: documents
tags: [bfix-03, document-categorization, rls, lateral-backfill, document-uploader, auth-fix-02]
dependency_graph:
  requires: []
  provides: [seeker_documents-table, DocumentType-enum, EMPLOYER_VISIBLE_DOCUMENT_TYPES, DocumentUploader, SeekerDocuments-page]
  affects: [seeker_profiles.document_urls (deprecated), src/main.tsx, src/pages/onboarding/steps/SeekerStep3Qualifications.tsx, src/components/layout/ProtectedRoute.tsx]
tech_stack:
  added: [seeker_documents table, document_type CHECK enum, 4 RLS policies, LATERAL backfill, /dashboard/seeker/documents route]
  patterns: [DB CHECK + TS union + RLS + visibility constant defence-in-depth, idempotent transaction-wrapped migration, seeker-only RLS scoped via seeker_profiles.user_id = auth.uid()]
key_files:
  created:
    - supabase/migrations/019_seeker_documents.sql
    - src/components/ui/DocumentUploader.tsx
    - src/pages/dashboard/seeker/SeekerDocuments.tsx
  modified:
    - src/types/domain.ts
    - src/pages/onboarding/steps/SeekerStep3Qualifications.tsx
    - src/pages/onboarding/SeekerOnboarding.tsx
    - src/main.tsx
    - src/components/layout/ProtectedRoute.tsx
decisions:
  - "DocumentUploader Option 2 (owns drop UI) over Option 1 (wrap FileDropzone) — FileDropzone's per-file extension surface would have required more invasive edits than full reimplementation; trade is more LOC but cleaner per-file type-picker integration"
  - "seeker_profiles.document_urls preserved with COMMENT-ON-COLUMN deprecation marker, not dropped — drop deferred to a future cleanup phase once all readers verified gone (Task 0 scout was clean: zero readers)"
  - "Seeker-only RLS (4 policies) baked into 019; employer-side SELECT policy deferred to 14-03 migration 020 (default-deny holds in the meantime — no employer can read seeker_documents until 020 explicitly grants it)"
  - "AUTH-FIX-02 ProtectedRoute mitigation bundled — c6066ea's 3s loadRoleWithTimeout was flipping loading=false with role=null and bouncing protected routes through /auth/select-role on every navigation; ProtectedRoute now guards against role-null-after-loading state. Mitigation only — root-cause fix landed separately in 2fce4b7"
  - "EMPLOYER_VISIBLE_DOCUMENT_TYPES = ['cv', 'certificate', 'reference'] established as the single source of truth for 14-03's identity exclusion"
metrics:
  closing_commit: 5a228e0
  completed_date: "2026-04-29"
  tasks_completed: 8
  files_changed: 12
  insertions: 826
  deletions: 44
  migration_applied: "20260428053314_019_seeker_documents"
  backfill_assertion: "0=0 (no legacy document_urls data to migrate on this DB)"
---

# Phase 14 Plan 02 — BFIX-03 seeker_documents categorization

**One-liner:** Stand up `seeker_documents` table with locked `document_type` enum (cv | certificate | reference | identity | other), idempotent LATERAL backfill from `seeker_profiles.document_urls`, per-file type picker on upload, and `/dashboard/seeker/documents` page for re-categorization. `EMPLOYER_VISIBLE_DOCUMENT_TYPES` constant established as the single source of truth for 14-03's identity exclusion.

## What Was Built

### Migration 019 (`supabase/migrations/019_seeker_documents.sql`, 131 LOC)
- Transaction-wrapped (`BEGIN; ... COMMIT;`) so partial failure rolls back cleanly
- `CREATE TABLE IF NOT EXISTS public.seeker_documents` with `document_type text NOT NULL CHECK IN ('cv','certificate','reference','identity','other')` — closed enum at the DB layer
- 4 RLS policies (SELECT / INSERT / UPDATE / DELETE) all keyed on `seeker_id IN (SELECT id FROM seeker_profiles WHERE user_id = auth.uid())` — pattern matches `seeker_contacts`
- Indexes on `(seeker_id)` and `(seeker_id, document_type)` for the common access paths
- LATERAL `unnest(sp.document_urls)` backfill INSERT, idempotent via `NOT EXISTS` guard on `(storage_path, seeker_id)` pair — safe to re-run
- `COMMENT ON COLUMN public.seeker_profiles.document_urls` set with full deprecation prose; column preserved (drop in future cleanup phase)
- Applied live as `20260428053314_019_seeker_documents`. Backfill assertion `0=0` — no legacy `document_urls` data on this DB

### Type vocabulary (`src/types/domain.ts`)
- `DocumentType = 'cv' | 'certificate' | 'reference' | 'identity' | 'other'` union
- `DOCUMENT_TYPE_LABELS: Record<DocumentType, string>` for UI rendering
- `EMPLOYER_VISIBLE_DOCUMENT_TYPES = ['cv', 'certificate', 'reference']` — explicitly excludes `'identity'` and `'other'`. Single source of truth consumed by 14-03's listing query and Edge Function.
- `SeekerDocument` interface (id, seeker_id, storage_path, document_type, filename, uploaded_at, file_size_bytes)
- `SeekerProfileData.document_urls` annotated `@deprecated` JSDoc

### Upload flow
- **`src/components/ui/DocumentUploader.tsx`** (new, 310 LOC, Option 2 — owns drop UI rather than wrapping FileDropzone): per-file type picker required before upload; commit gated until every staged file has a type; INSERT into `seeker_documents` after Storage upload completes. Does NOT touch `seeker_profiles.document_urls`. Toast feedback for failures.
- **`src/pages/onboarding/steps/SeekerStep3Qualifications.tsx`** — `<FileDropzone>` swapped to `<DocumentUploader>`. `existingPaths={defaultValues?.document_urls}` removed; no validation gate added (still allows skipping document upload). `FileDropzone` import removed entirely.
- **`src/pages/onboarding/SeekerOnboarding.tsx`** — incidental cleanup: `document_urls` dropped from upsert payload spread.

### Re-categorization page (`src/pages/dashboard/seeker/SeekerDocuments.tsx`, 278 LOC)
- Lists docs scoped to current seeker via `useSeekerProfileId` (RLS handles silent zero-row case if `seekerProfileId` is null)
- Per-row `<Select>` for `document_type` with instant save (`onValueChange` calls `.update({ document_type })`)
- Per-row Delete: removes Storage object first, then DB row; surface a "row removal failed — refresh to verify" toast if storage delete succeeded but row delete failed
- Layout/spacing patterns mirror `MyApplications.tsx`
- No identity-specific UI gate (the seeker is allowed to see their own identity docs)

### Routing (`src/main.tsx`)
- `/dashboard/seeker/documents` registered with `ProtectedRoute requiredRole="seeker"` wrapper, ordered BEFORE `/dashboard/seeker` per the existing route-specificity convention

### AUTH-FIX-02 mitigation (`src/components/layout/ProtectedRoute.tsx`)
- Guards against the c6066ea 3s `loadRoleWithTimeout` flipping `loading=false` with `role=null` and bouncing protected routes through `/auth/select-role` on every navigation
- Symptom-mitigation only — root-cause fix landed separately in `2fce4b7` (single AuthProvider)
- Bundled here because the regression surfaced during BFIX-03 UAT

## Decisions Made

| Decision | Rationale |
|---|---|
| DocumentUploader Option 2 (own drop UI) over Option 1 (wrap FileDropzone) | FileDropzone's per-file UI extension surface would have required >30 LOC of invasive edits; full reimplementation kept the changes contained to one new file |
| `seeker_profiles.document_urls` preserved + commented, not dropped | Reversibility — Task 0 scout was clean (zero readers), but a future change might surface forgotten consumers; column drop deferred to dedicated cleanup phase |
| Seeker-only RLS in 019; employer policy deferred to 14-03 | Each migration owns one capability. Default-deny holds between migrations — no risk of premature employer access |
| `EMPLOYER_VISIBLE_DOCUMENT_TYPES` as exported constant | 14-03 imports it for both the listing query AND the Edge Function whitelist — defence-in-depth at three layers (DB CHECK + listing-query filter + Edge Function whitelist) |
| AUTH-FIX-02 bundled here | Surfaced during BFIX-03 UAT — couldn't ship the new route reliably without it. Mitigation logged as separate REQUIREMENTS.md entry so root-cause work tracked separately |

## Deviations from Plan

- **Task 4 implementation choice:** plan suggested Option 1 (wrap FileDropzone) preferred unless >30 LOC invasive. Executor went Option 2 — full ownership of drop UI. Trade-off documented above.
- **AUTH-FIX-02 mitigation added in scope:** not originally in 14-02; surfaced during UAT. Bundled because the new route required it to function. REQUIREMENTS.md updated with AUTH-FIX-02 entry to track root-cause work separately.
- **MCP-QUIRK-01 logged in REQUIREMENTS.md** as session note (project-scoped MCP isolation) — incidental documentation update.

## Deferrals carried forward

- **Migration 020 disk filename / live registry version drift:** disk = `020_seeker_documents_employer_policy.sql`, live registry = `20260429031148`. SQL bodies identical; cosmetic. Tracked in cleanup-backlog item 5.
- **TEST-01 (Playwright smoke):** deferred per Phase 14 contract.

## Self-Check

- [x] Migration 019 applied; `seeker_documents` table + 4 RLS policies + 2 indexes live
- [x] Backfill counts: 0 expected, 0 actual (no legacy data)
- [x] `domain.ts:183` DocumentType union; `:185-191` labels; `:200` `EMPLOYER_VISIBLE_DOCUMENT_TYPES = ['cv','certificate','reference']`; `:202-210` SeekerDocument interface
- [x] DocumentUploader inserts to `seeker_documents` after upload (`:149-153`)
- [x] SeekerStep3Qualifications swapped to DocumentUploader; zero `document_urls` references
- [x] SeekerDocuments page: instant-save type change, delete with Storage cleanup, scoped to current seeker
- [x] `/dashboard/seeker/documents` route registered before `/dashboard/seeker` parent route (`main.tsx:155-161`)
- [x] `grep -rn "document_urls" src/ supabase/functions/` returns ONLY `src/types/domain.ts:176` (the deprecated type itself)
- [x] AUTH-FIX-02 ProtectedRoute guard in place; root-cause work tracked separately
- [x] Closing commit: `5a228e0 feat(14-02): seeker_documents table + per-file categorization + re-categorize page` (2026-04-29)

## Self-Check: PASSED
