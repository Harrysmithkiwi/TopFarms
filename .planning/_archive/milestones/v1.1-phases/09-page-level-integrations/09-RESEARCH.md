# Phase 9: Page-Level Integrations - Research

**Researched:** 2026-03-22
**Domain:** React page integration, Supabase DB migrations, Edge Functions, URL-synced state
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Applicant dashboard sidebar**
- SPEC 260px sidebar replaces DashboardLayout shell sidebar on this page — no double sidebar
- DashboardLayout nav links move to a horizontal top bar / breadcrumb area above the applicant content
- Listing selector dropdown filters applicants in place via URL search param (`?job=xyz`) — no full page navigation
- Current applicant info (match score, key skills) stays visible by default — 4-tab expansion (CV, Match breakdown, Interview, Notes) adds deeper detail on click
- Bulk actions bar shows only working actions: "Shortlist selected" and "Export" — no disabled "Send message" button (messaging is v2)

**Job search card expansion**
- Accordion-style inline expansion: clicking a card expands it below the header, pushing other cards down
- Only one card expanded at a time — expanding a new card collapses the previous
- Tab bar inside expanded area: Details / My Match / Apply
- Details tab: Job description preview, key requirements, "View Full Listing →" link
- My Match tab: Simplified summary — overall score + top 3 strongest/weakest dimensions as colored bars (full 7-dimension breakdown on job detail page)
- Apply tab: Quick inline apply — optional cover note textarea + "Apply Now" button, no modal
- My Match tab only visible to logged-in seekers; Apply tab hidden if already applied

**Job search filters and pagination**
- New filter groups (Role Type with counts, Extras toggles) added at top of FilterSidebar, above existing filters — matches SPEC wireframe ordering
- Accommodation filter expanded to multi-option (house, cottage, pet-friendly, couples, family)
- Sort options expanded with salary high-low and location nearest
- Numbered pagination (Phase 7 Pagination component) replaces "Load More" button entirely
- Page number synced to URL param (`?page=2`) for shareability
- Active filter pills (moss tint bg, × remove) displayed above results list

**Job detail page**
- Breadcrumb bar (44px, fog border) with path and Save/Share buttons
- StatsStrip below header (4-col: Applications, Views, Salary, Posted)
- Application Timeline component (vertical, meadow dots + connecting lines)
- Location section with map placeholder (160px, mist bg) and distance badge
- Similar jobs card in sidebar (3 entries with title, meta, salary, match badge)
- Farm profile card in sidebar (soil header, 3-stat grid, tags, rating via StarRating, view link)
- Sidebar quick facts list, save/share buttons, deadline notice (hay-lt)

**My Applications status UX**
- StatusBanner renders at top of each ApplicationCard when status has changed (shortlisted, interview, offer, declined)
- Warm, encouraging copy per Phase 7 StatusBanner design
- Interview variant includes Accept/Decline action buttons inside the banner
- SPEC 260px sidebar replaces DashboardLayout shell sidebar — same pattern as applicant dashboard
- Sidebar includes: application status summary, filter tabs (All/Active/Shortlisted/Closed), saved jobs list, profile strength nudge

**Employer view tracking**
- Real tracking via `viewed_at` timestamp column on applications table
- Set when employer first opens the applicant panel (INSERT ON CONFLICT — lightweight)
- Seeker sees "Viewed by employer X hours ago" or "Not yet viewed" on their application cards

**Saved jobs**
- New `saved_jobs` table (user_id, job_id, created_at) with RLS
- Bookmark toggle on job search cards and job detail page
- Saved jobs list in My Applications sidebar
- Built in this phase since we're already touching all the relevant pages

**AI candidate summaries**
- Purple AI summary box per applicant in the applicant dashboard (ADSH-04)
- Generated on-demand when employer first expands an applicant's panel — not background or batch
- Content: 2-3 sentence fit assessment — strengths, gaps, and hiring recommendation specific to the job listing
- Loading state: purple box with animated skeleton lines + "Analyzing candidate fit..." text
- Result cached in a DB column — subsequent views are instant
- No regenerate button — summary generates once and stays cached

