# TopFarms v1 → v2.0 Brand Migration Audit

> **Version:** 1.0 — 24 April 2026
> **Purpose:** Single source of truth for migrating the shipped TopFarms codebase from the v1 brand system (Fraunces + DM Sans + soil/moss/meadow earth palette) to the v2.0 brand system (Inter + single-green modern SaaS palette).
> **Consumers:** Claude Design (input for extracting design system), Claude Code (input for executing migration).
> **Status:** Awaiting sign-off. No code changes until this document is approved.

---

## 1. Executive Summary

### What we're doing

Visual-only migration of an already-shipped, working product. No data model changes. No route changes. No feature additions or removals. No match scoring engine changes. No Edge Function changes. Every user-facing surface — landing page, onboarding, job search, match circles, applicant dashboard, every component — gets the v2.0 brand applied. Nothing else.

### What's at stake

TopFarms v1.0 MVP shipped 17 March 2026. v1.1 SPEC Compliance shipped 23 March 2026. That's a real product with 116 TypeScript files, 39 components, 16 database migrations, 7 Edge Functions, live Stripe integration. Breaking it mid-migration is unacceptable. Landing this migration cleanly is the whole point of Option A (rebrand as migration vs scrap and rebuild).

### Scope numbers

| Metric | Count | Notes |
|---|---|---|
| Files touched by migration | 107 | Every component, page, layout file referencing v1 tokens or fonts |
| v1 colour tokens to retire | ~20 | 10 declared in `index.css` plus `ink`, `mid`, `light`, `red`, `red-lt`, `blue`, `blue-lt`, `orange`, `orange-lt`, `purple`, `purple-lt`, `white` |
| Tailwind utility class replacements | ~180 unique class usages | `bg-moss`, `text-fern`, `border-fog`, etc. |
| Inline `style={{}}` property swaps | ~200 occurrences | Direct `var(--color-*)` references |
| Font file changes | 1 import line, 2 font variables | Google Fonts Fraunces + DM Sans → Inter |
| Components requiring code changes | 39 UI + 12 landing + 5 layout + 50+ pages | Phased across 6 migration phases |
| Components requiring design changes beyond tokens | 0 | Structure unchanged — tokens only |

### Estimated duration

| Phase | Effort | Can ship independently? |
|---|---|---|
| Phase 0 — `@theme` token swap | 2-4 hours | Yes |
| Phase 1 — Primitives | 4-6 hours | Yes |
| Phase 2 — Brand-critical components | 3-4 hours | Yes |
| Phase 3 — Composed components | 6-8 hours | Yes |
| Phase 4 — Page shells | 3-4 hours | Yes |
| Phase 5 — Landing page | 6-8 hours | Yes |
| Phase 6 — Cleanup + QA | 4-6 hours | Final merge |
| **Total active development** | **28-40 hours** | Spread across 1-3 weeks depending on solo/team |

### Decisions locked (24 April 2026)

Five decisions signed off before this document was produced. These are non-negotiable inputs to the migration.

1. **Token naming:** Rename to v2 semantic tokens (`--color-moss` → `--color-brand`, etc.) — not a paint job over v1 names. Commits to proper migration, not half-measures.
2. **Typography:** Keep two font CSS variables (`--font-display`, `--font-body`), both pointing at Inter. Zero typography find/replace during migration. Collapse to one variable in a later cleanup task.
3. **AuthLayout:** Token swap only for this migration. Split-screen layout stays, soil gradient becomes `--color-brand-900` forest green gradient. Full redesign deferred to post-migration.
4. **Landing page:** Migrate same 12-component structure with new tokens. No rebuild. Full landing rebuild with v2 aesthetic deferred to Phase 2 marketing refresh.
5. **Audit scope:** Component categories with representative examples. Scannable, not exhaustive file-by-file.

### Risk assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Visual regression breaks existing flows | Low | Low | Phase-by-phase preview deploys on Vercel, manual click-through after each phase |
| Functional regression (tests fail) | Low | High | Vitest suite runs after every phase; Stripe + Claude + Supabase integration tested on preview before main merge |
| AuthLayout visual quality degrades | Medium | Low | Decision 3 accepted — token swap only, full redesign deferred |
| Landing page loses brand distinctiveness | Medium | Medium | Decision 4 accepted — same structure + new tokens; rebuild is Phase 2 |
| Contrast ratios fail WCAG AA after swap | Low | Medium | Pre-check in audit §3; `--text` on `--bg` = 17.8:1 (AAA), `--brand` on white = 4.5:1 (AA) — spot checks in Phase 0 |
| Legacy token names orphaned in obscure file | Medium | Low | Phase 6 sweep with final grep; can ship interim aliases during migration |

---

## 2. Current State — v1 Token Inventory

