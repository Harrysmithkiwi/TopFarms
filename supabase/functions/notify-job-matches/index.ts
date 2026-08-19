import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendOnceEmail } from '../_shared/notify.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const APP_URL = Deno.env.get('APP_URL') ?? 'https://topfarms.co.nz'

// Operator alert destination. hello@ routes to the same inbox via Cloudflare,
// but sending Resend mail from hello@ TO hello@ invites loop/spam heuristics —
// deliver straight to the Gmail the routing lands on.
const OPERATOR_EMAIL = Deno.env.get('OPERATOR_EMAIL') ?? 'admin.topfarms@gmail.com'

// Defence-in-depth header validation (verify_jwt:false fn).
// Pattern: notify-job-filled:15,118-130 — guarded by tests/webhook-secret-presence.test.ts.
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? ''

// ---------------------------------------------------------------------------
// Resend email helper (notify-job-filled:21-40)
// ---------------------------------------------------------------------------

// Sending lives in ../_shared/notify.ts now — audit F-19. The local sendEmail() that used to
// sit here sent whenever it was called, and `handle_job_activated` calls it whenever a job's
// status BECOMES 'active'. `paused` is employer-reachable, so pause -> resume re-sent this
// digest. It goes to the operator alone, so it was noise rather than harm — but it is the same
// defect as notify-job-filled's, and one of them lands on seekers.

// ---------------------------------------------------------------------------
// Email HTML template (notify-job-filled:46-80)
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
                Internal operator alert — sent when a job goes live with matches.
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

// ---------------------------------------------------------------------------
// Operator match-list email body
// ---------------------------------------------------------------------------

interface MatchLine {
  score: number
  name: string
  email: string
  phone: string
  region: string
  roles: string
  /** The terms they asked for. 9 of the 23 corpus posts state these; nothing showed them. */
  terms: string
}

