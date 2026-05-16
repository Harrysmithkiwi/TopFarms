---
created: 2026-05-05T04:35:00Z
title: Introduce --color-warn-text-on-bg token for amber-dark legibility
area: ui-polish / design tokens
phase: post-launch / pre-launch design polish
files:
  - src/index.css (add new token under @theme block)
  - src/components/ui/VerificationBadge.tsx (currently hardcodes #9a6c1a + #b45309)
  - src/components/ui/Tag.tsx (hay variant currently hardcodes #7A5C00)
  - src/components/ui/InfoBox.tsx (warn variant — same hardcode pattern)
  - src/components/ui/StatusBanner.tsx ('shortlisted' pipeline pill — currently hardcodes #92400E)
  - .planning/v2-migration/PHASE-19-KNOWN-STATE.md §"VerificationBadge hardcoded hex values for trust tiers"
  - .planning/v2-migration/TopFarms_Brand_Spec_v2.md (warn token spec)
---

## Problem

Several v2 components carry **hardcoded amber-dark hex values** for legibility on light amber backgrounds. Phase 2 audit identified this:

- `VerificationBadge.tsx` — `#9a6c1a` (pending clock icon), `#b45309` (fully_verified text)
- `Tag.tsx` — `#7A5C00` (hay variant text)
- `StatusBanner.tsx` — `#92400E` (`shortlisted` pipeline pill)
- `InfoBox.tsx` — same hay-variant pattern

The brand spec's `--color-warn` (`#F59E0B`) is too bright for small UI text on `--color-warn-bg` (light amber). Result: each component re-invents an "amber-dark" hex inline rather than using a shared token. Source: `.planning/v2-migration/PHASE-19-KNOWN-STATE.md`.

## Proposed approach

1. Introduce a new token `--color-warn-text-on-bg` under the `@theme` block in `src/index.css`. Recommended value: `#92400E` (matches the StatusBanner shortlisted pill — most-tested in production).
2. Replace the 5 inline hardcodes (verification badge ×2, tag, info-box, status banner) with the new token.
3. Verify visual parity in Vercel preview — should be cosmetically identical to current state, just centrally tokenized.
4. Document the new token in `TopFarms_Brand_Spec_v2.md` (warn family).

## Acceptance

- `--color-warn-text-on-bg` defined in `src/index.css` under `@theme`
- All 5 inline hex hardcodes replaced with `var(--color-warn-text-on-bg)` (or Tailwind utility if registered as a color token)
- `grep -rE "#9a6c1a|#b45309|#7A5C00|#92400E" src/` returns 0 matches in component files
- VerificationBadge, Tag (hay variant), InfoBox (warn variant), StatusBanner (shortlisted) render visually unchanged in Vercel preview
- Brand Spec updated to document `--color-warn-text-on-bg` in the warn token family

## Notes

Recommended pairing with the MatchCircle sizing todo (same date) as a single pre-launch design polish pass. Both items deferred from Phase 19 + 19b closeout 2026-05-05; both are Brand Spec compliance, not migration work.
