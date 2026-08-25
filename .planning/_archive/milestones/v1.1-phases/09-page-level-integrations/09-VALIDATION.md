---
phase: 9
slug: page-level-integrations
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None detected — no test framework installed |
| **Config file** | None — manual verification against SPEC wireframes |
| **Quick run command** | `npm run build` (TypeScript compilation check) |
| **Full suite command** | `npm run build && npm run lint` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build && npm run lint`
- **Before `/gsd:verify-work`:** Full build must be green + manual SPEC verification
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | SRCH-01 | visual | `npm run build` | ✅ | ⬜ pending |
| 09-01-02 | 01 | 1 | SRCH-05 | smoke | `npm run build` | ✅ | ⬜ pending |
| 09-01-03 | 01 | 1 | SRCH-08 | smoke | `npm run build` | ✅ | ⬜ pending |
| 09-01-04 | 01 | 1 | SRCH-02 | visual | `npm run build` | ✅ | ⬜ pending |
| 09-02-01 | 02 | 1 | SRCH-06 | interaction | `npm run build` | ✅ | ⬜ pending |
| 09-02-02 | 02 | 1 | SRCH-03 | visual | `npm run build` | ✅ | ⬜ pending |
| 09-02-03 | 02 | 1 | SRCH-04 | visual | `npm run build` | ✅ | ⬜ pending |
| 09-03-01 | 03 | 1 | JDET-01 | visual | `npm run build` | ✅ | ⬜ pending |
| 09-03-02 | 03 | 1 | JDET-02 | visual | `npm run build` | ✅ | ⬜ pending |
| 09-03-03 | 03 | 1 | JDET-07 | visual | `npm run build` | ✅ | ⬜ pending |
| 09-03-04 | 03 | 1 | JDET-08 | visual | `npm run build` | ✅ | ⬜ pending |
| 09-04-01 | 04 | 2 | ADSH-01 | visual | `npm run build` | ✅ | ⬜ pending |
| 09-04-02 | 04 | 2 | ADSH-02 | interaction | `npm run build` | ✅ | ⬜ pending |
| 09-04-03 | 04 | 2 | ADSH-04 | functional | `npm run build` | ❌ W0 | ⬜ pending |
| 09-04-04 | 04 | 2 | ADSH-05 | interaction | `npm run build` | ✅ | ⬜ pending |
| 09-05-01 | 05 | 2 | MAPP-01 | visual | `npm run build` | ✅ | ⬜ pending |
| 09-05-02 | 05 | 2 | MAPP-02 | DB | `npm run build` | ❌ W0 | ⬜ pending |
| 09-05-03 | 05 | 2 | MAPP-03 | visual | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `supabase/migrations/015_phase9_schema.sql` — adds `applications.viewed_at`, `saved_jobs` table, `applications.ai_summary`, `applications.application_notes`
- [ ] `supabase/functions/generate-candidate-summary/` — new Edge Function for AI candidate summaries (ADSH-04)

*Existing infrastructure covers build/lint verification. No test framework gaps — manual verification against wireframes is the validation gate.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SearchHero renders above results | SRCH-01 | Visual layout verification | Load /jobs, confirm hero section appears above results list |
| Filter pills dismiss on click | SRCH-05 | DOM interaction | Apply filters, click × on pill, verify pill removed and URL param cleared |
| One card expanded at a time | SRCH-06 | Accordion behavior | Click card A, expand; click card B, verify A collapses and B expands |
| Pagination syncs to URL | SRCH-08 | URL state sync | Click page 2, verify URL shows `?page=2`, refresh page loads page 2 |
| No double sidebar on dashboard | ADSH-01 | Layout verification | Navigate to applicant dashboard, verify only 260px sidebar, no shell sidebar |
| AI summary cached | ADSH-04 | Network behavior | Open panel, check network tab for API call; close/reopen, verify no second call |
| viewed_at updates on panel open | MAPP-02 | DB state | Employer opens applicant panel, check `applications.viewed_at` in Supabase |
| Status banners match application state | MAPP-01 | Visual variants | View applications in each status, verify banner color/icon matches state |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
