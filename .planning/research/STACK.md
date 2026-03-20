# Technology Stack

**Project:** TopFarms v1.1 — SPEC Compliance UI Gap-Closing
**Researched:** 2026-03-20
**Confidence:** HIGH for already-installed packages (ground truth from package.json); MEDIUM for new additions (versions from existing STACK.md research verified 2026-03-15; re-verification blocked by tool restrictions)

---

## Stack Status

The core stack is **locked** from v1.0. This document covers only the **delta** for v1.1 — new libraries needed for SPEC compliance UI components, and confirmation of what is already available. The complete baseline stack is documented in the prior version of this file (2026-03-15).

---

## What Is Already Installed (Use These, Don't Re-Add)

Verified against `package.json` at time of research:

| Library | Installed Version | v1.1 Use |
|---------|------------------|----------|
| `@radix-ui/react-slider` | ^1.3.6 | Dual-handle salary range slider — **already works**, already used in `FilterSidebar.tsx` with two `<Slider.Thumb>` elements |
| `react-dropzone` | ^15.0.0 | Drag-drop file upload zones — **already implemented** in `FileDropzone.tsx`, used in employer verification |
| `@radix-ui/react-checkbox` | ^1.1.4 | Checkbox inputs — installed; v1.1 converts many to chip selectors instead |
| `@radix-ui/react-dialog` | ^1.1.6 | Modals — installed, used for placement fee gate |
| `@radix-ui/react-select` | ^2.1.6 | Dropdowns — installed |
| `@radix-ui/react-switch` | ^1.1.3 | Toggles — installed, used as accommodation/couples toggles in filter sidebar |
| `@radix-ui/react-progress` | ^1.1.2 | Wizard progress bar — installed |
| `@radix-ui/react-label` | ^2.1.2 | Form labels — installed |
| `lucide-react` | ^0.487.0 | Icons — installed |
| `clsx` | ^2.1.1 | Conditional classNames — installed |
| `tailwind-merge` | ^3.2.0 | Safe class merging — installed |
| `sonner` | ^2.0.3 | Toast notifications — installed |
| `react-hook-form` | ^7.55.0 | Forms — installed |
| `@hookform/resolvers` | ^5.0.1 | Zod adapter — installed |
| `zod` | ^3.24.2 | Validation — installed (note: v3, not v4 as in prior research doc) |

**Important:** The live counter animation in `CountersSection.tsx` uses custom hooks (`useInView`, `useCountUp`) — no external library. The `FilterSidebar.tsx` uses native `<details>`/`<summary>` for collapsible sections — no Radix Accordion. Both patterns are sufficient for current use cases.

---

## New Libraries Required for v1.1

### Animation — `motion` (formerly framer-motion)

| Library | Recommended Version | Purpose | Why Add |
|---------|-------------------|---------|---------|
| `motion` | `^12.0.0` | Declarative JS animations | CSS `animate-bounce` and `animate-pulse` already in the codebase. The v1.1 SPEC requires **staggered fadeUp animations** on hero sections and landing page additions, and **pulsing badges** with entry timing — CSS transitions cannot stagger across siblings without JS orchestration. `motion` provides `variants` + `staggerChildren` for this. |

**Why not CSS only:** Staggered entrance animations across a list of elements (e.g., hero headline → subtext → CTA, or farm type cards appearing in sequence) require dynamic delay calculation. CSS `animation-delay` on static values works but requires N hard-coded classes. `motion`'s `staggerChildren` is the idiomatic React solution and is already planned in the existing STACK.md.

**Import pattern:**
```typescript
import { motion } from 'motion/react'
// NOT from 'framer-motion' — the package is now 'motion'
```

**Tailwind v4 integration:** No conflict. `motion` wraps HTML elements with inline style transforms. Tailwind classes apply normally to `motion.div` etc.

**React 19 support:** Peer dep is `^18 || ^19`. Confirmed compatible.

---

### Scroll Trigger — `react-intersection-observer`

| Library | Recommended Version | Purpose | Why Add |
|---------|-------------------|---------|---------|
| `react-intersection-observer` | `^9.0.0` | `useInView` hook for scroll-triggered animations | The codebase already has a **custom** `useInView` hook (used in `CountersSection.tsx`). However, the custom hook is a thin wrapper; `react-intersection-observer` provides the same API with better threshold/rootMargin options, TypeScript types, and ref merging support needed when combining with `motion`. |

**Decision:** Use `react-intersection-observer` for new animated sections (hero stat blocks, landing page additions). Keep the existing custom `useInView` for `CountersSection.tsx` — do not refactor what works.

**Install as:**
```bash
npm install react-intersection-observer
```

**Why not build custom again:** The existing custom hook works for a single threshold. The v1.1 landing page additions (AI matching section, farm types section, employer CTA) need per-element inView detection with `triggerOnce: true` to prevent re-animation on scroll back. The library handles this cleanly.

---

### Tabs — `@radix-ui/react-tabs`

| Library | Recommended Version | Purpose | Why Add |
|---------|-------------------|---------|---------|
| `@radix-ui/react-tabs` | `^1.1.0` | Accessible tab panels | Expandable card tabs on job search results (SPEC: tabs inside `SearchJobCard` for Details / Requirements / Accommodation) and the applicant dashboard 4-tab expandable panels. |

