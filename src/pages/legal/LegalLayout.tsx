import type { ReactNode } from 'react'
import { Nav } from '@/components/layout/Nav'
import { LandingFooter } from '@/components/landing/LandingFooter'

interface LegalLayoutProps {
  title: string
  updated: string
  children: ReactNode
}

/** Shared shell for /privacy and /terms — Nav, prose column, footer. */
export function LegalLayout({ title, updated, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1
          className="font-display mb-2 text-4xl font-bold"
          style={{ color: 'var(--color-brand-900)' }}
        >
          {title}
        </h1>
        <p className="mb-10 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Last updated: {updated}
        </p>
        <div
          className="space-y-6 text-[15px] leading-relaxed [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5"
          style={{ color: 'var(--color-text)' }}
        >
          {children}
        </div>
      </main>
      <LandingFooter />
    </div>
  )
}
