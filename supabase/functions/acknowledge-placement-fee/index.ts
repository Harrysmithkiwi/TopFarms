import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  requireCaller,
  requireEmployerOwnsApplication,
  toAuthErrorResponse,
} from '../_shared/auth.ts'

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

  // ─── Authorization (audit P0-3) ────────────────────────────────────────────
  // This endpoint is the ENTIRE write boundary for placement_fees: the table has RLS on
  // with a SELECT-only policy, so there is no client INSERT path. It previously took
  // application_id, job_id, employer_id, seeker_id, fee_tier AND amount_nzd from the body
  // with no caller check whatsoever.
  //
  // Writing this row is also what releases seeker PII — the seeker_contacts SELECT policy
  // keys on `placement_fees.acknowledged_at IS NOT NULL`. So an unguarded body meant: any
  // employer could unlock a seeker's phone and email at a self-declared price of zero, and
  // any authenticated user could fabricate debt rows against a DIFFERENT employer, which
  // create-placement-invoice would then bill.
  //
  // job_id, employer_id and seeker_id are now derived from the application row; body values
  // are ignored. fee_tier/amount_nzd are still taken from the body — server-side pricing is
  // Phase 2 Task 2.1. Until then this closes the tenancy hole but NOT the $0 self-pricing
  // one; do not treat the fee as enforceable yet.
  let application_id: string
  let fee_tier: string
  let amount_nzd: number
  let job_id: string
  let employer_id: string
  let seeker_id: string
  try {
    const callerUserId = requireCaller(req)
    const body = await req.json().catch(() => ({}))
    application_id = body.application_id
    fee_tier = body.fee_tier
    amount_nzd = body.amount_nzd

    if (!application_id || !fee_tier || amount_nzd == null) {
      return new Response(
        JSON.stringify({ error: 'application_id, fee_tier and amount_nzd are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const owned = await requireEmployerOwnsApplication(supabaseClient, callerUserId, application_id)
    employer_id = owned.employerId
    job_id = owned.jobId
    seeker_id = owned.seekerId
  } catch (e) {
    return toAuthErrorResponse(e, corsHeaders)
  }

  try {
    // Idempotency check: if placement_fees row already acknowledged, return early
    const { data: existingRow } = await supabaseClient
      .from('placement_fees')
      .select('id, acknowledged_at')
      .eq('application_id', application_id)
      .maybeSingle()

    if (existingRow && existingRow.acknowledged_at !== null) {
      return new Response(
        JSON.stringify({ already_acknowledged: true, placement_fee_id: existingRow.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Insert placement_fees row with acknowledged_at set
    const { data, error } = await supabaseClient
      .from('placement_fees')
      .insert({
        application_id,
        job_id,
        employer_id,
        seeker_id,
        fee_tier,
        amount_nzd,
        acknowledged_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      console.error('acknowledge-placement-fee: insert error', error)
      return new Response(
        JSON.stringify({ error: 'Failed to record placement fee acknowledgement' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(JSON.stringify({ success: true, placement_fee_id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Unexpected error in acknowledge-placement-fee:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
