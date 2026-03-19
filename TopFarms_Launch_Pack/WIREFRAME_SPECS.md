# TopFarms Wireframe Specifications (As-Built)

**Purpose:** Screen-by-screen specs for creating wireframes that reflect the actual v1.0 MVP implementation.
**Date:** 2026-03-17
**Source:** Codebase audit against SPEC.md v3.0

> Items marked **[v1.1 GAP]** are SPEC features not yet built. Track as backlog — do not wireframe.

---

## Design System Reference

All wireframes use this system consistently:

- **Fonts:** Fraunces (headings, display numbers) + DM Sans (body, labels, buttons)
- **Palette:** soil `#2C1A0E`, soil-deep `#1E1108`, moss `#2D5016`, fern `#4A7C2F`, meadow `#7AAF3F`, hay `#D4A843`, cream `#F7F2E8`, fog `#EEE8DC`, mist `#F2EEE6`, ink `#1A1208`, mid `#6B5D4A`, light `#9E8E78`
- **Cards:** White bg, 1.5px fog border, 12px radius, 20px padding
- **Buttons:** btn-primary (moss bg, white text), btn-outline (white bg, moss border), btn-ghost (fog border, mid text), btn-hay (hay bg, soil text)
- **Match circles:** >=80% moss, 60-79% orange, <60% red. Fraunces 700 weight. Sizes: 38px (card), 50px (search), 72px (detail)
- **Nav:** soil bg, 56px height, sticky top, logo left, links center, auth right

---

## 1. AUTH LAYOUT (Shared Template)

**Used by:** Login, SignUp, ForgotPassword, ResetPassword, VerifyEmail

**Desktop (md+):**
- Two-column split: left 50-60% / right 40-50%
- **Left panel:** soil bg with gradient overlay (soil-deep → soil → moss at 135deg), dot pattern texture (48px grid, 1px circles, 10% opacity). Content: TopFarms logo (Fraunces 24px, hay), headline (4-5xl, Fraunces, cream), description (lg, hay), 3-column stats footer (meadow/hay numbers)
- **Right panel:** cream bg, centered content, max-w-md container

**Mobile:**
- Left panel hidden
- Right panel full width, centered TopFarms logo above form (Fraunces 24px, soil)
- Padding: px-6 py-12

---

## 2. LOGIN (`/login`)

**Layout:** AuthLayout (see above)

**Right panel content:**
- Title: "Welcome back" (Fraunces)
- Subtitle: "Log in to your TopFarms account"
- **Email input:** label "Email address", fog border, white bg
- **Password input:** label with "Forgot password?" link right-aligned, fog border, Eye/EyeOff toggle icon (right-3 absolute)
- **Submit button:** "Log in", soil bg, cream text, full width, disabled opacity-60 when submitting
- **Footer link:** "Don't have an account? Sign up" (soil, underline)

**Error states:** Red text below each input. Toast notification on auth failure.

**[v1.1 GAP]:** None — fully compliant.

---

## 3. SIGN UP (`/signup`)

**Layout:** AuthLayout

**Right panel content:**
- Title: "Create your account"
- Subtitle: "Join TopFarms — New Zealand's agricultural job marketplace"

**Stage 1 — Role selection (shown first):**
- 2-column grid, gap-3
- **Employer card:** Building2 icon, "Employer", "Post farm jobs". Unselected: white bg, fog border. Selected: hay-lt bg, soil border, soil icon
- **Seeker card:** User icon, "Seeker", "Find farm work". Same states.
- URL param `?role=employer|seeker` pre-selects

**Stage 2 — Form (appears after role selected):**
- **Email input:** standard
- **Password input:** with Eye toggle
- **Password strength bar:** 3px height, fog bg. Fill color: red (weak) → orange (fair) → hay (good) → moss (strong). Label text beside bar. Only visible when password non-empty.
- **Terms checkbox:** "I agree to Terms of Service and Privacy Policy" (links underlined, soil color)
- **Submit button:** "Create account", soil bg, full width

**Error states:** Field-level red text. Zod: email format, password min 8 chars, terms required, role required.

**[v1.1 GAP]:** None.

---

