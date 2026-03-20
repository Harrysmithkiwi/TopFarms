# Phase 7: UI Primitives - Research

**Researched:** 2026-03-21
**Domain:** React component authoring — shared primitive UI components for a Tailwind v4 + Radix UI stack
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**ChipSelector**
- Layout controlled via `columns` prop (1, 2, 3, or 'inline') — consumers pass `columns={3}` for 2x3 grids, `columns={1}` for stacked, etc.
- Single-select mode uses auto-deselect (radio behavior) — clicking a new chip immediately deselects the previous one
- Multi-select mode allows toggling chips on/off independently
- Selected state: moss border + rgba moss bg + visible checkmark icon (per SPEC)
- Optional icon prop per chip option — farm type chips show icons, shed type chips don't
- Value shape is `string[]` (decided pre-Phase 7 — boolean columns need `booleanColumnsToChipArray()` mapping in Phase 8)

**LivePreviewSidebar**
- Match pool section shows static example numbers as placeholder (e.g., "47 seekers in region / 12 with shed experience / 8 actively looking") with a subtle "Estimates available soon" note — real data wired in Phase 11
- Completeness meter animates smoothly (percentage counts up, progress bar fills) as wizard fields are completed
- Mini card preview is a simplified card showing job title, farm name, location, salary range, and key tags — not a full replica of SearchJobCard
- AI tip box renders with a static placeholder tip (e.g., "Tip: Listings with accommodation details get 40% more applications") — real AI tips wired later
- Sticky positioning, 320px width, white bg, fog border, 14px radius per SPEC

**SearchHero**
- Quick-filter pills represent a mix of sectors and popular role types (e.g., "Dairy", "Sheep & Beef", "Farm Manager", "Herd Manager", "Relief Milker")
- Clicking a pill replaces current filters and navigates to search results — exclusive, not additive
- Region select is a standard dropdown with 8 NZ regions — consistent with Select component used elsewhere
- Gradient background per SPEC

**StatusBanner**
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PRIM-01 | ChipSelector component supports single/multi-select with selected state (moss border + rgba bg + checkmark) | Locked prop contract in CONTEXT.md; `cn()` + `string[]` pattern established in codebase |
| PRIM-02 | StatusBanner component renders shortlisted (hay-lt), interview (green), offer (green), declined (red-lt, 60% opacity) variants | Variant map pattern from Tag.tsx; copy strings locked in CONTEXT.md |
| PRIM-03 | Breadcrumb component renders path with separator and active/inactive states | Pure presentational; Claude's Discretion for separator/states |
| PRIM-04 | StatsStrip component renders 3-4 column stat grid with labels and values | CSS grid; Claude's Discretion for breakpoints |
| PRIM-05 | Timeline component renders vertical timeline with meadow dots and connecting lines | CSS pseudo-elements or border-left; meadow token from design system |
| PRIM-06 | StarRating component supports 1-5 star input with yellow/grey states | Extract from TestimonialsSection.tsx display-only; upgrade with onClick/onMouseEnter |
| PRIM-07 | Pagination component renders numbered page buttons (34x34px, fog border, active = moss bg) | SPEC-exact dimensions (34×34px); active = `bg-moss text-white`; fog border inactive |
| PRIM-08 | SearchHero component renders gradient hero with search bar, region select, and quick-filter pills | SPEC §6.6; gradient: soil→dark green linear + radial green glow; region uses existing Select component |
| PRIM-09 | LivePreviewSidebar component renders sticky 320px sidebar with completeness meter, mini card preview, and match pool estimate | SPEC §6.4; reuses ProgressBar; static placeholder data for Phase 7 |
</phase_requirements>

---

## Summary

Phase 7 builds 9 shared primitive components in `src/components/ui/`. This is a pure frontend authoring phase — no Supabase queries, no route wiring, no form submission. Every component is a dumb presentational or controlled-input component that accepts typed props and renders design-system-correct markup.

The codebase already establishes all necessary patterns: `cn()` for class merging, the design token system via `@theme` in `index.css`, `HTMLAttributes<HTMLDivElement>` extension for prop passthrough, Radix UI primitives for accessible interactive elements, and `lucide-react` for icons. None of the 9 primitives require new dependencies beyond what is already installed.

