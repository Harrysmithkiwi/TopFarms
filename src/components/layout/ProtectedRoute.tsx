import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { RouteSkeleton } from '@/components/ui/Skeleton'
import { AccessDenied } from '@/components/layout/AccessDenied'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: 'employer' | 'seeker' | 'admin'
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { session, role, isActive, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="bg-bg min-h-screen">
        <RouteSkeleton />
      </div>
    )
  }

  if (!session) {
    // Carry the interrupted destination so Login can put the user back where
    // they were heading, not on a generic dashboard (src/lib/returnTo.ts).
    return (
      <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
    )
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
      <div className="bg-bg min-h-screen">
        <RouteSkeleton />
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

  // docs/DESIGN.md §5 Unauthorised: render the access-denied view, never a redirect
  // that bounces the user back to where they started. This previously did
  // <Navigate to={dashboardPathFor(role)} />, which told the user nothing about why
  // they could not be where they asked to be, and made every wrong-role URL a silent
  // no-op. One guard, 24 routes, all three portals.
  if (requiredRole && role !== requiredRole) {
    return <AccessDenied requiredRole={requiredRole} role={role} />
  }

  return <>{children}</>
}
