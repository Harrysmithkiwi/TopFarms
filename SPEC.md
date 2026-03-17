# TopFarms — Product Requirements Document v3.0

**GSD-Compatible SPEC** · NZ Agricultural Job Marketplace

| Field | Value |
|---|---|
| Version | 3.0 |
| Status | Final — ready for `/gsd:new-project` |
| Tech stack | React · TypeScript · Supabase · Claude API · Stripe · Vercel |
| MVP scope | Dairy cattle + Sheep & beef sectors only |
| Excluded from PRD | Data scraping pipeline (separate document) |

---

## 1. Project Overview & Problem Statement

### 1.1 What is TopFarms?

TopFarms is a New Zealand agricultural job marketplace connecting farm employers with skilled workers. It replaces the informal hiring process currently happening inside Facebook groups with a structured platform purpose-built for the NZ agricultural sector.

### 1.2 The Problem

NZ farmers hire through Facebook groups (NZ Farm Jobs, Dairy NZ Employment, regional farming groups) because Seek and TradeMe lack agriculture-specific matching logic. These platforms cannot filter by shed type (rotary vs herringbone), accommodation sub-requirements (pets, couples, family), visa/DairyNZ accreditation, or herd size. The result is high-friction hiring that produces poor candidate quality.

**Core insight:** The NZ agricultural sector is small and reputation-driven. Farmers talk to each other. This creates social enforcement mechanisms — around platform trust, placement fee compliance, and data integrity — that do not exist in anonymous urban freelance markets. TopFarms is designed to leverage this dynamic, not fight it.

### 1.3 The Solution

- Agriculture-specific filters and match scoring (shed type, accommodation, visa, DairyNZ level)
- AI-powered match percentages giving seekers instant signal quality
- Structured job listings replacing Facebook free-text posts
- Revenue protection via listing fees + placement fee acknowledgement gates
- Verified employer profiles with a 5-tier trust ladder

### 1.4 Target Market

- **Dairy cattle** — 86% of NZ ag Facebook job posts. MVP primary target.
- **Sheep & beef** — MVP secondary target.
- Horticulture and viticulture — Phase 2, not in MVP.
- Key regions: Waikato, Canterbury, Southland, Taranaki, Manawatu-Whanganui, Otago, Hawke's Bay, Northland.

---

## 2. Vision & Success Metrics

### 2.1 Vision Statement

To become the go-to hiring platform for NZ agriculture — the place farmers use instead of Facebook groups — by delivering match quality, sector-specific UX, and community trust that generic platforms cannot replicate.

### 2.2 MVP Launch Success Criteria (3-Month Post-Launch)

| Metric | Target | Rationale |
|---|---|---|
| Active job listings | 50+ | Minimum viable supply side |
| Verified farm employers | 25+ | Signals platform trust |
| Registered seekers | 300+ | Demand side to justify listings |
| Confirmed placements | 10+ | Validates core value proposition |
| Listing fee revenue | $3,000+ NZD/mo | Covers infrastructure costs |
| Employer retention | >60% repost | Measures satisfaction |
| Seeker application rate | >25% | Match quality signal |

### 2.3 Platform Health Metrics

- Average match score on applications: >75%
- Time from job post to first application: <48 hours
- Profile completeness rate (seekers): >70% complete profiles
- Employer verification rate: >80% reach Tier 2 (phone verified)

---

## 3. Tech Stack (Confirmed — Do Not Deviate)

> **GSD note:** This stack is locked. Do not introduce alternative libraries, frameworks, or services without explicit approval. All GSD phases must use these exact tools.

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React + TypeScript + Vite | UI framework |
| Styling | Tailwind CSS | Utility-first styling — use design token values from Section 4 |
| Backend / DB | Supabase (PostgreSQL) | Database, Auth, Realtime, Edge Functions, Storage |
| Auth | Supabase Auth | Email/password + social login |
| AI matching | Claude API (`claude-sonnet-4-20250514`) | Match scoring explanations, AI insights |
| Payments | Stripe | Listing fees, placement fee invoicing |
| Hosting | Vercel | Frontend deployment + Edge Functions |
| Scraping | Apify | **Out of scope for this PRD** — see Data Architecture doc |

---

## 4. Design System Specification

All UI components must use this design system. These values are non-negotiable — they define TopFarms' visual identity.

### 4.1 Typography

| Role | Font | Usage |
|---|---|---|
| Display / Headings | **Fraunces** (serif) | All headings, match score numbers, large display text |
| Body / UI | **DM Sans** (sans-serif) | All body copy, labels, buttons, navigation, form fields |
| Code / Schema | **DM Mono** | Technical references, database fields (internal only) |

Load via Google Fonts: `Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;1,9..144,400` and `DM+Sans:wght@300;400;500;600`.

### 4.2 Colour Palette (CSS Custom Properties)

```css
:root {
  --soil: #2C1A0E;       /* Primary dark — nav, hero sections */
  --soil-deep: #1E1108;  /* Deepest dark — hero backgrounds, footer */
  --moss: #2D5016;       /* Primary green — buttons, headings, match circles (high) */
  --fern: #4A7C2F;       /* Secondary green — hover states, icons */
  --meadow: #7AAF3F;     /* Accent green — highlights, logo leaf, live indicators */
  --hay: #D4A843;        /* Amber — warnings, featured badges, hay-tier actions */
  --hay-lt: #FFF8E7;     /* Amber light — hay background tints */
  --cream: #F7F2E8;      /* Page background */
  --fog: #EEE8DC;        /* Borders, dividers, card outlines */
  --mist: #F2EEE6;       /* Input backgrounds, subtle fills */
  --ink: #1A1208;        /* Primary text */
  --mid: #6B5D4A;        /* Secondary text */
  --light: #9E8E78;      /* Tertiary text, placeholders */
  --white: #FFFFFF;      /* Card backgrounds */
  --red: #C0392B;        /* Errors, match circles (low <60%) */
  --red-lt: #FDF0EE;     /* Error backgrounds */
  --blue: #1A5276;       /* Info states, verified badges */
  --blue-lt: #EAF4FB;    /* Info backgrounds */
  --orange: #E67E22;     /* Match circles (mid 60–79%), warnings */
  --orange-lt: #FEF5EC;  /* Warning backgrounds */
  --purple: #6C3483;     /* AI insight boxes, growth-phase labels */
  --purple-lt: #F5EEF8;  /* AI insight backgrounds */
  --green-lt: #EAF5EA;   /* Success/confirmation backgrounds */
}
```

### 4.3 Component Standards

**Navigation:**
- Background: `var(--soil)`, height: 56px, position: sticky top
- Logo: Fraunces serif, 20px, "TopFarms" with `--meadow` leaf emoji prefix
- Nav links: DM Sans 12px 600, cream colour at 50% opacity, active = full cream + rgba white bg pill
- Bottom border: `rgba(255,255,255,.06)`

**Cards:**
- Background: `var(--white)`
- Border: `1.5px solid var(--fog)`
- Border radius: `12px`
- Padding: `20px`
- Hover: `translateY(-1px)` + subtle shadow

**Match Score Circles:**
- High (>=80%): `rgba(45,80,22,.08)` background, `rgba(45,80,22,.2)` border, `--moss` text
- Mid (60–79%): `--orange-lt` background, `--orange` border + text
- Low (<60%): `--red-lt` background, `--red` border + text
- Number: Fraunces serif, font-weight 700
- Sizes: 38px (card thumbnails), 50px (search results), 72px (job detail sidebar)

**Buttons:**
- `btn-primary`: `--moss` background, white text. Hover → `--fern`.
- `btn-outline`: white background, `--moss` border + text.
- `btn-ghost`: `--fog` border, `--mid` text. Hover darkens border.
- `btn-hay`: `--hay` background, `--soil` text — featured/upgrade actions.
- All: DM Sans 13px 700, border-radius 8px, transition 0.2s.

**Tag / Chip Variants:**

| Variant | Background | Text | Usage |
|---|---|---|---|
| `tag-green` | `rgba(--moss, 7%)` | `--moss` | Farm type, shed type, experience |
| `tag-hay` | `--hay-lt` | `#7A5C00` | Accommodation, perks, housing |
| `tag-blue` | `--blue-lt` | `--blue` | Qualifications, verified, info |
| `tag-grey` | `--mist` | `--mid` | General, eligibility, neutral |
| `tag-orange` | `--orange-lt` | `--orange` | Partial match, warnings |
| `tag-purple` | `--purple-lt` | `--purple` | AI features, growth phase |
| `tag-red` | `--red-lt` | `--red` | Warnings, not matched |