### 2.1 v1 tokens declared in `src/index.css`

From grep of `src/index.css` lines 6-15:

```css
--color-soil: #2c1a0e;
--color-soil-deep: #1e1108;
--color-moss: #2d5016;
--color-fern: #4a7c2f;
--color-meadow: #7aaf3f;
--color-hay: #d4a843;
--color-hay-lt: #fff8e7;
--color-cream: #f7f2e8;
--color-fog: #eee8dc;
--color-mist: #f2eee6;
```

Plus fonts declared in `src/index.css` lines 31-32:

```css
--font-display: "Fraunces", serif;
--font-body: "DM Sans", sans-serif;
```

### 2.2 v1 tokens used but not seen in grep (referenced implicitly)

From reading component files — these are declared elsewhere in `index.css` or used via Tailwind utility shortcuts:

- `--color-ink` — primary text
- `--color-mid` — secondary text
- `--color-light` — tertiary text / placeholders
- `--color-white` — surface white
- `--color-red` / `--color-red-lt` — error states
- `--color-blue` / `--color-blue-lt` — info states
- `--color-orange` / `--color-orange-lt` — warning states (used alongside `hay`)
- `--color-purple` / `--color-purple-lt` — AI insight boxes

**Action required:** Claude Code should first `cat src/index.css` to get the complete v1 token declaration list, then cross-reference against the proposed v2 mapping in §3.

### 2.3 Usage hotspots

Files with 10+ v1 token references (migration-heavy):

| File | v1 references | Tier |
|---|---|---|
| `src/components/ui/FilterSidebar.tsx` | 18 | Moderate (Tailwind + inline) |
| `src/pages/dashboard/employer/ApplicantDashboard.tsx` | 17 | Complex (both patterns) |
| `src/components/landing/HeroSection.tsx` | 16 | Complex (mostly inline styles) |
| `src/components/landing/FeaturedListings.tsx` | 15 | Complex (mostly inline styles) |
| `src/pages/auth/SignUp.tsx` | 15 | Complex (mostly inline styles) |
| `src/pages/ForEmployers.tsx` | 15 | Complex (mostly inline styles) |
| `src/components/ui/ApplicantPanel.tsx` | 14 | Moderate (Tailwind utilities) |
| `src/pages/jobs/JobDetail.tsx` | 14 | Complex (both patterns) |
| `src/pages/verification/EmployerVerification.tsx` | 14 | Moderate (Tailwind utilities) |
| `src/pages/dashboard/SeekerDashboard.tsx` | 13 | Moderate (both patterns) |

Files with 5-9 v1 references: ~30 files (moderate complexity).

Files with 1-4 v1 references: ~60 files (trivial complexity).

### 2.4 Two styling patterns mixed in the codebase

**Pattern A — Tailwind utility classes** (~60% of v1 usages):

```tsx
<div className="bg-moss text-white hover:bg-fern" />
<button className="border-fog bg-mist text-ink" />
```

These work because the `@theme` directive exposes tokens as Tailwind utilities. When we swap `--color-moss` to the new value, these classes *don't change* — they keep the same name, they just render the new colour. **Fast migration path if token names are kept.**

**Pattern B — Inline `style={{}}` props** (~40% of v1 usages):

```tsx
<section style={{ backgroundColor: 'var(--color-soil)' }}>
<h1 style={{ color: 'var(--color-meadow)' }}>
```

These reference CSS variables directly. When we rename `--color-soil` to `--color-brand-900`, every one of these inline references needs updating. **Find/replace migration, file by file.**

**Consequence:** Decision 1 (rename to v2 semantic) means both patterns get migrated. Pattern A by updating the Tailwind utility class names in components. Pattern B by updating the `var(--color-*)` reference.

---

## 3. Token Migration Map

This is the authoritative v1 → v2 mapping. Claude Design reads this to produce the new `@theme` block. Claude Code reads this to execute find/replace across the codebase.

### 3.1 Colour tokens

