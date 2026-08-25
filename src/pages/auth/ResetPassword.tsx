import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router'
import { toast } from 'sonner'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

export function ResetPassword() {
  const navigate = useNavigate()
  const { updatePassword } = useAuth()
  const [recoveryReady, setRecoveryReady] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    // Two ways to arrive here, and before Phase 5.0e only the first worked.
    //
    // 1. Land directly on /auth/reset — supabase-js parses the token out of the
    //    URL and fires PASSWORD_RECOVERY while this component is mounted.
    //
    // 2. Land on ANY other route first (a recovery link that used the project
    //    Site URL rather than redirectTo, e.g. every mail sent from the Supabase
    //    dashboard). detectSessionInUrl: true consumes the token THERE, the
    //    event fires with nothing listening, and the user is silently signed in
    //    with no way to set a password. Navigating here afterwards then showed
    //    "Link expired", because the event had already passed.
    //
    // So also accept an existing session: a recovery token that has already been
    // exchanged is still a valid authorisation to set a new password, and
    // updateUser() accepts it. This doubles as the account-level "change my
    // password" surface, which the product otherwise has nowhere.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setRecoveryReady(true)
    })

    // Listen for PASSWORD_RECOVERY event from Supabase
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryReady(true)
      }
    })

    // If no PASSWORD_RECOVERY event after 5 seconds, show invalid link message
    const timeout = setTimeout(() => {
      setTimedOut((prev) => {
        if (!prev) {
          // Only time out if recovery is still not ready
          return true
        }
        return prev
      })
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  // If recovery becomes ready, clear the timeout state
  useEffect(() => {
    if (recoveryReady) {
      setTimedOut(false)
    }
  }, [recoveryReady])

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true)
    try {
      const result = await updatePassword(data.password)
      if (result.error) {
        toast.error(result.error.message)
      } else {
        toast.success('Password updated successfully! Please log in with your new password.')
        navigate('/login')
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Timed out without PASSWORD_RECOVERY — invalid or expired link
  if (timedOut && !recoveryReady) {
    return (
      <AuthLayout title="Link expired" subtitle="This reset link is no longer valid">
        <div className="space-y-6">
          <div className="flex justify-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-bg"
            >
              <AlertCircle className="text-danger-text-on-bg" size={32} />
            </div>
          </div>

          <p className="text-center text-sm text-text-muted">
            This password reset link is invalid or has expired. Reset links are valid for 1 hour.
          </p>

          <Link
            to="/forgot-password"
            className="min-h-11 bg-brand-hover text-white block w-full rounded-full px-4 py-2.5 text-center text-sm font-semibold"
          >
            Request a new reset link
          </Link>
        </div>
      </AuthLayout>
    )
  }

  // Waiting for PASSWORD_RECOVERY event
  if (!recoveryReady) {
    return (
      <AuthLayout title="Verifying reset link...">
        <div className="flex flex-col items-center gap-4 py-8">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent border-brand"
          />
          <p className="text-center text-sm text-text-muted">
            Verifying your reset link...
          </p>
        </div>
      </AuthLayout>
    )
  }

  // PASSWORD_RECOVERY event received — show new password form
  return (
    <AuthLayout title="Set new password" subtitle="Choose a strong password for your account">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* New password */}
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-text"
          >
            New password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              {...register('password')}
              className={cn(
                'bg-surface text-text w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm transition-colors',
                errors.password ? 'border-danger' : 'border-border',
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="min-h-11 min-w-11 absolute top-1/2 right-3 -translate-y-1/2 text-text-muted"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-danger-text-on-bg">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1.5 block text-sm font-medium text-text"
          >
            Confirm new password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              {...register('confirmPassword')}
              className={cn(
                'bg-surface text-text w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm transition-colors',
                errors.confirmPassword ? 'border-danger' : 'border-border',
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="min-h-11 min-w-11 absolute top-1/2 right-3 -translate-y-1/2 text-text-muted"
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-danger-text-on-bg">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-11 bg-brand-hover text-white w-full rounded-full px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-60"
        >
          {isSubmitting ? 'Updating password...' : 'Update password'}
        </button>
      </form>
    </AuthLayout>
  )
}
