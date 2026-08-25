import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Milk, Beef, Wheat, PawPrint, Layers, Tractor } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

// Phase 3 Task 3.3. This step offered dairy and sheep_beef only — a v1.0
// leftover. jobs_sector_check accepts six sectors, FARM_TYPE_OPTIONS in
// domain.ts already lists exactly those six, and the landing strip now
// advertises five of them. An employer arriving from a "Cropping" card could
// not say they run a cropping farm. Same incoherence as D7, pointing the other
// way, so it is closed the same way: match the database.
const schema = z.object({
  farm_type: z.enum(['dairy', 'sheep_beef', 'cropping', 'deer', 'mixed', 'other'], {
    required_error: 'Please select a farm type',
  }),
})

type FormData = z.infer<typeof schema>

interface Step1Props {
  onComplete: (data: FormData) => void
  defaultValues?: Partial<FormData>
}

// Lucide glyphs, not emoji: emoji render differently on every platform and
// carry no accessible name (banned in the admin uplift; the same rule applies
// to the public surfaces).
const FARM_TYPES = [
  {
    value: 'dairy' as const,
    label: 'Dairy Cattle',
    Icon: Milk,
    description: 'Dairy farming, milking operations, herd management',
  },
  {
    value: 'sheep_beef' as const,
    label: 'Sheep & Beef',
    Icon: Beef,
    description: 'Sheep and beef cattle farming, pastoral operations',
  },
  {
    value: 'cropping' as const,
    label: 'Cropping',
    Icon: Wheat,
    description: 'Arable and cropping operations, harvest and machinery work',
  },
  {
    value: 'deer' as const,
    label: 'Deer',
    Icon: PawPrint,
    description: 'Deer farming, velvet and venison operations',
  },
  {
    value: 'mixed' as const,
    label: 'Mixed',
    Icon: Layers,
    description: 'More than one enterprise across the same property',
  },
  {
    value: 'other' as const,
    label: 'Other',
    Icon: Tractor,
    description: 'Another primary-sector operation',
  },
]

export function Step1FarmType({ onComplete, defaultValues }: Step1Props) {
  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      farm_type: defaultValues?.farm_type,
    },
  })

  const selectedType = watch('farm_type')

  return (
    <form onSubmit={handleSubmit(onComplete)} className="space-y-6">
      <div>
        <h2
          id="farm-type-legend"
          className="text-lg font-semibold"
          style={{ color: 'var(--color-text)' }}
        >
          What type of farm do you operate?
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          This changes which fields you see next.
        </p>
      </div>

      {/* A radiogroup, because that is what this control IS: pick exactly one of six.
          It previously rendered six plain buttons whose only selected-state signal was a
          border colour, with no aria-pressed, aria-checked or grouping. A screen-reader
          user could not tell which farm type they had chosen - on the FIRST step of
          employer onboarding. axe cannot catch this (it does not require a selected state
          on a button), so it took the DESIGN.md §5 judgement pass to find it, during the
          pre-launch UAT on live prod, 2026-08-24. */}
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        role="radiogroup"
        aria-labelledby="farm-type-legend"
        aria-required="true"
      >
        {FARM_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            role="radio"
            aria-checked={selectedType === type.value}
            onClick={() => setValue('farm_type', type.value, { shouldValidate: true })}
            className={cn(
              'relative w-full cursor-pointer rounded-12 border-[2px] p-5 text-left transition-all duration-200',
              'flex flex-col items-center gap-3 text-center',
              selectedType === type.value
                ? 'border-brand-hover bg-[rgba(74,124,47,0.06)]'
                : 'border-border bg-surface hover:border-border-strong',
            )}
          >
            <type.Icon
              className="h-8 w-8"
              style={{ color: 'var(--color-brand-700)' }}
              aria-hidden="true"
            />
            <div>
              <h3
                className="font-body text-[15px] font-bold"
                style={{ color: 'var(--color-text)' }}
              >
                {type.label}
              </h3>
              <p className="mt-0.5 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                {type.description}
              </p>
            </div>

            {/* Selection indicator */}
            <div
              className={cn(
                'absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full border-[2px] transition-all duration-200',
                selectedType === type.value
                  ? 'border-brand-hover bg-brand-hover'
                  : 'border-border bg-surface',
              )}
            >
              {selectedType === type.value && (
                <svg
                  className="h-3 w-3 text-white"
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
        ))}
      </div>

      {errors.farm_type && (
        <p className="text-danger font-body text-[12px]">{errors.farm_type.message}</p>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" variant="primary" size="md">
          Continue
        </Button>
      </div>
    </form>
  )
}