### Claude's Discretion
- Exact expanded card height and animation
- Tab content truncation rules for Details tab
- Active filter pill layout and overflow behavior
- Map placeholder design for job detail location section
- StatsStrip responsive breakpoints on job detail
- Sidebar card layouts and spacing
- AI summary prompt engineering and token limits
- Saved jobs table RLS policy details
- Profile strength nudge calculation logic

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SRCH-01 | Search hero section with gradient background, headline, search bar + region select + quick-filter pills | SearchHero.tsx is ready; JobSearch.tsx wraps page — insert before layout grid |
| SRCH-02 | Role type filter added to sidebar (8 options with counts) | FilterSidebar.tsx uses `details` groups; add new group at top with URL param `role_type` |
| SRCH-03 | Extras toggle filters added (mentorship, vehicle, DairyNZ pathway, posted <7 days) | Add Toggle group to FilterSidebar; `posted_recent` filter uses `created_at` date math |
| SRCH-04 | Accommodation filter expanded to multi-option (house, cottage, pet-friendly, couples, family) | Replace current Toggle/sub-toggles with multi-value Checkbox group; update fetchJobs query to use `overlaps` on `accommodation_extras` |
| SRCH-05 | Active filter pills displayed above results (moss tint bg, × remove) | New `ActiveFilterPills` component; reads active URL params and renders dismissible pills |
| SRCH-06 | Expandable card tabs on job cards (Details / My Match / Apply) | SearchJobCard.tsx is currently a `<Link>` — must convert to `<div>` with accordion state; new ExpandableCardTabs component renders inside |
| SRCH-07 | Sort options expanded (+ salary high-low, location nearest) | Extend existing `<select>` sort options in ResultsArea; add cases to fetchJobs sort |
| SRCH-08 | Numbered pagination replaces "load more" button | Pagination.tsx exists (34×34px); replace `hasMore`/`handleLoadMore` state with `totalPages` + `page` URL param |
| JDET-01 | Breadcrumb bar (44px, white bg) with path and Save/Share buttons | Breadcrumb.tsx exists; wrap JobDetail page top with Breadcrumb + saved jobs toggle |
| JDET-02 | Stats strip below header (4-col: Applications, Views, Salary, Posted) | StatsStrip.tsx exists; wire `views_count`, application count (query), salary, created_at |
| JDET-03 | Day-to-day section renders as bulleted list with meadow dot bullets | Change `whitespace-pre-line` `<p>` to `<ul>` with meadow `•` bullets |
| JDET-04 | Skills section uses 2-column grid with legend row (Required/Preferred/Bonus badges) | Add legend row above skills grid; existing skill rendering works; add Bonus tier |
| JDET-05 | Application timeline component (vertical, meadow dots + connecting lines) | Timeline.tsx exists; add to job detail between skills and location sections |
| JDET-06 | Location section with map placeholder (160px, mist bg) and distance badge | New MapPlaceholder component (160px mist bg, MapPin icon, centered text, distance badge) |
| JDET-07 | Similar jobs card in sidebar (3 entries with title, meta, salary, match badge) | New component in JobDetailSidebar; query 3 active jobs same region/sector excluding current |
| JDET-08 | Sidebar quick facts list, save/share buttons, deadline notice (hay-lt) | New JobDetailSidebar component; quick facts from job data already loaded |
| JDET-09 | Farm profile card in sidebar (soil header, 3-stat grid, tags, rating, view link) | StarRating.tsx exists; farm data in employer_profiles already fetched; compose in sidebar |
| ADSH-01 | 260px sidebar with farm header, navigation, listing selector, quick stats | New ApplicantDashboardSidebar; DashboardLayout shell sidebar hidden on this route |
| ADSH-02 | Filter toolbar with search input, filter chips (All/New/Reviewed/Shortlisted/Declined), sort, view toggle | New filter toolbar above applicant list; ChipSelector.tsx available for status chips |
| ADSH-03 | Expandable 4-tab panels per applicant (CV, Match breakdown, Interview, Notes) | Extend ApplicantPanel.tsx; existing expanded content migrates to "CV" tab; MatchBreakdown goes to tab 2 |
| ADSH-04 | AI candidate summary box per applicant (purple, cached in DB column) | New Edge Function `generate-candidate-summary`; cache in `applications.ai_summary` column; pattern from generate-match-explanation |
| ADSH-05 | Bulk actions bar (Shortlist selected, Export) | New BulkActionsBar; checkbox state per applicant in parent; PlacementFeeModal gate still applies |
| MAPP-01 | Status variant banners — shortlisted, interview (with Accept/Decline), offer, declined | StatusBanner.tsx exists with all 4 variants; wrap top of ApplicationCard conditionally |
| MAPP-02 | Farm response indicator ("Viewed by employer X hours ago" or "Not yet viewed") | New FarmResponseIndicator; reads `applications.viewed_at`; migration adds column |
| MAPP-03 | Sidebar with status summary, filter tabs, saved jobs, profile strength nudge | New MyApplicationsSidebar; DashboardLayout shell sidebar hidden on this route; `saved_jobs` table required |
</phase_requirements>

---

## Summary

