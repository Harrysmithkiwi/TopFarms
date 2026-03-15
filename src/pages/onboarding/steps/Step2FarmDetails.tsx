import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { Button } from '@/components/ui/Button'

const schema = z.object({
  farm_name: z.string().min(2, 'Farm name required'),
  region: z.string().min(1, 'Select a region'),
  herd_size: z.coerce.number().min(1, 'Enter herd size').optional(),
  shed_type: z.array(z.string()).optional(),
  milking_frequency: z.string().optional(),
  breed: z.string().optional(),
  property_size_ha: z.coerce.number().optional(),
  ownership_type: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Step2Props {
  onComplete: (data: FormData) => void
  onBack?: () => void
  defaultValues?: Partial<FormData>
}

const NZ_REGIONS = [
  'Northland',
  'Auckland',
  'Waikato',
  "Bay of Plenty",
  'Gisborne',
  "Hawke's Bay",
  'Taranaki',
  'Manawatu-Whanganui',
  'Wellington',
  'Tasman',
  'Nelson',
  'Marlborough',
  'West Coast',
  'Canterbury',
  'Otago',
  'Southland',
]

const SHED_TYPES = ['Rotary', 'Herringbone', 'Other']

const MILKING_FREQUENCY_OPTIONS = [
  { value: 'once_a_day', label: 'Once-a-day' },
  { value: 'twice_a_day', label: 'Twice-a-day' },
  { value: 'three_a_day', label: 'Three-a-day' },
]

const OWNERSHIP_TYPE_OPTIONS = [
  { value: 'owner_operator', label: 'Owner-operator' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'sharemilker', label: 'Sharemilker' },
  { value: 'contract_milker', label: 'Contract milker' },
]

export function Step2FarmDetails({ onComplete, onBack, defaultValues }: Step2Props) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      farm_name: defaultValues?.farm_name ?? '',
      region: defaultValues?.region ?? '',
      herd_size: defaultValues?.herd_size,
      shed_type: defaultValues?.shed_type ?? [],
      milking_frequency: defaultValues?.milking_frequency ?? '',
      breed: defaultValues?.breed ?? '',
      property_size_ha: defaultValues?.property_size_ha,
      ownership_type: defaultValues?.ownership_type ?? '',
    },
  })

  const shedType = watch('shed_type') ?? []

  function toggleShedType(type: string) {
    const current = shedType
    if (current.includes(type)) {
      setValue('shed_type', current.filter((t) => t !== type))
    } else {
      setValue('shed_type', [...current, type])
    }
  }

  return (
    <form onSubmit={handleSubmit(onComplete)} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>
          Tell us about your farm
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-mid)' }}>
          These details help candidates understand your operation
        </p>
      </div>

      <div className="space-y-4">
        <Input
          label="Farm name *"
          placeholder="e.g. Green Valley Farm"
          error={errors.farm_name?.message}
          {...register('farm_name')}
        />

        <Controller
          control={control}
          name="region"
          render={({ field }) => (
            <Select
              label="Region *"
              placeholder="Select a region"
              options={NZ_REGIONS.map((r) => ({ value: r, label: r }))}
              value={field.value}
              onValueChange={field.onChange}
              error={errors.region?.message}
            />
          )}
        />

        <Input
          label="Herd size"
          type="number"
          placeholder="e.g. 350"
          error={errors.herd_size?.message}
          {...register('herd_size')}
        />

        {/* Shed type multi-select */}
        <div>
          <p className="font-body text-[13px] font-medium text-ink mb-2">Shed type</p>
          <div className="flex flex-wrap gap-3">
            {SHED_TYPES.map((type) => (
              <Checkbox
                key={type}
                label={type}
                checked={shedType.includes(type)}
                onCheckedChange={() => toggleShedType(type)}
              />
            ))}
          </div>
        </div>

        <Controller
          control={control}
          name="milking_frequency"
          render={({ field }) => (
            <Select
              label="Milking frequency"
              placeholder="Select frequency"
              options={MILKING_FREQUENCY_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />

        <Input
          label="Breed"
          placeholder="e.g. Friesian, Jersey, Crossbred"
          {...register('breed')}
        />

        <div className="relative">
          <Input
            label="Property size (hectares)"
            type="number"
            placeholder="e.g. 250"
            {...register('property_size_ha')}
          />
          <span
            className="absolute right-3 bottom-2 text-[12px]"
            style={{ color: 'var(--color-light)' }}
          >
            ha
          </span>
        </div>

        <Controller
          control={control}
          name="ownership_type"
          render={({ field }) => (
            <Select
              label="Ownership type"
              placeholder="Select ownership type"
              options={OWNERSHIP_TYPE_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />
      </div>

      <div className="flex justify-between pt-2">
        {onBack && (
          <Button type="button" variant="ghost" size="md" onClick={onBack}>
            Back
          </Button>
        )}
        <Button type="submit" variant="primary" size="md" className={onBack ? '' : 'ml-auto'}>
          Continue
        </Button>
      </div>
    </form>
  )
}
