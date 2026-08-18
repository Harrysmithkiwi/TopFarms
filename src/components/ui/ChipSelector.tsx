import { useId } from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export interface ChipOption {
  value: string
  label: string
  icon?: React.ReactNode
}

interface ChipSelectorBase {
  options: ChipOption[]
  value: string[]
  onChange: (value: string[]) => void
  mode: 'single' | 'multi'
  columns?: 1 | 2 | 3 | 'inline'
  className?: string
  /** Validation message. Rendered here so it can be wired to the group with aria-describedby. */
  error?: string
  required?: boolean
}

/**
 * A chip group is a set of controls, so it needs its own accessible name — without one a
 * screen reader reads the chips as loose buttons with nothing saying what they answer.
 * Exactly one of `label` (rendered visibly) or `ariaLabel` (name only) is required, and the
 * union makes `tsc` reject an unnamed group. Same guard as `Toggle`: the type is what
 * guarantees no nameless group ships, not a sweep.
 */
export type ChipSelectorProps = ChipSelectorBase &
  ({ label: string; ariaLabel?: never } | { label?: never; ariaLabel: string })

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
  label,
  ariaLabel,
  error,
  required,
}: ChipSelectorProps) {
  const groupId = useId()
  const labelId = `${groupId}-label`
  const errorId = `${groupId}-error`

  function handleClick(optionValue: string) {
    if (mode === 'single') {
      // Audit F-34: this was `onChange([optionValue])`, so single mode could SELECT but never
      // DESELECT — once a chip was tapped the value could be changed but not cleared. The only
      // caller is the optional `min_salary` band, so a seeker who tapped one by accident could
      // not get back to "no minimum". Multi mode always toggled; single silently did not.
      onChange(value.includes(optionValue) ? [] : [optionValue])
    } else {
      if (value.includes(optionValue)) {
        onChange(value.filter((v) => v !== optionValue))
      } else {
        onChange([...value, optionValue])
      }
    }
  }

  return (
    <div>
      {label && (
        <p id={labelId} className="font-body text-text text-label mb-2 font-semibold">
          {label}
          {/* aria-hidden: aria-required on the group carries this to assistive tech. */}
          {required && (
            <span className="text-danger ml-0.5" aria-hidden="true">
              *
            </span>
          )}
        </p>
      )}
      <div
        role="group"
        aria-labelledby={label ? labelId : undefined}
        aria-label={ariaLabel}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(gridClasses[columns], className)}
      >
        {options.map((option) => {
          const isSelected = value.includes(option.value)
          return (
            <button
              key={option.value}
              type="button"
              // ponytail: aria-pressed for both modes. It is accurate either way, and unlike
              // role="radio" it needs no roving tabindex or arrow-key handling — each chip is
              // already independently tabbable. The ceiling: single-select does not announce
              // mutual exclusivity. Upgrade to radiogroup + roving tabindex if that bites.
              aria-pressed={isSelected}
              onClick={() => handleClick(option.value)}
              className={cn(
                'flex min-h-[44px] items-center gap-2 rounded-[8px] px-3 py-2 md:min-h-[40px]',
                'cursor-pointer border-[1.5px] transition-colors duration-150',
                'font-body text-[14px]',
                'focus-visible:outline-brand focus-visible:outline-2 focus-visible:outline-offset-2',
                isSelected
                  ? 'border-brand bg-brand-50 text-success-text-on-bg'
                  : 'border-border bg-surface text-text hover:border-brand-hover',
              )}
            >
              {option.icon && (
                <span className="flex-shrink-0 [&>svg]:h-5 [&>svg]:w-5">{option.icon}</span>
              )}
              <span>{option.label}</span>
              {/* Decorative: aria-pressed already conveys selection. */}
              {isSelected && <Check className="text-brand ml-auto h-3.5 w-3.5" aria-hidden="true" />}
            </button>
          )
        })}
      </div>
      {error && (
        <p id={errorId} className="text-danger font-body mt-1 text-[12px]">
          {error}
        </p>
      )}
    </div>
  )
}
