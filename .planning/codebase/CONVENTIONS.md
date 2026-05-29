# Coding Conventions

**Analysis Date:** 2026-05-29

## Naming Patterns

**Files:**
- **React Components:** PascalCase, one component per file. Example: `Button.tsx`, `ChipSelector.tsx`, `DocumentUploader.tsx` in `src/components/ui/`
- **Pages:** PascalCase. Example: `SignUp.tsx`, `JobSearch.tsx`, `AdminDocumentsQueue.tsx` in `src/pages/`
- **Wizard/Step Components:** `Step{N}{Name}.tsx`. Example: `JobStep1Basics.tsx`, `JobStep2FarmDetails.tsx`, `SeekerStep2Experience.tsx` in `src/pages/{feature}/steps/`
- **Contexts:** PascalCase. Example: `AuthContext.tsx` in `src/contexts/`
- **Utilities/Helpers:** camelCase. Example: `getPasswordStrength()` (inline helper), `loadRole()` in `src/contexts/AuthContext.tsx`
- **Test Files:** `{feature}.test.ts` or `{feature}.test.tsx` in `tests/` at repo root. Example: `signup-toast-persistence.test.tsx`, `featured-listings-tier-type.test.ts`

**Functions:**
- **React Components:** PascalCase (exported). Example: `export function SignUp()` at `src/pages/auth/SignUp.tsx:34`
- **Helper Functions:** camelCase. Example: `getPasswordStrength()`, `loadRole()`, `onRoleSelect()` at `src/pages/auth/SignUp.tsx:77-80`
- **Event Handlers:** camelCase, prefix with `handle` or `on`. Example: `handleOAuth()`, `onSubmit()`, `onRoleSelect()` at `src/pages/auth/SignUp.tsx:41-103`
- **Hooks:** camelCase, must start with `use`. Example: `useAuth()` at `src/hooks/useAuth.tsx`

**Variables:**
- **Constants at Module Level:** UPPERCASE_SNAKE_CASE (module-scoped data arrays). Example: `ROLE_TYPE_OPTIONS`, `CONTRACT_TYPE_OPTIONS`, `NZ_REGIONS` at `src/pages/jobs/steps/JobStep1Basics.tsx:27-61`
- **Local State Variables:** camelCase. Example: `showPassword`, `isSubmitting`, `selectedRole` at `src/pages/auth/SignUp.tsx:37-56`
- **Boolean Flags:** prefix with `is` or `has`. Example: `isSubmitting`, `isActive`, `isOpen` across codebase
- **Zod Schema Variables:** lowercase, suffix `schema`. Example: `schema` (const) at `src/pages/auth/SignUp.tsx:11`, `JobStep1Basics.tsx:9`
- **Type Inferred from Schema:** `type FormValues = z.infer<typeof schema>` at `src/pages/auth/SignUp.tsx:18`, `type FormData = z.infer<typeof schema>` at `src/pages/jobs/steps/JobStep1Basics.tsx:20`

**Types:**
- **Interfaces:** PascalCase, suffix `Props` for component props. Example: `interface ButtonProps`, `interface Step1Props` at `src/pages/jobs/steps/JobStep1Basics.tsx:22-25`
- **Return Types:** PascalCase. Example: `interface AuthHookReturn` at `src/contexts/AuthContext.tsx:6`
- **Domain/Enum Types:** PascalCase or string union. Example: `type UserRole`, `type FormValues` derived from schema
- **Outcome/Result Types:** Discriminated unions for success/failure. Example: `type LoadRoleOutcome = | { ok: true; role: UserRole | null; isActive: boolean } | { ok: false; reason: 'timeout' }` at `src/contexts/AuthContext.tsx:59-61`

## Code Style

**Formatting:**
- **Formatter:** Prettier (configured via dependencies, no `.prettierrc` file checked in)
- **Line Length:** No explicit limit enforced; implicit ~100-120 character wrap observed in source
- **Semicolons:** Enforced (visible in all source files)
- **Trailing Commas:** Multiline structures include trailing commas
- **Indentation:** 2 spaces (standard TypeScript/React convention)

**Linting:**
- **Tool:** ESLint v9.23.0 (no `.eslintrc.json` or `eslint.config.js` checked in; may rely on package defaults)
- **Strictness:** TypeScript strict mode enforced in `tsconfig.app.json`:
  - `"strict": true`
  - `"noUnusedLocals": true`
  - `"noUnusedParameters": true`
  - `"noFallthroughCasesInSwitch": true`
  - `"noUncheckedSideEffectImports": true`
- **Key Rules Applied:** Must provide TypeScript types, no unused imports/variables, all switch cases handled

