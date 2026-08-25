# Phase 10: Landing Page - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning
**Source:** Auto-mode (recommended defaults selected)

<domain>
## Phase Boundary

Upgrade the existing landing page to include all SPEC sections, animations, and social proof elements that communicate TopFarms' value proposition to both employers and seekers. This phase adds new sections (AI matching, farm types, employer CTA, social proof stats, trusted-by, final CTA), enhances existing sections (hero animation, live counter badge, featured listing match scores), and fixes CTA fork styling.

</domain>

<decisions>
## Implementation Decisions

### Hero animation
- Motion library (framer-motion or `motion` package) required for staggered fadeUp — CSS keyframes insufficient for sequenced per-line animation control
- Stagger timing: 150-200ms delay between each headline line for readable sequential reveal
- Animation triggers on page load (not on scroll into view) since hero is above the fold
- CTA fork border radius corrected to 14px (currently rounded-2xl = 16px) per LAND-10
- CTA fork button text must match SPEC copy exactly

### Live counter badge
- Pulsing green "Live" dot badge added to the counter strip section, positioned left of the first counter as a standalone badge element
- Uses existing `animate-pulse` Tailwind utility for the dot — no motion library needed for this element
- Badge text: "Live" in uppercase tracking-widest, same style as existing eyebrow badges

### Featured listing match scores
- Reuse the match score circle pattern already present in HeroSection decorative cards (meadow-colored ring with percentage)
- Each featured job card gets a match score circle in the top-right corner (same position as tier badge, tier badge shifts below or is replaced)
- Score values are static/mock for anonymous visitors; real scores shown if logged-in seeker (requires auth check)

### New section ordering (top to bottom)
- Hero → Counters (with Live badge) → AI Matching → How It Works → Farm Types Strip → Featured Listings → Employer CTA Band → Testimonials + Social Proof Stats → Trusted-by Strip → Final CTA → Footer
- This follows a logical conversion funnel: hook → credibility → explain → showcase sectors → show jobs → convert employers → social proof → trust → final push

### AI matching section (LAND-04)
- Static mock browser window (rounded corners, fake address bar, dots) — not interactive
- 4 feature bullet points inside the mock window describing AI matching capabilities
- Subtle entrance animation using motion library (fade + slide up on scroll)
- Cream background section with soil-colored text, consistent with other light sections

### Farm types strip (LAND-05)
- 5 sector cards: Dairy, Sheep & Beef, Horticulture, Viticulture, Arable
- Each card shows sector name and listing count (fetched from Supabase or hardcoded placeholder)
- Horizontal scroll on mobile, grid on desktop
- Cards use existing fog/white styling pattern

### Employer CTA band (LAND-07)
- Soil/soil-deep background section targeting employers
- Mini dashboard preview as a simplified static mockup card (not a live component)
- 4-point checklist with checkmark icons (e.g., "Post in 5 minutes", "AI-matched candidates", "Track applications", "Pay on success")
- "Post your first job" CTA button in meadow green

### Social proof stat blocks (LAND-03)
- 4 connected stat blocks alongside the existing testimonials section
- Stats: "500+ Farms", "2,000+ Workers", "48hr Avg Match Time", "95% Satisfaction"
- Values are static/aspirational (not live from DB) — these are marketing numbers
- Connected visually via border or divider lines, same dark section as testimonials

### Trusted-by strip (LAND-08)
- Horizontal strip of farm brand name placeholders styled as greyed-out text logos
- Light/cream background, centered layout
- 5-6 placeholder names (e.g., "Fonterra Farms", "Silver Fern", "Greenfield", "Highview Station", "Valley View")

### Final CTA section (LAND-09)
- Centered headline with SPEC copy
- Dual buttons: "Find Farm Work" (meadow bg) + "Post a Job" (outline/hay border) — same pattern as hero CTA buttons
- Soil-deep background, cream text
- Positioned between trusted-by strip and footer

### Claude's Discretion
- Exact motion library package choice (framer-motion vs motion — research should determine best fit)
- Animation easing curves and exact durations beyond the stagger timing
- Mock browser window visual details (address bar content, shadow depth)
- Farm types strip listing count data source (live query vs hardcoded)
- Trusted-by strip placeholder brand names (any NZ agriculture-adjacent names)
- Responsive breakpoints for new sections

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in REQUIREMENTS.md LAND-01 through LAND-10 and decisions above. The SPEC is referenced implicitly via the requirement descriptions.

### Existing landing page components
- `src/pages/Home.tsx` — Current page composition and section ordering
- `src/components/landing/HeroSection.tsx` — Hero with headline, CTA fork, decorative cards
- `src/components/landing/CountersSection.tsx` — Live counters with useCountUp + useInView
- `src/components/landing/HowItWorksSection.tsx` — Tabbed seeker/employer steps
- `src/components/landing/FeaturedListings.tsx` — Featured job cards with tier badges
- `src/components/landing/TestimonialsSection.tsx` — Testimonial cards with star ratings
- `src/components/landing/LandingFooter.tsx` — Footer with nav columns

### Hooks and utilities
- `src/hooks/useInView.ts` — Intersection observer for scroll-triggered animations
- `src/hooks/useCountUp.ts` — Animated number counter

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `HeroSection.tsx`: Match score circle pattern (meadow ring + percentage) — reuse for LAND-06 featured listing cards
- `CountersSection.tsx`: `useInView` + `useCountUp` pattern — extend for social proof stat animation
- `TestimonialsSection.tsx`: Dark section styling (soil bg, cream text, rgba borders) — reuse for employer CTA band and final CTA
- `HowItWorksSection.tsx`: Eyebrow + heading + grid card pattern — reuse structure for new sections
- `animate-pulse` class already used for the meadow dot in hero eyebrow badge — reuse for LAND-02 live counter dot

### Established Patterns
- CSS custom properties for all colors (var(--color-soil), var(--color-meadow), etc.)
- Inline styles for color values, Tailwind for layout/spacing
- Supabase client for data fetching (see CountersSection RPC pattern)
- Section pattern: full-width section with max-w-6xl centered container, py-20 px-4

### Integration Points
- `Home.tsx` section composition — new sections inserted between existing ones
- `package.json` — motion library needs to be installed (not present yet)
- No router changes needed — all content is on the `/` route

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond SPEC compliance — open to standard approaches for all new sections.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-landing-page*
*Context gathered: 2026-03-22 via auto-mode*
