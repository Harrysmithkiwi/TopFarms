import * as Switch from '@radix-ui/react-switch'
import * as Label from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

interface ToggleProps {
  label?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  id?: string
}

export function Toggle({
  label,
  checked,
  onCheckedChange,
  disabled,
  className,
  id,
}: ToggleProps) {
  const switchId = id || (label ? `toggle-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Switch.Root
        id={switchId}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          'w-[34px] h-[18px] rounded-full transition-colors duration-150',
          'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
          'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
          'data-[state=unchecked]:bg-border data-[state=checked]:bg-brand',
        )}
      >
        <Switch.Thumb
          className={cn(
            'block w-[14px] h-[14px] bg-surface rounded-full shadow-sm',
            'transition-transform duration-150',
            'translate-x-[2px] data-[state=checked]:translate-x-[16px]',
          )}
        />
      </Switch.Root>
      {label && (
        <Label.Root
          htmlFor={switchId}
          className="font-body text-[13px] text-text cursor-pointer select-none"
        >
          {label}
        </Label.Root>
      )}
    </div>
  )
}
