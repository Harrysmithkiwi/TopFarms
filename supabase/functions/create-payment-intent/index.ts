import Stripe from 'https://esm.sh/stripe@14'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireCaller, requireEmployerOwnsJob, toAuthErrorResponse } from '../_shared/auth.ts'
import { TIER_PRICES } from '../_shared/pricing.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Service role client — bypasses RLS, so the ownership check below is mandatory.
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  // ─── Authorization (audit F-A4) ────────────────────────────────────────────
  // The old check verified that the job belonged to the SUPPLIED employer_id — never that
  // the caller was that employer. Since the free path (listingCount === 0) activates the
  // job outright, any authenticated user holding a (job_id, employer_id) pair could publish
  // another employer's listing free, choose its tier, and set a 30-day expiry.
  //
  // employer_id now comes from the caller's own profile; the body value is ignored.
  let job_id: string
  let tierNum: 1 | 2 | 3
  let employer_id: string
  try {
    const callerUserId = requireCaller(req)
    const body = await req.json().catch(() => ({}))
    job_id = body.job_id
    const tier = body.tier

    if (!job_id || !tier) {
      return new Response(JSON.stringify({ error: 'job_id and tier are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (![1, 2, 3].includes(Number(tier))) {
      return new Response(JSON.stringify({ error: 'tier must be 1, 2, or 3' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    tierNum = Number(tier) as 1 | 2 | 3

    const owned = await requireEmployerOwnsJob(supabaseClient, callerUserId, job_id)
    employer_id = owned.employerId
  } catch (e) {
    return toAuthErrorResponse(e, corsHeaders)
  }

  try {

    // ─── Free-listing entitlement (Phase 2 Task 2.2) ──────────────────────────
    // The old logic was count(listing_fees) === 0. Those rows CASCADE on job delete,
    // so deleting a job reset the allowance — unlimited free listings. An entitlement
    // is a fact about the ACCOUNT: employer_entitlements has PRIMARY KEY
    // (employer_id, kind), so consuming twice is a constraint violation, not a count
    // that can drift with another table's lifecycle.

    // Idempotency: if this job already has a listing fee (double-submit, retry after
    // payment), don't consume anything and don't charge again.
    const { data: existingListingFee, error: existingFeeErr } = await supabaseClient
      .from('listing_fees')
      .select('id, amount_nzd')
      .eq('job_id', job_id)
      .maybeSingle()
    if (existingFeeErr) {
      console.error('Error checking existing listing fee:', existingFeeErr)
      return new Response(JSON.stringify({ error: 'Failed to check listing history' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (existingListingFee) {
      return new Response(JSON.stringify({ client_secret: null, is_free: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Atomically consume the free-listing entitlement. 23505 = already consumed.
    const { error: entitlementErr } = await supabaseClient.from('employer_entitlements').insert({
      employer_id,
      kind: 'free_listing',
      job_id,
    })

    if (entitlementErr && entitlementErr.code !== '23505') {
      console.error('Error consuming free-listing entitlement:', entitlementErr)
      return new Response(JSON.stringify({ error: 'Failed to check listing history' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!entitlementErr) {
      // Entitlement consumed — first listing is free, activate immediately.
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
        // Compensate: give the entitlement back so the employer is not charged for
        // a free listing that was never delivered.
        await supabaseClient
          .from('employer_entitlements')
          .delete()
          .eq('employer_id', employer_id)
          .eq('kind', 'free_listing')
          .eq('job_id', job_id)
        return new Response(JSON.stringify({ error: 'Failed to record free listing' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
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
        return new Response(JSON.stringify({ error: 'Failed to activate job' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ client_secret: null, is_free: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Paid listing — create Stripe PaymentIntent
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
