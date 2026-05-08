// Phase 18.1 #3 — X-Webhook-Secret presence guard.
//
// Wave 0 RED scaffold. Wave 2 (plan 18.1-04) replaces it.todo() with real
// describe.each() assertions over the two verify_jwt:false Edge fns.
//
// Both notify-job-filled and send-followup-emails MUST validate the
// X-Webhook-Secret header before processing. Pattern: get-resend-stats:27,43-49
// (already shipped — production precedent).

import { describe, it } from 'vitest'

describe('Edge fn X-Webhook-Secret defence-in-depth', () => {
  it.todo('notify-job-filled reads WEBHOOK_SECRET from Deno env')
  it.todo('notify-job-filled rejects when secret is unset (503)')
  it.todo('notify-job-filled rejects when header mismatches (403)')
  it.todo('send-followup-emails reads WEBHOOK_SECRET from Deno env')
  it.todo('send-followup-emails rejects when secret is unset (503)')
  it.todo('send-followup-emails rejects when header mismatches (403)')
})
