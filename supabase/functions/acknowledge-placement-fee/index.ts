import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { application_id, job_id, employer_id, seeker_id, fee_tier, amount_nzd } = await req.json()

    // Validate all required fields
    if (!application_id || !job_id || !employer_id || !seeker_id || !fee_tier || amount_nzd == null) {
      return new Response(
        JSON.stringify({ error: 'application_id, job_id, employer_id, seeker_id, fee_tier, and amount_nzd are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Create service role Supabase client (bypasses RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

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

    return new Response(
      JSON.stringify({ success: true, placement_fee_id: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Unexpected error in acknowledge-placement-fee:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
