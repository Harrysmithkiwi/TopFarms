/**
 * SIGNUP-01 — Sonner toast persistence for email_address_invalid
 *
 * RED at scaffold time (Wave 0); flips GREEN when Wave 1 plan 22-01 adds
 * `{ duration: Infinity, closeButton: true }` to the toast.error call at
 * SignUp.tsx:88.
 *
 * Pattern: vi.mock of @/lib/supabase + vi.mock of sonner. Static import
 * of SignUp component requires vi.hoisted for the toast mock (see
 * tests/saved-search-modal.test.tsx for the canonical hoisted pattern).
 *
 * Reference: .planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md
 * §Pattern 1, §Example 4.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

const { toastErrorMock } = vi.hoisted(() => ({ toastErrorMock: vi.fn() }))

vi.mock('sonner', () => ({
  toast: { error: toastErrorMock, success: vi.fn(), warning: vi.fn(), info: vi.fn() },
  Toaster: () => null,
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: 'Unable to validate email address: invalid format',
          name: 'AuthError',
          code: 'email_address_invalid',
          status: 400,
        },
      }),
      signInWithOAuth: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}))

// Static SUT imports come AFTER vi.mock (hoisted) but compile-time-resolved
// since vi.mock is itself hoisted to top of file by vitest's transformer.
import { SignUp } from '@/pages/auth/SignUp'
import { AuthProvider } from '@/contexts/AuthContext'

function renderSignUp() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SignUp />
      </AuthProvider>
    </MemoryRouter>,
  )
}

async function fillAndSubmit() {
  // Role selection gates email/password rendering (see SignUp.tsx:221 — fields
  // appear only after `selectedRole` is set). Click Seeker to reveal the form.
  const seekerRoleButton = await screen.findByRole('button', { name: /seeker/i })
  fireEvent.click(seekerRoleButton)

  const emailInput = await screen.findByLabelText(/email/i)
  const passwordInput = screen.getByLabelText(/^password$/i)
  fireEvent.change(emailInput, { target: { value: 'not_an_email@example.test' } })
  fireEvent.change(passwordInput, { target: { value: 'ValidPass123!' } })

  // Terms checkbox is required by the Zod schema (SignUp.tsx:15).
  const termsCheckbox = screen.getByRole('checkbox')
  fireEvent.click(termsCheckbox)

  const submitButton = screen.getByRole('button', { name: /create account/i })
  fireEvent.click(submitButton)
}

describe('SIGNUP-01 — toast persistence for email_address_invalid', () => {
  beforeEach(() => {
    toastErrorMock.mockClear()
  })

  it('calls toast.error with { duration: Infinity, closeButton: true } when supabase returns email_address_invalid', async () => {
    renderSignUp()
    await fillAndSubmit()

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalled()
    })

    // PRIMARY ASSERTION (will be RED until Wave 1 plan 22-01 ships):
    expect(toastErrorMock).toHaveBeenCalledWith(
      'Unable to validate email address: invalid format',
      expect.objectContaining({
        duration: Infinity,
        closeButton: true,
      }),
    )
  })

  it('calls toast.error exactly once per submit (no double-fire)', async () => {
    renderSignUp()
    await fillAndSubmit()

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalled()
    })

    expect(toastErrorMock).toHaveBeenCalledTimes(1)
  })

  it.todo('toast remains visible >10s when duration: Infinity (Sonner integration)')
})
