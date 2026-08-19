import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Audit F-19 — "no delivery record anywhere".
//
// Every sender decided whether to send from DERIVED STATE. `handle_job_filled` fires whenever a
// job's status BECOMES 'filled', and `notify-job-filled` then emails every unresolved applicant,
// so fill → reopen → fill emailed all of them twice. `handle_job_activated` has the same shape
// and `paused` is employer-reachable.
//
// These exercise the helper's real branches rather than its source text, because the branch that
// matters most is invisible in a grep: **when the claim cannot be recorded, it must NOT send.**
// An email we cannot record is an email we will send again.

const claimKey = (r: Record<string, unknown>) =>
  `${r.kind}|${r.subject_id}|${String(r.recipient).toLowerCase()}`

/**
 * A fake postgrest client that enforces the same rule migration 102's PARTIAL unique index does:
 * a row participates in the key only while `failed_at IS NULL`.
 */
function fakeClient(opts: { claimError?: { code?: string } | null; markError?: unknown } = {}) {
  const rows: Array<Record<string, unknown>> = []
  const live = new Set<string>()
  let nextId = 1
  const client = {
    rows,
    from() {
      return {
        insert(values: Record<string, unknown>) {
          return {
            select() {
              return {
                maybeSingle: async () => {
                  if (opts.claimError) return { data: null, error: opts.claimError }
                  const key = claimKey(values)
                  if (live.has(key)) return { data: null, error: null } // ON CONFLICT DO NOTHING
                  const row = { id: `n${nextId++}`, ...values, sent_at: null, failed_at: null }
                  rows.push(row)
                  live.add(key)
                  return { data: { id: row.id as string }, error: null }
                },
              }
            },
          }
        },
        update(values: Record<string, unknown>) {
          return {
            eq: async (_col: string, id: string) => {
              if (opts.markError) return { error: opts.markError }
              const row = rows.find((r) => r.id === id)
              if (row) {
                Object.assign(row, values)
                // Recording a failure removes the row from the partial index.
                if (values.failed_at) live.delete(claimKey(row))
              }
              return { error: null }
            },
          }
        },
      }
    },
  }
  return client
}

async function loadHelper(resendKey: string | undefined) {
  vi.resetModules()
  vi.stubGlobal('Deno', {
    env: {
      get: (k: string) => (k === 'RESEND_API_KEY' ? resendKey : undefined),
    },
  })
  return await import('../supabase/functions/_shared/notify.ts')
}

