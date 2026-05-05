/**
 * Phase 17 Wave 2 — SRCH-13 save-search modal (RHF + Zod).
 *
 * Mirrors MarkFilledModal `if (!isOpen) return null` pattern (17-RESEARCH.md §3
 * + Pitfall 3 — RHF defaultValues vs reset on re-open).
 *
 * Critical pattern: inline role="alert" div for validation errors (NOT
 * StatusBanner) — StatusBanner has a fixed semantic-variant union with no
 * 'error' member; same approach as Phase 20-05 ProfileDrawer + Phase 20.1
 * AdminLoginPage per RESEARCH Pitfall 3 Option A.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Hoisted mocks (vi.hoisted pattern — Phase 20-06 precedent — required because
// the SUT statically imports `@/lib/supabase` transitively before mock setup).
const { fromMock, insertMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  insertMock: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { from: fromMock },
}))

// Static import is safe AFTER vi.mock() — vi.hoisted guarantees fromMock exists
// when the SUT is loaded.
import { SaveSearchModal } from '@/components/saved-search/SaveSearchModal'

beforeEach(() => {
  fromMock.mockReset()
  insertMock.mockReset()
  // Default: insert returns { id: 'new-id' } success
  fromMock.mockReturnValue({
    insert: insertMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
      }),
    }),
  })
})

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSaved: vi.fn(),
  searchParams: new URLSearchParams('shed_type=rotary'),
  userId: 'user-123',
}

describe('Save search modal (SRCH-13)', () => {
  it('renders Input + Button primitives, NOT StatusBanner', () => {
    render(<SaveSearchModal {...baseProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    // Heading present
    expect(screen.getByText(/save search/i)).toBeInTheDocument()
    // StatusBanner regression guard — no element with the StatusBanner data-attr
    expect(document.querySelector('[data-statusbanner]')).toBeNull()
  })

  it('pre-fills name field with deriveAutoName output', () => {
    render(<SaveSearchModal {...baseProps} />)
    expect((screen.getByLabelText(/name/i) as HTMLInputElement).value).toBe('Rotary')
  })

  it('shows inline role="alert" div on persistence error (NOT StatusBanner)', async () => {
    fromMock.mockReturnValueOnce({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: null, error: { message: 'rls-block' } }),
        }),
      }),
    })
    render(<SaveSearchModal {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByRole('alert').textContent).toMatch(/could not save/i)
    })
  })

  it('rejects names exceeding 100 chars via Zod max constraint', async () => {
    render(<SaveSearchModal {...baseProps} />)
    const input = screen.getByLabelText(/name/i) as HTMLInputElement
    // jsdom does not enforce maxLength on programmatic value sets — we rely on
    // Zod max(100) for actual validation. fireEvent.change bypasses the HTML
    // attr; submit triggers Zod validation.
    fireEvent.change(input, { target: { value: 'a'.repeat(101) } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => {
      expect(screen.queryByText(/name too long/i)).toBeInTheDocument()
    })
  })

  it('disables Submit button when name field empty', async () => {
    render(<SaveSearchModal {...baseProps} searchParams={new URLSearchParams()} />)
    const input = screen.getByLabelText(/name/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: '' } })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled()
    })
  })

  it('Esc key closes the modal', () => {
    const onClose = vi.fn()
    render(<SaveSearchModal {...baseProps} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('clicking backdrop closes the modal', () => {
    const onClose = vi.fn()
    render(<SaveSearchModal {...baseProps} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('save-search-backdrop'))
    expect(onClose).toHaveBeenCalled()
  })

  it('submits supabase.from("saved_searches").insert on Save', async () => {
    render(<SaveSearchModal {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => {
      expect(fromMock).toHaveBeenCalledWith('saved_searches')
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          name: 'Rotary',
          search_params: 'shed_type=rotary',
        }),
      )
    })
  })

  it('unmounts fully on close (mirrors MarkFilledModal `if (!isOpen) return null` pattern)', () => {
    render(<SaveSearchModal {...baseProps} isOpen={false} />)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByText(/save search/i)).toBeNull()
  })
})
