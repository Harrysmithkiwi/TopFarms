import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { RouteSkeleton } from '@/components/ui/Skeleton'
import { dashboardPathFor } from '@/lib/routing'
import { sanitizeReturnTo } from '@/lib/returnTo'

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
 * THE LATCH, and why it is not optional. This guard decides ONCE, the first time auth
 * settles, and never re-decides. It answers "how did you ARRIVE at this page", not "are
 * you authenticated right now".
 *
 * The first version re-evaluated on every render and broke login, which CI caught
 * immediately. Login.tsx owns its own post-submit navigation through a `didSubmit` ref.
 * A live guard unmounts Login the instant a session appears — destroying that ref — and
 * if role resolution is slow (the AUTH-FIX-02 race), Login remounts with a fresh ref and
 * never navigates. The user is stranded on /login holding a valid session.
 *
 * Latching also makes the signup flow correct for free: someone who arrives anonymous
 * stays on the page through account creation, email verification and role selection,
 * because the page they are standing on owns that journey.
 */
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { session, role, isActive, loading } = useAuth()
  const location = useLocation()

  // undefined = not yet decided · null = stay · string = go there
  const [decision, setDecision] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    if (loading || decision !== undefined) return
    setDecision(
      session && isActive === false
        ? '/suspended'
        : // A session with no role yet is someone mid-signup; the page owns that flow.
          session && role
          ? // Already signed in but arrived with `?next=` (a login link on a job
            // page): send them to the target, not the dashboard.
            (sanitizeReturnTo(new URLSearchParams(location.search).get('next')) ??
            dashboardPathFor(role))
          : null,
    )
  }, [loading, session, role, isActive, decision, location.search])

  // Never flash the signup form at someone who turns out to be signed in.
  if (decision === undefined) {
    return (
      <div className="bg-bg min-h-screen">
        <RouteSkeleton />
      </div>
    )
  }

  if (decision) return <Navigate to={decision} replace />
  return <>{children}</>
}
