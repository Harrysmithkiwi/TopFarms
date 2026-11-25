import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Building2, User } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { reportError } from '@/lib/observability'
import { dashboardPathFor } from '@/lib/routing'
import { consumeReturnTo } from '@/lib/returnTo'
import { RouteSkeleton } from '@/components/ui/Skeleton'

export function SelectRole() {
  const { session, role, loading, refreshRole } = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Parked-role correction (see effect below): while it is being applied, the
  // `if (role)` redirect must wait, or it fires first and sends an employer to
  // the seeker dashboard. If applying fails, the picker is shown instead so the
  // user can choose, rather than being bounced to the wrong dashboard.
  const [applyingParkedRole, setApplyingParkedRole] = useState(false)
  const [parkedRoleFailed, setParkedRoleFailed] = useState(false)
  // One-shot guard as a ref, not state: setting state synchronously in the
  // effect body trips react-hooks/set-state-in-effect, and this flag never
  // needs to render anything.
  const parkedRoleCheckedRef = useRef(false)

  // Read synchronously for render: the handle_new_user trigger defaults an
  // OAuth signup to seeker, so `role` is already set when this page renders.
  // Without this gate the `if (role)` redirect below fires on first paint,
  // before any effect could correct it.
  const parkedRoleRaw =
    typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('tf-signup-role') : null
  const parkedRole =
    parkedRoleRaw === 'employer' || parkedRoleRaw === 'seeker' ? parkedRoleRaw : null
  const parkedRoleMismatched = parkedRole !== null && role !== null && parkedRole !== role

  // `?role=` parked by SignUp before the OAuth round trip. The trigger has
  // already defaulted this fresh signup to seeker by the time we render, so a
  // parked employer role must be written back via set_user_role before the
  // redirect below. Fresh accounts only: a returning user re-authenticating
  // through the signup page must never have their stored role flipped by a
  // stale parked value, so an account older than 10 minutes is left alone and
  // the parked value is discarded.
  useEffect(() => {
    if (loading || !session || !role || parkedRoleCheckedRef.current) return
    parkedRoleCheckedRef.current = true
    const parked = sessionStorage.getItem('tf-signup-role')
    if (!parked) return
    sessionStorage.removeItem('tf-signup-role')
    if (parked !== 'employer' && parked !== 'seeker') return
    if (parked === role) return
    const accountAgeMs = Date.now() - new Date(session.user.created_at).getTime()
    if (accountAgeMs > 10 * 60 * 1000) return
    void (async () => {
      setApplyingParkedRole(true)
      try {
        const { error } = await supabase.rpc('set_user_role', { p_role: parked })
        if (error) {
          reportError('select role: apply parked role', error)
          toast.error('We could not set your role. Please pick it below.')
          setParkedRoleFailed(true)
          setApplyingParkedRole(false)
          return
        }
        await refreshRole()
        navigate(`/onboarding/${parked}`, { replace: true })
      } catch (err: unknown) {
        reportError('select role: apply parked role', err)
        toast.error('We could not set your role. Please pick it below.')
        setParkedRoleFailed(true)
        setApplyingParkedRole(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session, role])

  if (loading || applyingParkedRole || (parkedRoleMismatched && !parkedRoleFailed)) {
    return (
      <div className="bg-bg flex min-h-screen items-center justify-center">
        <RouteSkeleton />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  if (role && !parkedRoleFailed) {
    // Existing user back from an OAuth round trip: honour the target parked
    // before the redirect (src/lib/returnTo.ts), else the usual dashboard.
    const dest = consumeReturnTo() ?? dashboardPathFor(role)
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
      // Carry the outreach attribution across the OAuth round trip. Best-effort: a
      // failure here must never block someone finishing signup, so it is swallowed —
      // the cost is one unattributed lead, not a lost account.
      const ref = sessionStorage.getItem('tf-signup-ref')
      if (ref) {
        sessionStorage.removeItem('tf-signup-ref')
        await supabase.auth.updateUser({ data: { ref } }).catch(() => {})
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
        <p className="text-sm font-medium text-text">
          I am joining as...
        </p>
        <div className="grid grid-cols-2 gap-3">
          {/* Employer card */}
          <button
            type="button"
            onClick={() => handleRoleSelect('employer')}
            disabled={isSubmitting}
            className="border-border bg-surface hover:border-brand hover:bg-brand-50 flex flex-col items-center gap-2 rounded-12 border-2 p-4 text-left transition-all disabled:opacity-60"
          >
            <Building2 className="text-text-muted" size={28} />
            <div>
              <p
                className="text-center text-sm font-semibold text-text"
              >
                Employer
              </p>
              <p
                className="mt-0.5 text-center text-xs text-text-muted"
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
            className="border-border bg-surface hover:border-brand hover:bg-brand-50 flex flex-col items-center gap-2 rounded-12 border-2 p-4 text-left transition-all disabled:opacity-60"
          >
            <User className="text-text-muted" size={28} />
            <div>
              <p
                className="text-center text-sm font-semibold text-text"
              >
                Seeker
              </p>
              <p
                className="mt-0.5 text-center text-xs text-text-muted"
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
