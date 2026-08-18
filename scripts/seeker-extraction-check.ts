/**
 * Verifies the seeker extraction contract by replaying the system prompt and tool schema
 * that ACTUALLY live in supabase/functions/lead-intake/index.ts against real corpus posts.
 * Tests the extraction, not the Edge Function's auth wrapper.
 *
 *   set -a; . ./.env; set +a
 *   deno run --allow-read --allow-env --allow-net scripts/seeker-extraction-check.ts
 *
 * Replaces the .mjs version, which HARD-COPIED the prompt and had silently drifted: it
 * predated the seeker lane, the three 2026-08-17 roles and `contract_type_pref`, so it was
 * asserting against a prompt the function no longer used while its header claimed otherwise.
 * The prompt is the logic here, so a copy of it is a second thing to keep in step — the same
 * defect leadVocab.ts and tests/lead-vocab-parity.test.ts exist to prevent.
 *
 * Not part of `npm test`: it costs API credit and needs a key. The unit tests hold the
 * shape; this holds the behaviour. Run it after any change to the prompt or the schema.
 */

import { NZ_REGIONS } from '../supabase/functions/_shared/leadGeo.ts'
import { CONTRACT_TYPES, ROLE_TYPES, SKILL_TAXONOMY } from '../supabase/functions/_shared/leadVocab.ts'

const SRC = await Deno.readTextFile(
  new URL('../supabase/functions/lead-intake/index.ts', import.meta.url),
)

function slice(startMarker: string, endMarker: string): string {
  const a = SRC.indexOf(startMarker)
  if (a === -1) throw new Error(`missing start marker: ${startMarker}`)
  const b = SRC.indexOf(endMarker, a)
  if (b === -1) throw new Error(`missing end marker: ${endMarker}`)
  return SRC.slice(a + startMarker.length, b)
}

/** Brace-match the object literal after a `key: {` marker — line markers are too brittle. */
function objectAfter(marker: string): string {
  const start = SRC.indexOf(marker) + marker.length - 1
  if (start < marker.length) throw new Error(`missing marker: ${marker}`)
  let depth = 0
  for (let i = start; i < SRC.length; i++) {
    if (SRC[i] === '{') depth++
    else if (SRC[i] === '}' && --depth === 0) return SRC.slice(start, i + 1)
  }
  throw new Error(`unbalanced object after ${marker}`)
}

const evalWith = (expr: string) =>
  new Function('NZ_REGIONS', 'ROLE_TYPES', 'SKILL_TAXONOMY', 'CONTRACT_TYPES', `return (${expr})`)(
    NZ_REGIONS,
    ROLE_TYPES,
    SKILL_TAXONOMY,
    CONTRACT_TYPES,
  )

const system: string = evalWith('[' + slice('system: [', "].join(' '),") + ']').join(' ')
const inputSchema = evalWith(objectAfter('input_schema: {'))

type Lead = {
  type?: string
  region?: string
  seeker?: {
    roles_sought?: string[]
    contract_type_pref?: string[]
    skills?: string[]
    licences?: string[]
    sheds_experienced?: string[]
    accommodation_needed?: string | null
    location_constraint?: string | null
    training_wanted?: string[]
    couple_seeking?: boolean
  } | null
}

const key = Deno.env.get('ANTHROPIC_API_KEY')
if (!key) {
  console.error('ANTHROPIC_API_KEY not set — run: set -a; . ./.env; set +a')
  Deno.exit(2)
}

async function extract(post: string): Promise<Lead> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      system,
      messages: [{ role: 'user', content: post }],
      tools: [
        {
          name: 'emit_leads',
          description: 'Emit every distinct lead found in the text.',
          input_schema: inputSchema,
        },
      ],
      tool_choice: { type: 'tool', name: 'emit_leads' },
    }),
  })
  const msg = await res.json()
  if (!res.ok) throw new Error(`API ${res.status}: ${JSON.stringify(msg).slice(0, 300)}`)
  return msg.content.find((c: { type: string }) => c.type === 'tool_use').input.leads[0]
}

// ── Case 1: the full-detail post the original script used ────────────────────────────────
// Kept verbatim. It is the richest single post in the corpus and exercises every seeker
// field at once, which no synthetic case does as honestly.
const JAMES = `Heya, currently on the hunt for a fulltime Dairy Farm Assistant/Herd manager or 2ic job, 3-4bedroom will be a must as my partner and I have 3 kids as well as my partners Mum. Family oriented farm would be a bonus as well.
Have experience in both Herringbone Sheds and Rotary's

Jobs I can do
Load/Feed out mixer Wagons
Plant and Vat Washes
Break Fencing
Detect Mastitis and Lameness
Pick out a cow that has calved
Treatments for cows
Feed Calves
Undersow and most tractor work
Work independently and as a team
Also hold my class 1 licence if that could be a benefit to your business

My partner is also interested in doing calf rearing and milkings doesn't have much experience but her end goal is to be able to milk by herself
We need to stay in the Cambridge area as our kids are at school and kindy here`

