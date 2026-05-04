import { useState } from 'react'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import type { StripeElementsOptions } from '@stripe/stripe-js'
import { stripePromise } from '@/lib/stripe'
import { Button } from '@/components/ui/Button'

interface PaymentFormProps {
  clientSecret: string
  onSuccess: () => void
  onError: (message: string) => void
}

// Inner form component — must be inside Elements provider to use useStripe/useElements
function PaymentFormInner({
  onSuccess,
  onError,
}: {
  onSuccess: () => void
  onError: (message: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!stripe || !elements) return

    setLoading(true)

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/jobs/payment-complete`,
      },
      redirect: 'if_required',
    })

    setLoading(false)

    if (result.error) {
      onError(result.error.message ?? 'Payment failed. Please try again.')
    } else {
      // Payment succeeded without redirect
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      <Button type="submit" variant="primary" size="lg" disabled={!stripe || loading} className="w-full mt-4">
        {loading ? (
          <span className="flex items-center gap-2">
            <span
              className="w-4 h-4 rounded-full border-[2px] border-t-transparent animate-spin"
              style={{ borderColor: 'rgba(255,255,255,0.6)', borderTopColor: 'transparent' }}
            />
            Processing...
          </span>
        ) : (
          'Pay now'
        )}
      </Button>
    </form>
  )
}

/**
 * Stripe Elements wrapper with PaymentElement.
 * Wraps inner form in Elements provider with TopFarms theme appearance.
 * On success (no redirect needed): calls onSuccess().
 * On error: calls onError(message) for inline display with retry.
 */
export function PaymentForm({ clientSecret, onSuccess, onError }: PaymentFormProps) {
  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#16A34A', // brand
        colorBackground: '#FFFFFF', // surface
        colorText: '#0B1F10', // text
        colorDanger: '#DC2626', // danger
        fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
        borderRadius: '8px',
        spacingUnit: '4px',
      },
      rules: {
        '.Input': {
          borderColor: '#E5E8E2', // border
          boxShadow: 'none',
        },
        '.Input:focus': {
          borderColor: '#16A34A', // brand (focus border per Brand Spec §4 inputs)
          boxShadow: '0 0 0 2px rgba(22,163,74,0.2)',
        },
        '.Label': {
          fontSize: '13px',
          fontWeight: '500',
        },
      },
    },
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentFormInner onSuccess={onSuccess} onError={onError} />
    </Elements>
  )
}
