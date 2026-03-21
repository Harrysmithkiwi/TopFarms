import Anthropic from 'https://esm.sh/@anthropic-ai/sdk'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

  try {
    const { application_id, job_id, seeker_id } = await req.json()

    // Validate required fields
    if (!application_id || !job_id || !seeker_id) {
      return new Response(
        JSON.stringify({ error: 'application_id, job_id and seeker_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Create Supabase service role client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Check cache — if ai_summary already set, return it immediately
    const { data: appRow, error: appError } = await supabaseClient
      .from('applications')
      .select('ai_summary, cover_note, status')
      .eq('id', application_id)
      .single()

    if (appError || !appRow) {
      return new Response(
        JSON.stringify({ error: 'Application not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Cache hit — return existing summary
    if (appRow.ai_summary) {
      return new Response(
        JSON.stringify({ summary: appRow.ai_summary }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Load seeker profile
    const { data: seekerProfile } = await supabaseClient
      .from('seeker_profiles')
      .select('region, years_experience, sector_pref, visa_status, dairynz_level, shed_types_experienced')
      .eq('user_id', seeker_id)
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
      return new Response(
        JSON.stringify({ error: 'Job or score data not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
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
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          messages: [{
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
          }],
        })

        const firstContent = message.content[0]
        if (firstContent && firstContent.type === 'text') {
          summary = firstContent.text.trim()
        }

        break
      } catch (_err) {
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
    return new Response(
      JSON.stringify({ summary }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Unexpected error in generate-candidate-summary:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
