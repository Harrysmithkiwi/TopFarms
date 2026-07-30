import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as Label from '@radix-ui/react-label'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CheckboxProps {
  label?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  id?: string
  /** Accessible name when there's no visible `label` (e.g. a select-all in a header). */
  'aria-label'?: string
}

export function Checkbox({
  label,
  checked,
  onCheckedChange,
  disabled,
  className,
  id,
  'aria-label': ariaLabel,
}: CheckboxProps) {
  const checkboxId =
    id || (label ? `checkbox-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <CheckboxPrimitive.Root
        id={checkboxId}
        checked={checked}
        onCheckedChange={(val) => onCheckedChange?.(val === true)}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(
          'flex h-[15px] w-[15px] items-center justify-center rounded-[3px] border-[1.5px]',
          'cursor-pointer transition-colors duration-150',
          'focus-visible:outline-brand focus-visible:outline-2 focus-visible:outline-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'data-[state=unchecked]:border-border data-[state=unchecked]:bg-surface-2',
          'data-[state=checked]:border-brand data-[state=checked]:bg-brand',
        )}
      >
        <CheckboxPrimitive.Indicator>
          <Check className="text-text-on-brand h-[10px] w-[10px] stroke-[3]" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label && (
        <Label.Root
          htmlFor={checkboxId}
          className="font-body text-text cursor-pointer text-[13px] select-none"
        >
          {label}
        </Label.Root>
      )}
    </div>
  )
}
