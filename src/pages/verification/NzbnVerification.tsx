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
        <div className="bg-brand flex h-5 w-5 items-center justify-center rounded-full">
          <Check className="h-3 w-3 stroke-[3] text-white" />
        </div>
        <span className="font-body text-brand text-[13px] font-semibold">Business verified</span>
        {submittedNzbn && (
          <span className="font-body text-text-subtle text-[12px]">NZBN: {submittedNzbn}</span>
        )}
      </div>
    )
  }

  // Show pending state (submitted, awaiting admin review)
  if ((status === 'pending' && submittedNzbn) || submitted) {
    return (
      <div className="flex items-start gap-2 py-1">
        <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
          <Clock className="h-3 w-3 text-amber-700" />
        </div>
        <div>
          <p className="font-body text-[13px] font-semibold text-amber-700">Pending Review</p>
          <p className="font-body text-text-subtle mt-0.5 text-[11px]">
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
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100">
            <X className="text-danger-600 h-3 w-3" />
          </div>
          <span className="font-body text-danger-600 text-[13px]">
            Verification rejected — please resubmit
          </span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="mb-1 flex items-center gap-2">
            <Building2 className="text-brand h-4 w-4" />
            <span className="font-body text-text text-[13px] font-semibold">
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
            className="font-mono text-[13px]"
          />
          <p className="font-body text-text-subtle text-[11px]">
            13-digit NZBN found on your Companies Register entry
          </p>
          {error && <p className="font-body text-danger-600 text-[12px]">{error}</p>}
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
      <div className="mb-1 flex items-center gap-2">
        <Building2 className="text-brand h-4 w-4" />
        <span className="font-body text-text text-[13px] font-semibold">
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
        className="font-mono text-[13px]"
      />
      <p className="font-body text-text-subtle text-[11px]">
        13-digit NZBN found on your Companies Register entry
      </p>
      {error && <p className="font-body text-danger-600 text-[12px]">{error}</p>}
      <Button type="submit" size="sm" disabled={loading || nzbn.length !== 13}>
        {loading ? 'Submitting...' : 'Submit NZBN'}
      </Button>
    </form>
  )
}
