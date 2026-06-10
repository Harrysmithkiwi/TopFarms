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
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: 'var(--color-danger-bg)' }}
            >
              <AlertCircle size={32} style={{ color: 'var(--color-danger)' }} />
            </div>
          </div>

          <p className="text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            This password reset link is invalid or has expired. Reset links are valid for 1 hour.
          </p>

          <Link
            to="/forgot-password"
            className="block w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold"
            style={{
              backgroundColor: 'var(--color-brand-900)',
              color: 'var(--color-text-on-brand)',
            }}
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
            className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: 'var(--color-brand)' }}
          />
          <p className="text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
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
            className="mb-1.5 block text-sm font-medium"
            style={{ color: 'var(--color-text)' }}
          >
            New password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              {...register('password')}
              className="w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm transition-colors outline-none"
              style={{
                borderColor: errors.password ? 'var(--color-danger)' : 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute top-1/2 right-3 -translate-y-1/2"
              style={{ color: 'var(--color-text-subtle)' }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1.5 block text-sm font-medium"
            style={{ color: 'var(--color-text)' }}
          >
            Confirm new password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              {...register('confirmPassword')}
              className="w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm transition-colors outline-none"
              style={{
                borderColor: errors.confirmPassword ? 'var(--color-danger)' : 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute top-1/2 right-3 -translate-y-1/2"
              style={{ color: 'var(--color-text-subtle)' }}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-60"
          style={{
            backgroundColor: 'var(--color-brand-900)',
            color: 'var(--color-text-on-brand)',
          }}
        >
          {isSubmitting ? 'Updating password...' : 'Update password'}
        </button>
      </form>
    </AuthLayout>
  )
}
