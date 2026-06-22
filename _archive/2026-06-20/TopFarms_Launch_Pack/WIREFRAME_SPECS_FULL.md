# TopFarms Wireframe Specifications (Full SPEC Target)

**Purpose:** Screen-by-screen specs for wireframes reflecting the complete SPEC v3.0 vision — all gaps closed.
**Date:** 2026-03-17
**Source:** SPEC.md v3.0 + codebase audit delta

> Items marked **[BUILT]** are already implemented. Items marked **[GAP]** need to be built to reach full SPEC compliance. Items marked **[DEVIATION]** were built differently from SPEC — wireframe should show SPEC version.

---

## Design System Reference

- **Fonts:** Fraunces (headings, display numbers, match scores) + DM Sans (body, labels, buttons, nav)
- **Palette:** soil `#2C1A0E`, soil-deep `#1E1108`, moss `#2D5016`, fern `#4A7C2F`, meadow `#7AAF3F`, hay `#D4A843`, hay-lt `#FFF8E7`, cream `#F7F2E8`, fog `#EEE8DC`, mist `#F2EEE6`, ink `#1A1208`, mid `#6B5D4A`, light `#9E8E78`, red `#C0392B`, red-lt `#FDF0EE`, blue `#1A5276`, blue-lt `#EAF4FB`, orange `#E67E22`, orange-lt `#FEF5EC`, purple `#6C3483`, purple-lt `#F5EEF8`, green-lt `#EAF5EA`
- **Cards:** White bg, 1.5px fog border, 12px radius, 20px padding. Hover: translateY(-1px) + subtle shadow
- **Buttons:** btn-primary (moss bg, white text, hover→fern), btn-outline (white bg, moss border+text), btn-ghost (fog border, mid text), btn-hay (hay bg, soil text). All: DM Sans 13px 700, border-radius 8px, transition 0.2s
- **Tags:** tag-green (moss 7% bg, moss text), tag-hay (hay-lt bg, #7A5C00 text), tag-blue (blue-lt bg, blue text), tag-grey (mist bg, mid text), tag-orange (orange-lt bg, orange text), tag-purple (purple-lt bg, purple text), tag-red (red-lt bg, red text)
- **Match circles:** >=80% moss, 60-79% orange, <60% red. Fraunces 700. Sizes: 38px (card), 50px (search), 72px (detail)
- **Nav:** soil bg, 56px height, sticky top. Logo: Fraunces 20px "TopFarms" with meadow leaf. Links: DM Sans 12px 600, cream 50% opacity, active = full cream + rgba white bg pill. Bottom border: rgba(255,255,255,.06)
- **Inputs:** 1.5px fog border, 8px radius. Focus: fern border + 3px rgba(74,124,47,.08) shadow. Placeholder: light. Font: DM Sans 13px
- **AI insight boxes:** purple-lt bg, 1.5px rgba(108,52,131,.15) border, purple text header with "AI" badge

---

## 1. AUTH LAYOUT (Shared Template)

**Used by:** Login, SignUp, ForgotPassword, ResetPassword, VerifyEmail

**Desktop (md+):**
- Two-column split: left 50-60% / right 40-50%
- **Left panel:** soil bg with gradient overlay (soil-deep → soil → moss at 135deg), dot pattern texture (48px grid, 1px circles, 10% opacity). Content z-10: TopFarms logo (Fraunces 24px, hay), headline (4-5xl, Fraunces, cream), description (lg, hay), 3-column stats footer (meadow/hay numbers)
- **Right panel:** cream bg, centered content, max-w-md container

**Mobile:** Left panel hidden. Right panel full width, centered TopFarms logo (Fraunces 24px, soil). Padding: px-6 py-12

**Status:** [BUILT]

---

## 2. LOGIN (`/login`)

**Layout:** AuthLayout

**Right panel:**
- Title: "Welcome back" (Fraunces)
- Subtitle: "Log in to your TopFarms account"
- **Email input:** label "Email address", fog border, white bg
- **Password input:** label row with "Forgot password?" link right-aligned, Eye/EyeOff toggle (absolute right-3)
- **Submit button:** "Log in", soil bg, cream text, full width, disabled opacity-60 when submitting
- **Footer link:** "Don't have an account? Sign up" (soil, underline)
- **Error states:** Red text below each input. Toast on auth failure

**Status:** [BUILT] — fully compliant

---

## 3. SIGN UP (`/signup`)

**Layout:** AuthLayout

**Right panel:**
- Title: "Create your account"
- Subtitle: "Join TopFarms — New Zealand's agricultural job marketplace"

**Stage 1 — Role selection:**
- 2-column grid, gap-3
- **Employer card:** Building2 icon, "Employer", "Post farm jobs". Unselected: white bg, fog border. Selected: hay-lt bg, soil border
- **Seeker card:** User icon, "Seeker", "Find farm work". Same states
- URL param `?role=employer|seeker` pre-selects

**Stage 2 — Form (after role):**
- Email input
- Password input with Eye toggle
- **Password strength bar:** 3px height, fog bg. Fill: red→orange→hay→moss. Label beside. Visible when password non-empty
- Terms checkbox with linked text
- Submit: "Create account", soil bg, full width

**Validation:** Email format, password min 8, terms required, role required

**Status:** [BUILT] — fully compliant

---

## 4. FORGOT PASSWORD (`/forgot-password`)

**Form state:** Title, subtitle, email input, "Send reset link" button, "Back to login" ArrowLeft link

**Success state:** Mail icon in hay-lt circle, "We've sent a password reset link to **[email]**", 1-hour expiry note, spam folder warning, back to login link

**Status:** [BUILT]

---

## 5. RESET PASSWORD (`/auth/reset`)

**Loading:** Spinner + "Verifying your reset link..."

**Expired:** AlertCircle in red-lt circle, "Link expired", "Request a new reset link" button

**Form:** "Set new password" title, new password + confirm password (both with Eye toggles), "Update password" button. Validation: min 8, must match

**Status:** [BUILT]

---

## 6. VERIFY EMAIL (`/auth/verify`)

**Processing:** Loader2 spinner (moss, 40px) + setup message

**Awaiting:** Mail icon in hay-lt circle, "Check your inbox", instructions, 24hr expiry, spam warning, "Resend verification email" button (RefreshCw icon, spins when active)

**Status:** [BUILT]

---

## 7. LANDING PAGE (`/`)

### 7a. Hero Section
- Full-bleed soil-deep bg with animated topographic SVG overlay at 4% opacity + radial gradient blobs (green top-right, hay bottom-left)
- **Headline:** "The right farm / worker. *Found* / faster." — Fraunces 900 weight, cream. "*Found*" in hay italic. **Staggered fadeUp animation** on each line [DEVIATION: currently different copy, no animation]
- **Dual CTA fork:** Single bordered card (1.5px rgba cream 12%, **14px** radius [DEVIATION: currently 16px])
  - Left: "I'm a farm worker" → "Browse jobs →" (meadow solid button) [DEVIATION: currently "Farm Workers" / "Find Farm Work"]
  - Right: "I'm a farm employer" → "Post a job →" (hay tint button) [DEVIATION: currently "Farm Employers" / "Post a Job"]
- **Floating cards (desktop lg+ only):** 3 absolute-positioned cards in 340x420px container [DEVIATION: currently responsive, not fixed]: sample job card (94% match), candidate profile snippet, shortlist notification. Glassy/translucent effect [BUILT but not in SPEC — keep]
- **Scroll hint:** Bottom center, animated bounce arrow, cream 30% opacity [BUILT]

### 7b. Live Counter Strip
- soil bg, centered
- 3 counters: registered seekers, active jobs, confirmed placements [BUILT: from Supabase RPC]
- Count-up animation from 0 on scroll-reveal (useInView) [BUILT]
- **Animated pulsing "Live" green dot badge** [GAP]
- Desktop: 3 columns with vertical dividers. Mobile: 3 rows with horizontal dividers [BUILT]

### 7c. How It Works
- cream bg
- **Seeker/employer tab toggle** [BUILT]
- 4-step card grid per tab with emoji icons, step numbers, descriptions [BUILT]
- Desktop: 4 columns with dashed connector lines. Mobile: 1 column [BUILT]

### 7d. Social Proof Section
- soil bg
- **4 connected stat blocks** (e.g., "500+ seekers", "50+ farms", "95% match rate", "48hr avg response") [GAP]
- **3 testimonial cards:** 5-star rating (hay), quote, author avatar, farm name, "Verified" badge [BUILT]
- Desktop: stat blocks row above, testimonial cards 3-col below

### 7e. AI Matching Features Section [GAP — entire section]
- **Left:** Mock browser window showing ranked candidate list with match scores + AI insight box (purple)
- **Right column:** 4 feature bullet points:
  1. Agriculture-specific matching (shed type, herd size, accommodation)
  2. AI-powered explanations
  3. Pre-computed instant results
  4. 7-dimension scoring

### 7f. Farm Types Strip [GAP — entire section]
- cream bg
- 5 sector cards in horizontal strip with listing counts:
  - Dairy Cattle, Sheep & Beef, Mixed Livestock, Deer Farming, Cropping/Arable
  - Each card: icon/emoji, sector name, "[N] listings" count

### 7g. Featured Job Listings
- 3 cards with: job title (Fraunces 16px 700), farm name, region tag, contract tag, salary, tier badge [BUILT]
- **Match score circles** on each card [GAP]
- Live data from Supabase (featured/premium priority) [BUILT]
- Empty state fallback CTA [BUILT]
- Desktop: 3-col. Mobile: 1-col [BUILT]

### 7h. Employer CTA Band [GAP — entire section]
- soil bg
- **Left:** Mini dashboard preview mockup (job listing cards with applicant counts + match scores)
- **Right:**
  - Headline: "Post your first job — free"
  - 4-point checklist (meadow checkmarks): AI matching, verified candidates, instant applications, placement tracking
  - CTA: "Post your first job →" (hay bg)

### 7i. Trusted-By Strip [GAP — entire section]
- cream bg, subtle
- Horizontal strip of farm brand name placeholders (greyed out logos/text)
- "Trusted by farms across New Zealand"

### 7j. Final CTA Section [GAP — entire section]
- cream bg (or soil gradient)
- Centered headline: "Ready to find your perfect match?"
- Dual buttons: "Find Farm Work" (meadow) + "Post a Job" (hay outline)
- Subtitle: "Join [N]+ farmers and workers already on TopFarms"

### 7k. Footer
- soil-deep bg
- 4-column grid: Brand (logo + description), Platform (Browse Jobs, Post a Job, Sign Up, Log In), Support (Contact, Help Center, About), Legal (Privacy, Terms)
- Bottom bar: copyright + legal links, border divider rgba white 7%
- Desktop: 4-col. Mobile: 1→2-col [BUILT]

---

## 8. EMPLOYER ONBOARDING (`/onboarding/employer`) — 8 Steps

**Progress system:** 3px gradient progress bar below nav + "Step X of 8" indicator + 8 step dots [DEVIATION: currently StepIndicator component — wireframe should show SPEC gradient bar]

### Step 1 — Account Creation [DEVIATION: currently only farm type selection]
**SPEC layout:** Two-column
- **Left (soil bg):** Trust pillars (4 items with icon squares): "Verified candidates", "AI matching", "Secure payments", "NZ agriculture focus". Testimonial card with hay left-border
- **Right (cream bg):** Email/password form, password strength indicator (3px animated bar: red→orange→moss), terms link. "Create account →" moss CTA
- **Note:** If keeping auth separate from onboarding (current pattern), this step becomes the farm type + ownership selection (see below). Wireframe both options.

### Step 2 — Farm Type & Ownership [DEVIATION: currently step 1 with only 2 types]
- **Farm type:** 6 choice cards in 2x3 grid: Dairy Cattle, Sheep & Beef, Cropping/Arable, Deer Farming, Mixed Livestock, Other. Selected: moss border + rgba moss bg + checkmark [DEVIATION: currently 2 cards only]
- **Ownership:** 4 cards stacked horizontal: Owner-operator, Sharemilker, Corporate, Farm manager hiring on behalf [GAP]

### Step 3 — Farm Details [DEVIATION: currently step 2, missing fields]
- **Shed type chips** (not checkboxes): Rotary / Herringbone / AMS / Swing-Over / Tiestall [DEVIATION: currently 3 checkboxes]
- Herd size number input [BUILT]
- Farm area (hectares) [BUILT as "property size"]
- Milking frequency select [BUILT]
- Breed select [BUILT]
- **Calving system select** [GAP]
- Region selector (8 NZ regions) [BUILT]
- **Nearest town input** [GAP]
- **Distance-from-town select** with hay warning hint at >30km: "Farms 30+ km from town see fewer applicants without accommodation." [GAP]

### Step 4 — Team Culture [DEVIATION: missing multiple fields]
- Team size select [BUILT]
- "About your farm" textarea with char counter (**175/400**, not 2000) [DEVIATION: currently 2000]
- **Career development chip grid:** DairyNZ training, mentorship, study leave, career progression, etc. [GAP]
- **Hiring frequency select** [GAP]
- **Couples toggle** → reveals partner work availability sub-select [GAP]

### Step 5 — Accommodation & Perks [DEVIATION: significantly simplified]
- **Blue info box:** "76% of NZ dairy seekers require on-farm accommodation." [GAP]
- Accommodation toggle (ON) → reveals: [BUILT as basic toggle]
  - House type select (3BR/2BR/1BR/Cottage/Flat) [BUILT as type select]
  - Utilities select [DEVIATION: currently checkbox]
  - **Accommodation extras chip grid:** Couples welcome, Family-friendly, Pets negotiable, Working dogs OK, Close to school, Broadband, Garden, Garage [DEVIATION: currently 4 checkboxes]
- **Vehicle toggle** → chips (UTV, Quad bike, Motorbike, Ute) [GAP]
- **Broadband toggle** [GAP]
- **Salary range:** min/max NZD inputs with market rate comparison hint [GAP]
- **Additional compensation chips** [GAP]

### Step 6 — Verification (5-Tier Trust Ladder) [DEVIATION: card grid vs ladder]
- **Tier 1: Email** — auto on signup, green checkmark [BUILT]
- **Tier 2: Phone SMS OTP** — phone input + "Send code →" button [BUILT inline]
- **Tier 3: NZBN** — 13-digit input, cross-referenced with Companies Register [BUILT inline]
- **Tier 4: Document upload** — drag-drop zone (dashed border, mist bg), shows uploaded file with remove option [BUILT on separate page]
- **Tier 5: Farm photo** — optional JPG/PNG upload (max 5MB) [BUILT on separate page]
- Purple info box shows verification status [BUILT as trust level box]
- "Skip for now" option [BUILT]

### Step 7 — Subscription Pricing [DEVIATION: different tier names/prices]
- **Annual/monthly billing toggle** (pill switch, "Save 20%") [GAP]
- 3-column pricing grid:
  - **Pay-per-listing:** $100/listing — 30-day listing, AI match, pipeline, standard placement
  - **Seasonal** (popular badge, hay border): $200/mo annual ($250 monthly) — 3 posts/mo, 1 featured/mo, basic candidate search
  - **Enterprise:** $350/mo annual ($440 monthly) — unlimited posts, full database, proactive matching, priority support
- Note: "No payment until first listing. Prices include GST. Cancel anytime."
- [DEVIATION: currently Standard/Featured/Premium at $100/$150/$200 — listing fees, not subscription tiers]

### Step 8 — Completion [DEVIATION: currently minimal]
- **Two-column layout:**
- **Left:** "Your farm is live on TopFarms" success card with:
  - Setup checklist (mist bg) [GAP]
  - 3 CTA buttons: "Post your first job" (moss primary), "Browse matched candidates" (hay), "View farm profile" (ghost) [GAP — currently simple nav]
  - AI tip in purple box [GAP]
- **Right:** Live public farm profile preview card — soil header with farm details, body with stats + tags + rating [GAP]

---

## 9. POST JOB WIZARD (`/jobs/new`) — 7 Steps (SPEC) / 8 Steps (Built)

**Progress:** 3px bar + step indicator + 6 step dots
**Live preview sidebar** (320px, sticky, white bg, fog border, 14px radius) visible Steps 2-5: completeness meter (Fraunces % + progress bar), mini job card preview, match pool estimate (seekers in region / with shed experience / actively looking), AI tip box [GAP — not implemented]

### Step 1 — Farm Type + Role Basics [DEVIATION: missing two-col layout]
- **Two-column:** Left soil panel with stats (e.g., "3,200 seekers", "89% fill rate"), right cream form [DEVIATION: currently single column]
- Farm type choice grid (2 columns) [BUILT as radio cards]
- Job title text input with hint: "Be specific — 'Rotary Milker – 520 cows' gets 30% more applications." [BUILT]
- Role type select: Farm Assistant/Trainee, Farm Assistant experienced, Relief Milker, Herd Manager, 2IC, Farm Manager, Contract Milker, Equity Farmer [BUILT]
- Employment type select [BUILT as contract type]
- Start date select [BUILT]
- Region select [BUILT — but SPEC has it in step 1, not step 2]

### Step 2 — Dairy-Specific Farm Details [DEVIATION: missing many fields]
- **Shed type chips** (selected = moss bg + checkmark prefix): Rotary / Herringbone / AMS / Swing-Over / Tiestall [DEVIATION: 3 checkboxes]
- Herd size input [DEVIATION: currently min/max range]
- Breed select [GAP]
- Milking frequency select [GAP]
- Calving system [GAP]
- Farm area [GAP]
- Region select + nearest town input + distance select with warning hint [GAP — region is in step 1]

### Step 3 — Role Requirements & Skills [DEVIATION: missing most fields]
- **Minimum dairy experience select** (5 options: No experience, 1 season, 2-3 seasons, 3-5 seasons, 5+ seasons) [GAP]
- **Seniority level select** [GAP]
- **Blue info box** explaining skill levels [GAP]
- Per-skill requirement level selectors (4 buttons): Required = moss, Preferred = hay, Bonus = mist, Not-needed = red-lt [BUILT via SkillsPicker]
- Skills: milking operation, rotary shed, herringbone, animal health, calf rearing, tractor operation, pasture management, fencing [BUILT from master table]
- **Qualifications section:** NZ driver's licence, DairyNZ Level 2+, ATV safety, 4WD [GAP]
- **Visa chip grid:** NZ Citizens & Residents, Open Work Visa, RSE Scheme [DEVIATION: currently toggle in step 2]

### Step 4 — Accommodation & Compensation [DEVIATION: accommodation moved to step 2, missing fields]
- **Accommodation toggle** (ON) → house type select, utilities select, rent deduction toggle, extras chip grid (Couples welcome, Family-friendly, Pets negotiable, Working dogs OK, Broadband, Garden) [DEVIATION: currently in step 2 as basic toggle]
- **Vehicle toggle** → chips [GAP]
- **Salary min/max NZD inputs** with market rate comparison: "Market rate for Waikato dairy assistant: $50k–$65k. Your range is within market ✓" [DEVIATION: salary built but no market rate hint]
- **Pay frequency select** [GAP]
- **On-call allowance toggle** [GAP]
- **Additional compensation chips** [GAP]
- **Hours range input** [GAP]
- **Weekend roster select** [GAP]

### Step 5 — Job Description & Preview
- 4 textareas with char counters:
  - Role overview (**175/400** char counter) [DEVIATION: currently 5000]
  - Day-to-day responsibilities [BUILT]
  - What makes working here special [BUILT as "What we offer"]
  - Dealbreakers/must-haves [BUILT as "Ideal candidate"]
- Char counter turns orange near limit [BUILT]

### Step 6 — Pricing & Publish [DEVIATION: currently split into Preview step 6 + Payment step 7]
- 3-column pricing grid:
  - Standard ($100) [BUILT]
  - Featured ($150, popular badge) [BUILT]
  - Premium Plus ($200) [BUILT]
- **Annual/monthly billing toggle** updates prices [GAP]
- Stripe PaymentIntent integration [BUILT]
- First listing free bypass [BUILT]

### Step 7 — Success [DEVIATION: currently step 8]
- Centered card (max-width 560px, 20px radius)
- Party emoji + "Listing live!" headline
- **Success stats grid** (3-col, mist bg): avg days to first applicant / seekers in match pool / actively looking [GAP]
- Action buttons: "View your listing →" (moss), "Manage applications" (hay), "Post another role" (ghost) [DEVIATION: currently simplified]

---

## 10. EMPLOYER DASHBOARD (`/dashboard/employer`)

**Layout:** DashboardLayout (nav + sidebar/content)

**Content (top to bottom):**
- **Onboarding progress card** (if incomplete): progress bar + "Continue Setup" CTA [BUILT]
- **Verification nudge card** (if not fully verified): trust level, link to verification [BUILT]
- **Quick stats** (3-col grid): Active listings, Draft listings, Total views [BUILT]
- **Filter tabs** (horizontal, scroll-x mobile): All, Active, Drafts, Paused, Filled/Expired [BUILT]
- **Job listing cards** (1-col mobile, 2-col md+): title, farm name, status badge, applicant count link, actions (Pause/Resume, Edit, Archive) [BUILT]
- **Draft listings section** [BUILT]
- **Empty state:** "No jobs yet" + "Post your first job" CTA [BUILT]
- **MarkFilledModal** on filled action [BUILT]
- **Archive confirmation dialog** [BUILT]

**Status:** [BUILT] — well-implemented, not detailed in SPEC

---

## 11. APPLICANT DASHBOARD (`/dashboard/employer/jobs/:id/applicants`)

**SPEC layout:** Two-column: 260px fixed sidebar + 1fr main

### Sidebar (260px, sticky) [GAP — entire sidebar]
- **Farm header panel** (soil bg): farm logo, name, region, herd info, verified badge
- **Navigation:** Applications (active), Candidate Search, My Listings, Analytics, Settings
- **Active listing selector** (dropdown to switch between jobs)
- **Quick stats:** Applications received, Shortlisted, Days active
- **Profile completeness nudge**

### Main Content

**Page header:**
- "Applications" / "[Job Title]" (Fraunces 20px) [BUILT]
- Sub: "[N] applicants · Posted X days ago · Y days remaining" [BUILT partial]
- Actions: "Listing settings" + "Extend listing" [GAP]

**Toolbar:** [GAP]
- Search input
- Filter chips: All / New / Reviewed / Shortlisted / Declined (with counts)
- Sort select: Best match / Newest / Name A-Z
- View toggle: list / grid

**Candidate cards (ranked by match score):** [BUILT as accordion panels]
- Avatar circle + name (Fraunces 14px) + tagline (experience/shed/region/qual)
- Match circle (50px) [BUILT]
- Status badge [BUILT]
- Tag chips [BUILT]
- Quick actions: View profile / Shortlist / Decline / Message [BUILT as status transitions]
- **AI insight snippet** (purple, 1 line) [GAP]

**Expandable panels (4 tabs):** [DEVIATION: currently single accordion]
- **CV tab:** Parsed profile fields [GAP — currently shows profile inline]
- **Match tab:** Score breakdown bars [BUILT in accordion]
- **Interview tab:** Calendar + time slots [GAP]
- **Notes tab:** Free text + stage mover [GAP]

**AI summary box** per candidate (purple): key strengths, potential concerns [GAP]

**Shortlist action** → PlacementFeeModal [BUILT]
**Hire action** → HireConfirmModal [BUILT]

**Bulk actions bar:** "Shortlist selected", "Send message", "Export" [GAP]

---

## 12. EMPLOYER VERIFICATION HUB (`/dashboard/employer/verification`)

**Layout:** DashboardLayout

**5-tier trust ladder display:** [DEVIATION: currently card grid]
- Each tier shows method, status, action
- Tier 1: Email verified — auto (green checkmark) [BUILT]
- Tier 2: Phone SMS OTP — phone input + "Send code →" [BUILT]
- Tier 3: NZBN — 13-digit input, cross-referenced [BUILT]
- Tier 4: Document upload — drag-drop zone (dashed border, mist bg), file preview + remove [BUILT on separate page]
- Tier 5: Farm photo — optional upload (max 5MB) [BUILT on separate page]
- Purple info box: verification status + unlocked benefits per tier [BUILT as trust level box]
- "Skip for now" option [BUILT]
- Higher tiers unlock: listing visibility, "Verified Employer" badge, trust signals [BUILT as trust level summary]

---

## 13. DOCUMENT UPLOAD (`/dashboard/employer/verification/documents`)

- Back link to verification hub [BUILT]
- "Upload Verification Documents" header [BUILT]
- **FileDropzone:** Dashed border, mist bg, drag-drop or click. Accept: JPG, PNG, PDF. Max 10MB [BUILT]
- Uploaded file display with View link + remove option [BUILT]
- Help text: acceptable documents (lease, title, incorporation cert) [BUILT]

**Status:** [BUILT]

---

## 14. FARM PHOTO UPLOAD (`/dashboard/employer/verification/photos`)

- Back link to verification hub [BUILT]
- "Upload Farm Photos" header [BUILT]
- **FileDropzone:** Drag-drop, accept JPG/PNG/WEBP, max 10MB [BUILT]
- Photo grid (2-col mobile, 3-col tablet+) [BUILT]
- Help text with suggestions [BUILT]

**Status:** [BUILT]

---

## 15. MODALS

### PlacementFeeModal [BUILT]
- Lock icon + "Shortlist Candidate" + close X
- Candidate name, fee tier badge (hay), fee amount (Fraunces 16px)
- "Shortlisting is free... placement fee applies if you hire"
- Blurred contact preview (phone/email obfuscated)
- "Keep current stage" (outline) | "I understand — release contact details" (primary)

### HireConfirmModal [BUILT]
- CheckCircle + "Confirm Hire" + close X
- Candidate confirmation, invoice warning box (hay-lt bg, hay border, "Payment due within 14 days")
- Optional 5-star rating
- "Go back" (outline) | "Confirm Hire" (primary)

### MarkFilledModal [BUILT]
- CheckCircle + "Mark as Filled" + close X
- "Cannot be undone" warning
- "Who did you hire?" — "Hired externally" radio + applicant list (scrollable max-h-48)
- Hire date input (optional)
- "Cancel" (outline) | "Confirm Filled" (primary)

---

## 16. SEEKER ONBOARDING (`/onboarding/seeker`) — 8 Steps (SPEC) / 7 Steps (Built)

**Progress:** 3px gradient bar + step dots

### Step 1 — Account Creation [DEVIATION: currently farm type selection]
**SPEC layout:** Two-column
- **Left (soil bg):** Green/hay radial gradients, value prop list with icon squares (AI matching, accommodation matching, one-tap apply, job alerts), seeker testimonial
- **Right (cream bg):** Email/password form + password strength indicator
- **Note:** If auth stays separate (current pattern), this step = farm type selection

### Step 2 — Farm Type Preference [BUILT as step 1]
- Chip selector: Dairy Cattle, Sheep & Beef, **Cropping, Deer, Mixed, Other** [DEVIATION: currently 2 only]
- Years of experience select (No experience through 5+ seasons) [BUILT as number input in step 2]
- Current/most recent role input [GAP]
- **Shed types worked** — chip grid (multi-select) [BUILT in step 2]
- **Herd/mob size experience** — chip grid [BUILT in step 2]

### Step 3 — Qualifications [DEVIATION: currently DairyNZ level only]
- **DairyNZ/B+LNZ level chip grid** (No formal qual, Level 2-5+) [BUILT]
- **Document upload zone** (dashed border, mist bg) for certificates, CV, references (JPG/PNG/PDF, max 10MB) [GAP]
- **NZ driver's licence chips** [GAP]
- **Other certifications chips:** ATV, tractor, 4WD, first aid, vet/treatment [GAP]

### Step 4 — Skills [BUILT]
- SkillsPicker: chip-based skill selector from master table
- Proficiency per skill: Confident / Learning / Entry level
- `willing_to_learn` toggle per skill

### Step 5 — Life Situation [DEVIATION: missing fields]
- **Housing required toggle** → reveals sub-options: [BUILT as accommodation toggle]
  - Situation chip grid: Single, Couple partner working, Couple partner not working, Family with children, Working dogs, Pets [DEVIATION: currently basic couples/pets/children toggles]
- **Preferred regions chip grid** (multi-select, 8 NZ regions) [DEVIATION: currently single select]
- **Minimum salary input** [GAP]
- **Availability date** [GAP]
- **Notice period** [GAP]

### Step 6 — Visa / Right to Work [BUILT]
- NZ Citizen / NZ Resident / Open Work Visa / Student Visa / Looking for sponsorship
- Info box explaining data use

### Step 7 — Completion [DEVIATION: currently minimal redirect]
- "Your profile is live!" success screen
- **Summary checklist** [GAP]
- **Match pool preview:** "[N] roles on TopFarms that could suit you" [GAP]
- **Top 3 matched jobs preview** with scores [GAP]
- CTAs: "Browse matched jobs →" (moss), "Complete my profile" (hay) [GAP]

### Step 8 — Profile Management Shell [GAP — entire step]
- **Sidebar nav:** Overview / Experience & Skills / Documents / CV Builder
- **Profile completeness bar** with field-level completion map
- Editable sections for all profile data

---

## 17. SEEKER DASHBOARD (`/dashboard/seeker`)

**Layout:** DashboardLayout

**Onboarding incomplete:** Progress card (X of 7/8 steps) + "Continue Setup" CTA [BUILT]

**Onboarding complete:**
- Welcome message + region [BUILT]
- Profile summary card (grid): experience, DairyNZ level, region, visa [BUILT]
- Profile strength % with progress bar [BUILT]
- Quick stats (3-col): active applications, profile views, profile strength [BUILT]
- Recent applications (last 3) with match score + status [BUILT]
- Empty state: "No applications yet" + "Browse jobs" [BUILT]

**Status:** [BUILT] — not in SPEC but well-implemented

---

## 18. JOB SEARCH (`/jobs`)

**Layout:** Two-column: 280px sticky filter sidebar + 1fr scrollable main

### Navigation (authenticated worker) [DEVIATION: currently uses DashboardLayout]
- soil bg, 58px
- Center links: "Find Work" (active, white bg pill), "My Applications", "My Profile", "CV Builder"
- Right: bell icon with notification dot + avatar circle

### Search Hero (above results) [GAP — entire section]
- Linear gradient soil→dark green, radial green glow
- Eyebrow: "[N] roles · NZ Agriculture" (10px, meadow)
- Title: "Find your next *farm role*" (Fraunces 22px, hay italic)
- Search bar: text input (magnifier icon) + region select dropdown + "Search" button (hay bg)
- Quick-filter pills below: Dairy only (active = hay bg), House included, Couples welcome, New this week, Top match >=80%, Pets OK

### Filter Sidebar (280px, white bg, right border 1.5px fog, sticky top 58px, scrollable)
Header: "Filters" (Fraunces 15px) + "Clear all" link [BUILT]
All groups collapsible with triangle toggle [BUILT]
Each checkbox: 15px box, 1.5px fog border, 3px radius; checked = moss bg + white checkmark [BUILT]
Toggle switches: 34x18px pill [BUILT]

**Filters:**
| Filter | SPEC Options | Status |
|--------|-------------|--------|
| Farm Type | Dairy, Sheep & Beef, Deer, Cropping, Mixed (with counts) | [GAP] |
| **Role Type** | Farm Asst/Trainee, Relief Milker, Herd Mgr, 2IC, Farm Mgr, Contract Milker, Equity Farmer, General Farmhand (with counts) | [GAP] |
| Region | 8 NZ regions (with counts) | [BUILT: first 6 + show more] |
| Salary NZD/year | Dual-handle range $35k-$120k+ | [BUILT: $30k-$120k] |
| Shed Type | Rotary, Herringbone, AMS/Robot, Swing-Over (with counts) | [BUILT] |
| Herd/Mob Size | Under 300, 300-600, 600-1k, 1k+ (with counts) | [BUILT] |
| Accommodation | House provided, Cottage/flat, Pet-friendly, Couples welcome, Family-friendly (with counts) | [DEVIATION: single toggle] |
| Contract Type | Permanent, Casual/Relief, Fixed Term Seasonal, Sharemilking 50/50 (with counts) | [DEVIATION: 3 checkboxes] |
| Visa/Eligibility | NZ Citizens & Residents, Open Work Visa, Employer can sponsor (with counts) | [DEVIATION: single toggle] |
| **Extras (toggles)** | Mentorship/training, Vehicle/UTV, DairyNZ pathway, Posted in last 7 days | [GAP] |

Footer: full-width "Show [N] jobs" button (moss bg) [BUILT]
Mobile: slide-in drawer [BUILT]

### Results Area

**Active filter pills:** moss tint bg, moss border, × remove (turns red on hover) [GAP]

**Save search box:** blue-lt bg, blue border, bell icon, email alert prompt + "Save & get alerts" button [GAP]

**Results bar:**
- Left: "[N] roles match your search" (moss Fraunces count) [BUILT partial]
- Right: sort select (Best match / Newest / **Salary high-low** / **Location nearest**) [DEVIATION: only 2 options] + view toggle (list/grid) [GAP]

### Job Cards [BUILT]
- Default: white bg, 1.5px fog border, 12px radius
- `.featured`: hay border (2px), hay-lt gradient bg [BUILT]
- `.new-post`: 3px left border moss accent [BUILT]
- Anatomy: Icon square (44x44px, moss bg, emoji) + title (Fraunces 16px 700) + farm line (12px, verified dot) + tag chips + description (12px, 2-line clamp) + footer (salary, location, posted, app count) + match circle (50px) [BUILT]

**Expandable card tabs:** Details (2-col detail cards) / My Match (bar chart breakdown + AI insight) / Apply (one-click) [GAP]

**Pagination:** Numbered page buttons (34x34px, fog border, active = moss bg) [DEVIATION: currently "load more"]

### Visitor State
- Match scores blurred/hidden [BUILT]
- Sticky bottom CTA: "Sign up to see match score and apply" [BUILT]

---

## 19. JOB DETAIL (`/jobs/:id`)

**Layout:** Fixed nav (56px) + breadcrumb bar (44px) + two-column (max-width 1200px, 1fr 320px)

### Breadcrumb Bar [GAP]
- 44px height, white bg, fog bottom border
- Left: "Jobs › Dairy › Waikato › [Job Title] — [Farm Name]" (11px, light)
- Right: "Save" + "Share link" buttons (fog border, mid text; saved state = moss)

### Main Column

**Job header card:**
- Optional featured banner (hay gradient, "Featured listing — appears at top of searches") [BUILT as tier badge]
- Soil hero with green+hay radial gradients: farm logo (56x56px), farm name (11px, meadow) + "Verified" badge, H1 job title (Fraunces 28px 700, cream), meta row (location, contract, start date, days remaining in hay) [BUILT with deviations — title in soil not cream]
- Tag strip below hero [BUILT]
- **Stats strip** (4-col grid): Applications, Views, Salary (moss), Posted [GAP]

**Role overview:** White card, fog border, 14px radius. Section titles with emoji icons (Fraunces 17px). Prose (13px, 1.7 line-height) [BUILT]

**Day-to-day:** Bulleted list with 6px meadow dot bullets [DEVIATION: currently plain text]

**Skills & requirements:** Legend row: Required (moss badge) / Preferred (blue badge) / Bonus (grey badge). 2-column grid of skill items. Required variant: green-tinted border + bg [DEVIATION: currently 1-col with inline badges]

**Compensation & conditions:** Two columns — salary (Fraunces 22px) with checklist items (meadow checkmarks) | hours & roster details [DEVIATION: currently simplified]

**Accommodation card:** Mist bg, fog border. Icon + title + description + tag chips (power, water, broadband, couples, pets, garden) [BUILT]

**Location:** 160px map placeholder (mist bg). Distance badge: "8 km to [Town] · 35 km to [City]" [GAP]

**About the farm:** Narrative + tag chips (shed type, calving, team size) [BUILT]

**Application timeline:** Vertical timeline (meadow dots + connecting lines): Applications Close → Review → Interview invitations → Offer → Start date [GAP]

### Sidebar — Logged-in Seeker (sticky, top 76px) [BUILT with gaps]

- **Match header:** Soil bg, radial green glow. 72px match circle (Fraunces 24px 900, cream, "MATCH" label) [BUILT]
- Salary row (Fraunces 22px) [GAP]
- 5 match breakdown bar rows (100px label + progress bar + score) [BUILT]
- AI insight box (purple-lt, purple border) [BUILT]
- **Quick facts list** (icons + labels) [GAP]
- **CTA stack:**
  - "Apply now" (moss, shadow) [BUILT]
  - "Save for later" (ghost) [GAP]
  - "Share" (ghost) [GAP]
  - "Message farm" (hay-lt, hay border — links to Growth Phase messaging) [GAP — Growth Phase]
- **Deadline notice** (hay-lt, hay border) [GAP]
- "Report this listing" link [GAP]

### Sidebar — Visitor [BUILT]
- Login nudge card (mist bg): icon + "See your match score" + sign-in CTA
- Match teaser: blurred breakdown with placeholder score (78%)
- "Sign in" (moss) + "Create a free profile" (ghost)

### Farm Profile Card (sidebar) [GAP]
- Soil header: farm logo, name, sub
- Body: 3-stat grid (cows, hectares, breed) + tags + rating row
- "View full farm profile →" link

### Similar Jobs Card [GAP]
- 3 entries: title, meta, salary, match badge

### Responsive
- <860px: single column (sidebar below), skills/two-col sections→single [BUILT]

---

## 20. MY APPLICATIONS (`/dashboard/seeker/applications`)

**SPEC Layout:** Fixed nav (56px) + two-column (260px sticky sidebar + 1fr main)

### Sidebar (260px, sticky) [GAP]
- **Application status summary:** total, under review, shortlisted, interviews, offers
- **Filter tabs:** All / Active / Shortlisted / Closed
- **Saved jobs section**
- **Profile strength nudge** with progress bar

### Main Content

**Page header:** "My Applications" (Fraunces 22px) + "[N] active applications" [BUILT]

**Application cards (stacked list):**
- Farm logo icon + job title (Fraunces 15px 700) + application date [BUILT]
- Farm name + location (12px mid) [BUILT]
- **Status pipeline** (horizontal stage track): Applied → Under Review → Shortlisted → Interview → Offer. Done = moss tint, active = solid moss + white text, upcoming = fog [BUILT]
- Match score circle [BUILT]
- **Farm response indicator:** "Viewed by employer X hours ago" or "Not yet viewed" [GAP]
- Tag chips + action buttons ("View listing" link, "Withdraw application" ghost) [BUILT]

### Status Card Variants [GAP — all variant banners]
- **Under review:** Review stage active on track [BUILT]
- **Shortlisted:** "You've been shortlisted!" hay-lt banner, "Check your messages" CTA [GAP]
- **Interview invited:** "Interview request" green banner, Accept/Decline/Suggest time buttons [GAP]
- **Declined:** Card dims to 60% opacity, stage track greys out, red-lt message [GAP]
- **Offer made:** "Offer made!" green banner, prominent hay CTA [GAP]

**Empty state:** "No applications yet" + "Browse jobs" link [BUILT]
**Loading:** Skeleton cards [BUILT]

---

## Gap Count Summary

| Area | Total Items | Built | Gaps | Deviations |
|------|------------|-------|------|------------|
| Auth (5 screens) | 5 | 5 | 0 | 0 |
| Landing Page | 11 sections | 6 | 5 sections | 3 |
| Employer Onboarding | 8 steps | 8 (partial) | ~20 fields/features | 8 |
| Post Job | 7-8 steps | 8 (partial) | ~18 fields/features + sidebar | 6 |
| Employer Dashboard | 1 | 1 | 0 | 0 |
| Applicant Dashboard | 1 | 1 (partial) | sidebar, toolbar, AI, bulk, tabs | 1 |
| Verification | 3 | 3 | 0 | 1 |
| Modals | 3 | 3 | 0 | 0 |
| Seeker Onboarding | 8 steps | 7 (partial) | step 8, ~10 fields | 5 |
| Seeker Dashboard | 1 | 1 | 0 | 0 |
| Job Search | 1 | 1 (partial) | hero, 4 filters, tabs, pagination | 4 |
| Job Detail | 1 | 1 (partial) | breadcrumb, 5 sections, sidebar items | 3 |
| My Applications | 1 | 1 (partial) | sidebar, 4 status variants | 1 |

**Total gaps to close:** ~70+ individual items across 20 screens
**Largest gaps:** Employer onboarding, post job wizard, applicant dashboard, job search, landing page

---

*Generated 2026-03-17 from SPEC.md v3.0 + codebase audit*
