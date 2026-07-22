import { Link, useRouteError, isRouteErrorResponse } from 'react-router'
import { Nav } from '@/components/layout/Nav'
import { usePageMeta } from '@/lib/usePageMeta'

/**
 * Branded 404 / route-error page (TF-001/TF-002). Used both as the `*`
 * catch-all route and as the router errorElement, so React Router's
 * developer error screen can never reach users.
 */
export function NotFound() {
  // undefined outside an error boundary (i.e. when rendered via the `*` route)
  const error = useRouteError()
  const is404 = error == null || (isRouteErrorResponse(error) && error.status === 404)

  usePageMeta(
    is404 ? 'Page not found — TopFarms' : 'Something went wrong — TopFarms',
    'TopFarms — New Zealand agricultural jobs.',
  )

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <Nav />
      <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
        <p className="mb-4 text-5xl" aria-hidden="true">
          🌾
        </p>
        <h1
          className="font-display mb-3 text-3xl font-bold"
          style={{ color: 'var(--color-brand-900)' }}
        >
          {is404 ? "This paddock's empty" : 'Something went wrong'}
        </h1>
        <p className="mb-8 text-base" style={{ color: 'var(--color-text-muted)' }}>
          {is404
            ? "The page you're looking for doesn't exist or has moved."
            : 'An unexpected error occurred. Please try again — if it keeps happening, contact hello@topfarms.co.nz.'}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              backgroundColor: 'var(--color-brand-900)',
              color: 'var(--color-text-on-brand)',
            }}
          >
            Go home
          </Link>
          <Link
            to="/jobs"
            className="rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors"
            style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-text)' }}
          >
            Browse jobs
          </Link>
        </div>
      </main>
    </div>
  )
}