// ── Cases 2-7: terms, and the role traps ────────────────────────────────────────────────
// Terms are the most common statement in the corpus (9 of 23) and were extracted nowhere
// until 2026-08-18. The last case guards the one mapping that can actively lie about a
// person: general stock work must not promote them into "Stock Manager".
const TERM_CASES: { name: string; post: string; terms: string[]; role?: string }[] = [
  {
    name: 'relief only → casual',
    post: `Hi all, I am after relief milking only in the Waikato area. Have 5 years commercial dairy experience, own transport, happy to do weekends and cover for holidays. Not looking for a full time position at this stage. Available from next week.`,
    terms: ['casual'],
    role: 'Relief Milker',
  },
  {
    name: 'acceptance ladder → casual + permanent',
    post: `Kia ora, looking for work around Ashburton. Would take weekends, or ideally permanent part time, or even better full time if something came up. 4 years dairy, Class 1 licence. Have my own car so happy to drive in.`,
    terms: ['casual', 'permanent'],
  },
  {
    name: 'help over calving → contract',
    post: `Available to help over calving this season, from now until end of October, possibly early November. Done one season of calf rearing and keen to learn more. Based near Fairlie, can travel. Would need a room on farm.`,
    terms: ['contract'],
    role: 'Calf Rearer',
  },
  {
    name: 'permanent long term → permanent',
    post: `Experienced herd manager, 10 years in the industry, looking for a permanent long term position for the coming season. Managed a 550 cow farm with two staff under me. Wife and two kids, so we would need a 3 bedroom house. South Waikato or Bay of Plenty preferred.`,
    terms: ['permanent'],
    role: 'Herd Manager',
  },
  {
    name: 'no terms stated → empty, never guessed from the role',
    post: `Hard working and reliable, looking for farm work in Southland. Have done fencing and tractor work. Good with dogs. Give me a yell.`,
    terms: [],
  },
  {
    name: 'general stock work must NOT become Stock Manager',
    post: `Looking for stock work on a sheep and beef property in the Wairarapa. Have done some mustering and yard work over the last two seasons. Keen for anything that comes up, permanent would be ideal.`,
    terms: ['permanent'],
    role: 'Shepherd',
  },
]

const fail: string[] = []

console.log(`prompt ${system.length} chars · seeker fields: ${Object.keys(inputSchema.properties.leads.items.properties.seeker.properties).join(', ')}\n`)

const lead = await extract(JAMES)
console.log(JSON.stringify(lead, null, 2))
if (lead.type !== 'seeker') fail.push(`type is "${lead.type}", expected "seeker"`)
if (lead.region !== 'Waikato') fail.push(`region is "${lead.region}", expected Waikato (Cambridge)`)
if (!lead.seeker) fail.push('seeker block is null')
else {
  const s = lead.seeker
  if (!s.training_wanted?.length) fail.push('training_wanted empty — the funding signal was missed')
  if (!s.couple_seeking) fail.push('couple_seeking false — partner is explicitly also seeking')
  if ((s.skills ?? []).length < 6) fail.push(`only ${s.skills?.length} skills, post lists ~10`)
  if (!(s.sheds_experienced ?? []).length) fail.push('sheds_experienced empty')
  if (!(s.licences ?? []).length) fail.push('licences empty — "class 1" stated')
  if (!s.accommodation_needed) fail.push('accommodation_needed null — "3-4 bedroom" is a must')
  if (!s.location_constraint) fail.push('location_constraint null — Cambridge is a hard limit')
  // "fulltime" is stated, so this post does carry a term.
  if (!(s.contract_type_pref ?? []).includes('permanent')) {
    fail.push(`contract_type_pref [${s.contract_type_pref ?? []}] missing "permanent" — post says fulltime`)
  }
}

console.log('')
for (const c of TERM_CASES) {
  const l = await extract(c.post)
  const got = l.seeker?.contract_type_pref ?? []
  const roles = l.seeker?.roles_sought ?? []
  const termsOk = JSON.stringify([...got].sort()) === JSON.stringify([...c.terms].sort())
  const roleOk = !c.role || roles.includes(c.role)
  if (!termsOk) fail.push(`${c.name}: terms [${got}] expected [${c.terms}]`)
  if (!roleOk) fail.push(`${c.name}: roles [${roles}] missing ${c.role}`)
  console.log(
    `${termsOk && roleOk ? '✓' : '✗'} ${c.name}\n    terms=[${got.join(', ')}] roles=[${roles.join(', ')}]`,
  )
}

console.log('\n' + (fail.length ? '✗ FAILED:\n  - ' + fail.join('\n  - ') : '✓ all assertions passed'))
Deno.exit(fail.length ? 1 : 0)
