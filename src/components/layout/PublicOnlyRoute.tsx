import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { RouteSkeleton } from '@/components/ui/Skeleton'
import { dashboardPathFor } from '@/lib/routing'

/**
 * The mirror of ProtectedRoute: these pages are for people who are NOT signed in.
 *
 * Found by pre-launch UAT on live prod, 2026-08-24. `/login` and `/signup` rendered
 * normally for an already-authenticated user, so a signed-in employer who clicked
 * "Post a job" on the landing page — the page's single most important employer action —
 * landed on "Create your account" for an account they already had. Same for a signed-in
 * seeker clicking "Create a profile" in the footer, and for anyone returning to /login
 * with a live session.
 *
 * Fixed here rather than in each CTA on purpose. The landing page, the footer, the nav
 * and every future entry point all funnel through these two routes; one guard closes
 * them all, and a CTA added in six months is covered without anyone remembering to.
 *
 * The state machine deliberately mirrors ProtectedRoute's, including its hard-won
 * cases:
 *   - `loading`: show the skeleton, never a flash of the signup form.
 *   - suspended (`isActive === false`): /suspended owns that user, not their dashboard.
 *   - session but no role yet (a new OAuth user mid-signup): let them THROUGH. Sending
 *     them to a dashboard they have no role for would trap them in the redirect loop
 *     AUTH-FIX-02 exists to prevent, and /auth/select-role is reached from the signup
 *     flow itself.
 */
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { session, role, isActive, loading } = useAuth()

  if (loading) {
    return (
      <div className="bg-bg min-h-screen">
        <RouteSkeleton />
      </div>
    )
  }

  if (!session) return <>{children}</>

  if (isActive === false) return <Navigate to="/suspended" replace />

  // Signed in with no role resolved yet: this IS the signup flow. Let it run.
  if (!role) return <>{children}</>

  return <Navigate to={dashboardPathFor(role)} replace />
}
