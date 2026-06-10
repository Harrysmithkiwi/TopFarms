import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export interface ChipOption {
  value: string
  label: string
  icon?: React.ReactNode
}

export interface ChipSelectorProps {
  options: ChipOption[]
  value: string[]
  onChange: (value: string[]) => void
  mode: 'single' | 'multi'
  columns?: 1 | 2 | 3 | 'inline'
  className?: string
}

const gridClasses = {
  1: 'flex flex-col gap-2',
  2: 'grid grid-cols-2 gap-2',
  3: 'grid grid-cols-3 gap-2',
  inline: 'flex flex-wrap gap-2',
}

export function ChipSelector({
  options,
  value,
  onChange,
  mode,
  columns = 'inline',
  className,
}: ChipSelectorProps) {
  function handleClick(optionValue: string) {
    if (mode === 'single') {
      onChange([optionValue])
    } else {
      if (value.includes(optionValue)) {
        onChange(value.filter((v) => v !== optionValue))
      } else {
        onChange([...value, optionValue])
      }
    }
  }

  return (
    <div className={cn(gridClasses[columns], className)}>
      {options.map((option) => {
        const isSelected = value.includes(option.value)
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleClick(option.value)}
            className={cn(
              'flex min-h-[44px] items-center gap-2 rounded-[8px] px-3 py-2 md:min-h-[40px]',
              'cursor-pointer border-[1.5px] transition-colors duration-150',
              'font-body text-[14px]',
              'focus-visible:outline-brand outline-none focus-visible:outline-2 focus-visible:outline-offset-2',
              isSelected
                ? 'border-brand bg-brand-50 text-brand'
                : 'border-border bg-surface text-text hover:border-brand-hover',
            )}
          >
            {option.icon && (
              <span className="flex-shrink-0 [&>svg]:h-5 [&>svg]:w-5">{option.icon}</span>
            )}
            <span>{option.label}</span>
            {isSelected && <Check className="text-brand ml-auto h-3.5 w-3.5" />}
          </button>
        )
      })}
    </div>
  )
}
