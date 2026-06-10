import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant: 'green' | 'warn' | 'blue' | 'grey' | 'orange' | 'purple' | 'red'
}

const variantClasses = {
  green: 'bg-brand-50 text-brand',
  warn: 'bg-warn-bg text-warn-text-on-bg',
  blue: 'bg-info-bg text-info',
  grey: 'bg-surface-2 text-text-muted',
  orange: 'bg-warn-bg text-warn',
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
