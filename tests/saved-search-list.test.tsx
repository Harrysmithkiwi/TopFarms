/**
 * Phase 17 SRCH-15 — SavedSearches list page.
 *
 * Wave 3 (17-03-list-page) GREEN — turned 9 it.todo() stubs into real
 * assertions covering empty state, list render, Load (navigate), Delete
 * with sonner Undo (cancellation flag + onAutoClose hard-DELETE), and
 * inline rename (Enter commits / Escape reverts).
 *
 * Mock harness:
 *   - sonner.toast hoisted via vi.hoisted (jest equivalent for ESM mocking
 *     when the SUT statically imports the module)
 *   - supabase.from mocked to return chainable {select/eq/order, delete/eq,
 *     update/eq} thenables matching the live PostgREST builder API
 *   - useNavigate mocked at the react-router level (Link is preserved so
 *     the empty-state Link to /jobs renders correctly)
 *   - DashboardLayout mocked to a passthrough so we don't need the Nav +
 *     useAuth context tree just for layout chrome
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import type React from 'react'

const navigateMock = vi.hoisted(() => vi.fn())
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router')
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    session: { user: { id: 'user-123' } },
    role: 'seeker',
    loading: false,
  }),
}))

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const toastMock = vi.hoisted(() => {
  const fn: any = vi.fn()
  fn.success = vi.fn()
  fn.error = vi.fn()
  return fn
})
vi.mock('sonner', () => ({ toast: toastMock }))

const fromMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase', () => ({ supabase: { from: fromMock } }))

import { SavedSearches } from '@/pages/dashboard/seeker/SavedSearches'

const FAKE_ROWS = [
  {
    id: 'r1',
    user_id: 'user-123',
    name: 'Dairy in Waikato',
    search_params: 'shed_type=rotary&region=Waikato',
    created_at: '2026-05-04T00:00:00Z',
    updated_at: '2026-05-04T00:00:00Z',
  },
  {
    id: 'r2',
    user_id: 'user-123',
    name: 'Sheep & Beef',
    search_params: 'role_type=sheep_and_beef',
    created_at: '2026-05-03T00:00:00Z',
    updated_at: '2026-05-03T00:00:00Z',
  },
]

const deleteEqMock = vi.fn()
const updateEqMock = vi.fn()
const orderMock = vi.fn()

function setupMocks(rows: typeof FAKE_ROWS | []) {
  orderMock.mockResolvedValue({ data: rows, error: null })
  deleteEqMock.mockResolvedValue({ error: null })
  updateEqMock.mockResolvedValue({ error: null })

  fromMock.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: orderMock,
      }),
    }),
    delete: vi.fn().mockReturnValue({ eq: deleteEqMock }),
    update: vi.fn().mockReturnValue({ eq: updateEqMock }),
  })
}

beforeEach(() => {
  fromMock.mockReset()
  toastMock.success.mockReset()
  toastMock.error.mockReset()
  navigateMock.mockReset()
  deleteEqMock.mockReset()
  updateEqMock.mockReset()
  orderMock.mockReset()
})

describe('SavedSearches list page (SRCH-15)', () => {
  it('renders empty-state copy when no saved searches', async () => {
    setupMocks([])
    render(
      <MemoryRouter>
        <SavedSearches />
      </MemoryRouter>,
    )
    await waitFor(() =>
      expect(
        screen.queryByText(/You haven't saved any searches yet/i),
      ).toBeInTheDocument(),
    )
    expect(screen.queryByText(/Browse jobs/i)).toBeInTheDocument()
  })

  it('renders card-row per saved search with name + filter chips + Load + Delete', async () => {
    setupMocks(FAKE_ROWS)
    render(
      <MemoryRouter>
        <SavedSearches />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.queryByText('Dairy in Waikato')).toBeInTheDocument())
    expect(screen.queryByText('Sheep & Beef')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^load$/i })).toHaveLength(2)
    // Each row has a delete button labeled "Delete <name>"
    expect(
      screen.getByRole('button', { name: /^delete dairy in waikato$/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /^delete sheep & beef$/i }),
    ).toBeInTheDocument()
  })

  it('Load button calls navigate("/jobs?<search_params>", { replace: false })', async () => {
    setupMocks(FAKE_ROWS)
    render(
      <MemoryRouter>
        <SavedSearches />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.queryByText('Dairy in Waikato')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^load$/i })[0])
    expect(navigateMock).toHaveBeenCalledWith(
      '/jobs?shed_type=rotary&region=Waikato',
      { replace: false },
    )
  })

  it('Delete button shows sonner toast with Undo action and 5000ms duration', async () => {
    setupMocks(FAKE_ROWS)
    render(
      <MemoryRouter>
        <SavedSearches />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.queryByText('Dairy in Waikato')).toBeInTheDocument())
    fireEvent.click(
      screen.getByRole('button', { name: /^delete dairy in waikato$/i }),
    )
    expect(toastMock.success).toHaveBeenCalledWith(
      expect.stringContaining('Dairy in Waikato'),
      expect.objectContaining({
        duration: 5000,
        action: expect.objectContaining({ label: 'Undo' }),
      }),
    )
  })

  it('Clicking Undo within 5s flips cancellation flag and skips DELETE', async () => {
    setupMocks(FAKE_ROWS)
    render(
      <MemoryRouter>
        <SavedSearches />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.queryByText('Dairy in Waikato')).toBeInTheDocument())
    fireEvent.click(
      screen.getByRole('button', { name: /^delete dairy in waikato$/i }),
    )

    // Capture the toast options object passed to toast.success
    const toastCall = toastMock.success.mock.calls[0]
    const toastOpts = toastCall[1] as {
      action: { onClick: (e: unknown) => void }
      onAutoClose: () => Promise<void>
    }

    // Simulate Undo click
    await act(async () => {
      toastOpts.action.onClick({} as never)
    })

    // Now invoke onAutoClose — it should early-return because cancelled is true
    await act(async () => {
      await toastOpts.onAutoClose()
    })

    // No DELETE call fired
    expect(deleteEqMock).not.toHaveBeenCalled()

    // Row restored
    expect(screen.queryByText('Dairy in Waikato')).toBeInTheDocument()
  })

  it('onAutoClose fires supabase.from("saved_searches").delete().eq("id", id) when not cancelled', async () => {
    setupMocks(FAKE_ROWS)
    render(
      <MemoryRouter>
        <SavedSearches />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.queryByText('Dairy in Waikato')).toBeInTheDocument())
    fireEvent.click(
      screen.getByRole('button', { name: /^delete dairy in waikato$/i }),
    )

    const toastOpts = toastMock.success.mock.calls[0][1] as {
      onAutoClose: () => Promise<void>
    }

    await act(async () => {
      await toastOpts.onAutoClose()
    })

    // delete().eq('id', 'r1') chain
    expect(fromMock).toHaveBeenCalledWith('saved_searches')
    expect(deleteEqMock).toHaveBeenCalledWith('id', 'r1')
  })

  it('Click on name enters inline edit mode (Input replaces heading)', async () => {
    setupMocks(FAKE_ROWS)
    render(
      <MemoryRouter>
        <SavedSearches />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.queryByText('Dairy in Waikato')).toBeInTheDocument())

    // Click the name button to enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /^rename dairy in waikato$/i }))

    // Input with aria-label='Edit saved search name' is now mounted
    const input = screen.getByLabelText('Edit saved search name')
    expect(input).toBeInTheDocument()
    expect((input as HTMLInputElement).value).toBe('Dairy in Waikato')
  })

  it('Enter key commits rename via supabase.from("saved_searches").update({name, updated_at})', async () => {
    setupMocks(FAKE_ROWS)
    render(
      <MemoryRouter>
        <SavedSearches />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.queryByText('Dairy in Waikato')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /^rename dairy in waikato$/i }))
    const input = screen.getByLabelText('Edit saved search name') as HTMLInputElement

    fireEvent.change(input, { target: { value: 'My new name' } })
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' })
    })

    expect(fromMock).toHaveBeenCalledWith('saved_searches')
    // The update() call passes { name, updated_at }; .eq('id', 'r1') is the second link
    expect(updateEqMock).toHaveBeenCalledWith('id', 'r1')
  })

  it('Escape key reverts draft to original name', async () => {
    setupMocks(FAKE_ROWS)
    render(
      <MemoryRouter>
        <SavedSearches />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.queryByText('Dairy in Waikato')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /^rename dairy in waikato$/i }))
    const input = screen.getByLabelText('Edit saved search name') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Other name' } })
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Escape' })
    })

    // No update call
    expect(updateEqMock).not.toHaveBeenCalled()
    // Original name visible (button mode restored)
    expect(
      screen.queryByRole('button', { name: /^rename dairy in waikato$/i }),
    ).toBeInTheDocument()
  })
})
