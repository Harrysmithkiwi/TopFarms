# Stack Research

**Domain:** Agricultural job marketplace (NZ)
**Researched:** 2026-03-15
**Confidence:** HIGH — core stack locked in SPEC.md; all versions verified via npm registry

---

## Stack Status

The core stack is **locked** in SPEC.md. This document confirms current stable versions,
identifies every supporting library needed to ship the MVP, and flags version-sensitive
compatibility decisions (Tailwind v4, React Router v7, Zod v4).

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React | 19.2.4 | UI framework | Locked. React 19 stable — improved server actions, use() hook, optimistic updates. Minor API changes from v18 but all key libs now support it. |
| TypeScript | 5.9.3 | Type safety | Locked. Full React 19 type support in @types/react 19.x. |
| Vite | 8.0.0 | Build tool + dev server | Locked. v8 is a major jump from v6; fast HMR, native ESM, excellent Tailwind v4 plugin support via `@tailwindcss/vite`. |
| Tailwind CSS | 4.2.1 | Utility-first styling | Locked. **v4 is now stable** (`latest` tag). CSS-first config (no `tailwind.config.js`), CSS custom properties native, significantly faster builds. Required for the TopFarms design token approach. |
| Supabase | 2.99.1 | PostgreSQL DB + Auth + Storage + Edge Functions | Locked. Managed Postgres with Row Level Security (all tables), built-in Auth for email/password flow, Storage for document/photo uploads, Edge Functions for server-side logic (match scoring, Stripe webhooks). |
| Vercel | N/A (platform) | Frontend hosting + Edge runtime | Locked. Zero-config Vite deployments, edge network for NZ-proximate delivery, preview deployments per PR. |
| Claude API (`claude-sonnet-4-20250514`) | via `@anthropic-ai/sdk` 0.78.0 | AI match explanations | Locked. Sonnet model balances cost and quality for the 2-3 sentence match insight use case. Called from Supabase Edge Function to avoid exposing API key client-side. |
| Stripe | Node SDK 20.4.1 | Listing fee payments + placement acknowledgement | Locked. PaymentIntent API for listing fees, webhook handling for payment confirmation, customer billing portal for subscription management. |

### Tailwind v4 Important Notes

**Tailwind v4 is a breaking change from v3.** Key differences affecting this project:

- No `tailwind.config.js` — configuration lives in CSS via `@theme` directive
- CSS custom properties are first-class — `--soil`, `--moss` etc. defined in `:root` map directly to Tailwind utilities
- Use `@tailwindcss/vite` plugin (not PostCSS) for Vite projects
- `@apply` works differently — prefer component classes via `@layer components`
- `tailwind-merge` 3.x is required (v2.x does not support Tailwind v4 class names)

Example Tailwind v4 setup for this project:
```css
/* src/index.css */
@import "tailwindcss";

@theme {
  --color-soil: #2C1A0E;
  --color-moss: #2D5016;
  --color-fern: #4A7C2F;
  --color-meadow: #7AAF3F;
  --color-hay: #D4A843;
  --color-cream: #F7F2E8;
  /* ... full palette */
  --font-display: "Fraunces", serif;
  --font-body: "DM Sans", sans-serif;
}
```

### Supporting Libraries

#### Routing

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-router` | 7.13.1 | Client-side routing | All route definitions. Use v7 (not v6 `react-router-dom` — v7 unified the package). Supports `createBrowserRouter` with loaders/actions for data-fetching patterns. |

**Note:** React Router v7 unified `react-router-dom` into `react-router`. Import from `react-router`. Peer deps require `react >= 18`.

#### Data Fetching & Server State

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tanstack/react-query` | 5.90.21 | Server state management | Wrap all Supabase calls. Handles caching, background refetch, optimistic updates. Critical for the search results page (stale-while-revalidate prevents flicker on filter changes). |