## 4. FORGOT PASSWORD (`/forgot-password`)

**Layout:** AuthLayout

**Form state:**
- Title: "Forgot your password?"
- Subtitle: "Enter your email and we'll send a reset link"
- **Email input:** standard
- **Submit button:** "Send reset link", soil bg, full width
- **Back link:** ArrowLeft icon + "Back to login" (soil, underline, centered)

**Success state (replaces form):**
- Mail icon in circular hay-lt bg (32px icon, 64px container), centered
- "We've sent a password reset link to **[email]**"
- "The link expires after 1 hour. Check your spam folder if you don't see it."
- "Back to login" link

**[v1.1 GAP]:** None.

---

## 5. RESET PASSWORD (`/auth/reset`)

**Layout:** AuthLayout

**Loading state:** Spinner (moss, animate-spin) + "Verifying your reset link..."

**Expired state:**
- AlertCircle icon in red-lt bg circle
- "Link expired" title
- "This password reset link is invalid or has expired. Reset links are valid for 1 hour."
- Button: "Request a new reset link" → `/forgot-password`

**Form state (valid link):**
- Title: "Set new password"
- Subtitle: "Choose a strong password for your account"
- **New password input:** with Eye toggle
- **Confirm password input:** with separate Eye toggle
- **Submit button:** "Update password", soil bg, full width

**Validation:** Min 8 chars, passwords must match (error on confirm field).

**[v1.1 GAP]:** None.

---

## 6. VERIFY EMAIL (`/auth/verify`)

**Layout:** AuthLayout

**Processing state:** Loader2 spinner (moss, 40px) + "Please wait while we verify your email address and set up your account."

**Awaiting state:**
- Mail icon in hay-lt bg circle, centered
- Title: "Check your inbox"
- Subtitle: "We've sent you a verification link"
- "Click the link in that email to activate your account."
- "The link expires after 24 hours. Check your spam folder if you don't see it."
- **Resend button:** RefreshCw icon + "Resend verification email" (fog border, soil text, white bg). Icon spins when active.

**[v1.1 GAP]:** None.

---

## 7. LANDING PAGE (`/`)

**Sections as built (top to bottom):**

### 7a. Hero
- Full-bleed soil-deep bg with CSS gradient topographic pattern + radial gradient blobs (green at 90%/10%, hay at 5%/90%)
- **Headline:** "Where New Zealand's Best Farms Find Their Next Team" — Fraunces bold, cream. "*Best Farms*" in hay italic
- **Dual CTA fork card:** Single bordered card (1.5px rgba white 12%, 16px radius). Left: "Farm Workers" label + "Find Farm Work" button (meadow solid). Right: "Farm Employers" label + "Post a Job" button (hay tint border)
- **Floating cards (desktop lg+ only):** 3 glassy/translucent cards with backdrop blur — sample job card (94% match), candidate profile snippet (skill bars), match notification
- **Scroll hint:** Bottom center, "Explore" text + 1px line + bounce-animated chevron (cream 30% opacity)

**[v1.1 GAP]:** Staggered fadeUp headline animation. SPEC headline copy "The right farm / worker. *Found* / faster."

### 7b. Live Counters
- soil bg, centered
- 3 counters from Supabase RPC (get_platform_stats): "Jobs Posted", "Workers Registered", "Matches Made"
- Count-up animation (1800ms) triggered by scroll-reveal (useInView, 0.2 threshold)
- Desktop: 3 columns with vertical dividers. Mobile: 3 rows with horizontal dividers

**[v1.1 GAP]:** Animated pulsing "Live" green dot badge.

### 7c. How It Works
- cream bg
- Tab toggle: "Farm Workers" / "Farm Employers" (useState)
- 4-step card grid per tab with emoji icons, step numbers (faded bg text 00-03), descriptions
- Desktop: 4 columns with dashed connector lines. Mobile: 1 column, no connectors

### 7d. Testimonials
- soil bg
- 3 testimonial cards: 5-star rating (hay), quote, author avatar, farm name, "Verified" badge
- Desktop: 3 columns. Mobile: 1 column

**[v1.1 GAP]:** 4 connected stat blocks alongside testimonials.