Phase 9 is a pure integration phase: it wires Phase 7 UI primitives (SearchHero, Breadcrumb, StatsStrip, Timeline, StarRating, Pagination, StatusBanner) into the four core pages (JobSearch, JobDetail, ApplicantDashboard, MyApplications) and adds the missing interactivity (accordion cards, filter pills, expanded applicant tabs, AI summaries, employer view tracking, saved jobs). All primitives are already built and exported from `src/components/ui/` — the work is composition, extension, and new DB schema.

The critical architectural constraint is **DashboardLayout sidebar replacement**: both ApplicantDashboard and MyApplications must suppress the shell's `Sidebar` component and render their own 260px layout-level sidebars. The simplest pattern is a prop on `DashboardLayout` (`hideSidebar?: boolean`) that removes `<Sidebar />` from the shell, then the page renders its own sidebar inside the `children` region with a flex row wrapper.

Two DB migrations are required before UI work: (1) `applications.viewed_at` column for employer view tracking, (2) `saved_jobs` table with RLS, and (3) `applications.ai_summary` column for cached AI summaries. A new Edge Function `generate-candidate-summary` follows the existing `generate-match-explanation` pattern. These migrations must run in Wave 0 of each plan that depends on them.

**Primary recommendation:** Start with Wave 0 migrations per plan, then compose pages top-to-bottom using existing primitives. Extend components by adding props, not rewriting — every component in scope has a clear extension path identified in CONTEXT.md.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React + TypeScript | (project) | Component authoring | Project baseline |
| Tailwind CSS v4 | (project) | Styling with design tokens | `@theme` system in index.css |
| react-router v7 | (project) | `useSearchParams` for URL-synced filter state | Already used in FilterSidebar and JobSearch |
| @supabase/supabase-js | (project) | DB queries, Edge Function invocations | All data access |
| react-hook-form + zod | (project) | Quick-apply inline form | Already used in wizard flows |
| sonner | (project) | Toast notifications | Already imported in JobDetail, ApplicantDashboard |
| lucide-react | (project) | Icons (Bookmark, Share2, Eye, MapPin) | Project standard icon set |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-dialog | (installed) | Mobile filter drawer in JobSearch | Already in use |
| @radix-ui/react-slider | (installed) | Salary range slider in FilterSidebar | Already in use |
| cn() utility | (project) | className merging | All component conditional classes |

### No New Dependencies
This phase adds zero new npm packages. All required libraries are already installed. The AI summary box is a Supabase Edge Function call (existing pattern), not a new client-side AI library.

---

## Architecture Patterns

### Recommended Project Structure

No new directories. New components go to `src/components/ui/` (Phase 9 new components) following the existing flat structure.

```
src/
├── components/ui/
│   ├── ActiveFilterPills.tsx        (new — SRCH-05)
│   ├── ExpandableCardTabs.tsx       (new — SRCH-06)
│   ├── JobDetailSidebar.tsx         (new — JDET-07/08/09)
│   ├── ApplicantDashboardSidebar.tsx (new — ADSH-01)
│   ├── MyApplicationsSidebar.tsx    (new — MAPP-03)
│   ├── AICandidateSummary.tsx       (new — ADSH-04)
│   ├── FarmResponseIndicator.tsx    (new — MAPP-02)
│   ├── MapPlaceholder.tsx           (new — JDET-06)
│   ├── BulkActionsBar.tsx           (new — ADSH-05)
│   ├── SearchJobCard.tsx            (extend — SRCH-06)
│   ├── FilterSidebar.tsx            (extend — SRCH-02/03/04)
│   ├── ApplicantPanel.tsx           (extend — ADSH-03)
│   └── ApplicationCard.tsx          (extend — MAPP-01/02)
├── pages/jobs/
│   ├── JobSearch.tsx                (extend — SRCH-01/05/07/08)
│   └── JobDetail.tsx                (extend — JDET-01/02/03/04/05/06/07/08/09)
├── pages/dashboard/employer/
│   └── ApplicantDashboard.tsx       (extend — ADSH-01/02/03/04/05)
├── pages/dashboard/seeker/
│   └── MyApplications.tsx           (extend — MAPP-01/02/03)
├── components/layout/
│   └── DashboardLayout.tsx          (extend — add hideSidebar prop)
└── supabase/
    ├── migrations/015_phase9_schema.sql   (new — viewed_at, saved_jobs, ai_summary)
    └── functions/generate-candidate-summary/ (new Edge Function)
```

### Pattern 1: DashboardLayout Sidebar Replacement

**What:** Add `hideSidebar?: boolean` prop to DashboardLayout. When true, `<Sidebar />` is removed from the shell flex row. The page renders a full-width flex container inside `children` with its own sidebar.

**When to use:** ApplicantDashboard and MyApplications routes.

