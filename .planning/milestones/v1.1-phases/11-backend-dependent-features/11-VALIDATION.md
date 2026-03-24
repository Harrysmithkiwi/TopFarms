---
phase: 11
slug: backend-dependent-features
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-23
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + React Testing Library (existing) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-00 | 01 | 0 | SONB-02 | scaffold | `test -f tests/file-dropzone-multi.test.tsx && test -f tests/seeker-step3-documents.test.tsx` | Wave 0 creates | ⬜ pending |
| 11-01-01 | 01 | 1 | SONB-02 | unit | `grep -c "seeker-documents" supabase/migrations/016_phase11_backend_features.sql` | N/A (SQL) | ⬜ pending |
| 11-01-02 | 01 | 1 | SONB-02 | unit | `npx vitest run tests/file-dropzone-multi.test.tsx tests/seeker-step3-documents.test.tsx --reporter=verbose` | Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/file-dropzone-multi.test.tsx` — covers FileDropzone multiple mode: rendering, existingPaths display, maxFiles limit, backward compat (created by Plan 01, Task 0)
- [x] `tests/seeker-step3-documents.test.tsx` — covers SeekerStep3 document upload: Documents section render, FileDropzone presence, document_urls in onComplete (created by Plan 01, Task 0)

*Existing infrastructure covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Match pool estimate updates in LivePreviewSidebar as wizard fields change | SC-1 | Requires running Supabase RPC | Fill shed type, region, accommodation in PostJob wizard; verify sidebar updates after 500ms debounce |
| Seeker document upload stores files in private bucket | SONB-02 | Requires Supabase Storage | Upload a PDF in SeekerStep3; verify file appears in `seeker-documents` bucket, not accessible without auth |
| Completion screen shows top 3 matched jobs | SC-3 | Requires pre-computed match scores | Complete seeker onboarding; verify matched jobs appear within 30 seconds |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved
