import Anthropic from 'https://esm.sh/@anthropic-ai/sdk'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireCaller, requireSeekerOwnsProfile, toAuthErrorResponse } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function buildPrompt(totalScore: number, breakdown: Record<string, number>): string {
  return `You are writing match feedback for a New Zealand farm job platform. Be honest, practical, and use plain farm-worker language. Never use corporate-speak or oversell.

Match score: ${totalScore}/100
Breakdown:
- Shed type: ${breakdown.shed_type}/25
- Location: ${breakdown.location}/20
- Accommodation: ${breakdown.accommodation}/20
- Skills: ${breakdown.skills}/20
- Salary: ${breakdown.salary}/10
- Visa: ${breakdown.visa}/5
- Couples bonus: ${breakdown.couples}/5

Write exactly 2-3 sentences explaining what drives this match score. Lead with the strongest factor. Be honest about gaps — if the score is low, say why clearly. Example style: "You've got rotary experience and they run a rotary shed — that's your strongest match. The salary sits at the top of your range. Location is the main gap — you're in Waikato and this role is Canterbury."

Only output the explanation sentences. No preamble, no labels, no bullet points.`
}

Deno.serve(async (req) => {
  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Service-role client — bypasses RLS, so the ownership check below is mandatory and runs
  // before any data is read.
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  // ─── Authorization (audit P0-2) ────────────────────────────────────────────
  // Previously took {seeker_id, job_id} from the body with no caller check, so any
  // authenticated user could read an arbitrary seeker's match score and OVERWRITE
  // match_scores.explanation for any pair.
  //
  // Caller model: this is SEEKER-initiated — JobDetail.tsx:280 fires it when a seeker views
  // a job whose score has no explanation yet. So the check is "you are that seeker", not
  // employer-owns-job. (The Phase 1 plan specified requireEmployerOwnsJob here; that was
  // wrong and would have broken the job-detail page for every seeker.)
  //
  // seeker_id is a seeker_profiles.id, not a user id — see LAUNCH.md O8.
  let seeker_id: string
  let job_id: string
  try {
    const callerUserId = requireCaller(req)
    const body = await req.json().catch(() => ({}))
    seeker_id = body.seeker_id
    job_id = body.job_id
    if (!seeker_id || !job_id) {
      return new Response(JSON.stringify({ error: 'seeker_id and job_id are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    await requireSeekerOwnsProfile(supabaseClient, callerUserId, seeker_id)
  } catch (e) {
    return toAuthErrorResponse(e, corsHeaders)
  }

  try {
    // Load match score row
    const { data: scoreRow, error: scoreError } = await supabaseClient
      .from('match_scores')
      .select('breakdown, total_score')
      .eq('seeker_id', seeker_id)
      .eq('job_id', job_id)
      .single()

    if (scoreError || !scoreRow) {
      return new Response(JSON.stringify({ error: 'Score not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create Anthropic client
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

    // Retry loop — 3 attempts with exponential backoff
    const delays = [1000, 2000, 4000]
    let explanation: string | null = null
    let attempt = 0

    while (attempt < 3) {
      try {
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 150,
          messages: [
            { role: 'user', content: buildPrompt(scoreRow.total_score, scoreRow.breakdown) },
          ],
        })

        const firstContent = message.content[0]
        if (firstContent && firstContent.type === 'text') {
          explanation = firstContent.text.trim()
        }

        break
      } catch (_err) {
        attempt++
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, delays[attempt - 1]))
        }
      }
    }

    // Store explanation back to match_scores if obtained
    if (explanation !== null) {
      await supabaseClient
        .from('match_scores')
        .update({ explanation })
        .eq('seeker_id', seeker_id)
        .eq('job_id', job_id)
    }

    // Return 200 with explanation (may be null — graceful degradation)
    return new Response(JSON.stringify({ explanation }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Unexpected error in generate-match-explanation:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
