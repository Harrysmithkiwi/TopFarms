# Phase 06: Landing Page and Launch - Research

**Researched:** 2026-03-17
**Domain:** React landing page, Intersection Observer animations, Supabase counter queries, Vercel deployment, WCAG 2.1 AA, Lighthouse performance
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Hero & CTA design**
- Full-bleed farm photograph background with dark overlay for text contrast
- Headline tone: direct and practical (e.g., "Find your next farm role" / "Find skilled farm workers")
- Dual CTA buttons: primary solid (seeker) + outline (employer), consistent with existing Home.tsx button pattern
- Each CTA goes to /signup with role pre-selected via URL parameter
- Hero section fills viewport height on desktop, stacks naturally on mobile

**Live counters**
- Real Supabase counts via RPC or direct query on page load (jobs posted, workers registered, matches made)
- Count-up animation triggered by Intersection Observer when section scrolls into view
- Counter labels: "Jobs Posted" / "Workers Registered" / "Matches Made"
- Graceful fallback to static "0" if query fails (no broken UI)

**How-it-works & content sections**
- Tab-style toggle between Employer and Seeker paths in how-it-works section
- Featured listings section queries active Featured/Premium tier jobs from database
- Testimonials section uses static placeholder content with photo/name/role for launch (no real testimonials yet)
- Footer includes navigation links (Jobs, Sign Up, Login) and legal links (Privacy, Terms)

**Mobile QA & accessibility**
- Verify all flows at 320px minimum: auth, employer onboarding, job posting, seeker onboarding, job search, application, shortlist, contact release
- Drawer filter sidebar already exists from Phase 3 — verify it works correctly
- Lighthouse audit targeting Performance >90, Accessibility >90
- Manual keyboard navigation and screen reader check on critical flows (signup, job search, apply)
- WCAG 2.1 AA compliance: focus indicators, alt text, color contrast, ARIA labels

### Claude's Discretion
- Exact hero image selection and overlay opacity
- Counter animation easing and duration
- How-it-works step count and copy
- Testimonial card layout and number of testimonials
- Footer layout and link grouping
- Vercel deployment configuration details
- Lighthouse optimization techniques (code splitting, lazy loading, image optimization)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LAND-01 | Hero section with full-bleed background, headline, and dual CTA (employer/seeker paths) | Wireframe in TopFarms_Landing_Page.html provides full visual spec; SignUp.tsx needs `?role=` param read via `useSearchParams` |
| LAND-02 | Live counters (jobs posted, workers registered, matches made) with scroll-triggered animation | Supabase `jobs`, `seeker_profiles`, `match_scores` tables support direct count queries; Intersection Observer API (no library needed) drives count-up |
| LAND-03 | How-it-works section with employer/seeker toggle | Tab toggle implemented with `useState` — no Radix Tabs needed (plain button approach used in wireframe) |
| LAND-04 | Featured job listings section | Query `jobs` table where `status='active'` and `listing_tier IN ('featured','premium')` via existing Supabase client pattern; reuse `JobCard`/`SearchJobCard` components |
| LAND-05 | Testimonials section | Static data only — no database query; 3 placeholder cards with avatar initial, name, role, farm, quote |
| LAND-06 | Footer with navigation and legal links | Static — `/jobs`, `/signup`, `/login`, plus placeholder `/privacy`, `/terms` |
</phase_requirements>

---

## Summary

Phase 6 is the final phase: replace the placeholder `Home.tsx` with a full marketing landing page, then do mobile QA and Lighthouse optimisation across the entire platform before Vercel production deployment.

The codebase is well-prepared. All design tokens, typography, and component primitives are already in place. The wireframe in `TopFarms_Landing_Page.html` is the authoritative visual spec and can be translated directly to TSX using the project's Tailwind v4 CSS variables. The primary new technical work is: (1) the landing page component itself, (2) Supabase counter queries with Intersection Observer count-up animation, (3) a URL-param role pre-selection hook in SignUp.tsx, (4) a Vercel deployment configuration, and (5) cross-platform mobile QA at 320px.

