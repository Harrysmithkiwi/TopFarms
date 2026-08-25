# Phase 1: Foundation - Research

**Researched:** 2026-03-15
**Domain:** Project scaffolding, Supabase schema + RLS, email/password auth with role fork, Tailwind v4 design system
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Auth UX Flow**
- Role selection happens during signup — "I'm an Employer" / "I'm a Seeker" is a step in the signup form, routing to different onboarding immediately after
- Split-screen layout for auth pages: left side farm imagery/branding, right side auth form
- Email verification: redirect to a "check your inbox" page with resend link. Clicking the email link logs them in and starts onboarding
- Password reset: standard flow — forgot password → enter email → receive link → set new password → auto-login

**Design System Approach**
- Wireframes in TopFarms_Launch_Pack are the spec — follow them closely for layout, spacing, and component structure
- Radix UI primitives styled with Tailwind v4 — full control, no shadcn/ui opinions fighting the bespoke design system
- Animation: landing page only gets rich animation (counters, hero). Rest of app uses minimal, subtle transitions. Farm workers want speed, not spectacle
- Visual feel: earthy and professional — warm soil/moss tones, clean typography, trustworthy. Premium rural brand, not tech startup

**Dashboard Shells**
- Navigation: top navbar with logo/user menu + left sidebar for navigation items. Main content area
- Employer first login: onboarding prompt — clear CTA "Complete your farm profile to start posting jobs" with progress indicator, guides into wizard
- Seeker first login: onboarding prompt — "Complete your profile to start matching with jobs", guides into seeker wizard
- Mobile navigation (below 768px): hamburger menu — burger icon in top bar opens slide-out menu

**Schema Decisions**
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

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can create account with email and password, selecting role (Employer or Seeker) | Supabase Auth `signUp()` + `user_metadata` role storage at signup; `user_roles` table written by DB trigger or Edge Function post-signup |
| AUTH-02 | User receives email verification after signup | Supabase Auth built-in email confirmation; `confirmationURL` redirect to `/auth/verify` → `/onboarding/{role}` |
| AUTH-03 | User can reset password via email link | Supabase Auth `resetPasswordForEmail()` + `updateUser()` flow; auto-login via recovery token |
| AUTH-04 | User session persists across browser refresh | Supabase client stores session in `localStorage` by default; `onAuthStateChange` listener re-hydrates on load |
| AUTH-05 | User is routed to role-appropriate dashboard after login | `user_roles` table read on `onAuthStateChange`; React Router redirect based on role |
| DATA-01 | Full schema migrated: users, employer_profiles, seeker_profiles, jobs, applications, match_scores, skills, placement_fees, verification_tiers, etc. | 12 tables from SPEC Section 8 + `user_roles` + `seeker_contacts` (architecturally required); SQL migrations in `supabase/migrations/` |
| DATA-02 | Row Level Security policies on all tables enforcing role-based access | `user_roles` table as role authority; `security definer` functions to prevent recursion; RLS enabled on all tables; verified with `SET ROLE` |
| DATA-03 | Contact details (phone, email) masked at RLS level until placement fee acknowledged | `seeker_contacts` table (separate from `seeker_profiles`) with placement-fee-gated SELECT policy; contact fields never in `seeker_profiles` |
| DATA-04 | Skills master table seeded with ~40 dairy + sheep/beef skills with proficiency levels | SPEC Appendix B provides full seed list; SQL seed file in initial migration |
| DSGN-01 | Component library with Fraunces (display) + DM Sans (body) typography | Google Fonts `@import` in `index.css`; `--font-display` and `--font-body` CSS custom properties in `@theme` block |
| DSGN-02 | Colour palette tokens: soil, moss, fern, meadow, hay, cream + full palette | Tailwind v4 `@theme` directive in `index.css`; all 20 CSS custom properties from SPEC Section 4.2 |
| DSGN-03 | Reusable form components (inputs, selects, checkboxes, sliders, toggles) styled to design system | Radix UI primitives + Tailwind v4 classes; Button (4 variants), Input, Toggle (Radix Switch), Checkbox (Radix), Select (Radix) |
| DSGN-04 | Mobile-responsive layout system (320px minimum breakpoint) | Tailwind v4 responsive prefixes (`sm:`, `md:`, `lg:`); min-width: 320px in CSS; hamburger nav below 768px |
</phase_requirements>

---

## Summary

Phase 1 scaffolds everything that every subsequent phase builds on: a Vite 8 + React 19 + TypeScript project deployed on Vercel, a complete Supabase PostgreSQL schema with RLS enforced on every table, email/password authentication with employer/seeker role fork, and the full design system component library. No subsequent phase can begin without this foundation — schema decisions made here are expensive to reverse.

The three irreversible decisions this phase must get right are: (1) `seeker_contacts` as a separate table from `seeker_profiles` — contact fields must never be queryable by employers without a placement fee record; (2) `user_roles` as the role authority table — JWT metadata is client-readable and cannot be trusted for RLS; and (3) RLS policy design that avoids circular recursion via `security definer` helper functions. The existing project research (`.planning/research/PITFALLS.md`) documents all three as Phase 1 schema decisions with high recovery cost if deferred.

The design system is a fully bespoke implementation: Tailwind v4 CSS-first `@theme` configuration maps SPEC Section 4.2 colour tokens directly to utility classes, Radix UI primitives provide accessibility scaffolding, and all visual specifications are driven by the wireframes in `TopFarms_Launch_Pack/wireframes/`. The project is not yet scaffolded (no `src/`, `package.json`, or `supabase/` directories exist) — this phase creates all of it from scratch.