The highest-complexity components are ChipSelector (grid layout + selection state management + icon support) and LivePreviewSidebar (composed component with animation, sticky layout, and multiple internal sub-sections). The remaining 7 components range from trivial (Breadcrumb, StatsStrip) to moderate (StarRating interactive upgrade, SearchHero gradient layout).

**Primary recommendation:** Author all 9 components as isolated, prop-driven units with no internal async state — consumers in Phases 8–11 own data binding. Use `cn()` + Tailwind tokens throughout; never use inline style objects except where CSS variables must be composed dynamically (e.g., rgba with token values).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tailwindcss (v4) | ^4.1.3 | All styling via `@theme` tokens | Already installed; custom tokens defined in `src/index.css` |
| lucide-react | ^0.487.0 | Icons (checkmark, chevron, star, etc.) | Already installed; used across all existing UI components |
| clsx + tailwind-merge | ^2.1.1 / ^3.2.0 | `cn()` class merging | `@/lib/utils` already exports `cn()` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-select | ^2.1.6 | Accessible select dropdown | SearchHero region select — reuse existing `Select` component |
| react (v19) | ^19.1.0 | useState for interactive components | ChipSelector selection state, StarRating hover state |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom chip buttons | @radix-ui/react-toggle-group | Radix adds keyboard nav but adds bundle weight; custom is sufficient for simple chip grids |
| CSS border trick for timeline line | SVG line | CSS border-left is simpler and perfectly adequate for a vertical static timeline |
| lucide Star icon | Custom SVG path | TestimonialsSection already uses a custom SVG path for the star — use lucide `Star` fill approach for the interactive component to keep code clean |

**Installation:** No new packages needed. All dependencies already present.

---

## Architecture Patterns

### Recommended Project Structure
All 9 components live in:
```
src/components/ui/
├── ChipSelector.tsx        # PRIM-01
├── StatusBanner.tsx        # PRIM-02
├── Breadcrumb.tsx          # PRIM-03
├── StatsStrip.tsx          # PRIM-04
├── Timeline.tsx            # PRIM-05
├── StarRating.tsx          # PRIM-06 (replaces display-only version in TestimonialsSection)
├── Pagination.tsx          # PRIM-07
├── SearchHero.tsx          # PRIM-08
└── LivePreviewSidebar.tsx  # PRIM-09
```

TestimonialsSection.tsx retains its local display-only `StarRating` function until Phase 10 (Landing Page pass) — do not modify it in Phase 7 to avoid unintended regressions.

### Pattern 1: Variant Map with `cn()`
**What:** An object keyed by variant name mapping to Tailwind class strings, applied via `cn()`.
**When to use:** StatusBanner (4 variants), any component with named visual states.
**Example:**
```typescript
// Pattern from src/components/ui/Tag.tsx
const variantClasses = {
  shortlisted: 'bg-hay-lt border-hay text-[#7A5C00]',
  interview:   'bg-green-lt border-green text-moss',
  offer:       'bg-green-lt border-green text-moss',
  declined:    'bg-red-lt/60 border-red-lt text-red',
}
```

### Pattern 2: Controlled Input with `string[]` Value
**What:** Component owns no internal selection state — receives `value: string[]` and `onChange: (value: string[]) => void`.
**When to use:** ChipSelector (required by locked decision in CONTEXT.md).
**Example:**
```typescript
interface ChipOption {
  value: string
  label: string
  icon?: React.ReactNode
}

interface ChipSelectorProps {
  options: ChipOption[]
  value: string[]
  onChange: (value: string[]) => void
  mode: 'single' | 'multi'
  columns?: 1 | 2 | 3 | 'inline'
  className?: string
}
```

Single-select: `onChange([option.value])` replaces the entire array (radio behavior).
Multi-select: toggle presence of `option.value` in the array.

