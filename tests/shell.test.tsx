import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AudienceProvider, useAudience } from '@/contexts/AudienceContext'
import { ShellNav } from '@/components/shell/ShellNav'
import { ShellFooter } from '@/components/shell/ShellFooter'
import { PublicShell } from '@/components/shell/PublicShell'

// v14 shell (docs/design/MARKETING-DESIGN.md): ONE nav bar, no audience toggle. The
// UtilityBar is retired; both audiences are visible at once ("Find work" link, "Post a
// job" action). The shell must still be tested in its authed states, not only the
// logged-out one (v13 preserve-list, carried forward).

// Mutable auth state so each test picks its auth scenario.
const authState: {
  session: { user: { email: string } } | null
  role: 'employer' | 'seeker' | 'admin' | null
  signOut: ReturnType<typeof vi.fn>
  loading: boolean
} = { session: null, role: null, signOut: vi.fn(), loading: false }

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => authState }))

function renderShell(ui: React.ReactNode) {
  return render(
    <MemoryRouter>
      <AudienceProvider>{ui}</AudienceProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  authState.session = null
  authState.role = null
  authState.signOut = vi.fn()
  sessionStorage.clear()
})

describe('AudienceContext (directive 1.14, kept for per-audience copy)', () => {
  function Probe() {
    const { audience, lockedByRole } = useAudience()
    return (
      <span data-testid="probe">
        {audience}:{String(lockedByRole)}
      </span>
    )
  }

  it('defaults to employer with nothing stored', () => {
    renderShell(<Probe />)
    expect(screen.getByTestId('probe').textContent).toBe('employer:false')
  })

  it('session role BEATS a stale stored toggle', () => {
    sessionStorage.setItem('tf-aud', 'seeker')
    authState.session = { user: { email: 'farm@example.com' } }
    authState.role = 'employer'
    renderShell(<Probe />)
    expect(screen.getByTestId('probe').textContent).toBe('employer:true')
  })
})

describe('ShellNav states', () => {
  it('logged out: both audience doors, one label per intent', () => {
    renderShell(<ShellNav />)
    expect(screen.getByText('Find work')).toHaveAttribute('href', '/jobs')
    expect(screen.getByText('For employers')).toHaveAttribute('href', '/for-employers')
    expect(screen.getByText('Pricing')).toHaveAttribute('href', '/pricing')
    expect(screen.getByText('Sign in')).toHaveAttribute('href', '/login')
    expect(screen.getByText('Post a job')).toHaveAttribute('href', '/signup?role=employer')
    // Regression guard (2026-08-29): seeker signup used to live ONLY in the
    // footer, so the nav offered account creation to employers alone. A
    // seeker-first launch cannot ship that.
    expect(screen.getByText('Create a profile')).toHaveAttribute('href', '/signup?role=seeker')
  })

  it('logged out: no audience toggle, no duplicate CTA labels', () => {
    renderShell(<ShellNav />)
    expect(screen.queryByRole('group', { name: 'Browsing as' })).not.toBeInTheDocument()
    expect(screen.queryByText('Join TopFarms')).not.toBeInTheDocument()
    expect(screen.queryByText('Hire staff')).not.toBeInTheDocument()
    expect(screen.queryByText('Browse jobs')).not.toBeInTheDocument()
  })

  it('authed seeker: preserved role links + avatar, no public set', () => {
    authState.session = { user: { email: 'shepherd@example.com' } }
    authState.role = 'seeker'
    renderShell(<ShellNav />)
    // Labels come from the shared SEEKER_NAV source (src/lib/seekerNav.ts).
    expect(screen.getByText('Applications')).toBeInTheDocument()
    expect(screen.getByText('Find work')).toBeInTheDocument()
    expect(screen.getByText('Saved')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'User menu' })).toHaveTextContent('S')
    expect(screen.queryByText('Post a job')).not.toBeInTheDocument()
    expect(screen.queryByText('Sign in')).not.toBeInTheDocument()
  })

  it('authed employer: Dashboard link set', () => {
    authState.session = { user: { email: 'farm@example.com' } }
    authState.role = 'employer'
    renderShell(<ShellNav />)
    expect(screen.getByText('Dashboard')).toHaveAttribute('href', '/dashboard/employer')
  })

  it('avatar menu opens and Sign Out calls signOut', async () => {
    authState.session = { user: { email: 'farm@example.com' } }
    authState.role = 'employer'
    renderShell(<ShellNav />)
    await userEvent.click(screen.getByRole('button', { name: 'User menu' }))
    await userEvent.click(screen.getByText('Sign Out'))
    expect(authState.signOut).toHaveBeenCalledOnce()
  })
})

describe('ShellFooter', () => {
  it('every footer target is a registered route or mailto', () => {
    renderShell(<ShellFooter />)
    expect(screen.getByText('Find work')).toHaveAttribute('href', '/jobs')
    expect(screen.getByText('Create a profile')).toHaveAttribute('href', '/signup?role=seeker')
    expect(screen.getByText('Post a job')).toHaveAttribute('href', '/signup?role=employer')
    expect(screen.getByText('How it works')).toHaveAttribute('href', '/for-employers')
    expect(screen.getByText('Pricing')).toHaveAttribute('href', '/pricing')
    expect(screen.getByText('Privacy policy')).toHaveAttribute('href', '/privacy')
    expect(screen.getByText('Terms of service')).toHaveAttribute('href', '/terms')
    expect(screen.getByText('hello@topfarms.co.nz')).toHaveAttribute(
      'href',
      'mailto:hello@topfarms.co.nz',
    )
  })

  it('never links a bare /signup or /login', () => {
    const { container } = renderShell(<ShellFooter />)
    expect(container.querySelector('a[href="/signup"]')).toBeNull()
    expect(container.querySelector('a[href="/login"]')).toBeNull()
  })
})

describe('PublicShell composition', () => {
  it('renders nav + main content + footer in one wrapper', () => {
    renderShell(
      <PublicShell>
        <h1>Page content</h1>
      </PublicShell>,
    )
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveTextContent('Page content')
    expect(screen.getByText(/© 2026 TopFarms/)).toBeInTheDocument()
    // The v13 audience toggle must not resurface.
    expect(screen.queryByRole('group', { name: 'Browsing as' })).not.toBeInTheDocument()
  })
})
