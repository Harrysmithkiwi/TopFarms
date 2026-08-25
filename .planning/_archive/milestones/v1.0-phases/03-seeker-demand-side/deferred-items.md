# Deferred Items — Phase 03 Seeker Demand Side

## Pre-existing TypeScript Errors (out of scope)

These errors exist in files not modified by Phase 03 plans and were present before Phase 03 execution:

- `src/hooks/useAuth.ts`: ReturnType double-Promise type wrapping (lines 98-102) — TS interface mismatch with Supabase types
- `src/components/ui/SkillsPicker.tsx:20`: `RequirementLevel` declared but unused
- `src/lib/stripe.ts:3`: `ImportMeta.env` not typed
- `src/lib/supabase.ts:3-4`: `ImportMeta.env` not typed
- `src/main.tsx:5`: Cannot find module `./index.css` (type declaration missing)
- `src/main.tsx:45`: `OnboardingPlaceholder` declared but unused
- `src/pages/onboarding/EmployerOnboarding.tsx:205`: Type `string | undefined` not assignable to `"dairy" | "sheep_beef" | undefined`

**Note:** `vite build` (bundling) passes successfully. The `tsc -b` strict check fails due to above pre-existing issues.