## Import Organization

**Order:**
1. React and third-party framework imports (`react`, `react-dom`, `react-router`, `react-hook-form`, `zod`)
2. Third-party UI/utility libraries (`@radix-ui/*`, `lucide-react`, `sonner`)
3. Internal imports from `@/` alias
4. Relative imports (rare; prefer `@/` for clarity)

**Example (SignUp.tsx:1-9):**
```typescript
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Eye, EyeOff, Building2, User } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { useAuth } from '@/hooks/useAuth'
```

**Path Aliases:**
- `@/*` → `./src/*` (tsconfig.app.json:28-30)
- Always use `@/` prefix for internal imports (components, utils, types, hooks, contexts, lib)

## Data Validation & Forms

**Validation Framework:**
- **Zod** v3.24.2 for schema definition (with `@hookform/resolvers` v5.0.1)
- **react-hook-form** v7.55.0 for form state + submission

**Pattern (JobStep1Basics.tsx:9-20 precedent):**
```typescript
const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  sector: z.string().min(1, 'Please select a sector'),
  contract_type: z.enum(['permanent', 'contract', 'casual'], {
    required_error: 'Select a contract type',
  }),
  start_date: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema),
})
```

**Key Practices:**
- Define Zod schema at module level before component definition
- Infer TypeScript type from schema (`z.infer<typeof schema>`)
- Use `zodResolver` to bridge react-hook-form and Zod
- Error messages in Zod `.min()`, `.email()`, `.refine()` are user-facing
- Terms/checkbox validation via `.refine()` with custom message (SignUp.tsx:15)

## Consuming Data: Supabase Integration

**Client Initialization:**
- Import singleton from `@/lib/supabase`: `import { supabase } from '@/lib/supabase'`
- **Read-only Queries:** `supabase.from('table_name').select().eq(...).single()` or `.maybeSingle()`
- **RPC Calls:** `supabase.rpc('function_name', { p_arg1, p_arg2 })` with SECURITY DEFINER functions (no legacy direct table access for protected operations)
- **Type Casting:** Non-autogenerated RPC functions use `as never` type cast. Example: `supabase.rpc('admin_list_document_queue', {...} as never)` per PHASE 20-05 STATE pattern

**AuthContext Pattern (src/contexts/AuthContext.tsx):**
```typescript
async function loadRole(userId: string): Promise<{ role: UserRole | null; isActive: boolean }> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role, is_active')
    .eq('user_id', userId)
    .single()
  if (error || !data) return { role: null, isActive: true }
  return {
    role: data.role as UserRole,
    isActive: data.is_active ?? true,
  }
}
```

