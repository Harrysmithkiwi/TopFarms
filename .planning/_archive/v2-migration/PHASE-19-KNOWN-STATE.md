# Phase 19 — Known State / Carryforward to 19b

A running log of mid-migration findings deferred to Phase 19b (Tier 2 — deeper dashboards) or post-Phase-19 work. Captured during Phase 19 Tier 1 execution so nothing is lost in handoff.

---

## Tier 2 surfaces — still rendering v1 chrome via Phase 0 alias chain

After Phase 1 (primitives) shipped, **employer-side surfaces remain visibly v1-styled** (brown/cream still present) because their composed components and onboarding wizards are out of Tier 1 scope. This is **expected and intentional**.

Observed by Harry on Vercel preview after Phase 1 (commit `3cead71`, 2026-05-04 evening): signing in as an employer invokes the old v1 design system. Logged here so this is not re-discovered as a "regression" during Phase 19b planning.

### Tier 2 surfaces awaiting Phase 19b execution

| Component | v1 ref count | Phase | Notes |
|---|---|---|---|
| `ApplicantPanel.tsx` | 60 | **19b — own focused sub-task** | Heaviest single file in the migration; audit-flagged for dedicated 6-8h sub-task |
| `ApplicantDashboard.tsx` | 29 | 19b | Employer applicant management view |
| `MyApplicationsSidebar.tsx` | 28 | 19b | Used on employer dashboard |
| `JobDetailSidebar.tsx` | 42 | 19b | Employer-side variant of job detail |
| `LivePreviewSidebar.tsx` | 21 | 19b | Live job-posting preview pane |
| `TierCard.tsx` | 15 | 19b | Employer verification tier display |
| `DocumentUploader.tsx` | 25 | 19b | Employer doc upload flow (BFIX-02 surface) |
| `EmployerVerification.tsx` (page) | 37 | 19b | 5-tier verification hub |
| Employer onboarding wizard internals (Step1–Step8) | varies | 19b | EmployerOnboarding.tsx + step files |
| Seeker onboarding wizard internals (Step1–Step8) | varies | 19b | SeekerOnboarding.tsx + step files. **Exception:** Step3Culture.tsx had focus-ring touched in Phase 1 (no token rename) |

### Why the alias chain keeps these working

The Phase 0 alias trick ensures these surfaces still **render and function correctly** — `bg-moss` on an employer card resolves through `--color-moss → --color-brand → #16A34A`, so the colour is right at runtime. Only the structural Tailwind class names remain on v1 nomenclature pending the Phase 19b sweep.

When verifying the Vercel preview as a logged-in employer, expect surfaces that look "almost v2" but still have v1 class references in DevTools. **This is the alias chain working as designed**, not a regression.

---

## MatchCircle sizing discrepancy vs Brand Spec §4

Brand Spec §4 specifies match-circle sizes as **56px on list rows** and **88px on detail pages**. The component (post-Phase-2) uses `sm: 38px / md: 50px / lg: 72px`. Token + a11y + typography migrated in Phase 2 but sizing was **not** bumped because:

1. Spec lists only 2 sizes (56 / 88); current has 3 (38 / 50 / 72) — `sm` has no spec equivalent and is used in compact list rows where 56px would feel oversized
2. Bumping `md` from 50→56 and `lg` from 72→88 affects every consumer (search results, applicant cards, application cards) — non-trivial visual shift across many surfaces
3. Phase 2 stayed conservative (token-only, no layout shift) to keep the brand-critical migration safe

Recommended resolution path: post-Phase-19 design polish pass after Tier 1 + Tier 2 consumer pages have completed their own migration. Layout shift can then be verified surface-by-surface.

---

## VerificationBadge hardcoded hex values for trust tiers

Per Phase 2 audit, `VerificationBadge.tsx` carries hardcoded amber-dark values (`#9a6c1a` for pending clock icon, `#b45309` for fully_verified text) for legibility on light amber backgrounds. The brand spec's `--color-warn` (`#F59E0B`) is too bright for small UI text on `--color-warn-bg`.

Phase 2 left these as-is (kept the hardcoded hex). Same situation as the pipeline pill `Shortlisted` row in DESIGN.md (`#92400E`) and Tag/InfoBox `hay` variant (`#7A5C00`).

A coherent fix would introduce a `--color-warn-text-on-bg` token (e.g., `#92400E`) and use it consistently across pipeline pills, tags, info boxes, and the verification badge. Defer to post-Phase-19 design polish.

---

## (further entries added as later phases reveal them)
