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
  ])('%s renders inside PublicShell (nav + utility bar + footer)', (_name, ui) => {
    renderIn(ui)
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Browsing as' })).toBeInTheDocument()
    expect(screen.getByText('Match, train, retain.')).toBeInTheDocument()
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

  it('employer view carries the unchanged fee table', () => {
    renderIn(<Pricing />)
    expect(screen.getByText('$100')).toBeInTheDocument()
    expect(screen.getByText('$150')).toBeInTheDocument()
    expect(screen.getByText('$200')).toBeInTheDocument()
    expect(screen.getByText('$200-800')).toBeInTheDocument()
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
    expect(screen.getByText('Match, train, retain.')).toBeInTheDocument()
    expect(screen.getByText("This paddock's empty")).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })
})

describe('stage 3a: footer', () => {
  it('adds Open roles but NOT login/signup (label gate)', () => {
    renderRouted(<NotFound />)
    const footer = screen.getByText('Match, train, retain.').closest('footer')!
    expect(footer.querySelector('a[href="/jobs"]')).not.toBeNull()
    expect(footer.querySelector('a[href="/login"]')).toBeNull()
    expect(footer.querySelector('a[href="/signup"]')).toBeNull()
  })
})
