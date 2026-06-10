import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { dashboardPathFor } from '@/lib/routing'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: 'employer' | 'seeker' | 'admin'
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { session, role, isActive, loading } = useAuth()

  if (loading) {
    return (
      <div className="bg-bg flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="border-border border-t-moss h-10 w-10 animate-spin rounded-full border-4"
            aria-label="Loading"
          />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Loading...
          </p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Guard against the AUTH-FIX 3s loadRole timeout flipping loading=false
  // with role=null when the user actually has a role. Without this, ProtectedRoute
  // bounces the user to /auth/select-role on every page nav where loadRole races
  // past 3s; SelectRole then redirects again once role resolves, producing a visible
  // pinwheel ending on /dashboard/${role}. See AUTH-FIX-02 in REQUIREMENTS.md.
  // Edge case: a real OAuth-new-user with no user_roles row will see a perpetual
  // spinner here instead of bouncing to /auth/select-role; documented escape hatch
  // is manual nav. Acceptable for MVP.
  if (requiredRole && role === null) {
    return (
      <div className="bg-bg flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="border-border border-t-moss h-10 w-10 animate-spin rounded-full border-4"
            aria-label="Loading"
          />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Loading...
          </p>
        </div>
      </div>
    )
  }

  // Phase 21 IS-ACTIVE-01: suspended user (admin flipped is_active=false via
  // ProfileDrawer) is gated to /suspended. This check sits AFTER the AUTH-FIX-02
  // role-null spinner (Pitfall 1 — checking before would flash /suspended for
  // users whose loadRole is still resolving). The /suspended route itself is
  // unprotected (Wave 3 plan 21-05) so a session user can land there.
  if (isActive === false) {
    return <Navigate to="/suspended" replace />
  }

  // New OAuth user: has session but no role yet — redirect to role selection
  if (!role) {
    return <Navigate to="/auth/select-role" replace />
  }

  if (requiredRole && role !== requiredRole) {
    const dest = dashboardPathFor(role)
    return <Navigate to={dest} replace />
  }

  return <>{children}</>
}
