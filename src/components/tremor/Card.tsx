// Tremor Raw Card — adapted to TopFarms tokens (Phase 0).
// Source: tremorlabs Card [v0.0.1], Apache-2.0. Changes: dropped the Radix Slot
// `asChild` path (unused — avoids a dependency), cx → our cn, and every colour
// swapped to @theme tokens: bg-surface / border-border / shadow-card / rounded-12.
// No hardcoded colour; reads src/index.css.
import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends React.ComponentPropsWithoutRef<'div'> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, forwardedRef) => {
  return (
    <div
      ref={forwardedRef}
      className={cn(
        'bg-surface border-border shadow-card relative w-full rounded-12 border p-5 text-left',
        className,
      )}
      {...props}
    />
  )
})

Card.displayName = 'Card'

export { Card, type CardProps }