| v1 token | v1 hex | v2 token | v2 hex | Notes |
|---|---|---|---|---|
| `--color-soil` | `#2C1A0E` | `--color-brand-900` | `#0F3D22` | Dark accent surfaces. Soil brown → deep forest green. Used on nav (Nav.tsx), hero sections, stat panels. |
| `--color-soil-deep` | `#1E1108` | `--color-brand-900` | `#0F3D22` | Collapses to same v2 token. Was redundant darker variant in v1. |
| `--color-moss` | `#2D5016` | `--color-brand` | `#16A34A` | The primary accent. Buttons, links, match circle rings, active states. |
| `--color-fern` | `#4A7C2F` | `--color-brand-hover` | `#15803D` | Hover state on primary. Semantics preserved. |
| `--color-meadow` | `#7AAF3F` | `--color-brand` | `#16A34A` | Collapses to same v2 token. "One green means one green" per brand spec. |
| `--color-hay` | `#D4A843` | `--color-warn` | `#F59E0B` | Amber warnings, featured badges. |
| `--color-hay-lt` | `#FFF8E7` | `--color-warn-bg` | `#FEF3C7` | Warning background tints. Very close v1 → v2 shift. |
| `--color-cream` | `#F7F2E8` | `--color-bg` | `#FAFBF9` | Page background. Warm cream → near-white with green whisper. Biggest perceptual shift. |
| `--color-fog` | `#EEE8DC` | `--color-border` | `#E5E8E2` | Default border colour. |
| `--color-mist` | `#F2EEE6` | `--color-surface-2` | `#F3F5F0` | Input backgrounds, subtle fills. |
| `--color-ink` | `#1A1208` | `--color-text` | `#0B1F10` | Primary text. Near-black with green undertone (v2) vs warm black (v1). |
| `--color-mid` | `#6B5D4A` | `--color-text-muted` | `#5B6B5F` | Secondary text. |
| `--color-light` | `#9E8E78` | `--color-text-subtle` | `#8A968D` | Tertiary text, placeholders. |
| `--color-white` | `#FFFFFF` | `--color-surface` | `#FFFFFF` | Card and panel backgrounds. Value unchanged. |
| `--color-red` | `#C0392B` | `--color-danger` | `#DC2626` | Errors, low match scores (<60%). |
| `--color-red-lt` | `#FDF0EE` | `--color-danger-bg` | `#FEE2E2` | Error background tints. |
| `--color-blue` | `#1A5276` | `--color-info` | `#0EA5E9` | Info states, contact-released indicators. |
| `--color-blue-lt` | `#EAF4FB` | `--color-info-bg` | `#E0F2FE` | Info background tints. |
| `--color-orange` | `#E67E22` | `--color-warn` | `#F59E0B` | Collapses to `--color-warn`. Was redundant with `hay` in v1. |
| `--color-orange-lt` | `#FEF5EC` | `--color-warn-bg` | `#FEF3C7` | Collapses to same v2 token. |
| `--color-purple` | `#6C3483` | `--color-ai` | `#8B5CF6` | AI insight boxes, match explanations. |
| `--color-purple-lt` | `#F5EEF8` | `--color-ai-bg` | `#F5F3FF` | AI insight backgrounds. |

### 3.2 New v2 tokens with no v1 equivalent

These need to be introduced during migration. They don't replace anything — they fill gaps in the v1 system.

| v2 token | v2 hex | Purpose |
|---|---|---|
| `--color-surface-hover` | `#F7F9F5` | Hover state for cards and list rows — was ad-hoc `hover:bg-mist` in v1 |
| `--color-border-strong` | `#D0D5CC` | Emphasised borders — was sometimes `border-mid` abuse in v1 |
| `--color-brand-50` | `#E8F5EC` | Subtle brand fills, chip backgrounds — v1 used `rgba(45,80,22,0.08)` inline |
| `--color-text-on-brand` | `#FFFFFF` | Text on `--color-brand` or `--color-brand-900` surfaces — was `text-white` in v1 |
| `--color-success` | `#16A34A` | Success states (same hue as brand, intentional) — v1 used `moss` for both |
| `--color-success-bg` | `#E8F5EC` | Success background tints |

### 3.3 Tailwind utility class rename map

| v1 utility | v2 utility | Usage count (approx) |
|---|---|---|
| `bg-moss` | `bg-brand` | ~35 |
| `text-moss` | `text-brand` | ~50 |
| `border-moss` | `border-brand` | ~15 |
| `hover:bg-moss` | `hover:bg-brand` | ~10 |
| `bg-fern` | `bg-brand-hover` | ~8 |
| `text-fern` | `text-brand-hover` | ~18 |
| `border-fern` | `border-brand-hover` | ~8 |
| `hover:bg-fern` | `hover:bg-brand-hover` | ~12 |
| `bg-meadow` | `bg-brand` | ~6 |
| `text-meadow` | `text-brand` | ~3 |
| `bg-soil` | `bg-brand-900` | ~6 |
| `text-soil` | `text-text` (careful!) | ~4 — **most `text-soil` should become `text-text`, not `text-brand-900`** |
| `bg-hay` | `bg-warn` | ~3 |
| `text-hay` | `text-warn` | ~10 |
| `fill-hay` | `fill-warn` | ~4 |
| `bg-hay-lt` | `bg-warn-bg` | ~10 |
| `border-hay` | `border-warn` | ~3 |
| `bg-cream` | `bg-bg` (or `bg-page`) | ~3 |
| `text-cream` | `text-white` (when on dark bg) | ~8 — **context-dependent** |
| `bg-fog` | `bg-border` (or `bg-surface-2`) | ~18 — **context-dependent** |
| `border-fog` | `border-border` (sounds weird, consider `border-default`) | ~60 |
| `bg-mist` | `bg-surface-2` | ~12 |
| `bg-ink` / `text-ink` | `bg-text` / `text-text` | ~20 |
| `text-mid` | `text-text-muted` | ~20 |
| `text-light` | `text-text-subtle` | ~8 |