**Primary recommendation:** Scaffold the Vite project first with the full Tailwind v4 theme, then run the complete Supabase schema migration with RLS before writing a single React component. Validate RLS with `SET ROLE` tests before Phase 2 begins.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.4 | UI framework | Locked in SPEC. React 19 stable, full ecosystem support confirmed as of 2026-03-15. |
| TypeScript | 5.9.3 | Type safety | Locked. `@types/react` 19.x provides full React 19 types. |
| Vite | 8.0.0 | Build tool + dev server | Locked. `@tailwindcss/vite` plugin provides native Tailwind v4 integration. |
| Tailwind CSS | 4.2.1 | Utility-first styling | Locked. v4 `latest` tag. CSS-first `@theme` directive; no `tailwind.config.js`. |
| Supabase JS | 2.99.1 | Auth + PostgreSQL client | Locked. Handles email/password auth, session management, typed query builder. |
| `@supabase/ssr` | 0.9.0 | Server-side auth helpers | Required for cookie-based session in Vercel edge environment. |
| React Router | 7.13.1 | Client-side routing | Locked. v7 unified `react-router-dom` into `react-router`. Import from `react-router` only. |

### Supporting (Phase 1 scope)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@radix-ui/react-switch` | 1.2.6 | Toggle switches | Design system Toggle component |
| `@radix-ui/react-label` | 2.1.8 | Accessible form labels | All form inputs |
| `@radix-ui/react-checkbox` | 1.3.3 | Checkbox inputs | Design system Checkbox component |
| `@radix-ui/react-select` | 2.2.6 | Select dropdowns | Region selects, role selects in auth/onboarding |
| `@radix-ui/react-progress` | 1.1.8 | Progress bars | Wizard shell progress bar (Phase 2+, but build in design system now) |
| `@radix-ui/react-dialog` | 1.1.15 | Modal dialogs | Auth modals, placement fee modal (Phase 5) |
| `lucide-react` | 0.577.0 | Icons | Navigation icons, form field icons |
| `sonner` | 2.0.7 | Toast notifications | Success/error feedback throughout auth flow |
| `clsx` | 2.1.1 | Conditional class names | All component className logic |
| `tailwind-merge` | 3.5.0 | Merge Tailwind classes | Combine classes without conflicts — **must be v3, not v2** |
| `react-hook-form` | 7.71.2 | Form state | Auth forms (signup, login, password reset) |
| `@hookform/resolvers` | 5.2.2 | Zod adapter for RHF | Form validation bridge |
| `zod` | 4.3.6 | Schema validation | Auth form schemas — **use v4 from the start** |

### Dev Dependencies

| Tool | Version | Purpose |
|------|---------|---------|
| `@vitejs/plugin-react` | 6.0.1 | React Fast Refresh |
| `@tailwindcss/vite` | 4.2.1 | Tailwind v4 Vite plugin — **must match Tailwind version exactly** |
| `vitest` | 4.1.0 | Unit test runner |
| `@testing-library/react` | 16.3.2 | React component testing (React 19 support) |
| `@types/react` | 19.2.14 | TypeScript React types |
| `eslint` | 10.0.3 | Linting (flat config format) |
| `prettier` | 3.8.1 | Formatting |
| `prettier-plugin-tailwindcss` | latest | Tailwind class sorting |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw Radix UI + Tailwind v4 | shadcn/ui | shadcn/ui bundles Radix + Tailwind but imposes design opinions that conflict with the bespoke TopFarms system. Radix raw wins for a spec-driven bespoke design. |
| `react-router` v7 | TanStack Router | TanStack has stronger TS inference but higher setup cost. Not justified for this project. |
| `react-hook-form` + Zod v4 | Formik + yup | Formik uses controlled inputs (re-renders per keystroke). Zod v4 is TypeScript-first and infers types directly. RHF + Zod is strictly better for this use case. |
| `sonner` | `@radix-ui/react-toast` | Sonner is simpler, React 19-native, single `<Toaster>` provider. Radix Toast is more complex to set up for no gain in this context. |

**Installation:**
```bash
# Core framework
npm install react@19 react-dom@19 typescript

# Routing
npm install react-router

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Forms and validation
npm install react-hook-form @hookform/resolvers zod

# UI primitives (Phase 1 subset)
npm install @radix-ui/react-switch @radix-ui/react-label @radix-ui/react-checkbox \
  @radix-ui/react-select @radix-ui/react-progress @radix-ui/react-dialog

# Notifications and icons
npm install sonner lucide-react

# Utilities
npm install clsx tailwind-merge

# Dev dependencies
npm install -D vite@8 @vitejs/plugin-react tailwindcss @tailwindcss/vite \
  vitest @testing-library/react @types/react@19 @types/react-dom@19 \
  eslint prettier prettier-plugin-tailwindcss
```

---

## Architecture Patterns

### Recommended Project Structure (Phase 1 scope)

