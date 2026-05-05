import { useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { useAuth } from '@/hooks/useAuth'
import { dashboardPathFor } from '@/lib/routing'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { DailyBriefing } from '@/pages/admin/DailyBriefing'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const signInSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
type SignInForm = z.infer<typeof signInSchema>

// Spinner block — mirrors src/components/layout/ProtectedRoute.tsx:13-26 byte-for-byte.
// CONTEXT Q2 explicitly DEFERS extraction to a shared <AuthLoadingSpinner> primitive,
// so the inline duplication is intentional within the scope of Phase 20.1.
function SpinnerBlock() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-10 h-10 rounded-full border-4 border-border border-t-moss animate-spin"
          aria-label="Loading"
        />
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Loading...
        </p>
      </div>
    </div>
  )
}

// Inline access-denied (NOT redirect — per CONTEXT Q3 + RESEARCH Pitfall 3 Option A).
// Uses role="alert" div with --color-danger tokens; StatusBanner has a fixed variant
// enum with no 'error' member, so the planner-recommended pattern from Phase 20-05
// (ProfileDrawer error-display: inline role="alert" + --color-danger tokens) is reused.
function AccessDeniedView({ role }: { role: 'employer' | 'seeker' }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6">
      <div className="w-full max-w-md flex flex-col gap-4">
        <div
          role="alert"
          className="rounded-[12px] border-[1.5px] p-4"
          style={{
            backgroundColor: 'var(--color-danger-bg)',
            borderColor: 'var(--color-danger)',
            color: 'var(--color-danger)',
          }}
        >
          <p className="text-[16px] font-semibold font-body">
            Access denied
          </p>
          <p
            className="text-[14px] font-body mt-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Your account does not have admin privileges.
          </p>
        </div>
        <Link
          to={dashboardPathFor(role)}
          className="inline-flex items-center justify-center px-4 py-2 rounded-[8px] font-body font-medium text-sm"
          style={{
            backgroundColor: 'var(--color-brand)',
            color: 'var(--color-bg)',
          }}
        >
          Back to your dashboard
        </Link>
      </div>
    </div>
  )
}

// Standalone admin login form. Email + password ONLY (CONTEXT GA-1).
// No OAuth providers. No useNavigate (RESEARCH Pitfall 9 — let AuthContext drive
// the post-login render via AdminGate's re-render rather than racing the role-load).
export function AdminLoginPage() {
  const { signIn } = useAuth()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
  })

  // Per RESEARCH Pitfall 9: do NOT navigate manually after signIn().
  // AdminGate re-renders via AuthContext state-change and routes to the right branch
  // (admin -> AdminLayout, non-admin -> AccessDeniedView).
  async function onSubmit(values: SignInForm) {
    setSubmitError(null)
    const result = await signIn(values.email, values.password)
    if (result.error) {
      setSubmitError(result.error.message || 'Sign in failed. Please try again.')
    }
    // On success: do nothing. AuthContext fires SIGNED_IN, AdminGate re-renders.
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <p
            className="text-xs font-body uppercase tracking-wide"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Admin login
          </p>
          <h1
            className="text-2xl font-display font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            Sign in to TopFarms admin
          </h1>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            {...register('email')}
            error={errors.email?.message}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
            error={errors.password?.message}
          />

          {submitError && (
            <div
              role="alert"
              className="rounded-[8px] border p-3 text-sm font-body"
              style={{
                backgroundColor: 'var(--color-danger-bg)',
                borderColor: 'var(--color-danger)',
                color: 'var(--color-danger)',
              }}
            >
              {submitError}
            </div>
          )}

          <Button type="submit" variant="primary" size="md" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <div
          className="flex flex-col gap-2 text-sm font-body"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <Link to="/forgot-password" style={{ color: 'var(--color-brand)' }}>
            Forgot password?
          </Link>
          <Link to="/" style={{ color: 'var(--color-brand)' }}>
            Back to main site
          </Link>
        </div>
      </div>
    </div>
  )
}

// AdminGate — hybrid route component. Branches on auth state.
// Mirrors ProtectedRoute.tsx decision tree but INVERTS the unauthenticated branch
// (renders AdminLoginPage in-place instead of redirecting to /login).
//
// Branching order is LOAD-BEARING (RESEARCH Pitfall 1, Pattern 1):
//   1. loading           -> spinner          (mirrors ProtectedRoute.tsx:13-26)
//   2. !session          -> AdminLoginPage   (the inversion vs ProtectedRoute)
//   3. role === null     -> spinner          (AUTH-FIX-02 race window;
//                                             mirrors ProtectedRoute.tsx:41-55;
//                                             MUST come before the role !== 'admin' check)
//   4. role !== 'admin'  -> AccessDeniedView (inline, NOT redirect — CONTEXT Q3)
//   5. role === 'admin'  -> AdminLayout + DailyBriefing
export function AdminGate() {
  const { session, role, loading } = useAuth()

  if (loading) {
    return <SpinnerBlock />
  }

  if (!session) {
    return <AdminLoginPage />
  }

  if (role === null) {
    return <SpinnerBlock />
  }

  if (role !== 'admin') {
    return <AccessDeniedView role={role} />
  }

  return (
    <AdminLayout>
      <DailyBriefing />
    </AdminLayout>
  )
}