No new npm dependencies are needed for any of these — Intersection Observer is a native browser API, count-up animation can be a small custom hook (or requestAnimationFrame loop), and Vercel deployment requires only a `vercel.json` with SPA rewrite rules plus environment variable setup.

**Primary recommendation:** Work in waves — build landing page first, then do Vercel setup + env vars, then run mobile QA and Lighthouse across all flows, fixing issues as they surface. The landing page is self-contained and can be developed and tested in isolation before the broader QA pass.

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | ^19.1.0 | Component rendering | Project standard |
| react-router | ^7.5.0 | CTA navigation + `useSearchParams` | Project standard; already used for all routing |
| @supabase/supabase-js | ^2.49.4 | Counter queries | Project standard; `supabase` client already in `@/lib/supabase` |
| tailwind v4 + @tailwindcss/vite | ^4.1.3 | Styling with CSS variables | Project standard; `@theme` directive, no config file |
| lucide-react | ^0.487.0 | Icons in footer / steps | Project standard |
| sonner | ^2.0.3 | Toast notifications (existing; landing page itself needs none) | Project standard |

### Browser APIs (no install required)

| API | Purpose | Confidence |
|-----|---------|-----------|
| `IntersectionObserver` | Trigger count-up animation and reveal animations when sections scroll into view | HIGH — native, >97% browser support |
| `requestAnimationFrame` | Drive count-up number animation smoothly | HIGH — native |
| `window.matchMedia` | Detect print/reduced-motion for animation opt-out | HIGH — native |

### No New Dependencies Needed
- Count-up animation: custom hook using `requestAnimationFrame` (< 30 lines) — no `react-countup` needed
- Intersection Observer scroll reveal: custom hook (< 20 lines) — no `framer-motion` needed
- Hero background: CSS `background-image` with overlay — no image library needed
- Vercel deployment: `vercel.json` + Vercel CLI or GitHub integration — no extra npm package

### Installation
```bash
# No new packages needed — all dependencies already installed
```

---

## Architecture Patterns

### Recommended File Structure

```
src/
├── pages/
│   └── Home.tsx                    # REPLACE entirely with LandingPage component
├── components/
│   └── landing/                    # New folder — landing-page-specific sections
│       ├── HeroSection.tsx         # Full-bleed hero + dual CTA fork
│       ├── CountersSection.tsx     # Live counters with Intersection Observer
│       ├── HowItWorksSection.tsx   # Employer/seeker tab toggle
│       ├── FeaturedListings.tsx    # Active featured/premium job cards
│       ├── TestimonialsSection.tsx # Static placeholder testimonials
│       └── LandingFooter.tsx       # Footer with nav + legal links
├── hooks/
│   └── useCountUp.ts               # Count-up animation hook
└── ...
vercel.json                         # SPA rewrite rules + build config
```

### Pattern 1: Counter Query + Count-Up Hook

**What:** Fetch three counts from Supabase on mount, then animate each from 0 to the real value when the section enters the viewport using Intersection Observer.

**When to use:** LAND-02

```typescript
// src/hooks/useCountUp.ts
import { useEffect, useRef, useState } from 'react'

export function useCountUp(target: number, duration = 1800, active = false) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!active || target === 0) return
    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration, active])

  return value
}
```

```typescript
// Supabase counter fetch pattern — in CountersSection.tsx
const { count: jobCount } = await supabase
  .from('jobs')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'active')

const { count: seekerCount } = await supabase
  .from('seeker_profiles')
  .select('*', { count: 'exact', head: true })

const { count: matchCount } = await supabase
  .from('match_scores')
  .select('*', { count: 'exact', head: true })
  .gte('total_score', 50) // meaningful matches only
```

**Graceful fallback:** Check `count === null` and use `0` — no error UI shown.

### Pattern 2: Intersection Observer Scroll Reveal

**What:** Attach an observer to section refs; add a `visible` class when the element enters the viewport; CSS transitions handle the animation.

**When to use:** All landing sections (LAND-02 counters trigger, all sections for fade-up reveal)

