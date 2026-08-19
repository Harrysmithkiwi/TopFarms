// Send an email at most once — audit F-19.
//
// Every sender in this project decided whether to send from DERIVED STATE: a status transition,
// a due flag. Derived state repeats. `handle_job_filled` fires whenever a job's status becomes
// 'filled', so an employer who fills a job, reopens it because the hire fell through, and fills
// it again emails every unresolved applicant twice — and nothing anywhere recorded the first
// send, so nothing could tell.
//
// `sendOnceEmail` makes the DELIVERY RECORD the thing that decides, not the trigger.
//
// ── the claim ───────────────────────────────────────────────────────────────────────────
//
// `INSERT ... ON CONFLICT DO NOTHING RETURNING id` hands a row to exactly one caller and
// nothing to everyone else. That is atomic in Postgres with no lock and no read-then-write
// race, which matters here because pg_net can deliver the same webhook twice and two Edge
// invocations can overlap on a retry.
//
// The unique index behind it (migration 102) is PARTIAL on `failed_at IS NULL`:
//
//   claimed -> in the index -> a duplicate is refused; a send is in flight
//   sent    -> in the index -> refused forever
//   failed  -> LEAVES the index -> the next attempt may claim again
//
// So a provider rejection does not become a permanent silence, and it does not have to be
// deleted to allow a retry either — the failure stays on the table as history. That is the
// other half of what F-19 asked for: the audit found "Resend failure returns 200" and "no
// delivery record" and they are one problem.
//
// ── what a caller must know ─────────────────────────────────────────────────────────────
//
// A `false` return means EITHER already sent OR the send failed. Callers that care about the
// difference should read `outcome`. What no caller should do is treat `false` as a reason to
// try again in the same invocation: a duplicate claim will refuse it, and a failed claim has
// already recorded why.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'TopFarms <hello@topfarms.co.nz>'

/** Minimal shape of the supabase-js client these helpers need. Typed structurally so the Edge
 *  Functions can pass their existing service-role client without a cast.
 *
 *  `PromiseLike`, not `Promise`: PostgrestBuilder is a thenable, not a Promise instance, so a
 *  `Promise<...>` return type here rejects the real client with a missing-`catch` error. */
interface ClaimClient {
  from(table: string): {
    insert(values: Record<string, unknown>): {
      select(columns: string): {
        maybeSingle(): PromiseLike<{ data: { id: string } | null; error: unknown }>
      }
    }
    update(values: Record<string, unknown>): {
      eq(column: string, value: string): PromiseLike<{ error: unknown }>
    }
  }
}

export type SendOutcome = 'sent' | 'duplicate' | 'failed' | 'claim_error'

export interface SendOnceResult {
  ok: boolean
  outcome: SendOutcome
  /** The notification_sends row, when one was claimed. */
  id?: string
}

/**
 * Send `subject`/`html` to `recipient` exactly once for this `(kind, subjectId)`.
 *
 * Returns `{ok:false, outcome:'duplicate'}` when this email has already gone out — which is a
 * SUCCESS from the caller's point of view, not an error. Callers should count outcomes rather
 * than treat every falsy result as a failure.
 */
export async function sendOnceEmail(
  client: ClaimClient,
  args: { kind: string; subjectId: string; recipient: string; subject: string; html: string },
): Promise<SendOnceResult> {
  const { kind, subjectId, recipient, subject, html } = args

  // 1. Claim. `.maybeSingle()` rather than `.single()`: a conflict returns zero rows, which is
  //    the expected path for a repeat trigger and must not be reported as an error.
  const { data: claim, error: claimErr } = await client
    .from('notification_sends')
    .insert({ kind, subject_id: subjectId, recipient })
    .select('id')
    .maybeSingle()

  if (claimErr) {
    // 23505 should be impossible here — the REST layer applies ON CONFLICT DO NOTHING via the
    // Prefer header only when asked, so a duplicate surfaces as a unique violation instead.
    // Treat it as the duplicate it is; anything else is a real failure to record.
    const code = (claimErr as { code?: string }).code
    if (code === '23505') {
      console.log(`sendOnceEmail: ${kind}/${subjectId} already sent to ${recipient} — skipping`)
      return { ok: false, outcome: 'duplicate' }
    }
    console.error(`sendOnceEmail: could not claim ${kind}/${subjectId} for ${recipient}:`, claimErr)
    // Deliberately DO NOT send. An email we cannot record is an email we will send again.
    return { ok: false, outcome: 'claim_error' }
  }

  if (!claim) {
    console.log(`sendOnceEmail: ${kind}/${subjectId} already sent to ${recipient} — skipping`)
    return { ok: false, outcome: 'duplicate' }
  }

  // 2. Send.
  if (!RESEND_API_KEY) {
    // Not configured is a failure, not a silent skip: the claim is released so that setting the
    // key later lets the send happen, and the row records why it did not.
    await markFailed(client, claim.id, 'RESEND_API_KEY not set')
    console.error('sendOnceEmail: RESEND_API_KEY not set — skipping email to', recipient)
    return { ok: false, outcome: 'failed', id: claim.id }
  }

  let providerId: string | null = null
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM_EMAIL, to: [recipient], subject, html }),
    })
    if (!res.ok) {
      const body = await res.text()
      await markFailed(client, claim.id, `resend ${res.status}: ${body}`.slice(0, 1000))
      console.error(`Resend error for ${recipient}: ${body}`)
      return { ok: false, outcome: 'failed', id: claim.id }
    }
    providerId = ((await res.json().catch(() => null)) as { id?: string } | null)?.id ?? null
  } catch (e) {
    await markFailed(client, claim.id, `fetch threw: ${String(e)}`.slice(0, 1000))
    console.error(`Resend threw for ${recipient}:`, e)
    return { ok: false, outcome: 'failed', id: claim.id }
  }

  // 3. Record the send. If THIS fails the email has already gone out, so the claim stays as it
  //    is — still in the unique index, still blocking a duplicate. Losing sent_at costs us a
  //    timestamp; releasing the claim would cost the recipient a second email.
  const { error: markErr } = await client
    .from('notification_sends')
    .update({ sent_at: new Date().toISOString(), provider_id: providerId })
    .eq('id', claim.id)
  if (markErr) {
    console.error(`sendOnceEmail: sent ${kind}/${subjectId} to ${recipient} but could not mark it:`, markErr)
  }

  return { ok: true, outcome: 'sent', id: claim.id }
}

/** Release a claim by recording why it failed. This REMOVES the row from the partial unique
 *  index, which is what allows a later attempt to claim again. */
async function markFailed(client: ClaimClient, id: string, error: string): Promise<void> {
  const { error: err } = await client
    .from('notification_sends')
    .update({ failed_at: new Date().toISOString(), error })
    .eq('id', id)
  if (err) {
    // The row stays claimed, so this address will never be retried for this subject. Loud,
    // because the failure mode is silence.
    console.error(`sendOnceEmail: could not release claim ${id} — it will block future retries:`, err)
  }
}
