import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

export function Card({ hover = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white border-[1.5px] border-fog rounded-[12px] p-5',
        hover && 'hover:translate-y-[-1px] hover:shadow-md transition-all duration-200',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