#### Forms & Validation

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-hook-form` | 7.71.2 | Form state management | All wizard forms (employer onboarding 8-screen, seeker onboarding 8-step, job posting 7-screen). Uncontrolled inputs = zero re-renders per keystroke. |
| `@hookform/resolvers` | 5.2.2 | Schema validation adapter | Required bridge between react-hook-form and Zod. |
| `zod` | 4.3.6 | Schema validation | All form schemas. **Zod v4 is a breaking change from v3** — new `.parse()` error format, faster parsing. Use v4 from the start, don't mix. |

#### UI Components (Radix UI Primitives)

Radix UI primitives provide accessible, unstyled components. Style with Tailwind v4 on top.

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@radix-ui/react-dialog` | 1.1.15 | Modal dialogs | Placement fee acknowledgement modal, verification upload modal |
| `@radix-ui/react-select` | 2.2.6 | Select dropdowns | Region, shed type, role type, herd size selects across all wizards |
| `@radix-ui/react-slider` | 1.3.6 | Range slider | Salary range filter (`$35k–$120k+` dual-handle slider on search) |
| `@radix-ui/react-tabs` | 1.1.13 | Tab panels | How-it-works section (seeker/employer toggle), job detail tabs |
| `@radix-ui/react-switch` | 1.2.6 | Toggle switches | Accommodation toggle, couples toggle, billing period toggle |
| `@radix-ui/react-progress` | 1.1.8 | Progress bars | Wizard step progress bar (3px gradient bar below nav) |
| `@radix-ui/react-label` | 2.1.8 | Accessible labels | All form inputs across wizards |
| `@radix-ui/react-checkbox` | 1.3.3 | Checkboxes | Filter sidebar checkboxes, skill requirement selectors |
| `@radix-ui/react-toast` | 1.2.15 | Toast notifications | Fallback; prefer Sonner (see below) |

#### Notifications

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `sonner` | 2.0.7 | Toast notifications | Application submitted, save successful, error states. Simpler API than Radix Toast; built for React 19. |

#### Icons

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | 0.577.0 | Icon set | All icons throughout the UI. Tree-shakeable, consistent stroke style, NZ-agriculture-appropriate icon library. |

#### Animation

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `motion` | 12.36.0 | Declarative animations | Landing page: `fadeUp` stagger on hero headline, live counter scroll reveal, card entrance. Use selectively — farm workers are practical users, not expecting heavy animation. |

**Note:** `motion` (formerly `framer-motion`) unified into a single package. Import from `motion/react` for React integration. Supports React 19.

#### File Uploads

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-dropzone` | 15.0.0 | Drag-and-drop file upload | Employer verification: document upload (Tier 4) and farm photo upload (Tier 5). Integrates with Supabase Storage for upload. |

#### Scroll & Intersection

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-intersection-observer` | 10.0.3 | Scroll-triggered animations | Landing page live counter animation trigger on scroll-into-view. |

#### Utilities

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `clsx` | 2.1.1 | Conditional class names | All className logic. |
| `tailwind-merge` | 3.5.0 | Merge Tailwind classes safely | Combine classes without conflicts. **Must use v3** — v2 does not support Tailwind v4 class names. |
| `date-fns` | 4.1.0 | Date formatting and manipulation | Application deadlines, listing expiry dates, posted-ago display. |

#### Email

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `resend` | 6.9.3 | Transactional email delivery | All transactional emails sent from Supabase Edge Functions: welcome, application received, shortlist notification, verification. |
| `react-email` | 5.2.9 | React-based email templates | Build HTML email templates using React components. Render server-side in Edge Functions, send via Resend. |

#### Stripe Integration (Client Side)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@stripe/stripe-js` | 8.9.0 | Stripe.js loader | Loads Stripe.js asynchronously. Required for PCI compliance. |
| `@stripe/react-stripe-js` | 5.6.1 | Stripe React components | `<Elements>` provider + `<PaymentElement>` for listing fee payment on Step 6 of job posting wizard. |

#### Security

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `dompurify` | 3.3.3 | HTML sanitisation | Sanitise any user-generated rich text before rendering. Apply to job descriptions and farm bios to prevent XSS. |

