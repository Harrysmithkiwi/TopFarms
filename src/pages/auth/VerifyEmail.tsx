import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Mail, RefreshCw, Loader2 } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { ErrorState } from '@/components/ui/ErrorState'
import { supabase } from '@/lib/supabase'
import { reportError } from '@/lib/observability'
import { dashboardPathFor } from '@/lib/routing'
import { consumeReturnTo } from '@/lib/returnTo'
import type { UserRole } from '@/types/domain'

export function VerifyEmail() {
  const navigate = useNavigate()
  const [isProcessing, setIsProcessing] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [roleError, setRoleError] = useState(false)
  const [retryNonce, setRetryNonce] = useState(0)

  // Audit F-12b: both entry points below can fire for the same confirmation, so the first
  // one to resolve wins and the rest are ignored. Without this the page can navigate twice.
  const routed = useRef(false)

  const routeForUser = useCallback(
    async (userId: string) => {
      if (routed.current) return
      routed.current = true
      setIsProcessing(true)

      // Audit F-12: this used `.single()` and DISCARDED its error, then fell back to
      // `?? 'seeker'`. A newly verified EMPLOYER was therefore sent to the seeker
      // dashboard, where ProtectedRoute correctly refused them — "Access Denied" on the
      // highest-traffic step of signup. A transport failure is not evidence of a role, so
      // it must never be answered with a guess.
      //
      // `.maybeSingle()` so "no row yet" is data===null rather than an error, which
      // separates the two cases cleanly: no role is a real state (OAuth signups reach it),
      // a failed read is not.
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        reportError('verify email: load role', error)
        routed.current = false
        setIsProcessing(false)
        setRoleError(true)
        return
      }

      const role = data?.role as UserRole | undefined

      // No role assigned yet — let them choose. SelectRole redirects onward by itself if a
      // role does resolve, so this stays correct even if the read raced an insert.
      // Honour a return target parked at signup (src/lib/returnTo.ts); only
      // consume once the role exists — SelectRole consumes it otherwise.
      navigate(role ? (consumeReturnTo() ?? dashboardPathFor(role)) : '/auth/select-role', {
        replace: true,
      })
    },
    [navigate],
  )

  useEffect(() => {
    let cancelled = false

    // Audit F-12b: the ONLY trigger used to be the SIGNED_IN event. But supabase-js
    // consumes the URL hash at module init — before this component mounts — so the event
    // had already fired by the time we subscribed, and the hash was stripped to a bare `#`
    // (which also made the old `hasHashToken` check false). The handler never ran: a
    // confirmed, signed-in employer sat on "Check your inbox" with no way forward.
    // Reproduced twice on live prod, the second time on wiped storage.
    //
    // So read the session that already exists, and ALSO subscribe for one that arrives
    // later. Whichever resolves first routes; `routed` makes the other a no-op.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled && session?.user) void routeForUser(session.user.id)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) void routeForUser(session.user.id)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [routeForUser, retryNonce])

  if (roleError) {
    return (
      <AuthLayout title="We could not finish setting up your account">
        <ErrorState
          message="Your email is verified, but we could not load your account type."
          onRetry={() => {
            setRoleError(false)
            setRetryNonce((n) => n + 1)
          }}
        />
      </AuthLayout>
    )
  }

  const handleResend = async () => {
    // Get the user's email from the current auth state
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user?.email) {
      toast.error('Unable to resend. Please try signing up again.')
      return
    }

    setIsResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: session.user.email,
      })

      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Verification email sent! Check your inbox.')
      }
    } catch {
      toast.error('Failed to resend. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  if (isProcessing) {
    return (
      <AuthLayout title="Verifying your email...">
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 size={40} className="animate-spin text-brand-hover" />
          <p className="text-center text-sm text-text-muted">
            Please wait while we verify your email address and set up your account.
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Check your inbox" subtitle="We've sent you a verification link">
      <div className="space-y-6">
        {/* Email icon */}
        <div className="flex justify-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50"
          >
            <Mail size={32} className="text-warn-text-on-bg" />
          </div>
        </div>

        {/* Instruction */}
        <div className="space-y-2 text-center">
          <p className="text-sm text-text-muted">
            We've sent a verification link to your email address. Click the link in that email to
            activate your account.
          </p>
          <p className="text-xs text-text-muted">
            The link expires after 24 hours. Check your spam folder if you don't see it.
          </p>
        </div>

        {/* Resend button */}
        <button
          type="button"
          onClick={handleResend}
          disabled={isResending}
          className="min-h-11 border-border text-brand-hover bg-surface flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-60"
        >
          <RefreshCw size={15} className={isResending ? 'animate-spin' : ''} />
          {isResending ? 'Resending...' : 'Resend verification email'}
        </button>
      </div>
    </AuthLayout>
  )
}