```typescript
// src/hooks/useInView.ts
import { useEffect, useRef, useState } from 'react'

export function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect() } },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, inView }
}
```

### Pattern 3: URL-Param Role Pre-selection

**What:** Landing page CTAs link to `/signup?role=seeker` and `/signup?role=employer`. SignUp.tsx reads the param and pre-selects the role radio.

**Critical gap:** The current `SignUp.tsx` does NOT read a `role` URL parameter. This must be added in the same plan that implements the landing page CTA links.

```typescript
// In SignUp.tsx — add to existing component
import { useSearchParams } from 'react-router'

// Inside component body:
const [searchParams] = useSearchParams()
const roleParam = searchParams.get('role') as 'employer' | 'seeker' | null

// In useForm default values:
const { register, ... } = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: {
    role: (roleParam === 'employer' || roleParam === 'seeker') ? roleParam : 'seeker',
    // ...other defaults
  }
})
```

### Pattern 4: Featured Listings Query

**What:** Query active jobs with a tier filter; display using existing `SearchJobCard` or a simplified landing card variant.

**When to use:** LAND-04

```typescript
const { data: featuredJobs } = await supabase
  .from('jobs')
  .select(`
    id, title, region, contract_type, salary_min, salary_max,
    listing_tier, created_at,
    employer_profiles!inner(farm_name, region)
  `)
  .eq('status', 'active')
  .in('listing_tier', ['featured', 'premium'])
  .order('created_at', { ascending: false })
  .limit(6)
```

**Fallback:** If no featured jobs exist in DB yet (new platform), show 0–3 placeholder cards with a "Be the first to post" CTA — never a broken empty grid.

### Pattern 5: Vercel Deployment

**What:** SPA rewrite rule so Vercel serves `index.html` for all routes (React Router handles client-side routing).

```json
// vercel.json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

**Environment variables** required in Vercel dashboard (match `.env`):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`

### Anti-Patterns to Avoid

- **Don't use `framer-motion` for landing animations** — adds ~50 KB to bundle; native CSS transitions + `useInView` hook achieve the same result with zero cost
- **Don't hard-code counter values** — even if DB is empty at launch, use real queries + graceful 0 fallback; hardcoded numbers break trust
- **Don't put landing page sections inline in Home.tsx** — break into `src/components/landing/` subfolder so each section is independently testable and editable
- **Don't use `<img>` for hero background** — use CSS `background-image` with the `background-size: cover` / `background-position: center` pattern to avoid layout shift
- **Don't skip `prefers-reduced-motion` check** — wrap count-up and reveal animations in a `matchMedia('(prefers-reduced-motion: reduce)')` guard for accessibility

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Count-up number animation | A third-party library | `useCountUp` hook (< 30 lines, native rAF) | No extra bundle cost; full control over easing |
| Scroll reveal | A scroll library | `useInView` hook (< 20 lines, native IntersectionObserver) | Same capability, zero cost |
| Tab toggle (how-it-works) | Radix Tabs | Plain `useState` + button elements | No Radix Tabs installed; plain state is simpler for a 2-item toggle |
| Featured job cards | New card component | `SearchJobCard` (already exists) or a simplified wrapper | Reusing existing component ensures visual consistency |
| SPA routing on Vercel | Express server / custom rewrites | `vercel.json` `rewrites` rule | One-line solution, officially supported |

---

## Common Pitfalls

### Pitfall 1: Nav Overlap on Landing Hero

**What goes wrong:** `Nav` is `sticky top-0` with `h-14` (56px). If the hero section uses `min-h-screen` without accounting for nav height, the headline is partially hidden behind the nav on load.

**Why it happens:** `100vh` includes the nav height area — the nav then overlaps the top of the hero.

**How to avoid:** Use `min-h-screen` with `pt-14` padding on the hero, OR use `min-h-[calc(100vh-56px)]` (as the current placeholder does). Match the wireframe's `padding-top: 58px` approach.

**Warning signs:** Headline text disappears behind nav on first load, especially at mobile widths.

### Pitfall 2: Featured Listings Empty State