### 7e. Featured Listings
- 3 job cards from Supabase (featured/premium tier priority)
- Card: job title (Fraunces 16px 700), farm name, region tag, contract type tag, salary, tier badge
- Empty state fallback CTA if no jobs
- Desktop: 3 columns. Mobile: 1 column

**[v1.1 GAP]:** Match score circles on cards.

### 7f. Footer
- soil-deep bg
- 4-column grid: Brand (logo + description), Platform (Browse Jobs, Post a Job, Sign Up, Log In), Support (Contact, Help Center, About), Legal (Privacy Policy, Terms of Service)
- Bottom bar: copyright + border divider (rgba white 7%)
- Desktop: 4 columns. Mobile: 1 column → 2 column tablet

**[v1.1 GAP]:** Missing sections not built: AI matching features section, farm types strip, employer CTA band, trusted-by strip, final CTA section.

---

## 8. EMPLOYER ONBOARDING (`/onboarding/employer`) — 8 Steps

**Progress indicator:** StepIndicator component — progress bar + numbered dots

### Step 1: Farm Type
- Centered card grid (2 options): Dairy Cattle, Sheep & Beef
- Cards with emoji icons, checkmark when selected (moss border + rgba moss bg)
- [v1.1 GAP]: SPEC had 6 farm types in 2x3 grid + 4 ownership cards

### Step 2: Farm Details
- Form fields: Farm name (text input), Region (select, 8 NZ regions), Herd size (number input), Shed type (checkboxes: Rotary, Herringbone, Other), Milking frequency (select), Breed (select), Property size (number, hectares), Ownership type (dropdown)
- [v1.1 GAP]: Missing calving system, nearest town, distance-from-town with >30km warning. Shed types reduced (missing AMS, Swing-Over, Tiestall)

### Step 3: Team Culture
- Team size (select)
- Culture description (textarea, 2000 char counter)
- About farm (textarea, 2000 char counter)
- [v1.1 GAP]: Career development chip grid, hiring frequency select, couples toggle. SPEC had 175/400 char limits

### Step 4: Accommodation
- Accommodation toggle ON → reveals:
  - Type select (house options)
  - Detail checkboxes (4): Pets, Couples, Family, Utilities
- [v1.1 GAP]: Full 8+ extras chip grid (working dogs, close to school, broadband, garden, garage). Vehicle toggle, broadband toggle, salary range min/max inputs, additional compensation chips

### Step 5: Verification
- 5 verification cards:
  - Email: auto-verified on signup (green checkmark)
  - Phone: inline PhoneVerification component (SMS OTP)
  - NZBN: inline NzbnVerification component
  - Documents: "Start now" → links to `/dashboard/employer/verification/documents`
  - Farm photos: "Start now" → links to `/dashboard/employer/verification/photos`
- Status badges: Verified (green), Pending Review (amber), Not started (grey)
- Trust level explanation box (Basic/Verified/Fully Verified)
- "Skip for now" option
- [v1.1 GAP]: SPEC showed tier ladder visual, not card grid

### Step 6: Pricing
- 3 TierCard components: Standard ($100), Featured ($150), Premium ($200)
- "First listing free" note
- [v1.1 GAP]: Annual/monthly toggle with "Save 20%". SPEC had different tier names (Pay-per-listing, Seasonal, Enterprise)

### Step 7: Preview
- Minimal implementation — review before completion
- [v1.1 GAP]: SPEC had two-col success card + setup checklist + 3 CTAs + AI tip + public profile preview

### Step 8: Completion
- Simple success page with navigation to dashboard
- [v1.1 GAP]: Structured CTAs (Post job moss, Browse candidates hay, View profile ghost)

---

## 9. POST JOB WIZARD (`/jobs/new`) — 8 Steps

**Progress indicator:** StepIndicator + step dots

### Step 1: Basics
- Title input (with hint text about specificity)
- Sector radio cards (2: Dairy, Sheep & Beef)
- Role type select (Farm Assistant, Herd Manager, 2IC, Relief Milker, etc.)
- Contract type select (Permanent, Contract, Casual)
- Start date input
- Region select
- [v1.1 GAP]: Two-col layout (soil left panel with stats). SPEC was single cream form

