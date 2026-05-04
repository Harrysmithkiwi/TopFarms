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
}

export function Checkbox({
  label,
  checked,
  onCheckedChange,
  disabled,
  className,
  id,
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
        className={cn(
          'w-[15px] h-[15px] rounded-[3px] border-[1.5px] flex items-center justify-center',
          'transition-colors duration-150 cursor-pointer',
          'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'data-[state=unchecked]:border-border data-[state=unchecked]:bg-surface-2',
          'data-[state=checked]:border-brand data-[state=checked]:bg-brand',
        )}
      >
        <CheckboxPrimitive.Indicator>
          <Check className="w-[10px] h-[10px] text-text-on-brand stroke-[3]" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label && (
        <Label.Root
          htmlFor={checkboxId}
          className="font-body text-[13px] text-text cursor-pointer select-none"
        >
          {label}
        </Label.Root>
      )}
    </div>
  )
}
