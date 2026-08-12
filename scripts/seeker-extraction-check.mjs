// Verifies the DEPLOYED extraction contract by replaying the exact system prompt and
// tool schema from supabase/functions/lead-intake/index.ts against James's real post.
// This tests the extraction, not the Edge Function's auth wrapper.

const POST = `Heya, currently on the hunt for a fulltime Dairy Farm Assistant/Herd manager or 2ic job, 3-4bedroom will be a must as my partner and I have 3 kids as well as my partners Mum. Family oriented farm would be a bonus as well.
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

const NZ_REGIONS = ['Northland','Auckland','Waikato','Bay of Plenty','Gisborne',"Hawke's Bay",'Taranaki','Manawatū-Whanganui','Wellington','Tasman','Nelson','Marlborough','West Coast','Canterbury','Otago','Southland']

const system = [
  'You extract recruitment leads from raw NZ agricultural job/seeker posts',
  '(Seek, TradeMe, Facebook farming groups). The text may contain MULTIPLE',
  'distinct posts — return one object per distinct lead via the emit_leads tool.',
  'display_name = a clean, scannable name for the lead: prefer a business /',
  'farm / person name (e.g. "Smith Farms Ltd", "Jane Smith"). Do NOT use a',
  'descriptive listing headline ("110ha Pivot-Irrigated Dairy Farm") as the',
  'name — if only a headline is given, use the most name-like fragment and',
  'put the town in locality, not the name.',
  `region MUST be one of: ${NZ_REGIONS.join(', ')} — or null if not stated.`,
  'locality = the town / settlement / district named in the post (e.g.',
  '"Tirohanga", "Rotherham"), verbatim — distinct from the macro region;',
  'null if no town is stated. NEVER infer it from the region.',
  'NZ-ag vocabulary: 2IC = second in charge; OAD = once-a-day milking;',
  'herd manager / farm assistant / calf rearing / relief milking are roles.',
  'shed_type = milking shed (rotary / herringbone / N-bail), verbatim.',
  'herd_details = herd size / calving pattern if stated (e.g. "550 cows, split calving").',
  'application_method = VERBATIM how to apply ("PM me", "email jane@x.co.nz", "call 027…").',
  'applications_close = the date applications close AS AN ISO DATE (YYYY-MM-DD),',
  'if a closing date is stated — convert "10/7/2026" → "2026-07-10", "1st July',
  '2026" → "2026-07-01" (NZ day/month order). null if no closing date is stated.',
  'type = "seeker" when the AUTHOR is looking for work (they describe what',
  'they can do, what they are seeking, when they are available). type =',
  '"employer" when the author is offering work. A post can look like a job',
  'ad and still be a seeker post — decide by WHO WANTS WHAT, not by format.',
  'For a seeker post ALSO fill the `seeker` object; leave it null for employers.',
  'seeker.roles_sought = roles they want ("Farm Assistant", "Herd Manager", "2IC").',
  'seeker.skills = tasks they say they CAN do, one per item, verbatim-ish',
  '("break fencing", "detect mastitis and lameness", "plant and vat washes").',
  'seeker.licences = licences held ("Class 1", "HT").',
  'seeker.sheds_experienced = sheds they have WORKED in (for a seeker this is',
  'experience, NOT a shed being advertised — do not confuse it with shed_type).',
  'seeker.availability = when they can start, verbatim.',
  'seeker.accommodation_needed = housing they require ("3-4 bedroom").',
  "seeker.household = who is coming with them (\"partner, 3 kids, partner's mother\").",
  'seeker.couple_seeking = true ONLY if a partner is also explicitly seeking work.',
  'seeker.location_constraint = a hard limit on where they can go, verbatim',
  '("need to stay in the Cambridge area as our kids are at school").',
  'seeker.training_wanted = skills they say they LACK, want to learn, or are',
  'working towards ("doesn\'t have much experience but wants to be able to milk',
  'by herself" → ["milking"]). Empty array if none stated. This one matters:',
  'never infer it, but never miss it when it is stated.',
  "For a seeker, display_name = the PERSON'S name and region = where they want",
  'to work (or where they say they are), not an employer location.',
  'NEVER guess or infer absent fields — use null and list them in',
  'missing_fields. Only include contact details EXPLICITLY stated in the',
  'post (no enrichment, no inference). confidence is your 0-1 certainty',
  'the extraction is faithful.',
].join(' ')

const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    system,
    messages: [{ role: 'user', content: `Post by "James Peter Gaddum" in group "NZ Dairy Jobs":\n\n${POST}` }],
    tools: [{
      name: 'emit_leads',
      description: 'Emit every distinct lead found in the text.',
      input_schema: {
        type: 'object', required: ['leads'],
        properties: { leads: { type: 'array', items: { type: 'object',
          required: ['type','display_name','region','locality','role_or_category','contact','shed_type','herd_details','application_method','applications_close','seeker','confidence','missing_fields'],
          properties: {
            type: { type: ['string','null'], enum: ['employer','seeker',null] },
            display_name: { type: ['string','null'] },
            region: { type: ['string','null'] },
            locality: { type: ['string','null'] },
            role_or_category: { type: ['string','null'] },
            contact: { type: ['object','null'], properties: { email:{type:'string'},phone:{type:'string'},url:{type:'string'},name:{type:'string'},notes:{type:'string'} } },
            shed_type: { type: ['string','null'] },
            herd_details: { type: ['string','null'] },
            application_method: { type: ['string','null'] },
            applications_close: { type: ['string','null'] },
            seeker: { type: ['object','null'], properties: {
              roles_sought:{type:'array',items:{type:'string'}},
              skills:{type:'array',items:{type:'string'}},
              licences:{type:'array',items:{type:'string'}},
              sheds_experienced:{type:'array',items:{type:'string'}},
              availability:{type:['string','null']},
              accommodation_needed:{type:['string','null']},
              household:{type:['string','null']},
              couple_seeking:{type:'boolean'},
              location_constraint:{type:['string','null']},
              training_wanted:{type:'array',items:{type:'string'}},
            }},
            confidence: { type: 'number' },
            missing_fields: { type: 'array', items: { type: 'string' } },
          } } } },
      },
    }],
    tool_choice: { type: 'tool', name: 'emit_leads' },
  }),
})

const msg = await res.json()
if (!res.ok) { console.error('API error', res.status, JSON.stringify(msg).slice(0,300)); process.exit(1) }
const lead = msg.content.find((c) => c.type === 'tool_use').input.leads[0]
console.log(JSON.stringify(lead, null, 2))

// Assertions — the things that would make this useless if wrong.
const fail = []
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
}
console.log('\n' + (fail.length ? '✗ FAILED:\n  - ' + fail.join('\n  - ') : '✓ all assertions passed'))
