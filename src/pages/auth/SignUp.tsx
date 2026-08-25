import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link, useSearchParams } from 'react-router'
import { track } from '@vercel/analytics'
import { toast } from 'sonner'
import { Eye, EyeOff, Building2, User } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { useAuth } from '@/hooks/useAuth'
import { usePageMeta } from '@/lib/usePageMeta'
import { cn } from '@/lib/utils'

const schema = z.object({
  role: z.enum(['employer', 'seeker']),
  email: z.string().email('Please enter a valid email address'),
  // TF-010 — real password policy: length + letters + numbers. "password123"-class
  // strings still get caught by Supabase leaked-password protection server-side.
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .regex(/[a-zA-Z]/, 'Password must include at least one letter')
    .regex(/[0-9]/, 'Password must include at least one number'),
  terms: z.boolean().refine((v) => v === true, { message: 'You must accept the terms' }),
})

type FormValues = z.infer<typeof schema>

// Phase 4.1 / 5.1: `barClass` fills the meter (a fill MAY use the raw semantic
// colour); `textClass` styles the label and must clear 4.5:1 on white — raw
// --color-warn as text is 2.15:1, so the label uses warn-text-on-bg. Both are now
// Tailwind classes rather than CSS values, which puts them under the contrast
// gate's source scan; as inline styles they were invisible to it.
function getPasswordStrength(password: string): {
  score: number
  label: string
  barClass: string
  textClass: string
} {
  if (!password) return { score: 0, label: '', barClass: '', textClass: '' }
  let score = 0
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++

  if (score <= 1)
    return { score: 25, label: 'Weak', barClass: 'bg-danger', textClass: 'text-danger-text-on-bg' }
  if (score === 2)
    return { score: 50, label: 'Fair', barClass: 'bg-warn', textClass: 'text-warn-text-on-bg' }
  if (score === 3)
    return { score: 75, label: 'Good', barClass: 'bg-warn', textClass: 'text-warn-text-on-bg' }
  return {
    score: 100,
    label: 'Strong',
    barClass: 'bg-brand-900',
    textClass: 'text-brand-900',
  }
}

