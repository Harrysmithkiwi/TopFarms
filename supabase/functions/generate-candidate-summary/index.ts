import Anthropic from 'https://esm.sh/@anthropic-ai/sdk'
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

function buildPrompt(data: {
  jobTitle: string
  totalScore: number
  breakdown: Record<string, number>
  yearsExperience: number | null
  region: string | null
  shedTypes: string[] | null
  visaStatus: string | null
}): string {
  return `You are writing a candidate fit assessment for a New Zealand farm employer. Be practical and honest. Summarize in 2-3 sentences: the candidate's strongest match factors, any notable gaps, and a brief hiring recommendation. Use plain language, not corporate speak.

Job: ${data.jobTitle}
Match score: ${data.totalScore}/100
Breakdown:
- Shed type: ${data.breakdown?.shed_type ?? 0}/25
- Location: ${data.breakdown?.location ?? 0}/20
- Accommodation: ${data.breakdown?.accommodation ?? 0}/20
- Skills: ${data.breakdown?.skills ?? 0}/20
- Salary: ${data.breakdown?.salary ?? 0}/10
- Visa: ${data.breakdown?.visa ?? 0}/5
- Couples bonus: ${data.breakdown?.couples ?? 0}/5

Candidate:
- Experience: ${data.yearsExperience ?? 'unknown'} years
- Region: ${data.region ?? 'not specified'}
- Shed types: ${data.shedTypes?.join(', ') ?? 'not specified'}
- Visa status: ${data.visaStatus ?? 'not specified'}

Only output the 2-3 assessment sentences. No preamble, no labels, no bullet points.`
}

Deno.serve(async (req) => {
  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Create Supabase service role client. NOTE: this bypasses RLS entirely, which is why
  // the ownership check below is mandatory and must run before ANY data is read.
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  // ─── Authorization (audit P0-2) ────────────────────────────────────────────
  // This function previously took {application_id, job_id, seeker_id} from the body and
  // performed NO caller check, so any authenticated user could read another employer's
  // stored AI assessment, read an arbitrary seeker's profile (including visa_status), and
  // overwrite applications.ai_summary. verify_jwt=true proves only that SOMEONE is logged
  // in, never which someone.
  //
  // job_id and seeker_id are now derived from the application row server-side; the values
  // in the request body are ignored. That substitution — not the 403 alone — is what closes
  // the cross-tenant read.
  let application_id: string
  let job_id: string
  let seeker_id: string
  try {
    const callerUserId = requireCaller(req)
    const body = await req.json().catch(() => ({}))
    application_id = body.application_id
    if (!application_id) {
      return new Response(JSON.stringify({ error: 'application_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const owned = await requireEmployerOwnsApplication(supabaseClient, callerUserId, application_id)
    job_id = owned.jobId
    seeker_id = owned.seekerId
  } catch (e) {
    return toAuthErrorResponse(e, corsHeaders)
  }

  try {
    // Check cache — if ai_summary already set, return it immediately
    const { data: appRow, error: appError } = await supabaseClient
      .from('applications')
      .select('ai_summary, cover_note, status')
      .eq('id', application_id)
      .single()

    if (appError || !appRow) {
      return new Response(JSON.stringify({ error: 'Application not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cache hit — return existing summary
    if (appRow.ai_summary) {
      return new Response(JSON.stringify({ summary: appRow.ai_summary }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Load seeker profile
    const { data: seekerProfile } = await supabaseClient
      .from('seeker_profiles')
      .select(
        'region, years_experience, sector_pref, visa_status, dairynz_level, shed_types_experienced',
      )
      // SCHEMA GOTCHA (CLAUDE.md): applications.seeker_id is a seeker_profiles.id, NOT a
      // user_id. This line read `.eq('user_id', seeker_id)`, matching a profile id against
      // the user_id column — it could never match, so seekerProfile was always null and the
      // generated summary had no candidate facts to work from.
      //
      // This is the root cause of LAUNCH.md O8 ("applicant AI summary renders empty"), open
      // and unexplained since 2026-07-23. Found while adding the Phase 1 ownership check,
      // because that check made the id semantics explicit.
      .eq('id', seeker_id)
      .single()

    // Load job data
    const { data: jobData } = await supabaseClient
      .from('jobs')
      .select('title, role_type, region, shed_type, salary_min, salary_max')
      .eq('id', job_id)
      .single()

    // Load match score
    const { data: scoreRow } = await supabaseClient
      .from('match_scores')
      .select('total_score, breakdown')
      .eq('seeker_id', seeker_id)
      .eq('job_id', job_id)
      .single()

    if (!jobData || !scoreRow) {
      return new Response(JSON.stringify({ error: 'Job or score data not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create Anthropic client
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

    // Retry loop — 3 attempts with exponential backoff
    const delays = [1000, 2000, 4000]
    let summary: string | null = null
    let attempt = 0

    while (attempt < 3) {
      try {
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-5',
          // `claude-sonnet-4-20250514` was RETIRED and returned 404 from the live API — verified
          // 2026-08-19, not inferred. The retry loop below swallowed it, so this function has been
          // silently writing null since the retirement; nothing surfaced because the key was also
          // out of credit and everything failed for that reason instead.
          //
          // Sonnet 5 runs ADAPTIVE THINKING when `thinking` is omitted (Sonnet 4.x ran
          // thinking-off), and max_tokens caps thinking AND response text together — so at
          // 200 tokens the model's own per-request decision to think could eat the budget the
          // answer needs. Tested both ways on the live API before writing this: on a
          // representative prompt it did NOT think and returned fine either way, so this is a
          // determinism guard, not a fix for an observed break. It stays because "adaptive"
          // means the model re-decides per request and a longer or harder input can spend the
          // budget differently. The output is one short paragraph and needs no reasoning.
          thinking: { type: 'disabled' },
          max_tokens: 200,
          messages: [
            {
              role: 'user',
              content: buildPrompt({
                jobTitle: jobData.title,
                totalScore: scoreRow.total_score,
                breakdown: scoreRow.breakdown,
                yearsExperience: seekerProfile?.years_experience ?? null,
                region: seekerProfile?.region ?? null,
                shedTypes: seekerProfile?.shed_types_experienced ?? null,
                visaStatus: seekerProfile?.visa_status ?? null,
              }),
            },
          ],
        })

        // Find the text block rather than trusting content[0]. With thinking enabled the first
        // block is a thinking block, and `content[0].type === 'text'` would quietly evaluate false
        // and store null — the same silent-null shape that hid the dead model ID.
        const firstContent = message.content.find((b) => b.type === 'text')
        if (firstContent && firstContent.type === 'text') {
          summary = firstContent.text.trim()
        }

        break
      } catch (err) {
        // Logged, not swallowed. A bare `catch (_err)` is why a 404 on a retired model looked
        // identical to "the model had nothing to say" for weeks: three silent retries, then a
        // null written to the row. The function still degrades gracefully — it just says so now.
        console.error(`generate-candidate-summary: Anthropic call failed (attempt ${attempt + 1}/3)`, err)
        attempt++
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, delays[attempt - 1]))
        }
      }
    }

    // Store summary in applications.ai_summary if obtained
    if (summary !== null) {
      await supabaseClient
        .from('applications')
        .update({ ai_summary: summary })
        .eq('id', application_id)
    }

    // Return 200 with summary (may be null — graceful degradation)
    return new Response(JSON.stringify({ summary }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Unexpected error in generate-candidate-summary:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
