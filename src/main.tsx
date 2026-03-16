import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { Toaster } from 'sonner'
import './index.css'

import { Home } from '@/pages/Home'
import { Login } from '@/pages/auth/Login'
import { SignUp } from '@/pages/auth/SignUp'
import { VerifyEmail } from '@/pages/auth/VerifyEmail'
import { ForgotPassword } from '@/pages/auth/ForgotPassword'
import { ResetPassword } from '@/pages/auth/ResetPassword'
import { EmployerDashboard } from '@/pages/dashboard/EmployerDashboard'
import { SeekerDashboard } from '@/pages/dashboard/SeekerDashboard'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { EmployerOnboarding } from '@/pages/onboarding/EmployerOnboarding'
import { SeekerOnboarding } from '@/pages/onboarding/SeekerOnboarding'
import { PostJob } from '@/pages/jobs/PostJob'
import { JobDetail } from '@/pages/jobs/JobDetail'
import { EmployerVerification } from '@/pages/verification/EmployerVerification'
import { DocumentUpload } from '@/pages/verification/DocumentUpload'
import { FarmPhotoUpload } from '@/pages/verification/FarmPhotoUpload'

// Placeholder for routes defined in future phases
function Placeholder({ title }: { title: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="text-center">
        <h1
          className="font-display text-3xl font-semibold mb-2"
          style={{ color: 'var(--color-soil)' }}
        >
          {title}
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-mid)' }}>
          Coming soon in a future phase
        </p>
      </div>
    </div>
  )
}

function OnboardingPlaceholder({ role }: { role: 'employer' | 'seeker' }) {
  return (
    <DashboardLayout>
      <Placeholder title={role === 'employer' ? 'Employer Onboarding' : 'Seeker Onboarding'} />
    </DashboardLayout>
  )
}

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

  // ─── Jobs ───────────────────────────────────────────────────────────────────
  // NOTE: /jobs/new MUST be declared before /jobs/:id to prevent React Router
  // from treating "new" as a dynamic :id param.
  {
    path: '/jobs',
    element: <Placeholder title="Find Work" />, // Phase 3: seeker search page
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
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
    <Toaster position="top-right" richColors />
  </StrictMode>,
)