```
topfarms/
├── src/
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── Login.tsx              # /login
│   │   │   ├── SignUp.tsx             # /signup — includes role selection step
│   │   │   ├── VerifyEmail.tsx        # /auth/verify — "Check your inbox" page
│   │   │   ├── ForgotPassword.tsx     # /forgot-password
│   │   │   └── ResetPassword.tsx      # /auth/reset — set new password
│   │   ├── dashboard/
│   │   │   ├── EmployerDashboard.tsx  # /dashboard/employer — shell + onboarding prompt
│   │   │   └── SeekerDashboard.tsx    # /dashboard/seeker — shell + onboarding prompt
│   │   └── Home.tsx                   # / — skeleton (landing page built in Phase 6)
│   │
│   ├── components/
│   │   ├── ui/                        # Design system primitives (ALL built in Phase 1)
│   │   │   ├── Button.tsx             # 4 variants: primary, outline, ghost, hay
│   │   │   ├── Card.tsx               # white bg, fog border, 12px radius, 20px padding
│   │   │   ├── Tag.tsx                # 7 colour variants from SPEC Section 4.2
│   │   │   ├── MatchCircle.tsx        # 3 sizes × 3 colour states (moss/orange/red)
│   │   │   ├── InfoBox.tsx            # 5 variants: blue, hay, green, purple, red
│   │   │   ├── Input.tsx              # Fern focus ring, fog border, 8px radius
│   │   │   ├── Toggle.tsx             # Radix Switch styled to 34×18px pill
│   │   │   └── ProgressBar.tsx        # Gradient 3px bar for wizard progress
│   │   │
│   │   └── layout/
│   │       ├── Nav.tsx                # Soil 56px sticky, auth-aware, hamburger on mobile
│   │       ├── Sidebar.tsx            # Left sidebar navigation (auth-gated routes)
│   │       └── Footer.tsx             # Placeholder (full footer in Phase 6)
│   │
│   ├── hooks/
│   │   └── useAuth.ts                 # Auth session, user role, sign-in/out/up
│   │
│   ├── lib/
│   │   ├── supabase.ts                # Supabase browser client singleton
│   │   └── constants.ts               # NZ_REGIONS array (16 regions)
│   │
│   └── types/
│       ├── database.types.ts          # Auto-generated by Supabase CLI (after migration)
│       └── domain.ts                  # UserRole type, AuthState type
│
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql     # All 14 tables + indexes
│       ├── 002_rls_policies.sql       # RLS on all tables (with security definer helpers)
│       └── 003_skills_seed.sql        # ~40 skills from SPEC Appendix B
│
├── index.html
├── vite.config.ts
└── src/index.css                      # @import "tailwindcss" + full @theme block
```

### Pattern 1: Tailwind v4 CSS-First Configuration

**What:** All design tokens live in `src/index.css` under the `@theme` directive. No `tailwind.config.js` or `tailwind.config.ts` exists. The `@tailwindcss/vite` Vite plugin handles Tailwind processing — do NOT use PostCSS.

**When to use:** Everywhere. This is the only Tailwind v4 setup pattern for Vite projects.

**Example:**
```css
/* src/index.css */
@import "tailwindcss";

@theme {
  /* Colour palette from SPEC Section 4.2 */
  --color-soil: #2C1A0E;
  --color-soil-deep: #1E1108;
  --color-moss: #2D5016;
  --color-fern: #4A7C2F;
  --color-meadow: #7AAF3F;
  --color-hay: #D4A843;
  --color-hay-lt: #FFF8E7;
  --color-cream: #F7F2E8;
  --color-fog: #EEE8DC;
  --color-mist: #F2EEE6;
  --color-ink: #1A1208;
  --color-mid: #6B5D4A;
  --color-light: #9E8E78;
  --color-white: #FFFFFF;
  --color-red: #C0392B;
  --color-red-lt: #FDF0EEF;
  --color-blue: #1A5276;
  --color-blue-lt: #EAF4FB;
  --color-orange: #E67E22;
  --color-orange-lt: #FEF5EC;
  --color-purple: #6C3483;
  --color-purple-lt: #F5EEF8;
  --color-green-lt: #EAF5EA;

  /* Typography */
  --font-display: "Fraunces", serif;
  --font-body: "DM Sans", sans-serif;
  --font-mono: "DM Mono", monospace;
}

/* Google Fonts import */
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;1,9..144,400&family=DM+Sans:wght@300;400;500;600&display=swap');

body {
  font-family: var(--font-body);
  background-color: var(--color-cream);
  color: var(--color-ink);
}
```

With these tokens, Tailwind generates utilities like `bg-soil`, `text-moss`, `border-fog`, `font-display`, etc. automatically.

### Pattern 2: Supabase Auth with Role Fork

**What:** On signup, the user selects a role ("I'm an Employer" / "I'm a Seeker"). The role is written to a `user_roles` table (NOT stored as the sole source of truth in JWT metadata). A DB trigger or the client creates the `user_roles` row immediately after the Supabase `signUp()` call.

**When to use:** Every auth flow entry point. Role is determined once at signup and read from `user_roles` on every subsequent session.

**Example:**
```typescript
// src/hooks/useAuth.ts
import { supabase } from '@/lib/supabase'

export async function signUpWithRole(
  email: string,
  password: string,
  role: 'employer' | 'seeker'
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Store role hint in metadata for initial routing — NOT for security enforcement
      data: { role },
      emailRedirectTo: `${window.location.origin}/auth/verify`,
    },
  })

  if (error || !data.user) throw error

  // Write authoritative role to user_roles table
  // This is the RLS-trustworthy role record
  const { error: roleError } = await supabase
    .from('user_roles')
    .insert({ user_id: data.user.id, role })

  if (roleError) throw roleError

  return data
}
```

