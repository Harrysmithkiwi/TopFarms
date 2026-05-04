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
          className="font-body text-[13px] font-medium text-text mb-1 block"
        >
          {label}
        </Label.Root>
      )}
      <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          id={selectId}
          className={cn(
            'w-full flex items-center justify-between',
            'border-[1.5px] rounded-[8px] min-h-[44px] px-3 py-2 font-body text-[15px] bg-surface-2',
            'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
            'transition-colors duration-150 cursor-pointer',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error ? 'border-danger focus:border-danger' : 'border-border focus:border-brand',
          )}
        >
          <SelectPrimitive.Value
            placeholder={<span className="text-text-subtle">{placeholder}</span>}
            className="text-text"
          />
          <SelectPrimitive.Icon>
            <ChevronDown className="w-4 h-4 text-text-muted" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className={cn(
              'bg-surface border border-border rounded-[8px] shadow-md',
              'max-h-[280px] overflow-hidden z-50',
            )}
            position="popper"
            sideOffset={4}
          >
            <SelectPrimitive.ScrollUpButton className="flex items-center justify-center py-1 text-text-muted">
              <ChevronUp className="w-4 h-4" />
            </SelectPrimitive.ScrollUpButton>

            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className={cn(
                    'px-3 py-2 text-[15px] font-body rounded-[4px] cursor-pointer',
                    'outline-none focus:bg-surface-2',
                    'data-[state=checked]:bg-brand-50 data-[state=checked]:text-brand',
                    'data-[highlighted]:bg-surface-2',
                    'select-none',
                  )}
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>

            <SelectPrimitive.ScrollDownButton className="flex items-center justify-center py-1 text-text-muted">
              <ChevronDown className="w-4 h-4" />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>

      {error && <p className="mt-1 text-danger text-[12px] font-body">{error}</p>}
    </div>
  )
}
