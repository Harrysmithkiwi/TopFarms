import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { AdminTable } from '@/components/admin/AdminTable'

// AdminTable statically imports @/lib/supabase → rpc mock via vi.hoisted.
const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: rpcMock } }))

beforeEach(() => {
  rpcMock.mockReset()
  // Non-empty so the table + its headers render (empty state hides them).
  rpcMock.mockResolvedValue({ data: { rows: [{ id: '1' }], total: 1 }, error: null })
})

function renderSortable() {
  return render(
    <AdminTable
      rpc={'admin_leads_staging_list' as never}
      searchable={false}
      defaultSort={{ key: 'captured', dir: 'desc' }}
      columns={[
        { key: 'name', label: 'Name' }, // not sortable
        { key: 'captured', label: 'Captured', sortKey: 'captured' },
      ]}
      renderRow={() => (
        <>
          <td>n</td>
          <td>c</td>
        </>
      )}
      emptyHeading="empty"
      emptyBody="empty"
      errorCopy="err"
    />,
  )
}

describe('AdminTable server-side sort (T-1 mechanism, reused by T-5)', () => {
  it('sends defaultSort as p_sort/p_dir on the initial load', async () => {
    renderSortable()
    await waitFor(() => expect(rpcMock).toHaveBeenCalled())
    const args = rpcMock.mock.calls[0][1]
    expect(args).toMatchObject({ p_sort: 'captured', p_dir: 'desc', p_offset: 0 })
  })

  it('flips direction and refetches when the active sort header is clicked', async () => {
    renderSortable()
    await waitFor(() => expect(rpcMock).toHaveBeenCalled())
    rpcMock.mockClear()

    fireEvent.click(screen.getByRole('button', { name: /Captured/i }))

    await waitFor(() => expect(rpcMock).toHaveBeenCalled())
    const args = rpcMock.mock.calls[0][1]
    // desc → asc on the active column, and back to page 1 (offset 0).
    expect(args).toMatchObject({ p_sort: 'captured', p_dir: 'asc', p_offset: 0 })
  })

  it('reflects sort state in aria-sort and leaves non-sortable headers inert', async () => {
    renderSortable()
    await waitFor(() => expect(rpcMock).toHaveBeenCalled())

    const capturedHeader = screen.getByRole('columnheader', { name: /Captured/i })
    const nameHeader = screen.getByRole('columnheader', { name: 'Name' })
    expect(capturedHeader).toHaveAttribute('aria-sort', 'descending')
    expect(nameHeader).not.toHaveAttribute('aria-sort')
    // Non-sortable column has no header button.
    expect(screen.queryByRole('button', { name: 'Name' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Captured/i }))
    await waitFor(() => expect(capturedHeader).toHaveAttribute('aria-sort', 'ascending'))
  })
})