### Step 2: Farm Details
- Shed type checkboxes (Rotary, Herringbone, Other)
- Herd size min/max inputs
- Visa sponsorship toggle
- Couples welcome toggle
- Accommodation toggle → nested fields (type, extras)
- [v1.1 GAP]: 5 shed type chips (missing AMS, Swing-Over, Tiestall). Missing breed, milking freq, calving, farm area, region/town/distance with warning. Accommodation should be step 4 per SPEC

### Step 3: Skills
- SkillsPicker component in "requirementMode"
- Per-skill: Required / Preferred / Bonus / Not-needed buttons
- Required = moss, Preferred = hay, Bonus = mist, Not-needed = red-lt
- [v1.1 GAP]: Min dairy experience select, seniority level, qualifications section, visa chip grid

### Step 4: Compensation
- Salary min/max inputs (NZD annual)
- Benefits checkboxes (7 predefined + "Other" text input)
- [v1.1 GAP]: Market rate comparison hint. Pay frequency, on-call allowance, hours range, weekend roster

### Step 5: Description
- 4 textareas with char counters:
  - Role overview (5000 max)
  - Day-to-day responsibilities (3000 max)
  - What we offer (3000 max)
  - Ideal candidate (3000 max)
- Counter turns orange near limit

### Step 6: Preview
- Full review of all job data by section
- "Edit" links per section to jump back
- CTA: "Looks good — choose a listing plan"
- [v1.1 GAP]: SPEC had this as payment step, not preview. Live preview sidebar (320px, sticky) on steps 2-5 not implemented

### Step 7: Payment
- Tier selection card grid: Standard ($100), Featured ($150, popular badge), Premium ($200)
- Stripe PaymentElement integration
- First listing free bypass (no payment form)

### Step 8: Success
- Centered card (max-width ~560px)
- Success message with job link
- Action buttons to view listing / manage applications
- [v1.1 GAP]: Stats grid (avg days to first applicant, seekers in match pool, actively looking)

---

## 10. EMPLOYER DASHBOARD (`/dashboard/employer`)

**Layout:** Full width with DashboardLayout wrapper (nav + sidebar)

**Content (top to bottom):**
- **Onboarding progress card** (if incomplete): progress bar, "Continue Setup" CTA
- **Verification nudge card** (if not fully verified): trust level indicator, link to verification
- **Quick stats** (3-col grid): Active listings, Draft listings, Total views
- **Filter tabs** (horizontal, scrollable mobile): All, Active, Drafts, Paused, Filled/Expired
- **Job listing cards** (grid: 1-col mobile, 2-col md+): Each shows title, farm name, status badge, applicant count link, actions (Pause/Resume, Edit, Archive)
- **Draft listings section** (separate)
- **Empty state:** "No jobs yet" + "Post your first job" CTA

**Modals:**
- Archive confirmation dialog
- MarkFilledModal (see section 15)

---

## 11. APPLICANT DASHBOARD (`/dashboard/employer/jobs/:id/applicants`)

**Layout:** DashboardLayout wrapper

**Header:**
- Back link to employer dashboard
- Job title (Fraunces)
- Applicant count + posted date

**Applicant list (ranked by match score):**
- Accordion-style expandable panels
- Each applicant panel shows:
  - Match circle (50px, color-coded)
  - Name / profile summary
  - Status badge (applied, review, shortlisted, offered, hired, declined, withdrawn)
  - Cover note (if provided)
  - Tag chips (skills, experience)
  - Status transition buttons (advance/decline)
  - Contact section: masked (blurred) until placement fee acknowledged → revealed with phone/email

**Shortlist action:** Triggers PlacementFeeModal before contact release
**Hire action:** Triggers HireConfirmModal

**[v1.1 GAP]:** Sidebar nav (Applications, Candidate Search, Listings, Analytics, Settings). Search input + filter chips toolbar. AI summary box per candidate (purple). Bulk actions bar (Shortlist selected, Send message, Export). Expandable 4-tab panels (CV, Match, Interview, Notes). View toggle (list/grid)

---