### Supabase Supporting Package

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@supabase/ssr` | 0.9.0 | Server-side Supabase helpers | Required for cookie-based auth in Vite/Vercel edge environment. Handles session refresh on the server side. Use with Vercel Edge Middleware for auth-protected routes. |

### Development Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| `@vitejs/plugin-react` | 6.0.1 | React Fast Refresh in Vite | Required. Use with `@tailwindcss/vite` (not PostCSS) for Tailwind v4. |
| `@tailwindcss/vite` | 4.2.1 | Tailwind v4 Vite integration | Replaces `postcss`/`autoprefixer` for Tailwind processing in Vite projects. |
| `vitest` | 4.1.0 | Unit test runner | Co-located with Vite config. Use `happy-dom` environment (faster than jsdom for this use case). |
| `@testing-library/react` | 16.3.2 | React component testing | Full React 19 support as of v16.3. |
| `@types/react` | 19.2.14 | TypeScript React types | Match React version (19.x). |
| `@types/react-dom` | (from @types/react) | TypeScript React DOM types | Match React version. |
| `eslint` | 10.0.3 | Code linting | Use `eslint.config.js` flat config format (required in ESLint v10). |
| `prettier` | 3.8.1 | Code formatting | Single-pass formatting. Configure Tailwind class sorting via `prettier-plugin-tailwindcss`. |
| `prettier-plugin-tailwindcss` | (latest) | Tailwind class sorting | Sorts Tailwind utilities in canonical order. Reduces merge conflicts on class strings. |

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `react-router` v7 | TanStack Router | If type-safe file-based routing is a priority from day one. TanStack Router has stronger TS inference but higher setup cost. Not worth it for this project size. |
| `@tanstack/react-query` | SWR | SWR is simpler but has no devtools, weaker mutation support, no prefetching. For a search-heavy marketplace with complex filter states, TanStack Query wins. |
| `react-hook-form` | Formik | Formik uses controlled inputs — every keystroke re-renders. With 8-screen wizards, uncontrolled (RHF) is the correct choice. |
| `zod` v4 | yup | Zod v4 is TypeScript-first, infers types directly from schemas. yup requires separate type declarations. Zod wins for TS projects. |
| Radix UI primitives | shadcn/ui | shadcn/ui bundles Radix + Tailwind but imposes its own design decisions. Since TopFarms has a strict, bespoke design system, raw Radix + Tailwind gives full control without fighting component opinions. |
| `sonner` | `react-hot-toast` | sonner is built for React 19 with portal-based rendering. react-hot-toast works but has less active maintenance. |
| `motion` (framer-motion) | CSS transitions | Complex entrance animations on landing page (stagger, counter reveal) require JS control. Use only on landing; all wizard/dashboard transitions should be CSS-only. |
| `resend` | AWS SES | Resend has a cleaner API, native React Email support, and a generous free tier (3,000 emails/month). SES has lower per-email cost at scale but is overkill for MVP. |
| `happy-dom` (Vitest env) | `jsdom` | happy-dom is 2-4x faster for Vitest. Only use jsdom if a specific browser API is missing. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| PostCSS for Tailwind | Tailwind v4 + Vite should use `@tailwindcss/vite` plugin, not the PostCSS path — the Vite plugin is faster and the recommended path per Tailwind v4 docs. | `@tailwindcss/vite` |
| `tailwind-merge` v2 | Does not understand Tailwind v4 CSS variable–based class names. Will fail to merge classes correctly. | `tailwind-merge` v3.5.0 |
| `react-router-dom` (as separate package) | In React Router v7, `react-router-dom` is deprecated — v7 unified into `react-router`. Installing `react-router-dom` at v7 installs a thin re-export shim. Import directly from `react-router`. | `react-router` |
| Zod v3 | Zod v4 is the `latest` tag. Mixing v3 and v4 resolver packages causes incompatibility. Start on v4. | `zod` v4.3.6 |
| `@radix-ui/react-toast` as primary toast | Toast is more complex to set up than Sonner. Sonner's `<Toaster>` provider pattern is simpler and sufficient for this use case. | `sonner` |
| Client-side Claude API calls | Exposing the Anthropic API key in the browser is a security violation. All Claude calls must go through a Supabase Edge Function. | Supabase Edge Function + server-side `@anthropic-ai/sdk` |
| `moment.js` | 300 KB bundle, deprecated. | `date-fns` v4 (tree-shakeable, ~2 KB per used function) |
| `axios` | Supabase client handles all API calls. Fetch is sufficient for any remaining HTTP needs. | Native `fetch` or Supabase client |
| MUI / Ant Design | Heavy component libraries impose design systems that conflict with the bespoke TopFarms design. They also ship large bundles. | Radix UI primitives + Tailwind v4 |

---

## Stack Patterns by Variant

**When calling Supabase from the client:**
- Use `@supabase/supabase-js` createBrowserClient
- Wrap in TanStack Query `useQuery` / `useMutation`
- RLS enforces access control — no custom middleware needed

**When calling Supabase from Edge Functions (Stripe webhooks, AI scoring, email):**
- Use `createClient` with the service role key (env var only, never client-exposed)
- Import `@anthropic-ai/sdk` server-side only in Edge Functions

**When implementing wizard forms:**
- Use `react-hook-form` with `useFormContext` to share state across steps
- Persist to localStorage between steps with `watch()` + `useEffect`
- Validate per-step with `trigger(['field1', 'field2'])` before advancing

**When implementing the match score display:**
- Scores are pre-computed on the server (Supabase Edge Function or DB trigger)
- Display scores from the `job_applications` join — never recompute client-side
- Use `motion` entrance animations only on first render of score circle

**When implementing contact masking (RLS):**
- Email/phone stored in `user_profiles` table, masked at PostgreSQL column level via RLS policy
- Policy: `contact_visible = true` only when `placement_fee_acknowledged = true`
- Do NOT rely on client-side conditional rendering — data is physically absent from API response

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `react` 19.2.4 | `@testing-library/react` ^16.3 | v16.3 added full React 19 support. |
| `react` 19.2.4 | `react-router` 7.x | Peer dep is `>=18`. Works. |
| `react` 19.2.4 | `motion` 12.x | Peer dep is `^18 || ^19`. Works. |
| `tailwindcss` 4.2.1 | `tailwind-merge` 3.x | **v3 required** — v2 breaks with Tailwind v4 class names. |
| `tailwindcss` 4.2.1 | `@tailwindcss/vite` 4.2.1 | Version must match Tailwind version exactly. |
| `vite` 8.0.0 | `@tailwindcss/vite` 4.2.1 | Peer dep: `vite: '^5.2.0 || ^6 || ^7'` — Vite 8 may not be listed but v7 pattern applies. **Verify on project init.** |
| `zod` 4.x | `@hookform/resolvers` 5.x | Resolvers v5 adds Zod v4 support. Do not use resolvers v4 with Zod v4. |
| `@anthropic-ai/sdk` 0.78.0 | Supabase Edge Functions (Deno) | Use the `deno` compatible import path. Test in Edge Function sandbox first. |

---

## Installation

```bash
# Core framework
npm install react@19 react-dom@19 typescript

