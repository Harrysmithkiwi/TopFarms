import { Link } from 'react-router'
import { dashboardPathFor } from '@/lib/routing'
import type { UserRole } from '@/types/domain'

// docs/DESIGN.md §5 Unauthorised: render the access-denied view in place, never a
// redirect that bounces the user back to where they started. Lifted verbatim out of
// AdminLoginPage, where this was the only correct implementation in the codebase, so
// ProtectedRoute could stop redirecting. Both callers now share this one.

const REASON: Record<UserRole, string> = {
  admin: 'Your account does not have admin privileges.',
  employer: 'This page is for employer accounts.',
  seeker: 'This page is for job seeker accounts.',
}

export function AccessDenied({
  requiredRole,
  role,
}: {
  requiredRole: UserRole
  role: UserRole
}) {
  return (
    <div className="bg-bg flex min-h-screen items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col gap-4">
        <div
          role="alert"
          className="rounded-[12px] border-[1.5px] p-4"
          style={{
            backgroundColor: 'var(--color-danger-bg)',
            borderColor: 'var(--color-danger)',
            color: 'var(--color-danger)',
          }}
        >
          {/* 17/15 are the Subtitle and Body steps in DESIGN.md. The AdminLoginPage
              original used 16/14, off the ramp both ways; not inherited into shared code. */}
          {/* h1, not p: this IS the page, and the route renders nothing else. A screen-reader
              user navigating by heading found no heading at all here. role="alert" on the
              container still announces it on arrival; the two are complementary. */}
          <h1 className="font-body text-[17px] font-semibold">Access denied</h1>
          <p className="font-body mt-1 text-[15px]" style={{ color: 'var(--color-text-muted)' }}>
            {REASON[requiredRole]}
          </p>
        </div>
        <Link
          to={dashboardPathFor(role)}
          className="font-body inline-flex items-center justify-center rounded-[8px] px-4 py-2 text-sm font-medium"
          style={{
            backgroundColor: 'var(--color-brand)',
            color: 'var(--color-bg)',
          }}
        >
          {role === 'admin' ? 'Back to the admin portal' : 'Back to your dashboard'}
        </Link>
      </div>
    </div>
  )
}
