# TopFarms Brand Spec v2.0

> **Version:** 2.0 — April 2026
> **Supersedes:** v1.0 (soil/moss/meadow/hay earth-tones palette, Fraunces + DM Sans)
> **For:** Claude Design onboarding. Upload this document + the 9 HTML wireframes (once rebuilt against this spec) to extract the design system.

---

## Why this version exists

The v1.0 palette (earth-tone browns, cream backgrounds, editorial serif display) tested poorly against the product's real brief. A farm-hiring marketplace sits next to tools like Xero, Halter, LIC MINDA, FarmIQ, and Gallagher in a user's daily workflow. Those tools speak a clean, modern SaaS visual language. v1.0 spoke a craft-magazine visual language — authentic-feeling in isolation, but visibly dated beside the actual tools a Kiwi farmer uses every day.

v2.0 resolves this with three moves:

1. **One confident green** carries the brand. The palette collapses from 20+ earth-plus-neutral tokens down to a tight, purposeful set.
2. **Near-white backgrounds, true white surfaces.** Cream is retired. The product reads as modern, trusted, current.
3. **One sans-serif family** throughout. The editorial serif is retired. Type does the job of structure, not decoration.

Authenticity comes from real copy, real photos, real testimonials — not from a sepia filter on the chrome.

---

## 1. Brand Positioning (unchanged from v1.0)

**Product:** TopFarms — AI-powered farm labour marketplace for New Zealand.

**Audience — two sides of a two-sided market:**
- **Employers:** Dairy farm owners, sheep/beef operators, farm managers. Practical, time-poor, sceptical of slick "tech bro" products. Value Kiwi authenticity.
- **Seekers:** Farm workers, relief milkers, equipment operators, seasonal workers. Often on mobile. Some international (visa-holders). Value clear information and no bullshit.

**Tone:** Confident, grounded, clear. Think *modern Kiwi trade tool* — the product a farm manager actually uses alongside Xero and MINDA, not a nostalgic artisan thing. Plain English. No jargon. No generic SaaS gradients. Warm through content, not through chrome.

**Avoid:** Stock-photo smiling-farmer-with-arms-crossed. Purple/pink tech gradients. Glassmorphism. Generic "innovation" icons. Sepia tones. Rustic-shed-aesthetic clichés. Dark-brown hero panels. Cream backgrounds.

---

## 2. Typography

**One family does it all.** Inter, used confidently at a disciplined weight ladder.

| Role | Family | Usage |
|---|---|---|
| All UI and content | **Inter** (variable) | Headings, body, buttons, labels, nav. |
| Code / technical | **JetBrains Mono** or **DM Mono** | Schema references, code snippets. |

Fallback stack: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif`.

### Type scale

| Role | Size / line-height | Weight | Letter-spacing |
|---|---|---|---|
| Display | 48 / 56 | 600 | -0.02em |
| H1 | 36 / 44 | 600 | -0.02em |
| H2 | 28 / 36 | 600 | -0.015em |
| H3 | 20 / 28 | 600 | -0.01em |
| H4 | 17 / 24 | 600 | -0.005em |
| Body L | 17 / 26 | 400 | 0 |
| Body | 15 / 24 | 400 | 0 |
| Small | 13 / 20 | 400 | 0 |
| Micro / eyebrow | 12 / 16 | 600 | 0.04em, UPPERCASE |

### Typography principles

- Headings sit close to their line-height — no excessive top/bottom margin
- Body copy never exceeds 70ch measure
- Never mix serif and sans
- Never use italics for emphasis in UI — use weight instead
- Numbers in tables and match scores use **tabular-nums** (`font-variant-numeric: tabular-nums`)

---

## 3. Colour Palette

The full system is below. Every colour has a job. If a colour isn't listed here, don't use it.

### Core palette (CSS custom properties)

#### Neutrals — the chrome

| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#FAFBF9` | Default page background. Near-white, whisper of green. |
| `--surface` | `#FFFFFF` | Card and panel backgrounds. True white. |
| `--surface-2` | `#F3F5F0` | Input field backgrounds, chip fills, subtle zones. |
| `--surface-hover` | `#F7F9F5` | Hover state for cards and list rows. |
| `--border` | `#E5E8E2` | Default border for cards, inputs, dividers. |
| `--border-strong` | `#D0D5CC` | Emphasised borders, table rows, dividers needing more weight. |