**Note:** If the `signUp()` succeeds but `user_roles` insert fails (e.g., network error), the user is in a broken state. Handle with a retry on next login: if `user_roles` row doesn't exist, prompt user to re-confirm their role. Alternatively, use a Supabase DB trigger on `auth.users` insert to create the `user_roles` row server-side — more reliable.

### Pattern 3: user_roles Table as RLS Role Authority

**What:** All RLS policies that need to distinguish employer from seeker must read from `user_roles`, not from `auth.jwt()->'user_metadata'->>'role'`. JWT metadata is client-writable and not a reliable security signal.

**When to use:** Every RLS policy that needs role-based access control.

**Example:**
```sql
-- supabase/migrations/002_rls_policies.sql

-- Helper function — security definer prevents recursion
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM user_roles WHERE user_id = $1 LIMIT 1;
$$;

-- Example: employer_profiles — employers can only read/write own records
CREATE POLICY "employer_profiles_own_access" ON employer_profiles
  FOR ALL
  USING (
    auth.uid() = user_id
    AND get_user_role(auth.uid()) = 'employer'
  );

-- Example: seeker_profiles — seekers can read own, employers cannot read contact fields
-- (contact fields live in seeker_contacts, not here)
CREATE POLICY "seeker_profiles_own_access" ON seeker_profiles
  FOR ALL
  USING (auth.uid() = user_id);

-- Employers can read seeker profile summaries (non-contact fields)
-- but seeker_profiles must never contain phone/email
CREATE POLICY "seeker_profiles_employer_read" ON seeker_profiles
  FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'employer'
    AND open_to_work = true  -- Only seekers actively looking
  );
```

### Pattern 4: seeker_contacts Table for Contact Masking

**What:** Phone and email for seekers are stored in a separate `seeker_contacts` table, not in `seeker_profiles`. The RLS policy on `seeker_contacts` only permits SELECT when a `placement_fees.acknowledged_at` record exists for the querying employer + this seeker. This makes it physically impossible for employers to access contact data before acknowledging the placement fee — not just UI-masked.

**When to use:** This is an architectural requirement, not a choice. It must be in the initial migration.

**Example:**
```sql
-- In 001_initial_schema.sql: create the table
CREATE TABLE seeker_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE seeker_contacts ENABLE ROW LEVEL SECURITY;

-- In 002_rls_policies.sql: gate contact access on placement fee
CREATE POLICY "seeker_contacts_self_read" ON seeker_contacts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "seeker_contacts_employer_read" ON seeker_contacts
  FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'employer'
    AND EXISTS (
      SELECT 1
      FROM placement_fees pf
      JOIN applications a ON a.id = pf.application_id
      JOIN jobs j ON j.id = a.job_id
      JOIN employer_profiles ep ON ep.id = j.employer_id
      JOIN seeker_profiles sp ON sp.id = a.seeker_id
      WHERE ep.user_id = auth.uid()
        AND sp.user_id = seeker_contacts.user_id
        AND pf.acknowledged_at IS NOT NULL
    )
  );
```

### Pattern 5: Supabase Auth Email Verification Flow

**What:** Supabase sends an email confirmation link after signup. The link redirects to `emailRedirectTo`. After clicking, `onAuthStateChange` fires with event `'SIGNED_IN'` and the session is established. The app must redirect the user to the appropriate onboarding route based on their role.

**When to use:** The `VerifyEmail.tsx` page handles the post-click state.

**Example:**
```typescript
// src/pages/auth/VerifyEmail.tsx
// Supabase redirects here after email link click
// URL contains #access_token and #refresh_token fragments
// The Supabase client auto-processes these on load

useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Get role and redirect to onboarding
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single()

        if (roleData?.role === 'employer') {
          navigate('/onboarding/employer')
        } else {
          navigate('/onboarding/seeker')
        }
      }
    }
  )
  return () => subscription.unsubscribe()
}, [navigate])
```

### Pattern 6: Password Reset Flow

**What:** User clicks "Forgot password" → enters email → `supabase.auth.resetPasswordForEmail()` sends link → user clicks link → redirected to `/auth/reset` → `onAuthStateChange` fires `'PASSWORD_RECOVERY'` → form shown → user submits new password → `supabase.auth.updateUser({ password })` → auto-login.

**Example:**
```typescript
// Trigger reset email
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/auth/reset`,
})

// On /auth/reset page — listen for PASSWORD_RECOVERY event
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    setCanSetPassword(true)
    // Show the "set new password" form
  }
})

