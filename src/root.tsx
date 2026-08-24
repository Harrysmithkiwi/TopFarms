import { useSyncExternalStore } from 'react'
import { Links, Meta, Outlet, Scripts, ScrollRestoration, matchRoutes } from 'react-router'
import type { LinksFunction, LoaderFunctionArgs, MetaDescriptor } from 'react-router'
import { MotionConfig } from 'motion/react'
import { Analytics } from '@vercel/analytics/react'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { AudienceProvider } from '@/contexts/AudienceContext'
import { AppErrorBoundary } from '@/components/layout/AppErrorBoundary'
import { OfflineBanner } from '@/components/layout/OfflineBanner'
import { RecoveryRedirect } from '@/components/layout/RecoveryRedirect'
import { initObservability } from '@/lib/observability'
import { routeTable } from '@/legacyRoutes'
import stylesheet from './index.css?url'

// v13 stage 3b root (directive 1.16, 1.18). This replaces index.html AND the
// provider tree that used to live in main.tsx. Everything here was already
// wrapping the app; the only thing that changed is who emits the <html>.

// Error reporting first, so anything thrown during render is captured. No-ops
// entirely when VITE_SENTRY_DSN is unset (audit F-A2).
//
// Guarded on the document: this module is evaluated on the server too now, and
// @sentry/react is a browser reporter — initialising it there would report the
// wrong runtime, or nothing at all.
if (typeof document !== 'undefined') initObservability()

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: stylesheet },
  { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
]

// Site-level defaults, carried over from index.html. A route's own meta export
// replaces any descriptor it repeats.
//
// ONE DELIBERATE OMISSION: index.html emitted
// <link rel="canonical" href="https://www.topfarms.co.nz/"> on EVERY route,
// which told every crawler that /jobs/<id> was the homepage. That is a bug the
// SPA shell made invisible. Canonical is now per-route: routes that have one
// declare it, and the rest are self-canonical, which is correct.
export function meta(): MetaDescriptor[] {
  const title = 'TopFarms — NZ Agricultural Jobs'
  return [
    { title },
    {
      name: 'description',
      content:
        'TopFarms matches skilled farm workers with quality agricultural employers across New Zealand — dairy, sheep & beef, cropping, deer and mixed.',
    },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: 'TopFarms' },
    { property: 'og:title', content: title },
    {
      property: 'og:description',
      content:
        "New Zealand's agricultural recruitment marketplace. Find farm work or post farm jobs — dairy, sheep & beef, cropping, deer and mixed.",
    },
    { name: 'twitter:card', content: 'summary' },
  ]
}

/**
 * The status code for URLs that do not exist (S1).
 *
 * `/definitely-not-a-page` used to answer 200. The branded NotFound page rendered
 * correctly on the client — which is all LAUNCH.md B3 ever asserted — over an HTTP 200,
 * so a crawler indexes junk URLs as real pages. The copy assertion is exactly what let
 * this hide.
 *
 * The check lives here, in the root loader, rather than in the `*` route module. Giving
 * routes/spa.tsx a server loader turns every client-only route into a server-rendered one
 * (measured: /login's document went 6,036 → 11,399 bytes), and not server-rendering the
 * gated surface is the whole point of directive 1.16's staging. Root already renders on
 * the server, so asking here costs nothing and changes no other route's markup.
 *
 * The legacy table is the only thing that knows which paths are real, so ask it: if the
 * deepest match is its own `*` entry — the one whose element is NotFound — nothing real
 * matched. matchRoutes renders nothing; the table's elements are lazy() wrappers and stay
 * unevaluated. The thrown Response gives the document its status, and the ErrorBoundary
 * below renders the same branded page (AppErrorBoundary routes genuine 404s to NotFound),
 * so only the header changes.
 *
 * /jobs and /jobs/:id are server-rendered by their own modules and are NOT in the legacy
 * table, hence the explicit exemption — a 404 on the two routes crawlers actually want
 * would be a far worse bug than the one this fixes.
 */
