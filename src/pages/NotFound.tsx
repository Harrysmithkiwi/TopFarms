import { Link, isRouteErrorResponse } from 'react-router'
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
 *
 * v13 stage 3b: the error arrives as a PROP, where it used to come from
 * useRouteError(). In library mode that hook returned undefined outside an error
 * boundary; in framework mode it THROWS ("can only be used on routes that
 * contain a unique id") when this page is reached through the catch-all's
 * descendant route table, which is every 404 on the site. The caller has the
 * error and the hook does not, so the caller passes it.
 */
export function NotFound({ error }: { error?: unknown } = {}) {
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
        <p className="text-text-muted mt-4 text-base">
          {is404
            ? "The page you're looking for doesn't exist or has moved."
            : 'An unexpected error occurred. Please try again. If it keeps happening, contact hello@topfarms.co.nz.'}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          <Link
            to="/"
            className="bg-brand-hover hover:bg-brand-900 inline-flex min-h-11 items-center rounded-full px-5 text-[15px] font-semibold text-white transition-colors"
          >
            Go home
          </Link>
          <Link
            to="/jobs"
            className="border-text hover:bg-text hover:text-bg inline-flex min-h-11 items-center rounded-full border-[1.5px] px-5 text-[15px] font-semibold transition-colors"
          >
            Open roles
          </Link>
        </div>
      </section>
    </PublicShell>
  )
}
