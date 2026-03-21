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
              'flex items-center gap-2 px-3 py-2 rounded-[8px]',
              'border-[1.5px] cursor-pointer transition-all duration-150',
              'font-body text-[13px]',
              isSelected
                ? 'border-moss bg-moss/7 text-moss'
                : 'border-fog bg-white text-ink hover:border-fern',
            )}
          >
            {option.icon && (
              <span className="flex-shrink-0 [&>svg]:w-5 [&>svg]:h-5">
                {option.icon}
              </span>
            )}
            <span>{option.label}</span>
            {isSelected && <Check className="ml-auto w-3.5 h-3.5 text-moss" />}
          </button>
        )
      })}
    </div>
  )
}