export function SignUp() {
  usePageMeta(
    'Sign up | TopFarms',
    'Create a free TopFarms account to find farm work or post agricultural jobs in New Zealand.',
  )
  const navigate = useNavigate()
  const { signUpWithRole, signInWithOAuth } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)

  const handleOAuth = async (provider: 'google') => {
    setOauthLoading(true)
    try {
      // OAuth leaves the app, so `?ref=` cannot ride in signUp metadata the way the
      // email path does. Stash it and let SelectRole write it after the round trip.
      // sessionStorage rather than a redirectTo param on purpose: the Supabase redirect
      // allowlist is a known-broken surface (go-live ticket 02), and this needs no
      // allowlist entry at all.
      if (attributionRef) sessionStorage.setItem('tf-signup-ref', attributionRef)
      await signInWithOAuth(provider)
    } catch {
      toast.error('Could not connect to Google. Please try again.')
      setOauthLoading(false)
    }
    // No finally — on success, browser redirects away and component unmounts
  }

  const [searchParams] = useSearchParams()
  const roleParam = searchParams.get('role')
  const initialRole = roleParam === 'employer' || roleParam === 'seeker' ? roleParam : null

  // Attribution: `?ref=` on an outreach link, carrying the first 8 hex characters of a
  // lead_staging id (a full UUID is still accepted — links already sent stay valid).
  // Validated rather than passed through: it lands in user metadata permanently, and a
  // junk value would sit there forever pretending to be a lead. Absent or malformed
  // simply means organic, which is a real and common case.
  const refParam = searchParams.get('ref')
  const attributionRef =
    refParam &&
    /^[0-9a-f]{8}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(refParam)
      ? refParam.toLowerCase()
      : null

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

  // Funnel: signup intent becomes concrete when a role is known (picked or
  // preselected via ?role=). Fires once per role value.
  useEffect(() => {
    if (selectedRole) track('signup_start', { role: selectedRole })
  }, [selectedRole])

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
      const result = await signUpWithRole(data.email, data.password, data.role, attributionRef)
      if (result.error) {
        toast.error(result.error.message, {
          duration: Infinity,
          closeButton: true,
        })
      } else {
        track('signup_complete', { role: data.role, attributed: attributionRef ? 'yes' : 'no' })
        navigate('/auth/verify')
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.', {
        duration: Infinity,
        closeButton: true,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join TopFarms. New Zealand's agricultural job marketplace"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* OAuth buttons — above role selection per locked decision */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleOAuth('google')}
            disabled={oauthLoading}
            className="min-h-11 border-border bg-surface text-text flex w-full items-center justify-center gap-3 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58Z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </button>
        </div>

        {/* OR divider */}
        <div className="relative flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-text-muted">
            or
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Role Selection */}
        <div>
          <p className="mb-3 text-sm font-medium text-text" id="signup-role-label">
            I am joining as...
          </p>
          {/* A screen reader heard two unrelated buttons, neither of which said whether it was
              the one currently chosen — the selection was carried by border and text colour
              alone. Grouped and labelled by the prompt above, with aria-pressed mirroring
              `selectedRole`. First screen of the funnel outreach drives to, so it is the last
              place to make someone guess. docs/DESIGN.md §5. */}
          <div className="grid grid-cols-2 gap-3" role="group" aria-labelledby="signup-role-label">
            {/* Employer card */}
            <button
              type="button"
              aria-pressed={selectedRole === 'employer'}
              onClick={() => onRoleSelect('employer')}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-left transition-all',
                selectedRole === 'employer'
                  ? 'border-brand-900 bg-brand-50'
                  : 'border-border bg-surface',
              )}
            >
              <Building2
                size={28}
                className={selectedRole === 'employer' ? 'text-brand-hover' : 'text-text-muted'}
              />
              <div>
                <p
                  className={cn(
                    'text-center text-sm font-semibold',
                    selectedRole === 'employer' ? 'text-brand-hover' : 'text-text',
                  )}
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
              aria-pressed={selectedRole === 'seeker'}
              onClick={() => onRoleSelect('seeker')}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-left transition-all',
                selectedRole === 'seeker'
                  ? 'border-brand-900 bg-brand-50'
                  : 'border-border bg-surface',
              )}
            >
              <User
                size={28}
                className={selectedRole === 'seeker' ? 'text-brand-hover' : 'text-text-muted'}
              />
              <div>
                <p
                  className={cn(
                    'text-center text-sm font-semibold',
                    selectedRole === 'seeker' ? 'text-brand-hover' : 'text-text',
                  )}
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
          {errors.role && (
            <p className="mt-1 text-xs text-danger-text-on-bg">
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
                className="mb-1.5 block text-sm font-medium text-text"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                className={cn(
                  'bg-surface text-text w-full rounded-lg border px-3.5 py-2.5 text-sm transition-colors',
                  errors.email ? 'border-danger' : 'border-border',
                )}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-danger-text-on-bg">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-text"
              >
                Password
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

              {/* Password strength bar */}
              {passwordValue && (
                <div className="mt-2">
                  <div
                    className="h-[3px] overflow-hidden rounded-full bg-border"
                  >
                    <div
                      className={cn('h-full rounded-full transition-all duration-300', strength.barClass)}
                      style={{ width: `${strength.score}%` }}
                    />
                  </div>
                  <p className={cn('mt-1 text-xs', strength.textClass)}>
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
                className="mt-0.5 rounded accent-brand-900"
              />
              <label
                htmlFor="terms"
                className="text-sm text-text-muted"
              >
                I agree to the{' '}
                <Link
                  to="/terms"
                  target="_blank"
                  rel="noopener"
                  className="underline text-brand-hover"
                >
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link
                  to="/privacy"
                  target="_blank"
                  rel="noopener"
                  className="underline text-brand-hover"
                >
                  Privacy Policy
                </Link>
              </label>
            </div>
            {errors.terms && (
              <p className="-mt-4 text-xs text-danger-text-on-bg">
                {errors.terms.message}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-11 bg-brand-hover text-white w-full rounded-full px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-60"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </>
        )}

        {/* Login link */}
        <p className="text-center text-sm text-text-muted">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium underline text-brand-hover"
          >
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
