# Phase 7: UI Primitives - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the 9 shared primitive components (ChipSelector, StatusBanner, Breadcrumb, StatsStrip, Timeline, StarRating, Pagination, SearchHero, LivePreviewSidebar) with correct prop contracts, ready for consumption by wizard steps and page integrations in Phases 8-11. No page integration or data wiring — components must work in isolation.

</domain>

<decisions>
## Implementation Decisions

### ChipSelector
- Layout controlled via `columns` prop (1, 2, 3, or 'inline') — consumers pass `columns={3}` for 2x3 grids, `columns={1}` for stacked, etc.
- Single-select mode uses auto-deselect (radio behavior) — clicking a new chip immediately deselects the previous one
- Multi-select mode allows toggling chips on/off independently
- Selected state: moss border + rgba moss bg + visible checkmark icon (per SPEC)
- Optional icon prop per chip option — farm type chips show icons, shed type chips don't
- Value shape is `string[]` (decided pre-Phase 7 — boolean columns need `booleanColumnsToChipArray()` mapping in Phase 8)

### LivePreviewSidebar
- Match pool section shows static example numbers as placeholder (e.g., "47 seekers in region / 12 with shed experience / 8 actively looking") with a subtle "Estimates available soon" note — real data wired in Phase 11
- Completeness meter animates smoothly (percentage counts up, progress bar fills) as wizard fields are completed
- Mini card preview is a simplified card showing job title, farm name, location, salary range, and key tags — not a full replica of SearchJobCard
- AI tip box renders with a static placeholder tip (e.g., "Tip: Listings with accommodation details get 40% more applications") — real AI tips wired later
- Sticky positioning, 320px width, white bg, fog border, 14px radius per SPEC

### SearchHero
- Quick-filter pills represent a mix of sectors and popular role types (e.g., "Dairy", "Sheep & Beef", "Farm Manager", "Herd Manager", "Relief Milker")
- Clicking a pill replaces current filters and navigates to search results — exclusive, not additive
- Region select is a standard dropdown with 8 NZ regions — consistent with Select component used elsewhere
- Gradient background per SPEC

### StatusBanner
- Warm and encouraging copy tone: "Great news — you've been shortlisted!", "You've got an interview invitation!", "Congratulations — you've received an offer!", "Unfortunately, this application wasn't successful."
- CTAs rendered inside the banner component via props (e.g., Accept/Decline buttons for interview variant)
- Declined variant: background at 60% opacity, text remains fully readable
- Four variants: shortlisted (hay-lt), interview (green), offer (green), declined (red-lt at 60% bg opacity)

### Claude's Discretion
- Breadcrumb separator style and active/inactive visual treatment
- StatsStrip column spacing and responsive breakpoints
- Timeline dot size, line thickness, and animation (if any)
- StarRating hover interaction details (half-star support, hover preview)
- Pagination edge cases (ellipsis for many pages, first/last buttons)
- Exact spacing, typography sizes, and transitions across all components

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### SPEC wireframes and component definitions
- `SPEC.md` §6.3 (Employer Onboarding) — ChipSelector usage in farm type grid, shed type row, career development chips, accommodation extras
- `SPEC.md` §6.4 (Post Job Wizard) — LivePreviewSidebar spec (completeness meter, mini card, match pool, AI tip), ChipSelector in shed type/visa chips
- `SPEC.md` §6.5 (Job Detail Page) — Breadcrumb bar spec (44px, white bg, fog border), StatsStrip (4-col), Timeline (meadow dots + connecting lines)
- `SPEC.md` §6.6 (Job Search) — SearchHero with gradient, search bar, region select, quick-filter pills; Pagination (34x34px, fog border, active = moss bg)
- `SPEC.md` §6.8 (My Applications) — StatusBanner variants with colors and CTAs
- `SPEC.md` §6.9 (Seeker Onboarding) — ChipSelector in sector chips, licence chips, housing sub-options, preferred regions
- `SPEC.md` §6.10 (Star rating) — StarRating in testimonials and farm profile card

### Design tokens
- `src/index.css` — All color tokens (moss, hay, fog, cream, meadow, soil, etc.), typography (Fraunces, DM Sans, DM Mono)

### Existing component patterns
- `src/components/ui/Tag.tsx` — Variant color mapping pattern (7 variants using `cn()`)
- `src/components/ui/Card.tsx` — Base card pattern (12px radius, fog border, hover prop)
- `src/components/ui/ProgressBar.tsx` — Progress bar with moss→meadow gradient (reusable for completeness meter)
- `src/components/ui/Select.tsx` — Select dropdown pattern (reuse for SearchHero region select)
- `src/components/landing/TestimonialsSection.tsx` — Existing display-only StarRating (lines 29-46) to extract and upgrade to interactive input

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ProgressBar` component: moss→meadow gradient progress bar — reusable for LivePreviewSidebar completeness meter
- `Tag` component: 7-variant color system with `cn()` — same pattern works for StatusBanner variants
- `Card` component: fog border + 12px radius convention — LivePreviewSidebar can extend this
- `Select` component: dropdown pattern for SearchHero region select
- `SkillsPicker`: checkbox-based selection pattern — ChipSelector replaces this approach with chip-based selection for visual fields
- Display-only `StarRating` in TestimonialsSection (SVG stars, hay fill) — extract and upgrade to interactive input component

### Established Patterns
- Tailwind CSS with custom design tokens via `@theme` in index.css — all new components must use these tokens
- `cn()` utility from `@/lib/utils` for className merging
- Components extend HTML element interfaces (e.g., `HTMLAttributes<HTMLDivElement>`) for native prop passthrough
- Components live in `src/components/ui/` directory

### Integration Points
- New primitives export from `src/components/ui/` — consumed by wizard steps (Phase 8) and page layouts (Phase 9-10)
- ChipSelector will be used across all three wizards (employer, job posting, seeker) in Phase 8
- LivePreviewSidebar integrates into post job wizard steps 2-5 in Phase 8
- SearchHero integrates into job search page in Phase 9
- StatusBanner integrates into My Applications page in Phase 9

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. All visual specifications come from SPEC.md wireframe descriptions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-ui-primitives*
*Context gathered: 2026-03-21*