**AI Insight Boxes:**
- Background: `var(--purple-lt)`
- Border: `1.5px solid rgba(108,52,131,.15)`
- Header: purple text, small caps eyebrow ("AI" badge)

**Form Inputs:**
- Border: `1.5px solid var(--fog)`, border-radius 8px
- Focus: `border-color: var(--fern)` + `box-shadow: 0 0 0 3px rgba(74,124,47,.08)`
- Placeholder: `var(--light)`
- Font: DM Sans 13px

**Info Box Variants:**
- `ib-blue`: `--blue-lt` bg, blue title — informational
- `ib-hay`: `--hay-lt` bg, `#7A5C00` title — warning
- `ib-green`: `rgba(--moss, 6%)` bg, moss border — confirmation/success
- `ib-purple`: `--purple-lt` bg, purple title — AI insights
- `ib-red`: `--red-lt` bg, red title — errors

---

## 5. User Types & Core Journeys

### 5.1 User Types

| User Type | Description | Primary Goal |
|---|---|---|
| Employer | Farm owner, manager, or HR contact posting jobs | Find qualified workers quickly, hire the right fit |
| Seeker | Farm worker looking for a role | Find a good match — right location, shed type, accommodation, pay |
| Admin (internal) | TopFarms team — internal use only | Monitor data quality, manage listings, review flags |

### 5.2 Employer Core Journey

1. Sign up → complete farm profile (shed type, region, herd size, accommodation, culture)
2. Post a job listing (wizard: farm type → role → skills → compensation → publish)
3. Pay listing fee (first listing free, subsequent paid via Stripe)
4. Review ranked applicant pool with match scores
5. Shortlist candidates — placement fee acknowledgement gate fires before contact release
6. Contact released — direct communication off-platform
7. Confirm hire in dashboard — placement fee invoiced

### 5.3 Seeker Core Journey

1. Sign up → complete seeker profile (farm type pref, experience, skills + proficiency, life situation, visa status)
2. Browse job search — filtered, ranked by match score
3. View job detail — see match breakdown, accommodation info, farm profile
4. Apply (one-click with optional cover note)
5. Track applications through pipeline in worker application view
6. Receive offer — accept/decline/request info

---

## 6. Feature Requirements — MVP

> **MVP Scope:** Dairy cattle + sheep & beef sectors only. Horticulture and viticulture are Phase 2. Data scraping pipeline is excluded. Messaging / Expressions of Interest is Growth Phase — do not include in MVP build.

### 6.1 Authentication & Accounts

- Email/password signup and login via Supabase Auth
- User type selection at signup: Employer or Seeker
- Password reset via email
- Session persistence — stay logged in across browser sessions
- Separate onboarding wizards for Employer and Seeker
- **Social login (Google/Facebook OAuth) is out of scope for MVP** — email/password only

### 6.2 Landing / Home Page

Reference wireframe: `TopFarms_Landing_Page.html`

- Full-bleed dark soil hero (`--soil-deep` background) with animated topographic SVG background overlay at 4% opacity and radial gradient blobs (green top-right, hay bottom-left)
- Fraunces 900 weight headline with staggered `fadeUp` animation: "The right farm / worker. *Found* / faster." — italic em in `--hay`
- Dual CTA fork in single bordered card (1.5px `rgba(cream, 12%)` border, 14px radius):
  - Left: "I'm a farm worker" → "Browse jobs →" (`--meadow` solid button)
  - Right: "I'm a farm employer" → "Post a job →" (`--hay` tint button)
- Live counter strip animating from 0 on scroll-reveal: registered seekers, active jobs, confirmed placements — with animated pulsing "Live" green dot badge
- Three floating cards on hero right (absolute positioned, 340x420px container): sample job card (94% match), candidate profile snippet, shortlist notification
- Scroll hint: animated arrow at bottom center
- "How it works" section with seeker/employer tab toggle — 4 steps per tab in a 4-column card grid
- Social proof section (`--soil` background): 4 connected stat blocks + 3 testimonial cards
- AI matching features section: mock browser window showing ranked candidates + AI insight box, right column with 4 feature bullet points
- Farm types strip: 5 sector cards with listing counts (dairy, sheep & beef, mixed, deer, cropping)
- Featured job listings preview: 3 cards with match scores, farm details, salary
- Employer CTA band (`--soil` background): mini dashboard preview + "Post your first job" CTA + 4-point checklist
- Trusted-by strip: farm brand name placeholders
- Final CTA section: centered headline + dual buttons
- Full footer: `--soil-deep` background, 4-column grid (brand + 3 link columns), bottom bar with copyright + legal links

### 6.3 Employer Onboarding Wizard (8 Screens)

Reference wireframe: `TopFarms_Employer_Onboarding.html`

Progress system: 3px gradient progress bar below nav + "Step X of 8" indicator + 8 step dots.

- **Screen 1 — Account creation:** Two-col layout. Left: `--soil` panel with trust pillars (4 items with icon squares) + testimonial (hay left-border). Right: cream panel with email/password form, password strength indicator (3px animated bar: red→orange→moss), terms link. "Create account →" moss CTA.
- **Screen 2 — Farm type & ownership:** 6 farm type choice cards in 2x3 grid (Dairy Cattle, Sheep & Beef, Cropping/Arable, Deer Farming, Mixed Livestock, Other). Selected state = moss border + rgba moss bg + checkmark. 4 ownership structure cards stacked horizontal (Owner-operator, Sharemilker, Corporate, Farm manager hiring on behalf).
- **Screen 3 — Farm details:** Shed type chip selector (Rotary / Herringbone / AMS / Swing-Over / Tiestall). Herd size number input, farm area (hectares), milking frequency select, breed select, calving system select. Region selector (8 NZ regions), nearest town input, distance-from-town select with `--hay` warning hint at >30km: "Farms 30+ km from town see fewer applicants without accommodation."
- **Screen 4 — Team culture:** Team size select, "About your farm" textarea with char counter (175/400), career development chip grid (DairyNZ training, mentorship, study leave, career progression, etc.), hiring frequency select, couples toggle → reveals partner work availability sub-select.
- **Screen 5 — Accommodation & perks:** Blue info box: "76% of NZ dairy seekers require on-farm accommodation." Accommodation toggle (ON) → reveals: house type select (3BR/2BR/1BR/Cottage/Flat), utilities select, accommodation extras chip grid (Couples welcome, Family-friendly, Pets negotiable, Working dogs OK, Close to school, Broadband, Garden, Garage). Vehicle toggle → chips (UTV, Quad bike, Motorbike, Ute). Broadband toggle. Salary range: min/max NZD inputs with market rate comparison hint. Additional compensation chips.
- **Screen 6 — Verification (5-tier trust ladder):**
  - Tier 1: Email verified — auto on signup (green checkmark)
  - Tier 2: Phone SMS OTP — phone input + "Send code →" button
  - Tier 3: NZBN — 13-digit input, cross-referenced with Companies Register
  - Tier 4: Document upload — drag-drop zone (dashed border, mist bg), shows uploaded file with remove option
  - Tier 5: Farm photo — optional JPG/PNG upload (max 5MB)
  - Purple info box shows verification status
  - "Skip for now" option available
- **Screen 7 — Subscription pricing:** Annual/monthly billing toggle (pill switch, "Save 20%"). 3-column pricing grid:
  - Pay-per-listing: $100/listing — 30-day listing, AI match, pipeline, standard placement
  - Seasonal (popular badge, `--hay` border): $200/mo annual ($250 monthly) — 3 posts/mo, 1 featured/mo, basic candidate search
  - Enterprise: $350/mo annual ($440 monthly) — unlimited posts, full database, proactive matching, priority support
  - Note: "No payment until first listing. Prices include GST. Cancel anytime."
- **Screen 8 — Completion:** Two-col. Left: "Your farm is live on TopFarms" success card with setup checklist (mist bg), 3 CTA buttons ("Post your first job" moss primary, "Browse matched candidates" hay, "View farm profile" ghost), AI tip in purple box. Right: live public farm profile preview card (soil header with farm details, body with stats + tags + rating).

### 6.4 Employer Job Posting Form (7-Screen Wizard)

Reference wireframe: `TopFarms_Employer_Job_Posting_Form.html`

Progress system: Same as onboarding — 3px bar + step indicator + 6 step dots. Live preview sidebar visible on Steps 2–5 (320px, sticky, white, fog border, 14px radius) showing: completeness meter (Fraunces percentage + progress bar), mini job card preview, match pool estimate (seekers in region / with shed experience / actively looking), and AI tip box.