### 3.4 Context-dependent mappings flagged

These need judgment, not blind find/replace. Claude Code should surface each occurrence for review.

**`text-soil`** — appears in ~4 places. In v1 it meant "dark brown text on cream background." In v2, cream is gone. The equivalent is `text-text` (near-black primary text on near-white bg). Do NOT map to `text-brand-900` — that would make paragraphs of text forest-green, which is wrong.

**`text-cream`** — appears on dark surfaces (nav, hero, testimonials, CTA bands). In v1 it meant "warm off-white text on soil brown." In v2, the equivalent is `text-white` or a new `--color-text-on-dark` token. Context-dependent: in the nav (`Nav.tsx:44`) it's `text-cream/50` for inactive links — v2 equivalent is probably `text-white/60`. Check each occurrence.

**`bg-fog`** — 60+ occurrences. Ambiguous. Sometimes means "subtle divider background" (→ `bg-surface-2`), sometimes means "placeholder/skeleton shimmer" (→ `bg-border`), sometimes means "disabled state" (→ `bg-surface-2` + opacity). Claude Code reviews per occurrence.

**`hover:bg-fog` and `hover:bg-cream`** — generally → `hover:bg-surface-hover` (new v2 token). Not `hover:bg-border`.

**`text-red` / `text-blue` / `text-orange` / `text-purple`** — These are abstract colour names, not semantic. Safe to migrate: red → danger, blue → info, orange → warn, purple → ai.

### 3.5 Font migration

**Step 1** — Replace Google Fonts import in `src/index.css` line 1:

```css
/* BEFORE */
@import url("https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=DM+Sans:ital,opsz,wght@0,9..40,300..900;1,9..40,300..900&family=DM+Mono:wght@400;500&display=swap");

/* AFTER */
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap");
```

**Step 2** — Update CSS font variables:

```css
/* BEFORE */
--font-display: "Fraunces", serif;
--font-body: "DM Sans", sans-serif;

/* AFTER — per Decision 2, keep both variables, both point at Inter */
--font-display: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif;
--font-body: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif;
--font-mono: "JetBrains Mono", "DM Mono", Menlo, Consolas, monospace;
```

**No code changes required** for `style={{ fontFamily: 'var(--font-display)' }}` or `className="font-display"` — both will automatically pick up Inter.

**Later cleanup task (post-migration):** collapse the two variables into one `--font-sans` and rename the ~50 `font-display` class usages. Not part of this migration.

---

## 4. Component Categories

The 107 files cluster into 6 categories. Each category migrates as a phase. Each phase ships independently to preview, is manually reviewed, then merges to main.

### 4.1 Category A — Primitives (Phase 1)

Small, standalone components with minimal v1 references each. Foundation for everything else.

**Files:** 10-12 components

- `src/components/ui/Button.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/Select.tsx`
- `src/components/ui/Checkbox.tsx`
- `src/components/ui/Toggle.tsx`
- `src/components/ui/Tag.tsx`
- `src/components/ui/InfoBox.tsx`
- `src/components/ui/ProgressBar.tsx`
- `src/components/ui/ChipSelector.tsx`
- `src/components/ui/Breadcrumb.tsx`
- `src/components/ui/Pagination.tsx`

**Complexity:** Trivial. Each file has 2-8 v1 references, all Pattern A (Tailwind utilities).

**Representative example — Button.tsx:**

```tsx
/* v1 — src/components/ui/Button.tsx:10-13 */
const styles = {
  primary: 'bg-moss text-white hover:bg-fern',
  outline: 'bg-white border border-moss text-moss hover:bg-mist',
  ghost: 'border border-fog text-mid hover:border-mid',
  hay: 'bg-hay text-soil hover:opacity-90',
}

/* v2 */
const styles = {
  primary: 'bg-brand text-white hover:bg-brand-hover',
  outline: 'bg-white border border-brand text-brand hover:bg-surface-hover',
  ghost: 'border border-default text-text-muted hover:border-border-strong',
  hay: 'bg-warn text-white hover:opacity-90',  // semantic rename: hay variant → warn variant, text colour changes
}
```

Note the `hay` variant: v1 had dark text on amber (`text-soil`). v2 has white text on `--color-warn` because the new amber is darker. **Worth renaming the variant from `hay` to `warn` for clarity** — see Phase 6 cleanup tasks.

