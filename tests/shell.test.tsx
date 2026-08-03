import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AudienceProvider, useAudience } from '@/contexts/AudienceContext'
import { UtilityBar } from '@/components/shell/UtilityBar'
import { ShellNav } from '@/components/shell/ShellNav'
import { ShellFooter } from '@/components/shell/ShellFooter'
import { PublicShell } from '@/components/shell/PublicShell'

// Mutable auth state so each test picks its auth scenario (v13 preserve-list:
// the shell must be tested in its authed states, not only the logged-out one).
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

describe('AudienceContext (directive 1.14)', () => {
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

  it('respects a stored seeker lens', () => {
    sessionStorage.setItem('tf-aud', 'seeker')
    renderShell(<Probe />)
    expect(screen.getByTestId('probe').textContent).toBe('seeker:false')
  })

  it('session role BEATS a stale stored toggle', () => {
    sessionStorage.setItem('tf-aud', 'seeker')
    authState.session = { user: { email: 'farm@example.com' } }
    authState.role = 'employer'
    renderShell(<Probe />)
    expect(screen.getByTestId('probe').textContent).toBe('employer:true')
  })

  it('admin session falls back to the stored lens, unlocked', () => {
    sessionStorage.setItem('tf-aud', 'seeker')
    authState.session = { user: { email: 'admin@example.com' } }
    authState.role = 'admin'
    renderShell(<Probe />)
    expect(screen.getByTestId('probe').textContent).toBe('seeker:false')
  })
})

describe('UtilityBar states', () => {
  it('logged out: renders exactly the two account actions and the toggle', () => {
    renderShell(<UtilityBar />)
    expect(screen.getByText('Sign in')).toHaveAttribute('href', '/login')
    expect(screen.getByText('Join TopFarms')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Browsing as' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Employer' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('authed: renders NOTHING (pre-auth surface, session owns the audience)', () => {
    authState.session = { user: { email: 'farm@example.com' } }
    authState.role = 'seeker'
    renderShell(<UtilityBar />)
    expect(screen.queryByText('Join TopFarms')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Browsing as' })).not.toBeInTheDocument()
  })

  it('toggle flips aria-pressed, persists, and re-targets the Join link', async () => {
    renderShell(<UtilityBar />)
    expect(screen.getByText('Join TopFarms')).toHaveAttribute('href', '/signup?role=employer')
    await userEvent.click(screen.getByRole('button', { name: 'Job seeker' }))
    expect(screen.getByRole('button', { name: 'Job seeker' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText('Join TopFarms')).toHaveAttribute('href', '/signup?role=seeker')
    expect(sessionStorage.getItem('tf-aud')).toBe('seeker')
  })
})

describe('ShellNav states', () => {
  it('logged out, employer lens: employer destinations', () => {
    renderShell(<ShellNav />)
    expect(screen.getByText('Pricing')).toBeInTheDocument()
    expect(screen.getByText('Post a job')).toHaveAttribute('href', '/for-employers')
    expect(screen.queryByText('Open roles')).not.toBeInTheDocument()
  })

  it('logged out, seeker lens: seeker destinations', () => {
    sessionStorage.setItem('tf-aud', 'seeker')
    renderShell(<ShellNav />)
    expect(screen.getByText('Open roles')).toHaveAttribute('href', '/jobs')
    expect(screen.getByText('Build a profile')).toHaveAttribute('href', '/signup?role=seeker')
    expect(screen.queryByText('Post a job')).not.toBeInTheDocument()
  })

  it('authed seeker: preserved role links + avatar, no public set', () => {
    authState.session = { user: { email: 'shepherd@example.com' } }
    authState.role = 'seeker'
    renderShell(<ShellNav />)
    expect(screen.getByText('My Applications')).toBeInTheDocument()
    expect(screen.getByText('My Documents')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'User menu' })).toHaveTextContent('S')
    expect(screen.queryByText('Build a profile')).not.toBeInTheDocument()
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
    expect(screen.getByText('Pricing')).toHaveAttribute('href', '/pricing')
    expect(screen.getByText('For employers')).toHaveAttribute('href', '/for-employers')
    expect(screen.getByText('Privacy')).toHaveAttribute('href', '/privacy')
    expect(screen.getByText('Terms')).toHaveAttribute('href', '/terms')
    expect(screen.getByText('hello@topfarms.co.nz')).toHaveAttribute(
      'href',
      'mailto:hello@topfarms.co.nz',
    )
  })
})

describe('PublicShell composition', () => {
  it('renders utility bar + nav + main content + footer in one wrapper', () => {
    renderShell(
      <PublicShell>
        <h1>Page content</h1>
      </PublicShell>,
    )
    expect(screen.getByRole('group', { name: 'Browsing as' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveTextContent('Page content')
    expect(screen.getByText('Match, train, retain.')).toBeInTheDocument()
  })
})
