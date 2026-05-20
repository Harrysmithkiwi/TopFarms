---
phase: 22
slug: pre-launch-p0-closure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-20
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `.planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing) + `@testing-library/react` for component tests |
| **Config file** | `vitest.config.ts` (repo root, existing) |
| **Quick run command** | `pnpm test <pattern>` |
| **Full suite command** | `pnpm test` |
| **Phase gate command** | `pnpm test && pnpm exec tsc -b` |
| **Estimated runtime** | ~25s full suite, sub-second per-spec |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test <pattern matching changed files>`
- **After every plan wave:** Run `pnpm test` (full suite)
- **Before `/gsd:verify-work`:** Full suite green + `pnpm exec tsc -b` clean + operator-confirmed prod UAT (5 smokes) in plan 22-04
- **Max feedback latency:** ~25 seconds (full suite); sub-second per-spec

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 22-00-01 | 00 | 0 | SIGNUP-01 | unit + integration (RTL, mocked supabase.auth.signUp) | `pnpm test tests/signup-toast-persistence.test.tsx` | ❌ W0 | ⬜ pending |
| 22-00-02 | 00 | 0 | HOMEBUG-02 | static-source guard (readFileSync + grep) | `pnpm test tests/featured-listings-tier-type.test.ts` | ❌ W0 | ⬜ pending |
| 22-00-03 | 00 | 0 | HOMEBUG-03 | static-source guard for `ACCOMMODATION_FILTER_TO_DB` constant | `pnpm test tests/jobsearch-accommodation-remap.test.ts` | ❌ W0 | ⬜ pending |
| 22-00-04 | 00 | 0 | HOMEBUG-01, UXBUG-01, SIGNUP-01, HOMEBUG-02, HOMEBUG-03 | manual UAT markdown (5 prod smoke steps) | (operator-driven in plan 22-04) | ❌ W0 | ⬜ pending |
| 22-01-* | 01 | 1 | SIGNUP-01 | unit + integration | `pnpm test tests/signup-toast-persistence.test.tsx` | ⏳ via W0 | ⬜ pending |
| 22-02-* | 02 | 1 | HOMEBUG-02 | static-source guard | `pnpm test tests/featured-listings-tier-type.test.ts` | ⏳ via W0 | ⬜ pending |
| 22-03-* | 03 | 1 | HOMEBUG-03 | static-source guard | `pnpm test tests/jobsearch-accommodation-remap.test.ts` | ⏳ via W0 | ⬜ pending |
| 22-04-* | 04 | 2 | HOMEBUG-01, UXBUG-01, SIGNUP-01, HOMEBUG-02, HOMEBUG-03 | manual UAT (operator-driven prod smokes) | (see `tests/p0-prod-smoke-UAT.md`) | ⏳ via W0 | ⬜ pending |
| 22-05-* | 05 | 3 | MAIL-01, MAIL-02 | docs audit (no new test — empirical evidence already captured by `.planning/phases/15-email-pipeline-deploy/15-02-EVIDENCE/`) | n/a | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/signup-toast-persistence.test.tsx` — covers SIGNUP-01 (Sonner toast persists past 4000ms default + `signUpWithRole` AuthError → `toast.error` invocation path)
- [ ] `tests/featured-listings-tier-type.test.ts` — covers HOMEBUG-02 (static-source guard: `FeaturedListings.tsx` MUST NOT contain string literals `'featured'` or `'premium'` inside `.in('listing_tier', [...])`; MUST contain integer values `[2, 3]`)
- [ ] `tests/jobsearch-accommodation-remap.test.ts` — covers HOMEBUG-03 (static-source guard: `JobSearch.tsx` MUST contain `ACCOMMODATION_FILTER_TO_DB` lookup constant; `.overlaps('employer_profiles.accommodation_extras', ...)` MUST be fed remapped Title Case values, not raw URL params)
- [ ] `tests/p0-prod-smoke-UAT.md` — operator UAT markdown for plan 22-04 with 5 numbered smoke steps (one per P0 item), each with Browser URL + DevTools Network expected status + DOM element to observe

**Framework install:** none required — vitest + RTL + sonner mock pattern already in repo from Phase 17 / 18.1 / 20.1 / 21 precedent.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `get_platform_stats` RPC returns `{ jobs, seekers, matches }` from prod DB and `CountersSection` widget renders the three numbers | HOMEBUG-01 | RPC + UI render is production state, not local — local DB is reconciled but the requirement is "production E2E pending" | Load `https://top-farms.vercel.app/` → DevTools Network → assert `POST /rest/v1/rpc/get_platform_stats` returns 200 with shape `{ jobs:N, seekers:N, matches:N }` → assert counters widget DOM contains those three numbers |
| Step 4 Accommodation ChipSelector renders all 8 `ACCOMMODATION_EXTRAS_OPTIONS` chips and a selection round-trips into Step 7 preview | UXBUG-01 | UI render against prod-deployed schema — local code shipped (`d5e8dfc`); requirement is "production E2E pending" | Sign in as employer → onboarding Step 4 → confirm 8 chips render with Title Case labels matching `src/types/domain.ts:327-336` → select 2 chips → advance to Step 7 → confirm selected values appear in preview summary |
| SIGNUP-01 toast is visible and persistent for `email_address_invalid` | SIGNUP-01 | UI render against prod build; Sonner duration / Toaster mount behaviour is environment-dependent | Open prod `/signup` → enter invalid email like `not_an_email` → click Create account → assert toast appears AND remains visible >10s with error text |
| HOMEBUG-02 fix: home page loads featured listings without 400 | HOMEBUG-02 | Postgres int-cast behaviour is server-side; requires prod-deployed code | Load prod `/` → DevTools Network → assert `GET /rest/v1/jobs?select=...&listing_tier=in.(...)` returns 200 → assert featured listing cards render |
| HOMEBUG-03 fix: `/jobs` Couples + Accommodation filters return 200 | HOMEBUG-03 | PostgREST array overlap behaviour depends on server-side column values; requires prod-deployed code | Load prod `/jobs` → toggle Couples filter → DevTools Network confirm 200 → toggle Accommodation chip (e.g. "Pets allowed") → confirm 200 + filtered results match expectation |
| MAIL-01 / MAIL-02 audit: REQUIREMENTS.md state is consistent with empirical evidence in `15-02-EVIDENCE/` | MAIL-01, MAIL-02 | No new behaviour to verify — empirical evidence captured 2026-05-03; this is a docs audit | Read `REQUIREMENTS.md:18-19` → confirm `[x]` state → cross-check `.planning/phases/15-email-pipeline-deploy/15-02-SUMMARY.md` cites pg_net 200 + per-applicant 4/4 + DKIM=pass → if any drift, file partial-close note per CLAUDE §7 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies declared
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (manual UAT in 22-04 is gated by automated W0 specs in 22-01/02/03)
- [ ] Wave 0 covers all MISSING references (4 files listed above)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s per spec; < 30s full suite
- [ ] `nyquist_compliant: true` set in frontmatter (after planner produces W0 plan)

**Approval:** pending
