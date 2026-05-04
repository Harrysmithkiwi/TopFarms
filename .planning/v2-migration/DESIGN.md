---
name: TopFarms
description: NZ farm labour marketplace — modern Kiwi trade tool aesthetic, single-green palette, Inter throughout
colors:
  bg: "#FAFBF9"
  surface: "#FFFFFF"
  surface-2: "#F3F5F0"
  surface-hover: "#F7F9F5"
  border: "#E5E8E2"
  border-strong: "#D0D5CC"
  text: "#0B1F10"
  text-muted: "#5B6B5F"
  text-subtle: "#8A968D"
  text-on-brand: "#FFFFFF"
  brand: "#16A34A"
  brand-hover: "#15803D"
  brand-900: "#0F3D22"
  brand-50: "#E8F5EC"
  success: "#16A34A"
  success-bg: "#E8F5EC"
  warn: "#F59E0B"
  warn-bg: "#FEF3C7"
  danger: "#DC2626"
  danger-bg: "#FEE2E2"
  info: "#0EA5E9"
  info-bg: "#E0F2FE"
  ai: "#8B5CF6"
  ai-bg: "#F5F3FF"
typography:
  display:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif"
    fontSize: "48px"
    fontWeight: 600
    lineHeight: "56px"
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: 600
    lineHeight: "44px"
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "28px"
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "24px"
    letterSpacing: "0"
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
    letterSpacing: "0.04em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.text-on-brand}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.brand-hover}"
    textColor: "{colors.text-on-brand}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-destructive:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.text-on-brand}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "44px"
  pill-default:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.full}"
    padding: "0 10px"
    height: "24px"
  pill-brand:
    backgroundColor: "{colors.brand-50}"
    textColor: "{colors.brand-900}"
    rounded: "{rounded.full}"
    padding: "0 10px"
    height: "24px"
---

# Design System: TopFarms

## 1. Overview

**Creative North Star: "The Farm Office."**

TopFarms is the visual register of a respected farm advisor's daily software — clean, dense, trusted, present. It sits in a Kiwi farmer's daily kit alongside Xero (accounting), LIC MINDA (herd management), Halter (collars), FarmIQ (records), Gallagher (fencing). Those tools share a posture: confident clarity, near-white backgrounds, single accent, density done right. TopFarms speaks the same posture, with one bright green doing all the brand work and Inter carrying every word.

This system explicitly rejects the craft-magazine, sepia, cream-background register that the v1.0 brand attempted. The "warmth" of a Kiwi farm-sector product comes through content (real farm photos, real job counts, real NZ-specific copy like "8/2 roster" and "relief milking") — never through chrome (no sepia filters, no rustic-shed clichés, no rolling-hills-at-sunset gradients). It also rejects the generic B2B SaaS register (Salesforce / Monday / HubSpot bloat, glassmorphism, purple-blue gradients, "innovative platform" hero copy) and the slick tech-bro startup register (purple/pink gradients, wave animations, "leveraging AI to revolutionise" copy).

**Key Characteristics:**
- One brand green (`#16A34A`) carries every accent decision
- Near-white background (`#FAFBF9`), true white surfaces, deep forest green for occasional dark surfaces
- Inter throughout — display, body, labels, code-equivalents — at a disciplined 6-step weight ladder
- Flat by default — borders + spacing signal hierarchy, not shadows
- 4pt spacing grid, 8px input/button radius, 12px card radius, fully-rounded pills
- Tinted-toward-green neutrals (the `#FAFBF9` bg has a deliberate green whisper)
- Mobile-excellent for seekers (44px tap targets), desktop-primary for employers

## 2. Colors

A disciplined single-accent palette: one green, three shades, tinted neutrals around it.

### Primary
- **Brand Green** (`#16A34A`): The single accent doing all brand work. Primary buttons, links, active states, match-score highlights, the leaf in the logomark, live indicators, "applied" badges, success states. Never used as a background block — always as an accent.
- **Brand Hover** (`#15803D`): Pressed/hover state for `Brand Green`. Same hue, deeper. Also used as the form-focus value the Stripe Elements component needs.
- **Brand 900** (`#0F3D22`): Deep forest green. Replaces v1 soil brown for dark surfaces — dark nav (when used), hero-on-dark sections, the AuthLayout left panel gradient, occasional heading emphasis.
- **Brand 50** (`#E8F5EC`): Subtle brand fill. Selected row highlight, chip background, hover background for branded list rows.

