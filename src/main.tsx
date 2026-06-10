import { StrictMode, Suspense, lazy, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import './index.css'

// ─── Code splitting (audit task 2.1, F5) ────────────────────────────────────
// Home stays eager: it IS the landing chunk, and lazy-loading it would just
// add a fallback flash to the first paint. ProtectedRoute stays eager (tiny,
// used by most routes). Every other page — and the admin/job-search layouts,
// which only their own routes use — is a lazy chunk so visitors don't download
// dashboards, wizards, admin, or Stripe code to view the landing page.
import { Home } from '@/pages/Home'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

// Pages export named components; map them onto React.lazy's default slot.
const Login = lazy(() => import('@/pages/auth/Login').then((m) => ({ default: m.Login })))
const SignUp = lazy(() => import('@/pages/auth/SignUp').then((m) => ({ default: m.SignUp })))
const VerifyEmail = lazy(() => import('@/pages/auth/VerifyEmail').then((m) => ({ default: m.VerifyEmail })))
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword').then((m) => ({ default: m.ForgotPassword })))
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword').then((m) => ({ default: m.ResetPassword })))
const SelectRole = lazy(() => import('@/pages/auth/SelectRole').then((m) => ({ default: m.SelectRole })))
const Suspended = lazy(() => import('@/pages/auth/Suspended').then((m) => ({ default: m.Suspended })))
const EmployerDashboard = lazy(() => import('@/pages/dashboard/EmployerDashboard').then((m) => ({ default: m.EmployerDashboard })))
const SeekerDashboard = lazy(() => import('@/pages/dashboard/SeekerDashboard').then((m) => ({ default: m.SeekerDashboard })))
const JobSearchLayout = lazy(() => import('@/components/layout/JobSearchLayout').then((m) => ({ default: m.JobSearchLayout })))
const EmployerOnboarding = lazy(() => import('@/pages/onboarding/EmployerOnboarding').then((m) => ({ default: m.EmployerOnboarding })))
const SeekerOnboarding = lazy(() => import('@/pages/onboarding/SeekerOnboarding').then((m) => ({ default: m.SeekerOnboarding })))
const PostJob = lazy(() => import('@/pages/jobs/PostJob').then((m) => ({ default: m.PostJob })))
const JobDetail = lazy(() => import('@/pages/jobs/JobDetail').then((m) => ({ default: m.JobDetail })))
const EmployerVerification = lazy(() => import('@/pages/verification/EmployerVerification').then((m) => ({ default: m.EmployerVerification })))
const DocumentUpload = lazy(() => import('@/pages/verification/DocumentUpload').then((m) => ({ default: m.DocumentUpload })))
const FarmPhotoUpload = lazy(() => import('@/pages/verification/FarmPhotoUpload').then((m) => ({ default: m.FarmPhotoUpload })))
const ForEmployers = lazy(() => import('@/pages/ForEmployers').then((m) => ({ default: m.ForEmployers })))
const Pricing = lazy(() => import('@/pages/Pricing').then((m) => ({ default: m.Pricing })))
const JobSearch = lazy(() => import('@/pages/jobs/JobSearch').then((m) => ({ default: m.JobSearch })))
const MyApplications = lazy(() => import('@/pages/dashboard/seeker/MyApplications').then((m) => ({ default: m.MyApplications })))
const SavedSearches = lazy(() => import('@/pages/dashboard/seeker/SavedSearches').then((m) => ({ default: m.SavedSearches })))
const SeekerDocuments = lazy(() => import('@/pages/dashboard/seeker/SeekerDocuments').then((m) => ({ default: m.SeekerDocuments })))
const ApplicantDashboard = lazy(() => import('@/pages/dashboard/employer/ApplicantDashboard').then((m) => ({ default: m.ApplicantDashboard })))
const AdminLayout = lazy(() => import('@/components/layout/AdminLayout').then((m) => ({ default: m.AdminLayout })))
const AdminGate = lazy(() => import('@/pages/admin/AdminLoginPage').then((m) => ({ default: m.AdminGate })))
const EmployerList = lazy(() => import('@/pages/admin/EmployerList').then((m) => ({ default: m.EmployerList })))
const SeekerList = lazy(() => import('@/pages/admin/SeekerList').then((m) => ({ default: m.SeekerList })))
const JobsManagement = lazy(() => import('@/pages/admin/JobsManagement').then((m) => ({ default: m.JobsManagement })))
const PlacementPipeline = lazy(() => import('@/pages/admin/PlacementPipeline').then((m) => ({ default: m.PlacementPipeline })))
const AdminDocumentsQueue = lazy(() => import('@/pages/admin/AdminDocumentsQueue').then((m) => ({ default: m.AdminDocumentsQueue })))
const AdminSkillCoverage = lazy(() => import('@/pages/admin/AdminSkillCoverage').then((m) => ({ default: m.AdminSkillCoverage })))

// Full-page fallback shown while a route chunk loads. Mirrors the in-app
// spinner style (brand-colored ring) so chunk loads read as ordinary loading.
function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div
        className="w-8 h-8 rounded-full border-[3px] border-t-transparent animate-spin"
        style={{ borderColor: 'var(--color-brand)', borderTopColor: 'transparent' }}
        aria-label="Loading page"
        role="status"
      />
    </div>
  )
}

