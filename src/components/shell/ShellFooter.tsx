import { Link } from 'react-router'

// v13 shell footer. Every target is a registered route (dead-link gate).
// Middle dot rationed to one per line (taste 9.F via directive section 3).

export function ShellFooter() {
  return (
    <footer className="border-rule text-sage border-t px-5 py-7">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-8 gap-y-3 text-[13px] font-medium">
        <span>
          TopFarms <span aria-hidden="true">&#183;</span> agricultural recruitment
        </span>
        {/* min-h-11 boxes: invisible padding that lifts each link to a 44px
            touch target without changing the visual row */}
        {/* v13 stage 3a: /jobs added. In employer lens the board was otherwise
            reachable only from a mid-page button, and a job board whose footer
            omits the board is a real gap. /login and /signup stay OUT: the
            utility bar carries both, and duplicating them re-opens the
            action-label gate closed in directive section 3. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0">
          <Link className="hover:text-bark inline-flex min-h-11 items-center px-1.5 transition-colors" to="/jobs">
            Open roles
          </Link>
          <Link className="hover:text-bark inline-flex min-h-11 items-center px-1.5 transition-colors" to="/pricing">
            Pricing
          </Link>
          <Link className="hover:text-bark inline-flex min-h-11 items-center px-1.5 transition-colors" to="/for-employers">
            For employers
          </Link>
          <Link className="hover:text-bark inline-flex min-h-11 items-center px-1.5 transition-colors" to="/privacy">
            Privacy
          </Link>
          <Link className="hover:text-bark inline-flex min-h-11 items-center px-1.5 transition-colors" to="/terms">
            Terms
          </Link>
          <a className="hover:text-bark inline-flex min-h-11 items-center px-1.5 transition-colors" href="mailto:hello@topfarms.co.nz">
            hello@topfarms.co.nz
          </a>
        </div>
        <span>Match, train, retain.</span>
      </div>
    </footer>
  )
}
