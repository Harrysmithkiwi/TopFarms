import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminTable } from '@/components/admin/AdminTable'

// Gate B (docs/DESIGN.md §5): AdminTable fetches, so it ships loading, empty,
// error AND unauthorised. Nine of the thirteen admin screens route through it,
// so a state proved here is proved nine times.
//
// The unauthorised case is the one that did not exist: _admin_gate()'s raise was
// surfaced through errorCopy, telling the operator the data failed to load when
// the truth was that the server refused them.

const rpcMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}))

// The real shapes, captured from prod on 2026-08-07 by calling admin_list_*
// with a genuine non-admin session — not invented for the test.
const GATE_REFUSAL = { code: 'P0001', message: 'Forbidden: admin role required' }
const NO_EXECUTE_GRANT = { code: '42501', message: 'permission denied for function admin_list_employers' }
const REAL_FAULT = { code: '57014', message: 'canceling statement due to statement timeout' }

const columns = [{ key: 'name', label: 'Name' }]

function renderTable() {
  return render(
    <AdminTable
      rpc="admin_list_employers"
      columns={columns}
      renderRow={(row: Record<string, unknown>) => <td>{String(row.name)}</td>}
      emptyHeading="No employers yet"
      emptyBody="Employers appear here once they sign up."
      errorCopy="Couldn’t load employers."
    />,
  )
}

beforeEach(() => {
  rpcMock.mockReset()
})

describe('AdminTable required states (DESIGN.md §5)', () => {
  it('loading: shows the skeleton and announces the wait', async () => {
    // Held open deliberately, then released — a never-settling promise leaves the
    // pending fetch dangling into the next test's hooks.
    let release!: (v: unknown) => void
    rpcMock.mockReturnValue(new Promise((r) => (release = r)))
    renderTable()

    expect(screen.getByRole('status')).toHaveTextContent(/loading/i)
    // Header labels persist through the wait so the layout does not shift on resolve.
    expect(screen.getByText('Name')).toBeInTheDocument()

    release({ data: { rows: [], total: 0 }, error: null })
    await screen.findByText('No employers yet')
  })

  it('empty: shows the caller’s copy when there is genuinely nothing', async () => {
    rpcMock.mockResolvedValue({ data: { rows: [], total: 0 }, error: null })
    renderTable()
    expect(await screen.findByText('No employers yet')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /clear search/i })).not.toBeInTheDocument()
  })

  it('empty: a search matching nothing says so, and offers a way out', async () => {
    rpcMock.mockResolvedValue({ data: { rows: [], total: 0 }, error: null })
    renderTable()
    await screen.findByText('No employers yet')

    await userEvent.type(screen.getByRole('textbox'), 'zzzz')
    // "No employers yet" is false once a search is active — there may be
    // thousands, none of them matching.
    expect(await screen.findByText(/no matches for/i)).toBeInTheDocument()
    expect(screen.queryByText('No employers yet')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /clear search/i }))
    await waitFor(() => expect(screen.getByText('No employers yet')).toBeInTheDocument())
  })

  it('error: a real fault says what failed and offers a retry', async () => {
    rpcMock.mockResolvedValue({ data: null, error: REAL_FAULT })
    renderTable()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/couldn’t load employers/i)
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument()
  })

  it('error: retry re-issues the call and recovers', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: REAL_FAULT })
    rpcMock.mockResolvedValue({ data: { rows: [{ name: 'Waikato Dairy' }], total: 1 }, error: null })
    renderTable()
    await userEvent.click(await screen.findByRole('button', { name: /try again/i }))
    expect(await screen.findByText('Waikato Dairy')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('unauthorised: the admin gate refusing is NOT reported as a load error', async () => {
    rpcMock.mockResolvedValue({ data: null, error: GATE_REFUSAL })
    renderTable()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/access denied/i)
    // The regression this test exists for: errorCopy claimed the data failed to
    // load, when the server had refused on role.
    expect(alert).not.toHaveTextContent(/couldn’t load employers/i)
  })

  it('unauthorised: a missing EXECUTE grant reads the same way', async () => {
    rpcMock.mockResolvedValue({ data: null, error: NO_EXECUTE_GRANT })
    renderTable()
    expect(await screen.findByRole('alert')).toHaveTextContent(/access denied/i)
  })

  it('a business-rule raise is an error, not an unauthorised — P0001 alone is not enough', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'Lead already claimed by another admin' },
    })
    renderTable()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/couldn’t load employers/i)
    expect(alert).not.toHaveTextContent(/access denied/i)
  })
})
