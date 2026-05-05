/**
 * Phase 17 SRCH-14 — quick-load dropdown.
 *
 * Wave 4 (17-04-quick-load) GREEN — 8 .todo stubs swapped for real RTL
 * assertions covering visibility, fetch shape, render, click-to-navigate,
 * View-all link, Esc-to-close, and aria-haspopup/expanded contract.
 *
 * Mock harness mirrors saved-search-list.test.tsx (Wave 3 precedent):
 *   - useNavigate mocked at the react-router level (Link preserved so the
 *     "View all" Link to /dashboard/seeker/saved-searches renders correctly)
 *   - useAuth mocked per-test via useAuthMock.mockReturnValue (toggles
 *     between signed-out and signed-in)
 *   - supabase.from mocked via vi.hoisted (SUT statically imports
 *     @/lib/supabase, so the mock must be hoisted)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

const navigateMock = vi.hoisted(() => vi.fn())
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router')
  return { ...actual, useNavigate: () => navigateMock }
})

const useAuthMock = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => useAuthMock() }))

const fromMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase', () => ({ supabase: { from: fromMock } }))

import { SavedSearchesDropdown } from '@/components/saved-search/SavedSearchesDropdown'

beforeEach(() => {
  navigateMock.mockReset()
  fromMock.mockReset()
  useAuthMock.mockReset()
})

function mockListReturning(
  rows: Array<{ id: string; name: string; search_params: string; created_at: string }>,
) {
  fromMock.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
        }),
      }),
    }),
  })
}

describe('Quick-load dropdown (SRCH-14)', () => {
  it('hidden when user is not signed in', () => {
    useAuthMock.mockReturnValue({ session: null, role: null, loading: false })
    render(
      <MemoryRouter>
        <SavedSearchesDropdown />
      </MemoryRouter>,
    )
    expect(screen.queryByTestId('saved-searches-dropdown-trigger')).toBeNull()
  })

  it('renders trigger button when user is signed in (regardless of filter state)', () => {
    useAuthMock.mockReturnValue({
      session: { user: { id: 'user-123' } },
      role: 'seeker',
      loading: false,
    })
    mockListReturning([])
    render(
      <MemoryRouter>
        <SavedSearchesDropdown />
      </MemoryRouter>,
    )
    expect(screen.queryByTestId('saved-searches-dropdown-trigger')).toBeInTheDocument()
  })

  it('opening dropdown fetches top 5 saved searches ordered by created_at desc', async () => {
    useAuthMock.mockReturnValue({
      session: { user: { id: 'user-123' } },
      role: 'seeker',
      loading: false,
    })
    const limitMock = vi.fn().mockResolvedValue({ data: [], error: null })
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ order: orderMock }),
      }),
    })
    render(
      <MemoryRouter>
        <SavedSearchesDropdown />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByTestId('saved-searches-dropdown-trigger'))
    await waitFor(() => {
      expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(limitMock).toHaveBeenCalledWith(5)
    })
  })

  it('renders name + filter summary chips per row', async () => {
    useAuthMock.mockReturnValue({
      session: { user: { id: 'user-123' } },
      role: 'seeker',
      loading: false,
    })
    mockListReturning([
      {
        id: 'r1',
        name: 'Dairy in Waikato',
        search_params: 'shed_type=rotary&region=Waikato',
        created_at: '2026-05-04T00:00:00Z',
      },
    ])
    render(
      <MemoryRouter>
        <SavedSearchesDropdown />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByTestId('saved-searches-dropdown-trigger'))
    await waitFor(() => expect(screen.queryByText('Dairy in Waikato')).toBeInTheDocument())
    expect(screen.queryByText(/rotary/)).toBeInTheDocument()
  })

  it('clicking row calls navigate("/jobs?<params>", { replace: false }) and closes dropdown', async () => {
    useAuthMock.mockReturnValue({
      session: { user: { id: 'user-123' } },
      role: 'seeker',
      loading: false,
    })
    mockListReturning([
      {
        id: 'r1',
        name: 'Dairy',
        search_params: 'shed_type=rotary',
        created_at: '2026-05-04T00:00:00Z',
      },
    ])
    render(
      <MemoryRouter>
        <SavedSearchesDropdown />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByTestId('saved-searches-dropdown-trigger'))
    await waitFor(() => screen.queryByText('Dairy'))
    fireEvent.click(screen.getByText('Dairy'))
    expect(navigateMock).toHaveBeenCalledWith('/jobs?shed_type=rotary', { replace: false })
    // Dropdown should close after select
    await waitFor(() => expect(screen.queryByText('Dairy')).toBeNull())
  })

  it('"View all" link routes to /dashboard/seeker/saved-searches', async () => {
    useAuthMock.mockReturnValue({
      session: { user: { id: 'user-123' } },
      role: 'seeker',
      loading: false,
    })
    mockListReturning([])
    render(
      <MemoryRouter>
        <SavedSearchesDropdown />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByTestId('saved-searches-dropdown-trigger'))
    await waitFor(() => screen.queryByText('View all'))
    const viewAll = screen.getByText('View all').closest('a')
    expect(viewAll?.getAttribute('href')).toBe('/dashboard/seeker/saved-searches')
  })

  it('Esc key closes dropdown', async () => {
    useAuthMock.mockReturnValue({
      session: { user: { id: 'user-123' } },
      role: 'seeker',
      loading: false,
    })
    mockListReturning([])
    render(
      <MemoryRouter>
        <SavedSearchesDropdown />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByTestId('saved-searches-dropdown-trigger'))
    await waitFor(() => screen.queryByText(/no saved searches/i))
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByText(/no saved searches/i)).toBeNull())
  })

  it('aria-haspopup="menu" and aria-expanded reflect open state', async () => {
    useAuthMock.mockReturnValue({
      session: { user: { id: 'user-123' } },
      role: 'seeker',
      loading: false,
    })
    mockListReturning([])
    render(
      <MemoryRouter>
        <SavedSearchesDropdown />
      </MemoryRouter>,
    )
    const trigger = screen.getByTestId('saved-searches-dropdown-trigger')
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
  })
})