### Pattern 3: Composed Component with Sub-sections
**What:** LivePreviewSidebar is a composed component — internal sub-sections (completeness meter, mini card, match pool, AI tip) are private to the file, not exported.
**When to use:** Components with significant internal structure that will never be consumed independently.
**Example:**
```typescript
// Internal sub-components — not exported
function CompletenessMeter({ percent }: { percent: number }) { ... }
function MiniJobCard({ title, farmName, location, salaryRange, tags }: MiniCardProps) { ... }
function MatchPoolEstimate() { ... }
function AITipBox({ tip }: { tip: string }) { ... }

// Only this is exported
export function LivePreviewSidebar({ completenessPercent, jobTitle, ... }: LivePreviewSidebarProps) { ... }
```

### Pattern 4: Extend HTML Element Interface
**What:** Components extend the appropriate HTML element interface to pass through native props (className, onClick, aria-*, etc.)
**When to use:** All 9 primitives should follow this pattern.
**Example:**
```typescript
// Pattern from src/components/ui/Card.tsx
interface BreadcrumbProps extends HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[]
  className?: string
}
```

### Anti-Patterns to Avoid
- **Inline style for colors:** Never use `style={{ backgroundColor: '#2d5016' }}`. Use Tailwind tokens: `bg-moss`, `text-hay`, etc. Only use inline style when composing rgba with a token (e.g., `style={{ backgroundColor: 'rgba(45,80,22,0.07)' }}` where the hex is the moss token value).
- **Internal async state in primitives:** Primitives must not call `supabase` or `fetch`. They are dumb display components. Match pool numbers in LivePreviewSidebar are static placeholder props for Phase 7.
- **Exporting internal sub-components:** Only export the primary component from each file. Internal layout pieces are implementation details.
- **Using boolean for selection state:** ChipSelector value shape is `string[]` — a locked decision. Do not use `boolean[]` or `Set<string>`.
- **Calling `window.confirm`:** ApplicationCard uses this anti-pattern — new primitives must not. Use proper modal/prop patterns.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accessible select dropdown | Custom `<div>` dropdown | Existing `Select` component (Radix UI) | Keyboard nav, focus management, portal rendering already solved |
| Class merging | String concatenation | `cn()` from `@/lib/utils` | Handles conditional classes and Tailwind merge conflicts |
| Progress bar | Custom div with manual width | Existing `ProgressBar` component | Clamping, gradient, transition-duration already implemented |
| Icon set | Custom SVG shapes | `lucide-react` | Already installed; consistent stroke width |

**Key insight:** The full primitive set can be built with zero new dependencies. The costliest mistake in this phase would be introducing a new component library (e.g., shadcn, headlessui) when the existing patterns already cover all requirements.

---

## Common Pitfalls

### Pitfall 1: Rgba with Design Tokens
**What goes wrong:** CSS `rgba()` cannot take a `var(--color-moss)` hex variable as input — `rgba(var(--color-moss), 0.07)` fails because `--color-moss` resolves to `#2d5016` not `rgb()` channels.
**Why it happens:** Tailwind v4 `@theme` tokens are CSS custom properties with hex values.
**How to avoid:** Two safe approaches: (a) Use Tailwind's opacity modifier — `bg-moss/7` (7% opacity moss) — which Tailwind v4 handles correctly. (b) Use explicit rgba with the known hex: `rgba(45,80,22,0.07)` — the Tag.tsx file demonstrates this for the green variant.
**Warning signs:** Component renders with no background color in the selected chip state.

### Pitfall 2: `sticky` Positioning Requires Overflow-Visible Parent
**What goes wrong:** `position: sticky` on LivePreviewSidebar silently stops working if any ancestor has `overflow: hidden` or `overflow: auto`.
**Why it happens:** CSS sticky requires the scroll container to be the nearest ancestor with overflow, not a wrapper with overflow: hidden.
**How to avoid:** LivePreviewSidebar is a presentational component — document that consumers must not wrap it in overflow-hidden containers. The sticky behavior is fully implemented in Phase 8 when the wizard layout is built.
**Warning signs:** Sidebar scrolls with the page instead of staying fixed in place.

### Pitfall 3: Star Rating SVG Path vs Lucide
**What goes wrong:** TestimonialsSection uses a custom SVG path that renders a specific star shape. The `lucide-react` `Star` icon uses a different path. If StarRating.tsx uses Lucide but TestimonialsSection continues to use its custom path, the stars look visually inconsistent between pages.
**Why it happens:** Two sources of truth for the same icon.
**How to avoid:** For the interactive StarRating component in Phase 7, use the same custom SVG path from TestimonialsSection (lines 33–47) but make it accept `filled: boolean` and `size` props. This ensures visual consistency without modifying TestimonialsSection.
**Warning signs:** Stars on the farm profile card look different from stars in testimonials.

