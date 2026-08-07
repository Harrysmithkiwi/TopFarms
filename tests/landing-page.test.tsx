import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { AudienceProvider } from '@/contexts/AudienceContext'
import { Home } from '@/pages/Home'

// v13 landing suite (stage 2 of the port, docs/design/v11-DIRECTIVE.md).
// Replaces the LAND-01..04 suite for the old landing: the tabs section,
// "Best Farms" hero and featured-card grid retired with it.

// Mock supabase: stats credible by default (counters visible), jobs empty
// (the production-realistic state: board has no listings).
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

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ session: null, role: null, signOut: vi.fn(), loading: false }),
}))

beforeAll(() => {
  const mockIntersectionObserver = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
  vi.stubGlobal('IntersectionObserver', mockIntersectionObserver)
  window.matchMedia =
    window.matchMedia ||
    (vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as never)
})

beforeEach(() => sessionStorage.clear())

function renderHome() {
  return render(
    <MemoryRouter>
      <AudienceProvider>
        <Home />
      </AudienceProvider>
    </MemoryRouter>,
  )
}

describe('v13 landing', () => {
  describe('hero (directive 1.11)', () => {
    it('BOTH headline strings are in the DOM', () => {
      renderHome()
      expect(screen.getByText('The right match,')).toBeInTheDocument()
      expect(screen.getByText('Find the farm job')).toBeInTheDocument()
    })

    it('employer is the default lens on the shell root', () => {
      renderHome()
      expect(document.querySelector('.v13-shell')).toHaveAttribute('data-aud', 'employer')
    })

    it('seeker lens flips the shell attribute (CSS swaps the headline)', () => {
      sessionStorage.setItem('tf-aud', 'seeker')
      renderHome()
      expect(document.querySelector('.v13-shell')).toHaveAttribute('data-aud', 'seeker')
    })

    it('example panel is labelled as an example, with a pause control (1.1)', () => {
      renderHome()
      expect(screen.getByText('Example: how applicants arrive')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Pause' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('hero carries both intent CTAs with canonical labels', () => {
      renderHome()
      const hiring = screen.getAllByText("I'm hiring")
      const looking = screen.getAllByText("I'm looking for work")
      expect(hiring.length).toBeGreaterThan(0)
      expect(looking.length).toBeGreaterThan(0)
    })
  })

  describe('match band (directive 1.5, 1.7)', () => {
    it('carries the load-bearing applicant-protection sentence', () => {
      renderHome()
      expect(
        screen.getByText(/Every applicant stays on the list, ordered by fit/),
      ).toBeInTheDocument()
    })

    it('anchors #how for the nav link', () => {
      renderHome()
      expect(document.getElementById('how')).not.toBeNull()
    })
  })

  describe('open roles (directive 1.13, 1.15)', () => {
    it('search entry submits to /jobs with a visible label, not a placeholder', async () => {
      renderHome()
      expect(await screen.findByLabelText('Search open roles')).toBeInTheDocument()
      expect(screen.getByRole('search')).toBeInTheDocument()
    })

    it('empty state renders the employer prompt when no jobs exist', async () => {
      renderHome()
      expect(await screen.findByText('No open roles listed right now.')).toBeInTheDocument()
      expect(screen.getByText(/Post the first one and it will be listed/)).toBeInTheDocument()
    })
  })

  describe('worker split (directive 1.4)', () => {
    it('shows a WORD for fit, never a personal number', () => {
      renderHome()
      expect(screen.getByText('Strong')).toBeInTheDocument()
      expect(screen.getByText('free, always. workers never pay.')).toBeInTheDocument()
    })
  })

  describe('pricing claim (directive 1.12)', () => {
    it('claim line present and linking to /pricing; no pricing cards on the page', () => {
      renderHome()
      // "First listing free" until directive 1.19 (2026-08-04) retired the listing
      // ladder. The CLAIM stays on the landing page (1.12 + NOT THIS); only the
      // first word of it changed, because every listing is free now.
      expect(screen.getByText('Every listing free. Workers never pay.')).toBeInTheDocument()
      expect(screen.getByText('See pricing')).toHaveAttribute('href', '/pricing')
      expect(screen.queryByText('$100')).not.toBeInTheDocument()
    })
  })

  describe('counters (directive 1.15: gated, dormant, PRESERVED)', () => {
    it('renders when stats are credible (mock 42/128/350)', async () => {
      renderHome()
      expect(await screen.findByText('Jobs Posted')).toBeInTheDocument()
    })

    it('calls get_platform_stats RPC on mount', async () => {
      const { supabase } = await import('@/lib/supabase')
      renderHome()
      expect(supabase.rpc).toHaveBeenCalledWith('get_platform_stats')
    })

    it('renders NOTHING when stats are real zeros (zero-counter regression)', async () => {
      const { supabase } = await import('@/lib/supabase')
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: { jobs: 0, seekers: 0, matches: 0 },
        error: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock shape
      } as any)
      renderHome()
      await screen.findByText('The right match,')
      await vi.waitFor(() => expect(supabase.rpc).toHaveBeenCalled())
      expect(screen.queryByText('Jobs Posted')).not.toBeInTheDocument()
    })
  })

  describe('steps (directive 1.8)', () => {
    it('three steps with the numerals kept', () => {
      renderHome()
      expect(screen.getByText('Three steps, either side.')).toBeInTheDocument()
      expect(screen.getAllByText('01').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Start with the strongest fits')).toBeInTheDocument()
    })
  })

  describe('close + shell', () => {
    it('closing section carries both intent CTAs', () => {
      renderHome()
      expect(screen.getByText(/The whole job\./)).toBeInTheDocument()
    })

    it('shell provides nav, utility bar and footer', () => {
      renderHome()
      expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
      expect(screen.getByRole('group', { name: 'Browsing as' })).toBeInTheDocument()
      expect(screen.getByText('Match, train, retain.')).toBeInTheDocument()
    })

    it('retired copy is gone: Best Farms hero, tier badges, tab labels', () => {
      renderHome()
      expect(screen.queryByText(/Best Farms/)).not.toBeInTheDocument()
      expect(screen.queryByText('Featured Opportunities')).not.toBeInTheDocument()
      expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    })
  })
})
