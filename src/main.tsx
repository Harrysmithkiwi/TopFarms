import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import './index.css'

import { Home } from '@/pages/Home'
import { Login } from '@/pages/auth/Login'
import { SignUp } from '@/pages/auth/SignUp'
import { VerifyEmail } from '@/pages/auth/VerifyEmail'
import { ForgotPassword } from '@/pages/auth/ForgotPassword'
import { ResetPassword } from '@/pages/auth/ResetPassword'
import { SelectRole } from '@/pages/auth/SelectRole'
import { EmployerDashboard } from '@/pages/dashboard/EmployerDashboard'
import { SeekerDashboard } from '@/pages/dashboard/SeekerDashboard'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { JobSearchLayout } from '@/components/layout/JobSearchLayout'
import { EmployerOnboarding } from '@/pages/onboarding/EmployerOnboarding'
import { SeekerOnboarding } from '@/pages/onboarding/SeekerOnboarding'
import { PostJob } from '@/pages/jobs/PostJob'
import { JobDetail } from '@/pages/jobs/JobDetail'
import { EmployerVerification } from '@/pages/verification/EmployerVerification'
import { DocumentUpload } from '@/pages/verification/DocumentUpload'
import { FarmPhotoUpload } from '@/pages/verification/FarmPhotoUpload'
import { ForEmployers } from '@/pages/ForEmployers'
import { Pricing } from '@/pages/Pricing'
import { JobSearch } from '@/pages/jobs/JobSearch'
import { MyApplications } from '@/pages/dashboard/seeker/MyApplications'
import { SavedSearches } from '@/pages/dashboard/seeker/SavedSearches'
import { SeekerDocuments } from '@/pages/dashboard/seeker/SeekerDocuments'
import { ApplicantDashboard } from '@/pages/dashboard/employer/ApplicantDashboard'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { AdminGate } from '@/pages/admin/AdminLoginPage'
import { EmployerList } from '@/pages/admin/EmployerList'
import { SeekerList } from '@/pages/admin/SeekerList'
import { JobsManagement } from '@/pages/admin/JobsManagement'
import { PlacementPipeline } from '@/pages/admin/PlacementPipeline'

const router = createBrowserRouter([
  // ─── Public routes ──────────────────────────────────────────────────────────
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <SignUp />,
  },
  {
    path: '/auth/verify',
    element: <VerifyEmail />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPassword />,
  },
  {
    path: '/auth/reset',
    element: <ResetPassword />,
  },
  {
    path: '/auth/select-role',
    element: <SelectRole />,
  },

  // ─── Jobs ───────────────────────────────────────────────────────────────────
  // NOTE: /jobs/new MUST be declared before /jobs/:id to prevent React Router
  // from treating "new" as a dynamic :id param.
  {
    path: '/for-employers',
    element: <ForEmployers />,
  },
  {
    path: '/pricing',
    element: <Pricing />,
  },
  {
    // /jobs uses JobSearchLayout — Nav header only, no dashboard sidebar.
    // Job search has its own page-internal filter sidebar; a second left-rail
    // (DashboardLayout's Sidebar) would conflict architecturally. Pattern
    // matches Seek's job-search layout. Originally wrapped in DashboardLayout
    // hideSidebar (commit eb7e2f1, 2026-05-04 morning) but that introduced
    // max-w + p-6 layout constraints that conflicted with JobSearch's flex split.
    path: '/jobs',
    element: (
      <JobSearchLayout>
        <JobSearch />
      </JobSearchLayout>
    ),
  },
  {
    path: '/jobs/new',
    element: (
      <ProtectedRoute requiredRole="employer">
        <PostJob />
      </ProtectedRoute>
    ),
  },
  {
    path: '/jobs/:id/edit',
    element: (
      <ProtectedRoute requiredRole="employer">
        <PostJob />
      </ProtectedRoute>
    ),
  },
  {
    // PUBLIC — no ProtectedRoute wrapper. Component handles auth-gated views internally.
    path: '/jobs/:id',
    element: <JobDetail />,
  },

  // ─── Employer dashboard & verification ──────────────────────────────────────
  // NOTE: /dashboard/employer/jobs/:id/applicants MUST be before /dashboard/employer
  {
    path: '/dashboard/employer/jobs/:id/applicants',
    element: (
      <ProtectedRoute requiredRole="employer">
        <ApplicantDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard/employer',
    element: (
      <ProtectedRoute requiredRole="employer">
        <EmployerDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard/employer/verification',
    element: (
      <ProtectedRoute requiredRole="employer">
        <EmployerVerification />
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard/employer/verification/documents',
    element: (
      <ProtectedRoute requiredRole="employer">
        <DocumentUpload />
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard/employer/verification/photos',
    element: (
      <ProtectedRoute requiredRole="employer">
        <FarmPhotoUpload />
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
        <MyApplications />
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard/seeker/saved-searches',
    element: (
      <ProtectedRoute requiredRole="seeker">
        <SavedSearches />
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard/seeker/documents',
    element: (
      <ProtectedRoute requiredRole="seeker">
        <SeekerDocuments />
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard/seeker',
    element: (
      <ProtectedRoute requiredRole="seeker">
        <SeekerDashboard />
      </ProtectedRoute>
    ),
  },

  // ─── Onboarding ─────────────────────────────────────────────────────────────
  {
    path: '/onboarding/employer',
    element: (
      <ProtectedRoute requiredRole="employer">
        <EmployerOnboarding />
      </ProtectedRoute>
    ),
  },
  {
    path: '/onboarding/seeker',
    element: (
      <ProtectedRoute requiredRole="seeker">
        <SeekerOnboarding />
      </ProtectedRoute>
    ),
  },

  // ─── Admin (super admin dashboard, Phase 20) ────────────────────────────────
  // /admin/* routes are gated by ProtectedRoute requiredRole="admin". The actual
  // security boundary is the SECURITY DEFINER RPC layer (migration 023) — every
  // admin_* RPC validates get_user_role(auth.uid()) = 'admin' server-side, so
  // even a DevTools bypass of the frontend gate cannot exfiltrate data.
  // List view pages are placeholders this commit; filled in plan 20-06 / 20-07.
  {
    path: '/admin',
    element: <AdminGate />,
  },
  {
    path: '/admin/employers',
    element: (
      <ProtectedRoute requiredRole="admin">
        <AdminLayout>
          <EmployerList />
        </AdminLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/seekers',
    element: (
      <ProtectedRoute requiredRole="admin">
        <AdminLayout>
          <SeekerList />
        </AdminLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/jobs',
    element: (
      <ProtectedRoute requiredRole="admin">
        <AdminLayout>
          <JobsManagement />
        </AdminLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/placements',
    element: (
      <ProtectedRoute requiredRole="admin">
        <AdminLayout>
          <PlacementPipeline />
        </AdminLayout>
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
