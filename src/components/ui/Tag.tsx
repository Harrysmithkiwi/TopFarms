import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant: 'green' | 'warn' | 'blue' | 'grey' | 'purple' | 'red'
}

// `orange` (bg-warn-bg + text-warn) was removed 2026-07-30: 1.93:1 contrast, far below
// WCAG AA, and unused. `warn` is the correct amber variant — it uses
// --color-warn-text-on-bg (6.37:1). Do not reintroduce raw text-warn on a tinted
// background. The `blue` variant is still 2.42:1 and is fixed in Phase 4 Task 4.1.
const variantClasses = {
  green: 'bg-brand-50 text-brand',
  warn: 'bg-warn-bg text-warn-text-on-bg',
  blue: 'bg-info-bg text-info',
  grey: 'bg-surface-2 text-text-muted',
  purple: 'bg-ai-bg text-ai',
  red: 'bg-danger-bg text-danger',
}

export function Tag({ variant, className, children, ...props }: TagProps) {
  return (
    <span
      className={cn(
        'font-body inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
