import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link, useSearchParams } from 'react-router'
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

  if (score <= 1) return { score: 25, label: 'Weak', color: 'var(--color-danger)' }
  if (score === 2) return { score: 50, label: 'Fair', color: 'var(--color-warn)' }
  if (score === 3) return { score: 75, label: 'Good', color: 'var(--color-warn)' }
  return { score: 100, label: 'Strong', color: 'var(--color-brand)' }
}

export function SignUp() {
  const navigate = useNavigate()
  const { signUpWithRole, signInWithOAuth } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    setOauthLoading(true)
    try {
      await signInWithOAuth(provider)
    } catch {
      toast.error(`Could not connect to ${provider === 'google' ? 'Google' : 'Facebook'}. Please try again.`)
      setOauthLoading(false)
    }
    // No finally — on success, browser redirects away and component unmounts
  }

  const [searchParams] = useSearchParams()
  const roleParam = searchParams.get('role')
  const initialRole = (roleParam === 'employer' || roleParam === 'seeker') ? roleParam : null

  const [selectedRole, setSelectedRole] = useState<'employer' | 'seeker' | null>(initialRole)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (initialRole) {
      setValue('role', initialRole)
    }
  }, [initialRole, setValue])

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
        {/* OAuth buttons — above role selection per locked decision */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleOAuth('google')}
            disabled={oauthLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors disabled:opacity-60"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          <button
            type="button"
            onClick={() => handleOAuth('facebook')}
            disabled={oauthLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
            style={{
              backgroundColor: '#1877F2',
              color: '#FFFFFF',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 9a9 9 0 1 0-10.406 8.89v-6.29H5.309V9h2.285V7.017c0-2.255 1.343-3.501 3.4-3.501.984 0 2.014.176 2.014.176v2.215h-1.135c-1.118 0-1.467.694-1.467 1.406V9h2.496l-.399 2.6h-2.097v6.29A9.002 9.002 0 0 0 18 9Z" fill="#FFFFFF"/>
            </svg>
            Continue with Facebook
          </button>
        </div>

        {/* OR divider */}
        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
          <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>or</span>
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
        </div>

        {/* Role Selection */}
        <div>
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
            I am joining as...
          </p>
          <div className="grid grid-cols-2 gap-3">
            {/* Employer card */}
            <button
              type="button"
              onClick={() => onRoleSelect('employer')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-left transition-all"
              style={{
                borderColor: selectedRole === 'employer' ? 'var(--color-brand-900)' : 'var(--color-border)',
                backgroundColor: selectedRole === 'employer' ? 'var(--color-warn-bg)' : 'var(--color-surface)',
              }}
            >
              <Building2
                size={28}
                style={{ color: selectedRole === 'employer' ? 'var(--color-brand-900)' : 'var(--color-text-subtle)' }}
              />
              <div>
                <p
                  className="font-semibold text-sm text-center"
                  style={{ color: selectedRole === 'employer' ? 'var(--color-brand-900)' : 'var(--color-text)' }}
                >
                  Employer
                </p>
                <p className="text-xs text-center mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
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
                borderColor: selectedRole === 'seeker' ? 'var(--color-brand-900)' : 'var(--color-border)',
                backgroundColor: selectedRole === 'seeker' ? 'var(--color-warn-bg)' : 'var(--color-surface)',
              }}
            >
              <User
                size={28}
                style={{ color: selectedRole === 'seeker' ? 'var(--color-brand-900)' : 'var(--color-text-subtle)' }}
              />
              <div>
                <p
                  className="font-semibold text-sm text-center"
                  style={{ color: selectedRole === 'seeker' ? 'var(--color-brand-900)' : 'var(--color-text)' }}
                >
                  Seeker
                </p>
                <p className="text-xs text-center mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  Find farm work
                </p>
              </div>
            </button>
          </div>
          {errors.role && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>
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
                style={{ color: 'var(--color-text)' }}
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
                  borderColor: errors.email ? 'var(--color-danger)' : 'var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
              />
              {errors.email && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text)' }}
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
                    borderColor: errors.password ? 'var(--color-danger)' : 'var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-text-subtle)' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>
                  {errors.password.message}
                </p>
              )}

              {/* Password strength bar */}
              {passwordValue && (
                <div className="mt-2">
                  <div
                    className="h-[3px] rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--color-border)' }}
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
                style={{ accentColor: 'var(--color-brand-900)' }}
              />
              <label htmlFor="terms" className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                I agree to the{' '}
                <span className="underline cursor-pointer" style={{ color: 'var(--color-brand-900)' }}>
                  Terms of Service
                </span>{' '}
                and{' '}
                <span className="underline cursor-pointer" style={{ color: 'var(--color-brand-900)' }}>
                  Privacy Policy
                </span>
              </label>
            </div>
            {errors.terms && (
              <p className="text-xs -mt-4" style={{ color: 'var(--color-danger)' }}>
                {errors.terms.message}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60"
              style={{
                backgroundColor: 'var(--color-brand-900)',
                color: 'var(--color-text-on-brand)',
              }}
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </>
        )}

        {/* Login link */}
        <p className="text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium underline"
            style={{ color: 'var(--color-brand-900)' }}
          >
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
