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
      farm_type: defaultValues?.farm_type as FormData['farm_type'] | undefined,
    },
  })

  const selectedType = watch('farm_type')

  return (
    <form onSubmit={handleSubmit(onComplete)} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          What type of farm do you operate?
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          This helps us show the right fields and match you with suitable candidates
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FARM_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => setValue('farm_type', type.value, { shouldValidate: true })}
            className={cn(
              'relative w-full text-left rounded-[12px] border-[2px] p-5 transition-all duration-200 cursor-pointer',
              'flex flex-col items-center text-center gap-3',
              selectedType === type.value
                ? 'border-brand-hover bg-[rgba(74,124,47,0.06)]'
                : 'border-border bg-surface hover:border-mid',
            )}
          >
            <span className="text-4xl">{type.icon}</span>
            <div>
              <h3
                className="font-body font-bold text-[15px]"
                style={{ color: 'var(--color-text)' }}
              >
                {type.label}
              </h3>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {type.description}
              </p>
            </div>

            {/* Selection indicator */}
            <div
              className={cn(
                'absolute top-3 right-3 w-5 h-5 rounded-full border-[2px] flex items-center justify-center transition-all duration-200',
                selectedType === type.value ? 'border-brand-hover bg-brand-hover' : 'border-border bg-surface',
              )}
            >
              {selectedType === type.value && (
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
        ))}
      </div>

      {errors.farm_type && (
        <p className="text-danger text-[12px] font-body">{errors.farm_type.message}</p>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" variant="primary" size="md">
          Continue
        </Button>
      </div>
    </form>
  )
}