- **Step 1 — Farm type + role basics:** Two-col (soil left panel with stats, cream right form). Farm type choice grid (2 columns). Job title text input with hint: "Be specific — 'Rotary Milker – 520 cows' gets 30% more applications." Role type select (Farm Assistant/Trainee, Farm Assistant experienced, Relief Milker, Herd Manager, 2IC, Farm Manager, Contract Milker, Equity Farmer). Employment type select + Start date select.
- **Step 2 — Dairy-specific farm details:** Shed type chips (Rotary/Herringbone/AMS/Swing-Over/Tiestall — selected = moss bg + checkmark prefix). Herd size input, breed select, milking frequency select, calving system, farm area. Region select + nearest town input + distance select with warning hint.
- **Step 3 — Role requirements & skills:** Minimum dairy experience select (5 options). Seniority level select. Blue info box explaining skill levels. Per-skill requirement level selectors (4 buttons: Required/Preferred/Bonus/Not-needed) with visual states: Required = moss, Preferred = hay, Bonus = mist, Not-needed = red-lt. Skills covered: milking operation, rotary shed, herringbone, animal health, calf rearing, tractor operation, pasture management, fencing. Qualifications section: NZ driver's licence, DairyNZ Level 2+, ATV safety, 4WD. Visa chip grid: NZ Citizens & Residents, Open Work Visa, RSE Scheme.
- **Step 4 — Accommodation & compensation:** Accommodation toggle (ON) → house type select, utilities select, rent deduction toggle, extras chip grid (Couples welcome, Family-friendly, Pets negotiable, Working dogs OK, Broadband, Garden). Vehicle toggle → chips. Salary min/max NZD inputs with market rate comparison: "Market rate for Waikato dairy assistant: $50k–$65k. Your range is within market ✓". Pay frequency select, on-call allowance toggle, additional compensation chips, hours range input, weekend roster select.
- **Step 5 — Job description & preview:** 4 textareas: role overview (char counter 175/400), day-to-day responsibilities, what makes working here special, dealbreakers/must-haves. Char counter turns orange near limit.
- **Step 6 — Pricing & publish:** 3-column pricing grid: Standard ($100), Featured ($150, popular badge), Premium Plus ($200). Annual/monthly billing toggle updates prices. Stripe PaymentIntent integration. First listing free bypass.
- **Step 7 — Success screen:** Centered card (max-width 560px, 20px radius). Party emoji + "Listing live!" headline. Success stats grid (3-col, mist bg): avg days to first applicant / seekers in match pool / actively looking. Action buttons: "View your listing →" (moss), "Manage applications" (hay), "Post another role" (ghost).

### 6.5 Job Detail Page

Reference wireframe: `TopFarms_Job_Detail_Page.html`

Layout: Fixed nav (56px) + breadcrumb bar (44px, white bg, fog bottom border) + two-column page (max-width 1200px, centered, `1fr 320px`).

**Breadcrumb bar:** Left: "Jobs › Dairy › Waikato › [Job Title] — [Farm Name]" (11px, light). Right: "Save" + "Share link" buttons (fog border, mid text; saved state = moss).

**Main column:**
- **Job header card:** Optional featured banner (hay gradient, "Featured listing — appears at top of searches"). Soil hero section with green+hay radial gradients: farm logo (56x56px), farm name (11px, meadow) + "Verified" badge, H1 job title (Fraunces 28px 700, cream), meta row (location, contract type, start date, days remaining in `--hay`). Tag strip below hero. Stats strip (4-col grid): Applications, Views, Salary (moss), Posted.
- **Role overview:** White card, fog border, 14px radius. Section titles with emoji icons (Fraunces 17px). Prose description (13px, 1.7 line-height).
- **Day-to-day responsibilities:** Bulleted list with 6px meadow dot bullets.
- **Skills & requirements:** Legend row showing Required (moss badge) / Preferred (blue badge) / Bonus (grey badge). 2-column grid of skill items. Required variant: green-tinted border + bg.
- **Compensation & conditions:** Two columns — salary (Fraunces 22px) with checklist items (meadow checkmarks) | hours & roster details.
- **Accommodation card:** Mist bg, fog border. Icon + title + description + tag chips for features (power, water, broadband, couples, pets, garden).
- **Location:** 160px map placeholder (mist bg). Distance badge: "8 km to [Town] · 35 km to [City]".
- **About the farm:** Narrative text + tag chips (shed type, calving, team size, etc.).
- **Application timeline:** Vertical timeline component (meadow dots + connecting lines): Applications Close → Review → Interview invitations → Offer → Start date.

**Sidebar (sticky, top 76px) — two states:**

*Logged-in seeker:*
- Match header: Soil bg, radial green glow. 72px match circle (Fraunces 24px 900, cream, "MATCH" label). Title + subtitle.
- Body: Salary row (Fraunces 22px). 5 match breakdown bar rows (100px label + progress bar + score). AI insight box (purple-lt, purple border). Quick facts list (icons + labels). CTA stack: "Apply now" (moss, shadow), "Save for later" (ghost), "Share" (ghost), "Message farm" (hay-lt, hay border — links to Growth Phase). Deadline notice (hay-lt, hay border). "Report this listing" link.

*Visitor (not logged in):*
- Login nudge card (mist bg): icon + "See your match score" + "Sign in to see how well this role matches" + "Sign in" (moss) + "Create a free profile" (ghost).
- Apply button still visible but prompts sign-in.

**Farm profile card:** Soil header (farm logo, name, sub). Body: 3-stat grid (cows, hectares, breed) + tags + rating row + "View full farm profile →" link.

**Similar jobs card:** 3 entries with title, meta, salary, match badge.

**Responsive:** At max-width 860px: single column (sidebar below), skills grid and two-col sections become single column, stats strip becomes 2-col.

### 6.6 Worker Job Search

Reference wireframe: `TopFarms_Worker_Job_Search_v2.html`

Layout: Two-column shell — 280px sticky filter sidebar + 1fr scrollable main area.

**Navigation (authenticated worker):** Soil bg, 58px. Center links: "Find Work" (active, white bg pill), "My Applications", "My Profile", "CV Builder". Right: bell icon with notification dot + avatar circle.

**Filter sidebar (280px):** White bg, right border 1.5px fog, sticky at top 58px, scrollable. Header: "Filters" (Fraunces 15px) + "Clear all" link. All filter groups collapsible with triangle toggle. Each checkbox: 15px box, 1.5px fog border, 3px radius; checked = moss bg + white checkmark. Toggle switches: 34x18px pill. Footer: full-width "Show [N] jobs" button (moss bg).

**Filters (all MVP filters per Section 7):**
- Farm Type: Dairy Cattle, Sheep & Beef, Deer Farming, Cropping/Arable, Mixed Livestock (with counts)
- Role Type: Farm Assistant/Trainee, Relief Milker, Herd Manager, 2IC, Farm Manager, Contract Milker, Equity Farmer, General Farmhand (with counts)
- Region: Waikato, Canterbury, Southland, Taranaki, Manawatu-Whanganui, Otago, Hawke's Bay, Northland (with counts)
- Salary NZD/year: Dual-handle range slider, 4px fog track, moss fill, 14px white-bordered thumbs. Labels: "$35k" to "$120k+". Value display: "$48,000 – $72,000"
- Shed Type: Rotary, Herringbone, AMS/Robot, Swing-Over (with counts)
- Herd/Mob Size: Under 300, 300–600, 600–1,000, 1,000+ cows (with counts)
- Accommodation: House provided, Cottage/flat, Pet-friendly, Couples welcome, Family-friendly (with counts)
- Contract Type: Permanent Full Time, Casual/Relief, Fixed Term Seasonal, Sharemilking 50/50 (with counts)
- Visa/Eligibility: NZ Citizens & Residents, Open Work Visa, Employer can sponsor (with counts)
- Extras (toggle switches): Mentorship/training provided, Vehicle/UTV provided, DairyNZ progression pathway, Posted in last 7 days

**Search hero (above results):** Linear gradient soil→dark green, with radial green glow. Eyebrow: "[N] roles · NZ Agriculture" (10px, meadow). Title: "Find your next *farm role*" (Fraunces 22px, hay italic). Search bar: text input (magnifier icon) + region select dropdown + "Search" button (hay bg). Quick-filter pills below: Dairy only (active = hay bg), House included, Couples welcome, New this week, Top match >=80%, Pets OK.

**Results area:**
- Active filter pills: moss tint bg, moss border, × remove button (turns red on hover)
- Save search box: blue-lt bg, blue border, bell icon, email alert prompt + "Save & get alerts" button
- Results bar: left "[N] roles match your search" (moss Fraunces count) | right: sort select (Best match / Newest / Salary high-low / Location nearest) + view toggle (list/grid)

