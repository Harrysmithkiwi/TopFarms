import { describe, it, vi, beforeAll } from 'vitest'

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: { jobs: 0, seekers: 0, matches: 0 }, error: null }),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}))

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    session: null,
    role: null,
    signOut: vi.fn(),
  }),
}))

// Mock IntersectionObserver (not available in jsdom)
beforeAll(() => {
  const mockIntersectionObserver = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
  vi.stubGlobal('IntersectionObserver', mockIntersectionObserver)
})

describe('Landing Page', () => {
  describe('LAND-01: Hero section', () => {
    it.todo('renders hero with seeker CTA linking to /signup?role=seeker')
    it.todo('renders hero with employer CTA linking to /signup?role=employer')
    it.todo('renders headline containing "Best Farms"')
  })

  describe('LAND-02: Counter section', () => {
    it.todo('renders "Jobs Posted" label')
    it.todo('renders "Workers Registered" label')
    it.todo('renders "Matches Made" label')
    it.todo('calls get_platform_stats RPC on mount')
    it.todo('shows zero counts when RPC returns error')
  })

  describe('LAND-03: How-it-works section', () => {
    it.todo('renders with seeker tab active by default')
    it.todo('aria-selected is true on active tab')
    it.todo('switches to employer steps when employer tab clicked')
    it.todo('aria-selected switches to employer tab on click')
  })

  describe('LAND-04: Featured listings section', () => {
    it.todo('shows empty-state CTA when no featured jobs exist')
    it.todo('renders job cards when featured jobs are returned')
    it.todo('falls back to most-recent active jobs when no featured/premium jobs exist')
  })

  describe('LAND-05: Testimonials section', () => {
    it.todo('renders 3 testimonial cards')
    it.todo('renders Sarah M. testimonial')
    it.todo('renders James T. testimonial')
    it.todo('renders Rachel & Tom K. testimonial')
  })

  describe('LAND-06: Footer', () => {
    it.todo('renders link to /jobs')
    it.todo('renders link to /signup')
    it.todo('renders link to /login')
    it.todo('renders link to /privacy')
    it.todo('renders link to /terms')
  })
})
