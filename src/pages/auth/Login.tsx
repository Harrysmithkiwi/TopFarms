import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { useAuth } from '@/hooks/useAuth'

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

export function Login() {
  const { signIn } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      const result = await signIn(data.email, data.password)
      if (result.error) {
        toast.error(result.error.message)
      } else {
        toast.success('Logged in successfully!')
        // Routing to dashboard handled in Plan 04 via onAuthStateChange
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to your TopFarms account"
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

        {/* Password */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium"
              style={{ color: 'var(--color-ink)' }}
            >
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs underline"
              style={{ color: 'var(--color-soil)' }}
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              {...register('password')}
              className="w-full px-3.5 py-2.5 pr-10 rounded-lg border text-sm outline-none transition-colors"
              style={{
                borderColor: errors.password ? 'var(--color-red)' : 'var(--color-fog)',
                backgroundColor: 'var(--color-white)',
                color: 'var(--color-ink)',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--color-light)' }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-red)' }}>
              {errors.password.message}
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
          {isSubmitting ? 'Logging in...' : 'Log in'}
        </button>

        {/* Signup link */}
        <p className="text-center text-sm" style={{ color: 'var(--color-mid)' }}>
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="font-medium underline"
            style={{ color: 'var(--color-soil)' }}
          >
            Sign up
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