## 12. EMPLOYER VERIFICATION HUB (`/dashboard/employer/verification`)

**Layout:** DashboardLayout wrapper

**Content:**
- Page header with trust level explanation
- **Verification grid** (1-col mobile, 2-col md+): 5 cards
  1. **Email:** Green checkmark, "Verified when you created your account"
  2. **Phone:** Inline PhoneVerification — phone number input + "Send code" + OTP entry
  3. **NZBN:** Inline NzbnVerification — 13-digit input + submit
  4. **Documents:** Card with "Start now" → links to separate page
  5. **Farm Photos:** Card with "Start now" → links to separate page
- Status badges per card: Verified (green checkmark), Pending Review (amber), Not started (grey)
- Trust level summary box

---

## 13. DOCUMENT UPLOAD (`/dashboard/employer/verification/documents`)

**Layout:** DashboardLayout wrapper

- Back link to verification hub
- Page header: "Upload Verification Documents"
- **FileDropzone:** Dashed border, mist bg, drag-drop or click. Accept: JPG, PNG, PDF. Max 10MB
- Uploaded document display with View link
- Help text listing acceptable documents
- On upload: creates verification record

---

## 14. FARM PHOTO UPLOAD (`/dashboard/employer/verification/photos`)

**Layout:** DashboardLayout wrapper

- Back link to verification hub
- Page header: "Upload Farm Photos"
- **FileDropzone:** Dashed border, mist bg, drag-drop or click. Accept: JPG, PNG, WEBP. Max 10MB
- **Photo grid** (2-col mobile, 3-col tablet+): shows all uploaded photos from employer-photos bucket
- Help text with photo suggestions

---

## 15. MODALS (Combined Wireframe)

### PlacementFeeModal
- md max-width, border, shadow
- Header: Lock icon + "Shortlist Candidate" + close X
- Candidate name
- Fee tier badge (hay bg)
- Fee amount (Fraunces 16px)
- Explainer: "Shortlisting is free... placement fee applies if you hire"
- Blurred contact preview (phone/email obfuscated)
- Buttons: "Keep current stage" (outline) | "I understand — release contact details" (primary)

### HireConfirmModal
- md max-width
- Header: CheckCircle icon + "Confirm Hire" + close X
- Candidate confirmation text
- Invoice warning box (hay-lt bg, hay border): "Placement fee invoice... Payment due within 14 days"
- Optional 5-star rating (yellow/grey states)
- Buttons: "Go back" (outline) | "Confirm Hire" (primary)

### MarkFilledModal
- md max-width
- Header: CheckCircle icon + "Mark as Filled" + close X
- Warning: "Marking as filled... cannot be undone"
- "Who did you hire?" — radio options:
  - "Hired externally"
  - List of applicants (scrollable max-h-48, shows "Applicant #[ID]")
- Hire date input (optional)
- Buttons: "Cancel" (outline) | "Confirm Filled" (primary)

---

## 16. SEEKER ONBOARDING (`/onboarding/seeker`) — 7 Steps

**Progress indicator:** StepIndicator + numbered dots

### Step 1: Farm Type
- Chip selector: Dairy Cattle, Sheep & Beef (2 options, MVP scope)
- Multi-select with checkmark indicator
- [v1.1 GAP]: SPEC had 5 sectors (+ mixed, deer, cropping)

### Step 2: Experience
- Years of experience (number input)
- Shed types worked (checkbox grid: Rotary, Herringbone, AMS, Swing-Over)
- Herd/mob size experience (checkbox grid with bucket labels)

### Step 3: Qualifications
- DairyNZ level selector only (No formal qual, Level 2-5+)
- [v1.1 GAP]: Document upload zone for CV/certificates/references. NZ driver's licence chips. Other certifications (ATV, tractor, 4WD, first aid, vet/treatment)

### Step 4: Skills
- SkillsPicker component with proficiency per skill: Confident / Learning / Entry level
- `willing_to_learn` toggle per skill
- Skills from seeded master table (~40 dairy + sheep/beef)

### Step 5: Life Situation
- Couples seeking toggle + partner name field
- Accommodation needed toggle → sub-fields (pets, children, vehicle parking)
- Region preference select
- [v1.1 GAP]: Minimum salary input, availability date, notice period. Full housing type sub-options (Single, Couple working, Couple not working, Family with children, Working dogs, Pets)

