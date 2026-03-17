import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'TopFarms <noreply@topfarms.co.nz>'
const APP_URL = Deno.env.get('APP_URL') ?? 'https://topfarms.co.nz'

// ---------------------------------------------------------------------------
// Resend email helper
// ---------------------------------------------------------------------------

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set — skipping email to', to)
    return false
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  })
  if (!res.ok) {
    const error = await res.text()
    console.error(`Resend error for ${to}: ${error}`)
    return false
  }
  return true
}

// ---------------------------------------------------------------------------
// Email HTML templates
// ---------------------------------------------------------------------------

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TopFarms</title>
</head>
<body style="margin:0;padding:0;background-color:#F7F2E8;font-family:DM Sans,-apple-system,Helvetica Neue,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F2E8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#FFFFFF;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 24px;font-size:16px;font-weight:600;color:#2D5016;letter-spacing:-0.01em;">TopFarms</p>
              ${content}
              <hr style="border:none;border-top:1px solid #EEE8DC;margin:32px 0 20px;">
              <p style="margin:0;font-size:12px;color:#9E8E78;line-height:1.5;">
                You received this email because you are using TopFarms.
                Questions? Reply to this email or visit <a href="${APP_URL}" style="color:#2D5016;">topfarms.co.nz</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#2D5016;color:#ffffff;border-radius:8px;padding:16px 24px;text-decoration:none;font-weight:600;font-size:14px;line-height:1;">${label}</a>`
}

// Employer Day 7: friendly nudge
function employerDay7Body(farmName: string, seekerName: string, jobTitle: string, jobId: string): string {
  const link = `${APP_URL}/dashboard/employer/jobs/${jobId}/applicants`
  return `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1A1208;line-height:1.2;">How's it going with ${seekerName}?</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#1A1208;line-height:1.5;">Hi ${farmName},</p>
    <p style="margin:0 0 16px;font-size:14px;color:#1A1208;line-height:1.5;">
      You shortlisted <strong>${seekerName}</strong> for your <strong>${jobTitle}</strong> position a week ago. How's it going?
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#6B5D4A;line-height:1.5;">
      If you've made a hire, please confirm it in your dashboard — it helps us improve matches for you.
      If this didn't work out, you can decline the candidate from the same page.
    </p>
    <p style="margin:0 0 0;">
      ${ctaButton(link, 'View Applicants')}
    </p>
  `
}

// Employer Day 14: slightly more urgent
function employerDay14Body(farmName: string, seekerName: string, jobTitle: string, jobId: string): string {
  const link = `${APP_URL}/dashboard/employer/jobs/${jobId}/applicants`
  return `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1A1208;line-height:1.2;">Just checking in — have you filled this role?</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#1A1208;line-height:1.5;">Hi ${farmName},</p>
    <p style="margin:0 0 16px;font-size:14px;color:#1A1208;line-height:1.5;">
      Two weeks have passed since you shortlisted <strong>${seekerName}</strong> for your <strong>${jobTitle}</strong> position.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#6B5D4A;line-height:1.5;">
      If you've made a hire, confirming it in your dashboard takes just a moment — and keeps your account in good standing.
      Not the right fit? You can mark the candidate as declined so they can move on too.
    </p>
    <p style="margin:0 0 0;">
      ${ctaButton(link, 'View Applicants')}
    </p>
  `
}

// Seeker Day 7: good news / encouragement
function seekerDay7Body(seekerName: string, farmName: string, jobTitle: string): string {
  const link = `${APP_URL}/dashboard/seeker/applications`
  return `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1A1208;line-height:1.2;">You were shortlisted by ${farmName}!</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#1A1208;line-height:1.5;">Great news, ${seekerName}!</p>
    <p style="margin:0 0 16px;font-size:14px;color:#1A1208;line-height:1.5;">
      <strong>${farmName}</strong> has shortlisted you for their <strong>${jobTitle}</strong> position and received your contact details.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#6B5D4A;line-height:1.5;">
      If you haven't heard from them yet, hang tight — employers are often juggling multiple candidates.
      You can view the status of all your applications in your dashboard.
    </p>
    <p style="margin:0 0 0;">
      ${ctaButton(link, 'View My Applications')}
    </p>
  `
}

