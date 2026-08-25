# Phase 10: Landing Page - Research

**Researched:** 2026-03-22
**Domain:** React animation, landing page section composition, Tailwind v4 + motion library
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Hero animation**
- Motion library (framer-motion or `motion` package) required for staggered fadeUp — CSS keyframes insufficient for sequenced per-line animation control
- Stagger timing: 150-200ms delay between each headline line for readable sequential reveal
- Animation triggers on page load (not on scroll into view) since hero is above the fold
- CTA fork border radius corrected to 14px (currently rounded-2xl = 16px) per LAND-10
- CTA fork button text must match SPEC copy exactly

**Live counter badge**
- Pulsing green "Live" dot badge added to the counter strip section, positioned left of the first counter as a standalone badge element
- Uses existing `animate-pulse` Tailwind utility for the dot — no motion library needed for this element
- Badge text: "Live" in uppercase tracking-widest, same style as existing eyebrow badges

**Featured listing match scores**
- Reuse the match score circle pattern already present in HeroSection decorative cards (meadow-colored ring with percentage)
- Each featured job card gets a match score circle in the top-right corner (same position as tier badge, tier badge shifts below or is replaced)
- Score values are static/mock for anonymous visitors; real scores shown if logged-in seeker (requires auth check)

**New section ordering (top to bottom)**
- Hero → Counters (with Live badge) → AI Matching → How It Works → Farm Types Strip → Featured Listings → Employer CTA Band → Testimonials + Social Proof Stats → Trusted-by Strip → Final CTA → Footer
- This follows a logical conversion funnel: hook → credibility → explain → showcase sectors → show jobs → convert employers → social proof → trust → final push

**AI matching section (LAND-04)**
- Static mock browser window (rounded corners, fake address bar, dots) — not interactive
- 4 feature bullet points inside the mock window describing AI matching capabilities
- Subtle entrance animation using motion library (fade + slide up on scroll)
- Cream background section with soil-colored text, consistent with other light sections

**Farm types strip (LAND-05)**
- 5 sector cards: Dairy, Sheep & Beef, Horticulture, Viticulture, Arable
- Each card shows sector name and listing count (fetched from Supabase or hardcoded placeholder)
- Horizontal scroll on mobile, grid on desktop
- Cards use existing fog/white styling pattern

**Employer CTA band (LAND-07)**
- Soil/soil-deep background section targeting employers
- Mini dashboard preview as a simplified static mockup card (not a live component)
- 4-point checklist with checkmark icons (e.g., "Post in 5 minutes", "AI-matched candidates", "Track applications", "Pay on success")
- "Post your first job" CTA button in meadow green

**Social proof stat blocks (LAND-03)**
- 4 connected stat blocks alongside the existing testimonials section
- Stats: "500+ Farms", "2,000+ Workers", "48hr Avg Match Time", "95% Satisfaction"
- Values are static/aspirational (not live from DB) — these are marketing numbers
- Connected visually via border or divider lines, same dark section as testimonials

**Trusted-by strip (LAND-08)**
- Horizontal strip of farm brand name placeholders styled as greyed-out text logos
- Light/cream background, centered layout
- 5-6 placeholder names (e.g., "Fonterra Farms", "Silver Fern", "Greenfield", "Highview Station", "Valley View")

**Final CTA section (LAND-09)**
- Centered headline with SPEC copy
- Dual buttons: "Find Farm Work" (meadow bg) + "Post a Job" (outline/hay border) — same pattern as hero CTA buttons
- Soil-deep background, cream text
- Positioned between trusted-by strip and footer

