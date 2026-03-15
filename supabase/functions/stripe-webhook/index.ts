import Stripe from 'https://esm.sh/stripe@14'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!stripeSecretKey || !webhookSecret) {
    console.error('Missing Stripe environment variables')
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-06-20',
  })

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response(JSON.stringify({ error: 'Webhook signature verification failed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Create Supabase service role client
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent
    const { job_id, tier, employer_id } = pi.metadata

    if (!job_id || !tier || !employer_id) {
      console.error('Missing metadata in payment intent:', pi.id)
      // Return 200 to prevent Stripe from retrying — we can't process without metadata
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Idempotency check: query listing_fees by stripe_payment_id
    const { data: existingFee, error: checkError } = await supabaseClient
      .from('listing_fees')
      .select('id')
      .eq('stripe_payment_id', pi.id)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking for existing listing fee:', checkError)
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (existingFee) {
      // Already processed — idempotency guard, skip duplicate
      console.log('Duplicate webhook event for payment intent:', pi.id, '— skipping')
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const tierNum = Number(tier)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // Insert listing_fee record
    const { error: feeError } = await supabaseClient.from('listing_fees').insert({
      job_id,
      employer_id,
      tier: tierNum,
      amount_nzd: pi.amount,
      stripe_payment_id: pi.id,
      paid_at: new Date().toISOString(),
    })

    if (feeError) {
      console.error('Error inserting listing fee:', feeError)
      return new Response(JSON.stringify({ error: 'Failed to record listing fee' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Activate the job: status='active', listing_tier, expires_at=+30 days
    const { error: updateError } = await supabaseClient
      .from('jobs')
      .update({
        status: 'active',
        listing_tier: tierNum,
        expires_at: expiresAt.toISOString(),
      })
      .eq('id', job_id)

    if (updateError) {
      console.error('Error activating job:', updateError)
      return new Response(JSON.stringify({ error: 'Failed to activate job' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log('Job activated successfully:', job_id)
  }

  // Return 200 for all events (including unhandled ones)
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
