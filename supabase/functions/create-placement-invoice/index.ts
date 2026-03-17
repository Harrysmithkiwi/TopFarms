import Stripe from 'https://esm.sh/stripe@14'
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
    const {
      application_id,
      job_id,
      employer_id,
      employer_email,
      farm_name,
      job_title,
      fee_tier,
      amount_nzd,
      rating,
      seeker_email,
      seeker_name,
    } = await req.json()

    // Validate required fields
    if (!application_id || !employer_id || !employer_email || !fee_tier || !amount_nzd) {
      return new Response(
        JSON.stringify({ error: 'application_id, employer_id, employer_email, fee_tier, and amount_nzd are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Create Supabase service role client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Idempotency: check if placement_fee for this application is already confirmed
    const { data: existingFee, error: checkError } = await supabaseClient
      .from('placement_fees')
      .select('id, confirmed_at')
      .eq('application_id', application_id)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking placement fee:', checkError)
      return new Response(
        JSON.stringify({ error: 'Database error checking placement fee' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (existingFee?.confirmed_at) {
      // Already confirmed — return early (idempotency guard)
      console.log('Placement fee already confirmed for application:', application_id, '— returning early')
      return new Response(
        JSON.stringify({ already_confirmed: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    })

    // Stripe Customer upsert
    // 1. Check if employer_profiles has stripe_customer_id
    const { data: empProfile, error: empError } = await supabaseClient
      .from('employer_profiles')
      .select('stripe_customer_id')
      .eq('id', employer_id)
      .single()

    if (empError) {
      console.error('Error loading employer profile:', empError)
      return new Response(
        JSON.stringify({ error: 'Failed to load employer profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    let customerId: string

    if (empProfile?.stripe_customer_id) {
      // Use existing customer ID
      customerId = empProfile.stripe_customer_id
    } else {
      // Try to find existing Stripe customer by email
      const existingCustomers = await stripe.customers.list({ email: employer_email, limit: 1 })

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id
      } else {
        // Create new Stripe customer
        const newCustomer = await stripe.customers.create({
          email: employer_email,
          name: farm_name ?? undefined,
          metadata: { employer_id },
        })
        customerId = newCustomer.id
      }

      // Store the customer ID on employer_profiles for future use
      const { error: updateEmpError } = await supabaseClient
        .from('employer_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', employer_id)

      if (updateEmpError) {
        console.error('Failed to store stripe_customer_id on employer_profiles:', updateEmpError)
        // Non-fatal — invoice creation can proceed; customer will be looked up again next time
      }
    }

    // Create Stripe Invoice (draft — we manually finalize after adding line items)
    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: 'send_invoice',
      days_until_due: 14,
      auto_advance: false, // Manually finalize after adding line items
      metadata: { application_id, employer_id, job_id: job_id ?? '' },
    })

    // Add placement fee line item
    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      amount: amount_nzd, // Already in cents (e.g., 20000 = $200 NZD)
      currency: 'nzd',
      description: `TopFarms placement fee — ${job_title ?? 'position'} (${fee_tier})`,
    })

    // Finalize — triggers Stripe to send hosted invoice email to the customer
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id)

    // Update placement_fees record with confirmed_at, invoice ID, and optional rating
    const { error: updateFeeError } = await supabaseClient
      .from('placement_fees')
      .update({
        confirmed_at: new Date().toISOString(),
        stripe_invoice_id: invoice.id,
        rating: rating ?? null,
      })
      .eq('application_id', application_id)

    if (updateFeeError) {
      console.error('Failed to update placement_fees record:', updateFeeError)
      // Invoice already created — log but don't fail the response
      // Manual reconciliation can be done via stripe_invoice_id
    }

    // Send seeker congratulations email via Resend (fire-and-forget)
    if (seeker_email) {
      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
      if (RESEND_API_KEY) {
        try {
          const siteUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://topfarms.co.nz'
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: 'TopFarms <noreply@topfarms.co.nz>',
              to: [seeker_email],
              subject: `Congratulations! You've been hired for ${job_title ?? 'a position'}`,
              html: `
                <div style="font-family: DM Sans, -apple-system, Helvetica Neue, sans-serif; background-color: #F7F2E8; padding: 32px;">
                  <div style="max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; padding: 32px;">
                    <p style="font-size: 16px; color: #2D5016; font-weight: 600; margin: 0 0 8px;">TopFarms</p>
                    <h2 style="font-size: 20px; color: #1A1208; margin: 0 0 16px;">Great news, ${seeker_name || 'there'}!</h2>
                    <p style="font-size: 14px; color: #1A1208; line-height: 1.5; margin: 0 0 16px;">
                      <strong>${farm_name ?? 'The employer'}</strong> has confirmed your hire for the <strong>${job_title ?? 'position'}</strong> role.
                    </p>
                    <p style="font-size: 14px; color: #6B5D4A; line-height: 1.5; margin: 0 0 24px;">
                      You can view the details in your dashboard.
                    </p>
                    <a href="${siteUrl}/dashboard/seeker"
                       style="display: inline-block; background: #2D5016; color: #ffffff; border-radius: 8px; padding: 16px 24px; text-decoration: none; font-weight: 600; font-size: 14px;">
                      View Your Dashboard
                    </a>
                    <p style="font-size: 13px; color: #9E8E78; margin: 24px 0 0;">Best of luck in your new role!</p>
                    <p style="font-size: 13px; color: #9E8E78; margin: 4px 0 0;">— The TopFarms Team</p>
                  </div>
                </div>
              `,
            }),
          })
          console.log('Seeker hire notification sent to:', seeker_email)
        } catch (emailErr) {
          // Fire-and-forget — log error but do not fail the hire confirmation
          console.error('Failed to send seeker hire notification email:', emailErr)
        }
      } else {
        console.log('RESEND_API_KEY not configured — skipping seeker hire notification')
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoice_id: invoice.id,
        hosted_invoice_url: finalizedInvoice.hosted_invoice_url,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Unexpected error in create-placement-invoice:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