### Claude's Discretion
- Exact motion library package choice (framer-motion vs motion — research determines best fit)
- Animation easing curves and exact durations beyond the stagger timing
- Mock browser window visual details (address bar content, shadow depth)
- Farm types strip listing count data source (live query vs hardcoded)
- Trusted-by strip placeholder brand names (any NZ agriculture-adjacent names)
- Responsive breakpoints for new sections

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LAND-01 | Hero headline matches SPEC copy with staggered fadeUp animation (motion library) | motion/react variants + staggerChildren pattern; page-load trigger via `animate` prop |
| LAND-02 | Live counter strip includes animated pulsing "Live" green dot badge | Tailwind `animate-pulse` already used in hero eyebrow; extend CountersSection with badge element |
| LAND-03 | Social proof section includes 4 connected stat blocks alongside testimonials | New stat row above or below testimonial grid; static data; TestimonialsSection restructure |
| LAND-04 | AI matching features section with mock browser window + 4 feature bullet points | New AIMatchingSection component; motion/react whileInView scroll trigger |
| LAND-05 | Farm types strip with 5 sector cards and listing counts | New FarmTypesStrip component; Supabase count query or hardcoded fallback |
| LAND-06 | Featured job listings include match score circles on cards | Extend JobCard in FeaturedListings; reuse HeroSection decorative card match score circle pattern |
| LAND-07 | Employer CTA band with mini dashboard preview + "Post your first job" CTA + 4-point checklist | New EmployerCTABand component; static mockup only; soil background |
| LAND-08 | Trusted-by strip with farm brand name placeholders | New TrustedByStrip component; greyed text logos; cream background |
| LAND-09 | Final CTA section with centered headline + dual buttons | New FinalCTASection component; mirrors hero CTA fork button patterns |
| LAND-10 | CTA fork card border radius corrected to 14px, button text matches SPEC | Inline style fix on HeroSection CTA fork wrapper: `borderRadius: '14px'` replaces `rounded-2xl` |
</phase_requirements>

---

## Summary

Phase 10 adds six new landing page sections and enhances four existing components to bring the home page to SPEC compliance. The work is purely frontend — no database migrations, no auth changes, no routing changes. All changes live in `src/components/landing/` and `src/pages/Home.tsx`.

The primary technical question — which animation library to use — is resolved: install the `motion` package (the official successor to framer-motion, importing from `motion/react`). It provides the `motion.div`/`motion.h1` components, variants system with `staggerChildren`/`delayChildren`, and `whileInView` scroll triggers needed for this phase. The existing `useInView` hook remains in service for the counter badge (pure CSS `animate-pulse`), while the motion library handles staggered hero text and scroll-reveal for new sections.

The existing codebase provides all the visual DNA needed: match score circles from HeroSection, eyebrow badge pattern for the "Live" dot, dark section styling from TestimonialsSection, counter pattern from CountersSection, and grid card structure from HowItWorksSection. No new design language is introduced — every new component follows established patterns.

**Primary recommendation:** Install `motion` (npm package), import from `motion/react`. Use variants with `staggerChildren` for hero headline animation and `whileInView` + `viewport={{ once: true }}` for all scroll-triggered section reveals.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| motion | ^12.x (latest) | Staggered hero animation, scroll-reveal for new sections | Successor to framer-motion; imports from `motion/react`; 30M+ downloads/month; first-party React support with variants, stagger, whileInView |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind animate-pulse | (built-in) | Live counter dot pulsing animation | Already in project; sufficient for simple single-element pulse |
| Supabase client | ^2.49.x (already installed) | Farm types listing counts (optional live query) | If farm types count is fetched live; otherwise hardcode fallback |
| lucide-react | ^0.487.x (already installed) | Checkmark icons in employer CTA band checklist | Already in project; use `Check` icon |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| motion | framer-motion | framer-motion is now repackaged as motion; both work identically — use `motion` to stay current with naming convention |
| motion | CSS @keyframes | CSS can't sequence per-line stagger with simple declarative control; no per-child delay without JS; insufficient per locked decision |
| motion | react-spring | Different API, no variants system, more verbose for stagger; motion is the ecosystem standard |

