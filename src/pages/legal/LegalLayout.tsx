import type { ReactNode } from 'react'
import { PublicShell } from '@/components/shell/PublicShell'
import { Display } from '@/components/landing/v12/V12Kit'

interface LegalLayoutProps {
  title: string
  updated: string
  children: ReactNode
}

/**
 * Shared container for /privacy and /terms.
 *
 * v12 port (docs/design/v12-DIRECTIVE.md). The CONTAINER is restyled; the legal
 * text inside is never touched. Per directive 1.17b — CARRIED FORWARD in v12 §0 —
 * legal pages are the one exemption to the zero-dash gate, because replacing an em
 * dash with a comma is editing legal wording. /privacy carries 18 visible em dashes
 * and they stay until a lawyer revises the text.
 *
 * No PastoralBand here. Every other v12 route opens on the scene; a terms page that
 * does the same is the illustration arguing at a reader who came to check one clause.
 * The type and the fern ramp carry the world instead.
 *
 * lining-nums on the h2 is not cosmetic. Cormorant Garamond ships old-style figures by
 * default, so /terms rendered "1. What TopFarms is" with the 1 hanging below the
 * baseline, reading as a lowercase letter. Clause numbers are the one place on this
 * surface where a numeral has to be unambiguous.
 */
export function LegalLayout({ title, updated, children }: LegalLayoutProps) {
  return (
    <PublicShell>
      {/* 60ch: a legal page is read in clauses, not paragraphs, and the narrow
          measure keeps a numbered sub-clause on one or two lines. */}
      <article className="mx-auto max-w-[60ch] px-5 pt-12 pb-16">
        <Display as="h1" className="text-[clamp(2rem,4.4vw,2.9rem)] leading-[1.08]">
          {title}
        </Display>
        <p className="text-bark/60 mt-3 text-[0.9375rem] font-medium">Last updated: {updated}</p>
        <div className="text-bark/85 mt-9 space-y-6 text-[1.0625rem] leading-relaxed [&_a]:text-fern-700 [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-fern-800 [&_h2]:font-serif [&_h2]:[font-variant-numeric:lining-nums] [&_h2]:text-fern-900 [&_h2]:mt-11 [&_h2]:mb-3 [&_h2]:text-[clamp(1.35rem,2.2vw,1.6rem)] [&_h2]:font-semibold [&_h2]:tracking-[-0.02em] [&_li]:ml-5 [&_li]:list-disc [&_p]:text-bark/85 [&_ul]:space-y-1.5">
          {children}
        </div>
      </article>
    </PublicShell>
  )
}
