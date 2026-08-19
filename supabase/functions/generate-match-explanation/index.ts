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
          model: 'claude-sonnet-5',
          // `claude-sonnet-4-20250514` was RETIRED and returned 404 from the live API — verified
          // 2026-08-19, not inferred. The retry loop below swallowed it, so this function has been
          // silently writing null since the retirement; nothing surfaced because the key was also
          // out of credit and everything failed for that reason instead.
          //
          // Sonnet 5 runs ADAPTIVE THINKING when `thinking` is omitted (Sonnet 4.x ran
          // thinking-off), and max_tokens caps thinking AND response text together — so at
          // 150 tokens the model's own per-request decision to think could eat the budget the
          // answer needs. Tested both ways on the live API before writing this: on a
          // representative prompt it did NOT think and returned fine either way, so this is a
          // determinism guard, not a fix for an observed break. It stays because "adaptive"
          // means the model re-decides per request and a longer or harder input can spend the
          // budget differently. The output is one short paragraph and needs no reasoning.
          thinking: { type: 'disabled' },
          max_tokens: 150,
          messages: [
            { role: 'user', content: buildPrompt(scoreRow.total_score, scoreRow.breakdown) },
          ],
        })

        // Find the text block rather than trusting content[0]. With thinking enabled the first
        // block is a thinking block, and `content[0].type === 'text'` would quietly evaluate false
        // and store null — the same silent-null shape that hid the dead model ID.
        const firstContent = message.content.find((b) => b.type === 'text')
        if (firstContent && firstContent.type === 'text') {
          explanation = firstContent.text.trim()
        }

        break
      } catch (err) {
        // Logged, not swallowed. A bare `catch (_err)` is why a 404 on a retired model looked
        // identical to "the model had nothing to say" for weeks: three silent retries, then a
        // null written to the row. The function still degrades gracefully — it just says so now.
        console.error(`generate-match-explanation: Anthropic call failed (attempt ${attempt + 1}/3)`, err)
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
