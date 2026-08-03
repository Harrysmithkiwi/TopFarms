import type { ReactNode } from 'react'
import { PublicShell } from '@/components/shell/PublicShell'

interface LegalLayoutProps {
  title: string
  updated: string
  children: ReactNode
}

/**
 * Shared container for /privacy and /terms.
 *
 * v13 port, stage 3a: the CONTAINER is restyled; the legal text inside is never
 * touched. Per directive 1.17b, legal pages are the one exemption to the
 * zero-dash gate, because replacing an em dash with a comma is editing legal
 * wording. /privacy carries 18 visible em dashes and they stay until a lawyer
 * revises the text.
 */
export function LegalLayout({ title, updated, children }: LegalLayoutProps) {
  return (
    <PublicShell>
      {/* 60ch not 70ch: Archivo's "0" glyph is wider than its average character,
          so a 70ch cap measured 83 average characters. 60ch lands inside range. */}
      <article className="mx-auto max-w-[60ch] px-5 pt-10 pb-14">
        <h1 className="text-4xl font-extrabold tracking-[-.04em] md:text-5xl">{title}</h1>
        <p className="text-ink-40 mt-3 text-sm font-medium">Last updated: {updated}</p>
        <div className="text-ink mt-9 space-y-6 text-[15px] leading-relaxed [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-[-.02em] [&_li]:ml-5 [&_li]:list-disc [&_p]:text-ink-60 [&_ul]:space-y-1.5">
          {children}
        </div>
      </article>
    </PublicShell>
  )
}