### Pitfall 4: ChipSelector Column Layout with `inline`
**What goes wrong:** The `inline` layout mode (chips wrapping horizontally) can conflict with explicit `grid-cols-*` classes if both are applied.
**Why it happens:** `columns` prop needs to produce mutually exclusive class sets.
**How to avoid:** Use a lookup object:
```typescript
const gridClasses = {
  1: 'flex flex-col gap-2',
  2: 'grid grid-cols-2 gap-2',
  3: 'grid grid-cols-3 gap-2',
  inline: 'flex flex-wrap gap-2',
}
```
**Warning signs:** 2x3 farm type grid renders as a single column in wizard step 2.

### Pitfall 5: LivePreviewSidebar Completeness Animation
**What goes wrong:** Counter animation (percentage counting up) breaks on React re-renders because the animation starts from 0 each time the parent re-renders.
**Why it happens:** Animation tied to component mount rather than value change.
**How to avoid:** Use CSS `transition` on the `ProgressBar` width (already implemented with `transition-all duration-300`) rather than a JavaScript counter. For the numeric percentage display, a simple `transition` on opacity is sufficient — don't reach for animation libraries.
**Warning signs:** Progress bar jumps to final value immediately, or resets to 0 on each keystroke.

### Pitfall 6: StatusBanner Declined Opacity
**What goes wrong:** `opacity-60` applied to the entire banner also dims the text, making it hard to read.
**Why it happens:** The SPEC says background at 60% opacity, not the whole element.
**How to avoid:** Use `bg-red-lt/60` (Tailwind opacity modifier on the background only) rather than `opacity-60` on the container. Text stays at full opacity.
**Warning signs:** The "Unfortunately..." message is barely readable in the declined variant.

---

## Code Examples

Verified patterns from codebase inspection:

### ChipSelector — Selected State
```typescript
// Consistent with Tag.tsx and SPEC §6.3 "moss border + rgba moss bg + checkmark"
const chipClasses = cn(
  'relative flex items-center gap-2 px-3 py-2 rounded-[8px]',
  'border-[1.5px] cursor-pointer transition-all duration-150',
  'font-body text-[13px]',
  isSelected
    ? 'border-moss bg-moss/7 text-moss'
    : 'border-fog bg-white text-ink hover:border-fern',
)
```

### StatusBanner — Variant Map
```typescript
// Following Tag.tsx variant pattern
type StatusVariant = 'shortlisted' | 'interview' | 'offer' | 'declined'

const bannerVariants: Record<StatusVariant, { wrapper: string; title: string; copy: string }> = {
  shortlisted: {
    wrapper: 'bg-hay-lt border-hay',
    title: 'Great news — you\'ve been shortlisted!',
    copy: 'The employer has added you to their shortlist.',
  },
  interview: {
    wrapper: 'bg-green-lt border-green',
    title: 'You\'ve got an interview invitation!',
    copy: 'Please respond to confirm your availability.',
  },
  offer: {
    wrapper: 'bg-green-lt border-green',
    title: 'Congratulations — you\'ve received an offer!',
    copy: 'Review the offer details below.',
  },
  declined: {
    wrapper: 'bg-red-lt/60 border-red-lt',
    title: 'Unfortunately, this application wasn\'t successful.',
    copy: '',
  },
}
```

### Pagination — SPEC-exact dimensions
```typescript
// SPEC §6.6: 34x34px, fog border, active = moss bg
const pageButtonClasses = (isActive: boolean) => cn(
  'w-[34px] h-[34px] flex items-center justify-center',
  'rounded-[6px] border-[1.5px] font-body text-[13px] transition-colors',
  isActive
    ? 'border-moss bg-moss text-white'
    : 'border-fog bg-white text-ink hover:border-fern',
)
```