**What goes wrong:** At launch, the DB has zero active Featured/Premium jobs. Querying returns an empty array, rendering a broken empty grid.

**Why it happens:** New platform — no listings with paid tiers yet.

**How to avoid:** Handle `featuredJobs.length === 0` explicitly — either show a placeholder card with a "Post a featured job" CTA or fall back to showing the 3 most-recent active jobs regardless of tier.

### Pitfall 3: SignUp Role Pre-selection Not Wired

**What goes wrong:** Landing page CTAs link to `/signup?role=seeker` but `SignUp.tsx` ignores the `role` URL param — user arrives at signup with neither role pre-selected.

**Why it happens:** The current `SignUp.tsx` was built before the landing page CTA spec existed; it has no `useSearchParams` call.

**How to avoid:** The plan that implements `HeroSection.tsx` CTAs MUST also include the `SignUp.tsx` change to read `?role=`. They should be in the same plan wave.

### Pitfall 4: Tailwind v4 CSS Variable Naming Collision

**What goes wrong:** The wireframe HTML uses CSS variables like `var(--soil)`, `var(--cream)`. The project uses `var(--color-soil)`, `var(--color-cream)` (Tailwind v4 `@theme` prefix). Copying wireframe styles verbatim produces invisible styles (variables resolve to empty string).

**Why it happens:** Wireframe is a standalone HTML file with its own `:root` definitions; project uses Tailwind v4's `@theme` directive which adds `--color-` prefix automatically.

**How to avoid:** When translating wireframe CSS to Tailwind classes or inline styles, always use `var(--color-soil)` not `var(--soil)`. Use Tailwind utility classes (`text-soil`, `bg-cream`, etc.) where possible — these are already wired to the correct tokens.

### Pitfall 5: Lighthouse Image Performance

**What goes wrong:** Hero background image (if loaded as `<img>` or unoptimised `background-image` URL) fails Core Web Vitals — LCP > 2.5s on 4G.

**Why it happens:** Unoptimised full-size farm photos can be 2–5 MB.

**How to avoid:** Use a compressed WebP image (< 300 KB for hero), add `rel="preload"` for the hero background in `index.html`, use `background-size: cover`. If using a placeholder gradient for launch, that's zero cost.

### Pitfall 6: WCAG 2.1 AA Contrast on Dark Hero

**What goes wrong:** Text on semi-transparent dark overlay may not meet 4.5:1 contrast ratio, especially on mobile where the overlay can be thinner.

**Why it happens:** Overlay opacity is discretionary — too low and cream-on-dark-photo can dip below AA.

**How to avoid:** Set overlay at minimum `rgba(0,0,0,0.6)` to guarantee sufficient contrast for `var(--color-cream)` (`#F7F2E8`) on dark background. Use a browser contrast checker before finalising opacity. The wireframe uses `var(--soil-deep)` (`#1E1108`) as the hero background with gradient blobs — not a photo overlay — which is inherently safe. Consider matching the wireframe approach (solid dark background + CSS blobs) rather than a real photo overlay for the launch.

### Pitfall 7: 320px Mobile — Dual CTA Fork Layout

**What goes wrong:** The wireframe's side-by-side CTA fork (two columns at equal width) overflows at 320px because `flex: 1` on 150px+ elements exceeds the viewport.

**Why it happens:** The wireframe assumes desktop layout; the CSS breakpoint drops to single column at 900px but 320px was not explicitly handled in the wireframe.

**How to avoid:** At `< 640px` (`sm:` breakpoint), stack the fork sides vertically (`flex-col`). Each CTA becomes full-width. This matches the pattern of the existing `Home.tsx` placeholder.

---

## Code Examples

### Counter Section — Full Pattern

