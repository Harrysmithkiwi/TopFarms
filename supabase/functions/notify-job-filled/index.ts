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

// ---------------------------------------------------------------------------
// Job filled notification email body
// ---------------------------------------------------------------------------

function jobFilledEmailBody(seekerName: string, jobTitle: string, farmName: string): string {
  const jobSearchLink = `${APP_URL}/jobs`
  return `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1A1208;line-height:1.2;">
      ${farmName} has filled their ${jobTitle} position
    </h2>
    <p style="margin:0 0 16px;font-size:14px;color:#1A1208;line-height:1.5;">Hi ${seekerName},</p>
    <p style="margin:0 0 16px;font-size:14px;color:#1A1208;line-height:1.5;">
      We wanted to let you know that <strong>${farmName}</strong> has filled their
      <strong>${jobTitle}</strong> position.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#6B5D4A;line-height:1.5;">
      Don't be discouraged — there are plenty of great farm roles still available.
      Keep your profile up to date and explore what's open right now.
    </p>
    <p style="margin:0 0 0;">
      ${ctaButton(jobSearchLink, 'Browse Open Roles')}
    </p>
  `
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()

    // Guard: only process when status transitions TO 'filled'
    if (payload.type !== 'UPDATE' ||
        payload.old_record?.status === 'filled' ||
        payload.record?.status !== 'filled') {
      return new Response(JSON.stringify({ skipped: true, reason: 'not a filled transition' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const filledJobId = payload.record.id
    const employerId = payload.record.employer_id

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Fetch job title
    const { data: job } = await supabaseClient
      .from('jobs').select('title').eq('id', filledJobId).single()
    const jobTitle = job?.title ?? 'a position'

    // Fetch farm name
    const { data: employer } = await supabaseClient
      .from('employer_profiles').select('farm_name').eq('id', employerId).single()
    const farmName = employer?.farm_name ?? 'The employer'

    // Fetch unresolved applicants (MUST match domain.ts ACTIVE_STATUSES)
    const NOTIFY_STATUSES = ['applied', 'review', 'interview', 'shortlisted', 'offered']
    const { data: applications, error: appErr } = await supabaseClient
      .from('applications')
      .select('id, seeker_id')
      .eq('job_id', filledJobId)
      .in('status', NOTIFY_STATUSES)

    if (appErr) {
      console.error('Error querying applications:', appErr)
      return new Response(JSON.stringify({ error: 'Failed to query applications' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let sent = 0
    let failed = 0

    for (const app of applications ?? []) {
      // Get seeker user_id from seeker_profiles
      const { data: seekerProfile } = await supabaseClient
        .from('seeker_profiles').select('user_id, region').eq('id', app.seeker_id).single()

      if (!seekerProfile?.user_id) {
        console.warn(`No seeker profile found for seeker_id ${app.seeker_id} — skipping`)
        failed++
        continue
      }

      // Get seeker email from seeker_contacts
      const { data: seekerContact } = await supabaseClient
        .from('seeker_contacts').select('email').eq('user_id', seekerProfile.user_id).maybeSingle()
      const seekerEmail = seekerContact?.email

      if (!seekerEmail) {
        console.warn(`No email found for seeker ${app.seeker_id} — skipping`)
        failed++
        continue
      }

      const seekerName = seekerProfile.region ? `Seeker from ${seekerProfile.region}` : 'Job seeker'
      const subject = `Update on your application — ${jobTitle} at ${farmName}`

      const ok = await sendEmail(
        seekerEmail,
        subject,
        emailWrapper(jobFilledEmailBody(seekerName, jobTitle, farmName)),
      )
      if (ok) sent++
      else failed++
    }

    console.log(`notify-job-filled: job=${filledJobId}, sent=${sent}, failed=${failed}`)

    return new Response(
      JSON.stringify({ sent, failed, job_id: filledJobId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Unexpected error in notify-job-filled:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
