import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { SeekerProfileData } from '@/types/domain'

interface SeekerStep1Props {
  onComplete: (data: Partial<SeekerProfileData>) => void
  defaultValues?: { sector_pref?: string[] }
}

const FARM_TYPES = [
  {
    value: 'dairy' as const,
    label: 'Dairy Cattle',
    icon: '🐄',
    description: 'Dairy farming, milking operations, herd management',
  },
  {
    value: 'sheep_beef' as const,
    label: 'Sheep & Beef',
    icon: '🐑',
    description: 'Sheep and beef cattle farming, pastoral operations',
  },
]

export function SeekerStep1FarmType({ onComplete, defaultValues }: SeekerStep1Props) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>(defaultValues?.sector_pref ?? [])

  function toggleType(value: string) {
    setSelectedTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value],
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedTypes.length === 0) return
    onComplete({ sector_pref: selectedTypes })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>
          What type of farm work are you looking for?
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-mid)' }}>
          Select one or both — this helps us match you with relevant jobs
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FARM_TYPES.map((type) => {
          const isSelected = selectedTypes.includes(type.value)
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => toggleType(type.value)}
              className={cn(
                'relative w-full text-left rounded-[12px] border-[2px] p-5 transition-all duration-200 cursor-pointer',
                'flex flex-col items-center text-center gap-3',
                isSelected
                  ? 'border-fern bg-[rgba(74,124,47,0.06)]'
                  : 'border-fog bg-white hover:border-mid',
              )}
            >
              <span className="text-4xl">{type.icon}</span>
              <div>
                <h3
                  className="font-body font-bold text-[15px]"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {type.label}
                </h3>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-mid)' }}>
                  {type.description}
                </p>
              </div>

              {/* Selection indicator */}
              <div
                className={cn(
                  'absolute top-3 right-3 w-5 h-5 rounded-full border-[2px] flex items-center justify-center transition-all duration-200',
                  isSelected ? 'border-fern bg-fern' : 'border-fog bg-white',
                )}
              >
                {isSelected && (
                  <svg
                    className="w-3 h-3 text-white"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M2 6l3 3 5-5" />
                  </svg>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {selectedTypes.length === 0 && (
        <p className="text-[12px] font-body" style={{ color: 'var(--color-mid)' }}>
          Please select at least one farm type to continue
        </p>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" variant="primary" size="md" disabled={selectedTypes.length === 0}>
          Continue
        </Button>
      </div>
    </form>
  )
}
