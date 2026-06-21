import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { Home } from '@/pages/Home'

// Supabase mock: FeaturedListings issues a featured query then a fallback query,
// both resolved empty so the honest pre-launch empty-state renders.
// NOTE: get_platform_stats is intentionally NOT exercised here — CountersSection
// (its only caller) is no longer rendered on the page; it was swapped for the
// numbers-free CapabilitiesSection pre-launch. See the credibility/rebrand pass.
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: { jobs: 0, seekers: 0, matches: 0 }, error: null }),
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

// IntersectionObserver is not available in jsdom; whileInView elements still
// render their text into the DOM, which is all these text assertions need.
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
    </MemoryRouter>,
  )
}

describe('Landing Page', () => {
  describe('LAND-01: Hero section', () => {
    it('renders hero with seeker CTA linking to /signup?role=seeker', () => {
      renderHome()
      expect(document.querySelectorAll('a[href="/signup?role=seeker"]').length).toBeGreaterThan(0)
    })

    it('renders hero with employer CTA linking to /signup?role=employer', () => {
      renderHome()
      expect(document.querySelectorAll('a[href="/signup?role=employer"]').length).toBeGreaterThan(0)
    })

    it('renders the refreshed dual-audience headline', () => {
      renderHome()
      expect(screen.getByText(/matched on what matters/i)).toBeInTheDocument()
      expect(screen.getByText(/great people/i)).toBeInTheDocument()
    })

    it('leads the employer column with Match Score language (not "AI-matched")', () => {
      renderHome()
      expect(screen.getByText(/ranked by Match Score/i)).toBeInTheDocument()
      expect(screen.queryByText(/AI-matched/i)).not.toBeInTheDocument()
    })

    it('uses a generic illustrative hero card, not a fabricated farm/candidate', () => {
      renderHome()
      expect(screen.getByText('Sample candidate')).toBeInTheDocument()
      expect(screen.queryByText(/Greenfield Dairy/i)).not.toBeInTheDocument()
      expect(screen.queryByText('Jamie D.')).not.toBeInTheDocument()
    })
  })

  describe('LAND-02: Capabilities band (replaces live CountersSection pre-launch)', () => {
    it('renders the three capability statements', () => {
      renderHome()
      expect(screen.getByText('Fit, not keywords')).toBeInTheDocument()
      expect(screen.getByText('Clear for both sides')).toBeInTheDocument()
      expect(screen.getByText('Grounded in the real work')).toBeInTheDocument()
    })

    it('introduces the proprietary "TopFarms Match Score"', () => {
      renderHome()
      expect(screen.getByText(/The TopFarms Match Score rates how well/i)).toBeInTheDocument()
    })

    it('does NOT render the live counters / zero-number stats pre-launch', () => {
      renderHome()
      expect(screen.queryByText('Jobs Posted')).not.toBeInTheDocument()
      expect(screen.queryByText('Workers Registered')).not.toBeInTheDocument()
      expect(screen.queryByText('Matches Made')).not.toBeInTheDocument()
    })
  })

  describe('LAND-03: How-it-works section', () => {
    it('renders with seeker tab active by default', () => {
      renderHome()
      expect(screen.getByRole('tab', { name: /farm workers/i })).toHaveAttribute(
        'aria-selected',
        'true',
      )
    })

    it('switches to employer steps when employer tab clicked', async () => {
      renderHome()
      const employerTab = screen.getByRole('tab', { name: /farm employers/i })
      await userEvent.click(employerTab)
      expect(screen.getByText('Review Matches')).toBeInTheDocument()
      expect(employerTab).toHaveAttribute('aria-selected', 'true')
    })

    it('describes seeker matching with Match Score language (no "AI")', () => {
      renderHome()
      expect(
        screen.getByText(/Your Match Score ranks you against active listings/i),
      ).toBeInTheDocument()
    })
  })

  describe('LAND-04: Featured listings section', () => {
    it('renders the get-started heading that agrees with the empty state', () => {
      renderHome()
      expect(screen.getByText('Get Started')).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { name: /be first to the next role/i }),
      ).toBeInTheDocument()
    })

    it('shows the honest pre-launch empty-state copy when no jobs exist', async () => {
      renderHome()
      expect(await screen.findByText(/New roles are landing now/i)).toBeInTheDocument()
      // The old fabricated-inventory empty-state copy must be gone.
      expect(screen.queryByText(/Be the first to post a featured job/i)).not.toBeInTheDocument()
    })
  })

  describe('LAND-04b: Match engine section', () => {
    it('renders the match-engine heading and bullets (rebranded, no Claude/AI)', () => {
      renderHome()
      expect(screen.getByText('The Match Engine')).toBeInTheDocument()
      expect(screen.getByText(/Scores skills, experience, and tickets/i)).toBeInTheDocument()
    })

    it('labels the dashboard chip "Match Score", not "AI scored"', () => {
      renderHome()
      expect(screen.getAllByText('Match Score').length).toBeGreaterThan(0)
      expect(screen.queryByText(/AI scored/i)).not.toBeInTheDocument()
    })
  })

  describe('LAND-04c: Farm Types strip', () => {
    it('renders real current sectors and clearly-marked future verticals', () => {
      renderHome()
      expect(screen.getAllByText('Dairy').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Sheep & Beef').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Arable & Cropping').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Horticulture').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Coming soon').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Open to roles').length).toBeGreaterThan(0)
    })

    it('does not render fabricated "N listings" counts', () => {
      renderHome()
      expect(screen.queryByText(/\d+\s+listings/i)).not.toBeInTheDocument()
    })
  })

  describe('LAND-04d: Employer CTA band', () => {
    it('renders CTA and checklist (rebranded bullet, no "AI-matched")', () => {
      renderHome()
      expect(screen.getByText('Post Your First Job')).toBeInTheDocument()
      expect(screen.getByText('Post a job in under 5 minutes')).toBeInTheDocument()
      expect(screen.getByText('Ranked candidates delivered to your dashboard')).toBeInTheDocument()
    })
  })

  describe('LAND-05: "What we match on" dimensions band (replaces fabricated testimonials)', () => {
    it('renders the six on-farm dimensions', () => {
      renderHome()
      expect(screen.getByText(/matters on-farm/i)).toBeInTheDocument()
      expect(screen.getByText('Accommodation')).toBeInTheDocument()
      expect(screen.getByText('Couples & family')).toBeInTheDocument()
      expect(screen.getByText('Shed & system')).toBeInTheDocument()
      expect(screen.getByText('Livestock & sector')).toBeInTheDocument()
      expect(screen.getByText('Region & travel')).toBeInTheDocument()
      expect(screen.getByText('Experience & tickets')).toBeInTheDocument()
    })
  })

  // CREDIBILITY guards — actively prevent fabricated social proof from creeping
  // back in. Same spirit as the FeaturedListings TEST_RECORD guard: assert the
  // removed fabrications are ABSENT, not merely "no longer asserted present".
  describe('CREDIBILITY: no fabricated social proof', () => {
    it('does not render the removed fabricated testimonials', () => {
      renderHome()
      expect(screen.queryByText('Sarah M.')).not.toBeInTheDocument()
      expect(screen.queryByText('James T.')).not.toBeInTheDocument()
      expect(screen.queryByText('Rachel & Tom K.')).not.toBeInTheDocument()
    })

    it('does not render fabricated scale stats', () => {
      renderHome()
      expect(screen.queryByText('500+')).not.toBeInTheDocument()
      expect(screen.queryByText('2,000+')).not.toBeInTheDocument()
      expect(screen.queryByText('95%')).not.toBeInTheDocument()
      expect(screen.queryByText('Satisfaction')).not.toBeInTheDocument()
    })

    it('does not render fabricated partner logos', () => {
      renderHome()
      expect(screen.queryByText('Fonterra Sharemilkers')).not.toBeInTheDocument()
      expect(screen.queryByText('Silver Fern Farms')).not.toBeInTheDocument()
    })
  })

  describe('LAND-09: Values strip', () => {
    it('renders honest value statements incl. the final pricing line', () => {
      renderHome()
      expect(screen.getByText('Built in NZ for NZ farming')).toBeInTheDocument()
      expect(screen.getByText('TopFarms Match Score')).toBeInTheDocument()
      expect(screen.getByText('Always free for workers')).toBeInTheDocument()
      expect(screen.getByText('First job post free')).toBeInTheDocument()
    })
  })

  describe('LAND-09b: Final CTA section', () => {
    it('renders dual CTA buttons', () => {
      renderHome()
      expect(screen.getAllByRole('link', { name: /find farm work/i }).length).toBeGreaterThan(0)
      expect(screen.getAllByRole('link', { name: /post a job/i }).length).toBeGreaterThan(0)
    })
  })

  describe('LAND-06: Footer', () => {
    it('renders link to /jobs', () => {
      renderHome()
      expect(screen.getByRole('link', { name: /browse jobs/i })).toBeInTheDocument()
    })

    it('renders link to /signup', () => {
      renderHome()
      expect(document.querySelectorAll('a[href="/signup"]').length).toBeGreaterThan(0)
    })

    it('renders link to /login', () => {
      renderHome()
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