### Breadcrumb — Separator and Active States (Claude's Discretion)
```typescript
// Recommended: chevron separator; active item = ink (no link); inactive = light + underline on hover
// SPEC §6.5: "11px, light" text
interface BreadcrumbItem {
  label: string
  href?: string  // undefined = current/active item (no link)
}
```

### StarRating — Extract and Upgrade Pattern
```typescript
// Source: TestimonialsSection.tsx lines 33-47 (display star SVG path)
// Upgrade: add filled/unfilled state + onClick handler
function StarIcon({ filled, size = 16 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 1.5l1.854 3.756 4.146.602-3 2.924.708 4.128L8 10.81l-3.708 1.1.708-4.128-3-2.924 4.146-.602L8 1.5z"
        fill={filled ? 'var(--color-hay)' : 'var(--color-fog)'}
      />
    </svg>
  )
}
```

### LivePreviewSidebar — Reuse ProgressBar
```typescript
// Source: src/components/ui/ProgressBar.tsx
// ProgressBar already has: transition-all duration-300, moss→meadow gradient, clamping
import { ProgressBar } from '@/components/ui/ProgressBar'

// Completeness meter
<ProgressBar progress={completenessPercent} className="mt-2" />
```

### Timeline — CSS-only Vertical Line
```typescript
// No library needed — CSS pseudo-element approach
// Dot: 10px circle, meadow bg. Line: left-positioned border-left connecting dots.
// Structure:
// <ol className="relative ml-3">
//   <li className="relative pl-6 pb-4">
//     <span className="absolute left-0 top-1 w-2.5 h-2.5 rounded-full bg-meadow" />
//     <span className="absolute left-[4px] top-3.5 bottom-0 w-[1.5px] bg-fog" />  {/* connecting line */}
//     content
//   </li>
// </ol>
```

