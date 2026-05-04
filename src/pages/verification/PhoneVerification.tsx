import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Phone, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface PhoneVerificationProps {
  employerId: string
  onSuccess: () => void
}

type PhoneStep = 'enter_phone' | 'enter_otp'

/**
 * Inline phone OTP verification component.
 * Step 1: Enter NZ phone number → supabase.auth.updateUser({ phone })
 * Step 2: Enter 6-digit OTP → supabase.auth.verifyOtp({ phone, token, type: 'phone_change' })
 * On success: upserts employer_verifications record and calls onSuccess callback.
 */
export function PhoneVerification({ employerId, onSuccess }: PhoneVerificationProps) {
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

      // Upsert verification record
      const { error: upsertError } = await supabase.from('employer_verifications').upsert(
        {
          employer_id: employerId,
          method: 'phone',
          status: 'verified',
          verified_at: new Date().toISOString(),
        },
        { onConflict: 'employer_id,method' },
      )

      if (upsertError) {
        console.error('PhoneVerification: failed to upsert verification record', upsertError)
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
        <div className="flex items-center gap-2 mb-2">
          <Phone className="w-4 h-4 text-brand" />
          <span className="text-[13px] font-body font-semibold text-text">
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
        {error && <p className="text-[12px] font-body text-danger-600">{error}</p>}
        <Button type="submit" size="sm" disabled={loading || !phone.trim()}>
          {loading ? 'Sending...' : 'Send Code'}
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={handleVerifyOtp} className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Phone className="w-4 h-4 text-brand" />
        <span className="text-[13px] font-body font-semibold text-text">
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
      {error && <p className="text-[12px] font-body text-danger-600">{error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={loading || otp.length !== 6}>
          {loading ? 'Verifying...' : 'Verify'}
        </Button>
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || loading}
          className="flex items-center gap-1 text-[12px] font-body text-brand hover:text-brand-hover disabled:text-text-subtle disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
        </button>
      </div>
    </form>
  )
}
