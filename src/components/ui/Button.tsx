import { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'warn'
  size?: 'sm' | 'md' | 'lg'
}

const variantClasses = {
  primary: 'bg-brand text-text-on-brand hover:bg-brand-hover',
  outline: 'bg-surface border border-border-strong text-text hover:bg-surface-hover',
  ghost: 'bg-transparent text-text hover:bg-surface-2',
  warn: 'bg-warn text-text-on-brand hover:opacity-90',
}

const sizeClasses = {
  sm: 'h-11 md:h-9 px-3 text-[13px]',
  md: 'h-11 md:h-10 px-4 text-[15px]',
  lg: 'h-12 md:h-11 px-6 text-[15px]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'font-body font-medium rounded-[8px] transition-colors duration-150 cursor-pointer',
        'inline-flex items-center justify-center',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
