# Phase 9: Page-Level Integrations - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Upgrade job search, job detail, applicant dashboard, and My Applications pages to match SPEC v3.0 layout and functionality using Phase 7 UI primitives. Includes integrating SearchHero, Breadcrumb, StatsStrip, Timeline, StarRating, Pagination, and StatusBanner into the correct pages, adding missing filter groups, expandable card tabs, applicant panel tabs, AI candidate summaries, employer view tracking, and a basic saved jobs feature for seekers.

</domain>

<decisions>
## Implementation Decisions

### Applicant dashboard sidebar
- SPEC 260px sidebar **replaces** DashboardLayout shell sidebar on this page — no double sidebar
- DashboardLayout nav links move to a horizontal top bar / breadcrumb area above the applicant content
- Listing selector dropdown filters applicants in place via URL search param (`?job=xyz`) — no full page navigation
- Current applicant info (match score, key skills) stays visible by default — 4-tab expansion (CV, Match breakdown, Interview, Notes) adds deeper detail on click
- Bulk actions bar shows only working actions: "Shortlist selected" and "Export" — no disabled "Send message" button (messaging is v2)

### Job search card expansion
- Accordion-style inline expansion: clicking a card expands it below the header, pushing other cards down
- Only one card expanded at a time — expanding a new card collapses the previous
- Tab bar inside expanded area: Details / My Match / Apply
- **Details tab:** Job description preview, key requirements, "View Full Listing →" link
- **My Match tab:** Simplified summary — overall score + top 3 strongest/weakest dimensions as colored bars (full 7-dimension breakdown on job detail page)
- **Apply tab:** Quick inline apply — optional cover note textarea + "Apply Now" button, no modal
- My Match tab only visible to logged-in seekers; Apply tab hidden if already applied

### Job search filters and pagination
- New filter groups (Role Type with counts, Extras toggles) added at **top** of FilterSidebar, above existing filters — matches SPEC wireframe ordering
- Accommodation filter expanded to multi-option (house, cottage, pet-friendly, couples, family)
- Sort options expanded with salary high-low and location nearest
- Numbered pagination (Phase 7 Pagination component) **replaces** "Load More" button entirely
- Page number synced to URL param (`?page=2`) for shareability
- Active filter pills (moss tint bg, × remove) displayed above results list

### Job detail page
- Breadcrumb bar (44px, fog border) with path and Save/Share buttons
- StatsStrip below header (4-col: Applications, Views, Salary, Posted)
- Application Timeline component (vertical, meadow dots + connecting lines)
- Location section with map placeholder (160px, mist bg) and distance badge
- Similar jobs card in sidebar (3 entries with title, meta, salary, match badge)
- Farm profile card in sidebar (soil header, 3-stat grid, tags, rating via StarRating, view link)
- Sidebar quick facts list, save/share buttons, deadline notice (hay-lt)

### My Applications status UX
- StatusBanner renders at **top** of each ApplicationCard when status has changed (shortlisted, interview, offer, declined)
- Warm, encouraging copy per Phase 7 StatusBanner design ("Great news — you've been shortlisted!")
- Interview variant includes Accept/Decline action buttons inside the banner
- SPEC 260px sidebar **replaces** DashboardLayout shell sidebar — same pattern as applicant dashboard
- Sidebar includes: application status summary, filter tabs (All/Active/Shortlisted/Closed), saved jobs list, profile strength nudge

### Employer view tracking
- Real tracking via `viewed_at` timestamp column on applications table
- Set when employer first opens the applicant panel (INSERT ON CONFLICT — lightweight)
- Seeker sees "Viewed by employer X hours ago" or "Not yet viewed" on their application cards

### Saved jobs
- New `saved_jobs` table (user_id, job_id, created_at) with RLS
- Bookmark toggle on job search cards and job detail page
- Saved jobs list in My Applications sidebar
- Built in this phase since we're already touching all the relevant pages

### AI candidate summaries
- Purple AI summary box per applicant in the applicant dashboard (ADSH-04)
- Generated **on-demand** when employer first expands an applicant's panel — not background or batch
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### SPEC wireframes — page layouts
- `SPEC.md` §6.6 (Job Search) — SearchHero, filter sidebar layout, active filter pills, expandable card tabs, pagination, sort options, save search box
- `SPEC.md` §6.5 (Job Detail) — Breadcrumb bar, StatsStrip, Timeline, location map, similar jobs sidebar, farm profile card, sidebar quick facts
- `SPEC.md` §6.9 (Applicant Dashboard) — 260px sidebar, listing selector, filter toolbar, 4-tab panels, AI summary box, bulk actions bar
- `SPEC.md` §6.7 (My Applications) — StatusBanner variants, farm response indicator, sidebar with status summary and filter tabs