### Neutral
- **Page Background** (`#FAFBF9`): Default page background. Near-white with a deliberate whisper of green (chroma toward the brand hue). Replaces v1 cream.
- **Surface White** (`#FFFFFF`): True white. Card and panel backgrounds, modal backgrounds.
- **Surface Hover** (`#F7F9F5`): Hover state for cards and interactive list rows. New v2 token; v1 had no equivalent.
- **Surface 2** (`#F3F5F0`): Input field backgrounds, chip fills, subtle zoning.
- **Border** (`#E5E8E2`): Default border for cards, inputs, dividers.
- **Border Strong** (`#D0D5CC`): Emphasised borders, table rows, dividers needing more weight.
- **Text** (`#0B1F10`): Primary text. Near-black with the faintest green undertone (matches tinted-neutral doctrine).
- **Text Muted** (`#5B6B5F`): Secondary text, labels, metadata.
- **Text Subtle** (`#8A968D`): Tertiary text, placeholders, timestamps.

### Semantic
- **Warn** (`#F59E0B`): Warnings, featured badges, mid match scores (60–79%).
- **Warn BG** (`#FEF3C7`): Warning background tints.
- **Danger** (`#DC2626`): Errors, low match scores (<60%), destructive actions.
- **Danger BG** (`#FEE2E2`): Error background tints.
- **Info** (`#0EA5E9`): Info messages, contact-released indicators, neutral alerts.
- **Info BG** (`#E0F2FE`): Info background tints.
- **AI** (`#8B5CF6`): AI insight boxes, match-score explanations, Claude-generated content.
- **AI BG** (`#F5F3FF`): AI insight backgrounds.

### Named Rules

**The One-Green Rule.** Brand Green is the only accent. Never mix `Brand`, `Brand Hover`, and `Brand 900` as competing elements in the same surface — choose one per area. `Brand 900` is for dark backdrops, not for headlines next to a `Brand` button.

**The No-Brown Rule.** If something looks brown, it is wrong. The v1 soil/moss/fern/meadow/hay palette is fully retired; if a colour reads as warm-earth instead of green, an alias is leaking.

**The Sparing-Status Rule.** Status colours (Warn / Danger / Info / AI) are used sparingly. A dashboard with three red badges and four amber warnings at once is a screen failing to prioritise.

**The Tinted-Neutral Rule.** No `#000`, no `#fff` for text. `Text` is `#0B1F10` (near-black with green undertone), backgrounds are `#FAFBF9` (near-white with green whisper). The chroma toward brand hue is the brand making contact with every surface, not a stylistic flourish.

## 3. Typography

**Display Font:** Inter (variable)
**Body Font:** Inter (variable)
**Label Font:** Inter (variable, semibold + tracked)
**Mono Font:** JetBrains Mono (with DM Mono fallback for code snippets)

**Character:** One sans-serif family doing every job at a disciplined weight ladder. Inter chosen because Kiwi farmers already use Xero (which uses Inter) — the type is familiar in their daily kit, not foreign. Used at 400 (body) and 600 (display, headline, title, label) only. No 300, no 800, no italics-for-emphasis-in-UI.

### Hierarchy
- **Display** (600, 48/56, -0.02em): Hero headlines on landing only. Never in product UI.
- **Headline** (600, 36/44, -0.02em): Page titles, major section headers. One per screen.
- **Title** (600, 20/28, -0.01em): Card titles, modal titles, dashboard widget headers.
- **Subtitle** (600, 17/24, -0.005em): Subsection headers, applicant card headers.
- **Body Large** (400, 17/26): Long-form reading copy on landing and detail pages.
- **Body** (400, 15/24): Default UI text. The workhorse.
- **Small** (400, 13/20): Metadata, timestamps, tertiary info.
- **Label** (600, 12/16, 0.04em, UPPERCASE): Eyebrow labels, badge text, table headers.

### Named Rules

**The One-Family Rule.** Inter is the only typeface in product UI. JetBrains Mono is permitted only for code snippets and schema references. No serif. No display font experiments. No italic-for-emphasis — use weight (400 → 600), not slant.

**The Two-Variables Rule.** The codebase keeps `--font-display` AND `--font-body` as separate CSS variables (legacy from v1) but both point at Inter (per Migration Audit Decision 2). Components using `font-display` class will pick up Inter automatically. Variable collapse is a post-migration cleanup, not a Phase 19 task.

**The Tabular-Numbers Rule.** Numbers in tables, match scores, salary bands, and counters use `font-variant-numeric: tabular-nums`. Variable-width digits in dense data displays look amateur.

**The 70ch Rule.** Body copy never exceeds 70ch measure. Long-form content uses a 65–70ch column even when the container is wider.

## 4. Elevation

**Flat by default.** Depth is signalled through borders and spacing, not through shadows. A shadow is a *response* to a state change (hover, modal open, dropdown open) — never a default decoration.

