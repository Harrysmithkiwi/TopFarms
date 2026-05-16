---
created: 2026-05-05T04:35:00Z
title: MatchCircle sizing — bump to Brand Spec §4 (56px / 88px)
area: ui-polish
phase: post-launch / pre-launch design polish
files:
  - src/components/ui/MatchCircle.tsx (current sizes: sm:38 / md:50 / lg:72)
  - src/components/ui/MatchBreakdown.tsx (consumer)
  - src/pages/dashboard/seeker/MyApplications.tsx (consumer — application cards)
  - src/pages/jobs/JobSearch.tsx (consumer — search results list)
  - src/pages/dashboard/employer/ApplicantDashboard.tsx (consumer — applicant cards)
  - .planning/v2-migration/PHASE-19-KNOWN-STATE.md §"MatchCircle sizing discrepancy vs Brand Spec §4"
  - .planning/v2-migration/TopFarms_Brand_Spec_v2.md §4
---

## Problem

Brand Spec v2.0 §4 specifies match-circle sizes as **56px on list rows** and **88px on detail pages**. The component (post-Phase-2 migration) ships with `sm: 38px / md: 50px / lg: 72px`. Phase 2 stayed conservative on layout-shifting changes — token + a11y + typography migrated, sizing was not bumped because:

1. Spec lists only 2 sizes (56 / 88); current has 3 (38 / 50 / 72) — `sm` has no spec equivalent and is used in compact list rows where 56px would feel oversized
2. Bumping `md` from 50→56 and `lg` from 72→88 affects every consumer (search results, applicant cards, application cards) — non-trivial visual shift across many surfaces
3. Phase 2 stayed conservative (token-only, no layout shift) to keep the brand-critical migration safe

Source: `.planning/v2-migration/PHASE-19-KNOWN-STATE.md` deferred from Phase 19 closeout 2026-05-05.

## Proposed approach

1. Bump `md` 50→56, `lg` 72→88 to match Brand Spec exactly
2. Decide `sm` fate — keep at 38 (compact list rows) or drop entirely if no consumer needs the smaller variant
3. Surface-by-surface visual verification in Vercel preview before merging — layout shift is the risk
4. Coordinate with the warn-text-on-bg token todo (same design polish pass)

## Acceptance

- MatchCircle component sizes align with Brand Spec §4 (56 list / 88 detail)
- All consumer surfaces verified visually in Vercel preview (search results, application cards, applicant cards, match breakdown panels)
- No layout regression on mobile (320px minimum width) or desktop
- Brand Spec §4 updated if `sm: 38` is kept (currently undocumented variant)

## Notes

Recommended pairing with the `--color-warn-text-on-bg` token todo (same date) as a single pre-launch design polish pass. Both items are spec-compliance polish, not migration work — Phase 19 + 19b are otherwise complete.