# Routing
npm install react-router

# Data layer
npm install @supabase/supabase-js @supabase/ssr @tanstack/react-query

# Forms and validation
npm install react-hook-form @hookform/resolvers zod

# UI primitives
npm install @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-slider \
  @radix-ui/react-tabs @radix-ui/react-switch @radix-ui/react-progress \
  @radix-ui/react-label @radix-ui/react-checkbox @radix-ui/react-toast

# Notifications and icons
npm install sonner lucide-react

# Animation and scroll
npm install motion react-intersection-observer

# File upload
npm install react-dropzone

# Utilities
npm install clsx tailwind-merge date-fns dompurify

# Payments (client)
npm install @stripe/stripe-js @stripe/react-stripe-js

# Email (used in Edge Functions)
npm install resend react-email

# Dev dependencies
npm install -D vite@8 @vitejs/plugin-react tailwindcss @tailwindcss/vite \
  vitest @testing-library/react @types/react@19 @types/react-dom@19 \
  eslint prettier prettier-plugin-tailwindcss
```

**Edge Function dependencies** (Deno imports in Supabase Edge Functions):
```typescript
// In supabase/functions/[fn-name]/index.ts
import Anthropic from "npm:@anthropic-ai/sdk@0.78.0";
import Stripe from "npm:stripe@20.4.1";
import { Resend } from "npm:resend@6.9.3";
```

---

## Sources

- npm registry (queried 2026-03-15) — all version numbers verified via `npm info [pkg] dist-tags`
- `tailwindcss` dist-tags confirm v4.2.1 is `latest`, v3.4.19 is `v3-lts` — HIGH confidence
- `react-router` dist-tags confirm v7.13.1 is `latest` — HIGH confidence
- `react` dist-tags confirm v19.2.4 is stable — HIGH confidence
- `@testing-library/react` 16.3.2 peer deps confirm React 19 support — HIGH confidence
- Tailwind v4 Vite plugin note based on `@tailwindcss/vite` package existing at version 4.2.1 — HIGH confidence; no PostCSS peer dep
- Vite 8 + `@tailwindcss/vite` compatibility: peer dep lists `^5.2.0 || ^6 || ^7` but v8 pattern extends v7 — MEDIUM confidence, verify on init
- Zod v4 + resolvers v5 compatibility: confirmed from `@hookform/resolvers` 5.x peer dep requiring `react-hook-form ^7.55.0` — HIGH confidence for the pairing; Zod v4 support confirmed from resolvers changelog — MEDIUM confidence (verify import paths on init)
- `motion` package (formerly framer-motion) unified at v12.36.0 — HIGH confidence from npm registry

---
*Stack research for: NZ agricultural job marketplace (TopFarms)*
*Researched: 2026-03-15*
