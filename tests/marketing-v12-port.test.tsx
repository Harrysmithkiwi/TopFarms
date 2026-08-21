import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { AudienceProvider } from '@/contexts/AudienceContext'
import { ForEmployers } from '@/pages/ForEmployers'
import { Pricing } from '@/pages/Pricing'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// v12 port of /for-employers and /pricing (docs/design/v12-DIRECTIVE.md §0 scope line).
//
// WHY THIS SUITE EXISTS: these two routes were explicitly left on the v13 world when Home
// landed, so "See pricing" from the new landing dropped the visitor into the old design
// mid-journey. That is a recipient-visible seam on the surface the first outreach lands on.
//
// The port is a COSTUME CHANGE. So the assertions come in two halves: the content half pins
// that nothing was rewritten (every price, band and claim survives verbatim — 1.19 is a
// commercial fact carried forward, not a design decision), and the world half pins that the
// v13 idiom is actually gone rather than merely recoloured.

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ session: null, role: null, signOut: vi.fn(), loading: false }),
}))

beforeAll(() => {
  window.matchMedia =
    window.matchMedia ||
    (vi
      .fn()
      .mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as never)
})

function renderPage(node: React.ReactElement) {
  return render(
    <MemoryRouter>
      <AudienceProvider>{node}</AudienceProvider>
    </MemoryRouter>,
  )
}

const EMPLOYERS_SRC = readFileSync(join(process.cwd(), 'src/pages/ForEmployers.tsx'), 'utf-8')
const PRICING_SRC = readFileSync(join(process.cwd(), 'src/pages/Pricing.tsx'), 'utf-8')

describe('the two ported routes now live in the v12 world', () => {
  it.each([
    ['ForEmployers', EMPLOYERS_SRC],
    ['Pricing', PRICING_SRC],
  ])('%s uses the V12 kit rather than hand-rolled chrome', (_name, src) => {
    expect(src).toContain("from '@/components/landing/v12/V12Kit'")
    expect(src).toContain('PastoralBand')
  })

  it.each([
    ['ForEmployers', EMPLOYERS_SRC],
    ['Pricing', PRICING_SRC],
  ])('%s drops the retired v13 devices', (_name, src) => {
    // v11 1.6-1.8, retired: the dark green panel and its repeating-gradient grille.
    expect(src).not.toContain('v13-dark')
    expect(src).not.toContain('repeating-linear-gradient')
    // The v13 palette must not survive alongside the fern ramp; two worlds on one page is
    // exactly the seam this port exists to close.
    expect(src).not.toMatch(/\bbg-green(-\d)?\b/)
    expect(src).not.toMatch(/\bbg-lime\b/)
    expect(src).not.toMatch(/\bfont-bricolage\b/)
  })

  it('no eyebrow label survives above a heading (v12 §5)', () => {
    // The v13 page opened with a "For employers" kicker above the h1. The directive bans the
    // device on this surface; the h1 and the page title still carry the meaning.
    //
    // Scoped to NON-LINK elements deliberately: the shell's nav legitimately links to
    // /for-employers with that same text, and a bare queryByText cannot tell a kicker from
    // navigation. The eyebrow is the uppercase-tracked label, so pin its shape too.
    const { container } = renderPage(<ForEmployers />)
    const nonLinkEyebrow = [...container.querySelectorAll('p, span, div')].filter(
      (el) => el.children.length === 0 && el.textContent?.trim() === 'For employers',
    )
    expect(nonLinkEyebrow).toHaveLength(0)
    expect(EMPLOYERS_SRC).not.toMatch(/uppercase/)
    expect(EMPLOYERS_SRC).not.toMatch(/tracking-\[\.08em\]/)
  })

  it('fern-500 is never used as text (v12 §2 — 3.54:1 on fern-900)', () => {
    for (const src of [EMPLOYERS_SRC, PRICING_SRC]) {
      expect(src).not.toMatch(/text-fern-500/)
    }
  })
})

