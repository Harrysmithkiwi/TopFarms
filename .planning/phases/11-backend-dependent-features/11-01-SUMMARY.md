---
phase: 11-backend-dependent-features
plan: 01
subsystem: database, ui, storage
tags: [supabase, storage, rls, react, dropzone, migration, document-upload]

# Dependency graph
requires:
  - phase: 08-wizard-field-extensions
    provides: SeekerProfileData type, SeekerStep3Qualifications component, SeekerOnboarding wizard
  - phase: 07-ui-primitives
    provides: FileDropzone component pattern

provides:
  - Private seeker-documents Supabase Storage bucket with RLS
  - document_urls text[] column on seeker_profiles
  - estimate_match_pool RPC function (used by Plan 02)
  - FileDropzone multi-file mode with private bucket support
  - SeekerStep3 document upload zone (PDF/DOC/DOCX/JPG/PNG, 10MB, 5 files)
  - document_urls persisted through SeekerOnboarding upsert cycle

affects: [11-02-plan, plan-02-match-pool-estimate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Private Supabase Storage bucket with auth.uid() path-prefix RLS (same as employer-documents pattern)"
    - "FileDropzone dual-mode: single-file (backward compat, public URL) vs multi-file (storage paths for private buckets)"
    - "Wave 0 TDD: failing tests written before implementation, turned GREEN after"

key-files:
  created:
    - supabase/migrations/016_phase11_backend_features.sql
    - tests/file-dropzone-multi.test.tsx
    - tests/seeker-step3-documents.test.tsx
  modified:
    - src/components/ui/FileDropzone.tsx
    - src/types/domain.ts
    - src/pages/onboarding/steps/SeekerStep3Qualifications.tsx
    - src/pages/onboarding/SeekerOnboarding.tsx

key-decisions:
  - "FileDropzone multi-file mode uses storage paths (not public URLs) for private seeker-documents bucket — onUploadsComplete returns paths, privateMode prop controls this"
  - "Single-file mode behavior unchanged — onUploadComplete callback still receives public URL, existing callers unaffected"
  - "document_urls stored as text[] of storage paths; createSignedUrl needed at display time (not yet wired, deferred)"
  - "estimate_match_pool RPC uses DEFAULT NULL params for all three — callers can pass any combination or none"

patterns-established:
  - "Private bucket multi-file: store path, not publicUrl. Use createSignedUrl for display."
  - "FileDropzone requires onUploadComplete prop even in multiple mode — pass empty arrow fn as stub"

requirements-completed: [SONB-02]

# Metrics
duration: 3min
completed: 2026-03-22
---

# Phase 11 Plan 01: Backend Features + Document Upload Summary

**Private seeker-documents Storage bucket with RLS, FileDropzone multi-file private mode, document upload in SeekerStep3, and estimate_match_pool RPC**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-22T22:23:41Z
- **Completed:** 2026-03-22T22:26:55Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Migration 016 creates seeker-documents private bucket with 3 RLS policies (upload/view/delete), adds document_urls text[] to seeker_profiles, and creates estimate_match_pool RPC
- FileDropzone extended with multi-file mode: sequential upload, file list UI with remove buttons, maxFiles enforcement, privateMode flag for path-vs-URL storage
- SeekerStep3Qualifications has a Documents section accepting PDF/DOC/DOCX/JPG/PNG (10MB/file, 5 files max); document_urls flows through SeekerOnboarding loadProfile and upsert cycle
- Wave 0 tests (7/7) pass GREEN; full suite (108 tests) passes with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 0: Wave 0 test scaffolds** - `7d6c071` (test)
2. **Task 1: Database migration 016** - `4299de0` (feat)
3. **Task 2: FileDropzone multi-mode + SeekerStep3 wiring** - `dab46b1` (feat)

## Files Created/Modified

- `supabase/migrations/016_phase11_backend_features.sql` - seeker-documents bucket, 3 RLS policies, document_urls column, estimate_match_pool RPC
- `tests/file-dropzone-multi.test.tsx` - Wave 0 tests for FileDropzone multiple mode
- `tests/seeker-step3-documents.test.tsx` - Wave 0 tests for SeekerStep3 document upload
- `src/components/ui/FileDropzone.tsx` - Added multiple, maxFiles, onUploadsComplete, existingPaths, privateMode props; multi-file render path
- `src/types/domain.ts` - Added document_urls?: string[] to SeekerProfileData
- `src/pages/onboarding/steps/SeekerStep3Qualifications.tsx` - Documents section with FileDropzone, documentPaths state, document_urls in onComplete
- `src/pages/onboarding/SeekerOnboarding.tsx` - document_urls threaded through loadProfile + step 3 defaultValues

## Decisions Made

- FileDropzone `onUploadComplete` remains required even in multiple mode — callers in multiple mode pass an empty stub `() => {}` to avoid breaking the prop contract
- `privateMode` flag controls whether onUploadsComplete receives a raw storage path or a public URL — private buckets should use signed URLs at display time (not yet wired)
- estimate_match_pool RPC uses `DEFAULT NULL` parameters so it can be called with any combination of region/shed_types/accommodation filters

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — seeker-documents bucket and RLS are created via migration 016. Supabase migration must be run (`supabase db push`) before document upload works in production.

## Next Phase Readiness

- Migration 016 must be applied to remote Supabase before testing document upload end-to-end
- estimate_match_pool RPC is ready for Plan 02 (MatchPoolEstimate widget)
- document_urls display (signed URLs) is not yet implemented — stored paths are correct but viewing uploaded documents requires createSignedUrl calls

---
*Phase: 11-backend-dependent-features*
*Completed: 2026-03-22*

## Self-Check: PASSED

All files confirmed present and all commits verified in git history.
