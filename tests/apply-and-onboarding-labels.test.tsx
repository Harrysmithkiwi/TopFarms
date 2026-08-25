import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'

// Three accessible-name defects found by the pre-launch UAT design pass, 2026-08-25 —
// the ones the CI a11y sweep never reached because it only ever scanned wizard step 1
// with an already-onboarded account. DESIGN.md §5 lists accessible name in the BLOCKING
// set; axe rates an unlabelled <input>/<textarea> CRITICAL (rule: label).
//
//   a) react-dropzone's file input is visually hidden but stays in the a11y tree, so
//      every dropzone on the seeker "DairyNZ qualification" step announced as an
//      unlabelled file input.
//   b) The apply form's cover note was named only by its placeholder, which vanishes on
//      the first keystroke.
//   c) The farm-types chip group disables Continue while it is empty, and the sentence
//      saying so was an unassociated <p> AFTER the control.

const { fromMock, invokeMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  invokeMock: vi.fn(() => Promise.resolve({ data: null, error: null })),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
    rpc: vi.fn(),
    functions: { invoke: invokeMock },
    storage: { from: () => ({ upload: vi.fn(), remove: vi.fn() }) },
  },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

vi.mock('@vercel/analytics', () => ({ track: vi.fn() }))

// The auth object must be referentially STABLE: JobDetail's load effect lists `session`
// in its deps, so a fresh literal per render re-fires the fetch forever.
vi.mock('@/hooks/useAuth', () => {
  const auth = {
    session: { user: { id: 'u-seeker' } },
    role: 'seeker',
    loading: false,
  }
  return { useAuth: () => auth }
})

vi.mock('@/hooks/useSavedJobs', () => ({
  useSavedJobs: () => ({ isSaved: () => false, toggleSave: vi.fn() }),
}))

import { JobDetail } from '@/pages/jobs/JobDetail'
import { DocumentUploader } from '@/components/ui/DocumentUploader'
import { SeekerStep1FarmType } from '@/pages/onboarding/steps/SeekerStep1FarmType'

const JOB_ID = '11111111-2222-4333-8444-555555555555'

const jobRow = {
  id: JOB_ID,
  title: 'Herd Manager',
  status: 'active',
  region: 'Waikato',
  contract_type: 'permanent',
  salary_min: null,
  salary_max: null,
  expires_at: null,
  start_date: null,
  created_at: '2026-08-01T00:00:00Z',
  employer_profiles: { id: 'e1', farm_name: 'UAT Station', region: 'Waikato' },
}

// Per-table results. `single`/`maybeSingle` resolve the row form; awaiting the builder
// itself resolves the list form — that split is what lets `jobs` serve both the detail
// fetch (.single()) and the similar-jobs fetch (.limit(3)).
const TABLES: Record<string, { row?: unknown; list?: unknown; count?: number }> = {
  jobs: { row: jobRow, list: [] },
  job_skills: { list: [] },
  employer_verifications: { list: [] },
  applications: { row: null, list: [], count: 0 },
  seeker_profiles: { row: { id: 'sp-1' } },
  match_scores: { row: null },
}

function builderFor(table: string) {
  const cfg = TABLES[table] ?? {}
  const result = { data: cfg.list ?? [], error: null, count: cfg.count ?? 0 }
  const builder: Record<string, unknown> = {
    single: () => Promise.resolve({ data: cfg.row ?? null, error: null }),
    maybeSingle: () => Promise.resolve({ data: cfg.row ?? null, error: null }),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
  }
  for (const m of ['select', 'eq', 'neq', 'limit', 'order', 'in', 'gte', 'lte', 'upsert']) {
    builder[m] = () => builder
  }
  return builder
}

// useParams reads from a matched route, so JobDetail needs a real <Route> — mounting it
// bare under MemoryRouter leaves jobId undefined and the page renders its 404.
const renderJobDetail = () =>
  render(
    <MemoryRouter initialEntries={[`/jobs/${JOB_ID}`]}>
      <Routes>
        <Route path="/jobs/:id" element={<JobDetail />} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  fromMock.mockReset()
  fromMock.mockImplementation((table: string) => builderFor(table))
})

describe('apply form cover note has an accessible name', () => {
  it('names the textarea by something other than its placeholder', async () => {
    renderJobDetail()

    const applyButton = await screen.findByRole('button', { name: /apply now/i })
    fireEvent.click(applyButton)

    const note = await waitFor(() => screen.getByLabelText(/cover note/i))
    // getByLabelText never matches a placeholder, so finding it here IS the proof that
    // the name comes from a <label>/aria-label that survives the first keystroke.
    expect(note).toBeInstanceOf(HTMLTextAreaElement)
  })

  it('leaves no textarea in the apply dialog without an accessible name', async () => {
    const { baseElement } = renderJobDetail()
    fireEvent.click(await screen.findByRole('button', { name: /apply now/i }))
    await waitFor(() => expect(baseElement.querySelector('textarea')).toBeTruthy())

    const orphans = [...baseElement.querySelectorAll('textarea')].filter((t) => {
      const byId = t.id && baseElement.querySelector(`label[for="${CSS.escape(t.id)}"]`)
      return !byId && !t.getAttribute('aria-label') && !t.getAttribute('aria-labelledby')
    })
    expect(orphans).toHaveLength(0)
  })
})

describe('DocumentUploader dropzone input has an accessible name', () => {
  it('names the hidden file input', () => {
    const { container } = render(
      <DocumentUploader
        seekerProfileId="sp-1"
        bucket="seeker-documents"
        path="u-seeker/documents"
        accept={{ 'application/pdf': ['.pdf'] }}
      />,
    )
    const inputs = [...container.querySelectorAll('input[type="file"]')]
    expect(inputs.length).toBeGreaterThan(0)
    const orphans = inputs.filter(
      (i) =>
        !i.getAttribute('aria-label') &&
        !i.getAttribute('aria-labelledby') &&
        !(i.id && container.querySelector(`label[for="${CSS.escape(i.id)}"]`)),
    )
    expect(orphans).toHaveLength(0)
  })
})

describe('seeker step 1 says which chip group blocks Continue', () => {
  it('describes the required farm-type group from the group itself', () => {
    render(<SeekerStep1FarmType onComplete={vi.fn()} showContactFields={false} />)

    const group = screen.getByRole('group', { name: /farm types you are looking for/i })
    const describedBy = group.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()

    const text = describedBy!
      .split(' ')
      .filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
    expect(text).toMatch(/required/i)
  })

  it('keeps Continue disabled until the group it describes is answered', () => {
    render(<SeekerStep1FarmType onComplete={vi.fn()} showContactFields={false} />)
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
  })
})