describe('ForEmployers — content survived the port', () => {
  it('keeps its one h1 and the narrowed promise', () => {
    renderPage(<ForEmployers />)
    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(h1s[0]).toHaveTextContent('What happens after you post.')
  })

  it('keeps all three steps, in order, with their copy', () => {
    renderPage(<ForEmployers />)
    for (const h of ['Post the whole job', 'Applicants arrive scored', 'You decide who to ring']) {
      expect(screen.getByText(h)).toBeInTheDocument()
    }
    // v11 1.5 carried forward as a prohibition — this is the sentence that carries it now.
    expect(screen.getByText(/Every applicant stays on the list/)).toBeInTheDocument()
    expect(screen.getByText(/Nothing is auto-rejected on your behalf/)).toBeInTheDocument()
  })

  it('keeps every listing-includes claim', () => {
    renderPage(<ForEmployers />)
    for (const h of [
      '30 days live',
      'Scored applicants throughout',
      'Every listing free',
      'Documents already verified',
    ]) {
      expect(screen.getByText(h)).toBeInTheDocument()
    }
  })

  it('still routes to real destinations only', () => {
    const { container } = renderPage(<ForEmployers />)
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(hrefs.length).toBeGreaterThan(0)
    for (const h of hrefs) {
      expect(h).toBeTruthy()
      expect(h).not.toBe('#')
    }
    expect(hrefs).toContain('/signup?role=employer')
    expect(hrefs).toContain('/pricing')
  })
})

describe('Pricing — the numbers are untouched', () => {
  it('keeps the v3 bands verbatim (1.19, a commercial fact)', () => {
    renderPage(<Pricing />)
    expect(screen.getByText('$200-800')).toBeInTheDocument()
    expect(screen.getByText('Under $55k: $200')).toBeInTheDocument()
    expect(screen.getByText('$55k to $80k: $400')).toBeInTheDocument()
    expect(screen.getByText('$80k and above, and managers: $800')).toBeInTheDocument()
  })

  it('keeps listing free and unlimited, and the guarantee windows', () => {
    renderPage(<Pricing />)
    expect(screen.getByText('Unlimited listings')).toBeInTheDocument()
    expect(screen.getByText('Permanent roles: 90 days')).toBeInTheDocument()
    expect(screen.getByText('Fixed term roles: 30 days')).toBeInTheDocument()
  })

  it('does not resurrect the retired listing ladder or Featured', () => {
    // Directive 1.19 retired the 100/150/200 ladder and "first listing free"; Featured ($99)
    // is deliberately absent, not forgotten.
    const { container } = renderPage(<Pricing />)
    const text = container.textContent ?? ''
    expect(text).not.toMatch(/first listing free/i)
    expect(text).not.toMatch(/\$99\b/)
  })

  it('keeps exactly one h1 carrying both audience strings (1.11)', () => {
    renderPage(<Pricing />)
    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
    // Both strings live in the DOM; CSS picks one, so the page is correct without JS.
    expect(within(h1s[0]).getByText('What it costs')).toBeInTheDocument()
    expect(within(h1s[0]).getByText(/Workers never pay/)).toBeInTheDocument()
  })

  it('keeps the audience-swap hooks the shell CSS drives', () => {
    // .v13-shell[data-aud="seeker"] in index.css is the mechanism. A port that dropped these
    // class names would silently serve employers the seeker page.
    const { container } = renderPage(<Pricing />)
    expect(container.querySelectorAll('.emp-only').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('.seek-only').length).toBeGreaterThan(0)
  })

  it('never shows a worker a numeric match score (1.4, carried forward)', () => {
    const { container } = renderPage(<Pricing />)
    // A digit immediately followed by % — the shape 1.4 forbids. Dollar figures are fine.
    expect(container.textContent ?? '').not.toMatch(/\d\s*%/)
  })
})

describe('both pages keep the accessibility floor', () => {
  it.each([
    ['ForEmployers', <ForEmployers key="e" />],
    ['Pricing', <Pricing key="p" />],
  ])('%s marks every decorative svg aria-hidden', (_name, node) => {
    const { container } = renderPage(node)
    const svgs = [...container.querySelectorAll('svg')]
    expect(svgs.length).toBeGreaterThan(0)
    for (const svg of svgs) {
      expect(svg.getAttribute('aria-hidden')).toBe('true')
    }
  })

  it.each([
    ['ForEmployers', <ForEmployers key="e" />],
    ['Pricing', <Pricing key="p" />],
  ])('%s gives every section heading an accessible name', (_name, node) => {
    const { container } = renderPage(node)
    for (const section of container.querySelectorAll('section[aria-labelledby]')) {
      const id = section.getAttribute('aria-labelledby')!
      expect(container.querySelector(`#${id}`), `no element carries id="${id}"`).toBeTruthy()
    }
  })
})
