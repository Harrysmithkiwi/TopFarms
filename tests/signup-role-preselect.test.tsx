import { describe, it, vi } from 'vitest'

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}))

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    session: null,
    role: null,
    signUpWithRole: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn(),
  }),
}))

// Usage pattern for URL param testing:
// import { render } from '@testing-library/react'
// import { MemoryRouter } from 'react-router'
// render(
//   <MemoryRouter initialEntries={['/signup?role=seeker']}>
//     <SignUp />
//   </MemoryRouter>
// )

describe('SignUp Role Pre-selection', () => {
  it.todo('pre-selects seeker role when ?role=seeker URL param present')
  it.todo('pre-selects employer role when ?role=employer URL param present')
  it.todo('defaults to null when no role param present')
  it.todo('ignores invalid role values in URL param')
})
