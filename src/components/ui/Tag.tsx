import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant: 'green' | 'warn' | 'blue' | 'grey' | 'purple' | 'red'
}

// Every variant pairs a *-bg tint with its *-text-on-bg partner (all ≥4.5:1,
// computed by scripts/contrast.mjs). Do not put a raw semantic colour
// (text-warn/-info/-ai/-danger/-brand) on a tinted background — that is how the
// 1.93:1 `orange` variant shipped and had to be deleted (2026-07-30).
const variantClasses = {
  green: 'bg-brand-50 text-success-text-on-bg',
  warn: 'bg-warn-bg text-warn-text-on-bg',
  blue: 'bg-info-bg text-info-text-on-bg',
  grey: 'bg-surface-2 text-text-muted',
  purple: 'bg-ai-bg text-ai-text-on-bg',
  red: 'bg-danger-bg text-danger-text-on-bg',
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