// On form submit
await supabase.auth.updateUser({ password: newPassword })
// Supabase auto-logs user in after successful password update
```

### Pattern 7: Route Protection with React Router

**What:** Routes that require authentication use a `ProtectedRoute` component that checks the Supabase session. Role-specific routes additionally check `user_roles`. Redirects to `/login` if unauthenticated.

**Example:**
```typescript
// src/components/layout/ProtectedRoute.tsx
export function ProtectedRoute({
  children,
  requiredRole
}: {
  children: ReactNode
  requiredRole?: 'employer' | 'seeker'
}) {
  const { session, role, loading } = useAuth()

  if (loading) return <LoadingSkeleton />
  if (!session) return <Navigate to="/login" replace />
  if (requiredRole && role !== requiredRole) {
    return <Navigate to={`/dashboard/${role}`} replace />
  }

  return <>{children}</>
}
```

### Pattern 8: Design System Component Architecture

**What:** All UI primitives in `src/components/ui/` are stateless, prop-driven components. They accept `className` for overrides (use `cn()` = `clsx` + `tailwind-merge`). No business logic in primitives.

**Example: Button component**
```typescript
// src/components/ui/Button.tsx
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'hay'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-moss text-white hover:bg-fern',
  outline: 'bg-white border border-moss text-moss hover:bg-mist',
  ghost: 'border border-fog text-mid hover:border-mid',
  hay: 'bg-hay text-soil hover:opacity-90',
}

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'font-body text-[13px] font-bold rounded-[8px] px-4 py-2 transition-all duration-200',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
```

### Anti-Patterns to Avoid

- **Role in JWT metadata only:** Never use `auth.jwt()->'user_metadata'->>'role'` as the security gate in RLS policies. JWT metadata is client-readable. Use `user_roles` table via `get_user_role()` security definer.
- **Contact fields in seeker_profiles:** Any field named `phone`, `email`, `mobile`, or `contact_*` must not exist in `seeker_profiles`. Period. They belong in `seeker_contacts` with the placement fee gate.
- **Enabling RLS after inserting data:** Enable RLS as the first action after creating every table — `ALTER TABLE [table] ENABLE ROW LEVEL SECURITY`. Do not insert seed data before RLS is enabled.
- **`tailwind-merge` v2 with Tailwind v4:** v2 does not understand Tailwind v4 CSS variable–based class names. Must use v3.x.
- **`react-router-dom` instead of `react-router`:** In v7, `react-router-dom` is deprecated. Import from `react-router` directly.
- **PostCSS for Tailwind:** Use `@tailwindcss/vite` plugin in `vite.config.ts`. Do not configure Tailwind via PostCSS in Vite projects.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email/password auth with session management | Custom JWT system | Supabase Auth | Session refresh, token storage, email confirmation, password reset — all handled; 400+ edge cases |
| Form validation with error messages | Custom validation functions | Zod v4 + React Hook Form | Type inference, async validation, nested schema support — weeks of work |
| Accessible select dropdowns | Custom `<select>` styled component | `@radix-ui/react-select` | Keyboard navigation, screen reader announcements, scroll virtualisation — the WAI-ARIA spec alone is 3,000 words |
| Accessible toggle/switch | Custom checkbox styled as toggle | `@radix-ui/react-switch` | ARIA `role="switch"`, keyboard activation, checked state management |
| Toast/notification system | Custom notification state | `sonner` | Portal rendering, queue management, position variants, auto-dismiss with progress — all done |
| CSS class merging | Custom `cn()` implementation | `clsx` + `tailwind-merge` | Tailwind-specific conflict resolution (e.g., `bg-moss bg-fern` → keeps last) |
| Database migrations | Hand-run SQL in Supabase UI | Supabase CLI migrations | Version control, repeatable deploys, CI/CD integration |

**Key insight:** Auth and form infrastructure are domains where "build it yourself for full control" produces 80% of the capability with 400% of the maintenance burden. The listed libraries handle edge cases (token refresh race conditions, form re-render loops, accessibility state machines) that will emerge only in production.

---

## Common Pitfalls

### Pitfall 1: Contact Fields in seeker_profiles

**What goes wrong:** Developer adds `phone` and `email` columns to `seeker_profiles` for convenience. Any employer SELECT on `seeker_profiles` (which they must do for search results) returns contact data. The RLS policy would need to suppress specific columns — PostgreSQL RLS cannot mask individual columns natively without a view or security definer function.

**Why it happens:** The auth flow sets `email` on `auth.users`. It feels natural to copy it to `seeker_profiles` for easy access. The separation feels over-engineered before the placement fee feature exists.

**How to avoid:** Create `seeker_contacts` in the first migration. Store only ag-specific fields in `seeker_profiles`. The user's auth email is already in `auth.users` — seekers don't need it duplicated in their profile. The `seeker_contacts.email` is for the employer-visible contact release.

**Warning signs:** Any column named `email`, `phone`, or `mobile` in `seeker_profiles`.

---

### Pitfall 2: user_roles Not Created Atomically with auth.users

**What goes wrong:** `supabase.auth.signUp()` succeeds and returns the user. The client then tries to insert into `user_roles`. A network timeout, race condition, or client close before completion leaves the user with no role record. On next login, `get_user_role()` returns NULL, RLS policies fail open or closed inconsistently, and the user cannot be routed correctly.

**Why it happens:** Sequential client-side operations after auth signup are not atomic.

**How to avoid:** Use a Supabase database trigger on `auth.users` INSERT to create the `user_roles` row server-side. Pass the desired role via `options.data.role` in `signUp()` — the trigger reads `raw_user_meta_data->>'role'` to set the authoritative `user_roles.role`. This is atomic with the user creation.

```sql
-- In 002_rls_policies.sql or a separate trigger migration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'seeker')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

**Warning signs:** `user_roles` populated client-side only; no trigger on `auth.users`.

---

### Pitfall 3: RLS Infinite Recursion via Cross-Table Policy References

**What goes wrong:** A policy on `jobs` checks `employer_profiles` to validate the employer. A policy on `employer_profiles` references `jobs` to check if jobs exist. PostgreSQL detects the cycle and throws `ERROR: infinite recursion detected in policy for relation`. This crashes queries silently in development (error only appears in Supabase logs, not always in the client response).

**Why it happens:** Job marketplace schemas are naturally circular. Jobs reference employers, applications reference jobs and seekers, match_scores reference both.

**How to avoid:** Use `security definer` helper functions that read the base tables (like `user_roles`) without triggering their own RLS evaluation. The `get_user_role()` function pattern above is the correct approach. Never write a policy whose `USING` clause JOINs back to a table whose policy JOINs forward to the current table.