function matchesEmailBody(
  jobTitle: string,
  farmName: string,
  jobRegion: string,
  jobId: string,
  lines: MatchLine[],
): string {
  const rows = lines
    .map(
      (m) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #EEE8DC;font-size:13px;color:#1A1208;font-weight:600;">${m.score}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #EEE8DC;font-size:13px;color:#1A1208;">${m.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #EEE8DC;font-size:13px;color:#1A1208;"><a href="mailto:${m.email}" style="color:#2D5016;">${m.email}</a><br>${m.phone}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #EEE8DC;font-size:13px;color:#6B5D4A;">${m.region}<br>${m.roles}<br><em>${m.terms}</em></td>
      </tr>`,
    )
    .join('')

  return `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1A1208;line-height:1.2;">
      ${lines.length} ${lines.length === 1 ? 'match' : 'matches'} for ${jobTitle} at ${farmName}
    </h2>
    <p style="margin:0 0 16px;font-size:14px;color:#1A1208;line-height:1.5;">
      A job just went live in <strong>${jobRegion}</strong> and the match engine found
      ${lines.length === 1 ? 'a seeker' : 'seekers'} for it. These people were promised an email
      when a matching job appears — this is the list to send it to.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 24px;">
      <tr>
        <th align="left" style="padding:8px 12px;border-bottom:2px solid #2D5016;font-size:12px;color:#6B5D4A;">Score</th>
        <th align="left" style="padding:8px 12px;border-bottom:2px solid #2D5016;font-size:12px;color:#6B5D4A;">Name</th>
        <th align="left" style="padding:8px 12px;border-bottom:2px solid #2D5016;font-size:12px;color:#6B5D4A;">Contact</th>
        <th align="left" style="padding:8px 12px;border-bottom:2px solid #2D5016;font-size:12px;color:#6B5D4A;">Region / Roles</th>
      </tr>
      ${rows}
    </table>
    <p style="margin:0;">
      <a href="${APP_URL}/jobs/${jobId}" style="display:inline-block;background:#2D5016;color:#ffffff;border-radius:8px;padding:16px 24px;text-decoration:none;font-weight:600;font-size:14px;line-height:1;">View the listing</a>
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

  if (!WEBHOOK_SECRET) {
    console.error('notify-job-matches: WEBHOOK_SECRET unset — refusing to process')
    return new Response(JSON.stringify({ error: 'Server misconfigured (secret unset)' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const payload = await req.json()

    // Guard: only process when a job becomes 'active' (INSERT as active, or
    // UPDATE transitioning to active). Mirrors the DB trigger's own condition.
    const record = payload.record
    const activated =
      record?.status === 'active' &&
      (payload.type === 'INSERT' ||
        (payload.type === 'UPDATE' && payload.old_record?.status !== 'active'))

    if (!activated) {
      return new Response(JSON.stringify({ skipped: true, reason: 'not an activation' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const jobId = record.id
    const jobTitle = record.title ?? 'a position'
    const jobRegion = record.region ?? 'Unknown region'

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Match scores were written synchronously by job_match_rescore in the same
    // transaction that fired this webhook — they are committed by the time
    // pg_net delivers the request.
    const { data: matches, error: matchErr } = await supabaseClient
      .from('match_scores')
      .select('seeker_id, total_score, breakdown')
      .eq('job_id', jobId)
      .order('total_score', { ascending: false })
      .limit(100)

    if (matchErr) {
      console.error('Error querying match_scores:', matchErr)
      return new Response(JSON.stringify({ error: 'Failed to query match_scores' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Scoring v3 (migration 093) records DEALBREAKERS as `breakdown.gates`, applied
    // multiplicatively: a seeker who needs sponsorship on a non-sponsoring job, or who asked
    // for relief work on a permanent role, is not a low match — they are blocked. Emailing
    // the operator "here are your matches" with those names in it is worse than noise: these
    // people were promised an email when a MATCHING job appears, and a farm they cannot
    // legally take is not one. Rows scored before v3 carry no `gates` key and pass through.
    const blocked = (m: { breakdown?: { gates?: Record<string, boolean> } | null }) =>
      Object.values(m.breakdown?.gates ?? {}).some(Boolean)

    const eligible = (matches ?? []).filter((m) => !blocked(m))
    const excluded = (matches ?? []).length - eligible.length
    // Never a silent cap: a drop the operator cannot see reads as "nobody matched".
    if (excluded > 0) {
      console.log(`notify-job-matches: job=${jobId} excluded ${excluded} gate-blocked pair(s)`)
    }

    if (eligible.length === 0) {
      console.log(
        `notify-job-matches: job=${jobId} has 0 sendable matches ` +
          `(${(matches ?? []).length} scored, ${excluded} blocked) — nothing to send`,
      )
      return new Response(
        JSON.stringify({ skipped: true, reason: 'no matches', excluded, job_id: jobId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Farm name for the subject line
    const { data: employer } = await supabaseClient
      .from('employer_profiles')
      .select('farm_name')
      .eq('id', record.employer_id)
      .single()
    const farmName = employer?.farm_name ?? 'an employer'

    // Batch-fetch profiles and contacts (two queries, not 2N)
    const seekerIds = eligible.map((m) => m.seeker_id)
    const { data: profiles } = await supabaseClient
      .from('seeker_profiles')
      .select('id, user_id, region, role_type_pref, contract_type_pref')
      .in('id', seekerIds)
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))

    const userIds = (profiles ?? []).map((p) => p.user_id).filter(Boolean)
    const { data: contacts } = await supabaseClient
      .from('seeker_contacts')
      .select('user_id, first_name, last_name, email, phone')
      .in('user_id', userIds)
    const contactByUserId = new Map((contacts ?? []).map((c) => [c.user_id, c]))

    const lines: MatchLine[] = eligible.map((m) => {
      const profile = profileById.get(m.seeker_id)
      const contact = profile ? contactByUserId.get(profile.user_id) : undefined
      const name =
        [contact?.first_name, contact?.last_name].filter(Boolean).join(' ') || '(no name on file)'
      return {
        score: m.total_score,
        name,
        email: contact?.email ?? '(no email on file)',
        phone: contact?.phone ?? '—',
        region: profile?.region ?? '—',
        roles: (profile?.role_type_pref ?? []).join(', ') || '—',
        // The DB tokens read badly in an email — nobody in these posts writes "casual", they
        // write "relief". Mirrors CONTRACT_TYPE_PREFS in src/lib/constants.ts.
        terms:
          (profile?.contract_type_pref ?? [])
            .map((t: string) =>
              t === 'casual' ? 'Casual or relief' : t === 'contract' ? 'Fixed term' : 'Permanent',
            )
            .join(' · ') || 'terms not stated',
      }
    })

    const subject = `${lines.length} ${lines.length === 1 ? 'match' : 'matches'}: ${jobTitle} at ${farmName} (${jobRegion})`
    // One digest per job, whatever the status does afterwards. Keyed on the job rather than on
    // the match set on purpose: if a new seeker matches later, the RIGHT answer is a new kind of
    // email about that seeker, not a re-send of the whole list with one line added.
    const result = await sendOnceEmail(supabaseClient, {
      kind: 'job_match_digest',
      subjectId: jobId,
      recipient: OPERATOR_EMAIL,
      subject,
      html: emailWrapper(matchesEmailBody(jobTitle, farmName, jobRegion, jobId, lines)),
    })

    console.log(
      `notify-job-matches: job=${jobId}, matches=${lines.length}, blocked=${excluded}, outcome=${result.outcome}`,
    )

    return new Response(
      JSON.stringify({
        sent: result.outcome === 'sent' ? 1 : 0,
        outcome: result.outcome,
        matches: lines.length,
        excluded,
        job_id: jobId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Unexpected error in notify-job-matches:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