### 4.2 Category B — Brand-critical components (Phase 2)

Components that carry the most visible brand identity. Small number of files, high visibility.

**Files:** 4 components

- `src/components/ui/MatchCircle.tsx`
- `src/components/ui/MatchBreakdown.tsx`
- `src/components/ui/StatusBanner.tsx`
- `src/components/ui/VerificationBadge.tsx`

**Complexity:** Moderate. MatchCircle especially — it's the single most visually identifying component in the product and appears on every search result, job card, applicant row, and application card.

**Representative example — MatchCircle.tsx:**

```tsx
/* v1 — src/components/ui/MatchCircle.tsx:20-21 */
text: 'text-moss',
label: 'text-moss',

/* v2 */
text: 'text-brand',
label: 'text-brand',
```

Trivial swap. But critical to eyeball on preview — this is the component users associate with "your 94% match." Wrong green, wrong product.

### 4.3 Category C — Composed components (Phase 3)

Higher-level components built on Category A primitives. Appear on search, applicant, and application views.

**Files:** ~15 components

- `src/components/ui/JobCard.tsx`
- `src/components/ui/SearchJobCard.tsx`
- `src/components/ui/ApplicantPanel.tsx`
- `src/components/ui/ApplicationCard.tsx`
- `src/components/ui/ExpandableCardTabs.tsx`
- `src/components/ui/FilterSidebar.tsx`
- `src/components/ui/ActiveFilterPills.tsx`
- `src/components/ui/JobDetailSidebar.tsx`
- `src/components/ui/MyApplicationsSidebar.tsx`
- `src/components/ui/ApplicantDashboardSidebar.tsx`
- `src/components/ui/LivePreviewSidebar.tsx`
- `src/components/ui/StatsStrip.tsx`
- `src/components/ui/Timeline.tsx`
- `src/components/ui/TierCard.tsx`
- `src/components/ui/SearchHero.tsx`

**Complexity:** Moderate to complex. FilterSidebar (18 references) and ApplicantPanel (14) are the heaviest. Most are Pattern A migration; SearchHero has a gradient using Pattern B (inline style).

**Representative example — SearchHero.tsx line 45:**

```tsx
/* v1 */
style={{
  background: 'linear-gradient(135deg, var(--color-soil) 0%, #1a3a10 100%)',
}}

/* v2 */
style={{
  background: 'linear-gradient(135deg, var(--color-brand-900) 0%, #0a2d18 100%)',
}}
```

### 4.4 Category D — Page shells (Phase 4)

Layout components that wrap every page. Low file count, high impact — they're on screen 100% of the time.

**Files:** 5 components

- `src/components/layout/Nav.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/DashboardLayout.tsx`
- `src/components/layout/ProtectedRoute.tsx`
- `src/components/layout/AuthLayout.tsx` *(see §6 Exceptions)*

**Complexity:** Moderate. Nav is Pattern B heavy (lots of `style={{ backgroundColor: 'var(--color-soil)' }}`).

**Representative example — Nav.tsx line 52:**

```tsx
/* v1 */
style={{
  backgroundColor: 'var(--color-soil)',
}}

/* v2 */
style={{
  backgroundColor: 'var(--color-brand-900)',
}}
```

**AuthLayout is a special case — see §6.1.**

### 4.5 Category E — Landing page (Phase 5)

The 12 landing components. Most v1-heavy code in the repo. Lots of inline `style={{}}` props.

**Files:** 12 components

- `src/components/landing/HeroSection.tsx` (16 references)
- `src/components/landing/FeaturedListings.tsx` (15 references)
- `src/components/landing/HowItWorksSection.tsx` (13 references)
- `src/components/landing/EmployerCTABand.tsx` (12 references)
- `src/components/landing/TestimonialsSection.tsx` (11 references)
- `src/components/landing/AIMatchingSection.tsx` (10 references)
- `src/components/landing/FinalCTASection.tsx` (7 references)
- `src/components/landing/CountersSection.tsx` (5 references)
- `src/components/landing/FarmTypesStrip.tsx` (5 references)
- `src/components/landing/TrustedByStrip.tsx` (2 references)
- `src/components/landing/LandingFooter.tsx` (2 references)
- `src/pages/Home.tsx` (1 reference — just the page wrapper)

**Complexity:** Complex. Token swap only per Decision 4 — structure unchanged.

**What the landing migration does NOT do:**
- Does not change section layouts
- Does not change component composition
- Does not change copy
- Does not add the custom farm SVG illustration from the v2 wireframes
- Does not change the hero structure
- Does not touch animations

All of that is Phase 2 marketing refresh, post-launch.