```typescript
// src/components/landing/CountersSection.tsx
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useCountUp } from '@/hooks/useCountUp'
import { useInView } from '@/hooks/useInView'

type Counts = { jobs: number; seekers: number; matches: number }

export function CountersSection() {
  const [counts, setCounts] = useState<Counts>({ jobs: 0, seekers: 0, matches: 0 })
  const { ref, inView } = useInView(0.3)

  useEffect(() => {
    async function fetchCounts() {
      const [jobs, seekers, matches] = await Promise.all([
        supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('seeker_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('match_scores').select('*', { count: 'exact', head: true }),
      ])
      setCounts({
        jobs: jobs.count ?? 0,
        seekers: seekers.count ?? 0,
        matches: matches.count ?? 0,
      })
    }
    fetchCounts()
  }, [])

  const animJobs = useCountUp(counts.jobs, 1600, inView)
  const animSeekers = useCountUp(counts.seekers, 1800, inView)
  const animMatches = useCountUp(counts.matches, 2000, inView)

  return (
    <div ref={ref} className="...">
      <Counter value={animJobs} label="Jobs Posted" />
      <Counter value={animSeekers} label="Workers Registered" />
      <Counter value={animMatches} label="Matches Made" />
    </div>
  )
}
```

### Supabase Count Query — Correct Pattern

```typescript
// Correct: use { count: 'exact', head: true } — no row data returned, just the count
const { count, error } = await supabase
  .from('jobs')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'active')
// count is number | null — handle null as 0
```

### How-It-Works Toggle

```typescript
// src/components/landing/HowItWorksSection.tsx
const [tab, setTab] = useState<'seeker' | 'employer'>('seeker')

// Toggle UI:
<div className="inline-flex bg-fog rounded-[10px] p-1 gap-1 mb-12">
  {(['seeker', 'employer'] as const).map((t) => (
    <button
      key={t}
      onClick={() => setTab(t)}
      className={cn(
        'px-6 py-2 rounded-[7px] text-sm font-semibold transition-all',
        tab === t
          ? 'bg-white text-moss shadow-sm'
          : 'text-light hover:text-mid'
      )}
      aria-selected={tab === t}
      role="tab"
    >
      {t === 'seeker' ? 'Farm Workers' : 'Farm Employers'}
    </button>
  ))}
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vercel `routes` key in vercel.json | `rewrites` key | Vercel ~2021 | `routes` is deprecated; `rewrites` is the correct SPA fallback pattern |
| `react-intersection-observer` npm package | Native `IntersectionObserver` API | Browser support reached >97% ~2020 | No dependency needed |
| Tailwind config file (`tailwind.config.js`) | `@theme` directive in CSS | Tailwind v4 (2024) | This project already uses v4 — no config file exists |

---

## Open Questions

1. **Hero background: solid dark + CSS blobs vs real farm photograph**
   - What we know: The wireframe uses `var(--soil-deep)` with gradient blobs — no photograph. CONTEXT.md says "full-bleed farm photograph background with dark overlay." These conflict.
   - What's unclear: Is a real photograph mandatory, or is the wireframe's CSS-only approach acceptable for launch?
   - Recommendation: Use the wireframe's CSS-only approach (soil-deep + radial gradient blobs + topographic lines pattern) for v1 launch. This avoids the LCP penalty, contrast risk, and the need to source/optimise a photograph. If a real photo is required, use a WebP < 300 KB with `rgba(0,0,0,0.65)` overlay.

2. **RLS on counter queries — are anonymous reads permitted?**
   - What we know: `jobs` table has RLS. The landing page is a public, unauthenticated page. `select count` on `jobs` where `status='active'` should be allowed by RLS public-read policy (job listings are public), but `seeker_profiles` and `match_scores` may be restricted.
   - What's unclear: The existing RLS policies for `seeker_profiles` and `match_scores` — are anonymous count queries permitted?
   - Recommendation: Test counter queries anonymously during Wave 0. If blocked, create a Postgres function `get_platform_stats()` with `SECURITY DEFINER` that returns the three counts — call via `supabase.rpc('get_platform_stats')`. This is the safe pattern.

3. **Lighthouse target achievability with external fonts**
   - What we know: Google Fonts (Fraunces + DM Sans) are loaded in `index.css` via `@import url(...)` — this is render-blocking. Lighthouse may flag this.
   - What's unclear: Whether the current font loading strategy causes an LCP or FCP failure at the Lighthouse targets.
   - Recommendation: Move font import to `<link rel="preconnect">` + `<link rel="stylesheet">` tags in `index.html` with `display=swap` (already used). This is already done in the project's `@import` call which includes `display=swap`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.1.1 + Testing Library React 16.3 + jsdom |
| Config file | `vitest.config.ts` (merges `vite.config.ts` for `@` alias) |
| Quick run command | `npx vitest run tests/landing-page.test.tsx` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAND-01 | Hero renders with seeker + employer CTA links | unit | `npx vitest run tests/landing-page.test.tsx` | Wave 0 |
| LAND-01 | CTAs link to `/signup?role=seeker` and `/signup?role=employer` | unit | `npx vitest run tests/landing-page.test.tsx` | Wave 0 |
| LAND-01 | SignUp pre-selects role from `?role=` URL param | unit | `npx vitest run tests/signup-role-preselect.test.tsx` | Wave 0 |
| LAND-02 | Counter section renders with 0 initially | unit | `npx vitest run tests/landing-page.test.tsx` | Wave 0 |
| LAND-02 | Counter falls back to 0 on Supabase error | unit | `npx vitest run tests/landing-page.test.tsx` | Wave 0 |
| LAND-03 | How-it-works tab toggles between seeker and employer views | unit | `npx vitest run tests/landing-page.test.tsx` | Wave 0 |
| LAND-04 | Featured listings renders empty-state CTA when no listings returned | unit | `npx vitest run tests/landing-page.test.tsx` | Wave 0 |
| LAND-05 | Testimonials renders 3 cards | unit | `npx vitest run tests/landing-page.test.tsx` | Wave 0 |
| LAND-06 | Footer renders Jobs, Sign Up, Login, Privacy, Terms links | unit | `npx vitest run tests/landing-page.test.tsx` | Wave 0 |
| Mobile QA | All flows pass at 320px | manual | N/A — browser resize + DevTools | Manual only |
| Lighthouse | Performance > 90, Accessibility > 90 | manual | `npx lighthouse http://localhost:4173 --view` | Manual only |
| WCAG 2.1 AA | Colour contrast, focus indicators, ARIA labels | semi-automated | Lighthouse accessibility audit + axe DevTools | Manual only |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/landing-page.test.tsx`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + manual Lighthouse + manual 320px check before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/landing-page.test.tsx` — covers LAND-01 through LAND-06 component rendering
- [ ] `tests/signup-role-preselect.test.tsx` — covers LAND-01 CTA → SignUp role param handoff

