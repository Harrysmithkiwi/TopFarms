import { Link } from 'react-router'

// v14 shell footer, per the 2026-08-24 comp: brand column + three link columns. Every
// target is a registered route (dead-link gate) — the comp's "Job Alerts", "Career
// Advice", "Find Candidates", "About" and "Help Centre" have nothing behind them and are
// deliberately absent. /login and /signup?role=seeker appear here because the nav's only
// signup action is the employer one; the footer is where the seeker signup lives.

const COLUMNS: { h: string; links: { to: string; label: string }[] }[] = [
  {
    h: 'For job seekers',
    links: [
      { to: '/jobs', label: 'Find work' },
      { to: '/signup?role=seeker', label: 'Create a profile' },
    ],
  },
  {
    h: 'For employers',
    links: [
      { to: '/signup?role=employer', label: 'Post a job' },
      { to: '/for-employers', label: 'How it works' },
      { to: '/pricing', label: 'Pricing' },
    ],
  },
  {
    h: 'Company',
    links: [
      { to: '/privacy', label: 'Privacy policy' },
      { to: '/terms', label: 'Terms of service' },
    ],
  },
]

export function ShellFooter() {
  return (
    <footer className="border-rule border-t bg-white px-5 py-12">
      <div className="mx-auto grid max-w-[1200px] gap-10 md:grid-cols-5 md:gap-8">
        <div className="space-y-3 md:col-span-2">
          <Link to="/" className="text-bark inline-flex min-h-11 items-center text-xl font-extrabold tracking-tight">
            TopFarms<span className="text-fern-600">.</span>
          </Link>
          <p className="text-sage max-w-[36ch] text-sm leading-relaxed">
            Connecting agricultural employers with people looking for work across New Zealand.
          </p>
          <p className="text-sage text-xs">
            &copy; 2026 TopFarms &middot;{' '}
            <a className="hover:text-bark underline underline-offset-4" href="mailto:hello@topfarms.co.nz">
              hello@topfarms.co.nz
            </a>
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.h}>
            <h2 className="text-bark text-xs font-semibold tracking-wider uppercase">{col.h}</h2>
            <ul className="mt-3 space-y-0.5">
              {col.links.map((l) => (
                <li key={l.to + l.label}>
                  <Link
                    className="text-sage hover:text-bark inline-flex min-h-9 items-center text-sm transition-colors"
                    to={l.to}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  )
}
