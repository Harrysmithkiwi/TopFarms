import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Mail, ArrowLeft } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type FormValues = z.infer<typeof schema>

export function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [sentTo, setSentTo] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true)
    try {
      const result = await resetPassword(data.email)
      if (result.error) {
        toast.error(result.error.message)
      } else {
        setSentTo(data.email)
        setEmailSent(true)
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (emailSent) {
    return (
      <AuthLayout title="Check your email" subtitle="Password reset link sent">
        <div className="space-y-6">
          {/* Mail icon */}
          <div className="flex justify-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full bg-warn-bg"
            >
              <Mail size={32} className="text-warn-text-on-bg" />
            </div>
          </div>

          <div className="space-y-2 text-center">
            <p className="text-sm text-ink-60">
              We've sent a password reset link to{' '}
              <span className="font-medium text-ink">
                {sentTo}
              </span>
              . Click the link to set a new password.
            </p>
            <p className="text-xs text-ink-40">
              The link expires after 1 hour. Check your spam folder if you don't see it.
            </p>
          </div>

          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-sm font-medium underline text-green"
          >
            <ArrowLeft size={14} />
            Back to login
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email and we'll send a reset link"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register('email')}
            className={cn(
              'bg-card text-ink w-full rounded-lg border px-3.5 py-2.5 text-sm transition-colors',
              errors.email ? 'border-danger-ink' : 'border-line',
            )}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-danger-ink">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-11 bg-green text-white w-full rounded-full px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-60"
        >
          {isSubmitting ? 'Sending...' : 'Send reset link'}
        </button>

        {/* Back to login */}
        <Link
          to="/login"
          className="flex items-center justify-center gap-2 text-sm font-medium underline text-green"
        >
          <ArrowLeft size={14} />
          Back to login
        </Link>
      </form>
    </AuthLayout>
  )
}