### SearchHero — Gradient Background
```typescript
// SPEC §6.6: "Linear gradient soil→dark green, with radial green glow"
// Using CSS custom properties from index.css
<div
  className="relative overflow-hidden"
  style={{
    background: 'linear-gradient(135deg, var(--color-soil) 0%, #1a3a10 100%)',
  }}
>
  <div
    className="absolute inset-0 pointer-events-none"
    style={{
      background: 'radial-gradient(ellipse at 30% 50%, rgba(74,124,47,0.25) 0%, transparent 60%)',
    }}
  />
  {/* content */}
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SkillsPicker (checkbox grid) | ChipSelector (visual chip grid) | Phase 7 SPEC upgrade | Better visual affordance for farm type, shed type, visa, sector selections |
| Display-only StarRating in TestimonialsSection | Reusable interactive StarRating in `ui/` | Phase 7 | Enables farm profile rating input and any future rating surface |
| `opacity-60` on declined cards (ApplicationCard pattern) | `bg-red-lt/60` on banner bg only | Phase 7 | Text stays readable; only background dims per SPEC |

**Deprecated/outdated:**
- `SkillsPicker` checkbox approach for visual/category selections: replaced by `ChipSelector` for all Phase 8+ wizards. SkillsPicker is retained for the structured skill proficiency use case (skill + proficiency level pairs) where it is still appropriate.

---

## Open Questions

1. **StatsStrip responsive behavior on mobile**
   - What we know: SPEC §6.5 shows 4-column layout. SPEC §6.5 footnote says "stats strip becomes 2-col" at 860px.
   - What's unclear: Which column pairs logically group together for the 2-col collapse?
   - Recommendation: Default to left-right pairs (Applications+Views, Salary+Posted) for the 2-col breakpoint. Claude's Discretion covers this.

2. **Pagination ellipsis behavior**
   - What we know: SPEC specifies 34×34px numbered buttons and active state only.
   - What's unclear: SPEC does not specify ellipsis for large page counts.
   - Recommendation: Implement a simple window of 5 visible pages with `...` separators using a standard "sliding window" algorithm. Claude's Discretion covers this per CONTEXT.md.

3. **SearchHero navigation on pill click**
   - What we know: CONTEXT.md says clicking a pill "replaces current filters and navigates to search results."
   - What's unclear: SearchHero is built in Phase 7 (primitive only); the navigation handler will be implemented in Phase 9 (Job Search page integration).
   - Recommendation: SearchHero accepts `onPillClick?: (pill: string) => void` and `onSearch?: (query: string, region: string) => void` props. Phase 7 component renders correctly and calls the prop if provided. Phase 9 wires the navigation.

---

## Validation Architecture

> `workflow.nyquist_validation` key is absent from `.planning/config.json` — treated as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.1.1 + @testing-library/react 16.3 |
| Config file | `vitest.config.ts` (merges with vite.config) |
| Quick run command | `npx vitest run tests/ui-primitives.test.tsx --reporter=dot` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PRIM-01 | ChipSelector single-select deselects previous chip | unit | `npx vitest run tests/ui-primitives.test.tsx -t "ChipSelector" --reporter=dot` | ❌ Wave 0 |
| PRIM-01 | ChipSelector multi-select toggles independently | unit | same file | ❌ Wave 0 |
| PRIM-01 | ChipSelector selected state renders moss border + checkmark | unit | same file | ❌ Wave 0 |
| PRIM-02 | StatusBanner renders correct copy per variant | unit | same file | ❌ Wave 0 |
| PRIM-02 | StatusBanner declined variant uses bg-only opacity | unit | same file | ❌ Wave 0 |
| PRIM-03 | Breadcrumb renders all items; last item has no link | unit | same file | ❌ Wave 0 |
| PRIM-04 | StatsStrip renders correct label+value pairs | unit | same file | ❌ Wave 0 |
| PRIM-05 | Timeline renders all entries with meadow dots | unit | same file | ❌ Wave 0 |
| PRIM-06 | StarRating calls onChange with correct value on click | unit | same file | ❌ Wave 0 |
| PRIM-07 | Pagination highlights active page; calls onPageChange | unit | same file | ❌ Wave 0 |
| PRIM-08 | SearchHero renders search bar + region select + pills | unit | same file | ❌ Wave 0 |
| PRIM-08 | SearchHero pill click calls onPillClick with correct value | unit | same file | ❌ Wave 0 |
| PRIM-09 | LivePreviewSidebar renders completeness percentage | unit | same file | ❌ Wave 0 |
| PRIM-09 | LivePreviewSidebar renders static match pool placeholder | unit | same file | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/ui-primitives.test.tsx --reporter=dot`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/ui-primitives.test.tsx` — covers all PRIM-01 through PRIM-09
- [ ] No shared fixture gaps — Vitest setup already configured in `tests/setup.ts`
- [ ] No framework install needed — Vitest + Testing Library already in devDependencies

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `src/components/ui/Tag.tsx`, `Card.tsx`, `ProgressBar.tsx`, `Select.tsx`, `SkillsPicker.tsx`, `ApplicationCard.tsx`
- Direct inspection: `src/components/landing/TestimonialsSection.tsx` — star SVG path source
- Direct inspection: `src/index.css` — all design tokens (moss, hay, fog, cream, meadow, red-lt, hay-lt, green-lt)
- Direct inspection: `package.json` — confirmed installed deps (Tailwind v4, Radix UI, lucide-react, Vitest)
- Direct inspection: `vitest.config.ts` — test infrastructure configuration
- Direct inspection: `SPEC.md` §6.3, 6.4, 6.5, 6.6, 6.7, 6.8 — component visual specifications
- Direct inspection: `.planning/phases/07-ui-primitives/07-CONTEXT.md` — all locked decisions

### Secondary (MEDIUM confidence)
- Tailwind v4 opacity modifier syntax (`bg-moss/7`) — verified against Tailwind v4 `@theme` pattern in `index.css`

### Tertiary (LOW confidence)
- None — all findings are from direct codebase inspection against locked decisions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all from `package.json` inspection; no new deps needed
- Architecture: HIGH — all patterns extracted from existing codebase files
- Pitfalls: HIGH — derived from actual code inspection (Tag.tsx rgba pattern, ApplicationCard opacity anti-pattern, ProgressBar transition pattern)
- Component prop contracts: HIGH — locked decisions from CONTEXT.md + SPEC wireframe sections

**Research date:** 2026-03-21
**Valid until:** 2026-06-01 (stable stack — Tailwind/Radix/Vitest versions unlikely to change within milestone)
