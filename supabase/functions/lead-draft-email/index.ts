import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as jose from 'https://esm.sh/jose@5'

// lead-draft-email — Lane-A outreach loop (Admin Portal v2 stretch #1).
//
// Drafts a personalised founder→farmer email for a contactable (Lane A) lead,
// from the docs/OUTREACH-EMAIL.md rubric + template, and stores it on the lead
// (leads.drafted_email jsonb {subject, body}). The admin reads/edits/sends by
// hand — this never sends anything.
//
// Auth mirrors lead-intake (verify_jwt=false → WE verify the JWT via JWKS +
// require the admin role). Degrades honestly: no ANTHROPIC_API_KEY → a
// mail-merge from the template so the loop still works offline-of-Claude.

const DRAFT_MODEL = 'claude-sonnet-4-6' // voice-critical, low volume — same as Lane B
const DRAFT_TEMPERATURE = 1.0
const appUrl = () => Deno.env.get('APP_URL') ?? 'https://topfarms.co.nz'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// The 10 human-email rules from docs/OUTREACH-EMAIL.md, as the system contract.
const SYSTEM_PROMPT = [
  'You are Harry, founder of TopFarms (a NZ-only farm-jobs site). Write ONE short',
  'cold email to a farm that is already advertising a role elsewhere, inviting them',
  'to also list it free on TopFarms. Founder-to-farmer, warm and human — never marketing.',
  '',
  'RULES (every one is hard):',
  '1. Open on THEIR world — their farm/role/region — never "I\'m Harry from TopFarms".',
  '2. Include ONE real detail from the lead so the personalisation connects to the ask.',
  '3. Contractions always. Read-aloud test: if it sounds like marketing, it fails.',
  '4. Every sentence earns its place; the best version could have been shorter (~90 words).',
  '5. ONE low-friction ask they can say yes to in a one-line reply.',
  '6. No AI tells: kill "I hope this finds you well", "reach out", "leverage", "excited to",',
  '   "in today\'s fast-paced", and list-of-three sentences.',
  '7. Honest — free means free; invent no numbers or fake stats.',
  '8. Frame the value as RELIEF: TopFarms scores applicants against what they actually need',
  '   (shed type, experience, visa) instead of burying them in irrelevant CVs — "matched, not sorted".',
  '9. Sign off simply as "Harry" then "topfarms.co.nz". Never "The TopFarms Team".',
  `10. If it helps the CTA, the site is ${appUrl()} — but a bare mention is fine; no placeholders.`,
  '',
  'SUBJECT: 2–4 words, lowercase, internal-looking (e.g. "your shepherd ad", "posting your job").',
  'No pitch, no emoji, no first name in the subject.',
  '',
  'Return via the emit_email tool only.',
].join('\n')

interface LeadRow {
  display_name: string | null
  region: string | null
  role_or_category: string | null
  contact: { name?: string; email?: string } | null
  salary_text: string | null
  summary: string | null
  advertiser_name: string | null
  is_recruiter: boolean | null
}

function leadFacts(l: LeadRow): string {
  const f: string[] = []
  if (l.display_name) f.push(`Farm / business: ${l.display_name}`)
  if (l.role_or_category) f.push(`Role advertised: ${l.role_or_category}`)
  if (l.region) f.push(`Region: ${l.region}`)
  if (l.contact?.name) f.push(`Contact person (use their first name): ${l.contact.name}`)
  if (l.salary_text) f.push(`Pay mentioned: ${l.salary_text}`)
  if (l.is_recruiter && l.advertiser_name) f.push(`Placed by agency: ${l.advertiser_name}`)
  if (l.summary) f.push(`Ad summary: ${l.summary}`)
  return f.join('\n')
}

