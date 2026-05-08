// Phase 18.1 #4 — MarkFilledModal calls mark_job_filled RPC with correct args.
//
// Behavioural test: when handleConfirm fires, exactly one supabase.rpc call is made
// with the canonical signature ('mark_job_filled', { p_job_id, p_applicant_id }).
// The two legacy .from('applications').update() and .from('jobs').update() calls
// MUST be gone from the modal — those re-introduce the orphan-hired race.

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

beforeEach(() => {
  rpcMock.mockReset()
  fromMock.mockReset()
  // applicant-list useEffect — return 1 applicant so we have a non-null id available
  fromMock.mockReturnValue({
    select: () => ({
      eq: () =>
        Promise.resolve({
          data: [{ id: 'app-1', seeker_id: 'seek-1', status: 'applied' }],
          error: null,
        }),
    }),
  })
})

describe('MarkFilledModal — mark_job_filled RPC contract', () => {
  it('handleConfirm calls supabase.rpc("mark_job_filled", { p_job_id, p_applicant_id })', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null })

    const onClose = vi.fn()
    const onFilled = vi.fn()
    render(<MarkFilledModal jobId="job-1" isOpen onClose={onClose} onFilled={onFilled} />)

    // Default selectedApplicantId is null ('Hired externally' branch); confirm with that
    fireEvent.click(screen.getByRole('button', { name: /confirm filled/i }))

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledTimes(1)
      expect(rpcMock).toHaveBeenCalledWith('mark_job_filled', {
        p_job_id: 'job-1',
        p_applicant_id: null,
      })
    })
  })

  it('does NOT make legacy .from("applications").update() or .from("jobs").update() calls', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null })
    const onClose = vi.fn()
    const onFilled = vi.fn()
    render(<MarkFilledModal jobId="job-1" isOpen onClose={onClose} onFilled={onFilled} />)

    fireEvent.click(screen.getByRole('button', { name: /confirm filled/i }))

    await waitFor(() => expect(rpcMock).toHaveBeenCalled())

    // No update path through fromMock — only the applicant-list .select(...).eq(...) READ should appear.
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
