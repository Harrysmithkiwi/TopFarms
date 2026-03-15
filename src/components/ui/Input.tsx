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
            className="font-body text-[13px] font-medium text-ink mb-1 block"
          >
            {label}
          </Label.Root>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full border-[1.5px] rounded-[8px] px-3 py-2 font-body text-[13px] text-ink placeholder:text-light bg-mist',
            'focus:outline-none focus:ring-[3px] focus:ring-[rgba(74,124,47,0.08)]',
            'transition-colors duration-200',
            error
              ? 'border-red focus:border-red'
              : 'border-fog focus:border-fern',
            className,
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-red text-[12px] font-body">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-light text-[12px] font-body">{helperText}</p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
