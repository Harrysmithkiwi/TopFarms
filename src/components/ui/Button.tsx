import { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'hay'
  size?: 'sm' | 'md' | 'lg'
}

const variantClasses = {
  primary: 'bg-moss text-white hover:bg-fern',
  outline: 'bg-white border border-moss text-moss hover:bg-mist',
  ghost: 'border border-fog text-mid hover:border-mid',
  hay: 'bg-hay text-soil hover:opacity-90',
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-[12px]',
  md: 'px-4 py-2 text-[13px]',
  lg: 'px-6 py-3 text-[14px]',
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
        'font-body font-bold rounded-[8px] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center',
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