### Step 6: Visa Status
- Select: NZ Citizen, NZ Resident, Open Work Visa, Student Visa, Looking for sponsorship
- Info box explaining data use

### Step 7: Completion
- Loading spinner + success message
- Auto-redirects to `/jobs`
- [v1.1 GAP]: Success screen with profile checklist, match pool preview (top 3 matched jobs with scores), structured CTAs. SPEC step 8 (profile management shell with sidebar nav) not built.

---

## 17. SEEKER DASHBOARD (`/dashboard/seeker`)

**Layout:** DashboardLayout wrapper

**Onboarding incomplete state:**
- Progress card with bar (X of 7 steps)
- "Continue Setup" CTA

**Onboarding complete state:**
- Welcome message + region
- **Profile summary card** (grid): experience years, DairyNZ level, region, visa status
- **Profile strength** % with progress bar
- **Quick stats** (3-col): active applications, profile views, profile strength
- **Recent applications** (last 3): job cards with match score + status
- Empty state: "No applications yet" + "Browse jobs" CTA

---

## 18. JOB SEARCH (`/jobs`)

**Layout:** Two-column: 280px filter sidebar (desktop) + 1fr results

### Filter Sidebar (desktop: sticky, right fog border)
- Header: "Filters" (Fraunces 15px) + "Clear all" link
- All groups collapsible (triangle toggle)
- **Region:** First 6 shown + "show more" toggle (8 NZ regions)
- **Salary:** Dual-handle range slider ($30k-$120k), 4px fog track, moss fill, 14px white-bordered thumbs
- **Shed Type:** Checkboxes (Rotary, Herringbone, AMS, Swing-Over). 15px box, fog border, moss bg + white checkmark when selected
- **Herd Size:** Checkboxes (<300, 300-600, 600-1k, 1k+)
- **Accommodation:** Toggle switch (34x18px pill)
- **Couples:** Toggle switch
- **Visa Sponsorship:** Toggle switch
- **Contract Type:** Checkboxes (Permanent, Contract, Casual)
- Footer: "Show [N] jobs" button (moss bg), full width

**Mobile:** Filter sidebar becomes bottom slide-in drawer (Radix Dialog)

### Results Area
- Results count + sort select (Match Score / Most Recent)
- **Job cards** (SearchJobCard):
  - Icon square (44x44px, colored bg, emoji)
  - Title (Fraunces 16px 700)
  - Farm name + verified dot (12px)
  - Tag chips (shed type, region, contract)
  - Description (12px, 2-line clamp)
  - Footer: salary, location, posted date
  - Match circle (50px, color-coded)
  - Featured variant: hay border 2px, hay-lt gradient bg
  - New post variant: 3px left border moss accent
- **Load more** button (replaces pagination)
- **Empty state:** "No jobs match your filters" + icon + adjust filters CTA
- **Loading:** Skeleton cards

**Visitor vs Seeker:**
- Seeker: match scores visible and colored, apply available
- Visitor: match scores blurred/hidden, sticky bottom CTA bar prompting signup

**[v1.1 GAP]:** Search hero section ("Find your next *farm role*" + search bar + quick-filter pills). Role type filter. Extras filters (mentorship, vehicle, DairyNZ, posted <7d). Active filter pills display. Expandable card tabs (Details/My Match/Apply). Numbered pagination. Accommodation sub-options as chip grid. Save search + email alerts box

---

## 19. JOB DETAIL (`/jobs/:id`)

**Layout:** Two-column (1fr + 280px sidebar), max-width 1200px centered. Single column below ~860px.

### Main Column

**Job header:**
- Tier badge (Featured/Premium) if applicable
- Farm name + verification badge
- Job title (Fraunces 3xl, soil)
- Meta row: location, contract type, start date, days remaining (hay)
- Tag strip