**Why not `<details>` like FilterSidebar:** The filter sidebar uses `<details>` for simple show/hide per-section. The SPEC card tabs and applicant panels require **mutually exclusive active states** (only one tab active at a time), ARIA `tablist`/`tabpanel` roles for WCAG 2.1 AA, and keyboard navigation (arrow keys). Radix Tabs provides all of this; `<details>` does not.

**Why not build from scratch:** Tab keyboard navigation (Left/Right arrows, Home/End, focus management) is non-trivial to get right for WCAG 2.1 AA. Radix is already the project's primitive library of choice.

**Tailwind v4 integration:** Style with `data-[state=active]:` Tailwind variants. Radix Tabs sets `data-state="active"` on the active tab trigger — this maps directly to Tailwind v4 data attribute variants.

```typescript
// Usage pattern
<Tabs.Root defaultValue="details">
  <Tabs.List className="flex border-b border-fog">
    <Tabs.Trigger
      value="details"
      className="px-4 py-2 text-sm data-[state=active]:border-b-2 data-[state=active]:border-moss data-[state=active]:text-moss"
    >
      Details
    </Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="details">...</Tabs.Content>
</Tabs.Root>
```

---

### Chip/Tag Selector — Build from scratch (no library)

**Decision: Do NOT add a library for chip selectors.**

The v1.1 SPEC converts checkboxes to chip-style multi-selectors in employer onboarding (career dev chips), seeker onboarding (visa type chips, licence chips), and job posting (qualifications chips). These are styled toggle buttons — not a complex component.

**Implementation:** Vanilla React + Tailwind v4:

```typescript
function ChipSelector({ options, selected, onToggle }: ChipSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onToggle(opt.value)}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
            selected.includes(opt.value)
              ? 'bg-moss text-white border-moss'
              : 'bg-white text-mid border-fog hover:border-moss hover:text-moss'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
```

**Why not a library:** Every chip/tag library (react-select in multi mode, react-tagsinput, etc.) carries opinions about styling and behaviour that conflict with the bespoke TopFarms design system. The component above is ~20 lines and fully controlled by Tailwind.

---

### Star Rating — Build from scratch (no library)

**Decision: Do NOT add a library for star ratings.**

The v1.1 SPEC includes a star rating input on the employer profile (farm culture rating by workers). A 5-star interactive input is ~30 lines of vanilla React.

```typescript
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" onClick={() => onChange(star)}>
          <Star
            className={cn('w-5 h-5', star <= value ? 'fill-hay text-hay' : 'text-fog')}
          />
        </button>
      ))}
    </div>
  )
}
```

Uses `lucide-react`'s `Star` icon (already installed). No new dependency needed.

---

### Pagination — Build from scratch (no library)

**Decision: Do NOT add a library for pagination.**

The v1.1 SPEC requires numbered pagination on job search results. This is a row of numbered buttons with prev/next — achievable with a 40-line component.

**Why not a library:** Pagination libraries (react-paginate, etc.) are styled for their own design systems and require significant CSS overrides. The TopFarms pagination is straightforward: current page, N adjacent pages, ellipsis, prev/next.

**Pattern:** Compute page range in a pure function, render with Tailwind utility classes matching the existing `Button` component variants.

---

### Vertical Timeline — Build from scratch (no library)

**Decision: Do NOT add a library for timeline components.**

The v1.1 SPEC adds application timeline on the job detail page (seeker view) and the applicant dashboard. A vertical timeline is a styled `<ol>` with a left border, step circles, and conditional active/complete states.

**Implementation:** CSS-only with Tailwind — left border line via `border-l-2`, step circles with absolute positioning. No JS required, no library needed.

---

### Map Placeholder — Static placeholder (no library)

**Decision: Do NOT add a mapping library.**

The v1.1 SPEC shows a map in the job detail sidebar for farm location. Per the PROJECT.md constraints and the v1.1 scope definition, this is a "map placeholder" — a styled div with an icon and location text, not a live map.

**Why not Leaflet/Google Maps:** Full mapping is out of scope for v1.1. Integrating a map library adds 40+ KB and complexity with no MVP value. The location is already displayed as text (region, nearest town). A placeholder card is correct for this milestone.

---

### Search Hero with Search Bar — Build from scratch (no library)

**Decision: Do NOT add a library for the search hero.**

The job search page needs a hero section with a text input search bar (keyword search) and potentially a region select — both already-installed primitives (`@radix-ui/react-select`, standard `<input>`). The "hero" styling is Tailwind and the TopFarms colour palette.

---

### Status Variant Banners — Build from scratch (no library)

**Decision: Do NOT add a library for status banners.**

The v1.1 SPEC requires status banners in the seeker My Applications page for: shortlisted, interview, offer, declined. These are coloured alert boxes — a `cn()`-driven variant map using existing Tailwind colour tokens.

