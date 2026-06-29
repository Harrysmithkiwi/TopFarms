import { InputHTMLAttributes, ReactNode, forwardRef } from 'react'
import * as Label from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  /** Absolutely-positioned trailing control (e.g. password show/hide toggle). Renders inside a relative wrapper. */
  endAdornment?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id, endAdornment, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    const inputEl = (
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'font-body text-text placeholder:text-text-subtle bg-surface-2 min-h-[44px] w-full rounded-[8px] border-[1.5px] px-3 py-2 text-[15px]',
          'focus-visible:outline-brand outline-none focus-visible:outline-2 focus-visible:outline-offset-2',
          'transition-colors duration-150',
          error ? 'border-danger focus:border-danger' : 'border-border focus:border-brand',
          endAdornment && 'pr-12',
          className,
        )}
        {...props}
      />
    )

    return (
      <div className="w-full">
        {label && (
          <Label.Root
            htmlFor={inputId}
            className="font-body text-text mb-1 block text-[13px] font-medium"
          >
            {label}
          </Label.Root>
        )}
        {endAdornment ? (
          <div className="relative">
            {inputEl}
            {endAdornment}
          </div>
        ) : (
          inputEl
        )}
        {error && <p className="text-danger font-body mt-1 text-[12px]">{error}</p>}
        {helperText && !error && (
          <p className="text-text-subtle font-body mt-1 text-[12px]">{helperText}</p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
