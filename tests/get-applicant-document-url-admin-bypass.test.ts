import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Static-source guard — Phase 21 Track B regression protection.
// Pattern: Phase 18.1 SC-1 employer-visible-document-types-drift.test.ts + saved-search-load-integration.test.tsx.
// Verifies the get-applicant-document-url Edge Function has:
//   (a) Phase 21 admin bypass branch — `roleRow?.role === 'admin'` early-exit
//   (b) BFIX-05 gateway-trust JWT pattern preserved — `payload.aud !== 'authenticated'` decode; NO auth.getUser call
//   (c) PRIV-02 identity exclusion preserved on the non-admin path
//   (d) Employer 403 reject preserved on non-admin non-employer callers
// Runs in <10ms; no Deno required.

const FN_PATH = resolve(__dirname, '../supabase/functions/get-applicant-document-url/index.ts')

describe('get-applicant-document-url admin bypass + gateway-trust (Phase 21 DOC-QUEUE-03)', () => {
  const source = readFileSync(FN_PATH, 'utf-8')

  it('DOC-QUEUE-03: contains admin role bypass branch', () => {
    expect(source).toMatch(/roleRow\?\.role === 'admin'/)
  })

  it('DOC-QUEUE-03: admin branch mints signed URL via createSignedUrl', () => {
    // Find admin branch start; verify createSignedUrl exists within 2500 chars of the branch
    const idx = source.indexOf("roleRow?.role === 'admin'")
    expect(idx).toBeGreaterThan(-1)
    const adminBranchWindow = source.slice(idx, idx + 2500)
    expect(adminBranchWindow).toMatch(/createSignedUrl/)
  })

  it('CLAUDE §5 gateway-trust preserved: no executable adminClient.auth.getUser(token) call', () => {
    // The BFIX-05 docblock at the top references the anti-pattern by name as documentation
    // (and AC2 requires that docblock be preserved). Strip comments before asserting there
    // is no executable call to adminClient.auth.getUser / auth.getUserById anywhere.
    const stripped = source
      .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
      .replace(/^\s*\/\/.*$/gm, '') // line comments
    expect(stripped).not.toMatch(/adminClient\.auth\.getUser/)
    expect(stripped).not.toMatch(/auth\.getUserById/)
  })

  it('CLAUDE §5 gateway-trust preserved: payload.aud check present', () => {
    expect(source).toMatch(/payload\.aud !== 'authenticated'/)
  })

  it('PRIV-02 identity exclusion preserved on non-admin path', () => {
    expect(source).toMatch(/Identity documents are not accessible to employers/)
  })

  it('non-admin non-employer reject preserved', () => {
    expect(source).toMatch(/Caller is not an employer/)
  })

  it('EMPLOYER_VISIBLE_DOCUMENT_TYPES whitelist preserved on non-admin path', () => {
    expect(source).toMatch(/EMPLOYER_VISIBLE_DOCUMENT_TYPES/)
  })
})