**Job cards:**
- Default: White bg, 1.5px fog border, 12px radius
- `.featured`: hay border (2px), hay-lt gradient bg
- `.new-post`: 3px left border moss accent
- Card anatomy: Icon square (44x44px, moss bg, emoji) + title (Fraunces 16px 700) + farm line (12px, verified dot) + tag chips + description (12px, 2-line clamp) + footer (salary, location, posted date, application count) + match circle (50x50px, high/mid/low)
- **Expandable card tabs:** Details (2-col detail cards) / My Match (bar chart breakdown + AI insight) / Apply (one-click)

**Pagination:** Numbered page buttons (34x34px, fog border), active = moss bg.

**Mobile:** Filter sidebar becomes slide-in drawer.

### 6.7 Worker Application View

Reference wireframe: `TopFarms_Worker_Application_View.html`

Layout: Fixed nav (56px) + two-column (260px sticky sidebar + 1fr main).

**Sidebar:** Application status summary (total, under review, shortlisted, interviews, offers). Filter tabs: All / Active / Shortlisted / Closed. Saved jobs section. Profile strength nudge with progress bar.

**Main content:**
- Page header: "My Applications" (Fraunces 22px) + "[N] active applications"
- Application cards (stacked list), each with:
  - Farm logo icon + job title (Fraunces 15px 700) + application date
  - Farm name + location (12px mid)
  - Status pipeline (horizontal stage track): Applied → Under Review → Shortlisted → Interview → Offer. Done steps = moss tint, active step = solid moss + white text, upcoming = fog.
  - Match score circle
  - Farm response indicator: "Viewed by employer X hours ago" or "Not yet viewed"
  - Tag chips + action buttons ("View listing" link, "Withdraw application" ghost)

**Status card variants:**
- Under review: Review stage active
- Shortlisted: "You've been shortlisted!" hay-lt banner, "Check your messages" CTA
- Interview invited: "Interview request" green banner, Accept/Decline/Suggest time buttons
- Declined: Card dims to 60% opacity, stage track greys out, red-lt message
- Offer made: "Offer made!" green banner, prominent hay CTA

### 6.8 Seeker Onboarding Wizard (8 Steps)

Reference wireframe: `topfarms_seeker_onboarding.html`

Progress system: 3px gradient bar + step dots.

- **Step 1 — Account creation:** Two-col. Left: soil bg with green/hay gradients, value prop list with icon squares (AI matching, accommodation matching, one-tap apply, job alerts), seeker testimonial. Right: cream bg with email/password form + password strength indicator.
- **Step 2 — Farm type preference:** Chip selector for preferred sectors (Dairy Cattle, Sheep & Beef, Cropping, Deer, Mixed, Other). Years of experience select (No experience through 5+ seasons). Current/most recent role input. Shed types worked with — chip grid (multi-select). Herd/mob size experience — chip grid.
- **Step 3 — Qualifications:** DairyNZ/B+LNZ level chip grid (No formal qual, Level 2–5+). Document upload zone (dashed border, mist bg) for certificates, CV, references (JPG/PNG/PDF, max 10MB). NZ driver's licence chips. Other certifications chips (ATV, tractor, 4WD, first aid, vet/treatment).
- **Step 4 — Skills:** Chip-based skill selector from skills master table. Proficiency per skill: Confident / Learning / Entry level. `willing_to_learn` toggle per skill — writes to `seeker_skills` table.
- **Step 5 — Life situation:** Housing required toggle → reveals sub-options: situation chip grid (Single, Couple partner working, Couple partner not working, Family with children, Working dogs, Pets). Preferred regions chip grid (multi-select). Minimum salary input. Availability date. Notice period.
- **Step 6 — Visa / right to work:** NZ Citizen / NZ Resident / Open Work Visa / Student Visa / Looking for sponsorship.
- **Step 7 — Completion:** "Your profile is live!" Success screen. Summary checklist. Match pool preview: "[N] roles on TopFarms that could suit you." Top 3 matched jobs preview with scores. CTAs: "Browse matched jobs →" (moss), "Complete my profile" (hay).
- **Step 8 — Profile management shell:** Sidebar nav (Overview / Experience & Skills / Documents / CV Builder). Profile completeness bar with field-level completion map.

### 6.9 Employer Applicant Dashboard

Reference wireframe: `topfarms_applicant_dashboard.html`

Layout: Two-column (260px fixed sidebar + 1fr main).

**Sidebar:** Farm header panel (soil bg, farm logo, name, region, herd info, verified badge). Navigation: Applications (active), Candidate Search, My Listings, Analytics, Settings. Active listing selector. Quick stats (Applications received, Shortlisted, Days active). Profile completeness nudge.

**Main content:**
- Page header: "Applications" / "[Job Title]" (Fraunces 20px). Sub: "[N] applicants · Posted X days ago · Y days remaining." Actions: "Listing settings" + "Extend listing."
- Toolbar: Search input, filter chips (All/New/Reviewed/Shortlisted/Declined with counts), sort select (Best match/Newest/Name A-Z), view toggle (list/grid).
- **Candidate cards (ranked by match score):** Avatar circle, name (Fraunces 14px), tagline (experience/shed/region/qual), match circle (50px), status badge, tag chips, quick actions (View profile / Shortlist / Decline / Message), AI insight snippet (purple, 1 line).
- **Expandable panels:** CV (parsed fields) / Match (score breakdown bars) / Interview (calendar + time slots) / Notes (free text + stage mover).
- AI summary box per candidate (purple): key strengths, potential concerns.
- **Shortlist action:** Triggers placement fee acknowledgement modal before contact release.
- Bulk actions bar: "Shortlist selected", "Send message", "Export."

### 6.10 Employer Profile & Verification

**Public farm profile page:** Farm name, region, shed type, herd size, accommodation summary, about, verification tier badge, active listings, star rating.

**5-tier verification system:**
| Tier | Method | Notes |
|---|---|---|
| 1 | Email verified | Automatic on signup |
| 2 | Phone SMS OTP | Via Supabase Auth |
| 3 | NZBN lookup | NZ Business Number — manual entry + admin approval for MVP |
| 4 | Document upload | Lease, title, incorporation certificate → Supabase Storage + admin review |
| 5 | Farm photo | Optional — displays on profile |

Higher tiers unlock: increased listing visibility, "Verified Employer" badge, trust signals on job listings.

---

## 7. Feature Requirements — Growth Phase (Post-MVP)

> **Do not build these in MVP.** They are documented for context and future roadmap planning only.

### 7.1 Messaging / Expressions of Interest

Reference wireframe: `TopFarms_Messaging.html` (marked "Growth Phase" with purple banner).

- Listing-anchored message threads — no cold-contact (messaging requires an active listing)
- 3-panel layout: 300px inbox + 1fr thread + 260px candidate panel (employer view)
- Thread headers include listing reference, match score, and stage progress track
- **Contact detection:** Soft-block contact sharing in messages. Real-time scan for NZ phone patterns (021, 022, 027, +64), email addresses, social handles, phrases like "text me" / "DM me", deliberate obfuscation ("zero two one"). Message held + nudge banner shown. No hard rejection.
- **Contact gate:** "Contact details shared when shortlisted" bar for seekers. Details masked until shortlist action.
- **Post-shortlist contact release:** Green bar with clickable phone/email chips.
- Quick reply chips for common responses.
- Composer: auto-resize textarea, attachment/emoji/template buttons, send button (moss).

### 7.2 Tier 2 Filters (Post-MVP)

- ATV/quad bike licence, tractor certification, heavy machinery, irrigation systems, employment type, language requirements, driver's licence class

### 7.3 Other Deferred Features

