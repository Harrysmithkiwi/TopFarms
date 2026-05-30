// ONBOARD-EMP-CTA-01 regression guard.
//
// The bug: EmployerOnboarding.tsx rendered <Step8Complete> without an
// onComplete callback, so handleStepComplete(data, 7) — the only path that
// wrote employer_profiles.onboarding_complete=true — was never called. New
// employers who walked the wizard end-to-end saw the "Your farm profile is
// complete!" screen but PostJob.tsx's gate read the live DB row, found
// onboarding_complete=false, and trapped them in a soft loop.
//
// Compounding the bug: Step8Complete.tsx had `if (key === 'verified') return
// true // assume verified after completing onboarding` — a hardcoded UI lie
// that rendered the "Profile verified" checklist tick green regardless of any
// real DB state.
//
// This guard is a static-source-guard (no runtime mount required) over the
// three files that have to stay coherent. Pattern matches tests/fk-indexes.test.ts.
// Caught by live Playwright run 2026-05-30; fix in commit TBD.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const STEP8 = readFileSync(
  resolve(__dirname, '..', 'src/pages/onboarding/steps/Step8Complete.tsx'),
  'utf-8',
)
const PARENT = readFileSync(
  resolve(__dirname, '..', 'src/pages/onboarding/EmployerOnboarding.tsx'),
  'utf-8',
)
const POSTJOB = readFileSync(
  resolve(__dirname, '..', 'src/pages/jobs/PostJob.tsx'),
  'utf-8',
)

describe('ONBOARD-EMP-CTA-01 — Step 8 finalize + verified-tick honesty', () => {
  describe('Step8Complete.tsx', () => {
    it('imports useEffect and useRef from react (finalize hook + once-only guard)', () => {
      expect(STEP8).toMatch(/import\s*\{[^}]*\buseEffect\b[^}]*\}\s*from\s*['"]react['"]/)
      expect(STEP8).toMatch(/import\s*\{[^}]*\buseRef\b[^}]*\}\s*from\s*['"]react['"]/)
    })

    it('accepts an onComplete prop', () => {
      // Match either `onComplete?:` or `onComplete:` in the props interface
      expect(STEP8).toMatch(/onComplete\??:\s*\(/)
    })

    it('fires onComplete inside a useEffect guarded by a ref (idempotent finalize)', () => {
      // Look for the ref guard pattern: a useRef that's checked + flipped before calling onComplete
      expect(STEP8).toMatch(/useRef\s*\(\s*false\s*\)/)
      expect(STEP8).toMatch(/onComplete\?\.\(\s*\)/)
      // The effect must contain a current-check (early return / set true) AND the onComplete invocation
      expect(STEP8).toMatch(/\.current\s*=\s*true/)
    })

    it('does NOT contain the hardcoded "verified" UI lie', () => {
      // The original bug: `if (key === 'verified') return true`. Any variation
      // of that pattern would re-introduce the conflation of onboarding
      // completeness with verification status.
      expect(STEP8).not.toMatch(/key\s*===\s*['"]verified['"]\s*\)\s*return\s+true/)
    })

    it('does NOT list a "verified" checklist row (verification is a separate concern)', () => {
      // Onboarding completeness and verification (Phase 21 admin doc review)
      // are different. The Step 8 checklist must not claim "Profile verified"
      // — that's a separate Phase 26 / admin-doc concern.
      expect(STEP8).not.toMatch(/key:\s*['"]verified['"]/)
    })
  })

  describe('EmployerOnboarding.tsx', () => {
    it('passes onComplete to <Step8Complete> (wires the finalize callback)', () => {
      // Look for `<Step8Complete` followed within a reasonable window by
      // `onComplete=`. Without this prop, Step 8 cannot trigger the parent's
      // handleStepComplete(data, 7) and the bug returns.
      const step8Render = STEP8_RENDER_REGEX.exec(PARENT)
      expect(step8Render).not.toBeNull()
      expect(step8Render?.[0] ?? '').toMatch(/onComplete\s*=/)
    })

    it('still includes handleStepComplete invocation with index 7 (TOTAL_STEPS-1)', () => {
      // The finalize path: handleStepComplete({}, 7) writes onboarding_complete=true.
      // If someone refactors away the 7 / TOTAL_STEPS-1 literal, the flag stops flipping.
      expect(PARENT).toMatch(/handleStepComplete\s*\(\s*\{\s*\}\s*,\s*7\s*\)/)
    })
  })

  describe('PostJob.tsx', () => {
    it('emits ONBOARD-EMP-CTA-01 console warning when gate trips on a wizard-complete user', () => {
      // Instrumentation: if a future user lands on /jobs/new with
      // onboarding_step >= 7 but onboarding_complete=false, the soft loop is
      // back. The warning surfaces the regression in dev/prod console.
      expect(POSTJOB).toMatch(/ONBOARD-EMP-CTA-01/)
      expect(POSTJOB).toMatch(/onboarding_step\s*\?\?\s*0\s*\)\s*>=\s*7/)
    })
  })
})

// Match the JSX block that renders <Step8Complete ... />. Multiline.
const STEP8_RENDER_REGEX = /<Step8Complete[\s\S]*?\/>/m
