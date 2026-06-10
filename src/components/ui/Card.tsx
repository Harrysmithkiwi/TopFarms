import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

export function Card({ hover = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface border-border rounded-[12px] border p-5',
        hover && 'hover:border-border-strong transition-colors duration-150 hover:shadow-sm',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
