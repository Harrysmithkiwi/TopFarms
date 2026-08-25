import { Link } from 'react-router'
import type { ReactNode } from 'react'
import { IconArrowRight } from '@/components/landing/LandingIcons'

// Shared primitives for the v12 landing world (docs/design/v12-DIRECTIVE.md).
//
// These exist so the world is one decision rather than nine: the pill radius, the fern-700
// fill, the arrow that trails every forward action, and the container measure are declared
// once here and never re-typed in a section. A section that needs a different button has
// found a gap in the system, not an exception to it.

export function Container({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`mx-auto w-[92%] max-w-[1120px] ${className}`}>{children}</div>
}

/**
 * Display heading. Cormorant Garamond, pinned by the approved comp.
 *
 * `text-balance` matters more than usual here: the comp's headlines break at deliberate
 * points ("The right people. / The right farm.") and a serif at this size with a ragged
 * two-word last line looks broken rather than editorial.
 */
export function Display({
  as: Tag = 'h2',
  children,
  className = '',
}: {
  as?: 'h1' | 'h2' | 'h3'
  children: ReactNode
  className?: string
}) {
  return (
    <Tag
      className={`font-serif text-brand-900 font-medium tracking-[-0.01em] text-balance ${className}`}
    >
      {children}
    </Tag>
  )
}

type BtnProps = {
  to: string
  children: ReactNode
  variant?: 'primary' | 'outline' | 'onScene'
  size?: 'md' | 'lg'
  className?: string
}

/**
 * The one action component. Pill, because the comp is pills throughout.
 *
 * `onScene` is the outline variant sitting on the illustration: it takes a solid white fill
 * rather than a transparent one, because a transparent outline button over a painted sky
 * fails contrast against whichever cloud happens to be behind it. Measured: white-on-brand
 * 5.02:1, and white-on-brand-900 9.11:1 on hover — the hover was 7.13:1 while it pointed at
 * the v14 fern-800, and the token rename moved it up. The transparent version was
 * unmeasurable by definition, which is the reason it does not exist.
 *
 * `outline` is the comp's quiet secondary: a white surface with the hairline border, not a
 * green-outlined button, so the primary is the only green object in a CTA pair.
 */
export function Btn({ to, children, variant = 'primary', size = 'md', className = '' }: BtnProps) {
  const base =
    'group inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-colors duration-200 border'
  const sizing = size === 'lg' ? 'px-7 py-3.5 text-base' : 'px-5 py-2.5 text-[0.9375rem]'
  const skin =
    variant === 'primary'
      ? 'bg-brand border-brand text-white hover:bg-brand-900 hover:border-brand-900'
      : variant === 'onScene'
        ? 'bg-white border-white text-brand-900 hover:bg-brand-50 hover:border-brand-50'
        : 'bg-white border-border text-text hover:bg-brand-50 hover:border-brand-accent/40'

  return (
    <Link to={to} className={`${base} ${sizing} ${skin} ${className}`}>
      {children}
      <IconArrowRight className="h-[1.05em] w-[1.05em] transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none" />
    </Link>
  )
}

/** Quiet forward link — the comp's "Browse Jobs →" / "Learn more →" affordance. */
export function TextLink({
  to,
  children,
  className = '',
}: {
  to: string
  children: ReactNode
  className?: string
}) {
  return (
    <Link
      to={to}
      className={`group inline-flex min-h-11 -my-2.5 items-center gap-1.5 py-2.5 text-[0.9375rem] font-semibold text-brand underline-offset-4 hover:text-brand-900 hover:underline ${className}`}
    >
      {children}
      <IconArrowRight className="h-[1em] w-[1em] transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none" />
    </Link>
  )
}

/** The circular pale-green plate every icon sits on in the comp. */
export function IconPlate({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-success-text-on-bg ${className}`}
    >
      {children}
    </span>
  )
}
