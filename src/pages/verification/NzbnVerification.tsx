import { useState } from 'react'
import { toast } from 'sonner'
import { Building2, Clock, Check, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { EmployerVerification } from '@/types/domain'

interface NzbnVerificationProps {
  employerId: string
  existingVerification: EmployerVerification | null
  onSuccess: () => void
}

/**
 * Inline NZBN (New Zealand Business Number) verification component.
 * Manual process — admin reviews and confirms. MVP has no NZBN API integration.
 *
 * States:
 * - No submission yet: show input for 13-digit NZBN
 * - Pending: read-only view with submitted number and clock icon
 * - Verified: green check (admin approved)
 * - Rejected: red X with option to resubmit
 */
export function NzbnVerification({
  employerId,
  existingVerification,
  onSuccess,
}: NzbnVerificationProps) {
  const [nzbn, setNzbn] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  // Determine current state from existing verification
  const status = existingVerification?.status
  const submittedNzbn = existingVerification?.nzbn_number

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validate: 13 numeric digits
    if (!/^\d{13}$/.test(nzbn)) {
      setError('NZBN must be exactly 13 digits')
      return
    }

    setLoading(true)

    try {
      const { error: upsertError } = await supabase.from('employer_verifications').upsert(
        {
          employer_id: employerId,
          method: 'nzbn',
          status: 'pending',
          nzbn_number: nzbn,
        },
        { onConflict: 'employer_id,method' },
      )

      if (upsertError) {
        setError(upsertError.message)
        return
      }

      setSubmitted(true)
      toast.success('NZBN submitted for review')
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  // Show verified state
  if (status === 'verified') {
    return (
      <div className="flex items-center gap-2 py-1">
        <div className="w-5 h-5 rounded-full bg-moss flex items-center justify-center">
          <Check className="w-3 h-3 text-white stroke-[3]" />
        </div>
        <span className="text-[13px] font-body text-moss font-semibold">Business verified</span>
        {submittedNzbn && (
          <span className="text-[12px] font-body text-light">NZBN: {submittedNzbn}</span>
        )}
      </div>
    )
  }

  // Show pending state (submitted, awaiting admin review)
  if ((status === 'pending' && submittedNzbn) || submitted) {
    return (
      <div className="flex items-start gap-2 py-1">
        <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Clock className="w-3 h-3 text-amber-700" />
        </div>
        <div>
          <p className="text-[13px] font-body text-amber-700 font-semibold">Pending Review</p>
          <p className="text-[11px] font-body text-light mt-0.5">
            NZBN {submittedNzbn} submitted — our team will review within 2 business days
          </p>
        </div>
      </div>
    )
  }

  // Show rejection state with option to resubmit
  if (status === 'rejected') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 py-1">
          <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
            <X className="w-3 h-3 text-red-600" />
          </div>
          <span className="text-[13px] font-body text-red-600">Verification rejected — please resubmit</span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-moss" />
            <span className="text-[13px] font-body font-semibold text-ink">
              New Zealand Business Number
            </span>
          </div>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={13}
            placeholder="1234567890123"
            value={nzbn}
            onChange={(e) => setNzbn(e.target.value.replace(/\D/g, ''))}
            required
            disabled={loading}
            className="text-[13px] font-mono"
          />
          <p className="text-[11px] font-body text-light">13-digit NZBN found on your Companies Register entry</p>
          {error && <p className="text-[12px] font-body text-red-600">{error}</p>}
          <Button type="submit" size="sm" disabled={loading || nzbn.length !== 13}>
            {loading ? 'Submitting...' : 'Resubmit NZBN'}
          </Button>
        </form>
      </div>
    )
  }

  // Default: no submission yet — show form
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Building2 className="w-4 h-4 text-moss" />
        <span className="text-[13px] font-body font-semibold text-ink">
          New Zealand Business Number
        </span>
      </div>
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={13}
        placeholder="1234567890123"
        value={nzbn}
        onChange={(e) => setNzbn(e.target.value.replace(/\D/g, ''))}
        required
        disabled={loading}
        className="text-[13px] font-mono"
      />
      <p className="text-[11px] font-body text-light">
        13-digit NZBN found on your Companies Register entry
      </p>
      {error && <p className="text-[12px] font-body text-red-600">{error}</p>}
      <Button type="submit" size="sm" disabled={loading || nzbn.length !== 13}>
        {loading ? 'Submitting...' : 'Submit NZBN'}
      </Button>
    </form>
  )
}
