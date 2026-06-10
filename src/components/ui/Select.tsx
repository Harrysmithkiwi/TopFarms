import * as SelectPrimitive from '@radix-ui/react-select'
import * as Label from '@radix-ui/react-label'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label?: string
  placeholder?: string
  options: SelectOption[]
  value?: string
  onValueChange?: (value: string) => void
  error?: string
  disabled?: boolean
  className?: string
  id?: string
}

export function Select({
  label,
  placeholder = 'Select an option',
  options,
  value,
  onValueChange,
  error,
  disabled,
  className,
  id,
}: SelectProps) {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <Label.Root
          htmlFor={selectId}
          className="font-body text-text mb-1 block text-[13px] font-medium"
        >
          {label}
        </Label.Root>
      )}
      <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          id={selectId}
          className={cn(
            'flex w-full items-center justify-between',
            'font-body bg-surface-2 min-h-[44px] rounded-[8px] border-[1.5px] px-3 py-2 text-[15px]',
            'focus-visible:outline-brand outline-none focus-visible:outline-2 focus-visible:outline-offset-2',
            'cursor-pointer transition-colors duration-150',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-danger focus:border-danger' : 'border-border focus:border-brand',
          )}
        >
          <SelectPrimitive.Value
            placeholder={<span className="text-text-subtle">{placeholder}</span>}
            className="text-text"
          />
          <SelectPrimitive.Icon>
            <ChevronDown className="text-text-muted h-4 w-4" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className={cn(
              'bg-surface border-border rounded-[8px] border shadow-md',
              'z-50 max-h-[280px] overflow-hidden',
            )}
            position="popper"
            sideOffset={4}
          >
            <SelectPrimitive.ScrollUpButton className="text-text-muted flex items-center justify-center py-1">
              <ChevronUp className="h-4 w-4" />
            </SelectPrimitive.ScrollUpButton>

            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className={cn(
                    'font-body cursor-pointer rounded-[4px] px-3 py-2 text-[15px]',
                    'focus:bg-surface-2 outline-none',
                    'data-[state=checked]:bg-brand-50 data-[state=checked]:text-brand',
                    'data-[highlighted]:bg-surface-2',
                    'select-none',
                  )}
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>

            <SelectPrimitive.ScrollDownButton className="text-text-muted flex items-center justify-center py-1">
              <ChevronDown className="h-4 w-4" />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>

      {error && <p className="text-danger font-body mt-1 text-[12px]">{error}</p>}
    </div>
  )
}