**Installation:**
```bash
npm install motion
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/components/landing/
├── HeroSection.tsx          # MODIFIED: add motion stagger to headline, fix CTA fork radius
├── CountersSection.tsx      # MODIFIED: add Live badge element
├── AIMatchingSection.tsx    # NEW: mock browser window + 4 bullets + scroll reveal
├── HowItWorksSection.tsx    # UNCHANGED
├── FarmTypesStrip.tsx       # NEW: 5 sector cards
├── FeaturedListings.tsx     # MODIFIED: match score circles on JobCard
├── EmployerCTABand.tsx      # NEW: mini dashboard mockup + checklist
├── TestimonialsSection.tsx  # MODIFIED: add 4 stat blocks above/below testimonials
├── TrustedByStrip.tsx       # NEW: greyed text logos
├── FinalCTASection.tsx      # NEW: centered headline + dual buttons
└── LandingFooter.tsx        # UNCHANGED

src/pages/
└── Home.tsx                 # MODIFIED: insert 6 new sections in correct order
```

### Pattern 1: Page-load staggered fadeUp (LAND-01)

**What:** Hero headline animates in on mount with each line delayed 150-200ms relative to the previous.
**When to use:** Above-the-fold content that must animate immediately on page load (no scroll trigger).

```typescript
// Source: https://motion.dev/docs/react-animation (motion/react variants)
import { motion } from 'motion/react'

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.18,  // 180ms between each line
    },
  },
}

const lineVariant = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

// In HeroSection — replace the static <h1> with:
<motion.h1
  variants={container}
  initial="hidden"
  animate="show"
  className="font-display font-bold leading-[1.05] tracking-tight"
  style={{ fontSize: 'clamp(48px, 6.5vw, 82px)', color: 'var(--color-cream)' }}
>
  <motion.span variants={lineVariant} className="block">
    Where New Zealand's{' '}
  </motion.span>
  <motion.span variants={lineVariant} className="block">
    <em className="not-italic" style={{ color: 'var(--color-hay)', fontStyle: 'italic' }}>
      Best Farms
    </em>
  </motion.span>
  <motion.span variants={lineVariant} className="block">
    Find Their Next Team
  </motion.span>
</motion.h1>
```

### Pattern 2: Scroll-triggered section reveal (LAND-04, LAND-07, others)

**What:** New sections fade up into view as they enter the viewport. One-shot (no re-trigger on scroll out).
**When to use:** Below-the-fold sections that should reveal on first scroll.

```typescript
// Source: https://motion.dev/docs/react-scroll-animations
import { motion } from 'motion/react'

<motion.div
  initial={{ opacity: 0, y: 32 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.2 }}
  transition={{ duration: 0.55, ease: 'easeOut' }}
>
  {/* section content */}
</motion.div>
```

### Pattern 3: Live counter badge (LAND-02)

**What:** Standalone badge positioned before the first counter using existing eyebrow badge pattern.
**When to use:** Simple pulse animation on a static element — no motion library needed.

```typescript
// Reuses animate-pulse already present in HeroSection eyebrow badge
<div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold tracking-widest uppercase"
  style={{
    borderColor: 'rgba(122,175,63,0.3)',
    backgroundColor: 'rgba(122,175,63,0.1)',
    color: 'var(--color-meadow)',
  }}
>
  <span
    className="w-2 h-2 rounded-full animate-pulse"
    style={{ backgroundColor: 'var(--color-meadow)' }}
  />
  Live
</div>
```

### Pattern 4: Match score circle on JobCard (LAND-06)

**What:** Reuses the exact visual pattern from HeroSection decorative cards.
**When to use:** Featured job cards — position in top-right, tier badge below or replaced.

```typescript
// Matches HeroSection decorative card pattern (line 179-188 of HeroSection.tsx)
<div
  className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
  style={{
    backgroundColor: 'rgba(122,175,63,0.2)',
    color: 'var(--color-meadow)',
    border: '2px solid var(--color-meadow)',
  }}
>
  {matchScore}%
</div>
```

### Pattern 5: Mock browser window (LAND-04)

**What:** Static decorative browser chrome to frame the AI matching feature copy.
**When to use:** Visual device to make feature description feel product-like.

