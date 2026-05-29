# Technology Stack

**Analysis Date:** 2026-05-29

## Languages

**Primary:**
- TypeScript ~5.8.3 - Frontend SPA and Edge Function handlers (type-safe development)
- Deno - Edge Function runtime (server-side handlers)

**Secondary:**
- SQL - Postgres migrations and stored procedures (database schema)
- HTML/CSS - Email templates in Edge Functions (Resend transactional emails)

## Runtime

**Environment:**
- Node.js (for local development and build tooling via Vite)
- Deno (for Edge Function execution in Supabase environment)

**Package Manager:**
- pnpm (inferred from project structure as default modern package manager)
- Lockfile: `.pnpm-lock.yaml` (implied; not explicitly read)

## Frameworks

**Core:**
- React 19.1.0 - Frontend UI library
- React Router 7.5.0 - Client-side routing (SPA navigation)
- Vite 6.3.1 - Build tool and dev server (frontend bundler)

**UI Components:**
- Radix UI (checkbox, dialog, label, progress, select, slider, switch) - Unstyled, accessible component primitives
- Lucide React 0.487.0 - Icon library
- Tailwind CSS (via `@tailwindcss/vite` 4.1.3) - Utility-first CSS framework
- Sonner 2.0.3 - Toast notification library
- Motion 12.38.0 - Animation library (framer-motion equivalent)

**Forms:**
- React Hook Form 7.55.0 - Form state management
- @hookform/resolvers 5.0.1 - Schema validation resolver
- Zod 3.24.2 - TypeScript-first schema validation

**File Handling:**
- React Dropzone 15.0.0 - Drag-and-drop file upload

**Utilities:**
- clsx 2.1.1 - Conditional className utility
- tailwind-merge 3.2.0 - Intelligent Tailwind class merging

**Payment:**
- @stripe/react-stripe-js 5.6.1 - React bindings for Stripe.js
- @stripe/stripe-js 8.9.0 - Stripe client library
- Stripe (via Edge Functions via `https://esm.sh/stripe@14`) - Server-side payment processing

**Database:**
- @supabase/supabase-js 2.49.4 - Supabase JavaScript client (frontend auth + data access)
- @supabase/ssr 0.6.1 - Server-side rendering support for Supabase auth

## Key Dependencies

**Critical:**
- React 19.1.0 - Core UI framework; provides component model and hooks
- React Router 7.5.0 - Enables SPA with client-side navigation (no page reloads)
- Vite 6.3.1 - Fast bundler critical for dev feedback loop and production build
- TypeScript ~5.8.3 - Type safety across codebase; builds with tsc -b

**Infrastructure:**
- @supabase/supabase-js 2.49.4 - Bridges frontend to Supabase (auth, realtime, RPC, storage)
- @supabase/ssr 0.6.1 - Handles auth cookie integration for server-side auth flows

## Build & Dev

**Build Tool:**
- Vite 6.3.1 - Frontend build (config: `vite.config.ts`)
- @vitejs/plugin-react 4.4.1 - React Fast Refresh for dev server
- @tailwindcss/vite 4.1.3 - Tailwind CSS processor (Vite plugin)

**Type Checking:**
- TypeScript 5.8.3 - `npm run typecheck` runs `tsc -b` (composite project mode)

**Testing:**
- Vitest 3.1.1 - Unit test runner (config: `vitest.config.*`)
- @testing-library/react 16.3.0 - React component testing utilities
- @testing-library/jest-dom 6.9.1 - Custom DOM matchers
- @testing-library/user-event 14.6.1 - User interaction simulation
- jsdom 29.0.0 - DOM implementation for Node.js test environment

**Linting & Formatting:**
- ESLint 9.23.0 - JavaScript/TypeScript linter (config: eslint.config.* not detected in root; likely using flat config)
- Prettier 3.5.3 - Code formatter
- prettier-plugin-tailwindcss 0.6.11 - Tailwind class sorting for Prettier
- globals 16.0.0 - ESLint global variables registry

## Configuration

**Environment:**
- `.env*` files (not read per security policy) - Environment variables for Supabase, Stripe, Resend URLs/keys
- Runtime discovery via `Deno.env.get()` in Edge Functions

**Build:**
- `vite.config.ts` - Vite bundler config; React Fast Refresh + Tailwind plugin + path alias (`@/*` → `src/`)
- `tsconfig.json` - Root TypeScript config references `tsconfig.app.json` (frontend) and `tsconfig.node.json` (build tooling)
- `tsconfig.app.json` - Frontend TypeScript settings: ES2020 target, JSX react-jsx, strict mode, path alias
- `vercel.json` - Vercel deployment config; SPA rewrites to `/index.html`, output directory `dist/`
- `supabase/config.toml` - Edge Function per-function settings (verify_jwt, CORS, secrets) — Phase 15 pin-down

## Platform Requirements

**Development:**
- Node.js (for pnpm, Vite dev server, TypeScript compilation)
- Deno CLI (if testing Edge Functions locally)
- Supabase CLI 2.95.4 (for migrations, local dev, functions deploy — locked in GitHub Actions)

**Production:**
- Vercel - Frontend hosting (SPA deployed to `dist/` directory)
- Supabase (Postgres database + Auth + Edge Functions + Storage + pg_net)
- Stripe - Payment processing
- Resend - Transactional email delivery

---

*Stack analysis: 2026-05-29*
