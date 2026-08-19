import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { reportError } from '@/lib/observability'
import { Button } from '@/components/ui/Button'

// Step 7 was the payment step. Listings are free and unlimited (directive 1.19), so
// there is nothing to pay for and nothing to choose: it is now a confirmation screen.
//
// The screen is not skipped, deliberately. Publishing is the irreversible act in this
// wizard, and it is where the employer needs to be told what the money actually is:
// the placement fee, its band, and the guarantee that comes with it. A silent publish
// would mean the first time anyone reads the fee is when it is charged.
//
// Tier selection, TierCard, PaymentForm and the Stripe client_secret path all went with
// the fee. Featured ($99) returns as its own path when its traffic trigger fires.

interface JobStep7ConfirmProps {
  jobId: string
  onComplete: () => void
  onBack: () => void
}

export function JobStep7Confirm({ jobId, onComplete, onBack }: JobStep7ConfirmProps) {
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)

  async function handlePublish() {
    setPublishing(true)

    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: { job_id: jobId },
    })

    setPublishing(false)

    if (error) {
      toast.error('Could not publish your listing. Please try again.')
      reportError('job step 7: publish listing', error)
      return
    }

    // The endpoint keeps its old name and its `is_free` flag; see its header.
    if (!data?.is_free) {
      toast.error('Unexpected response while publishing. Please try again.')
      reportError('job step 7: publish listing unexpected response', data)
      return
    }

    setPublished(true)
    setTimeout(() => onComplete(), 1200)
  }

  if (published) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-10 text-center">
        <CheckCircle className="h-12 w-12" style={{ color: 'var(--color-brand-hover)' }} />
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          Your listing is live
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Taking you to the summary...
        </p>
        <div className="border-brand-hover h-5 w-5 animate-spin rounded-full border-[2px] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          Ready to publish
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Listing this job costs nothing. Here is what happens next.
        </p>
      </div>

      <div
        className="space-y-4 rounded-[12px] p-5"
        style={{ backgroundColor: 'var(--color-surface-2)' }}
      >
        <div>
          <p className="text-label font-semibold" style={{ color: 'var(--color-text)' }}>
            Listing: free
          </p>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
            Live for 30 days. Post as many roles as you need, no card required.
          </p>
        </div>

        <div>
          <p className="text-label font-semibold" style={{ color: 'var(--color-text)' }}>
            You pay once, only if you hire
          </p>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
            A one-off placement fee of $200, $400 or $800, set by the salary band on this
            listing. You accept it when you shortlist someone, which is when their phone,
            email and CV unlock. Invoiced on Net 14 terms when you confirm the hire.
          </p>
        </div>

        <div>
          <p className="text-label font-semibold" style={{ color: 'var(--color-text)' }}>
            Every placement fee includes a replacement guarantee
          </p>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
            Permanent roles 90 days, fixed term 30 days. If they leave inside that window we
            rematch the role and relist it free, and you pay no placement fee for the
            replacement. Casual and relief work carries no guarantee.
          </p>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="ghost" size="md" onClick={onBack} disabled={publishing}>
          Back
        </Button>
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={handlePublish}
          disabled={publishing}
        >
          {publishing ? 'Publishing...' : 'Publish listing'}
        </Button>
      </div>
    </div>
  )
}