```typescript
// DashboardLayout.tsx extension
interface DashboardLayoutProps {
  children: ReactNode
  hideSidebar?: boolean  // NEW
}

export function DashboardLayout({ children, hideSidebar = false }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      <Nav />
      <div className="flex">
        {!hideSidebar && <Sidebar />}
        <main className="flex-1 p-6">
          <div className="max-w-[1200px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
```

Page usage pattern:
```typescript
// ApplicantDashboard.tsx
return (
  <DashboardLayout hideSidebar>
    <div className="flex gap-6">
      <ApplicantDashboardSidebar ... />
      <div className="flex-1 min-w-0">
        {/* filter toolbar + applicant list */}
      </div>
    </div>
  </DashboardLayout>
)
```

### Pattern 2: URL-Synced Pagination (replaces load-more)

**What:** Convert JobSearch from infinite-scroll (accumulate) to page-based (replace). `page` URL param drives `fetchJobs`. Total count from Supabase `count: 'exact'` enables `totalPages` calculation.

**Key change:** `fetchJobs` must use `.select('*', { count: 'exact' })` to get total row count. The existing pattern calls `.range(from, to)` — add `{ count: 'exact' }` option.

```typescript
// JobSearch.tsx — fetch with count
const { data, count, error } = await supabase
  .from('jobs')
  .select('*, employer_profiles(id, farm_name, region)', { count: 'exact' })
  .eq('status', 'active')
  .range(from, to)

const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)
```

Page state from URL:
```typescript
const pageParam = Number(searchParams.get('page') ?? '1')
// Pass to fetchJobs; on page change: setSearchParams with { page: N }
```

**Remove:** `hasMore` state, `handleLoadMore`, `page` useState. **Add:** `totalCount` state, URL-synced page param.

### Pattern 3: Accordion Card Expansion (SearchJobCard)

**What:** Convert `SearchJobCard` from `<Link>` to `<div>` with local accordion state. The card header row is a button; the expanded area renders below using CSS height transition.

**Critical:** The card currently is a `<Link to={/jobs/${job.id}}>` — the entire card is navigable. After the change, only "View Full Listing →" inside the Details tab navigates to the job detail page. Bookmark icon also needs to not propagate click to the accordion trigger.

```typescript
// SearchJobCard.tsx extension
interface SearchJobCardProps {
  // existing props...
  isExpanded?: boolean           // NEW — controlled by parent
  onToggle?: () => void          // NEW — parent manages single-open
  isLoggedIn?: boolean           // NEW — controls My Match tab visibility
  hasApplied?: boolean           // NEW — hides Apply tab
  onApply?: (coverNote: string) => Promise<void>  // NEW — inline apply handler
  isSaved?: boolean              // NEW — bookmark state
  onSaveToggle?: () => void      // NEW — bookmark toggle
}
```

Parent (JobSearch) manages `expandedId: string | null` — expanding one collapses the previous (same pattern as existing ApplicantPanel in ApplicantDashboard).

### Pattern 4: Edge Function — AI Candidate Summary

**What:** On-demand generation, single invocation per applicant-job pair, result cached in `applications.ai_summary` column.

**Trigger:** When employer expands an applicant panel for the first time (expanded === true AND no cached summary). Fire-and-forget Edge Function call; show skeleton until result arrives via polling or re-fetch.

**Simplest implementation:** When panel expands, check if `application.ai_summary` is null. If null, invoke the Edge Function, then refetch the application row once to get the cached summary. No real-time subscription needed — one refetch after a 2-3 second delay or use `supabase.functions.invoke` and update local state with the returned summary.

```typescript
// Pattern from generate-match-explanation in JobDetail.tsx
supabase.functions.invoke('generate-candidate-summary', {
  body: { application_id: app.id, job_id: jobId, seeker_id: app.seeker_profiles.id },
}).then(({ data }) => {
  if (data?.summary) {
    setAiSummary(data.summary)
    // Also cached in DB — no further fetch needed
  }
})
```

### Pattern 5: Employer View Tracking

**What:** Upsert `applications.viewed_at` when employer first opens a panel.

```typescript
// In ApplicantDashboard — onToggle handler
if (!currentlyExpanded && !application.viewed_at) {
  supabase.from('applications')
    .update({ viewed_at: new Date().toISOString() })
    .eq('id', application.id)
    .then(() => {}) // fire-and-forget
}
```

Seeker side: `FarmResponseIndicator` reads `application.viewed_at` from the applications query (need to add `viewed_at` to the select in `MyApplications.tsx`).

### Anti-Patterns to Avoid

