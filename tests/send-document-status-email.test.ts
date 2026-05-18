// Phase 21 plan 21-06 — send-document-status-email Edge Function regression guard.
//
// Static-source test (no Deno runtime, no jsdom): readFileSync + regex across
// the function body + supabase/config.toml. Verifies the function preserves
// CLAUDE.md §5 gateway-trust + Phase 18.1 SC-3 WEBHOOK_SECRET + RESEARCH.md
// §Pattern 4 (3 templates: approved / rejected / needs_resubmission) across
// future refactors. Pure-Node; runtime <50ms.
//
// Pattern source: tests/employer-visible-document-types-drift.test.ts
// (Phase 18.1 #1) + tests/webhook-secret-presence.test.ts (Phase 18.1 #3).

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const FN_PATH = resolve(__dirname, '../supabase/functions/send-document-status-email/index.ts')
const CONFIG_PATH = resolve(__dirname, '../supabase/config.toml')

describe('send-document-status-email Edge Function (Phase 21 DOC-QUEUE-EMAIL-01/02)', () => {
  const source = readFileSync(FN_PATH, 'utf-8')
  const config = readFileSync(CONFIG_PATH, 'utf-8')

  it('DOC-QUEUE-EMAIL-01: 3 templates defined (approved / rejected / needs_resubmission)', () => {
    expect(source).toMatch(/function approvedTemplate/)
    expect(source).toMatch(/function rejectedTemplate/)
    expect(source).toMatch(/function needsResubmissionTemplate/)
  })

  it('DOC-QUEUE-EMAIL-01: action branch routes each action to its template', () => {
    // Each template name appears in the body branch dispatch as well as in its definition.
    expect(source).toMatch(/approvedTemplate\(/)
    expect(source).toMatch(/rejectedTemplate\(/)
    expect(source).toMatch(/needsResubmissionTemplate\(/)
  })

  it('CLAUDE §5 gateway-trust preserved: payload.aud === "authenticated" decode', () => {
    expect(source).toMatch(/payload\.aud !== 'authenticated'/)
  })

  it('CLAUDE §5 gateway-trust preserved: no adminClient.auth.getUser(token) call', () => {
    // Allow auth.admin.getUserById (data fetch on a service-role client — NOT JWT
    // re-validation; explicitly permitted per BFIX-05 audit precedent in Phase 15).
    expect(source).not.toMatch(/adminClient\.auth\.getUser\(/)
  })

  it('Phase 18.1 SC-3: X-Webhook-Secret header validated against WEBHOOK_SECRET', () => {
    expect(source).toMatch(/X-Webhook-Secret/)
    expect(source).toMatch(/WEBHOOK_SECRET/)
  })

  it('Admin-only gate: caller must have user_roles.role === "admin"', () => {
    expect(source).toMatch(/roleRow\?\.role !== 'admin'/)
  })

  it('Best-effort: RESEND_API_KEY missing returns skipped:true (no admin RPC rollback)', () => {
    expect(source).toMatch(/skipped: true/)
    expect(source).toMatch(/'no_resend_key'/)
  })

  it('Rejection: empty rejection_reason returns 400', () => {
    expect(source).toMatch(/rejection_reason is required when action=rejected/)
  })

  it('config.toml: verify_jwt = true on send-document-status-email', () => {
    expect(config).toMatch(/\[functions\.send-document-status-email\][\s\S]{0,800}verify_jwt\s*=\s*true/)
  })

  it('No pg_net.http_post — invocation is from client (RESEARCH §Open Q3 — best-effort)', () => {
    expect(source).not.toMatch(/pg_net\.http_post/)
    expect(source).not.toMatch(/net\.http_post/)
  })
})