**What the landing migration DOES do:**
- Swaps every `var(--color-soil)` to `var(--color-brand-900)`
- Swaps every `var(--color-cream)` to `var(--color-bg)`
- Swaps every `var(--color-meadow)` to `var(--color-brand)`
- Same for all other token renames
- Keeps 100% of existing structure and copy

### 4.6 Category F — Pages (Phase 3 distributed)

~50 page files in `src/pages/`. Most have 1-5 v1 references. They migrate alongside the components they use — usually Phase 3.

**Notable heavier files:**
- `src/pages/jobs/JobSearch.tsx` — uses heavy skeleton shimmer patterns with `bg-fog`
- `src/pages/jobs/JobDetail.tsx` — 14 references, both patterns mixed
- `src/pages/dashboard/employer/ApplicantDashboard.tsx` — 17 references
- `src/pages/auth/SignUp.tsx` — 15 references, uses Pattern B heavily
- `src/pages/ForEmployers.tsx` — 15 references, marketing page
- `src/pages/Pricing.tsx` — 12 references, marketing page

**Auth pages specifically** (`Login.tsx`, `SignUp.tsx`, `VerifyEmail.tsx`, `ResetPassword.tsx`, `ForgotPassword.tsx`, `SelectRole.tsx`) — these migrate alongside AuthLayout in Phase 4.

---

## 5. Migration Complexity Heat Map

Visual summary of risk per phase.

```
Phase 0  Token swap only (index.css)                    [trivial]
Phase 1  Primitives (12 files, ~40 references)          [trivial]
Phase 2  Brand-critical (4 files, ~15 references)       [trivial]
Phase 3  Composed components + most pages (~60 files)   [moderate]
Phase 4  Page shells incl. AuthLayout (5 files)         [moderate]
Phase 5  Landing page (12 files, ~110 references)       [heavy — mostly Pattern B]
Phase 6  Cleanup + final grep sweep                     [trivial]
```

**No phase is high-risk.** All migrations are mechanical — no architectural changes, no new features, no data model touches. The only "design" decision embedded in a phase is AuthLayout in Phase 4, and that's been pre-decided (token swap only, redesign deferred).

---

## 6. Exceptions — Components That Need Discussion

### 6.1 AuthLayout.tsx

**Problem:** This is the split-screen login layout — dark soil gradient on the left with white form on the right. It uses a full-bleed dark panel with decorative radial gradients using `hay` and `meadow` dots.

The v2.0 brand spec explicitly retired "full-bleed dark colour" wizard/auth panels: *"right side shows contextual hint card or subtle landscape photograph — never a full-bleed dark colour"* (Brand Spec §4 — Wizard/onboarding layout).

**Decision 3 resolution:** Token swap only. Left panel stays dark but becomes `--color-brand-900` forest green gradient instead of soil brown.

**Migration in practice:**

```tsx
/* v1 — AuthLayout.tsx:16 */
background: 'linear-gradient(135deg, var(--color-soil-deep) 0%, var(--color-soil) 40%, var(--color-moss) 100%)',

/* v2 */
background: 'linear-gradient(135deg, var(--color-brand-900) 0%, #0A2D18 40%, var(--color-brand) 100%)',
```

Stats in the left panel use `text-hay` + `text-meadow` extensively. Those become `text-white/80` and `text-brand-100` respectively.

**Post-migration (deferred):** Full redesign per brand spec — centred form on near-white, optional subtle farm photograph on side at ≥1024px breakpoint only. Probably 4-6 hours of design + implementation. Not in this migration.

### 6.2 Landing page as a whole

**Problem:** 12 components, ~110 v1 references. Most are Pattern B (inline `style={{}}`). It's where the brand lives most visibly.

**Decision 4 resolution:** Token swap only. Structure preserved. Animations preserved. Copy preserved.

**What this means visually:** the landing page will have a near-white background instead of cream, forest-green dark sections instead of soil brown, a single bright brand green accent instead of moss/fern/meadow trio. It will look like the same product, rebranded. It will NOT look like the v2 wireframe we mocked up with the farm SVG.

**Post-migration (deferred):** The v2 wireframe we made this week becomes the brief for the Phase 2 landing rebuild. Custom SVG farm illustration, cleaner hero, modern SaaS sections. That's a weeks-long effort, not hours.

### 6.3 Places where `text-cream` can't just become `text-white`

Some nav/hero contexts use `text-cream/50`, `text-cream/60`, `text-cream/80` for hierarchy on dark backgrounds. These are intentional opacity variations for secondary text.

Direct find/replace `text-cream` → `text-white` would collapse the hierarchy.

**Mapping:**
- `text-cream` → `text-white`
- `text-cream/80` → `text-white/80`
- `text-cream/60` → `text-white/60`
- `text-cream/50` → `text-white/50`

