import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Mail, ArrowLeft } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { useAuth } from '@/hooks/useAuth'

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
      <AuthLayout
        title="Check your email"
        subtitle="Password reset link sent"
      >
        <div className="space-y-6">
          {/* Mail icon */}
          <div className="flex justify-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-hay-lt)' }}
            >
              <Mail size={32} style={{ color: 'var(--color-hay)' }} />
            </div>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm" style={{ color: 'var(--color-mid)' }}>
              We've sent a password reset link to{' '}
              <span className="font-medium" style={{ color: 'var(--color-ink)' }}>
                {sentTo}
              </span>
              . Click the link to set a new password.
            </p>
            <p className="text-xs" style={{ color: 'var(--color-light)' }}>
              The link expires after 1 hour. Check your spam folder if you don't see it.
            </p>
          </div>

          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-sm font-medium underline"
            style={{ color: 'var(--color-soil)' }}
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
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'var(--color-ink)' }}
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register('email')}
            className="w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none transition-colors"
            style={{
              borderColor: errors.email ? 'var(--color-red)' : 'var(--color-fog)',
              backgroundColor: 'var(--color-white)',
              color: 'var(--color-ink)',
            }}
          />
          {errors.email && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-red)' }}>
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60"
          style={{
            backgroundColor: 'var(--color-soil)',
            color: 'var(--color-cream)',
          }}
        >
          {isSubmitting ? 'Sending...' : 'Send reset link'}
        </button>

        {/* Back to login */}
        <Link
          to="/login"
          className="flex items-center justify-center gap-2 text-sm font-medium underline"
          style={{ color: 'var(--color-soil)' }}
        >
          <ArrowLeft size={14} />
          Back to login
        </Link>
      </form>
    </AuthLayout>
  )
}
