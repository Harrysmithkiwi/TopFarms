import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Building2, User } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export function SelectRole() {
  const { session, role, loading, refreshRole } = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 rounded-full border-4 border-fog border-t-moss animate-spin"
            aria-label="Loading"
          />
          <p className="text-sm" style={{ color: 'var(--color-mid)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  if (role) return <Navigate to={`/dashboard/${role}`} replace />

  const handleRoleSelect = async (selectedRole: 'employer' | 'seeker') => {
    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: session.user.id, role: selectedRole })
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
    <AuthLayout
      title="Choose your role"
      subtitle="How will you use TopFarms?"
    >
      <div className="space-y-6">
        <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
          I am joining as...
        </p>
        <div className="grid grid-cols-2 gap-3">
          {/* Employer card */}
          <button
            type="button"
            onClick={() => handleRoleSelect('employer')}
            disabled={isSubmitting}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-left transition-all hover:border-soil hover:bg-hay-lt disabled:opacity-60"
            style={{
              borderColor: 'var(--color-fog)',
              backgroundColor: 'var(--color-white)',
            }}
          >
            <Building2
              size={28}
              style={{ color: 'var(--color-light)' }}
            />
            <div>
              <p
                className="font-semibold text-sm text-center"
                style={{ color: 'var(--color-ink)' }}
              >
                Employer
              </p>
              <p className="text-xs text-center mt-0.5" style={{ color: 'var(--color-mid)' }}>
                Post farm jobs
              </p>
            </div>
          </button>

          {/* Seeker card */}
          <button
            type="button"
            onClick={() => handleRoleSelect('seeker')}
            disabled={isSubmitting}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-left transition-all hover:border-soil hover:bg-hay-lt disabled:opacity-60"
            style={{
              borderColor: 'var(--color-fog)',
              backgroundColor: 'var(--color-white)',
            }}
          >
            <User
              size={28}
              style={{ color: 'var(--color-light)' }}
            />
            <div>
              <p
                className="font-semibold text-sm text-center"
                style={{ color: 'var(--color-ink)' }}
              >
                Seeker
              </p>
              <p className="text-xs text-center mt-0.5" style={{ color: 'var(--color-mid)' }}>
                Find farm work
              </p>
            </div>
          </button>
        </div>
      </div>
    </AuthLayout>
  )
}
