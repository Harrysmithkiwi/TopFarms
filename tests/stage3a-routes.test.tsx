import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, RouterProvider, createMemoryRouter } from 'react-router'
import { AudienceProvider } from '@/contexts/AudienceContext'
import { Pricing } from '@/pages/Pricing'
import { ForEmployers } from '@/pages/ForEmployers'
import { NotFound } from '@/pages/NotFound'
import { LegalLayout } from '@/pages/legal/LegalLayout'

// v13 stage 3a. Pins the decisions in directive 1.17 so a later pass cannot
// quietly undo them.

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ session: null, role: null, signOut: vi.fn(), loading: false }),
}))
vi.mock('@/lib/usePageMeta', () => ({ usePageMeta: vi.fn() }))

beforeAll(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    vi.fn(() => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() })),
  )
})
beforeEach(() => sessionStorage.clear())

function renderIn(ui: React.ReactNode) {
  return render(
    <MemoryRouter>
      <AudienceProvider>{ui}</AudienceProvider>
    </MemoryRouter>,
  )
}

// NotFound calls useRouteError, which requires a DATA router. Rendering it under
// plain MemoryRouter throws; that is a harness constraint, not a page defect.
function renderRouted(ui: React.ReactNode) {
  const router = createMemoryRouter([{ path: '/', element: <AudienceProvider>{ui}</AudienceProvider> }])
  return render(<RouterProvider router={router} />)
}

describe('stage 3a: shell adoption', () => {
  it.each([
    ['Pricing', <Pricing key="p" />],
    ['ForEmployers', <ForEmployers key="f" />],
  ])('%s renders inside PublicShell (nav + footer)', (_name, ui) => {
    renderIn(ui)
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    // v14 shell: the audience toggle is retired; the footer brand line anchors the shell.
    expect(screen.getByText(/© 2026 TopFarms/)).toBeInTheDocument()
  })

  it('LegalLayout wraps content in the shell without touching the text', () => {
    renderIn(
      <LegalLayout title="Privacy Policy" updated="1 July 2026">
        <p>Some legal wording that must not change.</p>
      </LegalLayout>,
    )
    expect(screen.getByRole('heading', { name: 'Privacy Policy', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Some legal wording that must not change.')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
  })
})

describe('stage 3a: /pricing is one route, two audience views (1.17c)', () => {
  it('both views are in the DOM', () => {
    renderIn(<Pricing />)
    expect(document.querySelector('.emp-only')).not.toBeNull()
    expect(document.querySelector('.seek-only')).not.toBeNull()
  })

  it('employer view carries the fee table', () => {
    renderIn(<Pricing />)
    // Was the three-tier listing ladder ($100 / $150 / $200) plus placement.
    // Directive 1.19 retired the ladder: listings are free and unlimited, so the
    // table is now the three facts that are actually true.
    expect(screen.getByText('Free')).toBeInTheDocument()
    expect(screen.getByText('$200-800')).toBeInTheDocument()
    expect(screen.getByText('Included')).toBeInTheDocument()
    // The retired listing prices must not reappear anywhere on the page.
    expect(screen.queryByText('$100')).not.toBeInTheDocument()
    expect(screen.queryByText('$150')).not.toBeInTheDocument()
  })

  it('seeker view states free plainly, not an empty page', () => {
    renderIn(<Pricing />)
    expect(screen.getByText(/Free, always\./)).toBeInTheDocument()
    expect(screen.getByText('What free actually covers')).toBeInTheDocument()
  })

  it('employer is the default lens so the page is correct without JS', () => {
    renderIn(<Pricing />)
    expect(document.querySelector('.v13-shell')).toHaveAttribute('data-aud', 'employer')
  })
})

describe('stage 3a: /for-employers survives with a narrower job (1.17d)', () => {
  it('carries the posting sequence, not a second landing pitch', () => {
    renderIn(<ForEmployers />)
    expect(screen.getByText('What happens after you post.')).toBeInTheDocument()
    expect(screen.getByText('How posting works')).toBeInTheDocument()
  })

  it('drops the retired duplicate copy', () => {
    renderIn(<ForEmployers />)
    expect(screen.queryByText(/Find skilled farm workers, faster/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Ready to hire\?/)).not.toBeInTheDocument()
    expect(screen.queryByText(/AI-matched/i)).not.toBeInTheDocument()
  })
})

describe('stage 3a: NotFound keeps the 404-vs-error split (1.17f)', () => {
  it('renders inside PublicShell and keeps the 404 copy', () => {
    renderRouted(<NotFound />)
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    expect(screen.getByText(/© 2026 TopFarms/)).toBeInTheDocument()
    expect(screen.getByText("This paddock's empty")).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })
})

describe('stage 3a: footer', () => {
  it('links the board and both role signups, but never a bare /signup or /login', () => {
    renderRouted(<NotFound />)
    const footer = screen.getByText(/© 2026 TopFarms/).closest('footer')!
    expect(footer.querySelector('a[href="/jobs"]')).not.toBeNull()
    // v14 footer: the seeker signup lives here (the nav's only signup action is employer).
    expect(footer.querySelector('a[href="/signup?role=seeker"]')).not.toBeNull()
    expect(footer.querySelector('a[href="/signup?role=employer"]')).not.toBeNull()
    expect(footer.querySelector('a[href="/login"]')).toBeNull()
    expect(footer.querySelector('a[href="/signup"]')).toBeNull()
  })
})
