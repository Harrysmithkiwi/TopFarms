---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [vite, react, typescript, tailwind, supabase, postgresql, rls]

# Dependency graph
requires: []
provides:
  - Vite 6 + React 19 + TypeScript project scaffolded and building
  - Tailwind v4 CSS-first theme with 23 colour tokens and 3 font families
  - 14-table PostgreSQL schema with RLS enabled on every table
  - seeker_contacts separate from seeker_profiles (contact masking architecture)
  - user_roles table with handle_new_user() trigger for atomic role assignment
  - get_user_role() security definer function for safe RLS checks
  - ~40 skills seed across dairy milking, livestock, qualifications, sheep & beef, machinery, management
  - Supabase client singleton (src/lib/supabase.ts)
  - cn() utility, NZ_REGIONS constant, UserRole/AuthState domain types
affects: [01-02-auth, 01-03-design-system, 02-employer, 03-seeker, 04-matching, 05-payments]

# Tech tracking
tech-stack:
  added:
    - vite@6 + @vitejs/plugin-react
    - react@19 + react-dom@19
    - typescript@5.8
    - "@tailwindcss/vite (Tailwind v4 CSS-first)"
    - react-router@7 (unified package, not react-router-dom)
    - "@supabase/supabase-js@2 + @supabase/ssr"
    - react-hook-form@7 + "@hookform/resolvers@5 + zod@3"
    - "@radix-ui/react-switch, checkbox, label, select, progress, dialog"
    - sonner@2 (toast notifications)
    - lucide-react (icons)
    - clsx + tailwind-merge@3 (v3 required for Tailwind v4 CSS variable classes)
    - vitest + "@testing-library/react"
  patterns:
    - Tailwind v4 CSS-first config via @theme directive (no tailwind.config.js)
    - Path alias @ -> ./src in both vite.config.ts and tsconfig.app.json
    - Supabase RLS with security definer helper function to prevent recursion
    - Contact masking via separate seeker_contacts table with placement fee gate
    - user_roles as authoritative role source (never trust JWT raw_user_meta_data)

key-files:
  created:
    - src/index.css (Tailwind v4 @theme with all colour tokens + Google Fonts)
    - src/App.tsx (placeholder confirming font-display + text-soil + bg-cream)
    - src/main.tsx (React 19 entry point)
    - src/lib/supabase.ts (Supabase client singleton)
    - src/lib/utils.ts (cn helper using clsx + tailwind-merge)
    - src/lib/constants.ts (NZ_REGIONS array of 16 regions)
    - src/types/domain.ts (UserRole, AuthState types)
    - supabase/migrations/001_initial_schema.sql (14 tables with RLS)
    - supabase/migrations/002_rls_policies.sql (all RLS policies + trigger)
    - supabase/migrations/003_skills_seed.sql (40 skills)
    - vite.config.ts
    - tsconfig.json + tsconfig.app.json + tsconfig.node.json
    - package.json + package-lock.json
    - .env.example + .gitignore + index.html
  modified: []

key-decisions:
  - "Use @tailwindcss/vite (not PostCSS) for Tailwind v4 — CSS-first @theme directive, no tailwind.config.js"
  - "seeker_contacts is a SEPARATE table from seeker_profiles — phone/email never exposed in seeker_profiles SELECT"
  - "user_roles table is authoritative role source for RLS — get_user_role() is security definer to prevent recursion"
  - "handle_new_user() trigger creates user_roles row atomically with auth.users creation, defaulting to seeker"
  - "tailwind-merge@3 required (v2 does not support Tailwind v4 CSS variable classes)"
  - "react-router@7 unified package used (not react-router-dom)"
  - "Google Fonts @import placed before @import tailwindcss to avoid CSS import order warning"

patterns-established:
  - "Pattern 1: All RLS tables use get_user_role(auth.uid()) not JWT metadata for role checks"
  - "Pattern 2: Contact data lives in seeker_contacts, employer access gated on placement_fees.acknowledged_at IS NOT NULL"
  - "Pattern 3: Tailwind utility classes use CSS variable tokens — bg-soil, text-moss, font-display resolve from @theme"
  - "Pattern 4: Path alias @/* maps to src/* — use in all future imports"

