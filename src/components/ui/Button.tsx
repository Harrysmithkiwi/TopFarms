import { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

// Phase 4.1: primary fills with --color-brand-hover (white-on-#16a34a was 3.30:1,
// failing AA on every CTA); hover darkens to brand-900. --color-brand itself is
// fill/border-only now. The unused `warn` variant (white on amber, 2.15:1) was
// deleted rather than fixed.
const variantClasses = {
  primary: 'bg-brand-hover text-text-on-brand hover:bg-brand-900',
  outline: 'bg-surface border border-border-strong text-text hover:bg-surface-hover',
  ghost: 'bg-transparent text-text hover:bg-surface-2',
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
        'font-body cursor-pointer rounded-8 font-medium transition-colors duration-150',
        'inline-flex items-center justify-center',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:outline-brand focus-visible:outline-2 focus-visible:outline-offset-2',
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
