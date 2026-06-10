import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const schema = z.object({
  farm_type: z.enum(['dairy', 'sheep_beef'], {
    required_error: 'Please select a farm type',
  }),
})

type FormData = z.infer<typeof schema>

interface Step1Props {
  onComplete: (data: FormData) => void
  defaultValues?: Partial<FormData>
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
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          What type of farm do you operate?
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          This helps us show the right fields and match you with suitable candidates
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FARM_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => setValue('farm_type', type.value, { shouldValidate: true })}
            className={cn(
              'relative w-full cursor-pointer rounded-[12px] border-[2px] p-5 text-left transition-all duration-200',
              'flex flex-col items-center gap-3 text-center',
              selectedType === type.value
                ? 'border-brand-hover bg-[rgba(74,124,47,0.06)]'
                : 'border-border bg-surface hover:border-border-strong',
            )}
          >
            <span className="text-4xl">{type.icon}</span>
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