- **Rewriting components from scratch:** SearchJobCard, FilterSidebar, ApplicantPanel, ApplicationCard all have extension paths — add props, don't rebuild.
- **Double sidebar:** DashboardLayout shell sidebar MUST be hidden when ApplicantDashboard or MyApplications render their own 260px sidebar. No nested sidebars.
- **Pagination without count:** Supabase `.range()` without `{ count: 'exact' }` returns no row count — `totalPages` will be wrong. Must add count option to the select call.
- **AI summary on every expand:** Only invoke the Edge Function when `ai_summary` is null. Cache check must happen before invoking. Otherwise generates new summary every time the panel opens.
- **Accordion state in card:** Parent (JobSearch ResultsArea) must own `expandedId` — not each card. Cards accept `isExpanded` + `onToggle` props. This is the existing pattern in ApplicantDashboard.
- **Accommodation filter breaking existing jobs:** The existing accommodation filter uses `contains('accommodation', { available: true })`. Phase 8 migrated accommodation_extras to `text[]`. New multi-option filter should use `overlaps('accommodation_extras', selectedOptions)` — not the old `contains` pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Numbered pagination UI | Custom page buttons | `Pagination` component (Phase 7) | Already built, locked to 34×34px |
| Breadcrumb with save/share | Custom nav bar | `Breadcrumb` component (Phase 7) | Already built with correct 44px height |
| 4-col stat grid | Custom stat section | `StatsStrip` component (Phase 7) | Already built |
| Vertical timeline | Custom milestone list | `Timeline` component (Phase 7) | Already built with meadow dots |
| Star rating display | Custom star icons | `StarRating` component (Phase 7) | Uses correct custom SVG (not lucide Star) |
| Status banners | Custom alert boxes | `StatusBanner` component (Phase 7) | All 4 variants built with correct copy |
| Match score bar chart | Custom bars | `MatchBreakdown` component | Existing 7-dimension breakdown component |
| Match circle | Custom circle | `MatchCircle` component | Existing component |
| Chip multi-select | Custom chip UI | `ChipSelector` component | Phase 7 standard for multi-select |
| Toast notifications | Custom toast | `sonner` (`toast.error()`, `toast.success()`) | Already imported |
| AI text generation | Client-side LLM | Supabase Edge Function | Pattern from `generate-match-explanation` |

---

## Common Pitfalls

### Pitfall 1: Pagination total count missing
**What goes wrong:** `totalPages` is always 1 or NaN because the query doesn't return a row count.
**Why it happens:** Supabase `.range()` alone doesn't include count. Must add `{ count: 'exact' }` to the `.select()` call.
**How to avoid:** `supabase.from('jobs').select('*, ...', { count: 'exact' })` — destructure `{ data, count, error }`.
**Warning signs:** Pagination renders but page 2 shows the same results as page 1.

### Pitfall 2: SearchJobCard Link-to-div conversion breaks navigation
**What goes wrong:** After converting from `<Link>` to `<div>`, clicking the card no longer navigates to job detail. Or conversely, clicking "View Full Listing →" inside Details tab triggers the accordion toggle.
**Why it happens:** Click event propagation. The accordion toggle button wraps the card header; inner links must stop propagation.
**How to avoid:** Use `e.stopPropagation()` on the "View Full Listing →" link's onClick. The bookmark icon similarly needs `e.stopPropagation()`.

### Pitfall 3: Double sidebar on ApplicantDashboard and MyApplications
**What goes wrong:** Both the DashboardLayout shell Sidebar (240px) and the new page-level sidebar (260px) render simultaneously, breaking tablet layout.
**Why it happens:** DashboardLayout unconditionally renders `<Sidebar />`. Adding page sidebars without suppressing the shell sidebar causes double layout.
**How to avoid:** Add `hideSidebar` prop to DashboardLayout. Both ApplicantDashboard and MyApplications pass `hideSidebar` to suppress the shell sidebar.

### Pitfall 4: Filter params not merging correctly (clearing existing active filters)
**What goes wrong:** Clicking a new filter pill clears all other active filters.
**Why it happens:** `setSearchParams` called with `new URLSearchParams(...)` using only the new filter key, not building on `prev`.
**How to avoid:** The existing `handleFilterChange` in JobSearch already uses the functional form `setSearchParams((prev) => { const next = new URLSearchParams(prev); ... })` — maintain this pattern for all new filter additions.
**Warning signs:** CONTEXT.md specifically flags "all applied filters merge into URL params without clearing existing active filters."

### Pitfall 5: AI summary invoked on every panel expand
**What goes wrong:** Employer sees "Analyzing..." every time they expand a panel, even for previously analyzed applicants. Burns tokens and slows UI.
**Why it happens:** Edge Function is invoked on every expand without checking the cache.
**How to avoid:** Check `application.ai_summary` before invoking. Only call the Edge Function when `ai_summary` is null.