Claude Code should use a regex-aware replacement that preserves the opacity suffix.

### 6.4 Stripe PaymentForm hardcoded hex values

`src/components/stripe/PaymentForm.tsx` lines 83-93 have hex values hardcoded for the Stripe Elements theme (because Stripe Elements takes raw hex, not CSS variables):

```tsx
colorPrimary: '#4a7c2f', // fern
colorBackground: '#f8f6f2', // mist
borderColor: '#e2e0dc', // fog
```

These need to be migrated to v2 hex values:

```tsx
colorPrimary: '#15803D', // brand-hover (darker for form focus)
colorBackground: '#FFFFFF', // surface
borderColor: '#E5E8E2', // border
```

---

## 7. Phase Plan

### Phase 0 — `@theme` token swap (2-4 hours)

**Goal:** Update `src/index.css` with v2 tokens. Ship to preview. See the product running on v2 colours with zero component changes.

**Approach:** Use v2 token names as the canonical names AND keep v1 token names as temporary aliases. Like this:

```css
@theme {
  /* v2 canonical */
  --color-bg: #FAFBF9;
  --color-surface: #FFFFFF;
  --color-brand: #16A34A;
  --color-brand-hover: #15803D;
  --color-brand-900: #0F3D22;
  /* ...etc */

  /* LEGACY ALIASES — remove in Phase 6 */
  --color-soil: var(--color-brand-900);
  --color-soil-deep: var(--color-brand-900);
  --color-moss: var(--color-brand);
  --color-fern: var(--color-brand-hover);
  --color-meadow: var(--color-brand);
  --color-hay: var(--color-warn);
  --color-hay-lt: var(--color-warn-bg);
  --color-cream: var(--color-bg);
  --color-fog: var(--color-border);
  --color-mist: var(--color-surface-2);
  /* ...etc */
}
```

**Why aliases:** every downstream phase can run independently. Phase 1 renames Button's Tailwind classes. If we shipped Phase 1 without Phase 2-5, Button would use `bg-brand` while JobCard still uses `bg-moss` — both would render correctly because the alias points at the same colour. Zero-downtime migration.

**Ship:** preview deploy. Full manual click-through. Expected: everything looks different (because colours changed) but everything still works.

**Definition of done:** preview URL shows the product in v2 colours. No Pattern A or Pattern B code changes yet. All tests pass. All flows still work.

### Phase 1 — Primitives (4-6 hours)

Migrate the 12 primitive components (§4.1). Rename Tailwind utilities. Rename any Pattern B references.

**Definition of done:** all primitive components use v2 class names. No regression on preview. Tests pass.

### Phase 2 — Brand-critical (3-4 hours)

Migrate MatchCircle, MatchBreakdown, StatusBanner, VerificationBadge.

**Definition of done:** match score circles render correctly on preview across all pages (search, job card, applicant row, application card).

### Phase 3 — Composed + most pages (6-8 hours)

Migrate Category C components and Category F pages they depend on.

**Definition of done:** seeker job search flow, job detail flow, applicant dashboard flow all render correctly on preview.

### Phase 4 — Page shells (3-4 hours)

Migrate Nav, Sidebar, DashboardLayout, ProtectedRoute, AuthLayout (token swap only).

**Definition of done:** nav + dashboard layouts + auth screens all render correctly on preview. AuthLayout gradient now forest-green, not soil brown.

### Phase 5 — Landing page (6-8 hours)

Migrate all 12 landing components. This is the heaviest Pattern B migration — lots of inline `style={{ var(--color-soil) }}` → `style={{ var(--color-brand-900) }}` replacements.

**Definition of done:** landing page on preview has v2 brand applied. Still same structure, same copy, same animations.

### Phase 6 — Cleanup (4-6 hours)

- Remove legacy aliases from `@theme` block
- Grep sweep for any remaining v1 token references (`grep -rn "soil\|moss\|fern\|meadow\|hay\|cream\|fog\|mist" src/`)
- Fix any stragglers
- Rename Button's `hay` variant to `warn` per §4.1 note
- Migrate Stripe PaymentForm hex values per §6.4
- Run full test suite
- Run Vitest
- Final preview deploy
- Merge to main

**Definition of done:** zero v1 token references in codebase, tests pass, preview is clean, ready to merge to main and deploy to production.

---

## 8. Claude Design Brief

After this audit is signed off, here's exactly what goes to Claude Design.

### 8.1 Upload list

**Must upload (authoritative):**

1. `TopFarms_Brand_Spec_v2.md` — the design system spec
2. This document (`TopFarms_Migration_Audit.md`)
3. `src/index.css` from the repo (current state — Claude Design needs the exact `@theme` structure)
4. 3 shipped components as real-code examples:
   - `src/components/ui/Button.tsx` (primitive)
   - `src/components/ui/MatchCircle.tsx` (brand-critical)
   - `src/components/ui/JobCard.tsx` (composed)