*(Existing test infrastructure covers the remaining suite; these two files are the only additions needed.)*

---

## Sources

### Primary (HIGH confidence)
- `TopFarms_Launch_Pack/wireframes/TopFarms_Landing_Page.html` — authoritative visual spec, section layout, CSS patterns, responsive breakpoints
- `src/index.css` — CSS variable names (all use `--color-` prefix, not bare names)
- `src/main.tsx` — existing router config, Home.tsx registration
- `src/pages/Home.tsx` — current placeholder (to be replaced)
- `src/pages/auth/SignUp.tsx` — confirms no `?role=` param reading exists yet
- `package.json` — confirms all libraries available, no new installs needed
- `vitest.config.ts` + `tests/setup.ts` — confirms test infrastructure

### Secondary (MEDIUM confidence)
- MDN Web Docs — `IntersectionObserver` API, `requestAnimationFrame`, `count: 'exact'` Supabase pattern
- Vercel documentation — `rewrites` config for SPA fallback (replaces deprecated `routes`)

### Tertiary (LOW confidence)
- RLS permissions for anonymous count queries on `seeker_profiles` and `match_scores` — needs runtime validation (see Open Questions #2)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies confirmed from package.json; no new installs
- Architecture: HIGH — wireframe provides direct implementation reference; patterns drawn from existing codebase
- Pitfalls: HIGH — sourced from codebase inspection (CSS variable naming, Nav height, RLS) and wireframe analysis
- Validation: HIGH — existing Vitest infrastructure is confirmed and working

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable stack)
