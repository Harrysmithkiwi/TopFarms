import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router'
import { MotionConfig } from 'motion/react'
import { Analytics } from '@vercel/analytics/react'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { AudienceProvider } from '@/contexts/AudienceContext'
import { AppErrorBoundary } from '@/components/layout/AppErrorBoundary'
import { initObservability } from '@/lib/observability'
import { OfflineBanner } from '@/components/layout/OfflineBanner'
import { RecoveryRedirect } from '@/components/layout/RecoveryRedirect'
import { routeTable, s } from '@/legacyRoutes'
import './index.css'

// Error reporting first, so anything thrown during render is captured. No-ops
// entirely when VITE_SENTRY_DSN is unset (audit F-A2).
initObservability()

// All routes are children of one pathless route carrying errorElement, so any
// routing error (404s, chunk failures, render errors) is caught instead of
// showing React Router's developer error screen (TF-001/002).
//
// 2026-07-30 (audit F-A2): this used to render <NotFound /> for EVERY error, so a
// crash was shown to the user as a 404 — they don't report it and, with no error
// tracking, neither did we. AppErrorBoundary keeps NotFound for genuine 404s and
// renders a real error surface (and reports it) for anything else.
const router = createBrowserRouter([
  {
    errorElement: s(<AppErrorBoundary />),
    // Phase 5.0e — sits inside the router (it needs useNavigate/useLocation) and
    // above every route, so a recovery link that lands anywhere still reaches
    // /auth/reset before its single-use token is spent. <Outlet /> renders the
    // matched route as normal.
    element: (
      <>
        <RecoveryRedirect />
        <Outlet />
      </>
    ),
    children: routeTable(),
  },
])


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Phase 4.4 — the CSS prefers-reduced-motion clamp in index.css only
        reaches CSS animations; MotionConfig makes every motion/react animation
        honour the user's setting too. Do not remove. */}
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        {/* v13 — audience lens for public surfaces; session role wins inside
            the provider (directive 1.14). Must sit inside AuthProvider. */}
        <AudienceProvider>
          {/* Phase 5.7 — outside the router so it survives navigation. */}
          <OfflineBanner />
          <RouterProvider router={router} />
        </AudienceProvider>
      </AuthProvider>
    </MotionConfig>
    <Toaster position="top-right" richColors />
    {/* Pageviews on every route; custom funnel events via track() at the 5
        funnel points (signup_start/complete, job_view, apply_submit,
        job_publish). No PII in event props. Only injected on Vercel-served
        hosts — elsewhere (localhost, CI vite preview) /_vercel/insights/
        404s and trips the e2e no-console-errors guard. track() no-ops
        harmlessly when the script isn't mounted. */}
    {(window.location.hostname.endsWith('topfarms.co.nz') ||
      window.location.hostname.endsWith('.vercel.app')) && <Analytics />}
  </StrictMode>,
)