#### Text

| Token | Hex | Usage |
|---|---|---|
| `--text` | `#0B1F10` | Primary text. Near-black with the faintest green undertone. |
| `--text-muted` | `#5B6B5F` | Secondary text, labels, metadata. |
| `--text-subtle` | `#8A968D` | Tertiary text, placeholders, timestamps. |
| `--text-on-brand` | `#FFFFFF` | Text placed on `--brand` or `--brand-900`. |

#### Brand — one green, three shades

| Token | Hex | Usage |
|---|---|---|
| `--brand` | `#16A34A` | **The single accent doing all brand work.** Primary buttons. Links. Active states. Match-score highlights. Logo mark. Live indicators. Success. |
| `--brand-hover` | `#15803D` | Hover / pressed state for `--brand`. |
| `--brand-900` | `#0F3D22` | Deep forest green. Dark nav (if used). Hero-on-dark sections. Occasional heading emphasis. Replaces `--soil` as the darkest brand tone. |
| `--brand-50` | `#E8F5EC` | Subtle brand fills. Hover backgrounds. Chip backgrounds. Selected row highlights. |

#### Semantic

| Token | Hex | Usage |
|---|---|---|
| `--success` | `#16A34A` | Success messages, verified badges. (Same hue as `--brand` — intentional.) |
| `--success-bg` | `#E8F5EC` | Success background tints. |
| `--warn` | `#F59E0B` | Warnings, featured badges, mid match scores (60–79%). |
| `--warn-bg` | `#FEF3C7` | Warning background tints. |
| `--danger` | `#DC2626` | Errors, low match scores (<60%), destructive actions. |
| `--danger-bg` | `#FEE2E2` | Error background tints. |
| `--info` | `#0EA5E9` | Info messages, contact-released indicators, neutral alerts. |
| `--info-bg` | `#E0F2FE` | Info background tints. |
| `--ai` | `#8B5CF6` | AI insight boxes, match explanations, Claude-generated content. |
| `--ai-bg` | `#F5F3FF` | AI insight backgrounds. |

### What was retired from v1.0

For the record and for clean handoff:

