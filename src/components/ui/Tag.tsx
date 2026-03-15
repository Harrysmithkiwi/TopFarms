import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant: 'green' | 'hay' | 'blue' | 'grey' | 'orange' | 'purple' | 'red'
}

const variantClasses = {
  green: 'bg-[rgba(45,80,22,0.07)] text-moss',
  hay: 'bg-hay-lt text-[#7A5C00]',
  blue: 'bg-blue-lt text-blue',
  grey: 'bg-mist text-mid',
  orange: 'bg-orange-lt text-orange',
  purple: 'bg-purple-lt text-purple',
  red: 'bg-red-lt text-red',
}

export function Tag({ variant, className, children, ...props }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold font-body',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
