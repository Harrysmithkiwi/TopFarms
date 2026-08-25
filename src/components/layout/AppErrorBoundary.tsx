import { Link, useRouteError, isRouteErrorResponse } from 'react-router'
import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { reportError } from '@/lib/observability'
import { NotFound } from '@/pages/NotFound'

/**
 * Router errorElement — audit finding F-A2 (P1).
 *
 * Previously `errorElement` rendered <NotFound /> for EVERY routing error, so an app crash
 * was presented to the user as a "404 Not Found" page. That is the worst possible pairing
 * with having no error tracking: the user doesn't report it (nothing looks broken — the URL
 * just seems wrong) and we had no telemetry either, so a regression could run for days.
 *
 * Now: genuine 404s still render NotFound; anything else renders a real error surface and
 * is reported. The distinction is what makes the Sentry signal trustworthy.
 */
export function AppErrorBoundary() {
  const error = useRouteError()

  // A 404 from the router is not a fault — no report, no alarming UI.
  const isNotFound = isRouteErrorResponse(error) && error.status === 404

  useEffect(() => {
    if (isNotFound) return
    reportError('router', error, {
      status: isRouteErrorResponse(error) ? error.status : undefined,
    })
  }, [error, isNotFound])

  if (isNotFound) return <NotFound error={error} />

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ backgroundColor: 'var(--color-danger-bg, rgba(220,38,38,0.1))' }}
      >
        <AlertTriangle className="h-7 w-7" style={{ color: 'var(--color-danger)' }} />
      </div>

      <h1
        className="font-display mt-5 text-2xl font-semibold"
        style={{ color: 'var(--color-brand-900)' }}
      >
        Something went wrong
      </h1>
      <p className="mt-2 max-w-sm text-[14px]" style={{ color: 'var(--color-text-muted)' }}>
        This one&rsquo;s on us, not you. The problem has been logged — try again, and if it keeps
        happening let us know at{' '}
        <a href="mailto:hello@topfarms.co.nz" className="underline">
          hello@topfarms.co.nz
        </a>
        .
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="font-body rounded-8 px-5 py-2.5 text-[14px] font-bold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-brand)' }}
        >
          Try again
        </button>
        <Link
          to="/"
          className="font-body border-border hover:border-border-strong rounded-8 border px-5 py-2.5 text-[14px] font-bold transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