export function loader({ request }: LoaderFunctionArgs) {
  const { pathname } = new URL(request.url)
  if (pathname === '/jobs' || pathname.startsWith('/jobs/')) return null

  const matches = matchRoutes(routeTable(), pathname)
  const deepest = matches?.[matches.length - 1]
  if (!matches || deepest?.route.path === '*') {
    throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
  }
  return null
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#0f3d22" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

// Pageviews on every route; custom funnel events via track() at the 5 funnel
// points (signup_start/complete, job_view, apply_submit, job_publish). No PII in
// event props. Only injected on Vercel-served hosts — elsewhere (localhost, CI)
// /_vercel/insights/ 404s and trips the e2e no-console-errors guard. track()
// no-ops harmlessly when the script isn't mounted.
//
// Resolved after hydration rather than gated inline: the host check needs
// `window`, and a server that renders nothing against a client that renders a
// <script> is a hydration mismatch. The hostname cannot change under a live
// document, so the subscription is a no-op — getServerSnapshot is doing the
// whole job here, same as in OfflineBanner and AudienceContext.
const neverChanges = () => () => {}
const isVercelHost = () =>
  window.location.hostname.endsWith('topfarms.co.nz') ||
  window.location.hostname.endsWith('.vercel.app')
const offDuringSSR = () => false

function VercelAnalytics() {
  const enabled = useSyncExternalStore(neverChanges, isVercelHost, offDuringSSR)
  return enabled ? <Analytics /> : null
}

// The provider tree, shared by the app and by the error surface — NotFound
// renders inside PublicShell, which needs the audience lens, so an error
// boundary outside these providers would crash while reporting a crash.
function Providers({ children }: { children: React.ReactNode }) {
  return (
    // Phase 4.4 — the CSS prefers-reduced-motion clamp in index.css only reaches
    // CSS animations; MotionConfig makes every motion/react animation honour the
    // user's setting too. Do not remove.
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        {/* v13 — audience lens for public surfaces; session role wins inside the
            provider (directive 1.14). Must sit inside AuthProvider. */}
        <AudienceProvider>{children}</AudienceProvider>
      </AuthProvider>
      {/* toastOptions, not bare richColors. sonner's own richColors palette renders
          error text at 4.34:1 against its pink ground, under the 4.5:1 body floor in
          docs/DESIGN.md §5 — and a toast is how this product delivers most of its
          errors, so every one of them was below the floor. Found by the pre-launch UAT
          design pass, 2026-08-24. The four classNames below map onto the project's own
          semantic tokens, which scripts/contrast.mjs already gates: danger 6.80, warn
          6.37, success 6.35, info 6.59.
          (Hex literals are deliberately absent from this comment — scripts/design-gate.mjs
          scans for them and does not exclude comments. Quoting the failing values here
          would trip the gate that exists to keep them out of the code.) */}
      <Toaster
        position="top-right"
        richColors
        toastOptions={{
          classNames: {
            error: '!bg-danger-bg !text-danger-text-on-bg !border-danger/30',
            warning: '!bg-warn-bg !text-warn-text-on-bg !border-warn/30',
            success: '!bg-success-bg !text-success-text-on-bg !border-success/30',
            info: '!bg-info-bg !text-info-text-on-bg !border-info/30',
          },
        }}
      />
      <VercelAnalytics />
    </MotionConfig>
  )
}

export default function Root() {
  return (
    <Providers>
      {/* Phase 5.7 — above the routes so it survives navigation. */}
      <OfflineBanner />
      {/* Phase 5.0e — needs useNavigate/useLocation and must sit above every
          route, so a recovery link that lands anywhere still reaches /auth/reset
          before its single-use token is spent. */}
      <RecoveryRedirect />
      <Outlet />
    </Providers>
  )
}

// Replaces main.tsx's `errorElement`. Same component, same behaviour: genuine
// 404s render NotFound, everything else renders a real error surface and reports
// it (audit F-A2).
export function ErrorBoundary() {
  return (
    <Providers>
      <AppErrorBoundary />
    </Providers>
  )
}