- Horticulture + viticulture sector support
- Social media login (Google/Facebook OAuth)
- Partner job matching (separate role for seeker's partner)
- Video interviews / calendar integration
- Multi-user employer accounts / team roles
- Mobile native apps (iOS/Android)
- API for third-party developers
- International markets

---

## 8. Database Schema

All tables in Supabase / PostgreSQL. Row Level Security (RLS) enabled on all tables — no exceptions.

### 8.1 `jobs`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `employer_id` | `uuid` | FK → `employer_profiles.id` |
| `source` | `text` | `'employer_posted'` \| `'scraped_facebook'` \| `'scraped_seek'` \| `'scraped_trademe'` |
| `sector` | `text` | `'dairy'` \| `'sheep_beef'` (MVP only) |
| `role_type` | `text` | `'farm_assistant'` \| `'herd_manager'` \| `'2ic'` \| `'relief_milker'` \| `'shepherd'` \| `'station_hand'` \| `'other'` |
| `title` | `text` | Job listing title |
| `region` | `text` | Normalised NZ region name |
| `shed_type` | `text[]` | `['rotary','herringbone','ams','swing_over']` |
| `herd_size_min` | `int` | Lower bound |
| `herd_size_max` | `int` | Upper bound |
| `salary_min` | `int` | NZD annual (floor: 35000) |
| `salary_max` | `int` | NZD annual |
| `contract_type` | `text` | `'permanent'` \| `'seasonal'` \| `'relief'` |
| `start_date` | `date` | Target start date |
| `accommodation` | `jsonb` | `{type, bedrooms, pets_allowed, couples_welcome, family_ok, utilities_included, vehicle_provided}` |
| `visa_sponsorship` | `bool` | Employer can sponsor visa |
| `couples_welcome` | `bool` | Denormalised from `accommodation.couples_welcome` for fast filtering |
| `description_overview` | `text` | Role overview prose |
| `description_daytoday` | `text` | Day-to-day responsibilities |
| `description_offer` | `text` | What we offer |
| `description_ideal` | `text` | Ideal candidate |
| `status` | `text` | `'draft'` \| `'active'` \| `'paused'` \| `'filled'` \| `'expired'` \| `'archived'` |
| `listing_tier` | `text` | `'standard'` \| `'featured'` \| `'premium'` |
| `confidence_score` | `float` | AI extraction confidence (scraped posts only, 0.0–1.0) |
| `views_count` | `int` | Default 0 |
| `created_at` | `timestamptz` | `now()` |
| `expires_at` | `timestamptz` | `created_at + 30 days` |

### 8.2 `employer_profiles`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `auth.users.id` |
| `farm_name` | `text` | Public farm name |
| `farm_type` | `text` | `'dairy'` \| `'sheep_beef'` \| `'mixed'` \| `'deer'` \| `'equine'` \| `'other'` |
| `ownership_type` | `text` | `'owner_operator'` \| `'corporate'` \| `'trust'` \| `'sharemilker'` |
| `region` | `text` | NZ region |
| `shed_type` | `text[]` | Farm's shed types |
| `herd_size` | `int` | Current herd/mob size |
| `milking_frequency` | `text` | `'twice'` \| `'three_times'` \| `'once'` \| `'robotic'` |
| `breed` | `text` | Primary breed |
| `calving_system` | `text` | `'spring'` \| `'autumn'` \| `'year_round'` |
| `distance_from_town` | `int` | Minutes drive |
| `about_farm` | `text` | Free text description |
| `verification_tier` | `int` | 1–5 |
| `subscription_tier` | `text` | `'pay_per_listing'` \| `'seasonal'` \| `'enterprise'` |
| `stripe_customer_id` | `text` | Stripe customer ID |
| `rating` | `float` | Average rating from placed workers |
| `created_at` | `timestamptz` | `now()` |

### 8.3 `seeker_profiles`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `auth.users.id` |
| `region` | `text` | Current or preferred region |
| `open_to_relocate` | `bool` | Default false |
| `sector_pref` | `text[]` | Preferred sectors |
| `role_type_pref` | `text[]` | Target role types |
| `years_experience` | `int` | Total farm work experience |
| `accommodation_needed` | `bool` | Requires accommodation |
| `housing_type_pref` | `text` | `'house_3br'` \| `'house_2br'` \| `'cottage'` \| `'flat'` \| `'any'` |
| `pets` | `jsonb` | `{dogs: bool, cats: bool, other: text}` |
| `couples_seeking` | `bool` | Partner also seeking farm work |
| `family` | `jsonb` | `{has_children: bool, ages: int[]}` |
| `visa_status` | `text` | `'nz_citizen'` \| `'permanent_resident'` \| `'working_holiday'` \| `'student'` \| `'needs_sponsorship'` |
| `min_salary` | `int` | Minimum acceptable annual salary NZD |
| `availability_date` | `date` | Available to start from |
| `notice_period` | `text` | `'immediate'` \| `'1_week'` \| `'2_weeks'` \| `'1_month'` \| `'negotiable'` |
| `profile_complete_pct` | `int` | Computed percentage |
| `created_at` | `timestamptz` | `now()` |

### 8.4 `skills`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `name` | `text` | e.g. "Rotary milking", "Tractor operation" |
| `category` | `text` | `'milking'` \| `'livestock'` \| `'machinery'` \| `'management'` \| `'maintenance'` \| `'compliance'` \| `'qualification'` |
| `sector` | `text` | `'dairy'` \| `'sheep_beef'` \| `'both'` |

### 8.5 `job_skills`

| Column | Type | Notes |
|---|---|---|
| `job_id` | `uuid` | FK → `jobs.id` |
| `skill_id` | `uuid` | FK → `skills.id` |
| `requirement_level` | `text` | `'required'` \| `'preferred'` \| `'bonus'` \| `'not_needed'` |

### 8.6 `seeker_skills`

| Column | Type | Notes |
|---|---|---|
| `seeker_id` | `uuid` | FK → `seeker_profiles.id` |
| `skill_id` | `uuid` | FK → `skills.id` |
| `proficiency` | `text` | `'confident'` \| `'learning'` \| `'entry'` |
| `willing_to_learn` | `bool` | Not binary possession — seeker open to developing this skill |

### 8.7 `match_scores`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `job_id` | `uuid` | FK → `jobs.id` |
| `seeker_id` | `uuid` | FK → `seeker_profiles.id` |
| `total_score` | `int` | 0–100 composite |
| `breakdown` | `jsonb` | `{shed_type, location, accommodation, skills, salary, visa, couples, recency}` |
| `calculated_at` | `timestamptz` | Last computed |

### 8.8 `applications`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `job_id` | `uuid` | FK → `jobs.id` |
| `seeker_id` | `uuid` | FK → `seeker_profiles.id` |
| `status` | `text` | `'applied'` \| `'review'` \| `'interview'` \| `'shortlisted'` \| `'offered'` \| `'hired'` \| `'declined'` \| `'withdrawn'` |
| `cover_note` | `text` | Optional short message |
| `created_at` | `timestamptz` | `now()` |

### 8.9 `listing_fees`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `job_id` | `uuid` | FK → `jobs.id` |
| `employer_id` | `uuid` | FK → `employer_profiles.id` |
| `tier` | `text` | `'standard'` \| `'featured'` \| `'premium'` |
| `amount_nzd` | `int` | Amount in NZD cents |
| `stripe_payment_id` | `text` | Stripe PaymentIntent ID |
| `paid_at` | `timestamptz` | NULL if unpaid |

### 8.10 `placement_fees`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `job_id` | `uuid` | FK → `jobs.id` |
| `application_id` | `uuid` | FK → `applications.id` |
| `employer_id` | `uuid` | FK → `employer_profiles.id` |
| `seeker_id` | `uuid` | FK → `seeker_profiles.id` |
| `acknowledged_at` | `timestamptz` | Employer clicked "I understand" at shortlist gate |
| `confirmed_at` | `timestamptz` | Employer confirmed hire — triggers invoicing |
| `amount_nzd` | `int` | Fee amount in NZD cents |
| `stripe_invoice_id` | `text` | Stripe Invoice ID |

### 8.11 `message_threads` (Growth Phase — create table but leave unused for MVP)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `job_id` | `uuid` | FK → `jobs.id` |
| `employer_id` | `uuid` | FK → `employer_profiles.id` |
| `seeker_id` | `uuid` | FK → `seeker_profiles.id` |
| `contact_released` | `bool` | Default false |

### 8.12 `messages` (Growth Phase — create table but leave unused for MVP)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `thread_id` | `uuid` | FK → `message_threads.id` |
| `sender_id` | `uuid` | FK → `auth.users.id` |
| `body` | `text` | Message content |
| `flagged` | `bool` | Contact pattern detected |
| `created_at` | `timestamptz` | `now()` |

---

## 9. Match Scoring Engine

Match scores are pre-computed and stored in `match_scores`. Recalculated on job update or seeker profile change. Powers instant ranked search results without real-time computation.

### 9.1 Scoring Dimensions (Total: 100 base points)

| Dimension | Weight | Scoring Logic |
|---|---|---|
| **Shed type match** | 25 pts | Exact match = 100%. Rotary ↔ HB = 40% (transferable skills). AMS = separate pool. Most important single dimension. |
| **Location** | 20 pts | Same region = 100%. Adjacent region = 60%. Open to relocate = 80% base. Inverse distance decay. |
| **Accommodation match** | 20 pts | Seeker needs + job provides = 100%. Sub-scored: housing type match, pets match, couples match, family match, utilities match. |
| **Skills & qualifications** | 20 pts | Required skills: full weight. Preferred: 60%. Bonus: 20%. DairyNZ level match included. `willing_to_learn` gives partial credit. |
| **Salary alignment** | 10 pts | `job.salary_max >= seeker.min_salary` = 100%. Partial credit for close ranges. Never penalises job paying above minimum. |
| **Visa / eligibility** | 5 pts | NZ citizen/PR on non-sponsored role = 100%. Working holiday on sponsored role = 100%. Ineligible = 0 (hard filter). |
| **Couples bonus** | +5 pts | `seeker.couples_seeking = true` + `job.couples_welcome = true` → additive bonus on top of base score. |
| **Recency multiplier** | ×1.1 | Jobs posted within 7 days receive 1.1× multiplier on total score. Prevents stale listings dominating. |

### 9.2 Score Display

- Displayed as percentage circles using Fraunces serif, font-weight 700
- Colour coding: moss green >=80%, orange 60–79%, red <60%
- Per-dimension breakdown shown as animated progress bars on job detail and applicant dashboard
- AI insight text (Claude API, `claude-sonnet-4-20250514`): 2–3 sentence plain-English explanation of match quality

### 9.3 Recalculation Triggers

- Job insert/update → recalculate `match_scores` for all active seekers matching sector
- Seeker profile update → recalculate `match_scores` for all active jobs matching seeker's sector pref
- Nightly Edge Function batch recalculation for data integrity
- Target: recalculation completes within 60 seconds of trigger

### 9.4 Region Adjacency Matrix

[DECISION NEEDED] — Define which NZ regions count as "adjacent" for the 60% location score. Suggested groupings:

- Waikato ↔ Bay of Plenty, Taranaki, Manawatu-Whanganui
- Canterbury ↔ Otago, West Coast
- Southland ↔ Otago
- Taranaki ↔ Waikato, Manawatu-Whanganui
- Hawke's Bay ↔ Manawatu-Whanganui, Gisborne/East Coast
- Northland ↔ Auckland

---

## 10. Revenue Model & Protection Mechanisms

### 10.1 Revenue Events

| Event | Trigger | Amount (NZD) | Protection |
|---|---|---|---|
| First listing | First listing per employer account | **Free** | Acquisition driver |
| Standard listing | Employer publishes job (2nd+) | **$100** | Stripe payment before any candidates shown |
| Featured listing | Employer selects featured tier | **$150** | Same — top of search + homepage |
| Premium Plus listing | Employer selects premium tier | **$200** | Same — featured + targeted email |
| Placement fee | Employer confirms hire via TopFarms | **[DECISION NEEDED]** | Acknowledged at shortlist gate |

**[DECISION NEEDED] Placement fee structure:** Flat fee by seniority ($500 / $750 / $1,500) vs % of first-year salary (5–8%). **Recommendation: flat fee** — simpler to administer, less contentious, easier to explain in ToS.

### 10.2 Placement Fee Protection — 7-Stage Flow

1. **Job posted** — listing fee collected upfront. Contact details never exposed at this stage. Zero circumvention risk.
2. **Candidates appear** — ranked by match score. All contact details masked at data layer (RLS, not CSS — not extractable from page source).
3. **In-app messaging** (Growth Phase only) — threads anchored to listing, contact pattern scanning active.
4. **Shortlist action** — placement fee acknowledgement modal fires. Employer must click "I understand — release contact details" before seeing phone/email. Creates paper trail. `placement_fees.acknowledged_at` written.
5. **Contact released** — phone and email visible. Note: "Placement fee applies if hired."
6. **Off-platform interview** — TopFarms has no control. Automated follow-up emails at Day 7 and Day 14 after contact release.
7. **Hire confirmed** — employer confirms in dashboard. `placement_fees.confirmed_at` written. Stripe Invoice created.

### 10.3 Circumvention Deterrents

- **Click-to-confirm modal** at shortlist creates legal paper trail
- **ToS clause:** placement fee applies to any hire of a TopFarms-introduced candidate within 12 months of contact release
- **"Trusted Employer" badge** for confirmed placements — meaningful in small NZ ag community
- **NZ sector dynamics:** reputation-driven, word travels fast. Social enforcement is a genuine deterrent.
- **Automated follow-ups:** Day 7 + Day 14 emails after contact release
- **Messaging contact scan** (Growth Phase): soft-block, ~85% catch rate, nudge banners not hard rejection

### 10.4 Stripe Integration Points

- **Listing fee:** Stripe PaymentIntent at job posting Step 6. Webhook confirms payment → listing status set to `active`.
- **Subscription tiers:** Stripe Products for Seasonal ($200/mo) and Enterprise ($350/mo). Checkout Session or PaymentElement.
- **Placement fee:** Stripe Invoice created when employer confirms hire. Invoice sent via Stripe-hosted page.
- **First listing bypass:** listing published without payment, `listing_fees` row created with amount 0.

---

## 11. Agriculture-Specific Differentiation

### Why TopFarms Wins

This is the reason TopFarms exists. Every feature below is something Seek and TradeMe cannot do:

| Differentiator | What it does | Why generic platforms fail |
|---|---|---|
| **Shed type matching** | Rotary↔Rotary = full match, Rotary↔HB = 40% partial | Seek has no concept of "shed type" |
| **Accommodation sub-scoring** | Pets, couples, family, utilities — all sub-scored independently | TradeMe treats accommodation as a binary yes/no |
| **DairyNZ qualification levels** | Filter and score by Level 1–5 | No NZ-specific qualification taxonomy on generic platforms |
| **Herd/mob size experience** | 300-cow experience ≠ 1,200-cow experience | Not represented anywhere else |
| **Couples seeking work** | Both partners need roles — match farms that can place both | No platform handles coupled job searches |
| **Visa + sponsorship matching** | Hard filter prevents wasted applications from ineligible seekers | Generic platforms have basic work-rights filters only |
| **Salary ranges specific to NZ ag** | $35k floor, market rate comparison per region/role | Generic salary data doesn't reflect NZ farming pay bands |
| **Community trust signals** | 5-tier verification, Trusted Employer badge, small-sector reputation | Anonymous urban marketplaces lack social enforcement |

---

## 12. Wireframe Inventory

All MVP screens are fully wireframed as interactive HTML files. These are the authoritative reference for UI implementation. **Where a wireframe decision is documented, it is decided — implement as shown.**

### 12.1 MVP Wireframes (All Completed)

| # | Screen | File | Key Notes |
|---|---|---|---|
| 1 | Landing / Home page | `TopFarms_Landing_Page.html` | Full-bleed hero, dual CTA fork, live counters, 3 floating cards, how-it-works tabs, AI section, featured listings, testimonials, full footer |
| 2 | Worker job search | `TopFarms_Worker_Job_Search_v2.html` | 280px sticky filter sidebar, search hero with quick-filter pills, job cards with match scores, expandable 3-tab cards, saved search alerts, pagination |
| 3 | Job detail page | `TopFarms_Job_Detail_Page.html` | Two states (logged-in match breakdown / visitor signup prompt), sticky sidebar, skills grid with badges, accommodation card, similar listings, application timeline |
| 4 | Employer job posting form | `TopFarms_Employer_Job_Posting_Form.html` | 7-screen wizard, live preview sidebar with completeness tracker, 3 NZD pricing tiers, Stripe integration, success screen with match pool stats |
| 5 | Employer onboarding | `TopFarms_Employer_Onboarding.html` | 8-screen wizard, 5-tier verification ladder, subscription pricing with annual/monthly toggle |
| 6 | Seeker onboarding | `topfarms_seeker_onboarding.html` | 8-step wizard, skill proficiency chips with willing-to-learn, life situation toggles, visa status, match preview at completion |
| 7 | Applicant dashboard | `topfarms_applicant_dashboard.html` | Employer-side ranked candidates, pipeline stages, expandable panels with 4 tabs, AI summaries, shortlist gate |
| 8 | Worker application view | `TopFarms_Worker_Application_View.html` | Seeker pipeline overview, 5 status card variants (offer/interview/shortlisted/review/withdrawn) |

### 12.2 Growth Phase Wireframes (Do Not Build for MVP)

| # | Screen | File | Notes |
|---|---|---|---|
| 9 | Messaging / EOI | `TopFarms_Messaging.html` | Listing-anchored threads, contact detection, shortlist gate, contact release. **POST-MVP ONLY.** |

### 12.3 Supporting Documents

| Document | File | Purpose |
|---|---|---|
| Revenue Journey | `TopFarms_Revenue_Journey.html` | 7-stage employer journey, risk matrix, placement fee mechanism |
| Data Architecture | `TopFarms_Data_Architecture.html` | 7-layer scraping pipeline: Apify → Claude API → Supabase. Separate build track. |

---

## 13. Non-Functional Requirements

### 13.1 Performance

- Job search results: <1.5 seconds (pre-computed match scores)
- Job listing page load: <2 seconds on 4G mobile
- Match score recalculation: <60 seconds after profile update
- Supabase Realtime: new job listings appear on search page within 5 seconds of publish

### 13.2 Security & RLS

Row Level Security enabled on ALL Supabase tables — no exceptions.

| Table | Policy |
|---|---|
| `employer_profiles` | Employers read/write own records only |
| `seeker_profiles` | Seekers read/write own records only |
| `jobs` | Employers CRUD own jobs. All authenticated users read active jobs. |
| `match_scores` | Seekers read own scores. Employers read scores for their jobs' applicants. |
| `seeker_profiles` (contact fields) | Phone/email masked via RLS until `placement_fees.acknowledged_at` is set for that job/seeker pair |
| `applications` | Employers read applications to their jobs. Seekers read own applications. |
| `listing_fees` | Employer read own records. Admin read all. |
| `placement_fees` | Employer read own records. Admin read all. |

### 13.3 Mobile

- All screens fully functional on mobile (320px minimum width)
- Filter sidebar: drawer/slide-in panel on mobile, not persistent column
- Touch targets: minimum 44px × 44px
- Font sizes: minimum 14px body text on mobile
- Priority mobile screens: job search, job detail, worker application view, employer dashboard

### 13.4 Accessibility

- WCAG 2.1 AA compliance target
- Colour contrast: all text against background meets AA ratio
- Focus states visible on all interactive elements (3px fern box-shadow)
- Form labels associated with inputs
- Alt text on all non-decorative images

### 13.5 Database Indexing

Required indexes for query performance:
- `jobs.region`
- `jobs.sector`
- `jobs.shed_type` (GIN index for array)
- `jobs.status`
- `jobs.employer_id`
- `match_scores.job_id`
- `match_scores.seeker_id`
- `applications.job_id`
- `applications.seeker_id`

---

## 14. Out of Scope for MVP

> **The following are explicitly excluded.** Do not include in GSD milestone planning. Flag and defer any reference.

- Data scraping pipeline (Apify actors, raw_posts staging, AI field extraction) — separate document and build track
- Messaging / Expressions of Interest — Growth Phase wireframe exists, do not build
- Horticulture sector filters and job types
- Viticulture sector filters and job types
- Mobile native apps (iOS / Android) — mobile web only
- Social media login (Google / Facebook OAuth) — email/password only for MVP
- Training providers / courses module
- Job promotion / featured listing upsell within dashboard — handled at posting time only
- Partner job matching (separate role for seeker's partner)
- Video interviews or calendar integration
- Multi-user employer accounts / team roles
- API for third-party developers
- International markets

---

## 15. GSD Milestone Breakdown

These milestones are designed for `/gsd:new-project`. Each produces demonstrably working software — vertical slices, not layers.

### GSD Setup Instructions

1. Install: `npx get-shit-done-cc --claude --global`
2. In project directory: `/gsd:new-project`
3. When prompted for SPEC, reference this document
4. GSD generates `ROADMAP.md`, `REQUIREMENTS.md`, and `CONTEXT.md`
5. Run `/gsd:discuss-phase` before executing each milestone

---

### Milestone 1 — Foundation: Auth, Schema, Design System, Shell

**Objective:** Stand up the complete technical foundation. An authenticated user can sign up as either Employer or Seeker, see the correct nav, and land on a skeleton home screen. The design system is implemented as Tailwind config tokens. The complete database schema is migrated in Supabase with RLS on all tables.

**Requirements:**
- [ ] Supabase project created, all tables from Section 8 migrated with correct types and constraints
- [ ] Row Level Security policies implemented for all tables per Section 13.2
- [ ] Supabase Auth configured — email/password signup with user type (employer/seeker) stored on profile creation
- [ ] React + TypeScript + Vite project scaffolded on Vercel
- [ ] Tailwind config populated with all CSS custom properties from Section 4.2
- [ ] DM Sans + Fraunces fonts loaded via Google Fonts
- [ ] TopFarms nav component: soil background, 56px, sticky, logo with meadow leaf, nav links, user avatar/auth state
- [ ] Route structure: `/`, `/jobs`, `/jobs/:id`, `/employers/:id`, `/dashboard/employer`, `/dashboard/seeker`, `/onboarding/employer`, `/onboarding/seeker`
- [ ] Skeleton home page renders with nav and footer
- [ ] Reusable UI components: Button (4 variants), Card, Tag/Chip (7 variants), Match Score Circle (3 states × 3 sizes), Info Box (5 variants), Form Input, Toggle Switch
- [ ] Environment variables configured: Supabase URL/keys, Stripe keys (test mode), Claude API key
- [ ] Skills master table seeded with ~40 skills across dairy + sheep/beef (see Appendix B)

**Definition of Done:** A user can create an Employer or Seeker account via email/password, be redirected to the correct onboarding route, see the TopFarms nav with their account state, and navigate between routes. Database schema passes validation. RLS prevents cross-user data access. All design system components render correctly.

**Dependencies:** None (first milestone).

---

### Milestone 2 — Employer Core: Onboarding, Job Posting, Listing Pages

**Objective:** An employer can complete the full onboarding wizard, post a job listing (including Stripe payment for 2nd+ listings), and see their listing published on a public job detail page. Farm profile is public and linked from the listing.

**Requirements:**
- [ ] Employer onboarding wizard: all 8 screens functional per Section 6.3, data persisted to `employer_profiles`
- [ ] Farm type + ownership structure selection (Screen 2) stored correctly
- [ ] Farm details form (Screen 3): shed type chips, herd size, region — all fields write to `employer_profiles`
- [ ] Team culture (Screen 4): textarea, career development chips, couples toggle
- [ ] Accommodation & perks (Screen 5): toggle reveals sub-options, writes to `employer_profiles`
- [ ] Verification Tier 1 (email) auto-assigned on signup. Tier 2 (phone SMS OTP) functional.
- [ ] Subscription tier selection (Screen 7): stores choice, Stripe integration for paid tiers
- [ ] Completion screen (Screen 8): checklist + live farm profile preview
- [ ] Employer job posting form: all 7 screens per Section 6.4
- [ ] Skill selector (Step 3): Required/Preferred/Bonus/Not-needed picker using seeded skills table
- [ ] Salary slider NZD with $35k floor + market rate comparison (hardcoded ranges for MVP)
- [ ] Accommodation toggle with full sub-option reveal (Step 4) writes to `jobs.accommodation`
- [ ] Live preview sidebar on Steps 2–5: completeness meter, mini card preview, match pool estimate
- [ ] Listing tier selector + Stripe PaymentIntent for Standard ($100) / Featured ($150) / Premium ($200)
- [ ] First listing bypass: published without payment, `listing_fees` row created with amount 0
- [ ] Job detail page: all sections rendered from `jobs` table per Section 6.5
- [ ] Job detail visitor state: sign-up prompt sidebar functional
- [ ] Public employer profile page: renders from `employer_profiles`, lists active jobs

**Definition of Done:** An employer can complete onboarding, post a job, pay via Stripe (on 2nd+ listing), and see their live job detail page at `/jobs/:id` with all sections populated. A visitor can view the job without an account and see the signup prompt.

**Dependencies:** Milestone 1 (auth, schema, design system).

---

### Milestone 3 — Seeker Core: Onboarding, Job Search, Apply

**Objective:** A seeker can complete onboarding, search and filter jobs, view a job detail page with their match score and breakdown, and submit an application. The application appears in the employer's dashboard.

**Requirements:**
- [ ] Seeker onboarding wizard: all 8 steps per Section 6.8, data persisted to `seeker_profiles` and `seeker_skills`
- [ ] Skill proficiency chips (Step 4): Confident/Learning/Entry per skill, `willing_to_learn` toggle
- [ ] Life situation toggles (Step 5): housing, pets, couples, family, min salary, availability
- [ ] Visa status selector (Step 6): writes to `seeker_profiles.visa_status`
- [ ] Job search page: all MVP filters from Section 7 functional — filter state updates URL params
- [ ] Filter sidebar (280px sticky desktop, slide-in drawer mobile) with all filter groups
- [ ] Quick-filter pills above results
- [ ] Job cards display match score circles (coloured per Section 9.2) from pre-computed `match_scores`
- [ ] Job cards expandable: Details / My Match / Apply tabs
- [ ] My Match tab: per-dimension bars + Claude API AI insight text (2–3 sentences)
- [ ] Apply tab: one-click apply writes to `applications` table, optional `cover_note`
- [ ] Job detail logged-in state: full match breakdown sidebar with Apply/Save buttons
- [ ] Worker application view per Section 6.7: all pipeline stage variants render correctly
- [ ] Employer applicant dashboard per Section 6.9: ranked list, expandable panels, stage changes

**Definition of Done:** A seeker can complete onboarding, search jobs with filters, see personalised match scores, view a job detail with breakdown, apply, and track their application. An employer can see new applications ranked by match score.

**Dependencies:** Milestone 2 (jobs exist to search and apply to).

---

### Milestone 4 — Matching Engine: Scoring, Ranked Results, Recalculation

**Objective:** Match scoring is fully implemented as a Supabase database function. Scores are accurate, recalculate on trigger, and power all ranked views. AI-generated match explanations are live.

**Requirements:**
- [ ] Match scoring function in PostgreSQL per Section 9.1 weight table
- [ ] Shed type scoring: exact match / partial transfer / incompatible logic
- [ ] Location scoring: same region / adjacent / open-to-relocate logic
- [ ] Accommodation scoring: all sub-dimensions (housing, pets, couples, family, utilities)
- [ ] Skills scoring: required / preferred / bonus / `willing_to_learn` weights
- [ ] Salary alignment: floor comparison, no penalisation of above-minimum
- [ ] Visa eligibility: hard filter (0 score for ineligible, not just low)
- [ ] Couples bonus: +5 pts applied additively
- [ ] Recency multiplier: 1.1× for jobs posted within 7 days
- [ ] Trigger: job insert/update → recalculate for matching-sector seekers
- [ ] Trigger: seeker profile update → recalculate for matching-sector jobs
- [ ] Nightly Edge Function: full recalculation batch for data integrity
- [ ] Claude API integration: 2–3 sentence match explanation from `breakdown` jsonb
- [ ] All scored results display with correct colour coding (moss/orange/red)
- [ ] Performance: search results with pre-computed scores return in <1.5 seconds

**Definition of Done:** Match scores are accurate, update within 60 seconds of a profile or job change, and produce correct colour-coded circles on all surfaces. AI insight text is coherent and accurate for high, mid, and low scores.

**Dependencies:** Milestone 3 (seekers and applications exist to score against).

---

### Milestone 5 — Revenue: Listing Fees, Placement Gate, Verification

**Objective:** Both revenue events are fully operational. Stripe processes listing fees. The placement fee acknowledgement gate fires at shortlist, blocks contact release until confirmed, and writes the audit trail. Verification Tiers 1–4 are functional.

**Requirements:**
- [ ] Stripe listing fee: PaymentIntent at posting Step 6. Webhook confirms payment → listing activated.
- [ ] First listing free: bypass logic correct, `listing_fees` row with amount 0
- [ ] Tier selection at posting: Standard/Featured/Premium correctly sets `jobs.listing_tier` and amount
- [ ] Placement fee gate: shortlist action triggers acknowledgement modal
- [ ] Modal: clear placement fee notice, "I understand — release contact details" confirmation
- [ ] On confirmation: `placement_fees.acknowledged_at` written, contact details unlocked for that pair
- [ ] Contact details masked at RLS level until acknowledged
- [ ] Automated follow-up emails: Day 7 + Day 14 after acknowledgement (Supabase Edge Function + email provider)
- [ ] Hire confirmation: employer marks hired → `placement_fees.confirmed_at` written
- [ ] Stripe Invoice created on hire confirmation for placement fee amount
- [ ] Verification Tier 2 (SMS OTP): functional via Supabase Auth phone verification
- [ ] Verification Tier 3 (NZBN): manual entry + admin approval flag for MVP
- [ ] Verification Tier 4 (document upload): file upload to Supabase Storage, admin review queue
- [ ] Verification tier badge visible on employer profile and job listings

**Definition of Done:** An employer can pay for a listing via Stripe, shortlist a candidate (triggering placement fee modal), have contact details released only after confirmation, mark a hire, and receive a placement fee invoice. Verification Tiers 1–4 functional.

**Dependencies:** Milestone 4 (match scores power the applicant dashboard where shortlisting occurs).

---

### Milestone 6 — Polish & Launch: Landing Page, Mobile, QA, Go-Live

**Objective:** The platform is production-ready. The landing page is fully built, all screens are mobile-optimised, tests cover critical paths, and the platform is publicly accessible.

**Requirements:**
- [ ] Landing page: all sections per Section 6.2 (hero, CTA fork, counters, how-it-works, AI section, featured listings, testimonials, footer)
- [ ] Live counters: seeker count, job count, placement count — Supabase query, animate on scroll
- [ ] Mobile optimisation: all 8 MVP screens tested at 320px, 375px, 414px viewports
- [ ] Filter sidebar: drawer/slide-in on mobile, all filters accessible
- [ ] Touch targets: 44px minimum on all interactive elements
- [ ] E2E test: full employer journey (signup → onboard → post → pay → view applicants → shortlist → release contact → confirm hire)
- [ ] E2E test: full seeker journey (signup → onboard → search → filter → apply → track → receive offer)
- [ ] Stripe webhook handling verified in production mode
- [ ] RLS audit: no cross-user data leakage
- [ ] Error states: all forms validated, network errors handled gracefully
- [ ] Empty states: search no results, dashboard no applicants, new seeker no matches
- [ ] SEO: meta tags, og:image, structured data for job listings (Google Jobs schema)
- [ ] Vercel deployment: production env vars, custom domain configured
- [ ] Supabase: connection pooling, indexes per Section 13.5
- [ ] Performance audit: all pages meet targets from Section 13.1

**Definition of Done:** TopFarms is live at the production domain. Both complete user journeys work end-to-end on desktop and mobile. Stripe processes real payments. The landing page presents the platform compellingly. No critical bugs, no cross-user data leakage.

**Dependencies:** Milestones 1–5 complete.

---

## Appendix A — Open Decisions

Resolve before `/gsd:new-project`:

| # | Decision | Options | Recommendation |
|---|---|---|---|
| 1 | Placement fee structure | Flat fee by seniority ($500/$750/$1,500) vs % of first-year salary (5–8%) | **Flat fee** — simpler, less contentious, easier ToS |
| 2 | NZBN verification (Tier 3) | Live Companies Office API vs manual entry + admin approval | **Manual + admin flag** for MVP |
| 3 | Email provider for follow-ups | Resend, Postmark, Supabase built-in | **Resend** — good free tier, React Email templates |
| 4 | Market rate salary data | Hardcoded vs DairyNZ data vs crowdsourced | **Hardcoded** for MVP, update quarterly |
| 5 | Skills master table seed | Manual curation vs DairyNZ competency import | **Manual curation** of ~40 skills |
| 6 | Adjacent region definition | Which regions count as adjacent for 60% location score | **[DECISION NEEDED]** — see Section 9.4 for suggested matrix |

## Appendix B — Skills Master Table Seed

Initial skill set to populate the `skills` table (~40 skills):

**Dairy — Milking:** Rotary milking, Herringbone milking, AMS/robotic milking, Swing-over milking, Milk quality and hygiene, Teat scoring and mastitis detection, Cluster attachment and post-dip.

**Dairy — Livestock:** Herd health monitoring, Calving assistance, AI (artificial insemination), Body condition scoring, Calf rearing, Feeding systems (TMR/pasture/supplements).

**Dairy — Qualifications:** DairyNZ Level 1, Level 2, Level 3, Level 4, Level 5.

**Sheep & Beef:** Lamb marking and docking, Shearing (operator), Shearing (shed hand), Mustering (on foot), Mustering (motorbike), Mustering (helicopter), Stock handling and yards, Drench and vaccination, Condition scoring and drafting.

**Machinery & Equipment:** Tractor operation (general), Tractor (loader), Irrigation systems, Effluent systems, Feed out equipment, Farm motorbike, ATV/quad bike, Chainsaw operation.

**Farm Management:** Pasture management, Record keeping (MINDA), Staff supervision and rostering, H&S compliance, Budget management.

---

*End of TopFarms SPEC.md v3.0*

*This document is the authoritative product specification for TopFarms MVP. Feed to `/gsd:new-project` to generate ROADMAP.md and REQUIREMENTS.md.*
