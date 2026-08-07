import { useSyncExternalStore } from 'react'
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'
import type { LinksFunction, MetaDescriptor } from 'react-router'
import { MotionConfig } from 'motion/react'
import { Analytics } from '@vercel/analytics/react'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { AudienceProvider } from '@/contexts/AudienceContext'
import { AppErrorBoundary } from '@/components/layout/AppErrorBoundary'
import { OfflineBanner } from '@/components/layout/OfflineBanner'
import { RecoveryRedirect } from '@/components/layout/RecoveryRedirect'
import { initObservability } from '@/lib/observability'
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
      <Toaster position="top-right" richColors />
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
