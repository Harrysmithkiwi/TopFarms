import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Test intent — audit finding F-11, found 2026-08-17 and verified against live column ACLs.
//
// Migration 073 revoked `status` and `verified_at` from the `authenticated` role so the
// browser could not declare itself verified. Four of the five client writers were never
// updated to match, so each returned 42501 permission denied on every attempt:
//
//   EmployerVerification / PhoneVerification / FarmPhotoUpload  →  status + verified_at
//   NzbnVerification                                            →  status ('pending' is
//                                                                  also ungrantable)
//
// `basic` — the first rung of the trust ladder — IS email-verified, so the ladder was
// unclimbable from the bottom for every employer. Worse, PhoneVerification swallowed the
// denial and fired toast.success('Phone number verified!') regardless.
//
// This is a SOURCE-SHAPE guard, deliberately. The invariant is "the browser never sends a
// column it holds no grant on", which is a property of the source, not of a render. A
// component test would prove the mock, not the grant. Same idiom as
// tests/edge-function-authz.test.ts and tests/phase2-revenue-guards.test.ts.

const VERIFICATION_DIR = join(process.cwd(), 'src/pages/verification')

function read(file: string): string {
  return readFileSync(join(VERIFICATION_DIR, file), 'utf-8')
}

/** The block of an `employer_verifications` write, from the table name to the closing call. */
function directWriteBlocks(source: string): string[] {
  const blocks: string[] = []
  const re = /from\(['"]employer_verifications['"]\)[\s\S]{0,600}?\)\s*\n/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source)) !== null) blocks.push(m[0])
  return blocks
}

const WRITERS = [
  'EmployerVerification.tsx',
  'PhoneVerification.tsx',
  'FarmPhotoUpload.tsx',
  'NzbnVerification.tsx',
  'DocumentUpload.tsx',
]

describe('employer_verifications — the browser only writes columns it holds grants on', () => {
  it.each(WRITERS)('%s sends no `status` in any direct write', (file) => {
    for (const block of directWriteBlocks(read(file))) {
      // `status:` as an object key. 073 grants no INSERT or UPDATE on this column at any
      // value, so even the honest 'pending' is refused.
      expect(block).not.toMatch(/\bstatus\s*:/)
    }
  })

  it.each(WRITERS)('%s sends no `verified_at` in any direct write', (file) => {
    for (const block of directWriteBlocks(read(file))) {
      expect(block).not.toMatch(/\bverified_at\s*:/)
    }
  })
})

describe('employer_verifications — methods that must not queue for admin review', () => {
  it('email and phone go through the definer sync RPC, not a direct write', () => {
    expect(read('EmployerVerification.tsx')).toContain(
      "rpc('employer_sync_self_verifications')",
    )
    expect(read('PhoneVerification.tsx')).toContain("rpc('employer_sync_self_verifications')")
  })

  it('farm photo is self-verified through its own definer RPC', () => {
    // Operator decision 2026-08-17: a farm photo is a richness signal, not an identity
    // claim. The identity rung (nzbn OR document) stays admin-reviewed, so fully_verified
    // still cannot be self-asserted.
    expect(read('FarmPhotoUpload.tsx')).toContain("rpc('employer_record_farm_photo'")
  })

  it('nzbn and document stay direct writes so the DEFAULT pending stands', () => {
    // These two are evidence an admin rules on. They must NOT route through a definer RPC,
    // or the review step disappears.
    expect(read('NzbnVerification.tsx')).toContain("from('employer_verifications')")
    expect(read('DocumentUpload.tsx')).toContain("from('employer_verifications')")
    expect(read('NzbnVerification.tsx')).not.toContain('employer_record_farm_photo')
    expect(read('DocumentUpload.tsx')).not.toContain('employer_sync_self_verifications')
  })
})

describe('employer_verifications — a failed write must not read as a success', () => {
  it('PhoneVerification does not toast success on the error path', () => {
    const src = read('PhoneVerification.tsx')
    const syncIdx = src.indexOf("rpc('employer_sync_self_verifications')")
    expect(syncIdx).toBeGreaterThan(-1)

    // Between the write and the success toast there must be an early return on error.
    // Before the fix this window contained only a console.error, so the employer was told
    // "Phone number verified!" while nothing had been stored.
    const toastIdx = src.indexOf("toast.success('Phone number verified!')", syncIdx)
    expect(toastIdx).toBeGreaterThan(syncIdx)

    const between = src.slice(syncIdx, toastIdx)
    expect(between).toMatch(/if\s*\(\s*syncError\s*\)/)
    expect(between).toMatch(/\breturn\b/)
  })
})
