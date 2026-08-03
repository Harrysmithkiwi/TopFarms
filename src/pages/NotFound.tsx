import { Link, useRouteError, isRouteErrorResponse } from 'react-router'
import { PublicShell } from '@/components/shell/PublicShell'
import { usePageMeta } from '@/lib/usePageMeta'

/**
 * Branded 404 / route-error page (TF-001/TF-002). Used both as the `*`
 * catch-all route and as the router errorElement, so React Router's
 * developer error screen can never reach users.
 *
 * v13 port, stage 3a (directive 1.17f). Ported although it was out of the
 * stated scope: it is the destination of every broken link and the one page a
 * lost visitor is guaranteed to see, so leaving it on the old system would make
 * the error surface the least coherent page on the site. The 404-vs-error split
 * is preserved exactly: a real error must not be shown to the user as a 404.
 */
export function NotFound() {
  // undefined outside an error boundary (i.e. when rendered via the `*` route)
  const error = useRouteError()
  const is404 = error == null || (isRouteErrorResponse(error) && error.status === 404)

  usePageMeta(
    is404 ? 'Page not found | TopFarms' : 'Something went wrong | TopFarms',
    'TopFarms, New Zealand agricultural jobs.',
  )

  return (
    <PublicShell>
      <section className="mx-auto flex max-w-[46ch] flex-col items-center px-5 py-20 text-center">
        <h1 className="text-4xl font-extrabold tracking-[-.04em] md:text-5xl">
          {is404 ? "This paddock's empty" : 'Something went wrong'}
        </h1>
        <p className="text-ink-60 mt-4 text-base">
          {is404
            ? "The page you're looking for doesn't exist or has moved."
            : 'An unexpected error occurred. Please try again. If it keeps happening, contact hello@topfarms.co.nz.'}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          <Link
            to="/"
            className="bg-green hover:bg-green-2 inline-flex min-h-11 items-center rounded-full px-5 text-[15px] font-semibold text-white transition-colors"
          >
            Go home
          </Link>
          <Link
            to="/jobs"
            className="border-ink hover:bg-ink hover:text-cream inline-flex min-h-11 items-center rounded-full border-[1.5px] px-5 text-[15px] font-semibold transition-colors"
          >
            Open roles
          </Link>
        </div>
      </section>
    </PublicShell>
  )
}
