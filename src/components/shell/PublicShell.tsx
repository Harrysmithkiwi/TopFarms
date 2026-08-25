import type { ReactNode } from 'react'
import { useAudience } from '@/contexts/AudienceContext'
import { ShellNav } from './ShellNav'
import { ShellFooter } from './ShellFooter'

// v14 public shell (docs/design/MARKETING-DESIGN.md). THE pattern for public routes: a
// page wraps its content in <PublicShell> and gets the single nav bar, footer, canvas and
// focus ring in one move. Pages flip atomically — a page is either entirely inside the
// shell or entirely on the old system, never half-styled.
//
// The v13 UtilityBar (audience toggle) is retired per the 2026-08-24 comp: the nav shows
// both audiences at once instead of asking the visitor to configure the page. The
// AudienceContext and data-aud survive — Pricing still carries per-audience copy via
// .emp-only/.seek-only, and the employer default is correct for every route the nav sends
// there.
//
// Adding a route in six months: build the page, wrap it in PublicShell, done.
// Do not import ShellNav/ShellFooter individually into pages.

export function PublicShell({ children }: { children: ReactNode }) {
  const { audience } = useAudience()
  return (
    <div
      className="v13-shell bg-surface-2 text-text font-body min-h-screen [font-variant-numeric:tabular-nums]"
      data-aud={audience}
    >
      <ShellNav />
      <main>{children}</main>
      <ShellFooter />
    </div>
  )
}
