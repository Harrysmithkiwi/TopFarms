import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router'
import { toast } from 'sonner'
import { Eye, EyeOff, Building2, User } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { useAuth } from '@/hooks/useAuth'

const schema = z.object({
  role: z.enum(['employer', 'seeker']),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  terms: z.boolean().refine((v) => v === true, { message: 'You must accept the terms' }),
})

type FormValues = z.infer<typeof schema>

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++

  if (score <= 1) return { score: 25, label: 'Weak', color: 'var(--color-red)' }
  if (score === 2) return { score: 50, label: 'Fair', color: 'var(--color-orange)' }
  if (score === 3) return { score: 75, label: 'Good', color: 'var(--color-hay)' }
  return { score: 100, label: 'Strong', color: 'var(--color-moss)' }
}

export function SignUp() {
  const navigate = useNavigate()
  const { signUpWithRole } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'employer' | 'seeker' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const passwordValue = watch('password', '')
  const strength = getPasswordStrength(passwordValue)

  const onRoleSelect = (role: 'employer' | 'seeker') => {
    setSelectedRole(role)
    setValue('role', role)
  }

  const onSubmit = async (data: FormValues) => {
    if (!data.role) return
    setIsSubmitting(true)
    try {
      const result = await signUpWithRole(data.email, data.password, data.role)
      if (result.error) {
        toast.error(result.error.message)
      } else {
        navigate('/auth/verify')
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join TopFarms — New Zealand's agricultural job marketplace"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Role Selection */}
        <div>
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-ink)' }}>
            I am joining as...
          </p>
          <div className="grid grid-cols-2 gap-3">
            {/* Employer card */}
            <button
              type="button"
              onClick={() => onRoleSelect('employer')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-left transition-all"
              style={{
                borderColor: selectedRole === 'employer' ? 'var(--color-soil)' : 'var(--color-fog)',
                backgroundColor: selectedRole === 'employer' ? 'var(--color-hay-lt)' : 'var(--color-white)',
              }}
            >
              <Building2
                size={28}
                style={{ color: selectedRole === 'employer' ? 'var(--color-soil)' : 'var(--color-light)' }}
              />
              <div>
                <p
                  className="font-semibold text-sm text-center"
                  style={{ color: selectedRole === 'employer' ? 'var(--color-soil)' : 'var(--color-ink)' }}
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
              onClick={() => onRoleSelect('seeker')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-left transition-all"
              style={{
                borderColor: selectedRole === 'seeker' ? 'var(--color-soil)' : 'var(--color-fog)',
                backgroundColor: selectedRole === 'seeker' ? 'var(--color-hay-lt)' : 'var(--color-white)',
              }}
            >
              <User
                size={28}
                style={{ color: selectedRole === 'seeker' ? 'var(--color-soil)' : 'var(--color-light)' }}
              />
              <div>
                <p
                  className="font-semibold text-sm text-center"
                  style={{ color: selectedRole === 'seeker' ? 'var(--color-soil)' : 'var(--color-ink)' }}
                >
                  Seeker
                </p>
                <p className="text-xs text-center mt-0.5" style={{ color: 'var(--color-mid)' }}>
                  Find farm work
                </p>
              </div>
            </button>
          </div>
          {errors.role && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-red)' }}>
              {errors.role.message}
            </p>
          )}
          {/* Hidden input so react-hook-form tracks role */}
          <input type="hidden" {...register('role')} />
        </div>

        {/* Show email/password only after role selected */}
        {selectedRole && (
          <>
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
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-ink)' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
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

              {/* Password strength bar */}
              {passwordValue && (
                <div className="mt-2">
                  <div
                    className="h-[3px] rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--color-fog)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${strength.score}%`,
                        backgroundColor: strength.color,
                      }}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: strength.color }}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2.5">
              <input
                id="terms"
                type="checkbox"
                {...register('terms')}
                className="mt-0.5 rounded"
                style={{ accentColor: 'var(--color-soil)' }}
              />
              <label htmlFor="terms" className="text-sm" style={{ color: 'var(--color-mid)' }}>
                I agree to the{' '}
                <span className="underline cursor-pointer" style={{ color: 'var(--color-soil)' }}>
                  Terms of Service
                </span>{' '}
                and{' '}
                <span className="underline cursor-pointer" style={{ color: 'var(--color-soil)' }}>
                  Privacy Policy
                </span>
              </label>
            </div>
            {errors.terms && (
              <p className="text-xs -mt-4" style={{ color: 'var(--color-red)' }}>
                {errors.terms.message}
              </p>
            )}

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
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </>
        )}

        {/* Login link */}
        <p className="text-center text-sm" style={{ color: 'var(--color-mid)' }}>
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium underline"
            style={{ color: 'var(--color-soil)' }}
          >
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
