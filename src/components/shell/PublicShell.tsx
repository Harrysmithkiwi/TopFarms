import type { ReactNode } from 'react'
import { UtilityBar } from './UtilityBar'
import { ShellNav } from './ShellNav'
import { ShellFooter } from './ShellFooter'

// v13 public shell (directive 1.10). THE pattern for public routes: a page that
// adopts the v13 system wraps its content in <PublicShell> and gets the utility
// bar, nav, footer, Archivo, cream surface and the ink focus ring in one move.
// Pages flip atomically -- a page is either entirely inside the shell or
// entirely on the old system, never half-styled (stage coherence, directive
// section 8). Dark panels inside a page add `v13-dark` so the focus ring stays
// visible on green.
//
// Adding a route in six months: build the page, wrap it in PublicShell, done.
// Do not import UtilityBar/ShellNav/ShellFooter individually into pages.

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="v13-shell bg-cream text-ink font-archivo min-h-screen [font-variant-numeric:tabular-nums]">
      <UtilityBar />
      <ShellNav />
      <main>{children}</main>
      <ShellFooter />
    </div>
  )
}
