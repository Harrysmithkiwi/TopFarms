import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams, Link } from 'react-router'
import { toast } from 'sonner'
import { AlertCircle, ArrowLeft, Loader2, RefreshCw } from 'lucide-react'
import type { EmailOtpType } from '@supabase/supabase-js'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { ErrorState } from '@/components/ui/ErrorState'
import { supabase } from '@/lib/supabase'
import { reportError } from '@/lib/observability'
import { dashboardPathFor } from '@/lib/routing'
import type { UserRole } from '@/types/domain'

// Path-based email verification — the fix for the corrupted-link blocker.
//
// The default Supabase links carry the token in a query string: `?token=46b4…` is
// quoted-printable encoded as `token=3D46b4…` in transit, and a double decode somewhere in
// the mail path reads `=46` as byte 0x46 = 'F', delivering `tokenF…`. Deterministic: a hex
// token always begins with two hex digits, so `=` + 2 hex is always a valid QP escape. The
// provider-independent fix is a link with NO `=` anywhere near the token — hence a path
// segment. The email templates link here with `{{ .TokenHash }}` and this page exchanges it
// via verifyOtp.
//
// The token is CONSUMED by a successful verifyOtp — the role-load retry below must never
// re-run the exchange, only the role read.

const VALID_TYPES: readonly EmailOtpType[] = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
]

function isEmailOtpType(t: string | undefined): t is EmailOtpType {
  return !!t && (VALID_TYPES as readonly string[]).includes(t)
}

type Status = 'verifying' | 'linkError' | 'roleError'

export function ConfirmEmail() {
  const navigate = useNavigate()
  const { type, tokenHash } = useParams()
  // A malformed URL is known at render time — start in the error state rather than
  // setting it from the effect.
  const validLink = isEmailOtpType(type) && !!tokenHash
  const [status, setStatus] = useState<Status>(validLink ? 'verifying' : 'linkError')
  const [resendEmail, setResendEmail] = useState('')
  const [isResending, setIsResending] = useState(false)

  // Same double-fire guard as VerifyEmail (audit F-12b): effect can re-run under
  // StrictMode; only the first exchange counts.
  const exchanged = useRef(false)

  // Same routing as VerifyEmail's success path (audit F-12: `.maybeSingle()`, never guess a
  // role from a failed read). Recovery goes to the password form instead — that is what the
  // token authorises.
  const routeForUser = useCallback(
    async (userId: string) => {
      if (type === 'recovery') {
        navigate('/auth/reset', { replace: true })
        return
      }
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        reportError('confirm email: load role', error)
        setStatus('roleError')
        return
      }

      const role = data?.role as UserRole | undefined
      navigate(role ? dashboardPathFor(role) : '/auth/select-role', { replace: true })
    },
    [navigate, type],
  )

  useEffect(() => {
    if (exchanged.current) return
    exchanged.current = true

    if (!isEmailOtpType(type) || !tokenHash) return

    supabase.auth
      .verifyOtp({ type, token_hash: tokenHash })
      .then(({ data, error }) => {
        if (error || !data.user) {
          if (error) reportError('confirm email: verifyOtp', error)
          setStatus('linkError')
          return
        }
        void routeForUser(data.user.id)
      })
      .catch((err: unknown) => {
        reportError('confirm email: verifyOtp', err)
        setStatus('linkError')
      })
  }, [type, tokenHash, routeForUser])

  const retryRoleLoad = async () => {
    setStatus('verifying')
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session?.user) {
      void routeForUser(session.user.id)
    } else {
      setStatus('linkError')
    }
  }

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resendEmail) return
    setIsResending(true)
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: resendEmail })
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

  if (status === 'roleError') {
    return (
      <AuthLayout title="We could not finish setting up your account">
        <ErrorState
          message="Your email is verified, but we could not load your account type."
          onRetry={() => void retryRoleLoad()}
        />
      </AuthLayout>
    )
  }

  if (status === 'linkError') {
    return (
      <AuthLayout title="This link didn't work">
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="bg-danger-bg flex h-16 w-16 items-center justify-center rounded-full">
              <AlertCircle size={32} className="text-danger-text-on-bg" />
            </div>
          </div>

          <p className="text-ink-60 text-center text-sm">
            {type === 'recovery'
              ? 'This password reset link has expired or has already been used. Request a new one below.'
              : 'This verification link has expired or has already been used. Enter your email and we will send a fresh one.'}
          </p>

          {type === 'recovery' ? (
            <Link
              to="/forgot-password"
              className="min-h-11 bg-green flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold text-white"
            >
              Request a new reset link
            </Link>
          ) : (
            <form onSubmit={handleResend} className="space-y-4">
              <div>
                <label htmlFor="resend-email" className="text-ink mb-1.5 block text-sm font-medium">
                  Email address
                </label>
                <input
                  id="resend-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="bg-card text-ink border-line w-full rounded-lg border px-3.5 py-2.5 text-sm transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isResending}
                className="min-h-11 bg-green flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
              >
                <RefreshCw size={15} className={isResending ? 'animate-spin' : ''} />
                {isResending ? 'Sending...' : 'Send a new verification email'}
              </button>
            </form>
          )}

          <Link
            to="/login"
            className="text-green flex items-center justify-center gap-2 text-sm font-medium underline"
          >
            <ArrowLeft size={14} />
            Back to login
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Verifying your email...">
      <div className="flex flex-col items-center gap-4 py-8">
        <Loader2 size={40} className="text-green animate-spin" />
        <p className="text-ink-60 text-center text-sm">
          Please wait while we verify your email address and set up your account.
        </p>
      </div>
    </AuthLayout>
  )
}