**Content sections (white cards, fog border, 14px radius):**
- **Role overview:** Prose (13px, 1.7 line-height)
- **Day-to-day:** Text block
- **Skills & requirements:** Category grouping with inline badges (Required moss / Preferred hay / Bonus grey)
- **Compensation:** Salary display + benefits list
- **Accommodation card:** Mist bg, fog border. Type + amenity tag chips
- **About the farm:** Culture description + details grid (shed type, herd size, etc.)

**[v1.1 GAP]:** Breadcrumb bar (44px, white bg). Save/Share buttons. Stats strip (4-col: Applications, Views, Salary, Posted). Day-to-day as bulleted list with meadow dots. Location map placeholder + distance badge. Application timeline (vertical, meadow dots + lines). Farm profile card in sidebar. Similar jobs card (3 entries)

### Sidebar — Logged-in Seeker (sticky top 20)
- **Match header:** 72px match circle (Fraunces 24px 900), color-coded
- **Match breakdown:** 5 bar rows (label + progress bar + score) for shed type, location, accommodation, skills, salary
- **AI insight box:** purple-lt bg, purple border, 2-3 sentence explanation
- **Apply Now button:** moss bg, full width (disabled if already applied, shows "Applied")

**[v1.1 GAP]:** Salary row (Fraunces 22px). Quick facts list. "Save for later" + "Share" buttons. Deadline notice (hay-lt). "Report this listing" link

### Sidebar — Visitor
- **Login nudge card:** mist bg, "See your match score" + sign-in CTA
- **Match teaser:** Blurred breakdown with placeholder score (78%)
- **Buttons:** "Sign in" (moss) + "Create a free profile" (ghost)
- **Sticky bottom CTA bar (mobile):** "Sign up to see how you match" + buttons

### Apply Modal
- Textarea for optional cover note (max 500 chars)
- Confirm button

---

## 20. MY APPLICATIONS (`/dashboard/seeker/applications`)

**Layout:** DashboardLayout wrapper, centered main content

**Header:** "My Applications" (Fraunces 22px) + badge count

**Sections:**
- **Active Applications**
- **Completed** (accepted, rejected, withdrawn)

**Application cards (stacked list):**
- Farm logo/icon + job title (Fraunces 15px 700)
- Application date
- Farm name + location (12px mid)
- **Status pipeline track:** Horizontal stages: Applied → Under Review → Shortlisted → Interview → Offer. Done = moss tint, active = solid moss + white text, upcoming = fog
- Match score circle
- Tag chips
- Action buttons: "View listing" link, "Withdraw application" (ghost)

**Empty state:** "No applications yet" + "Browse jobs" link
**Loading:** Skeleton cards

**[v1.1 GAP]:** Status variant banners (shortlisted hay banner, interview green banner with Accept/Decline, declined dims 60% + red message, offer green banner + hay CTA). Farm response indicator ("Viewed by employer X hours ago"). Sidebar with status summary, filter tabs, saved jobs, profile strength nudge

---

## V1.1 Gap Summary

### High Priority (Missing user-facing functionality)
1. **Job Search:** Search hero + quick-filter pills, role type filter, expandable card tabs
2. **Seeker Onboarding Step 3:** Document upload, licences, certifications
3. **Seeker Onboarding Step 5:** Salary, availability date, notice period
4. **Employer Onboarding:** Career dev chips, salary range, accommodation extras
5. **Post Job:** Live preview sidebar, missing farm detail fields (breed, calving, milking freq)
6. **Applicant Dashboard:** Filter toolbar, AI summaries, bulk actions
7. **My Applications:** Status variant banners, farm response indicator

### Medium Priority (Missing marketing/conversion sections)
8. **Landing Page:** AI matching section, employer CTA band, final CTA section
9. **Landing Page:** Farm types strip, trusted-by strip
10. **Landing Page:** 4 stat blocks in social proof
11. **Landing Page:** Live pulsing dot on counters

### Low Priority (Polish)
12. **Job Detail:** Breadcrumb bar, save/share, stats strip, similar jobs, map, timeline
13. **Seeker Onboarding Step 7:** Success screen with matched jobs preview
14. **Employer Onboarding Step 7-8:** Profile preview, structured CTAs
15. **Job Search:** Numbered pagination (vs load more)

---

*Generated 2026-03-17 from codebase audit*