const ARGS = {
  kind: 'job_filled',
  subjectId: '11111111-1111-4111-8111-111111111111',
  recipient: 'Seeker@Example.CO.NZ',
  subject: 'Update on your application',
  html: '<p>hi</p>',
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ id: 'resend-1' }),
    text: async () => '',
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sendOnceEmail — the delivery record decides, not the trigger', () => {
  it('sends once and records it', async () => {
    const { sendOnceEmail } = await loadHelper('re_test')
    const client = fakeClient()
    const r = await sendOnceEmail(client, ARGS)
    expect(r).toMatchObject({ ok: true, outcome: 'sent' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(client.rows[0]).toMatchObject({ sent_at: expect.any(String), provider_id: 'resend-1' })
  })

  it('a repeated trigger does not repeat the email', async () => {
    // fill → reopen → fill. This is the defect, in one assertion.
    const { sendOnceEmail } = await loadHelper('re_test')
    const client = fakeClient()
    await sendOnceEmail(client, ARGS)
    const second = await sendOnceEmail(client, ARGS)
    expect(second).toMatchObject({ ok: false, outcome: 'duplicate' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(client.rows).toHaveLength(1)
  })

  it('an address differing only in case is the same inbox', async () => {
    const { sendOnceEmail } = await loadHelper('re_test')
    const client = fakeClient()
    await sendOnceEmail(client, ARGS)
    const again = await sendOnceEmail(client, { ...ARGS, recipient: 'seeker@example.co.nz' })
    expect(again.outcome).toBe('duplicate')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('a different recipient, and a different kind, are different emails', async () => {
    const { sendOnceEmail } = await loadHelper('re_test')
    const client = fakeClient()
    await sendOnceEmail(client, ARGS)
    expect((await sendOnceEmail(client, { ...ARGS, recipient: 'other@example.co.nz' })).outcome).toBe(
      'sent',
    )
    expect((await sendOnceEmail(client, { ...ARGS, kind: 'job_match_digest' })).outcome).toBe('sent')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('records a provider rejection and lets the next attempt through', async () => {
    // The partial index is what makes this possible: a failed row leaves the key, so a retry can
    // claim again — without deleting the evidence that the first attempt failed.
    const { sendOnceEmail } = await loadHelper('re_test')
    const client = fakeClient()
    fetchMock.mockResolvedValueOnce({ ok: false, status: 422, text: async () => 'bad address' })
    const first = await sendOnceEmail(client, ARGS)
    expect(first).toMatchObject({ ok: false, outcome: 'failed' })
    expect(client.rows[0]).toMatchObject({
      failed_at: expect.any(String),
      error: expect.stringContaining('422'),
    })

    const retry = await sendOnceEmail(client, ARGS)
    expect(retry.outcome).toBe('sent')
    expect(client.rows).toHaveLength(2) // the failure survives as history
    expect(client.rows.filter((r) => r.failed_at)).toHaveLength(1)
  })

  it('a thrown fetch is recorded, not swallowed', async () => {
    const { sendOnceEmail } = await loadHelper('re_test')
    const client = fakeClient()
    fetchMock.mockRejectedValueOnce(new Error('socket hang up'))
    const r = await sendOnceEmail(client, ARGS)
    expect(r.outcome).toBe('failed')
    expect(String(client.rows[0].error)).toContain('socket hang up')
  })

  it('DOES NOT SEND when the claim cannot be recorded', async () => {
    // The branch this whole test file exists for. An email we cannot record is an email we will
    // send again on the next trigger — so a failure to write the record must stop the send, not
    // be treated as "best effort, send anyway".
    const { sendOnceEmail } = await loadHelper('re_test')
    const client = fakeClient({ claimError: { code: '42501' } })
    const r = await sendOnceEmail(client, ARGS)
    expect(r).toMatchObject({ ok: false, outcome: 'claim_error' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('treats a unique violation as the duplicate it is', async () => {
    const { sendOnceEmail } = await loadHelper('re_test')
    const client = fakeClient({ claimError: { code: '23505' } })
    const r = await sendOnceEmail(client, ARGS)
    expect(r.outcome).toBe('duplicate')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('an unset RESEND_API_KEY releases the claim instead of silently blocking forever', async () => {
    // The old helper logged and returned false. With a claim in front of it, doing that would
    // burn the key permanently — the row would sit in the index blocking a send that never went.
    const { sendOnceEmail } = await loadHelper(undefined)
    const client = fakeClient()
    const r = await sendOnceEmail(client, ARGS)
    expect(r.outcome).toBe('failed')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(String(client.rows[0].error)).toContain('RESEND_API_KEY')
    // and a later attempt, once the key exists, is not blocked
    const { sendOnceEmail: retrySend } = await loadHelper('re_test')
    expect((await retrySend(client, ARGS)).outcome).toBe('sent')
  })

  it('keeps the claim when the email went out but marking it failed', async () => {
    // Losing sent_at costs a timestamp. Releasing the claim costs the recipient a second email.
    const { sendOnceEmail } = await loadHelper('re_test')
    const client = fakeClient({ markError: { message: 'write failed' } })
    const r = await sendOnceEmail(client, ARGS)
    expect(r).toMatchObject({ ok: true, outcome: 'sent' })
    expect(client.rows[0].failed_at).toBeNull()
    const second = await sendOnceEmail(client, ARGS)
    expect(second.outcome).toBe('duplicate')
  })
})

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf-8')

describe('F-19 — the senders that repeat now go through the record', () => {
  it('notify-job-filled claims per applicant, per job', async () => {
    const SRC = read('supabase/functions/notify-job-filled/index.ts')
    expect(SRC).toMatch(/import \{ sendOnceEmail \} from '\.\.\/_shared\/notify\.ts'/)
    expect(SRC).toMatch(/kind: 'job_filled'/)
    expect(SRC).toMatch(/subjectId: filledJobId/)
    expect(SRC).toMatch(/recipient: seekerEmail/)
    // No local sender may survive, or the claim is optional.
    expect(SRC).not.toMatch(/async function sendEmail\(/)
    expect(SRC).not.toMatch(/api\.resend\.com/)
    // A suppressed re-fire must not be reported as a failure.
    expect(SRC).toMatch(/already_sent/)
  })

  it('notify-job-matches claims per job', async () => {
    const SRC = read('supabase/functions/notify-job-matches/index.ts')
    expect(SRC).toMatch(/import \{ sendOnceEmail \} from '\.\.\/_shared\/notify\.ts'/)
    expect(SRC).toMatch(/kind: 'job_match_digest'/)
    expect(SRC).toMatch(/subjectId: jobId/)
    expect(SRC).not.toMatch(/async function sendEmail\(/)
    expect(SRC).not.toMatch(/api\.resend\.com/)
  })

  it('the two senders that already hold a record are left alone', async () => {
    // send-followup-emails guards on followup_7d_sent / followup_14d_sent and clears the due
    // flag in the same update — that IS a delivery record, on placement_fees.
    const FOLLOWUP = read('supabase/functions/send-followup-emails/index.ts')
    expect(FOLLOWUP).toMatch(/followup_7d_sent: true/)
    expect(FOLLOWUP).toMatch(/followup_14d_sent: true/)
    // send-document-status-email is admin-pressed, and re-sending is the documented retry path.
    const QUEUE = read('src/pages/admin/AdminDocumentsQueue.tsx')
    expect(QUEUE).toMatch(/manually retry email/i)
  })

  it('102 keys the claim on (kind, subject_id, lower(recipient)) and only while unfailed', async () => {
    const SQL = read('supabase/migrations/102_notification_sends.sql')
    expect(SQL).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS notification_sends_claim_key\s*\n\s*ON public\.notification_sends \(kind, subject_id, lower\(recipient\)\)\s*\n\s*WHERE failed_at IS NULL;/,
    )
    // Deny-all: a seeker must not read who else was emailed about a job.
    expect(SQL).toMatch(/ALTER TABLE public\.notification_sends ENABLE ROW LEVEL SECURITY;/)
    expect(SQL).toMatch(/REVOKE ALL ON public\.notification_sends FROM PUBLIC, anon, authenticated;/)
    expect(SQL).not.toMatch(/CREATE POLICY/)
    // Not a foreign key: the record must outlive the job it was about.
    expect(SQL).not.toMatch(/REFERENCES public\.jobs/)
  })
})
