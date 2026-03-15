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
    path: '/dashboard/employer',
    element: (
      <ProtectedRoute requiredRole="employer">
        <EmployerDashboard />
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
  {
    path: '/onboarding/employer',
    element: (
      <ProtectedRoute requiredRole="employer">
        <OnboardingPlaceholder role="employer" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/onboarding/seeker',
    element: (
      <ProtectedRoute requiredRole="seeker">
        <OnboardingPlaceholder role="seeker" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/jobs',
    element: <Placeholder title="Find Work" />,
  },
  {
    path: '/jobs/:id',
    element: <Placeholder title="Job Details" />,
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
    <Toaster position="top-right" richColors />
  </StrictMode>,
)