**Error Handling Pattern:**
- Always check `.error` field in response tuple: `const { data, error } = await supabase.from(...)`
- Return sensible defaults on error (see `loadRole` above: `isActive=true` when DB fails so a transient error doesn't wrongly suspend a user)
- For RPC cascades with timeouts, use discriminated union outcomes. Example: `type LoadRoleOutcome = | { ok: true; ... } | { ok: false; reason: 'timeout' }` at AuthContext.tsx:59-61

## Error Handling & User Feedback

**Toast Notifications (Sonner):**
- **Import:** `import { toast } from 'sonner'`
- **Success:** `toast.success('Message')` for non-critical confirmations (optional options)
- **Error — Persistent:** `toast.error(message, { duration: Infinity, closeButton: true })` for user-facing validation or auth failures that require action (SIGNUP-01 precedent at SignUp.tsx:88-90). Duration must be Infinity so users cannot accidentally dismiss and miss the error.
- **Error — Transient:** `toast.error(message)` for brief system messages (optional options; default 4s duration)

**Example (SignUp.tsx:82-102):**
```typescript
const onSubmit = async (data: FormValues) => {
  setIsSubmitting(true)
  try {
    const result = await signUpWithRole(data.email, data.password, data.role)
    if (result.error) {
      toast.error(result.error.message, {
        duration: Infinity,
        closeButton: true,  // SIGNUP-01 precedent
      })
    } else {
      navigate('/auth/verify')
    }
  } catch {
    toast.error('An unexpected error occurred. Please try again.', {
      duration: Infinity,
      closeButton: true,
    })
  } finally {
    setIsSubmitting(false)
  }
}
```

**Console Logging:**
- Avoid console.log for production code; prefer structured logging when needed
- Temporary instrumentation (e.g., `console.time()` / `console.timeEnd()`) is acceptable during debugging phases (example: AuthContext.tsx:36-42 for AUTH-FIX-02 diagnostic)
- Remove diagnostic logging before final commit unless explicitly marked as persistent instrumentation

## Conditional Rendering & UI Visibility

**Conditional Rendering:**
- Use ternary operators or logical `&&` for simple cases
- Use explicit `{condition ? <ComponentA /> : <ComponentB />}` over nested `&&` chains for clarity
- Avoid rendering undefined; use `{value ?? 'fallback'}` or `{value || ''}` for string rendering

**CSS Classes:**
- **Utility Library:** Tailwind CSS v4 (via `@tailwindcss/vite`)
- **Class Merging:** Use `clsx()` (from `clsx` v2.1.1) for conditional classes, or inline Tailwind
- **Bespoke UI Primitive Classes:** Use exported `cn()` util from `@/lib/utils` for merging variant classes (Button.tsx:31)
- **Style Objects:** Avoid inline styles; prefer CSS variables for theme values (Button.tsx:118-121: `style={{ backgroundColor: '#1877F2', color: '#FFFFFF' }}` is exception for OAuth button branding)

## Component Composition

**Props Interface Pattern:**
- Define `interface XyzProps` with explicit prop list, avoid spreading unknown props
- Extend HTML element props when needed: `interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: ... }`
- Pass through `...props` only if documented (Button.tsx:40)

**Children Prop:**
- Accept via `children: ReactNode` or implicit in props destructuring
- Children are always available in props destructuring (`{ children }`)

**Ref Forwarding:**
- Use `forwardRef()` when parent needs DOM access (not observed in codebase; follows React convention if needed)

## State Management & Hooks

**useState Pattern:**
- Single responsibility per useState hook
- Boolean state prefixed with `is` or `has`: `const [showPassword, setShowPassword] = useState(false)`
- Use callbacks to avoid closure stale-state bugs: `const onRoleSelect = (role: ...) => { setSelectedRole(role); setValue('role', role) }`

**useEffect Pattern:**
- Include dependency array always
- No cleanup needed unless subscribing to events or timers
- AuthContext precedent (sync user role on session change): useEffect runs once on mount if user is authenticated

**useAuth Hook (custom):**
- Import from `@/hooks/useAuth`
- Returns: `{ session, role, isActive, loading, signUpWithRole, signIn, signOut, ... }`
- Used in protected components to conditionally render/redirect

**useForm (react-hook-form):**
- Destructure `register`, `handleSubmit`, `watch`, `setValue`, `formState: { errors }`
- Pass `handleSubmit(onSubmit)` to form's onSubmit handler
- Pair with `Controller` for non-standard inputs (JobStep1Basics.tsx:1 imports it)

## Async & Error Boundaries

**Promise Handling:**
- Use `async/await` (modern, more readable than `.then()` chains)
- Always wrap async code in try/catch for error handling
- No unhandled promise rejections; catch all async operations
- Set `isLoading` or `isSubmitting` state before async work, reset in finally block (SignUp.tsx precedent)

**Timeouts & Race Conditions:**
- Use `Promise.race()` for timeout protection on long-running operations (AuthContext.tsx:68-78 loadRoleWithTimeout pattern)
- Default race timeout: 3s for auth checks; adjust based on operation SLA
- Log timeout events with `console.warn()` for observability

## Comment Style

**JSDoc/TSDoc:**
- Used for complex functions and exports (not observed as strict requirement; sparse in codebase)
- Prefer self-documenting code (clear function/variable names) over comments
- Inline comments for non-obvious logic (e.g., "gate email/password rendering on selectedRole" at SignUp.tsx:68)
- File-level comments for test intent: PHASE + FEATURE_ID, what flips GREEN/RED, mock strategy (signup-toast-persistence.test.tsx:1-13 precedent)

**TODO / FIXME:**
- When adding band-aid code, mark with `// [TICKET-ID]` prefix (e.g., `// [AUTH-FIX-02]` at AuthContext.tsx:34)
- Include brief explanation of why the band-aid exists and when it should be removed
- Do NOT mark as TODO/FIXME without a ticket number (that makes it unmergeable)

## Atomic Commit Discipline

Per CLAUDE.md §4: One phase (or sub-phase) per commit. Each commit should be atomically reviewable.

**Commit Message Format:**
- Subject: `type(scope): description` (e.g., `feat(auth): add JWT validation`)
- Body: Explain WHY, not WHAT (the diff shows WHAT)
- All commits include: `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`

**Example Commit Bodies (from project history):**
- `docs(22): create phase plan — 6 plans across 4 waves for Pre-Launch P0 Closure`
- `feat(wave-17-04): add quick-load dropdown for saved searches — implements SRCH-14`

---

*Convention analysis: 2026-05-29*
