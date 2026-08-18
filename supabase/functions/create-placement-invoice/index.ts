import Stripe from 'https://esm.sh/stripe@14'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  requireCaller,
  requireEmployerOwnsApplication,
  toAuthErrorResponse,
} from '../_shared/auth.ts'
import { derivePlacementFeeFromJob, warnOnClientMismatch } from '../_shared/pricing.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'TopFarms <hello@topfarms.co.nz>'

/** "harry.smith@x.nz" → "Harry S." — display label only, never an identifier. */
function friendlyNameFromEmail(email: string | null): string {
  const local = (email ?? '').split('@')[0]
  const parts = local.split(/[._\-+]/).filter(Boolean)
  if (!parts.length || !/^[a-zA-Z]/.test(parts[0])) return 'your new hire'
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
  const first = cap(parts[0])
  const initial = parts[1] && /^[a-zA-Z]/.test(parts[1]) ? ` ${parts[1][0].toUpperCase()}.` : ''
  return `${first}${initial}`
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

  // ─── Authorization (audit P0-3) + server-derived pricing (Phase 2 Task 2.1) ─
  // This function raises a real Stripe invoice against an employer. Phase 1 made the
  // ownership check real; Phase 2 removes ALL trust in the body. Everything except
  // application_id and rating is now derived server-side:
  //   employer_id, job_id      ← application row (ownership-checked)
  //   fee_tier, amount_nzd     ← acknowledged placement_fees snapshot, else the job row.
  //                              The ACK snapshot wins so an employer cannot shortlist at
  //                              $800, edit the salary down, then hire at $400.
  //   employer_email           ← auth.users (the caller — invoices go to the payer)
  //   farm_name                ← employer_profiles
  //   job_title                ← jobs
  //   seeker_email/name        ← seeker_contacts (congrats email)
  // Body fee values are used only for tamper logging.
  let application_id: string
  let job_id: string
  let employer_id: string
  let seeker_id: string
  let rating: unknown
  let bodyFeeTier: unknown
  let bodyAmount: unknown
  let callerUserId: string
  try {
    callerUserId = requireCaller(req)
    const body = await req.json().catch(() => ({}))
    application_id = body.application_id
    rating = body.rating
    bodyFeeTier = body.fee_tier
    bodyAmount = body.amount_nzd

    if (!application_id) {
      return new Response(JSON.stringify({ error: 'application_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const owned = await requireEmployerOwnsApplication(supabaseClient, callerUserId, application_id)
    employer_id = owned.employerId
    job_id = owned.jobId
    seeker_id = owned.seekerId
  } catch (e) {
    return toAuthErrorResponse(e, corsHeaders)
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Idempotency: check if placement_fee for this application is already confirmed
    const { data: existingFee, error: checkError } = await supabaseClient
      .from('placement_fees')
      .select('id, confirmed_at, acknowledged_at, fee_tier, amount_nzd, discount_pct, waived_reason')
      .eq('application_id', application_id)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking placement fee:', checkError)
      return new Response(JSON.stringify({ error: 'Database error checking placement fee' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Audit F-05. The guard below reads `confirmed_at`, and `confirmed_at` is written AFTER
    // `finalizeInvoice` has already emailed the employer a payable invoice — so two concurrent
    // calls, or one retry after a timeout, both pass the guard and both bill the farm. The DB
    // write that would have closed the window is itself swallowed further down.
    //
    // Stripe idempotency keys close it at the only place that can be authoritative: Stripe.
    // A repeat of the same key returns the ORIGINAL object instead of creating a second one,
    // whatever our database believes. `application_id` is already UNIQUE on placement_fees,
    // so it is the natural identity of "this placement, billed once".
    //
    // Keys are per-operation, not per-request: three different calls with one shared key would
    // collide in Stripe and the second would fail rather than dedupe.
    const idem = (op: string) => ({ idempotencyKey: `placement:${op}:${application_id}` })

    if (existingFee?.confirmed_at) {
      // Already confirmed — return early (idempotency guard)
      console.log(
        'Placement fee already confirmed for application:',
        application_id,
        '— returning early',
      )
      return new Response(JSON.stringify({ already_confirmed: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ─── Server-side fee derivation (Task 2.1) ────────────────────────────────
    // The acknowledged snapshot is the contract price. Fall back to a fresh derive
    // only when no acknowledged row exists (hire without prior shortlist).
    const derived = await derivePlacementFeeFromJob(supabaseClient, job_id)
    const job_title = derived.jobTitle
    let fee_tier: string = derived.tier
    let base_amount: number = derived.amount
    if (existingFee?.acknowledged_at && existingFee.fee_tier && existingFee.amount_nzd != null) {
      fee_tier = existingFee.fee_tier
      base_amount = existingFee.amount_nzd
    }
    warnOnClientMismatch(
      'create-placement-invoice',
      { tier: fee_tier, amount: base_amount },
      { tier: bodyFeeTier, amount: bodyAmount },
    )

    // Admin-applied discount (locked decision: capability, not policy — no automatic rule).
    const discountPct = Math.min(100, Math.max(0, Number(existingFee?.discount_pct ?? 0)))
    const amount_nzd = Math.round(base_amount * (1 - discountPct / 100))

    // ─── Server-side context derivation ──────────────────────────────────────
    const [empProfileRes, callerRes, appRes] = await Promise.all([
      supabaseClient
        .from('employer_profiles')
        .select('stripe_customer_id, farm_name')
        .eq('id', employer_id)
        .single(),
      supabaseClient.auth.admin.getUserById(callerUserId),
      supabaseClient
        .from('applications')
        .select('seeker_id, seeker_profiles!inner ( user_id ), jobs!inner ( created_at )')
        .eq('id', application_id)
        .single(),
    ])

    if (empProfileRes.error) {
      console.error('Error loading employer profile:', empProfileRes.error)
      return new Response(JSON.stringify({ error: 'Failed to load employer profile' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const empProfile = empProfileRes.data
    const farm_name: string | null = empProfile?.farm_name ?? null

    const employer_email = callerRes.data?.user?.email
    if (callerRes.error || !employer_email) {
      console.error('Error resolving caller email:', callerRes.error)
      return new Response(JSON.stringify({ error: 'Failed to resolve employer email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const seekerUserId =
      (appRes.data?.seeker_profiles as unknown as { user_id: string } | null)?.user_id ?? null
    const jobCreatedAt =
      (appRes.data?.jobs as unknown as { created_at: string } | null)?.created_at ?? null

    let seeker_email: string | null = null
    if (seekerUserId) {
      const { data: contactRow } = await supabaseClient
        .from('seeker_contacts')
        .select('email')
        .eq('user_id', seekerUserId)
        .maybeSingle()
      seeker_email = contactRow?.email ?? null
    }
    const seeker_display = friendlyNameFromEmail(seeker_email)

    // Invoice legibility context: candidate count + days from post to hire.
    const { count: applicantCount } = await supabaseClient
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', job_id)
    const daysToHire = jobCreatedAt
      ? Math.max(1, Math.round((Date.now() - new Date(jobCreatedAt).getTime()) / 86_400_000))
      : null

    const invoiceDescription =
      `TopFarms placement fee — you hired ${seeker_display} for ${job_title ?? 'a position'} (${fee_tier})` +
      (applicantCount ? ` · ${applicantCount} matched candidate${applicantCount === 1 ? '' : 's'}` : '') +
      (daysToHire ? ` · ${daysToHire} day${daysToHire === 1 ? '' : 's'} from post to hire` : '') +
      (discountPct > 0 ? ` · ${discountPct}% discount applied` : '')

    // ─── Placement event (Task 2.4) — the hire happened, separate from the money ─
    const { data: placementRow, error: placementErr } = await supabaseClient
      .from('placements')
      .upsert(
        {
          application_id,
          employer_confirmed_at: new Date().toISOString(),
        },
        { onConflict: 'application_id', ignoreDuplicates: false },
      )
      .select('id')
      .single()
    if (placementErr) {
      // Non-fatal: the fee flow must not be blocked by the event record.
      console.error('Failed to upsert placements row:', placementErr)
    }

    // ─── Fully waived/discounted-to-zero: record, skip Stripe ─────────────────
    // Upsert, not update: a hire that skipped the shortlist gate has no placement_fees
    // row yet, and an update that matches nothing is a silently lost fee.
    if (amount_nzd === 0) {
      const { error: waiveErr } = await supabaseClient
        .from('placement_fees')
        .upsert(
          {
            application_id,
            job_id,
            employer_id,
            seeker_id,
            confirmed_at: new Date().toISOString(),
            fee_tier,
            amount_nzd: 0,
            rating: rating ?? null,
            placement_id: placementRow?.id ?? null,
          },
          { onConflict: 'application_id' },
        )
      if (waiveErr) console.error('Failed to record waived placement fee:', waiveErr)
      return new Response(JSON.stringify({ success: true, waived: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    })

    // Stripe Customer upsert
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
        const newCustomer = await stripe.customers.create(
          {
            email: employer_email,
            name: farm_name ?? undefined,
            metadata: { employer_id },
          },
          idem('customer'),
        )
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
    const invoice = await stripe.invoices.create(
      {
        customer: customerId,
        // Pin the currency: without this the invoice inherits the Stripe ACCOUNT default
        // and a non-NZD account rejects the NZD line item ("cannot combine currencies").
        // Found live 2026-07-30 against an AUD-default test sandbox.
        currency: 'nzd',
        collection_method: 'send_invoice',
        days_until_due: 14,
        auto_advance: false, // Manually finalize after adding line items
        metadata: { application_id, employer_id, job_id: job_id ?? '' },
      },
      idem('invoice'),
    )

    // Add placement fee line item
    await stripe.invoiceItems.create(
      {
        customer: customerId,
        invoice: invoice.id,
        amount: amount_nzd, // NZD cents, server-derived (e.g. 40000 = $400)
        currency: 'nzd',
        description: invoiceDescription,
      },
      idem('item'),
    )

    // Finalize — triggers Stripe to send hosted invoice email to the customer. This is the
    // irreversible step: after it, the farm has a payable invoice in their inbox.
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id, {}, idem('finalize'))

    // Record confirmed_at, invoice ID, and optional rating. Upsert for the same
    // hire-without-shortlist reason as the waived branch above.
    const { error: updateFeeError } = await supabaseClient
      .from('placement_fees')
      .upsert(
        {
          application_id,
          job_id,
          employer_id,
          seeker_id,
          confirmed_at: new Date().toISOString(),
          stripe_invoice_id: invoice.id,
          stripe_invoice_status: 'open',
          fee_tier,
          amount_nzd,
          rating: rating ?? null,
          placement_id: placementRow?.id ?? null,
        },
        { onConflict: 'application_id' },
      )

    // The invoice is already sent, so failing the request here would be worse than useless —
    // the farm has been billed either way. But returning a bare success taught the caller that
    // everything reconciled, when in fact `confirmed_at` is missing and the guard above will
    // wave the next call straight through. The idempotency keys now stop that becoming a second
    // invoice; this flag is so the operator knows a row needs fixing rather than finding out
    // from the farm.
    if (updateFeeError) {
      console.error(
        'placement_fees write FAILED after invoice was finalized — reconciliation required:',
        { application_id, stripe_invoice_id: invoice.id, error: updateFeeError.message },
      )
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
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: FROM_EMAIL,
              to: [seeker_email],
              subject: `Congratulations! You've been hired for ${job_title ?? 'a position'}`,
              html: `
                <div style="font-family: DM Sans, -apple-system, Helvetica Neue, sans-serif; background-color: #F7F2E8; padding: 32px;">
                  <div style="max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; padding: 32px;">
                    <p style="font-size: 16px; color: #2D5016; font-weight: 600; margin: 0 0 8px;">TopFarms</p>
                    <h2 style="font-size: 20px; color: #1A1208; margin: 0 0 16px;">Great news!</h2>
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
        // Audit F-05: `success: true` used to be returned even when the placement_fees write
        // had failed, so a row with no confirmed_at looked like a clean placement.
        reconciliation_required: Boolean(updateFeeError),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Unexpected error in create-placement-invoice:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
