import { InputHTMLAttributes, forwardRef } from 'react'
import * as Label from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full">
        {label && (
          <Label.Root
            htmlFor={inputId}
            className="font-body text-[13px] font-medium text-text mb-1 block"
          >
            {label}
          </Label.Root>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full border-[1.5px] rounded-[8px] min-h-[44px] px-3 py-2 font-body text-[15px] text-text placeholder:text-text-subtle bg-surface-2',
            'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
            'transition-colors duration-150',
            error
              ? 'border-danger focus:border-danger'
              : 'border-border focus:border-brand',
            className,
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-danger text-[12px] font-body">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-text-subtle text-[12px] font-body">{helperText}</p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
