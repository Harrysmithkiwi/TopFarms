// Revenue-path probe — go-live task 1. Phase A: everything EXCEPT the Stripe invoice.
//
// Exercises the real, RLS-enforced path with real user JWTs (not service role):
//   employer publishes job → seeker applies → employer acknowledges the placement fee
//   → placement_fees row written with a SERVER-DERIVED amount → seeker contact released.
//
// Every write is torn down in a finally block. Nothing here calls Stripe.

const URL = process.env.VITE_SUPABASE_URL
const ANON = process.env.VITE_SUPABASE_ANON_KEY
const EMP = { email: process.env.E2E_EMPLOYER_EMAIL, password: process.env.E2E_EMPLOYER_PASSWORD }
const SEEK = { email: process.env.E2E_SEEKER_EMAIL, password: process.env.E2E_SEEKER_PASSWORD }

const EMPLOYER_PROFILE_ID = 'f676d987-85f0-4391-861a-29d0eebc1e6f'

const created = { jobId: null, appId: null, seekerProfileId: null, feeRow: false }
let step = 0
const log = (m, d) => console.log(`\n[${++step}] ${m}${d !== undefined ? '\n    ' + JSON.stringify(d) : ''}`)

async function signIn({ email, password }) {
  const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const j = await r.json()
  if (!j.access_token) throw new Error(`sign-in failed for ${email}: ${JSON.stringify(j)}`)
  return j.access_token
}

const rest = (tok) => async (method, path, body, extraHeaders = {}) => {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${tok}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await r.text()
  let parsed
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
  return { status: r.status, body: parsed }
}

async function invokeFn(tok, name, body) {
  const r = await fetch(`${URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await r.text()
  let parsed
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
  return { status: r.status, body: parsed }
}

let empTok, seekTok, empRest, seekRest

try {
  empTok = await signIn(EMP)
  seekTok = await signIn(SEEK)
  empRest = rest(empTok)
  seekRest = rest(seekTok)
  log('signed in as both roles')

  // ── 1. Employer publishes a job. "Farm Manager" @ $60-70k: avg 65k → experienced,
  //       then the "manager" keyword bumps it to senior. Expected fee 80000 cents = $800.
  const job = await empRest('POST', 'jobs', {
    employer_id: EMPLOYER_PROFILE_ID,
    title: 'Farm Manager',
    sector: 'dairy',
    role_type: 'manager',
    region: 'Waikato',
    contract_type: 'permanent',
    salary_min: 60000,
    salary_max: 70000,
    status: 'active',
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  })
  if (job.status >= 300) throw new Error(`job insert failed: ${JSON.stringify(job)}`)
  created.jobId = job.body[0].id
  log('employer published a job (RLS-enforced, real JWT)', { id: created.jobId, status: job.body[0].status })

  // ── 2. Seeker needs a profile row to apply.
  // E2E_SEEKER_EMAIL is the OPERATOR'S PERSONAL ACCOUNT, not +ci-seeker (which has the
  // seeker role but has never onboarded and so has no profile). Its profile is real data
  // from 2026-05-05 — so this probe READS it and never creates or deletes it. Only the
  // application and the fee row below are ours to remove.
  const sp = await seekRest('GET', 'seeker_profiles?select=id,user_id&limit=1')
  if (sp.status >= 300 || !sp.body?.length) {
    throw new Error(`could not read the seeker's own profile: ${JSON.stringify(sp)}`)
  }
  created.seekerProfileId = sp.body[0].id
  created.seekerProfileIsPreExisting = true
  log('using the seeker\'s EXISTING profile (not created, will not be deleted)', {
    id: created.seekerProfileId,
  })

  // ── 3. Seeker applies.
  const app = await seekRest('POST', 'applications', {
    job_id: created.jobId,
    seeker_id: created.seekerProfileId,
  })
  if (app.status >= 300) throw new Error(`application insert failed: ${JSON.stringify(app)}`)
  created.appId = app.body[0].id
  log('seeker applied', { id: created.appId })

  // ── 4. Pull the listing off the public board immediately — it only had to exist long
  //       enough for a real application to be created through the real policy.
  const unpub = await empRest('PATCH', `jobs?id=eq.${created.jobId}`, { status: 'draft' })
  log('listing withdrawn from the public board', { status: unpub.status })

  // ── 5. THE MONEY STEP. Employer acknowledges the placement fee. Body deliberately
  //       carries TAMPERED values — the server must ignore them and derive its own.
  const ack = await invokeFn(empTok, 'acknowledge-placement-fee', {
    application_id: created.appId,
    fee_tier: 'entry',   // tamper: claim the cheapest tier
    amount_nzd: 1,       // tamper: claim 1 cent
  })
  log('acknowledge-placement-fee returned', ack)
  if (ack.status < 300) created.feeRow = true

  // ── 6. PHASE B (opt-in): the Stripe half. Creates and finalises a TEST-MODE invoice.
  //       Finalising makes Stripe email the hosted invoice to the employer, and this
  //       function also emails the seeker a "you've been hired" note via Resend — so it
  //       stays behind a flag rather than running by default.
  if (process.env.PHASE_B === '1') {
    const inv = await invokeFn(empTok, 'create-placement-invoice', {
      application_id: created.appId,
      fee_tier: 'entry', // tamper again — the ACK snapshot must win
      amount_nzd: 1,
      rating: 5,
    })
    log('create-placement-invoice returned', inv)
    created.invoiceId = inv.body?.invoice_id ?? null
  }

  console.log('\n=== PROBE COMPLETE — verify via SQL before teardown ===')
  console.log(JSON.stringify({ ...created, employer_profile_id: EMPLOYER_PROFILE_ID }, null, 2))
  console.log('\nLeaving rows in place for verification. Run with TEARDOWN=1 to remove them.')
} catch (e) {
  console.error('\n!!! PROBE FAILED:', e.message)
  console.error('Tearing down whatever was created.')
  process.exitCode = 1
  await teardown()
}

async function teardown() {
  if (!empRest) return
  const admin = empRest
  if (created.appId) console.log('  del placement_fees:', (await admin('DELETE', `placement_fees?application_id=eq.${created.appId}`)).status)
  if (created.appId) console.log('  del applications:', (await admin('DELETE', `applications?id=eq.${created.appId}`)).status)
  // Deliberately NOT deleting the seeker profile — it is the operator's real data and
  // this probe only borrowed it. Match scores are FK'd to the job and go with it.
  if (created.jobId) console.log('  del job (cascades match_scores):', (await admin('DELETE', `jobs?id=eq.${created.jobId}`)).status)
}

if (process.env.TEARDOWN === '1') {
  console.log('\n=== TEARDOWN ===')
  await teardown()
}
