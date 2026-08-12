import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireCaller, requireEmployerOwnsJob, toAuthErrorResponse } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// PUBLISH A LISTING. Listings are FREE AND UNLIMITED (directive 1.19, 2026-08-04).
//
// The endpoint keeps its name because renaming an Edge Function means a new deploy and
// a stale twin lingering on the old URL. It no longer creates a PaymentIntent: there is
// no listing fee to charge, at any tier, ever. Stripe still handles PLACEMENT fees,
// which are a different function.
//
// What went away, and why it is not missed:
//   - Tier selection and TIER_PRICES ($100/$150/$200). Superseded by 1.19. Featured
//     ($99) returns as its own paid path when its traffic trigger fires; that is not a
//     resurrection of the three-tier ladder.
//   - The free_listing entitlement in employer_entitlements. It existed to make "first
//     listing free" survive the delete-and-retry exploit (Phase 2 Task 2.2). When every
//     listing is free there is nothing to meter, so that exploit class is gone rather
//     than defended. Existing rows are inert; nothing reads them.
//
// What deliberately stayed:
//   - requireCaller + requireEmployerOwnsJob. This function activates a job and sets its
//     expiry, so it is a write boundary even with no money on it. employer_id comes from
//     the caller's own profile; the body value is never trusted (audit F-A4).
//   - The listing_fees row at amount_nzd 0. It is the publication audit trail and admin
//     analytics reads it. A missing row would look like a job that published itself.
//   - Idempotency on that row, so a double-submit republishes nothing.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Service role client — bypasses RLS, so the ownership check below is mandatory.
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  let job_id: string
  let employer_id: string
  try {
    const callerUserId = requireCaller(req)
    const body = await req.json().catch(() => ({}))
    job_id = body.job_id

    if (!job_id) {
      return new Response(JSON.stringify({ error: 'job_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // `tier` may still arrive from a bundle cached before this deploy. It is ignored,
    // not rejected: every listing publishes at tier 1 until Featured has its own path.
    const owned = await requireEmployerOwnsJob(supabaseClient, callerUserId, job_id)
    employer_id = owned.employerId
  } catch (e) {
    return toAuthErrorResponse(e, corsHeaders)
  }

  try {
    // Already published (double-submit, or a retry after a dropped response).
    const { data: existingListingFee, error: existingFeeErr } = await supabaseClient
      .from('listing_fees')
      .select('id')
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

    const { error: feeError } = await supabaseClient.from('listing_fees').insert({
      job_id,
      employer_id,
      tier: 1,
      amount_nzd: 0,
      stripe_payment_id: null,
      paid_at: new Date().toISOString(),
    })

    if (feeError) {
      console.error('Error recording listing publication:', feeError)
      return new Response(JSON.stringify({ error: 'Failed to record listing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const { error: updateError } = await supabaseClient
      .from('jobs')
      .update({
        status: 'active',
        listing_tier: 1,
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

    // `is_free` stays in the response so a bundle cached from before this deploy takes
    // its success path instead of showing "Unexpected response".
    return new Response(JSON.stringify({ client_secret: null, is_free: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Unexpected error in create-payment-intent:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
