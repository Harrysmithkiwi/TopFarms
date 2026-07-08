import type { ReactNode } from 'react'
import { Nav } from '@/components/layout/Nav'
import { LandingFooter } from '@/components/landing/LandingFooter'

// ponytail: shared shell for the two legal pages only. Promote to a generic
// content-page layout if a third static page ever appears.

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <Nav />

      {/* Draft banner */}
      <div
        className="px-4 py-2.5 text-center text-sm font-medium"
        style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
        role="status"
      >
        Draft for review: this document is being finalised with our lawyers.
      </div>

      <div className="mx-auto max-w-3xl px-4 py-14">
        <h1
          className="font-display mb-2 text-4xl font-bold"
          style={{ color: 'var(--color-brand-900)' }}
        >
          {title}
        </h1>
        <p className="mb-10 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {updated}
        </p>
        {children}
      </div>

      <LandingFooter />
    </div>
  )
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2
        className="font-display mb-3 text-xl font-bold"
        style={{ color: 'var(--color-brand-900)' }}
      >
        {heading}
      </h2>
      <div
        className="flex flex-col gap-3 text-sm leading-relaxed"
        style={{ color: 'var(--color-text)' }}
      >
        {children}
      </div>
    </section>
  )
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="ml-5 flex list-disc flex-col gap-2">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}