/** Offline-of-Claude degrade: a mail-merge from the template (still usable). */
function templateDraft(l: LeadRow): { subject: string; body: string } {
  const role = l.role_or_category ?? 'role'
  const name = l.contact?.name?.split(/\s+/)[0] ?? 'there'
  const farm = l.display_name ?? 'your farm'
  const region = l.region ?? 'your area'
  return {
    subject: `your ${role.toLowerCase()} ad`,
    body: [
      `Hi ${name},`,
      '',
      `Saw you're after a ${role} at ${farm} down in ${region}.`,
      '',
      "I've just built TopFarms — a NZ-only site for farm jobs. It's free to list, and rather than " +
        'burying you in irrelevant CVs it scores applicants against what you actually need: shed type, ' +
        'experience, visa status, the lot.',
      '',
      `You're already advertising the role — want me to put it up on TopFarms too? Five minutes of my ` +
        `time, nothing from you, and it gets in front of people specifically hunting for ${region} farm work.`,
      '',
      'Worth a go?',
      '',
      'Harry',
      'topfarms.co.nz',
    ].join('\n'),
  }
}

async function draftWithClaude(l: LeadRow): Promise<{ subject: string; body: string; model: string }> {
  const key = Deno.env.get('ANTHROPIC_API_KEY')
  if (!key) return { ...templateDraft(l), model: 'template' }
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: DRAFT_MODEL,
        max_tokens: 1024,
        temperature: DRAFT_TEMPERATURE,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Write the email for this lead. Use one real detail from it in the opener.\n\n${leadFacts(l)}`,
          },
        ],
        tools: [
          {
            name: 'emit_email',
            description: 'Return the drafted outreach email.',
            input_schema: {
              type: 'object',
              required: ['subject', 'body'],
              properties: {
                subject: { type: 'string' },
                body: { type: 'string' },
              },
            },
          },
        ],
        tool_choice: { type: 'tool', name: 'emit_email' },
      }),
    })
    if (!res.ok) {
      console.error('claude error:', res.status, (await res.text()).slice(0, 200))
      return { ...templateDraft(l), model: 'template (claude ' + res.status + ')' }
    }
    const msg = await res.json()
    const toolUse = (msg.content as { type: string; input?: { subject?: string; body?: string } }[]).find(
      (c) => c.type === 'tool_use',
    )
    const out = toolUse?.input
    if (!out?.subject || !out?.body) return { ...templateDraft(l), model: 'template (no tool output)' }
    return { subject: out.subject, body: out.body, model: DRAFT_MODEL }
  } catch (e) {
    console.error('claude call failed:', (e as Error).message)
    return { ...templateDraft(l), model: 'template (claude unreachable)' }
  }
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  // Auth: verify the caller's JWT locally (JWKS) + require admin — same contract
  // as lead-intake (this function is deployed verify_jwt=false; WE verify).
  const bearer = req.headers.get('authorization')?.replace(/^Bearer /i, '')
  if (!bearer) return json({ error: 'missing token' }, 401)
  try {
    const jwks = jose.createRemoteJWKSet(
      new URL(`${Deno.env.get('SUPABASE_URL')}/auth/v1/.well-known/jwks.json`),
    )
    const { payload } = await jose.jwtVerify(bearer, jwks, { audience: 'authenticated' })
    const { data: roleRow } = await db
      .from('user_roles')
      .select('role')
      .eq('user_id', payload.sub as string)
      .single()
    if ((roleRow as { role?: string } | null)?.role !== 'admin') {
      return json({ error: 'admin role required' }, 403)
    }
  } catch {
    return json({ error: 'invalid token' }, 401)
  }

  let leadId: string
  try {
    leadId = (await req.json())?.lead_id
  } catch {
    return json({ error: 'invalid JSON' }, 400)
  }
  if (!leadId) return json({ error: 'lead_id required' }, 400)

  const { data: lead, error } = await db
    .from('leads')
    .select('display_name, region, role_or_category, contact, salary_text, summary, advertiser_name, is_recruiter')
    .eq('id', leadId)
    .single()
  if (error || !lead) return json({ error: 'lead not found' }, 404)

  const draft = await draftWithClaude(lead as LeadRow)
  const emailJson = { subject: draft.subject, body: draft.body }
  const { error: upErr } = await db
    .from('leads')
    .update({ drafted_email: emailJson, draft_model: draft.model })
    .eq('id', leadId)
  if (upErr) return json({ error: `save failed: ${upErr.message}` }, 500)

  return json({ ...emailJson, model: draft.model })
})