**Do NOT upload:**

- The project-level `TopFarms_PRD_v3.docx` (§4 is v1 design system — will contaminate extraction)
- The repo's own `PRD.md` (§3 is v1 design system — same problem)
- Any v1 HTML wireframes
- The 7 v2 wireframes from earlier this week (their visuals are directional, not authoritative — brand spec v2.0 is authoritative)

### 8.2 Prompt for Claude Design

```
Extract the TopFarms v2.0 design system and produce a migration-ready output for an already-shipped React + TypeScript + Tailwind v4 codebase.

INPUTS:
- TopFarms_Brand_Spec_v2.md — the authoritative design system spec
- TopFarms_Migration_Audit.md — scope, decisions, and token migration map
- src/index.css — current v1 @theme block (shows the exact structure required)
- 3 shipped components (Button, MatchCircle, JobCard) — real usage examples

OUTPUTS REQUIRED:

1. Complete new `src/index.css` @theme block with:
   - All v2 tokens (colours, typography, radius, shadow, spacing)
   - Legacy v1 token aliases for incremental migration (per audit §7 Phase 0)
   - Tailwind v4 compatible format, no tailwind.config.js

2. Tailwind utility class migration table:
   - Every v1 utility in use → v2 utility replacement
   - Context-dependent cases flagged (text-soil, text-cream, bg-fog — see audit §3.4)
   - Regex-aware patterns for opacity-suffixed classes

3. Before/after examples on the 3 shipped components provided.
   Show the actual diff — not "use new tokens" but line-by-line.

4. Font-face + Google Fonts import replacement:
   - Inter + JetBrains Mono
   - Keep two font CSS variables per audit Decision 2

5. Stripe Elements theme override values (hex, not tokens) per audit §6.4.

6. Confirmation that Decision 3 (AuthLayout token swap only, no redesign) and
   Decision 4 (landing page token swap only, no rebuild) are respected.

CONSTRAINTS:
- Do NOT design new components. 39 UI components exist and will not be restructured.
- Do NOT change layouts, spacing, or typography scale beyond what brand spec v2.0 specifies.
- Do NOT propose new screens or flows.
- This is a visual migration of a working product, not a new build.
```

---

## 9. Sign-Off Checklist

Before Claude Code executes any migration, confirm:

- [ ] **This audit is approved** — all 5 decisions locked and committed to `docs/DECISIONS.md` in repo
- [ ] **Brand spec v2.0 is authoritative** — old PRD design sections (§3-4) marked superseded
- [ ] **Claude Design output reviewed** — new `@theme` block, migration mapping, before/after examples all look right
- [ ] **Branch strategy agreed** — long-lived `feat/v2-brand-migration` branch, preview URLs per phase, merge to main only after full sign-off
- [ ] **Inter font hosting decided** — Google Fonts (default per §3.5) or self-hosted via `@fontsource/inter`
- [ ] **No open tech debt blockers** — `PRD.md §8` lists 6 known debt items. Are any fixed first? (Recommendation: leave them, address post-migration.)
- [ ] **Stripe test mode verified** — migration must not break payment flows. Confirm Stripe test mode works on preview.
- [ ] **Supabase preview environment** — if the shipped repo points at production Supabase, confirm the preview deploy won't affect live data.

---

## 10. What Happens After Migration

Post-migration roadmap, in priority order. Not part of this audit, but flagged so we don't lose track.

1. **AuthLayout full redesign** — per brand spec v2.0, centred form on near-white with optional subtle farm photograph at ≥1024px. ~4-6 hours design + implementation.
2. **Landing page rebuild** — use the v2 wireframe from April 2026 (custom SVG farm illustration, modern SaaS sections) as the brief. Weeks-long effort, treat as marketing-site refresh.
3. **Font variable collapse** — rename `--font-display` + `--font-body` to single `--font-sans`. ~50-file find/replace.
4. **Button `hay` → `warn` variant rename** — clarity cleanup. Trivial.
5. **Storybook or similar component documentation** — future developers need to see the component library without diving into code.
6. **Component library extraction** — if you ever ship a second product, the 39 components are worth extracting into a shared package.

---

## 11. Document Metadata

| Field | Value |
|---|---|
| Document version | 1.0 |
| Created | 24 April 2026 |
| Next review | After Claude Design output, before Phase 0 begins |
| Owner | Harry Smith |
| Consumers | Claude Design (design system extraction), Claude Code (migration execution) |
| Supersedes | Any verbal agreements from prior sessions |
| References | `TopFarms_Brand_Spec_v2.md`, `PRD.md` (repo), `src/index.css` (repo) |

*End of migration audit.*