### Pitfall 6: Accommodation filter using old `contains` pattern
**What goes wrong:** Phase 8 migrated boolean accommodation columns to `accommodation_extras text[]`. The current `fetchJobs` still uses `contains('accommodation', { available: true })`. New multi-option filter targets `accommodation_extras`.
**Why it happens:** Phase 8 changed the data model; Phase 9 touches the same filter UI.
**How to avoid:** New accommodation filter group uses `overlaps('accommodation_extras', selectedValues)`. Review the Phase 8 migration (013_phase8_wizard_fields.sql, 014_ownership_type_array.sql) before writing filter queries.

### Pitfall 7: applications.viewed_at not in MyApplications query
**What goes wrong:** `FarmResponseIndicator` receives `null` for `viewed_at` even when employer has viewed.
**Why it happens:** `MyApplications.tsx` selects `'*, jobs(...)'` — `viewed_at` is included in `*` after migration but if the select is explicit it may be missing.
**How to avoid:** Verify the migration adds the column; confirm `viewed_at` is returned from the applications select. If using `*`, it will be included automatically.

### Pitfall 8: ApplicantDashboard route URL conflict (job param vs dashboard route)
**What goes wrong:** `ApplicantDashboard` currently uses `useParams<{ id: string }>()` for the jobId. Adding a `?job=xyz` URL param for the listing selector creates ambiguity.
**Why it happens:** The route is `/dashboard/employer/applicants/:id` — the `:id` is the job. The listing selector in the sidebar switches between jobs. These are the same data. The sidebar listing selector should update `?job=xyz` or use a local state dropdown that refetches — NOT the existing `:id` route param.
**How to avoid:** Per CONTEXT.md decision — listing selector uses `?job=xyz` URL search param. The initial `jobId` comes from the route param `:id`; the sidebar shows all employer jobs and the currently selected one defaults to `:id`. When employer picks a different job, the `job` search param updates and the component refetches for that job.

---

## Code Examples

### Supabase query with pagination count

```typescript
// Source: Supabase JS docs — count option
const { data, count, error } = await supabase
  .from('jobs')
  .select('*, employer_profiles(id, farm_name, region)', { count: 'exact' })
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .range(from, to)

const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)
```

### Optimistic saved jobs toggle

```typescript
// Pattern: optimistic UI — toggle locally, sync to DB, revert on error
const [isSaved, setIsSaved] = useState(initialSaved)

async function handleSaveToggle() {
  const newState = !isSaved
  setIsSaved(newState) // optimistic
  try {
    if (newState) {
      await supabase.from('saved_jobs').insert({ user_id: userId, job_id: jobId })
    } else {
      await supabase.from('saved_jobs').delete().eq('user_id', userId).eq('job_id', jobId)
    }
  } catch {
    setIsSaved(!newState) // revert
    toast.error('Could not save job — please try again')
  }
}
```

### Active filter pills — reading URL params

```typescript
// ActiveFilterPills reads all known filter keys from searchParams
const PILL_LABEL_MAP: Record<string, (v: string) => string> = {
  shed_type: (v) => `Shed: ${v}`,
  region: (v) => `Region: ${v}`,
  role_type: (v) => `Role: ${v}`,
  contract_type: (v) => `Contract: ${v}`,
  accommodation: () => 'Accommodation',
  couples: () => 'Couples welcome',
  visa: () => 'Visa sponsorship',
  // ... etc
}

// Collect active pills
const pills: { key: string; value: string; label: string }[] = []
for (const [key, labelFn] of Object.entries(PILL_LABEL_MAP)) {
  const values = searchParams.getAll(key)
  values.forEach((v) => pills.push({ key, value: v, label: labelFn(v) }))
}
```

### DashboardLayout with hideSidebar prop

```typescript
// DashboardLayout.tsx
interface DashboardLayoutProps {
  children: ReactNode
  hideSidebar?: boolean
}

export function DashboardLayout({ children, hideSidebar = false }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      <Nav />
      <div className="flex">
        {!hideSidebar && <Sidebar />}
        <main className="flex-1 p-6">
          <div className="max-w-[1200px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
```

### applications.viewed_at upsert

```typescript
// Fire-and-forget — called when employer first opens a panel
if (!application.viewed_at) {
  supabase
    .from('applications')
    .update({ viewed_at: new Date().toISOString() })
    .eq('id', application.id)
    .then(() => {}) // no error handling needed — best effort
}
```

---

## Database Changes Required

### Migration 015 — Phase 9 schema

Three schema changes needed before UI work can begin:

**1. applications.viewed_at column**
```sql
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz;
```

