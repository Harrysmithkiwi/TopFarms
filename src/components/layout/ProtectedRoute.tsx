import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '@/hooks/useAuth'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: 'employer' | 'seeker' | 'admin'
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { session, role, loading } = useAuth()

  if (loading) {
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

  // New OAuth user: has session but no role yet — redirect to role selection
  if (!role) {
    return <Navigate to="/auth/select-role" replace />
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to={`/dashboard/${role}`} replace />
  }

  return <>{children}</>
}
