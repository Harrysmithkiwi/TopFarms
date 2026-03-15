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
          className="font-body text-[13px] font-medium text-ink mb-1 block"
        >
          {label}
        </Label.Root>
      )}
      <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          id={selectId}
          className={cn(
            'w-full flex items-center justify-between',
            'border-[1.5px] rounded-[8px] px-3 py-2 font-body text-[13px] bg-mist',
            'focus:outline-none focus:ring-[3px] focus:ring-[rgba(74,124,47,0.08)]',
            'transition-colors duration-200 cursor-pointer',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error ? 'border-red focus:border-red' : 'border-fog focus:border-fern',
          )}
        >
          <SelectPrimitive.Value
            placeholder={<span className="text-light">{placeholder}</span>}
            className="text-ink"
          />
          <SelectPrimitive.Icon>
            <ChevronDown className="w-4 h-4 text-mid" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className={cn(
              'bg-white border-[1.5px] border-fog rounded-[8px] shadow-lg',
              'max-h-[280px] overflow-hidden z-50',
            )}
            position="popper"
            sideOffset={4}
          >
            <SelectPrimitive.ScrollUpButton className="flex items-center justify-center py-1 text-mid">
              <ChevronUp className="w-4 h-4" />
            </SelectPrimitive.ScrollUpButton>

            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className={cn(
                    'px-3 py-2 text-[13px] font-body rounded-[4px] cursor-pointer',
                    'focus:outline-none focus:bg-mist',
                    'data-[state=checked]:bg-moss/5 data-[state=checked]:text-moss',
                    'data-[highlighted]:bg-mist',
                    'select-none',
                  )}
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>

            <SelectPrimitive.ScrollDownButton className="flex items-center justify-center py-1 text-mid">
              <ChevronDown className="w-4 h-4" />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>

      {error && <p className="mt-1 text-red text-[12px] font-body">{error}</p>}
    </div>
  )
}
