# Phase 6: Landing Page and Launch - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

The public landing page is live with real platform data, all flows pass mobile QA at 320px, accessibility meets WCAG 2.1 AA, and the application is deployed to production on Vercel. This replaces the current placeholder Home.tsx with a full marketing landing page and ensures the entire platform is launch-ready.

</domain>

<decisions>
## Implementation Decisions

### Hero & CTA design
- Headline tone: direct and practical (e.g., "Find your next farm role" / "Find skilled farm workers")
- Dual CTA buttons: primary solid (seeker) + outline (employer), consistent with existing Home.tsx button pattern
- Each CTA goes to /signup with role pre-selected via URL parameter
- Hero section fills viewport height on desktop, stacks naturally on mobile

### Live counters
- Real Supabase counts via RPC or direct query on page load (jobs posted, workers registered, matches made)
- Count-up animation triggered by Intersection Observer when section scrolls into view
- Counter labels: "Jobs Posted" / "Workers Registered" / "Matches Made"
- Graceful fallback to static "0" if query fails (no broken UI)

### How-it-works & content sections
- Tab-style toggle between Employer and Seeker paths in how-it-works section
- Featured listings section queries active Featured/Premium tier jobs from database
- Testimonials section uses static placeholder content with photo/name/role for launch (no real testimonials yet)
- Footer includes navigation links (Jobs, Sign Up, Login) and legal links (Privacy, Terms)

### Mobile QA & accessibility
- Verify all flows at 320px minimum: auth, employer onboarding, job posting, seeker onboarding, job search, application, shortlist, contact release
- Drawer filter sidebar already exists from Phase 3 — verify it works correctly
- Lighthouse audit targeting Performance >90, Accessibility >90
- Manual keyboard navigation and screen reader check on critical flows (signup, job search, apply)
- WCAG 2.1 AA compliance: focus indicators, alt text, color contrast, ARIA labels

### Claude's Discretion
- Hero background approach: CSS-only (soil-deep + gradient blobs + topographic lines) or farm photograph with dark overlay — CSS-only recommended for launch (avoids LCP penalty, no image sourcing needed, wireframe uses this approach)
- Exact hero image selection and overlay opacity (if photograph approach chosen)
- Counter animation easing and duration
- How-it-works step count and copy
- Testimonial card layout and number of testimonials
- Footer layout and link grouping
- Vercel deployment configuration details
- Lighthouse optimization techniques (code splitting, lazy loading, image optimization)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Landing page wireframe
- `TopFarms_Launch_Pack/wireframes/TopFarms_Landing_Page.html` — Full landing page wireframe with hero, counters, how-it-works, featured listings, testimonials, footer

### Revenue and data architecture
- `TopFarms_Launch_Pack/docs/TopFarms_Revenue_Journey.html` — Revenue model context for landing page messaging
- `TopFarms_Launch_Pack/docs/TopFarms_Data_Architecture.html` — Data architecture for counter queries

### Project specification
- `SPEC.md` — Full technical specification with landing page requirements

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/pages/Home.tsx`: Current placeholder — will be replaced with full landing page
- `src/components/layout/Nav.tsx`: Existing navigation component, may need landing page variant
- `src/components/ui/Button.tsx`: Design system button with soil/cream palette
- `src/components/ui/Card.tsx`: Card component for featured listings display
- `src/components/ui/JobCard.tsx`: Job card component — reusable for featured listings section
- `src/components/ui/Tag.tsx`: Tag component for job metadata
- `src/components/ui/VerificationBadge.tsx`: Trust badges for featured listing cards
- `src/components/ui/MatchCircle.tsx`: Match score display for visitor teaser

### Established Patterns
- CSS variables for design tokens: `var(--color-soil)`, `var(--color-cream)`, `var(--color-moss)`, etc.
- Fraunces for display headings (`font-display`), DM Sans for body text
- Tailwind v4 with `@tailwindcss/vite` — CSS-first `@theme` directive, no tailwind.config.js
- Supabase client queries with `.from().select()` pattern
- react-router@7 for routing (unified package, not react-router-dom)
- 320px mobile-first responsive design with `sm:`, `md:`, `lg:` breakpoints

### Integration Points
- `src/main.tsx`: Route `/` currently renders `<Home />` — replace with landing page
- `src/pages/jobs/JobSearch.tsx`: FilterSidebar drawer pattern for mobile reference
- Supabase RPC/queries for live counters (jobs count, seeker_profiles count, match_scores count)
- Vercel deployment: `vite build` output in `dist/` directory

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Wireframe in TopFarms_Launch_Pack provides the visual reference.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-landing-page-and-launch*
*Context gathered: 2026-03-17*
