import { NavLink } from 'react-router'

/**
 * Link-row shared by the two "Saved" surfaces — saved jobs and saved
 * searches. Links, not client state: each tab is its own route, so the back
 * button, bookmarks and the nav highlight all behave.
 */
const TABS = [
  { to: '/dashboard/seeker/saved', label: 'Saved jobs' },
  { to: '/dashboard/seeker/saved-searches', label: 'Saved searches' },
]

export function SavedTabs() {
  return (
    <nav aria-label="Saved" className="flex gap-1.5">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end
          className={({ isActive }) =>
            [
              'font-body inline-flex min-h-9 items-center rounded-full px-3.5 text-[13px] font-semibold transition-colors',
              isActive
                ? 'bg-brand-50 text-brand-900'
                : 'text-text-muted hover:bg-surface-2 hover:text-text',
            ].join(' ')
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