// Each lazy element gets its own boundary so navigation only suspends the
// destination route, never the whole app shell.
function s(element: ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>
}

const router = createBrowserRouter([
  // ─── Public routes ──────────────────────────────────────────────────────────
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/login',
    element: s(<Login />),
  },
  {
    path: '/signup',
    element: s(<SignUp />),
  },
  {
    path: '/auth/verify',
    element: s(<VerifyEmail />),
  },
  {
    path: '/forgot-password',
    element: s(<ForgotPassword />),
  },
  {
    path: '/auth/reset',
    element: s(<ResetPassword />),
  },
  {
    path: '/auth/select-role',
    element: s(<SelectRole />),
  },
  {
    // Phase 21 Track B — gate page for suspended users (isActive=false). MUST NOT
    // be wrapped in ProtectedRoute; user has a session but is blocked from
    // dashboards by ProtectedRoute's isActive guard, which redirects HERE.
    // Wrapping would cause infinite redirect.
    path: '/suspended',
    element: s(<Suspended />),
  },

  // ─── Jobs ───────────────────────────────────────────────────────────────────
  // NOTE: /jobs/new MUST be declared before /jobs/:id to prevent React Router
  // from treating "new" as a dynamic :id param.
  {
    path: '/for-employers',
    element: s(<ForEmployers />),
  },
  {
    path: '/pricing',
    element: s(<Pricing />),
  },
  {
    // /jobs uses JobSearchLayout — Nav header only, no dashboard sidebar.
    // Job search has its own page-internal filter sidebar; a second left-rail
    // (DashboardLayout's Sidebar) would conflict architecturally. Pattern
    // matches Seek's job-search layout. Originally wrapped in DashboardLayout
    // hideSidebar (commit eb7e2f1, 2026-05-04 morning) but that introduced
    // max-w + p-6 layout constraints that conflicted with JobSearch's flex split.
    path: '/jobs',
    element: s(
      <JobSearchLayout>
        <JobSearch />
      </JobSearchLayout>,
    ),
  },
  {
    path: '/jobs/new',
    element: (
      <ProtectedRoute requiredRole="employer">
        {s(<PostJob />)}
      </ProtectedRoute>
    ),
  },
  {
    path: '/jobs/:id/edit',
    element: (
      <ProtectedRoute requiredRole="employer">
        {s(<PostJob />)}
      </ProtectedRoute>
    ),
  },
  {
    // PUBLIC — no ProtectedRoute wrapper. Component handles auth-gated views internally.
    path: '/jobs/:id',
    element: s(<JobDetail />),
  },

  // ─── Employer dashboard & verification ──────────────────────────────────────
  // NOTE: /dashboard/employer/jobs/:id/applicants MUST be before /dashboard/employer
  {
    path: '/dashboard/employer/jobs/:id/applicants',
    element: (
      <ProtectedRoute requiredRole="employer">
        {s(<ApplicantDashboard />)}
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard/employer',
    element: (
      <ProtectedRoute requiredRole="employer">
        {s(<EmployerDashboard />)}
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard/employer/verification',
    element: (
      <ProtectedRoute requiredRole="employer">
        {s(<EmployerVerification />)}
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard/employer/verification/documents',
    element: (
      <ProtectedRoute requiredRole="employer">
        {s(<DocumentUpload />)}
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard/employer/verification/photos',
    element: (
      <ProtectedRoute requiredRole="employer">
        {s(<FarmPhotoUpload />)}
      </ProtectedRoute>
    ),
  },

  // ─── Seeker dashboard ───────────────────────────────────────────────────────
  // NOTE: /dashboard/seeker/applications MUST be before /dashboard/seeker to prevent
  // React Router from treating the sub-path as a nested match on the parent.
  {
    path: '/dashboard/seeker/applications',
    element: (
      <ProtectedRoute requiredRole="seeker">
        {s(<MyApplications />)}
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard/seeker/saved-searches',
    element: (
      <ProtectedRoute requiredRole="seeker">
        {s(<SavedSearches />)}
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard/seeker/documents',
    element: (
      <ProtectedRoute requiredRole="seeker">
        {s(<SeekerDocuments />)}
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard/seeker',
    element: (
      <ProtectedRoute requiredRole="seeker">
        {s(<SeekerDashboard />)}
      </ProtectedRoute>
    ),
  },

  // ─── Onboarding ─────────────────────────────────────────────────────────────
  {
    path: '/onboarding/employer',
    element: (
      <ProtectedRoute requiredRole="employer">
        {s(<EmployerOnboarding />)}
      </ProtectedRoute>
    ),
  },
  {
    path: '/onboarding/seeker',
    element: (
      <ProtectedRoute requiredRole="seeker">
        {s(<SeekerOnboarding />)}
      </ProtectedRoute>
    ),
  },

  // ─── Admin (super admin dashboard, Phase 20) ────────────────────────────────
  // /admin/* routes are gated by ProtectedRoute requiredRole="admin". The actual
  // security boundary is the SECURITY DEFINER RPC layer (migration 023) — every
  // admin_* RPC validates get_user_role(auth.uid()) = 'admin' server-side, so
  // even a DevTools bypass of the frontend gate cannot exfiltrate data.
  {
    path: '/admin',
    element: s(<AdminGate />),
  },
  {
    path: '/admin/employers',
    element: (
      <ProtectedRoute requiredRole="admin">
        {s(
          <AdminLayout>
            <EmployerList />
          </AdminLayout>,
        )}
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/seekers',
    element: (
      <ProtectedRoute requiredRole="admin">
        {s(
          <AdminLayout>
            <SeekerList />
          </AdminLayout>,
        )}
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/jobs',
    element: (
      <ProtectedRoute requiredRole="admin">
        {s(
          <AdminLayout>
            <JobsManagement />
          </AdminLayout>,
        )}
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/placements',
    element: (
      <ProtectedRoute requiredRole="admin">
        {s(
          <AdminLayout>
            <PlacementPipeline />
          </AdminLayout>,
        )}
      </ProtectedRoute>
    ),
  },
  {
    // Phase 21 Track B (plan 21-07) — admin doc verification queue.
    // ProtectedRoute requiredRole="admin" wraps AdminLayout — same pattern as
    // sibling /admin/* routes; SECURITY DEFINER RPCs (migration 033) are the
    // load-bearing server-side gate. Email side-effect is best-effort via
    // supabase.functions.invoke('send-document-status-email').
    path: '/admin/documents',
    element: (
      <ProtectedRoute requiredRole="admin">
        {s(
          <AdminLayout>
            <AdminDocumentsQueue />
          </AdminLayout>,
        )}
      </ProtectedRoute>
    ),
  },
  {
    // Phase 23 plan 23-02 — admin skill coverage analytics at /admin/skills.
    // Renders admin_skill_coverage RPC (migration 034) via AdminTable.
    // SECURITY DEFINER RPC is the server-side gate; ProtectedRoute is the
    // client-side guard (requiredRole="admin").
    path: '/admin/skills',
    element: (
      <ProtectedRoute requiredRole="admin">
        {s(
          <AdminLayout>
            <AdminSkillCoverage />
          </AdminLayout>,
        )}
      </ProtectedRoute>
    ),
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
    <Toaster position="top-right" richColors />
  </StrictMode>,
)