**Warning signs:** Any `USING` clause with more than one table JOIN; policies that reference the same table they're protecting.

---

### Pitfall 4: Tailwind v4 @theme Token Naming Collision

**What goes wrong:** Tailwind v4 uses CSS custom properties with the `--color-*` namespace for colour tokens. If tokens are named without the `--color-` prefix in `@theme` (e.g., `--soil` instead of `--color-soil`), Tailwind does not automatically generate `bg-soil`, `text-soil`, etc. utilities. The tokens work as raw CSS variables but are not available as Tailwind utility classes.

**Why it happens:** The SPEC Section 4.2 defines tokens as `--soil`, `--moss`, etc. (without the `--color-` prefix). Tailwind v4's `@theme` requires the `--color-` prefix for colour utilities.

**How to avoid:** Use `--color-soil`, `--color-moss`, etc. in the `@theme` block. Then Tailwind generates `bg-soil`, `text-soil`, `border-soil`, etc. correctly. The raw CSS variables (`--color-soil`) are also available as custom properties for the SPEC's direct CSS usage (e.g., `rgba(var(--color-soil), 0.1)` — note: Tailwind v4 registers colours with the actual hex value, not as `rgb()` components, so `rgba()` usage requires the hex to be converted to RGB values separately).

**Warning signs:** Tokens defined as `--soil: #2C1A0E` (no `--color-` prefix) in `@theme`; `bg-soil` utility class not working.

---

### Pitfall 5: Supabase Email Verification Redirect Handling

**What goes wrong:** The `emailRedirectTo` URL is set, the user clicks the email link, and Supabase appends `#access_token=...&refresh_token=...&type=signup` to the URL hash. If the React app doesn't have a route at that URL, or if the route exists but doesn't call `supabase.auth.getSession()` or listen to `onAuthStateChange`, the tokens in the URL hash are never processed. The user sees a blank page or the landing page without being logged in.

**Why it happens:** URL hash fragments (`#`) don't trigger server-side routing. The Supabase client must be initialised before the route renders to pick up the hash tokens. SPAs sometimes defer Supabase client init.

**How to avoid:** Ensure the Supabase client singleton is initialised at app startup, not lazily. The `VerifyEmail.tsx` page at `/auth/verify` must call `supabase.auth.getSession()` on mount (which processes the URL hash) and listen to `onAuthStateChange` for the `'SIGNED_IN'` event. Do not use `window.location.hash` to manually parse tokens.

**Warning signs:** User clicks email link, lands on correct URL with hash, but is not logged in; Supabase session is null after email confirmation.

---

### Pitfall 6: RLS Not Enabled on New Tables

**What goes wrong:** Supabase tables are public by default — any authenticated user can SELECT, INSERT, UPDATE, DELETE any row. Running `CREATE TABLE seeker_contacts (...)` without `ALTER TABLE seeker_contacts ENABLE ROW LEVEL SECURITY` leaves the table fully exposed until policies are added. If seed data is inserted before RLS is enabled and policies are written, the window of exposure includes the migration run itself.

**Why it happens:** RLS enable is easy to forget when writing migration SQL. Supabase Dashboard creates tables with RLS disabled by default for convenience.

**How to avoid:** Enable RLS immediately after every `CREATE TABLE` statement in the same migration file, before any INSERT. Use a consistent pattern:

```sql
CREATE TABLE seeker_contacts (...);
ALTER TABLE seeker_contacts ENABLE ROW LEVEL SECURITY;
-- policies immediately follow in 002_rls_policies.sql
```

Add a post-migration validation query as a check:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
-- Should return 0 rows
```

**Warning signs:** Any table in `pg_tables` where `rowsecurity = false` after running migrations.

---

## Code Examples

Verified patterns from official sources and the project research:

### Vite + Tailwind v4 Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // @tailwindcss/vite replaces postcss — do NOT add postcss config
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

```typescript
// tsconfig.json — path alias support
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Supabase Client Singleton

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Session persists in localStorage by default — covers AUTH-04
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // Processes #access_token hash on redirect
  },
})
```

### Auth Hook

```typescript
// src/hooks/useAuth.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

type UserRole = 'employer' | 'seeker' | null

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<UserRole>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadRole(session.user.id)
      else setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        if (session) {
          await loadRole(session.user.id)
        } else {
          setRole(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function loadRole(userId: string) {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single()
    setRole(data?.role ?? null)
    setLoading(false)
  }

  return { session, role, loading }
}
```

### React Router Setup

```typescript
// src/main.tsx
import { createBrowserRouter, RouterProvider } from 'react-router'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <SignUp /> },
  { path: '/auth/verify', element: <VerifyEmail /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
  { path: '/auth/reset', element: <ResetPassword /> },
  {
    path: '/dashboard/employer',
    element: (
      <ProtectedRoute requiredRole="employer">
        <EmployerDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard/seeker',
    element: (
      <ProtectedRoute requiredRole="seeker">
        <SeekerDashboard />
      </ProtectedRoute>
    ),
  },
  { path: '/onboarding/employer', element: <ProtectedRoute requiredRole="employer"><EmployerOnboarding /></ProtectedRoute> },
  { path: '/onboarding/seeker', element: <ProtectedRoute requiredRole="seeker"><SeekerOnboarding /></ProtectedRoute> },
  { path: '/jobs', element: <JobSearch /> },
  { path: '/jobs/:id', element: <JobDetail /> },
  { path: '/employers/:id', element: <EmployerProfile /> },
])
```

### Initial Schema Migration (structure)

```sql
-- supabase/migrations/001_initial_schema.sql