```typescript
// Standard browser chrome mock pattern
<div className="rounded-xl overflow-hidden shadow-2xl"
  style={{ border: '1px solid rgba(0,0,0,0.1)', backgroundColor: 'var(--color-white)' }}
>
  {/* Traffic lights + address bar */}
  <div className="flex items-center gap-2 px-4 py-3"
    style={{ backgroundColor: 'var(--color-fog)', borderBottom: '1px solid var(--color-fog)' }}
  >
    <div className="flex gap-1.5">
      {['#ff5f57', '#ffbd2e', '#28c840'].map((c) => (
        <span key={c} className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
      ))}
    </div>
    <div className="flex-1 rounded-md px-3 py-1 text-xs mx-4"
      style={{ backgroundColor: 'var(--color-white)', color: 'var(--color-mid)' }}
    >
      topfarms.co.nz/match
    </div>
  </div>
  {/* Feature content */}
  <div className="p-6">{/* 4 bullet points */}</div>
</div>
```

### Pattern 6: CTA fork border radius fix (LAND-10)

**What:** Replace `rounded-2xl` (16px) Tailwind class with inline style `borderRadius: '14px'`.
**Why inline:** Project convention uses inline styles for all color/size values from design tokens. The 14px spec value doesn't map to a standard Tailwind v4 class.

```typescript
// In HeroSection.tsx — CTA fork wrapper (line 86)
// Before:
<div className="flex flex-col sm:flex-row rounded-2xl border overflow-hidden" ...>
// After:
<div className="flex flex-col sm:flex-row border overflow-hidden"
  style={{ borderRadius: '14px', borderColor: 'rgba(255,255,255,0.12)' }}
>
```

### Anti-Patterns to Avoid

- **Animating height/width:** Use `opacity` + `y` transforms only — GPU-composited properties avoid layout thrash
- **Using CSS `@keyframes` for the headline stagger:** Can't sequence per-element delays declaratively without JS; breaks the stagger requirement
- **Re-triggering scroll animations:** Always pass `viewport={{ once: true }}` — running animations every scroll is distracting on a landing page
- **Importing from `framer-motion`:** The package is now `motion`; import from `motion/react` for React usage
- **Double motion.div wrapping:** Don't wrap every element in motion — apply motion only to the outermost section container for scroll reveals

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Staggered per-element animation | Manual `setTimeout` delays or CSS `animation-delay` inline styles | `motion/react` variants with `staggerChildren` | CSS animation-delay requires N style tags; setTimeout creates stale closure risks; motion declarative system handles all edge cases |
| Scroll-triggered reveal | Custom IntersectionObserver + CSS class toggle | `motion/react` `whileInView` + `viewport={{ once: true }}` | Project already has `useInView` hook for boolean triggers but motion's `whileInView` handles the animation lifecycle directly without bridging hook → class → CSS |
| Counter section Live badge | Custom animated component | Tailwind `animate-pulse` on a `span` | Already used in hero eyebrow badge — zero new code |

**Key insight:** The project already has `useInView` and `useCountUp` hooks for the counter section. Do NOT migrate those to motion — they serve a different purpose (counting up numbers). Motion is additive for visual animation only.

---

## Common Pitfalls

### Pitfall 1: motion library not mocked in tests

**What goes wrong:** `motion.div` components render fine in the browser but cause test failures because jsdom does not support Web Animations API. Tests rendering `<Home />` (which includes animated sections) may throw or produce unexpected output.

**Why it happens:** The `motion` package detects animation capabilities; in jsdom environment some properties behave differently.

**How to avoid:** Add a vi.mock for `motion/react` in the test setup OR confirm that motion degrades gracefully in jsdom (it typically does — it just skips animations). The existing `tests/landing-page.test.tsx` already mocks `IntersectionObserver` — verify motion doesn't require additional mocking after install. If tests fail, add to `tests/setup.ts`:

