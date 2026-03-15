# Phase 3: Seeker Demand Side - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

A seeker can complete their 8-step onboarding profile, search jobs using all NZ agriculture-specific filters (shed type, accommodation, visa, DairyNZ, herd size, couples, salary, region, contract type), see match scores on results, view a full per-dimension match breakdown on job detail, and submit and track applications through the full 8-stage pipeline. Employers can view ranked applicants and transition them through stages.

</domain>

<decisions>
## Implementation Decisions

### Search & Filter UX
- Live filtering — results update instantly as each filter changes, no "Apply" button
- Filter state syncs to URL for shareable/bookmarkable searches
- Default sort: match score (best matches first), secondary sort by recency
- Rich cards for search results: job title, farm name, region, salary range, match score circle, key tags (shed type, accommodation, contract type), trust badge. ~120px tall. Reuses existing JobCard component pattern
- Mobile: bottom drawer for filters — filter icon in sticky header opens full-height drawer with "Show X results" button at bottom to close and apply

### Application Flow
- One-click apply with optional cover note — "Apply" button opens lightweight modal with optional textarea, one more click to confirm. Seeker's profile IS the application
- Seeker "My Applications" view: card list with status badges (reusing JobCard), grouped by active vs completed, withdraw button on active applications
- Employer applicant dashboard: ranked list by match score with expandable panels. Each row shows name, match score circle, key skills overlap, application date. Expanded panel shows full seeker profile, cover note, and stage transition controls
- Pipeline transitions via dropdown on expanded panel — shows valid next stages (e.g., Applied -> Review or Declined), select to transition with optional note

### Seeker Onboarding
- Reuses existing wizard pattern: linear, auto-save, numbered step bar (useWizard hook + StepIndicator component)
- Experience capture: simple fields — total years (number input), herd sizes worked with (multi-select checkboxes: <200, 200-500, 500-1000, 1000+), shed types experienced (multi-select: rotary, herringbone, other). No farm history timeline
- DairyNZ qualification: single dropdown (None, Level 1, Level 2, Level 3, Level 4) with tooltip explaining each level
- Life situation: grouped toggles + fields — "Seeking work as a couple?" toggle (if yes: partner name), "Need on-farm accommodation?" toggle (if yes: pets, children, vehicle parking sub-options), region preference as multi-select of NZ regions
- Post-onboarding landing: job search page with success toast ("Profile complete! Here are jobs matching your skills"), filters pre-set from profile (farm type, region). Immediate value — they came to find work

### Match Scores (Pre-Engine)
- Basic scoring implemented in Phase 3 as a Supabase PostgreSQL function — computes scores from seeker profile + job fields at query time. Phase 4 replaces with optimized pre-computed engine
- Job detail match breakdown: sidebar card with category rows (Shed Type, Location, Accommodation, Skills, Salary, Visa) as horizontal progress bars per category, total score circle at top (reusing MatchCircle component)
- Visitor teaser: match breakdown card shown but blurred/locked with overlay "Sign up to see how you match" — drives signups
- No competitive signals — seeker sees only their own match breakdown, no percentile or comparison to other seekers
- Low scores shown honestly with brief context (e.g., "0/25 Shed Type — Different shed type experience"). Not alarming, not patronizing
- Scores refresh on next search/job detail load after profile edit — no background recalculation in Phase 3 (Phase 4 adds trigger-based staleness)
- Employer applicant dashboard: total match score circle per applicant in list, expanded view shows 2-3 key match highlights (e.g., "Rotary shed experience", "Accommodation match") rather than full category breakdown

### Claude's Discretion
- Loading skeletons and transition animations
- Exact spacing, typography, and responsive breakpoints within design system
- Error state handling and messaging
- Empty state designs (no search results, no applications yet)
- Skills self-assessment step UX details (reuses SkillsPicker with proficiency levels)
- Visa status capture format
- Search result pagination/infinite scroll approach

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Wireframes & Specs
- `TopFarms_Launch_Pack/wireframes/` — Interactive HTML wireframes for all MVP screens including seeker flows
- `SPEC.md` — Full technical specification including schema definitions, match scoring formula, filter specifications

### Project Context
- `.planning/PROJECT.md` — Core value, constraints, tech stack, key decisions
- `.planning/REQUIREMENTS.md` — SONB-01 through SONB-08, SRCH-01 through SRCH-12, JDET-01 through JDET-04, APPL-01 through APPL-06

### Prior Phase Context
- `.planning/phases/01-foundation/01-CONTEXT.md` — Design system decisions, auth flow, dashboard shells, schema decisions
- `.planning/phases/02-employer-supply-side/02-CONTEXT.md` — Wizard pattern, SkillsPicker, verification badges, JobCard, job detail visitor view

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/useWizard.ts` — Wizard navigation hook (0-indexed, auto-save pattern) — reuse for seeker onboarding
- `src/components/ui/StepIndicator.tsx` — Numbered step bar with circles — reuse for seeker onboarding
- `src/components/ui/SkillsPicker.tsx` — Grouped checklist with proficiency levels, has requirementMode prop — reuse for seeker skills self-assessment
- `src/components/ui/JobCard.tsx` — Job card component — reuse/extend for search results and application tracking
- `src/components/ui/MatchCircle.tsx` — Match score circle display — reuse for search results and job detail
- `src/components/ui/VerificationBadge.tsx` — Trust badge — display on search result cards
- `src/components/ui/ProgressBar.tsx` — Progress bar — reuse for match breakdown category bars
- `src/components/ui/FileDropzone.tsx` — Drag-and-drop upload — potentially reuse if seeker uploads needed
- `src/components/ui/Tag.tsx` — Tag component — reuse for filter chips and skill tags

### Established Patterns
- Wizard shell owns Supabase persistence (upsert with step increment) — seeker onboarding should follow same pattern
- PGRST116 error code for no-rows detection (new user vs DB error)
- Storage bucket RLS via path-scoped foldername check
- Radix UI primitives styled with Tailwind v4
- react-router@7 with createBrowserRouter in main.tsx

### Integration Points
- `src/pages/dashboard/SeekerDashboard.tsx` — Existing shell, needs content (applications, profile summary)
- `src/pages/jobs/JobDetail.tsx` — Existing component, needs seeker-specific match breakdown view added
- `src/lib/supabase.ts` — Supabase client instance
- `src/lib/constants.ts` — App constants (regions, etc.)
- Router in `main.tsx` — New routes for seeker onboarding, job search, applications

</code_context>

<specifics>
## Specific Ideas

- Post-onboarding lands on job search (not dashboard) with filters pre-set from profile — seekers came to find work, give them immediate value
- Blurred match breakdown as signup teaser creates curiosity and drives conversion
- Employer applicant view is action-oriented: total score + key highlights, not data-heavy full breakdown
- Honest match scores with brief context — the platform's brand is trustworthy and professional, not salesy

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-seeker-demand-side*
*Context gathered: 2026-03-16*
