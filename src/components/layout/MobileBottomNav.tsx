import { NavLink } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { SEEKER_NAV_PRIMARY } from '@/lib/seekerNav'

/**
 * Seeker-only bottom navigation for phones. Hidden on md+ where the Sidebar
 * (dashboard) or ShellNav links (job search) carry the same items.
 *
 * Before this, the dashboard Sidebar was `hidden md:flex`, so on a phone the
 * only nav was the top slide-out's three links — Home, Saved and Profile were
 * unreachable except by typing a URL.
 *
 * Layouts that render this add `pb-16 md:pb-0` so content clears the bar.
 * Icons pair with visible labels — never icon-only — and the active state is
 * colour + weight, not colour alone.
 */
export function MobileBottomNav() {
  const { session, role } = useAuth()
  if (!session || role !== 'seeker') return null

  return (
    <nav
      aria-label="Primary"
      className="bg-surface border-border fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="flex h-16">
        {SEEKER_NAV_PRIMARY.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard/seeker'}
            className={({ isActive }) =>
              [
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 transition-colors',
                isActive ? 'text-brand-hover font-semibold' : 'text-text-muted',
              ].join(' ')
            }
          >
            <item.icon size={20} aria-hidden="true" />
            <span className="text-[11px] leading-none">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
