import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Mail, RefreshCw, Loader2 } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types/domain'

export function VerifyEmail() {
  const navigate = useNavigate()
  const [isProcessing, setIsProcessing] = useState(false)
  const [isResending, setIsResending] = useState(false)

  // Check if URL contains auth hash tokens (coming from email link click)
  const hasHashToken = typeof window !== 'undefined' && window.location.hash.includes('access_token')

  useEffect(() => {
    if (hasHashToken) {
      setIsProcessing(true)
    }

    // Listen for SIGNED_IN event — fires when email link is clicked and session is established
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setIsProcessing(true)

        // Load role from user_roles table to determine redirect destination
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        const role = (roleData?.role as UserRole) ?? 'seeker'
        navigate(`/dashboard/${role}`)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [navigate, hasHashToken])

  const handleResend = async () => {
    // Get the user's email from the current auth state
    const { data: { session } } = await supabase.auth.getSession()

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
          <Loader2
            size={40}
            className="animate-spin"
            style={{ color: 'var(--color-moss)' }}
          />
          <p className="text-sm text-center" style={{ color: 'var(--color-mid)' }}>
            Please wait while we verify your email address and set up your account.
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Check your inbox"
      subtitle="We've sent you a verification link"
    >
      <div className="space-y-6">
        {/* Email icon */}
        <div className="flex justify-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-hay-lt)' }}
          >
            <Mail size={32} style={{ color: 'var(--color-hay)' }} />
          </div>
        </div>

        {/* Instruction */}
        <div className="text-center space-y-2">
          <p className="text-sm" style={{ color: 'var(--color-mid)' }}>
            We've sent a verification link to your email address. Click the link in that email to
            activate your account.
          </p>
          <p className="text-xs" style={{ color: 'var(--color-light)' }}>
            The link expires after 24 hours. Check your spam folder if you don't see it.
          </p>
        </div>

        {/* Resend button */}
        <button
          type="button"
          onClick={handleResend}
          disabled={isResending}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border text-sm font-medium transition-opacity disabled:opacity-60"
          style={{
            borderColor: 'var(--color-fog)',
            color: 'var(--color-soil)',
            backgroundColor: 'var(--color-white)',
          }}
        >
          <RefreshCw size={15} className={isResending ? 'animate-spin' : ''} />
          {isResending ? 'Resending...' : 'Resend verification email'}
        </button>
      </div>
    </AuthLayout>
  )
}