```typescript
vi.mock('motion/react', async () => {
  const actual = await vi.importActual('motion/react')
  return {
    ...actual,
    motion: new Proxy({}, {
      get: (_, tag) => (props: Record<string, unknown>) => {
        const { initial, animate, whileInView, variants, viewport, transition, ...rest } = props
        return React.createElement(tag as string, rest)
      }
    })
  }
})
```

**Warning signs:** `TypeError: Cannot read properties of undefined` or `window.matchMedia` errors after motion install.

### Pitfall 2: Headline stagger splits the h1 into display:block spans

**What goes wrong:** Wrapping each headline "line" in `motion.span className="block"` changes the heading from inline text flow to block elements, which can cause unexpected line breaks at narrow viewports or when the clamp font size changes.

**Why it happens:** Each `motion.span` as a block creates a forced line break — the "three lines" may not match the visual intended breaks at all screen sizes.

**How to avoid:** Test at 375px, 768px, and 1280px. If line breaks look wrong at mid-sizes, use `display: block` only at the line-break you want, or use `overflow: hidden` + translate y for a clip-reveal instead of opacity-only.

**Warning signs:** The second "line" wrapping unexpectedly in the 600-900px range.

### Pitfall 3: Section ordering in Home.tsx out of sync with CONTEXT

**What goes wrong:** Inserting new sections in the wrong order breaks the conversion funnel logic.

**Why it happens:** Home.tsx currently has 5 sections. Six new sections + modifications = easy to mis-order during incremental plan execution.

**How to avoid:** The final `Home.tsx` import order must be:
```
Nav → HeroSection → CountersSection → AIMatchingSection → HowItWorksSection
→ FarmTypesStrip → FeaturedListings → EmployerCTABand → TestimonialsSection
→ TrustedByStrip → FinalCTASection → LandingFooter
```
Each plan task that touches Home.tsx should show the full current section list.

### Pitfall 4: Tailwind v4 class conflict with rounded-2xl removal

**What goes wrong:** Removing `rounded-2xl` from the CTA fork and adding inline `borderRadius: '14px'` but leaving the Tailwind class in place — the Tailwind class wins (specificity).

**Why it happens:** Both Tailwind and inline styles target `border-radius`. In React, inline `style` prop has higher specificity than Tailwind utility classes. This is fine — but the `rounded-2xl` Tailwind class should still be removed to avoid confusion.

**How to avoid:** Remove `rounded-2xl` from className AND add `borderRadius: '14px'` to style prop.

### Pitfall 5: Farm types listing count query adds unnecessary Supabase call

**What goes wrong:** Adding a live Supabase count query for each of 5 farm sectors introduces 5 async requests on page load — noticeable on slow connections.

**Why it happens:** Attempting to show "live" counts when static/hardcoded counts are explicitly acceptable per CONTEXT.

**How to avoid:** Hardcode the listing counts as static placeholder numbers (e.g., 12, 8, 5, 3, 7). A single Supabase query with `group by sector` is acceptable only if it's a single RPC call, not 5 individual queries. Default to hardcoded.

---

## Code Examples

Verified patterns from project codebase and official sources:

### Staggered animate-on-load (hero, LAND-01)
```typescript
// Source: motion.dev/docs/react-animation + project pattern
import { motion } from 'motion/react'

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.18 } },
}
const lineVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } },
}

// Usage in HeroSection:
<motion.h1 variants={containerVariants} initial="hidden" animate="show" ...>
  <motion.span variants={lineVariants} className="block">Line 1</motion.span>
  <motion.span variants={lineVariants} className="block">Line 2</motion.span>
  <motion.span variants={lineVariants} className="block">Line 3</motion.span>
</motion.h1>
```

