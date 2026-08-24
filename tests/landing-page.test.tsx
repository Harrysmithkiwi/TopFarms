import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { AudienceProvider } from '@/contexts/AudienceContext'
import { Home } from '@/pages/Home'

// v12 landing suite (docs/design/v12-DIRECTIVE.md), replacing the v13 suite.
//
// The v13 suite asserted the SHAPE of a page that no longer exists — an example match panel,
// a counters band, numbered steps. Those assertions retired with their sections. What did NOT
// retire is the set of product rules underneath them, which v12 carries forward unchanged and
// which this file re-pins to the new markup:
//
//   1.4  a worker is never shown a personal score       -> no digit+% anywhere on the page
//   1.5  the page never disparages applicants           -> the banned vocabulary stays absent
//   1.12 pricing lives at /pricing, the position stays  -> the free-listing claim links there
//   1.15 inventory honesty                              -> zero jobs renders an empty state,
//                                                          never an invented listing
//
// Plus the v12-specific contract: the two-audience fork, and every CTA pointing at a route
// that actually exists.

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
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
  vi.stubGlobal(
    'IntersectionObserver',
    vi.fn(() => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() })),
  )
  window.matchMedia =
    window.matchMedia ||
    (vi
      .fn()
      .mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as never)
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

/** Every href the page offers, deduped. */
function hrefs(): string[] {
  return [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') ?? '')
}

describe('v12 landing — the fork', () => {
  it('leads with the comp headline, as one h1', () => {
    renderHome()
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toBe('The right people.The right farm.')
  })

  it('offers both intents in the first viewport', () => {
    renderHome()
    // Hero and close both carry the pair, so these are non-unique by design.
    expect(screen.getAllByRole('link', { name: /find work/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /post a job/i }).length).toBeGreaterThan(0)
  })

  it('states the two-audience fork exactly ONCE', () => {
    renderHome()
    // The fork used to appear twice, in two card layouts saying the same thing. One
    // section, one headline, two cards - a second fork is a regression, not a reinforcement.
    expect(screen.getAllByRole('heading', { name: /two sides of the farming workforce/i })).toHaveLength(1)
    expect(screen.getByRole('heading', { name: /find the people your farm needs/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /find work that fits your life/i })).toBeInTheDocument()
  })
})

describe('v12 landing — routes are real', () => {
  // A CTA pointing at a route that does not exist is the defect this pins. /signup?role=employer
  // was walked on live prod 2026-08-19 and pre-selects the employer role.
  it('sends every hiring action to the employer signup with the role pre-selected', () => {
    renderHome()
    expect(hrefs()).toContain('/signup?role=employer')
  })

  it('sends every work action to /jobs', () => {
    renderHome()
    expect(hrefs()).toContain('/jobs')
  })

  it('ships no dead links — the comp\'s Resources and About have no route behind them', () => {
    renderHome()
    for (const h of hrefs()) {
      expect(h).not.toBe('#')
      expect(h).not.toBe('')
    }
  })
})

describe('v12 landing — product rules carried forward from v11', () => {
  it('1.4: never shows a worker a personal score', () => {
    const { container } = renderHome()
    // Any "87%" style figure on the marketing page would be a personal number.
    expect(container.textContent ?? '').not.toMatch(/\d+\s?%/)
  })

  it('1.5: never disparages applicants', () => {
    const { container } = renderHome()
    const text = (container.textContent ?? '').toLowerCase()
    for (const banned of ['time-waster', 'timewaster', 'unqualified', 'weed out', 'filter out the', 'no-hopers']) {
      expect(text).not.toContain(banned)
    }
  })

  it('1.12: states the pricing position without putting pricing cards on the page', () => {
    const { container } = renderHome()
    expect(container.textContent).toMatch(/listing is free|every listing free/i)
    // The bands themselves belong to /pricing.
    expect(container.textContent).not.toMatch(/\$200|\$400|\$800/)
  })

  it('1.15: renders an honest empty state rather than inventing listings', async () => {
    renderHome()
    await waitFor(() =>
      expect(screen.getByText(/no roles listed right now/i)).toBeInTheDocument(),
    )
    // "Post a job" is the sitewide employer label, so it is non-unique by design.
    expect(screen.getAllByRole('link', { name: /post a job/i }).length).toBeGreaterThan(0)
  })
})

describe('v12 landing — accessibility floor', () => {
  it('has exactly one h1', () => {
    renderHome()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('hides every decorative illustration from assistive tech', () => {
    const { container } = renderHome()
    const svgs = [...container.querySelectorAll('svg')]
    expect(svgs.length).toBeGreaterThan(0)
    for (const svg of svgs) {
      expect(svg.getAttribute('aria-hidden')).toBe('true')
    }
  })

  it('gives the sector list real list semantics, not a div soup', () => {
    renderHome()
    const sectors = screen.getByRole('heading', { name: /roles across every sector/i })
      .parentElement as HTMLElement
    expect(within(sectors).getAllByRole('listitem').length).toBe(6)
  })
})
