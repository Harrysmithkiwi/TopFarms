---
phase: 11
slug: backend-dependent-features
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 11-01-01 | 01 | 1 | SONB-02 | unit | `npx vitest run src/components/ui/FileDropzone.test.tsx -x` | Partial | ⬜ pending |
| 11-01-02 | 01 | 1 | SONB-02 | unit | `npx vitest run src/pages/onboarding/steps/SeekerStep3Qualifications.test.tsx -x` | Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/pages/onboarding/steps/SeekerStep3Qualifications.test.tsx` — covers SONB-02 upload zone render
- [ ] `src/components/ui/FileDropzone.test.tsx` — covers multiple mode behavior (check if exists first)

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
