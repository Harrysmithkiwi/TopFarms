import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Phone, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface PhoneVerificationProps {
  // No employerId: employer_sync_self_verifications derives the employer from auth.uid(),
  // so the caller can no longer point this component at someone else's row (audit F-11).
  onSuccess: () => void
}

type PhoneStep = 'enter_phone' | 'enter_otp'

/**
 * Inline phone OTP verification component.
 * Step 1: Enter NZ phone number → supabase.auth.updateUser({ phone })
 * Step 2: Enter 6-digit OTP → supabase.auth.verifyOtp({ phone, token, type: 'phone_change' })
 * On success: syncs employer_verifications via RPC and calls onSuccess callback.
 */
export function PhoneVerification({ onSuccess }: PhoneVerificationProps) {
  const [step, setStep] = useState<PhoneStep>('enter_phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({ phone })

      if (updateError) {
        // Provide helpful error when SMS provider not configured
        if (
          updateError.message.toLowerCase().includes('sms') ||
          updateError.message.toLowerCase().includes('phone') ||
          updateError.message.toLowerCase().includes('provider')
        ) {
          setError('Phone verification is not yet configured. Please contact support.')
        } else {
          setError(updateError.message)
        }
        return
      }

      setStep('enter_otp')
      setCooldown(60)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: otpError } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'phone_change',
      })

      if (otpError) {
        setError(otpError.message)
        return
      }

      // Audit F-11: the browser cannot write `status`/`verified_at` (073 revoked both), so
      // the old direct upsert returned 42501 every time. GoTrue has just confirmed the
      // number via verifyOtp above, and auth.users.phone_confirmed_at is the truth — this
      // RPC mirrors it across. No admin review: there is nothing left for a human to decide.
      const { error: syncError } = await supabase.rpc('employer_sync_self_verifications')

      if (syncError) {
        // Previously this was swallowed to console.error and the success toast fired
        // regardless, so the employer was told they were verified while nothing was
        // stored. A failed write must not read as a completed one.
        console.error('PhoneVerification: failed to sync verification record', syncError)
        setError('Your number was confirmed, but we could not update your badge. Please retry.')
        return
      }

      toast.success('Phone number verified!')
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (cooldown > 0) return
    setError(null)
    setLoading(true)

    try {
      const { error: resendError } = await supabase.auth.updateUser({ phone })
      if (resendError) {
        setError(resendError.message)
        return
      }
      setCooldown(60)
      toast.success('Code resent!')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'enter_phone') {
    return (
      <form onSubmit={handleSendCode} className="space-y-3">
        <div className="mb-2 flex items-center gap-2">
          <Phone className="text-brand h-4 w-4" />
          <span className="font-body text-text text-[13px] font-semibold">
            Enter your NZ phone number
          </span>
        </div>
        <Input
          type="tel"
          placeholder="+64 21 123 4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          disabled={loading}
          className="text-[13px]"
        />
        {error && <p className="font-body text-danger text-[12px]">{error}</p>}
        <Button type="submit" size="sm" disabled={loading || !phone.trim()}>
          {loading ? 'Sending...' : 'Send Code'}
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={handleVerifyOtp} className="space-y-3">
      <div className="mb-2 flex items-center gap-2">
        <Phone className="text-brand h-4 w-4" />
        <span className="font-body text-text text-[13px] font-semibold">
          Enter the 6-digit code sent to {phone}
        </span>
      </div>
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        placeholder="123456"
        value={otp}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
        required
        disabled={loading}
        className="text-[13px] tracking-widest"
      />
      {error && <p className="font-body text-danger text-[12px]">{error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={loading || otp.length !== 6}>
          {loading ? 'Verifying...' : 'Verify'}
        </Button>
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || loading}
          className="font-body text-brand-hover hover:text-brand-900 disabled:text-text-subtle flex items-center gap-1 text-[12px] transition-colors disabled:cursor-not-allowed"
        >
          <RefreshCw className="h-3 w-3" />
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
        </button>
      </div>
    </form>
  )
}