The v1 brand leaned on shadows in some components (legacy from the editorial register). v2 strips them out except where state actually changes.

### Shadow Vocabulary
- **shadow-sm** (`0 1px 2px rgba(11, 31, 16, 0.04)`): Rare, subtle lift. Used on cards on hover only.
- **shadow-md** (`0 4px 12px rgba(11, 31, 16, 0.06)`): Modal, dropdown, hovered card with active state.
- **shadow-lg** (`0 12px 32px rgba(11, 31, 16, 0.08)`): Dialog overlay only.

Shadow rgba uses `(11, 31, 16, *)` — the `Text` colour at the `Text` opacity — so shadows tint toward the brand undertone, not pure black.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. A shadow on a default state means the system has fallen back to "make it look more important by lifting it" — diagnose what hierarchy signal is missing instead.

**The Border-Not-Shadow Rule.** Card hierarchy is signalled by `Border` → `Border Strong` transitions on hover, not by shadow appearance. Shadows are reserved for true elevation events (dropdown opens above content, modal lifts above page).

## 5. Components

### Buttons
- **Shape:** 8px radius (`rounded-md`), 40px desktop / 44px mobile height
- **Primary:** `Brand` background, white text. The single CTA per screen.
- **Primary-Dark:** `Brand 900` background, white text. CTA on dark surfaces (auth, hero-on-dark).
- **Secondary:** `Surface` background, `Text` text, `1.5px solid Border Strong` border.
- **Ghost:** transparent background, `Text` text, no border. Tertiary action.
- **Destructive:** `Danger` background, white text. Delete, remove, cancel-application.
- **Link:** transparent background, `Brand` text, underline on hover.
- **Hover:** Primary darkens to `Brand Hover`; Secondary fills with `Surface Hover`; Ghost fills with `Surface 2`.
- **Focus:** 2px `Brand` outline, 2px offset. Never removed.
- **Transitions:** 150ms ease.

### Cards
- **Shape:** 12px radius (`rounded-lg`)
- **Background:** `Surface` (white)
- **Border:** `1px solid Border` default; transitions to `Border Strong` on hover (interactive cards only)
- **Internal Padding:** 20px default, 24px feature cards, 16px compact list rows
- **Shadow Strategy:** None at rest. Hover-only `shadow-sm` for interactive cards.

### Inputs
- **Shape:** 8px radius (`rounded-md`), 44px height (mobile tap target)
- **Background:** `Surface 2` (subtle inset feel)
- **Border:** `1.5px solid Border` default, `2px solid Brand` on focus
- **Padding:** 0 14px
- **Label:** above the field, never placeholder-as-label
- **Error State:** `1.5px solid Danger` border, error message in `Danger` text below field

### Pills / Badges
- **Shape:** Fully rounded (`rounded-full`), 24px tall, 10px horizontal padding
- **Default:** `Surface 2` background, `Text Muted` text, `12px / 600 / 0.04em` typography
- **Brand:** `Brand 50` background, `Brand 900` text — for selected / active states
- **Semantic variants:** Follow `Success BG / Success`, `Warn BG / Warn`, `Danger BG / Danger`, `Info BG / Info`, `AI BG / AI`

### Pipeline Stage Pills (applicant dashboard only)
| Stage | Background | Text |
|---|---|---|
| New | `Info BG` | `Info` |
| Reviewed | `Surface 2` | `Text Muted` |
| Interviewed | `Brand 50` | `Brand 900` |
| Shortlisted | `Warn BG` | `#92400E` (amber-900, hardcoded) |
| Offered | `Success BG` | `Success` |
| Declined | `Danger BG` | `Danger` |

### Match Score Circles (signature component)
The single most identifying component in the product. Renders on every search result, job card, applicant row, application card.

- **Sizes:** 56px on list rows, 88px on detail pages
- **High (80–100%):** `Brand` ring, `Text` number
- **Mid (60–79%):** `Warn` ring, `Text` number
- **Low (<60%):** `Danger` ring, `Text` number
- **Number typography:** Inter 600, tabular-nums, size scales with circle (~18px on 56, ~32px on 88)

### Navigation (top nav)
- **Default variant:** `Surface` (white) with `1px solid Border` bottom border, 56px tall, sticky top
- **Dark variant** (landing only, optional): `Brand 900` with white text
- **Logo:** Inter 600 "TopFarms" + a 24px geometric leaf mark in `Brand`
- **Nav links:** Inter 500 / 15px / `Text Muted` default, `Text` on hover
- **Active state:** `Text` with a 2px `Brand` underline
- **Primary CTA in nav:** `Button Primary` styling