### Scroll-reveal wrapper (new sections)
```typescript
// Source: motion.dev/docs/react-scroll-animations
import { motion } from 'motion/react'

// Wrap section content (not the <section> itself — section provides bg color):
<section style={{ backgroundColor: 'var(--color-cream)' }}>
  <motion.div
    className="max-w-6xl mx-auto px-4 py-20"
    initial={{ opacity: 0, y: 32 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.15 }}
    transition={{ duration: 0.55, ease: 'easeOut' }}
  >
    {/* content */}
  </motion.div>
</section>
```

### Section shell pattern (all new components)
```typescript
// Derived from project convention: max-w-6xl, py-20, px-4, CSS custom props for colors
export function NewSection() {
  return (
    <section className="py-20 px-4" style={{ backgroundColor: 'var(--color-cream)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Eyebrow */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-px" style={{ backgroundColor: 'var(--color-meadow)' }} />
          <p className="text-xs font-bold tracking-widest uppercase"
            style={{ color: 'var(--color-meadow)' }}>
            Section Label
          </p>
        </div>
        {/* Heading */}
        <h2 className="font-display font-bold text-4xl md:text-5xl"
          style={{ color: 'var(--color-soil)' }}>
          Heading
        </h2>
      </div>
    </section>
  )
}
```

### CountersSection Live badge positioning
```typescript
// Extend CountersSection: badge sits in a flex row above or inline with the counters grid
// Uses soil background (same section), meadow color (same as other badges)
<div className="flex justify-center mb-4">
  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border
    text-xs font-semibold tracking-widest uppercase"
    style={{
      borderColor: 'rgba(122,175,63,0.3)',
      backgroundColor: 'rgba(122,175,63,0.08)',
      color: 'var(--color-meadow)',
    }}
  >
    <span className="w-2 h-2 rounded-full animate-pulse"
      style={{ backgroundColor: 'var(--color-meadow)' }} />
    Live
  </div>
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `import { motion } from 'framer-motion'` | `import { motion } from 'motion/react'` | 2024 (v11+) | Same API, new package name; both work but `motion` is the canonical package going forward |
| Manual `animation-delay` CSS stagger | `variants` + `staggerChildren` in motion/react | framer-motion v4+ | Declarative, no style injection, works with React re-renders |
| Custom IntersectionObserver + class toggle | `whileInView` prop | framer-motion v5+ | Less boilerplate; handles enter/leave automatically |

**Deprecated/outdated:**
- `framer-motion` package: Still functional but superseded by `motion`; the `framer-motion` package now forwards to `motion` internally
- `AnimatePresence` for entry-only animations: Not needed here — `initial`/`animate` handles load animations, `whileInView` handles scroll reveals

---

## Open Questions

1. **motion/react mock in existing landing-page tests**
   - What we know: `tests/landing-page.test.tsx` renders `<Home />` with jsdom; IntersectionObserver is already mocked
   - What's unclear: Whether `motion` components require additional mocking in jsdom environment — motion typically degrades gracefully but Web Animations API is not available
   - Recommendation: Install motion, run `npx vitest tests/landing-page.test.tsx` immediately after install; add minimal mock to `tests/setup.ts` only if tests fail

2. **Farm types listing counts: live vs hardcoded**
   - What we know: CONTEXT says counts are acceptable as hardcoded; Supabase client is available
   - What's unclear: Whether `jobs` table has a `sector` column that supports a simple count query
   - Recommendation: Hardcode placeholder counts (e.g., Dairy: 12, Sheep & Beef: 8, Horticulture: 5, Viticulture: 3, Arable: 4) as the default; a live query can be added in a future phase

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.1.x + Testing Library React 16.x |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest tests/landing-page.test.tsx --run` |
| Full suite command | `npx vitest --run` |

### Phase Requirements → Test Map

