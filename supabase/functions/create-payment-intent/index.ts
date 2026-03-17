import Stripe from 'https://esm.sh/stripe@14'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TIER_PRICES: Record<number, number> = {
  1: 10000, // $100 NZD in cents
  2: 15000, // $150 NZD in cents
  3: 20000, // $200 NZD in cents
}

Deno.serve(async (req) => {
  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { job_id, tier, employer_id } = await req.json()

    // Validate request body
    if (!job_id || !tier || !employer_id) {
      return new Response(
        JSON.stringify({ error: 'job_id, tier, and employer_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (![1, 2, 3].includes(Number(tier))) {
      return new Response(
        JSON.stringify({ error: 'tier must be 1, 2, or 3' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const tierNum = Number(tier) as 1 | 2 | 3

    // Create Supabase service role client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Verify the job belongs to the employer
    const { data: job, error: jobError } = await supabaseClient
      .from('jobs')
      .select('id, employer_id')
      .eq('id', job_id)
      .eq('employer_id', employer_id)
      .single()

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Job not found or does not belong to this employer' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Check listing_fees count for this employer (first-listing-free logic)
    const { count, error: countError } = await supabaseClient
      .from('listing_fees')
      .select('id', { count: 'exact' })
      .eq('employer_id', employer_id)

    if (countError) {
      console.error('Error checking listing fees count:', countError)
      return new Response(
        JSON.stringify({ error: 'Failed to check listing history' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const listingCount = count ?? 0

    if (listingCount === 0) {
      // First listing is free — activate job immediately without payment
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)

      // Insert listing_fee record with amount=0
      const { error: feeError } = await supabaseClient.from('listing_fees').insert({
        job_id,
        employer_id,
        tier: tierNum,
        amount_nzd: 0,
        stripe_payment_id: null,
        paid_at: new Date().toISOString(),
      })

      if (feeError) {
        console.error('Error inserting free listing fee:', feeError)
        return new Response(
          JSON.stringify({ error: 'Failed to record free listing' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Activate the job
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
        return new Response(
          JSON.stringify({ error: 'Failed to activate job' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      return new Response(
        JSON.stringify({ client_secret: null, is_free: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Paid listing — create Stripe PaymentIntent
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    })

    const amount = TIER_PRICES[tierNum]

    const idempotencyKey = `listing-fee-${job_id}`
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount,
        currency: 'nzd',
        metadata: {
          job_id,
          tier: String(tierNum),
          employer_id,
        },
      },
      { idempotencyKey },
    )

    return new Response(
      JSON.stringify({ client_secret: paymentIntent.client_secret, is_free: false }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Unexpected error in create-payment-intent:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