// Seeker Day 14: update prompt
function seekerDay14Body(seekerName: string, farmName: string, jobTitle: string): string {
  const link = `${APP_URL}/dashboard/seeker/applications`
  return `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1A1208;line-height:1.2;">Any updates on ${farmName}?</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#1A1208;line-height:1.5;">Hi ${seekerName},</p>
    <p style="margin:0 0 16px;font-size:14px;color:#1A1208;line-height:1.5;">
      It's been two weeks since <strong>${farmName}</strong> shortlisted you for their <strong>${jobTitle}</strong> position.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#6B5D4A;line-height:1.5;">
      We hope things went well! You can check the latest status of your application in your dashboard.
      If you've already started the role, congratulations — we'd love to hear how it's going.
    </p>
    <p style="margin:0 0 0;">
      ${ctaButton(link, 'View My Applications')}
    </p>
  `
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase service role client (bypasses RLS for server-side operations)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    let day7Sent = 0
    let day14Sent = 0

    // -------------------------------------------------------------------------
    // Day 7 follow-ups
    // -------------------------------------------------------------------------

    const { data: day7Rows, error: d7Err } = await supabaseClient
      .from('placement_fees')
      .select('id, application_id, job_id, employer_id, seeker_id')
      .eq('followup_7d_due', true)
      .eq('followup_7d_sent', false)
      .is('confirmed_at', null)

    if (d7Err) {
      console.error('Error querying day7 follow-ups:', d7Err)
    } else {
      for (const row of day7Rows ?? []) {
        const { emailSent } = await processFollowup({
          supabaseClient,
          row,
          day: 7,
          getEmployerSubject: (seekerName) => `How's it going with ${seekerName}?`,
          getSeekerSubject: (farmName) => `You were shortlisted by ${farmName}!`,
          getEmployerBody: employerDay7Body,
          getSeekerBody: seekerDay7Body,
        })
        if (emailSent) {
          // Mark sent and clear due flag
          const { error: updateErr } = await supabaseClient
            .from('placement_fees')
            .update({ followup_7d_sent: true, followup_7d_due: false })
            .eq('id', row.id)
          if (updateErr) {
            console.error(`Failed to mark day7 sent for placement_fee ${row.id}:`, updateErr)
          } else {
            day7Sent++
          }
        }
      }
    }

    // -------------------------------------------------------------------------
    // Day 14 follow-ups
    // -------------------------------------------------------------------------

    const { data: day14Rows, error: d14Err } = await supabaseClient
      .from('placement_fees')
      .select('id, application_id, job_id, employer_id, seeker_id')
      .eq('followup_14d_due', true)
      .eq('followup_14d_sent', false)
      .is('confirmed_at', null)

    if (d14Err) {
      console.error('Error querying day14 follow-ups:', d14Err)
    } else {
      for (const row of day14Rows ?? []) {
        const { emailSent } = await processFollowup({
          supabaseClient,
          row,
          day: 14,
          getEmployerSubject: (_seekerName) => `Just checking in — have you filled this role?`,
          getSeekerSubject: (farmName) => `Any updates on ${farmName}?`,
          getEmployerBody: employerDay14Body,
          getSeekerBody: seekerDay14Body,
        })
        if (emailSent) {
          // Mark sent and clear due flag
          const { error: updateErr } = await supabaseClient
            .from('placement_fees')
            .update({ followup_14d_sent: true, followup_14d_due: false })
            .eq('id', row.id)
          if (updateErr) {
            console.error(`Failed to mark day14 sent for placement_fee ${row.id}:`, updateErr)
          } else {
            day14Sent++
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ day7_sent: day7Sent, day14_sent: day14Sent }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Unexpected error in send-followup-emails:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

// ---------------------------------------------------------------------------
// Shared follow-up processing logic
// ---------------------------------------------------------------------------

interface FollowupRow {
  id: string
  application_id: string
  job_id: string
  employer_id: string
  seeker_id: string
}

interface ProcessFollowupArgs {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient: any
  row: FollowupRow
  day: 7 | 14
  getEmployerSubject: (seekerName: string) => string
  getSeekerSubject: (farmName: string) => string
  getEmployerBody: (farmName: string, seekerName: string, jobTitle: string, jobId: string) => string
  getSeekerBody: (seekerName: string, farmName: string, jobTitle: string) => string
}

async function processFollowup({
  supabaseClient,
  row,
  getEmployerSubject,
  getSeekerSubject,
  getEmployerBody,
  getSeekerBody,
}: ProcessFollowupArgs): Promise<{ emailSent: boolean }> {
  // Fetch job details
  const { data: job } = await supabaseClient
    .from('jobs')
    .select('title')
    .eq('id', row.job_id)
    .single()

  // Fetch employer profile
  const { data: employer } = await supabaseClient
    .from('employer_profiles')
    .select('farm_name, user_id')
    .eq('id', row.employer_id)
    .single()

  // Fetch seeker profile
  const { data: seeker } = await supabaseClient
    .from('seeker_profiles')
    .select('region, user_id')
    .eq('id', row.seeker_id)
    .single()

  if (!employer || !seeker || !job) {
    console.error(`Missing required data for placement_fee ${row.id} — skipping`)
    return { emailSent: false }
  }

  // Fetch employer email via admin API (auth.users not exposed via regular queries)
  const { data: empUserData } = await supabaseClient.auth.admin.getUserById(employer.user_id ?? '')
  const employerEmail = empUserData?.user?.email

  // Fetch seeker email from seeker_contacts (service role bypasses RLS)
  const { data: seekerContact } = await supabaseClient
    .from('seeker_contacts')
    .select('email')
    .eq('user_id', seeker.user_id ?? '')
    .maybeSingle()
  const seekerEmail = seekerContact?.email

  const seekerName = seeker.region ? `Seeker from ${seeker.region}` : 'Your shortlisted candidate'
  const farmName = employer.farm_name ?? 'Your farm'
  const jobTitle = job.title ?? 'your position'

  let atLeastOneSent = false

  // Send employer email
  if (employerEmail) {
    const sent = await sendEmail(
      employerEmail,
      getEmployerSubject(seekerName),
      emailWrapper(getEmployerBody(farmName, seekerName, jobTitle, row.job_id)),
    )
    if (sent) atLeastOneSent = true
  } else {
    console.warn(`No employer email found for placement_fee ${row.id} (employer_id=${row.employer_id})`)
  }

  // Send seeker email
  if (seekerEmail) {
    const sent = await sendEmail(
      seekerEmail,
      getSeekerSubject(farmName),
      emailWrapper(getSeekerBody(seekerName, farmName, jobTitle)),
    )
    if (sent) atLeastOneSent = true
  } else {
    console.warn(`No seeker email found for placement_fee ${row.id} (seeker_id=${row.seeker_id})`)
  }

  return { emailSent: atLeastOneSent }
}