requirements-completed: [DATA-01, DATA-02, DATA-03, DATA-04, DSGN-01, DSGN-02]

# Metrics
duration: 5min
completed: 2026-03-15
---

# Phase 1 Plan 1: Project Scaffold and Database Foundation Summary

**Vite 6 + React 19 + TypeScript project with Tailwind v4 CSS-first theme and 14-table Supabase schema with RLS, contact masking via seeker_contacts, and 40-skill seed dataset**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-15T08:12:59Z
- **Completed:** 2026-03-15T08:17:59Z
- **Tasks:** 2
- **Files modified:** 19

## Accomplishments

- Vite 6 + React 19 + TypeScript project builds cleanly with zero TypeScript errors
- Tailwind v4 CSS-first @theme with 23 colour tokens (soil, moss, cream, hay, fern, etc.) and Fraunces/DM Sans/DM Mono fonts — all utility classes (bg-soil, text-moss, font-display) resolve correctly
- Complete 14-table PostgreSQL schema with RLS enabled immediately after each CREATE TABLE, seeker_contacts architecturally separate from seeker_profiles, user_roles trigger for atomic role assignment on signup, and ~40 skills seeded

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Vite + React + TypeScript project with Tailwind v4 theme** - `b845979` (feat)
2. **Task 2: Create Supabase schema migration, RLS policies, and skills seed** - `830fa56` (feat)

## Files Created/Modified

- `package.json` - All project dependencies (react, react-router, supabase, radix-ui, zod, tailwind-merge@3, etc.)
- `vite.config.ts` - @tailwindcss/vite plugin + @ path alias
- `tsconfig.app.json` / `tsconfig.node.json` / `tsconfig.json` - TypeScript config with baseUrl and paths
- `index.html` - HTML entry point
- `src/index.css` - Tailwind v4 @theme with 23 colour tokens and Google Fonts imports
- `src/main.tsx` - React 19 entry point
- `src/App.tsx` - Placeholder using font-display, text-soil, bg-cream, text-moss
- `src/lib/utils.ts` - cn() helper (clsx + tailwind-merge)
- `src/lib/constants.ts` - NZ_REGIONS (all 16 NZ regions)
- `src/lib/supabase.ts` - Supabase client singleton with persistSession/autoRefreshToken
- `src/types/domain.ts` - UserRole, AuthState types
- `supabase/migrations/001_initial_schema.sql` - 14 tables, all with ENABLE ROW LEVEL SECURITY
- `supabase/migrations/002_rls_policies.sql` - get_user_role() + handle_new_user() + all RLS policies
- `supabase/migrations/003_skills_seed.sql` - 40 skills across dairy, sheep_beef, both sectors
- `.env.example` - VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
- `.gitignore` - node_modules, dist, .env, .DS_Store

## Decisions Made

- Google Fonts @import placed before @import tailwindcss to avoid CSS preprocessor order warning
- tailwind-merge@3 selected (v2 incompatible with Tailwind v4 CSS variable classes)
- react-router@7 unified package (not react-router-dom)
- Supabase client uses untyped createClient for now — generated types come after migrations run against live DB

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- `npm create vite@latest . --template react-ts` cancelled because directory was not empty (has .git). Resolved by creating all project files manually (same outcome as scaffolding).
- CSS import order warning (Google Fonts @import after @tailwindcss) resolved by reordering imports.

## User Setup Required

**External services require manual configuration.** Before running migrations:

1. Create a Supabase project at https://supabase.com/dashboard
2. Copy `VITE_SUPABASE_URL` from Settings > API > Project URL
3. Copy `VITE_SUPABASE_ANON_KEY` from Settings > API > anon/public key
4. Create `.env` file from `.env.example` with these values
5. Run migrations: `supabase db push` or paste SQL files directly in Supabase SQL editor
6. Verify: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false` should return 0 rows

## Next Phase Readiness

- Project scaffolded and TypeScript compiling — ready for auth flow (Plan 02)
- Design system CSS tokens defined — ready for component library (Plan 03)
- Migration files ready to run against Supabase — user must provide credentials
- Supabase credentials and migrations must be applied before Plan 02 auth work

---
*Phase: 01-foundation*
*Completed: 2026-03-15*