**2. saved_jobs table**
```sql
CREATE TABLE IF NOT EXISTS saved_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, job_id)
);

ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own saved jobs"
  ON saved_jobs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**3. applications.ai_summary column**
```sql
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS ai_summary text;
```

Confidence: HIGH — straightforward additive migrations, no type changes.

---

## Component Extension Contracts

### SearchJobCard.tsx — New Props

Current: `<Link to={/jobs/${job.id}}>` (entire card navigates)
After: `<div>` with button trigger for accordion

New props to add:
```typescript
isExpanded?: boolean       // controlled by parent
onToggle?: () => void      // parent owns single-open state
isLoggedIn?: boolean       // controls My Match tab
hasApplied?: boolean       // hides Apply tab
onApply?: (coverNote: string) => Promise<void>
isSaved?: boolean
onSaveToggle?: () => void
seekerId?: string | null   // for match score lookup in tab
matchBreakdown?: MatchScore['breakdown'] | null  // for My Match tab bars
```

### FilterSidebar.tsx — New Filter Groups

Add before existing groups (SPEC wireframe ordering: Role Type, Extras at top):
- `role_type`: 8 options (`farm_manager`, `head_stockman`, `2ic`, `herd_manager`, `dairy_assistant`, `trainee`, `relief_milker`, `couple`) — Checkbox multi-select with URL param `role_type`
- `extras`: Toggle group (mentorship, vehicle, dairynz_pathway, posted_recent)
- Accommodation: replace current Toggle/sub-toggle with Checkbox multi-option (`house`, `cottage`, `pet_friendly`, `couples`, `family`) — URL param `accommodation_type[]`

Also add to `handleClearAll` keys array: `role_type`, `extras`, `accommodation_type`, `posted_recent`.

### ApplicantPanel.tsx — 4-Tab Structure

Current expanded content migrates to a tab container. New tabs:
- **CV tab:** Cover note (existing) + seeker profile grid (existing) + skills section (existing) + contact details (existing)
- **Match Breakdown tab:** Reuse `<MatchBreakdown score={matchScore} />` component
- **Interview tab:** Static placeholder text ("Interview scheduling is coming in a future release.")
- **Notes tab:** `<textarea>` bound to `applications.application_notes` column (new column — add to migration)

New state in ApplicantPanel: `activeTab: 'cv' | 'match' | 'interview' | 'notes'`

Also add `AICandidateSummary` component above the tab bar when employer expands panel.

### ApplicationCard.tsx — StatusBanner + FarmResponseIndicator

New props:
```typescript
viewedAt?: string | null   // applications.viewed_at
```

Render before existing card body when `['shortlisted', 'interview', 'offered', 'declined'].includes(status)`:
```typescript
const statusToVariant: Partial<Record<ApplicationStatus, StatusVariant>> = {
  shortlisted: 'shortlisted',
  interview: 'interview',
  offered: 'offer',
  declined: 'declined',
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `accommodation_pets`, `accommodation_couples`, `accommodation_family` boolean columns | `accommodation_extras text[]` | Phase 8 (migration 013) | Filter queries must use `overlaps()`, not individual boolean checks |
| `ownership_type text` | `ownership_type text[]` | Phase 8 (migration 014) | No impact on Phase 9 |
| Load-more infinite scroll | URL-synced pagination | Phase 9 | JobSearch page state model changes significantly |
| Apply modal (Dialog) | Inline quick-apply in card | Phase 9 | JobDetail retains modal; JobSearch cards get inline form |

**Deprecated patterns:**
- `hasMore` + `handleLoadMore` in JobSearch: replaced by `totalPages` + URL page param
- Entire-card `<Link>` in SearchJobCard: replaced by accordion `<div>` with inner "View Full Listing" link

---

## Open Questions

1. **application_notes column existence**
   - What we know: ApplicantPanel "Notes" tab needs to read/write employer private notes
   - What's unclear: Is there an existing `application_notes` column on the applications table, or does migration 015 need to add it?
   - Recommendation: Check `supabase/migrations/` — if not found, add `application_notes text` to migration 015. The planner should include this as a migration task.

2. **Role type field on jobs table**
   - What we know: SRCH-02 requires role type filter with counts (8 options). `JobListing` type has `role_type: string` field.
   - What's unclear: Whether the DB `jobs` table has a populated `role_type` column with consistent values matching the 8 filter options. If jobs have null/varied `role_type`, filter counts will always show 0.
   - Recommendation: The filter still works (returns correct subset), but counts require a DB aggregate query. Plan for SRCH-02 should include a Supabase RPC or client-side count from the full result set.

3. **Similar jobs query for job detail sidebar**
   - What we know: JDET-07 needs 3 similar jobs (same region/sector, excluding current).
   - What's unclear: Whether to query fresh from Supabase (extra network request) or reuse data already in the page.
   - Recommendation: Simple separate query in `loadJob()` — 3 active jobs same region, excluding current job ID. Lightweight, no RPC needed.

4. **Profile strength nudge calculation**
   - What we know: MAPP-03 sidebar includes a "profile strength nudge" (Claude's discretion)
   - What's unclear: What fields drive the calculation
   - Recommendation: Simple percentage of non-null seeker_profile fields (region, years_experience, dairynz_level, sector_pref, shed_types_experienced, accommodation_needed). No DB query — calculate from already-loaded profile data.

---

## Validation Architecture

The project does not have a test configuration file. `nyquist_validation` is not set to false in `.planning/config.json` — key is absent, treat as enabled for documentation purposes.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no jest.config, vitest.config, or test directories found |
| Config file | None — Wave 0 of any plan that requires testing must install and configure |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements — Test Map

Given no test framework exists and this phase is UI integration with existing React components, testing is predominantly manual verification against SPEC wireframes. The planner should include manual verification steps in each plan's wave structure.

| Req ID | Behavior | Test Type | Notes |
|--------|----------|-----------|-------|
| SRCH-01 | SearchHero renders above results | visual | Manual — verify against wireframe |
| SRCH-05 | Filter pills dismiss and update URL | smoke | Manual — click × and verify URL param removed |
| SRCH-06 | One card expanded at a time | interaction | Manual — verify accordion single-open |
| SRCH-08 | Pagination syncs to URL `?page=N` | smoke | Manual — navigate pages, check URL |
| ADSH-01 | No double sidebar on dashboard | visual | Manual — verify DashboardLayout shell sidebar hidden |
| ADSH-04 | AI summary cached after first load | functional | Manual — expand panel twice, verify no second API call |
| MAPP-02 | viewed_at updates on first panel open | DB | Manual — check Supabase table after employer opens panel |

### Wave 0 Gaps
- [ ] `supabase/migrations/015_phase9_schema.sql` — adds `applications.viewed_at`, `saved_jobs` table, `applications.ai_summary`, `applications.application_notes`
- [ ] `supabase/functions/generate-candidate-summary/` — new Edge Function (ADSH-04)

*(No test framework gaps — project has no test infrastructure and this phase does not add one. Manual verification against wireframes is the validation gate.)*

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `src/pages/jobs/JobSearch.tsx` — current load-more pattern, URL param pattern, fetchJobs structure
- Direct code inspection: `src/pages/jobs/JobDetail.tsx` — existing data fetching, match score, apply modal
- Direct code inspection: `src/pages/dashboard/employer/ApplicantDashboard.tsx` — DashboardLayout usage, ApplicantPanel accordion pattern
- Direct code inspection: `src/pages/dashboard/seeker/MyApplications.tsx` — ApplicationCard usage, withdraw pattern
- Direct code inspection: `src/components/ui/SearchJobCard.tsx` — current Link-based card structure
- Direct code inspection: `src/components/ui/FilterSidebar.tsx` — URL param handling, existing filter groups
- Direct code inspection: `src/components/ui/ApplicantPanel.tsx` — existing expanded content to migrate to CV tab
- Direct code inspection: `src/components/ui/ApplicationCard.tsx` — current structure, props to extend
- Direct code inspection: `src/components/ui/StatusBanner.tsx` — variant configs verified
- Direct code inspection: `src/components/ui/Breadcrumb.tsx` — existing props: items, onSave, onShare
- Direct code inspection: `src/components/ui/Pagination.tsx` — props: currentPage, totalPages, onPageChange
- Direct code inspection: `src/components/layout/DashboardLayout.tsx` — no hideSidebar prop currently; confirmed extension needed
- Direct code inspection: `src/components/layout/Sidebar.tsx` — always renders; confirmed must be suppressed
- Direct code inspection: `.planning/phases/09-page-level-integrations/09-UI-SPEC.md` — interaction contracts, color rules, layout contracts
- Direct code inspection: `.planning/phases/09-page-level-integrations/09-CONTEXT.md` — all locked decisions
- Direct code inspection: `supabase/migrations/` — latest migration is 014; confirmed no viewed_at, saved_jobs, or ai_summary yet
- Direct code inspection: `supabase/functions/` — generate-match-explanation pattern available to copy

### Secondary (MEDIUM confidence)
- Supabase JS docs pattern: `{ count: 'exact' }` option on `.select()` for total row count — verified by knowledge of Supabase API

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed installed, no new dependencies
- Architecture: HIGH — all components read directly, extension paths confirmed
- DB migrations: HIGH — migration directory inspected, no conflicts
- Pitfalls: HIGH — identified from direct reading of existing code patterns
- Edge Function pattern: HIGH — existing `generate-match-explanation` function confirmed

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable project; primitives locked in Phase 7)
