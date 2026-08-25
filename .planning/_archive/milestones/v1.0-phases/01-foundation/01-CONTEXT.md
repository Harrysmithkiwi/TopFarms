# Phase 1: Foundation - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Project scaffolding (React + Vite + Tailwind v4 + Supabase), full database schema with RLS on every table, email/password authentication with employer/seeker role fork, and the design system component library. This phase delivers the infrastructure that every subsequent phase builds on.

</domain>

<decisions>
## Implementation Decisions

### Auth UX Flow
- Role selection happens during signup — "I'm an Employer" / "I'm a Seeker" is a step in the signup form, routing to different onboarding immediately after
- Split-screen layout for auth pages: left side farm imagery/branding, right side auth form
- Email verification: redirect to a "check your inbox" page with resend link. Clicking the email link logs them in and starts onboarding
- Password reset: standard flow — forgot password → enter email → receive link → set new password → auto-login

### Design System Approach
- Wireframes in TopFarms_Launch_Pack are the spec — follow them closely for layout, spacing, and component structure
- Radix UI primitives styled with Tailwind v4 — full control, no shadcn/ui opinions fighting the bespoke design system
- Animation: landing page only gets rich animation (counters, hero). Rest of app uses minimal, subtle transitions. Farm workers want speed, not spectacle
- Visual feel: earthy and professional — warm soil/moss tones, clean typography, trustworthy. Premium rural brand, not tech startup

### Dashboard Shells
- Navigation: top navbar with logo/user menu + left sidebar for navigation items. Main content area
- Employer first login: onboarding prompt — clear CTA "Complete your farm profile to start posting jobs" with progress indicator, guides into wizard
- Seeker first login: onboarding prompt — "Complete your profile to start matching with jobs", guides into seeker wizard
- Mobile navigation (below 768px): hamburger menu — burger icon in top bar opens slide-out menu

### Schema Decisions
- Standard 16 NZ regions (Northland through Southland)
- Contact masking: separate seeker_contacts table with strict RLS — main seeker_profiles table never exposes phone/email
- Placement fee amount: decide later — build the gate mechanism, modal says "placement fee applies" without a specific dollar amount
- Skills seed list: Claude curates from DairyNZ competencies and standard farm skills (~40 skills across dairy + sheep/beef)

### Claude's Discretion
- Password reset page styling and flow details
- Loading skeleton designs
- Error state handling and messaging
- Exact spacing and typography scale within the design system constraints
- Dashboard sidebar navigation item grouping
- Skills categorization within the ~40 curated skills

</decisions>

<specifics>
## Specific Ideas

- Auth pages should feel like a premium rural brand — the split-screen farm imagery sets the tone immediately
- Wireframes are the source of truth for layout — TopFarms_Launch_Pack/wireframes/ contains all 8 MVP screens as interactive HTML files
- SPEC.md at project root has full technical details including schema definitions
- Tailwind v4 CSS-first config with @theme directive for design tokens (--color-soil, --color-moss, etc.)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-15*