The existing `tests/landing-page.test.tsx` has test cases but they are mapped to old LAND numbering (LAND-01 through LAND-06 in that file map to different requirements than the new ones in REQUIREMENTS.md). The test file needs new test cases for the new LAND requirements.

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAND-01 | Hero headline renders with motion wrapper (aria text still visible) | unit | `npx vitest tests/landing-page.test.tsx --run` | ✅ (existing tests check hero text; new stagger test to add) |
| LAND-02 | CountersSection renders element with `animate-pulse` class and text "Live" | unit | `npx vitest tests/landing-page.test.tsx --run` | ❌ Wave 0 |
| LAND-03 | TestimonialsSection renders 4 stat blocks with "500+" text | unit | `npx vitest tests/landing-page.test.tsx --run` | ❌ Wave 0 |
| LAND-04 | AIMatchingSection renders with 4 bullet points | unit | `npx vitest tests/landing-page.test.tsx --run` | ❌ Wave 0 |
| LAND-05 | FarmTypesStrip renders 5 sector cards (Dairy, Sheep & Beef, Horticulture, Viticulture, Arable) | unit | `npx vitest tests/landing-page.test.tsx --run` | ❌ Wave 0 |
| LAND-06 | JobCard in FeaturedListings renders match score circle | unit | `npx vitest tests/landing-page.test.tsx --run` | ❌ Wave 0 |
| LAND-07 | EmployerCTABand renders "Post your first job" CTA and 4 checklist items | unit | `npx vitest tests/landing-page.test.tsx --run` | ❌ Wave 0 |
| LAND-08 | TrustedByStrip renders 5+ farm name placeholders | unit | `npx vitest tests/landing-page.test.tsx --run` | ❌ Wave 0 |
| LAND-09 | FinalCTASection renders dual buttons "Find Farm Work" + "Post a Job" | unit | `npx vitest tests/landing-page.test.tsx --run` | ❌ Wave 0 |
| LAND-10 | HeroSection CTA fork wrapper has borderRadius 14px (not 16px) | unit | `npx vitest tests/landing-page.test.tsx --run` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest tests/landing-page.test.tsx --run`
- **Per wave merge:** `npx vitest --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

The existing test file covers LAND-01/02 partially (hero text, counter labels). New test cases needed for all LAND requirements not yet covered:

- [ ] `tests/landing-page.test.tsx` — add tests for LAND-02 through LAND-10 (new sections and modifications)
- [ ] `motion/react` mock in `tests/setup.ts` — if motion install causes jsdom test failures

*(Existing test infrastructure covers structure; new test cases must be added in Wave 0 of Plan 10-01)*

---

## Sources

### Primary (HIGH confidence)
- Project codebase (read directly) — HeroSection.tsx, CountersSection.tsx, FeaturedListings.tsx, TestimonialsSection.tsx, HowItWorksSection.tsx, index.css, package.json
- Project test file (read directly) — tests/landing-page.test.tsx
- CONTEXT.md (read directly) — all locked decisions and discretion areas

### Secondary (MEDIUM confidence)
- [motion npm package](https://www.npmjs.com/package/motion) — package name and install command; confirmed `npm install motion`
- [Motion for React docs](https://motion.dev/docs/react) — `motion/react` import path; variants API; `whileInView` prop
- [motion stagger docs](https://motion.dev/docs/stagger) — `staggerChildren`, `delayChildren` API
- [Motion scroll animations](https://motion.dev/docs/react-scroll-animations) — `whileInView` + `viewport={{ once: true }}` pattern
- [LogRocket best React animation libraries](https://blog.logrocket.com/best-react-animation-libraries/) — ecosystem position of motion vs alternatives

### Tertiary (LOW confidence)
- WebSearch results on framer-motion → motion migration — confirmed by multiple sources that `import { motion } from 'motion/react'` is correct but exact version compatibility with React 19 was inferred from search summaries, not official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — motion/react install and import path confirmed by multiple independent sources; existing project patterns are read directly from source
- Architecture: HIGH — section structure, visual patterns, and component boundaries derived directly from existing codebase
- Pitfalls: MEDIUM — motion/jsdom interaction pitfall is known community knowledge; hardcoded vs live count pitfall is derived from CONTEXT decisions
- Test coverage gaps: HIGH — test file read directly; gaps are factual

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (motion API is stable; Tailwind v4 patterns are stable)
