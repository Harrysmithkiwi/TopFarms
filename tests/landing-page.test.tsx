import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { Home } from '@/pages/Home'

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: { jobs: 42, seekers: 128, matches: 350 }, error: null }),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    }),
  },
}))

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ session: null, role: null, signOut: vi.fn(), loading: false }),
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

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )
}

describe('Landing Page', () => {
  describe('LAND-01: Hero section', () => {
    it('renders hero with seeker CTA linking to /signup?role=seeker', () => {
      renderHome()
      const seekerLinks = document.querySelectorAll('a[href="/signup?role=seeker"]')
      expect(seekerLinks.length).toBeGreaterThan(0)
    })

    it('renders hero with employer CTA linking to /signup?role=employer', () => {
      renderHome()
      const employerLinks = document.querySelectorAll('a[href="/signup?role=employer"]')
      expect(employerLinks.length).toBeGreaterThan(0)
    })

    it('renders headline containing "Best Farms"', () => {
      renderHome()
      expect(screen.getByText(/Best Farms/i)).toBeInTheDocument()
    })
  })

  describe('LAND-02: Counter section', () => {
    it('renders "Jobs Posted" label', () => {
      renderHome()
      expect(screen.getByText('Jobs Posted')).toBeInTheDocument()
    })

    it('renders "Workers Registered" label', () => {
      renderHome()
      expect(screen.getByText('Workers Registered')).toBeInTheDocument()
    })

    it('renders "Matches Made" label', () => {
      renderHome()
      expect(screen.getByText('Matches Made')).toBeInTheDocument()
    })

    it('calls get_platform_stats RPC on mount', async () => {
      const { supabase } = await import('@/lib/supabase')
      renderHome()
      expect(supabase.rpc).toHaveBeenCalledWith('get_platform_stats')
    })
  })

  describe('LAND-03: How-it-works section', () => {
    it('renders with seeker tab active by default', () => {
      renderHome()
      const seekerTab = screen.getByRole('tab', { name: /farm workers/i })
      expect(seekerTab).toBeInTheDocument()
      expect(seekerTab).toHaveAttribute('aria-selected', 'true')
    })

    it('aria-selected is true on active tab', () => {
      renderHome()
      const seekerTab = screen.getByRole('tab', { name: /farm workers/i })
      expect(seekerTab).toHaveAttribute('aria-selected', 'true')
    })

    it('switches to employer steps when employer tab clicked', async () => {
      renderHome()
      const employerTab = screen.getByRole('tab', { name: /farm employers/i })
      await userEvent.click(employerTab)
      // "Review Matches" is an employer-only step title (not present in seeker steps)
      expect(screen.getByText('Review Matches')).toBeInTheDocument()
    })

    it('aria-selected switches to employer tab on click', async () => {
      renderHome()
      const employerTab = screen.getByRole('tab', { name: /farm employers/i })
      await userEvent.click(employerTab)
      expect(employerTab).toHaveAttribute('aria-selected', 'true')
    })
  })

  describe('LAND-04: Featured listings section', () => {
    it('shows empty-state CTA when no featured jobs exist', async () => {
      renderHome()
      // Mock returns empty data, so empty state should render after loading
      expect(await screen.findByText(/Be the first to post a featured job/i)).toBeInTheDocument()
    })
  })

  describe('LAND-05: Testimonials section', () => {
    it('renders 3 testimonial cards', () => {
      renderHome()
      expect(screen.getByText('Sarah M.')).toBeInTheDocument()
      expect(screen.getByText('James T.')).toBeInTheDocument()
      expect(screen.getByText('Rachel & Tom K.')).toBeInTheDocument()
    })

    it('renders Sarah M. testimonial', () => {
      renderHome()
      expect(screen.getByText('Sarah M.')).toBeInTheDocument()
    })

    it('renders James T. testimonial', () => {
      renderHome()
      expect(screen.getByText('James T.')).toBeInTheDocument()
    })

    it('renders Rachel & Tom K. testimonial', () => {
      renderHome()
      expect(screen.getByText('Rachel & Tom K.')).toBeInTheDocument()
    })
  })

  describe('LAND-06: Footer', () => {
    it('renders link to /jobs', () => {
      renderHome()
      expect(screen.getByRole('link', { name: /browse jobs/i })).toBeInTheDocument()
    })

    it('renders link to /signup', () => {
      renderHome()
      const signupLinks = document.querySelectorAll('a[href="/signup"]')
      expect(signupLinks.length).toBeGreaterThan(0)
    })

    it('renders link to /login', () => {
      renderHome()
      // There are multiple login links in nav and footer; at least one must exist
      expect(screen.getAllByRole('link', { name: /log in/i }).length).toBeGreaterThan(0)
    })

    it('renders link to /privacy', () => {
      renderHome()
      expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument()
    })

    it('renders link to /terms', () => {
      renderHome()
      expect(screen.getByRole('link', { name: /terms of service/i })).toBeInTheDocument()
    })
  })
})