### Interactive wireframes
- `TopFarms_Launch_Pack/wireframes/TopFarms_Worker_Job_Search_v2.html` — Job search wireframe
- `TopFarms_Launch_Pack/wireframes/TopFarms_Job_Detail_Page.html` — Job detail wireframe
- `TopFarms_Launch_Pack/wireframes/topfarms_applicant_dashboard.html` — Applicant dashboard wireframe
- `TopFarms_Launch_Pack/wireframes/TopFarms_Worker_Application_View.html` — My Applications wireframe

### Phase 7 primitives
- `src/components/ui/SearchHero.tsx` — Gradient hero with search bar, region select, quick-filter pills
- `src/components/ui/Breadcrumb.tsx` — Path breadcrumb with Save/Share buttons (Bookmark icon imported)
- `src/components/ui/StatsStrip.tsx` — 3-4 column stat grid
- `src/components/ui/Timeline.tsx` — Vertical timeline with meadow dots
- `src/components/ui/StarRating.tsx` — 1-5 star input/display
- `src/components/ui/Pagination.tsx` — Numbered page buttons (34x34px, active = moss bg)
- `src/components/ui/StatusBanner.tsx` — 4 status variants with CTA props

### Existing page code
- `src/pages/jobs/JobSearch.tsx` — Current job search (FilterSidebar, SearchJobCard, load-more)
- `src/pages/jobs/JobDetail.tsx` — Current job detail (MatchBreakdown, MatchCircle, apply modal)
- `src/pages/dashboard/employer/ApplicantDashboard.tsx` — Current applicant dashboard (ApplicantPanel, DashboardLayout)
- `src/pages/dashboard/seeker/MyApplications.tsx` — Current My Applications (ApplicationCard, DashboardLayout)

### Design tokens
- `src/index.css` — Color tokens (moss, hay, fog, cream, meadow, soil, mist), typography (Fraunces, DM Sans)

### Domain types
- `src/types/domain.ts` — ApplicationStatus (8-stage), VALID_TRANSITIONS, JobListing, MatchScore, MatchBreakdown

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FilterSidebar`: Fully wired with URL-param state (useSearchParams) — extend with new filter groups, don't rewrite
- `SearchJobCard`: Existing card component — extend with expandable accordion behavior
- `ApplicantPanel`: Existing panel with skills and match display — extend with 4-tab structure
- `ApplicationCard`: Existing card — extend with StatusBanner and view tracking indicator
- `MatchBreakdown` / `MatchCircle`: Existing match display components — reuse in expanded card My Match tab
- `DashboardLayout`: Shell layout with sidebar — needs conditional sidebar replacement for applicant dashboard and My Applications
- `PlacementFeeModal` / `HireConfirmModal`: Existing modals in applicant dashboard — keep as-is

### Established Patterns
- URL-synced filter state via `useSearchParams` — extend for new filters and pagination
- Batch data fetching (match scores, skills, contacts) — same pattern for AI summaries and view tracking
- `react-hook-form` + `zod` for forms — use for quick-apply inline form
- Tailwind CSS with custom design tokens via `@theme` in index.css
- `cn()` utility for className merging
- Edge Function pattern for AI calls (existing match explanation) — reuse for AI candidate summaries

### Integration Points
- Phase 7 primitives all export from `src/components/ui/` — ready to import
- `DashboardLayout` needs a prop or route-based mechanism to hide/replace shell sidebar
- `applications` table needs `viewed_at` column (migration)
- New `saved_jobs` table (migration + RLS)
- New `ai_candidate_summaries` column or table for cached summaries
- Existing AI match explanation Edge Function pattern to extend for candidate summaries

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. All visual specifications come from SPEC.md wireframe descriptions and interactive HTML wireframes.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. Saved jobs was identified as missing and included in this phase since all relevant pages are being touched.

</deferred>

---

*Phase: 09-page-level-integrations*
*Context gathered: 2026-03-22*
