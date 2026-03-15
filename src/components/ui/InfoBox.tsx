import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InfoBoxProps extends HTMLAttributes<HTMLDivElement> {
  variant: 'blue' | 'hay' | 'green' | 'purple' | 'red'
  title?: string
}

const variantClasses = {
  blue: {
    container: 'bg-blue-lt border-blue/20',
    title: 'text-blue',
  },
  hay: {
    container: 'bg-hay-lt border-hay/30',
    title: 'text-[#7A5C00]',
  },
  green: {
    container: 'bg-[rgba(45,80,22,0.06)] border-moss/20',
    title: 'text-moss',
  },
  purple: {
    container: 'bg-purple-lt border-purple/20',
    title: 'text-purple',
  },
  red: {
    container: 'bg-red-lt border-red/20',
    title: 'text-red',
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
      <div className="font-body text-[13px] text-ink">{children}</div>
    </div>
  )
}
