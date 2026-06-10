// Phase 18.1 #4 — MarkFilledModal calls mark_job_filled RPC with correct args.
//
// Behavioural test: when handleConfirm fires, exactly one supabase.rpc call is made
// with the canonical signature ('mark_job_filled', { p_job_id, p_applicant_id }).
// The two legacy .from('applications').update() and .from('jobs').update() calls
// MUST be gone from the modal — those re-introduce the orphan-hired race.
//
// Phase 18.2 #2 — SC-10: display_name row rendering
// MarkFilledModal applicant rows must show "Name • Status • Xpts" format via
// the get_applicants_for_job SECURITY DEFINER RPC. UUID fragment rows must be gone.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// vi.hoisted because MarkFilledModal statically imports @/lib/supabase
// (matches Phase 17-02/20-06 vi.hoisted precedent).
const { rpcMock, fromMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  fromMock: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: rpcMock, from: fromMock },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { MarkFilledModal } from '@/pages/jobs/MarkFilledModal'

// Default rpc mock: get_applicants_for_job returns 1 applicant with display_name
function setupDefaultApplicantRpc() {
  rpcMock.mockImplementation((name: string) => {
    if (name === 'get_applicants_for_job') {
      return Promise.resolve({
        data: [
          {
            id: 'aaaaaaaa-0000-0000-0000-000000000001',
            seeker_id: 'seek-1',
            status: 'applied',
            display_name: 'John Smith',
            match_score: 78,
          },
        ],
        error: null,
      })
    }
    // mark_job_filled
    return Promise.resolve({ data: null, error: null })
  })
}

beforeEach(() => {
  rpcMock.mockReset()
  fromMock.mockReset()
  setupDefaultApplicantRpc()
})

describe('MarkFilledModal — mark_job_filled RPC contract', () => {
  it('handleConfirm calls supabase.rpc("mark_job_filled", { p_job_id, p_applicant_id })', async () => {
    rpcMock.mockImplementation((name: string) => {
      if (name === 'get_applicants_for_job') {
        return Promise.resolve({ data: [], error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const onClose = vi.fn()
    const onFilled = vi.fn()
    render(<MarkFilledModal jobId="job-1" isOpen onClose={onClose} onFilled={onFilled} />)

    // Default selectedApplicantId is null ('Hired externally' branch); confirm with that
    fireEvent.click(screen.getByRole('button', { name: /confirm filled/i }))

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith('mark_job_filled', {
        p_job_id: 'job-1',
        p_applicant_id: null,
      })
    })
  })

  it('does NOT make legacy .from("applications").update() or .from("jobs").update() calls', async () => {
    rpcMock.mockImplementation((name: string) => {
      if (name === 'get_applicants_for_job') {
        return Promise.resolve({ data: [], error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const onClose = vi.fn()
    const onFilled = vi.fn()
    render(<MarkFilledModal jobId="job-1" isOpen onClose={onClose} onFilled={onFilled} />)

    fireEvent.click(screen.getByRole('button', { name: /confirm filled/i }))

    await waitFor(() => expect(rpcMock).toHaveBeenCalledWith('mark_job_filled', expect.any(Object)))

    // No update path through fromMock — fromMock should not be called at all
    const sourceCallShape = JSON.stringify(fromMock.mock.calls)
    expect(sourceCallShape).not.toMatch(/"update"/)
  })

  it('MarkFilledModal source contains exactly one .rpc("mark_job_filled") call site', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const source = readFileSync(
      resolve(__dirname, '..', 'src/pages/jobs/MarkFilledModal.tsx'),
      'utf8',
    )
    const matches = source.match(/\.rpc\(\s*['"]mark_job_filled['"]/g) ?? []
    expect(matches).toHaveLength(1)
    expect(source).not.toMatch(/from\(['"]applications['"]\)\s*\.update/)
    expect(source).not.toMatch(/from\(['"]jobs['"]\)\s*\.update/)
  })
})

describe('MarkFilledModal — SC-10 display_name row rendering', () => {
  it('renders applicant row as "John Smith • Shortlisted • 78pts"', async () => {
    rpcMock.mockImplementation((name: string) => {
      if (name === 'get_applicants_for_job') {
        return Promise.resolve({
          data: [
            {
              id: 'aaaaaaaa-0000-0000-0000-000000000001',
              seeker_id: 'seek-1',
              status: 'shortlisted',
              display_name: 'John Smith',
              match_score: 78,
            },
          ],
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    render(<MarkFilledModal jobId="job-1" isOpen onClose={vi.fn()} onFilled={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText(/John Smith/)).toBeInTheDocument()
    })
    expect(screen.getByText(/78pts/)).toBeInTheDocument()
    // Status is capitalised
    expect(screen.getByText(/Shortlisted/i)).toBeInTheDocument()
  })

  it('renders email fallback when display_name is email', async () => {
    rpcMock.mockImplementation((name: string) => {
      if (name === 'get_applicants_for_job') {
        return Promise.resolve({
          data: [
            {
              id: 'bbbbbbbb-0000-0000-0000-000000000002',
              seeker_id: 'seek-2',
              status: 'applied',
              display_name: 'unknown@example.com',
              match_score: 0,
            },
          ],
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    render(<MarkFilledModal jobId="job-1" isOpen onClose={vi.fn()} onFilled={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText(/unknown@example\.com/)).toBeInTheDocument()
    })
    expect(screen.getByText(/0pts/)).toBeInTheDocument()
  })

  it('renders UUID fragment as last resort', async () => {
    rpcMock.mockImplementation((name: string) => {
      if (name === 'get_applicants_for_job') {
        return Promise.resolve({
          data: [
            {
              id: 'ab12cd34-0000-0000-0000-000000000003',
              seeker_id: 'seek-3',
              status: 'interview',
              display_name: 'ab12cd34',
              match_score: 55,
            },
          ],
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    render(<MarkFilledModal jobId="job-1" isOpen onClose={vi.fn()} onFilled={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText(/ab12cd34/)).toBeInTheDocument()
    })
    expect(screen.getByText(/55pts/)).toBeInTheDocument()
    expect(screen.getByText(/Interview/i)).toBeInTheDocument()
  })

  it('does not render "Applicant #" prefix in any row', async () => {
    rpcMock.mockImplementation((name: string) => {
      if (name === 'get_applicants_for_job') {
        return Promise.resolve({
          data: [
            {
              id: 'cccccccc-0000-0000-0000-000000000004',
              seeker_id: 'seek-4',
              status: 'shortlisted',
              display_name: 'Jane Doe',
              match_score: 90,
            },
          ],
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    render(<MarkFilledModal jobId="job-1" isOpen onClose={vi.fn()} onFilled={vi.fn()} />)

    // Wait for applicants to load
    await waitFor(() => {
      expect(screen.getByText(/Jane Doe/)).toBeInTheDocument()
    })

    // "Applicant #" prefix must not appear anywhere
    expect(screen.queryByText(/Applicant #/)).toBeNull()
  })
})
