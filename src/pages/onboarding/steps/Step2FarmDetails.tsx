import { useForm, useWatch, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { ChipSelector } from '@/components/ui/ChipSelector'
import { FARM_TYPE_OPTIONS, OWNERSHIP_TYPE_OPTIONS, SHED_TYPES } from '@/types/domain'

/**
 * Shed type is a dairy concept. Requiring it unconditionally meant a Sheep & Beef (or cropping,
 * or deer) farmer could not finish onboarding at all — the form blocked on a field their farm
 * does not have, at the very front of the funnel. Same defect as the job wizard's step 2; the
 * rule is expressed twice because the two forms share no schema.
 *
 * `farm_types` is on this same form, so the condition reads straight off the submitted value.
 */
const schema = z
  .object({
    farm_name: z.string().min(1, 'Farm name is required'),
    region: z.string().min(1, 'Region is required'),
    farm_types: z.array(z.string()).min(1, 'Select at least one farm type'),
    ownership_type: z.array(z.string()).optional(),
    shed_type: z.array(z.string()),
    herd_size: z.coerce.number().optional(),
    milking_frequency: z.string().optional(),
    breed: z.string().optional(),
    property_size_ha: z.coerce.number().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.farm_types.includes('dairy') && d.shed_type.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['shed_type'],
        message: 'Select shed type',
      })
    }
  })

type FormData = z.infer<typeof schema>

interface Step2Props {
  onComplete: (data: FormData) => void
  onBack?: () => void
  defaultValues?: Partial<Omit<FormData, 'ownership_type'>> & {
    ownership_type?: string | string[]
    farm_types?: string[]
  }
}

const NZ_REGIONS = [
  'Northland',
  'Auckland',
  'Waikato',
  'Bay of Plenty',
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

const MILKING_FREQUENCY_OPTIONS = [
  { value: 'once_a_day', label: 'Once-a-day' },
  { value: 'twice_a_day', label: 'Twice-a-day' },
  { value: 'three_a_day', label: 'Three-a-day' },
]

export function Step2FarmDetails({ onComplete, onBack, defaultValues }: Step2Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      farm_name: defaultValues?.farm_name ?? '',
      region: defaultValues?.region ?? '',
      farm_types: defaultValues?.farm_types ?? [],
      ownership_type: Array.isArray(defaultValues?.ownership_type)
        ? defaultValues.ownership_type
        : defaultValues?.ownership_type
          ? [defaultValues.ownership_type]
          : [],
      shed_type: defaultValues?.shed_type ?? [],
      herd_size: defaultValues?.herd_size,
      milking_frequency: defaultValues?.milking_frequency ?? '',
      breed: defaultValues?.breed ?? '',
      property_size_ha: defaultValues?.property_size_ha,
    },
  })

  // Reacts to the chips above: pick Sheep & Beef only, and the dairy questions go away. Nothing
  // selected yet still shows them, so the form does not flicker fields in on first paint.
  const farmTypes = useWatch({ control, name: 'farm_types' }) ?? []
  const showsDairyFields =
    farmTypes.length === 0 || farmTypes.includes('dairy') || farmTypes.includes('mixed')

  // Clear the dairy-only answers when they are hidden, so a value picked before the farm type
  // was narrowed cannot be saved against a farm that never showed the question.
  function submit(data: FormData) {
    onComplete(showsDairyFields ? data : { ...data, shed_type: [], milking_frequency: '' })
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          Tell us about your farm
        </h2>
      </div>

      <div className="space-y-4">
        {/* Farm type chips — 2-column grid, multi-select */}
        <Controller
          control={control}
          name="farm_types"
          render={({ field }) => (
            <ChipSelector
              label="Farm type"
              required
              options={FARM_TYPE_OPTIONS}
              value={field.value ?? []}
              onChange={field.onChange}
              mode="multi"
              columns={2}
              error={errors.farm_types?.message}
            />
          )}
        />

        {/* Ownership structure chips — 2-column grid, multi-select */}
        <Controller
          control={control}
          name="ownership_type"
          render={({ field }) => (
            <ChipSelector
              label="Ownership structure"
              options={OWNERSHIP_TYPE_OPTIONS}
              value={field.value ?? []}
              onChange={field.onChange}
              mode="multi"
              columns={2}
            />
          )}
        />

        <Input
          label="Farm name"
          required
          placeholder="e.g. Green Valley Farm"
          error={errors.farm_name?.message}
          {...register('farm_name')}
        />

        <Controller
          control={control}
          name="region"
          render={({ field }) => (
            <Select
              label="Region"
              required
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

        {/* Shed type chips — inline, multi-select. Dairy only. */}
        {showsDairyFields && (
          <Controller
            control={control}
            name="shed_type"
            render={({ field }) => (
              <ChipSelector
                label="Shed type"
                required={farmTypes.includes('dairy')}
                options={SHED_TYPES}
                value={field.value ?? []}
                onChange={field.onChange}
                mode="multi"
                columns="inline"
                error={errors.shed_type?.message}
              />
            )}
          />
        )}

        {showsDairyFields && (
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
        )}

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
            style={{ color: 'var(--color-text-subtle)' }}
          >
            ha
          </span>
        </div>
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