- `--soil` (#2C1A0E) → retired. Replaced by `--brand-900` for the rare dark-surface need.
- `--moss` (#2D5016) → retired. Replaced by `--brand`.
- `--fern` (#4A7C2F) → retired. Replaced by `--brand-hover`.
- `--meadow` (#7AAF3F) → retired. One green means one green.
- `--hay`, `--hay-lt` → retired. Warning semantics move to `--warn` / `--warn-bg`.
- `--cream`, `--fog`, `--mist` → retired. Replaced by `--bg`, `--border`, `--surface-2`.
- `--ink`, `--mid`, `--light` → replaced by `--text`, `--text-muted`, `--text-subtle`.

### Palette rules

- **No gradients.** Flat fills only.
- **No brown.** If something looks brown, it's wrong.
- **One brand green at a time.** Never place `--brand` next to `--brand-900` as competing elements.
- **Status colours are used sparingly.** A dashboard with three red badges and four amber warnings at once is failing.

---

## 4. Component Standards

### Navigation (top nav)

- Default: `--surface` (white) with bottom border `1px solid --border`, 56px tall, sticky top
- Dark variant (landing page only, optional): `--brand-900` with white text
- Logo: Inter semibold "TopFarms" + a small leaf mark in `--brand`
- Nav links: 15px Inter medium, `--text-muted` default, `--text` on hover
- Active state: `--text` with a 2px `--brand` underline
- Primary CTA button in the nav uses `--brand`

### Buttons

All 40px tall on desktop, 44px on mobile. 8px border-radius. Inter 15px medium. Transitions: 150ms ease.

| Variant | Background | Text | Border | Usage |
|---|---|---|---|---|
| Primary | `--brand` | white | none | Main CTA per screen |
| Primary-dark | `--brand-900` | white | none | Dark-surface CTA |
| Secondary | `--surface` | `--text` | `1.5px solid --border-strong` | Alternative action |
| Ghost | transparent | `--text` | none | Tertiary action |
| Destructive | `--danger` | white | none | Delete, remove |
| Link | transparent | `--brand` | none, underline on hover | Inline text actions |

**Hover states:** primary darkens to `--brand-hover`; secondary gets `--surface-hover` fill; ghost gets `--surface-2` fill.

**Focus states:** 2px `--brand` outline, 2px offset. Never remove focus rings.

### Cards

- Background: `--surface` (white)
- Border: `1px solid --border`
- Border-radius: **12px**
- Padding: 20px (default), 24px (feature cards), 16px (compact list rows)
- Hover (if interactive): border becomes `--border-strong`, very subtle shadow `0 2px 8px rgba(11, 31, 16, 0.05)`
- No drop shadows by default — elevation is signalled through borders and spacing, not fake depth

### Inputs

- Background: `--surface-2`
- Border: `1.5px solid --border` default, `2px solid --brand` on focus
- Height: 44px minimum (mobile tap target)
- Border-radius: 8px
- Padding: 0 14px
- Label above, never placeholder-as-label
- Error state: `1.5px solid --danger`, error message in `--danger` below field

### Match score circles

- High (80–100%): `--brand` ring, `--text` number
- Mid (60–79%): `--warn` ring
- Low (<60%): `--danger` ring
- Sizes: 56px on list rows, 88px on detail pages
- Number typography: Inter semibold, tabular-nums, size scales with circle

### Pills / badges

- 24px tall, 10px horizontal padding, Inter 12px medium, 0.04em tracking
- Radius: 12px (fully rounded)
- Default: `--surface-2` background, `--text-muted` text
- Brand: `--brand-50` background, `--brand-900` text
- Semantic variants follow `--success-bg / --success` etc.

### Pipeline stage pills (applicant dashboard)

| Stage | Background | Text |
|---|---|---|
| New | `--info-bg` | `--info` |
| Reviewed | `--surface-2` | `--text-muted` |
| Interviewed | `--brand-50` | `--brand-900` |
| Shortlisted | `--warn-bg` | `#92400E` |
| Offered | `--success-bg` | `--success` |
| Declined | `--danger-bg` | `--danger` |

### Wizard / onboarding layout

**No more dark-brown slab.** Replace with:

- Centred single-column card, 560px max-width, on `--bg`
- Top: linear progress bar, `--border` track, `--brand` fill, 4px tall
- Progress text: "Step 3 of 7" in `--text-muted`, Inter 13px
- Card: white surface, 32px padding, 16px radius
- Optional right-side panel (desktop only, ≥1024px): 40/60 split, right side shows contextual hint card or subtle landscape photograph — never a full-bleed dark colour

### Spacing scale (4pt grid)

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96`

Use fewer values more consistently — don't invent new ones.

### Radius scale

- Inputs, buttons: 8px
- Cards, modals: 12px
- Pills, badges, circles: fully rounded
- Large feature elements: 16px

### Shadows (use sparingly)

- `--shadow-sm`: `0 1px 2px rgba(11, 31, 16, 0.04)` — rare, subtle lift
- `--shadow-md`: `0 4px 12px rgba(11, 31, 16, 0.06)` — modal, dropdown, hovered card
- `--shadow-lg`: `0 12px 32px rgba(11, 31, 16, 0.08)` — dialog overlay

### Motion

- Duration: 150ms for micro (hover, focus), 250ms for panels, 350ms for modals
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)`
- Always respect `prefers-reduced-motion: reduce`
- No bounce, no spring, no parallax

---

## 5. Layout

### Grid

- Desktop container max: 1200px, 24px side padding
- Marketing pages: max 1280px, can go wider for hero sections
- Column gutters: 24px
- Stack to single column at <768px

### Breakpoints

| Name | Min width | Usage |
|---|---|---|
| sm | 640px | Small tablet |
| md | 768px | Tablet |
| lg | 1024px | Laptop |
| xl | 1280px | Desktop |
| 2xl | 1536px | Wide desktop |

### Mobile-first

Every component designed for 375px width first. Seeker-facing screens must be mobile-excellent. Employer-facing can be desktop-primary but mobile-functional (especially the applicant review flow — farmers review on phone at 9pm).

---

## 6. Imagery & Illustration

### Photography

- **Subject:** wide-angle real NZ farms — pasture, dairy sheds, cattle, equipment, sunrise paddocks, working hands. Prefer unposed to posed.
- **Colour grade:** natural, high-key, crisp. Lean slightly cool/clean. Not sepia, not warm-filter.
- **What to avoid:** staged farmer-with-arms-crossed portraits, stock "happy team" shots, overhead drone cliches, black-and-white nostalgia treatments.
- **Product screenshots:** preferred over photography for feature sections — show the actual tool doing its job.

### Illustration

- Simple line-based, 1.5px stroke, `--brand` and `--text` only (no gradients, no painterly styles)
- Used sparingly — for empty states, feature callouts, contextual hints
- Never cartoonish — think technical drawing not children's book

### Icons

- **Set:** Lucide (`lucide-react`)
- **Stroke:** 1.75–2px depending on size
- **Size scale:** 16, 20, 24, 32
- **Colour:** inherits text colour by default; use `--brand` only for active or branded states
- Never use emoji as UI chrome (emoji as *content* in user messages is fine)

### Logo and leaf mark

- Logomark: a simple geometric leaf in `--brand`, 24px default
- Wordmark: "TopFarms", Inter semibold, `--text`
- Never place the logo on `--surface-2` or busy backgrounds — always `--surface`, `--bg`, or `--brand-900`
- Minimum clear space around the logo equal to the height of the "T"

---

## 7. Voice & Writing

(unchanged from v1.0 — still right)

- Active voice. Short sentences.
- Kiwi-isms okay when natural ("sussed", "mint", "yarn") — never forced.
- Numbers with units: "4 years dairy experience", not "extensive dairy experience".
- Plain-English AI explanations: "We rank candidates by how well their shed experience, location, and accommodation needs match your job." Never "leverage", "synergise", "unlock".
- CTAs: verb-first. "Post a job", "See matched candidates", "Release contact".
- No em-dash clichés, no "in today's fast-paced world" openers, no "revolutionary" or "cutting-edge".

---

## 8. Core UI Patterns (to be rebuilt against this spec)

Claude Design will extract these once wireframes are rebuilt:

- **Top nav** — white, bottom-border, sticky, logo left, nav-links centre, CTA + avatar right
- **Sticky filter sidebar** (Worker Job Search) — white panel, collapsible groups, accent-coloured selected state
- **Centred wizard card** (Seeker & Employer Onboarding, Job Posting) — single-column, progress bar top, max 560px
- **Pipeline pill stages** — New → Reviewed → Interviewed → Shortlisted → Offered → Declined
- **Match breakdown panel** — horizontal weighted bars showing each dimension's contribution
- **Shortlist gate modal** — click-to-confirm placement fee acknowledgement
- **Job management dashboard** — stat cards grid, quick actions, filterable jobs table, analytics with smart insights

All patterns rebuilt on `--bg` / `--surface` / `--brand` only.

---

## 9. Match Scoring Display (unchanged from v1.0)

Exact weights for any matching UI:

| Dimension | Points |
|---|---|
| Shed type experience | 25 |
| Location fit | 20 |
| Accommodation match | 20 |
| Skills (required + preferred) | 20 |
| Salary alignment | 10 |
| Visa / life situation | 5 |

Bonuses: couples bonus, recency multiplier for active profiles.

---

## 10. Accessibility Minimums

- **Contrast:** WCAG AA minimum. `--text` on `--bg` = 17.8:1 (AAA). `--brand` on white = 4.5:1 (AA). Test any custom pairing.
- **Tap targets:** 44×44px minimum on mobile.
- **Focus rings:** 2px `--brand` outline, 2px offset. Never removed.
- **Labels:** every form field has a visible label above it.
- **Motion:** `prefers-reduced-motion: reduce` respected on every animation.
- **Icons:** every meaningful icon has an accessible name (`aria-label` or adjacent text).

---

## 11. Reference Direction (aesthetic, not copy)

When extracting visual language, Claude Design should bias toward:

- **Linear** — technical clarity, near-white backgrounds, confident density
- **Stripe** — generous whitespace, disciplined type, one accent colour
- **Vercel** (light mode) — tight component grammar, monochrome with a single accent
- **Xero** — the actual daily-use SaaS language Kiwi farmers already know
- **Halter, FarmIQ** — the direct agtech competitor set

Do **not** bias toward:

- Salesforce, Monday, HubSpot (generic B2B bloat)
- Craft-beer / artisan-food aesthetics (sepia, cream, editorial serif)
- Stock agricultural branding (green gradients, rolling-hills-at-sunset)
- Notion / Linear overly-minimal ultra-light-weight type (we need presence)

---

## 12. Ready-to-paste CSS tokens

For Tailwind config or plain CSS custom properties:

```css
:root {
  /* Surfaces */
  --bg: #FAFBF9;
  --surface: #FFFFFF;
  --surface-2: #F3F5F0;
  --surface-hover: #F7F9F5;

  /* Borders */
  --border: #E5E8E2;
  --border-strong: #D0D5CC;

  /* Text */
  --text: #0B1F10;
  --text-muted: #5B6B5F;
  --text-subtle: #8A968D;
  --text-on-brand: #FFFFFF;

  /* Brand */
  --brand: #16A34A;
  --brand-hover: #15803D;
  --brand-900: #0F3D22;
  --brand-50: #E8F5EC;

  /* Semantic */
  --success: #16A34A;
  --success-bg: #E8F5EC;
  --warn: #F59E0B;
  --warn-bg: #FEF3C7;
  --danger: #DC2626;
  --danger-bg: #FEE2E2;
  --info: #0EA5E9;
  --info-bg: #E0F2FE;
  --ai: #8B5CF6;
  --ai-bg: #F5F3FF;

  /* Radius */
  --radius-sm: 6px;
  --radius: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;

  /* Shadow */
  --shadow-sm: 0 1px 2px rgba(11, 31, 16, 0.04);
  --shadow-md: 0 4px 12px rgba(11, 31, 16, 0.06);
  --shadow-lg: 0 12px 32px rgba(11, 31, 16, 0.08);

  /* Typography */
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", "DM Mono", Menlo, Consolas, monospace;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  font-variant-numeric: tabular-nums;
}
```

---

## 13. Migration note

All 9 existing wireframes were built against v1.0. They need to be rebuilt against v2.0 **before** uploading to Claude Design, because Claude Design extracts from what it sees — and it will happily extract the old brown-plus-cream system from the current HTML.

Recommended sequence:
1. Rebuild Landing Page as the tone-setter
2. Rebuild Worker Job Search, Job Detail, Applicant Dashboard (the three most-viewed screens)
3. Rebuild onboarding wizards (Seeker, Employer, Job Posting) with the new centred-card pattern
4. Rebuild Job Management Dashboard
5. Rebuild Worker Application View + Messaging
6. Upload the rebuilt set plus this spec to Claude Design onboarding
