import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import axe from 'axe-core'
import type { ReactElement } from 'react'

/**
 * THE GATE THAT WAS POINTED AT THE WRONG SCREENS.
 *
 * tests/e2e/a11y.spec.ts stayed green through FIVE real accessibility defects on the
 * employer and seeker cold-start paths (2026-08-24/25). Verified cause: it navigates to
 * /onboarding/employer and /onboarding/seeker with CI accounts that are already
 * onboarded, so both surfaces bounce, the spec logs "redirected to X — scanned that
 * surface" into a CI log nobody reads, and it has been scanning a dashboard twice and a
 * wizard never. /jobs/new was not in the sweep at all. Every one of the five defects sat
 * on a step past step 1.
 *
 * Reaching those screens in a browser needs a signed-in, un-onboarded account per role —
 * prod state the suite would have to create and restore, in a run that is fullyParallel.
 * The steps are components, so they can be rendered directly instead: no account, no
 * secret, no prod row to put back, and it runs on EVERY commit rather than only in the
 * e2e job. All 23 steps of all three wizards, axe on each.
 *
 * What this cannot see, and what tests/e2e/a11y.spec.ts still owns: anything needing
 * layout — colour contrast, horizontal overflow, focus-ring paint, real viewport
 * behaviour. jsdom has no layout engine, so `color-contrast` is disabled below rather
 * than silently returning "incomplete". That split is deliberate: this file is the
 * per-step markup gate, that file is the rendered-page gate.
 */

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    functions: { invoke: vi.fn(() => Promise.resolve({ data: null, error: null })) },
    storage: { from: () => ({ upload: vi.fn(), remove: vi.fn(), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
  },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

vi.mock('@vercel/analytics', () => ({ track: vi.fn() }))

// Referentially stable: several steps list the session in an effect's deps, and a fresh
// literal per render turns that effect into an infinite loop.
vi.mock('@/hooks/useAuth', () => {
  const auth = { session: { user: { id: 'u-1' } }, role: 'seeker', loading: false }
  return { useAuth: () => auth }
})

vi.mock('@/hooks/useSeekerProfileId', () => ({ useSeekerProfileId: () => 'sp-1' }))

import { SeekerStep1FarmType } from '@/pages/onboarding/steps/SeekerStep1FarmType'
import { SeekerStep2Experience } from '@/pages/onboarding/steps/SeekerStep2Experience'
import { SeekerStep3Qualifications } from '@/pages/onboarding/steps/SeekerStep3Qualifications'
import { SeekerStep4Skills } from '@/pages/onboarding/steps/SeekerStep4Skills'
import { SeekerStep5LifeSituation } from '@/pages/onboarding/steps/SeekerStep5LifeSituation'
import { SeekerStep6Visa } from '@/pages/onboarding/steps/SeekerStep6Visa'
import { SeekerStep7Complete } from '@/pages/onboarding/steps/SeekerStep7Complete'

import { Step1FarmType } from '@/pages/onboarding/steps/Step1FarmType'
import { Step2FarmDetails } from '@/pages/onboarding/steps/Step2FarmDetails'
import { Step3Culture } from '@/pages/onboarding/steps/Step3Culture'
import { Step4Accommodation } from '@/pages/onboarding/steps/Step4Accommodation'
import { Step5Verification } from '@/pages/onboarding/steps/Step5Verification'
import { Step6Pricing } from '@/pages/onboarding/steps/Step6Pricing'
import { Step7Preview } from '@/pages/onboarding/steps/Step7Preview'
import { Step8Complete } from '@/pages/onboarding/steps/Step8Complete'

import { JobStep1Basics } from '@/pages/jobs/steps/JobStep1Basics'
import { JobStep2FarmDetails } from '@/pages/jobs/steps/JobStep2FarmDetails'
import { JobStep3Skills } from '@/pages/jobs/steps/JobStep3Skills'
import { JobStep4Compensation } from '@/pages/jobs/steps/JobStep4Compensation'
import { JobStep5Description } from '@/pages/jobs/steps/JobStep5Description'
import { JobStep6Preview } from '@/pages/jobs/steps/JobStep6Preview'
import { JobStep7Confirm } from '@/pages/jobs/steps/JobStep7Confirm'
import { JobStep8Success } from '@/pages/jobs/steps/JobStep8Success'

// Every table read resolves empty rather than hanging: a step that fetches must still
// reach its loaded markup, and a pending promise would leave axe scanning a skeleton.
function builder(): Record<string, unknown> {
  const result = { data: [], error: null, count: 0 }
  const b: Record<string, unknown> = {
    single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
  }
  for (const m of ['select', 'eq', 'neq', 'in', 'is', 'gte', 'lte', 'order', 'limit', 'insert', 'update', 'upsert', 'delete']) {
    b[m] = () => b
  }
  return b
}

beforeEach(() => {
  fromMock.mockReset()
  fromMock.mockImplementation(() => builder())
})

const noop = () => {}

const EMPLOYER_PROFILE = {
  farm_type: 'dairy',
  farm_name: 'UAT Station',
  region: 'Waikato',
  herd_size: 400,
} as never

const STEPS: Array<[string, ReactElement]> = [
  // Seeker onboarding — 7 steps.
  ['seeker 1 farm type', <SeekerStep1FarmType onComplete={noop} />],
  ['seeker 2 experience', <SeekerStep2Experience onComplete={noop} onBack={noop} />],
  ['seeker 3 qualifications', <SeekerStep3Qualifications onComplete={noop} onBack={noop} />],
  ['seeker 4 skills', <SeekerStep4Skills onComplete={noop} onBack={noop} seekerId="sp-1" />],
  ['seeker 5 life situation', <SeekerStep5LifeSituation onComplete={noop} onBack={noop} />],
  ['seeker 6 visa', <SeekerStep6Visa onComplete={noop} onBack={noop} />],
  ['seeker 7 complete', <SeekerStep7Complete seekerProfileId="sp-1" />],

  // Employer onboarding — 8 steps.
  ['employer 1 farm type', <Step1FarmType onComplete={noop} />],
  ['employer 2 farm details', <Step2FarmDetails onComplete={noop} onBack={noop} />],
  ['employer 3 culture', <Step3Culture onComplete={noop} onBack={noop} />],
  ['employer 4 accommodation', <Step4Accommodation onComplete={noop} onBack={noop} />],
  ['employer 5 verification', <Step5Verification onComplete={noop} onBack={noop} />],
  ['employer 6 pricing', <Step6Pricing onComplete={noop} onBack={noop} />],
  ['employer 7 preview', <Step7Preview onComplete={noop} onBack={noop} onGoToStep={noop} profileData={EMPLOYER_PROFILE} />],
  ['employer 8 complete', <Step8Complete onComplete={noop} />],

  // Job wizard (/jobs/new) — 8 steps. Absent from the e2e sweep entirely.
  ['job 1 basics', <JobStep1Basics onComplete={noop} />],
  ['job 2 farm details', <JobStep2FarmDetails onComplete={noop} onBack={noop} sector="dairy" />],
  ['job 3 skills', <JobStep3Skills jobId="j-1" sector="dairy" onComplete={noop} onBack={noop} />],
  ['job 4 compensation', <JobStep4Compensation onComplete={noop} onBack={noop} />],
  ['job 5 description', <JobStep5Description onComplete={noop} onBack={noop} />],
  ['job 6 preview', <JobStep6Preview jobId="j-1" onComplete={noop} onBack={noop} onGoToStep={noop} />],
  ['job 7 confirm', <JobStep7Confirm jobId="j-1" onComplete={noop} onBack={noop} />],
  ['job 8 success', <JobStep8Success jobId="j-1" />],
]

async function scan(container: HTMLElement, label: string) {
  const results = await axe.run(container, {
    // jsdom has no layout engine, so contrast cannot be computed here. It is checked by
    // scripts/contrast.mjs against the token table and by the e2e sweep in a real browser.
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  })
  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  )
  expect(
    blocking.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
    `${label}: axe serious/critical violations — ${blocking
      .map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`)
      .join('; ')}`,
  ).toEqual([])
}

describe('every wizard step passes axe (the surfaces the e2e sweep never reaches)', () => {
  it.each(STEPS)('%s', async (label, element) => {
    const { container } = render(<MemoryRouter>{element}</MemoryRouter>)
    await scan(container, label)
  })
})
