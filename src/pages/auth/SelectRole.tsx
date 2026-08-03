import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Building2, User } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { dashboardPathFor } from '@/lib/routing'
import { RouteSkeleton } from '@/components/ui/Skeleton'

export function SelectRole() {
  const { session, role, loading, refreshRole } = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (loading) {
    return (
      <div className="bg-cream flex min-h-screen items-center justify-center">
        <RouteSkeleton />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  if (role) {
    const dest = dashboardPathFor(role)
    return <Navigate to={dest} replace />
  }

  const handleRoleSelect = async (selectedRole: 'employer' | 'seeker') => {
    setIsSubmitting(true)
    try {
      const { error } = await supabase.rpc('set_user_role', { p_role: selectedRole })
      if (error) {
        toast.error('Failed to save your role. Please try again.')
        return
      }
      await refreshRole()
      navigate(`/onboarding/${selectedRole}`, { replace: true })
    } catch {
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Choose your role" subtitle="How will you use TopFarms?">
      <div className="space-y-6">
        <p className="text-sm font-medium text-ink">
          I am joining as...
        </p>
        <div className="grid grid-cols-2 gap-3">
          {/* Employer card */}
          <button
            type="button"
            onClick={() => handleRoleSelect('employer')}
            disabled={isSubmitting}
            className="border-line bg-card hover:border-green hover:bg-warn-bg flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-left transition-all disabled:opacity-60"
          >
            <Building2 className="text-ink-40" size={28} />
            <div>
              <p
                className="text-center text-sm font-semibold text-ink"
              >
                Employer
              </p>
              <p
                className="mt-0.5 text-center text-xs text-ink-60"
              >
                Post farm jobs
              </p>
            </div>
          </button>

          {/* Seeker card */}
          <button
            type="button"
            onClick={() => handleRoleSelect('seeker')}
            disabled={isSubmitting}
            className="border-line bg-card hover:border-green hover:bg-warn-bg flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-left transition-all disabled:opacity-60"
          >
            <User className="text-ink-40" size={28} />
            <div>
              <p
                className="text-center text-sm font-semibold text-ink"
              >
                Seeker
              </p>
              <p
                className="mt-0.5 text-center text-xs text-ink-60"
              >
                Find farm work
              </p>
            </div>
          </button>
        </div>
      </div>
    </AuthLayout>
  )
}