```typescript
const BANNER_VARIANTS = {
  shortlisted: 'bg-meadow/10 border-meadow/30 text-moss',
  interview:   'bg-hay/10 border-hay/30 text-hay-dark',
  offer:       'bg-fern/10 border-fern/30 text-fern',
  declined:    'bg-red-50 border-red-200 text-red-700',
}
```

---

### Live Preview Sidebar (Post Job Wizard) — Build from scratch (no library)

**Decision: No library needed.**

The job posting wizard SPEC adds a live preview sidebar that mirrors wizard form state in real time. This is a read-only display component consuming `react-hook-form`'s `watch()` — already installed. No new library.

---

## Summary: Net New Dependencies for v1.1

| Library | Version | Size (est.) | Rationale |
|---------|---------|-------------|-----------|
| `motion` | `^12.0.0` | ~50 KB gzip | Staggered fadeUp animations — cannot do with CSS alone |
| `react-intersection-observer` | `^9.0.0` | ~3 KB gzip | triggerOnce inView for multiple animated sections |
| `@radix-ui/react-tabs` | `^1.1.0` | ~8 KB gzip | WCAG-compliant tab panels for job cards + applicant dashboard |

**Everything else in v1.1 is build-from-scratch with existing primitives.** ChipSelector, StarRating, Pagination, Timeline, StatusBanner, MapPlaceholder, SearchHero, LivePreview — all implementable with Tailwind v4, lucide-react, and existing Radix primitives already installed.

---

## Installation

```bash
# New dependencies only — everything else is already installed
npm install motion react-intersection-observer @radix-ui/react-tabs
```

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `react-select` (multi/creatable) | Imposes its own design system; styling to match TopFarms requires more CSS than building ChipSelector from scratch | 20-line `ChipSelector` component with Tailwind |
| `react-paginate` | Styled for its own design; TopFarms pagination is simple and bespoke | 40-line vanilla component |
| `react-rating` / `react-stars` | All require CSS overrides; star rating is 30 lines with lucide-react's `Star` icon already installed | Custom `StarRating` with lucide `Star` |
| `react-vertical-timeline-component` | Opinionated styles, fight the design system; timeline is a styled `<ol>` | CSS + Tailwind `border-l-2` pattern |
| `leaflet` / `@vis.gl/react-google-maps` | Out of scope for v1.1 — spec says "map placeholder" not live map | Styled div with `MapPin` lucide icon |
| `@radix-ui/react-accordion` | The FilterSidebar already works with native `<details>`; Radix Accordion only needed if keyboard nav or ARIA accordion role is required — it isn't here | Native `<details>` (already used) |
| `framer-motion` | This is the old package name. The unified package is now `motion` — importing from `framer-motion` works but installs a legacy shim | `motion` (import from `motion/react`) |
| Any CSS animation library (animate.css, etc.) | Tailwind v4 has `animate-*` utilities built in (`animate-pulse`, `animate-bounce`, `animate-spin`); `motion` covers the JS-driven cases | Tailwind utilities + `motion` |

---

## Tailwind v4 Compatibility Notes

All three new additions are Tailwind-agnostic (they provide no CSS of their own) and work cleanly with Tailwind v4:

- **`motion`**: Applies transforms via inline styles. Tailwind classes on `motion.div` etc. work normally. Data attributes set by motion (e.g., `data-framer-*`) do not conflict with Tailwind v4's CSS variable approach.
- **`react-intersection-observer`**: No styles. Pure JS hook.
- **`@radix-ui/react-tabs`**: Sets `data-state="active"` on active triggers. Target with Tailwind v4 data variants: `data-[state=active]:text-moss`. This is the standard Radix + Tailwind v4 pattern used throughout the existing codebase (see `@radix-ui/react-slider` usage in `FilterSidebar.tsx`).

---

## Version Compatibility

| New Package | React 19 | Tailwind v4 | Notes |
|-------------|----------|-------------|-------|
| `motion` ^12 | Supported (peer dep `^18 \|\| ^19`) | No conflict | Import from `motion/react` |
| `react-intersection-observer` ^9 | Supported | No conflict | Pure hook, no styles |
| `@radix-ui/react-tabs` ^1.1 | Supported | No conflict | Style with `data-[state=active]:` variants |

---

## Sources

- `package.json` at `/Users/harrysmith/dev/topfarms/package.json` — ground truth for installed versions (HIGH confidence)
- `FilterSidebar.tsx` — confirms `@radix-ui/react-slider` dual-handle already implemented (HIGH confidence)
- `CountersSection.tsx` — confirms custom `useInView`/`useCountUp` hooks used, not external library (HIGH confidence)
- `FileDropzone.tsx` (existence confirmed via glob) — confirms `react-dropzone` already wired (HIGH confidence)
- Prior STACK.md research (2026-03-15) — version numbers for `motion`, `react-intersection-observer`, `@radix-ui/react-tabs` (MEDIUM confidence — versions verified 5 days prior; re-verification via npm/WebFetch blocked by tool restrictions at time of this research)
- Tailwind v4 data attribute variant pattern — confirmed from existing codebase usage of Radix primitives (HIGH confidence)

---

*Stack research for: TopFarms v1.1 SPEC Compliance milestone*
*Researched: 2026-03-20*