-- user_roles: authoritative role record (MUST exist before all other tables)
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('employer', 'seeker', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)  -- One role per user (enforce at DB level)
);
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- seeker_contacts: MUST be separate from seeker_profiles
CREATE TABLE seeker_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE seeker_contacts ENABLE ROW LEVEL SECURITY;

-- All other tables from SPEC Section 8...
-- (employer_profiles, seeker_profiles, jobs, skills, job_skills,
--  seeker_skills, match_scores, applications, listing_fees,
--  placement_fees, message_threads, messages)
-- Each followed immediately by ENABLE ROW LEVEL SECURITY
```

### Skills Seed Data

```sql
-- supabase/migrations/003_skills_seed.sql
-- ~40 skills from SPEC Appendix B

INSERT INTO skills (name, category, sector) VALUES
  -- Dairy — Milking
  ('Rotary milking', 'milking', 'dairy'),
  ('Herringbone milking', 'milking', 'dairy'),
  ('AMS/robotic milking', 'milking', 'dairy'),
  ('Swing-over milking', 'milking', 'dairy'),
  ('Milk quality and hygiene', 'milking', 'dairy'),
  ('Teat scoring and mastitis detection', 'milking', 'dairy'),
  ('Cluster attachment and post-dip', 'milking', 'dairy'),

  -- Dairy — Livestock
  ('Herd health monitoring', 'livestock', 'dairy'),
  ('Calving assistance', 'livestock', 'dairy'),
  ('AI (artificial insemination)', 'livestock', 'dairy'),
  ('Body condition scoring', 'livestock', 'dairy'),
  ('Calf rearing', 'livestock', 'dairy'),
  ('Feeding systems (TMR/pasture/supplements)', 'livestock', 'dairy'),

  -- Dairy — Qualifications
  ('DairyNZ Level 1', 'qualification', 'dairy'),
  ('DairyNZ Level 2', 'qualification', 'dairy'),
  ('DairyNZ Level 3', 'qualification', 'dairy'),
  ('DairyNZ Level 4', 'qualification', 'dairy'),
  ('DairyNZ Level 5', 'qualification', 'dairy'),

  -- Sheep & Beef
  ('Lamb marking and docking', 'livestock', 'sheep_beef'),
  ('Shearing (operator)', 'livestock', 'sheep_beef'),
  ('Shearing (shed hand)', 'livestock', 'sheep_beef'),
  ('Mustering (on foot)', 'livestock', 'sheep_beef'),
  ('Mustering (motorbike)', 'livestock', 'sheep_beef'),
  ('Mustering (helicopter)', 'livestock', 'sheep_beef'),
  ('Stock handling and yards', 'livestock', 'sheep_beef'),
  ('Drench and vaccination', 'livestock', 'sheep_beef'),
  ('Condition scoring and drafting', 'livestock', 'sheep_beef'),

  -- Machinery & Equipment (both sectors)
  ('Tractor operation (general)', 'machinery', 'both'),
  ('Tractor (loader)', 'machinery', 'both'),
  ('Irrigation systems', 'machinery', 'both'),
  ('Effluent systems', 'machinery', 'dairy'),
  ('Feed out equipment', 'machinery', 'both'),
  ('Farm motorbike', 'machinery', 'both'),
  ('ATV/quad bike', 'machinery', 'both'),
  ('Chainsaw operation', 'machinery', 'both'),

  -- Farm Management (both sectors)
  ('Pasture management', 'management', 'both'),
  ('Record keeping (MINDA)', 'management', 'dairy'),
  ('Staff supervision and rostering', 'management', 'both'),
  ('H&S compliance', 'compliance', 'both'),
  ('Budget management', 'management', 'both');
```

### MatchCircle Design System Component

```typescript
// src/components/ui/MatchCircle.tsx
import { cn } from '@/lib/utils'

type CircleSize = 'sm' | 'md' | 'lg'  // 38px / 50px / 72px

interface MatchCircleProps {
  score: number
  size?: CircleSize
  className?: string
}

const sizes: Record<CircleSize, { outer: string; text: string }> = {
  sm: { outer: 'w-[38px] h-[38px] text-[13px]', text: 'text-[13px]' },
  md: { outer: 'w-[50px] h-[50px] text-[16px]', text: 'text-[16px]' },
  lg: { outer: 'w-[72px] h-[72px] text-[24px]', text: 'text-[24px]' },
}

function getScoreVariant(score: number) {
  if (score >= 80) return 'bg-[rgba(45,80,22,0.08)] border-[rgba(45,80,22,0.2)] text-moss'
  if (score >= 60) return 'bg-orange-lt border-orange text-orange'
  return 'bg-red-lt border-red text-red'
}

