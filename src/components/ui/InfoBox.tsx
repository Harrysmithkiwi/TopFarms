import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InfoBoxProps extends HTMLAttributes<HTMLDivElement> {
  variant: 'blue' | 'warn' | 'green' | 'purple' | 'red'
  title?: string
}

const variantClasses = {
  blue: {
    container: 'bg-info-bg border-info/20',
    title: 'text-info',
  },
  warn: {
    container: 'bg-warn-bg border-warn/30',
    title: 'text-[#7A5C00]',
  },
  green: {
    container: 'bg-brand-50 border-brand/20',
    title: 'text-brand',
  },
  purple: {
    container: 'bg-ai-bg border-ai/20',
    title: 'text-ai',
  },
  red: {
    container: 'bg-danger-bg border-danger/20',
    title: 'text-danger',
  },
}

export function InfoBox({ variant, title, className, children, ...props }: InfoBoxProps) {
  const classes = variantClasses[variant]

  return (
    <div
      className={cn(
        'rounded-[12px] p-4 border-[1.5px]',
        classes.container,
        className,
      )}
      {...props}
    >
      {title && (
        <p className={cn('font-body text-[13px] font-semibold mb-1', classes.title)}>{title}</p>
      )}
      <div className="font-body text-[13px] text-text">{children}</div>
    </div>
  )
}