### Wizard / Onboarding Card (signature pattern)
- **Container:** centred single-column card, 560px max-width, on `Page Background`
- **Top:** linear progress bar — `Border` track, `Brand` fill, 4px tall
- **Progress text:** "Step 3 of 7" in `Text Muted`, Inter 500 / 13px
- **Card:** `Surface` background, 32px padding, 16px radius (`rounded-xl`)
- **Optional right panel** (desktop ≥1024px, 40/60 split): contextual hint card or subtle landscape photograph — never a full-bleed dark colour

### Stripe PaymentForm (constraint-flagged component)
Stripe Elements `appearance.variables` API requires literal hex strings — does not parse CSS custom properties. PaymentForm.tsx therefore carries hex values directly:

```ts
appearance: {
  variables: {
    colorPrimary: '#16A34A',     // Brand
    colorBackground: '#FFFFFF',  // Surface
    borderColor: '#E5E8E2',      // Border
    // active border:
  }
}
```

The 4 hardcoded hex values are unavoidable until Stripe Elements supports CSS variables. Phase 6 of the migration replaces all 4 v1 hex values (lines 83, 84, 93, 97) with these v2 hex values.

## 6. Do's and Don'ts

### Do:
- **Do** use `Brand` (`#16A34A`) as the only accent. One brand green carries every active state, every primary CTA, every link.
- **Do** keep backgrounds near-white (`Page Background` `#FAFBF9`) and surfaces true white (`Surface` `#FFFFFF`). The whisper of green in `Page Background` is the brand making contact with every surface.
- **Do** use Inter at 400 and 600 only. The two-weight ladder is deliberate — no 300 light type, no 800 ultra-bold type.
- **Do** use `font-variant-numeric: tabular-nums` for any number that appears in a table, salary band, match score, or counter.
- **Do** signal hierarchy through borders and spacing, not shadows. Shadows are reserved for state changes.
- **Do** keep tap targets ≥44×44px on mobile. Seeker primary device is mobile.
- **Do** preserve focus rings on every interactive element — 2px `Brand` outline, 2px offset.
- **Do** respect `prefers-reduced-motion: reduce` on every animation.
- **Do** lead with content that's specific to the NZ farm sector — "8/2 roster", "relief milking", "calf-rearing season", real job counts, real testimonials. The chrome is the chrome; the warmth is the content.
- **Do** trust real product screenshots over marketing illustrations. A live filterable job search beats a stylised vector farm scene.

### Don't:
- **Don't** use brown. If a surface reads as brown / warm-earth instead of green, a v1 alias is leaking — track it down.
- **Don't** use cream backgrounds. `Page Background` is `#FAFBF9` (near-white with green whisper), not warm cream. Cream is the v1 register and is fully retired.
- **Don't** use Fraunces or DM Sans — both retired. Inter is the only family in product UI; JetBrains Mono only in code snippets.
- **Don't** use italics for emphasis in UI. Use weight (400 → 600).
- **Don't** use sepia, rolling-hills-at-sunset gradients, smiling-farmer-with-arms-crossed stock photography, drone-overhead-of-paddock cliches, or any other stock agricultural branding tells.
- **Don't** use glassmorphism, purple-blue gradients, or any other generic B2B SaaS register (Salesforce / Monday / HubSpot direction).
- **Don't** use bounce / elastic / spring easing. Default easing is `cubic-bezier(0.4, 0, 0.2, 1)`.
- **Don't** add shadows to default-state surfaces. Shadows are responses to state, not decoration.
- **Don't** mix `Brand` and `Brand 900` as competing elements in the same surface area.
- **Don't** use `text-soil`, `bg-moss`, `border-fog`, `bg-cream`, `bg-mist`, `text-hay` — every v1 token name is an anti-pattern in v2 code (Phase 0 keeps them as legacy aliases for incremental migration; they are removed in Phase 6).
- **Don't** add a "Layout Principles" or "Motion" or "Responsive Behavior" section to this doc. The six-section spec is fixed; layout/motion guidance lives inline in the relevant sections (Components / Elevation).
- **Don't** "improve" Inter by suggesting Geist, Söhne, Mona Sans, or any other-tech-startup display font. Inter is a deliberate product-register choice, anchored in the Xero/MINDA daily-tool universe — not a default to be optimised away.
- **Don't** "improve" the hex palette by suggesting OKLCH conversions during audit. Hex is the canonical format for this project — Brand Spec §12 is authoritative. OKLCH equivalents may live in agent-internal calculations but never in the codebase.
- **Don't** suggest replacing the single-green palette with a three-or-four-color scheme. "One green means one green" is locked.
