// Phase 18.1 #3 — X-Webhook-Secret presence guard.
//
// Both verify_jwt:false Edge fns (notify-job-filled, send-followup-emails) MUST
// validate the X-Webhook-Secret header before processing. Pattern: get-resend-stats
// precedent (line 27 + 43-49). This test asserts the substring shape so a future
// edit that removes the validation block (e.g., refactor that breaks the guard)
// fails CI immediately.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(__dirname, '..')
const FNS = [
  'supabase/functions/notify-job-filled/index.ts',
  'supabase/functions/send-followup-emails/index.ts',
]

describe.each(FNS)('Edge fn %s — X-Webhook-Secret defence-in-depth', (relPath) => {
  const source = readFileSync(resolve(ROOT, relPath), 'utf8')

  it('reads WEBHOOK_SECRET from Deno env', () => {
    expect(source).toMatch(/Deno\.env\.get\(\s*['"]WEBHOOK_SECRET['"]\s*\)/)
  })

  it('rejects when secret is unset (503)', () => {
    // Mirrors get-resend-stats:43-46 — fail closed if config missing.
    expect(source).toMatch(/if\s*\(\s*!WEBHOOK_SECRET/)
    expect(source).toMatch(/status:\s*503/)
  })

  it('rejects when header mismatches (403)', () => {
    expect(source).toMatch(/req\.headers\.get\(\s*['"]x-webhook-secret['"]\s*\)/)
    expect(source).toMatch(/status:\s*403/)
  })
})