export function MatchCircle({ score, size = 'md', className }: MatchCircleProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full border-[1.5px] font-display font-bold',
        sizes[size].outer,
        getScoreVariant(score),
        className
      )}
    >
      <span className={sizes[size].text}>{score}%</span>
    </div>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` with `theme.extend.colors` | CSS `@theme` directive in `index.css` | Tailwind v4 (stable 2025) | No JS config file; tokens are native CSS custom properties; `tailwind-merge` v3 required |
| `react-router-dom` (separate package) | `react-router` (unified) | React Router v7 (2024) | Import from `react-router` only; `react-router-dom` is a thin re-export shim in v7 |
| Zod v3 `.parse()` + `@hookform/resolvers` v4 | Zod v4 + `@hookform/resolvers` v5 | 2025 | New error format; resolvers v5 required for Zod v4; do NOT mix versions |
| `framer-motion` package | `motion` package | motion v12 (2024–2025) | Same library, unified package name; import from `motion/react` |
| `supabase.auth.user()` (deprecated) | `supabase.auth.getUser()` or `onAuthStateChange` | Supabase v2 | `getUser()` validates against auth server; `user()` was client-cache only |
| PostCSS for Tailwind in Vite | `@tailwindcss/vite` plugin | Tailwind v4 | Faster builds, simpler config; PostCSS path is legacy for Vite projects |

**Deprecated / outdated:**
- `raw_user_meta_data` in JWT for role enforcement: still works technically, but is a security anti-pattern — not trustworthy for RLS
- `tailwind.config.js` with `content` array: not needed in Tailwind v4 (automatic content detection)
- `postcss.config.js` with `tailwindcss` plugin for Vite projects: replaced by `@tailwindcss/vite`

---

## Open Questions

1. **Vite 8 + `@tailwindcss/vite` peer dependency compatibility**
   - What we know: `@tailwindcss/vite` 4.2.1 lists peer dep `vite: '^5.2.0 || ^6 || ^7'`; Vite 8 is not explicitly listed
   - What's unclear: Whether the peer dep range has been updated to include Vite 8, or whether it works via the v7 extension pattern
   - Recommendation: Run `npm install` and observe warnings. If peer dep conflict, downgrade to Vite 7 (functionally equivalent for this project). Alternatively, check `@tailwindcss/vite` npm page for updated peer dep ranges at install time.

2. **Supabase Auth trigger on `auth.users` — available in hosted plan?**
   - What we know: PostgreSQL triggers on `auth.users` are documented as supported in Supabase (the `handle_new_user` pattern is in official Supabase docs)
   - What's unclear: Whether the Supabase free/pro tier restricts writing triggers to the `auth` schema
   - Recommendation: Test during Supabase project setup. If restricted, fall back to client-side `user_roles` insert with error recovery logic (check for missing role on every login).

3. **Zod v4 + `@hookform/resolvers` v5 import paths**
   - What we know: Resolvers v5 supports Zod v4; correct import is `import { zodResolver } from '@hookform/resolvers/zod'`
   - What's unclear: Whether any import paths changed between resolvers v4 and v5
   - Recommendation: Verify on first form implementation in Phase 1 (the signup form). Document correct import in a `SETUP_NOTES.md` or code comment immediately.

4. **seeker_contacts email vs auth.users email**
   - What we know: `auth.users.email` exists for every user; `seeker_contacts.email` is meant for the employer-released contact record
   - What's unclear: Should `seeker_contacts.email` duplicate `auth.users.email`, or is it a different contact email? For MVP, they are likely the same.
   - Recommendation: Populate `seeker_contacts.email` from `auth.users.email` at seeker signup via the DB trigger. The seeker can update it later. This keeps `seeker_profiles` contact-free while still having a contactable email behind the RLS gate.

---

## Sources

### Primary (HIGH confidence)
- `.planning/research/STACK.md` — all library versions verified against npm registry 2026-03-15
- `.planning/research/ARCHITECTURE.md` — project structure, RLS patterns, Edge Function patterns; source: SPEC.md + Supabase docs
- `.planning/research/PITFALLS.md` — RLS recursion, contact masking, user_roles table pattern; source: PostgreSQL + Supabase official docs
- `SPEC.md v3.0` — authoritative schema (Section 8), design system (Section 4), RLS policies (Section 13.2), skills seed (Appendix B), Milestone 1 requirements (Section 15)
- `.planning/phases/01-foundation/01-CONTEXT.md` — locked user decisions for this phase

### Secondary (MEDIUM confidence)
- Supabase Auth docs (official, training data Aug 2025) — `signUp()`, `onAuthStateChange`, `resetPasswordForEmail()`, `updateUser()` patterns
- Supabase RLS docs (official, training data Aug 2025) — `security definer` functions, `ENABLE ROW LEVEL SECURITY`, trigger-on-auth-users pattern
- Tailwind CSS v4 docs (official, training data Aug 2025) — `@theme` directive, `@tailwindcss/vite` plugin, CSS custom property naming

### Tertiary (LOW confidence — verify on first use)
- `@tailwindcss/vite` Vite 8 compatibility — peer dep says `^5-7`, actual v8 compatibility unconfirmed until `npm install`
- `@hookform/resolvers` v5 exact import paths for Zod v4 — verify on first form implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions from verified npm registry data in `.planning/research/STACK.md`
- Architecture: HIGH — patterns from SPEC.md + established Supabase conventions in `.planning/research/ARCHITECTURE.md`
- Auth patterns: HIGH — Supabase Auth official docs (training Aug 2025); flow is stable since Supabase v2
- RLS patterns: HIGH — PostgreSQL core behaviour; `security definer` pattern is well-documented; contact separation is critical and confirmed
- Design system: HIGH — SPEC Section 4 is the authoritative spec; Tailwind v4 `@theme` pattern confirmed in `.planning/research/STACK.md`
- Pitfalls: HIGH for structural decisions (contact masking, user_roles), MEDIUM for version-specific gotchas (Tailwind v4 naming, Vite 8 peer dep)

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (30 days — stable libraries, no breaking changes expected in this window)
