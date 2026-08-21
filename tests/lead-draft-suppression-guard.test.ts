import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Test intent — UPLIFT-95 Phase 2 (deliverability), the drafting side of F-21.
//
// admin_lead_suppress (087) records an opt-out by writing lead_suppression and marking the
// lead 'dead'. Intake enforces suppression on harvest; nothing enforced it on DRAFTING —
// lead-draft-email would happily draft an outreach email for a dead or suppressed lead if
// called with its id. The guard refuses both, and this test pins its load-bearing shape the
// same way lead-opt-out.test.ts pins 087's: the checks must exist, and the mirrored key must
// stay region-less, or a re-harvested variant of a suppressed farm becomes draftable again.

const FN = readFileSync(
  join(process.cwd(), 'supabase/functions/lead-draft-email/index.ts'),
  'utf-8',
)

describe('lead-draft-email refuses suppressed and dead leads', () => {
  it('selects status and type for the fetched lead', () => {
    const select = FN.match(/\.select\('([^']*display_name[^']*)'\)/)?.[1] ?? ''
    expect(select).toContain('status')
    expect(select).toContain('type')
  })

  it('refuses a dead lead before drafting', () => {
    const guardAt = FN.indexOf("status === 'dead'")
    const draftAt = FN.indexOf('draftWithClaude(')
    expect(guardAt, 'dead-lead guard missing').toBeGreaterThan(-1)
    // The call site, not the function definition, must come after the guard.
    expect(FN.indexOf('await draftWithClaude(', guardAt)).toBeGreaterThan(guardAt)
    expect(draftAt).toBeGreaterThan(-1)
  })

  it('checks lead_suppression with the region-less 087 key', () => {
    expect(FN).toContain("from('lead_suppression')")
    // The mirrored key: normalised name + '|' + type — and never region, which is null on
    // ~1 row in 11 and was exactly how the original F-21 leak happened.
    const keyExpr = FN.match(/const suppressionKey =[\s\S]*?\n\n/)?.[0] ?? ''
    expect(keyExpr).toContain("replace(/[^a-zA-Z0-9]+/g, '')")
    expect(keyExpr).not.toContain('region')
  })

  it('a failed suppression read refuses rather than drafting anyway', () => {
    // A transport error is not evidence of "not suppressed" — same rule as F-12.
    expect(FN).toContain('suppression check failed')
  })
})
