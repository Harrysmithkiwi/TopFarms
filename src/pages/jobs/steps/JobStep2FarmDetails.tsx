import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Toggle } from '@/components/ui/Toggle'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ChipSelector } from '@/components/ui/ChipSelector'
import { InfoBox } from '@/components/ui/InfoBox'
import { SHED_TYPES, CALVING_SYSTEM_OPTIONS, DISTANCE_OPTIONS } from '@/types/domain'

const schema = z.object({
  shed_type: z.array(z.string()).min(1, 'Select shed type'),
  herd_size_min: z.coerce.number().min(0).optional(),
  herd_size_max: z.coerce.number().min(0).optional(),
  visa_sponsorship: z.boolean(),
  couples_welcome: z.boolean(),
  accommodation: z
    .object({
      available: z.boolean(),
      type: z.string().optional(),
      pets: z.boolean().optional(),
      couples: z.boolean().optional(),
      family: z.boolean().optional(),
      utilities_included: z.boolean().optional(),
    })
    .optional(),
  // Phase 8 new fields
  breed: z.string().optional(),
  milking_frequency: z.string().optional(),
  calving_system: z.string().optional(),
  farm_area_ha: z.coerce.number().optional(),
  nearest_town: z.string().optional(),
  distance_from_town_km: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Step2Props {
  onComplete: (data: FormData) => void
  onBack?: () => void
  defaultValues?: Partial<FormData>
}

const ACCOMMODATION_TYPE_OPTIONS = [
  { value: 'house', label: 'House' },
  { value: 'flat', label: 'Flat' },
  { value: 'cottage', label: 'Cottage' },
  { value: 'unit', label: 'Unit' },
  { value: 'room', label: 'Room' },
  { value: 'other', label: 'Other' },
]

const MILKING_FREQUENCY_OPTIONS = [
  { value: 'twice_daily', label: 'Twice daily' },
  { value: 'once_daily', label: 'Once a day (OAD)' },
  { value: 'three_times', label: 'Three times daily' },
  { value: 'robotic', label: 'Robotic (AMS)' },
]

export function JobStep2FarmDetails({ onComplete, onBack, defaultValues }: Step2Props) {
  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      shed_type: defaultValues?.shed_type ?? [],
      herd_size_min: defaultValues?.herd_size_min,
      herd_size_max: defaultValues?.herd_size_max,
      visa_sponsorship: defaultValues?.visa_sponsorship ?? false,
      couples_welcome: defaultValues?.couples_welcome ?? false,
      accommodation: defaultValues?.accommodation ?? { available: false },
      breed: defaultValues?.breed ?? '',
      milking_frequency: defaultValues?.milking_frequency ?? '',
      calving_system: defaultValues?.calving_system ?? '',
      farm_area_ha: defaultValues?.farm_area_ha,
      nearest_town: defaultValues?.nearest_town ?? '',
      distance_from_town_km: defaultValues?.distance_from_town_km ?? '',
    },
  })

  const accommodation = watch('accommodation')
  const accommodationAvailable = accommodation?.available ?? false
  const distance = watch('distance_from_town_km')
  const showDistanceWarning = distance === '>30km' || distance === '>50km'

  return (
    <form onSubmit={handleSubmit(onComplete)} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          Farm details
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Help candidates understand the farm operation
        </p>
      </div>

      <div className="space-y-5">
        {/* Shed type — ChipSelector (5 options, inline, multi) */}
        <div>
          <p className="font-body text-[13px] font-semibold text-text mb-2">Shed type *</p>
          <Controller
            control={control}
            name="shed_type"
            render={({ field }) => (
              <ChipSelector
                options={SHED_TYPES}
                value={field.value ?? []}
                onChange={field.onChange}
                mode="multi"
                columns="inline"
              />
            )}
          />
          {errors.shed_type && (
            <p className="text-danger text-[12px] mt-1">{errors.shed_type.message}</p>
          )}
        </div>

        {/* Breed */}
        <Input
          label="Breed"
          placeholder="e.g., Jersey, Friesian, Crossbred"
          {...register('breed')}
        />

        {/* Milking frequency */}
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

        {/* Calving system */}
        <Controller
          control={control}
          name="calving_system"
          render={({ field }) => (
            <Select
              label="Calving system"
              placeholder="Select calving system"
              options={CALVING_SYSTEM_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />

        {/* Farm area */}
        <div>
          <Input
            label="Farm area"
            type="number"
            placeholder="e.g., 250"
            {...register('farm_area_ha')}
          />
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>hectares</p>
        </div>

        {/* Nearest town */}
        <Input
          label="Nearest town"
          placeholder="e.g., Matamata"
          {...register('nearest_town')}
        />

        {/* Distance from town with hay warning */}
        <div>
          <Controller
            control={control}
            name="distance_from_town_km"
            render={({ field }) => (
              <Select
                label="Distance from town"
                placeholder="Select distance"
                options={DISTANCE_OPTIONS}
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />
          {showDistanceWarning && (
            <div className="mt-2">
              <InfoBox variant="warn">
                Remote locations may receive fewer applicants. Consider highlighting accommodation and transport options.
              </InfoBox>
            </div>
          )}
        </div>

        {/* Herd size range */}
        <div>
          <p className="font-body text-[13px] font-medium text-text mb-2">Herd size</p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Minimum"
              type="number"
              placeholder="e.g. 200"
              {...register('herd_size_min')}
            />
            <Input
              label="Maximum"
              type="number"
              placeholder="e.g. 500"
              {...register('herd_size_max')}
            />
          </div>
        </div>

        {/* Visa sponsorship toggle */}
        <div className="flex items-center justify-between p-4 rounded-[10px] border-[1.5px] border-border bg-surface-2">
          <div>
            <p className="font-body text-[13px] font-semibold text-text">
              Visa sponsorship available
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Can you sponsor work visas for international candidates?
            </p>
          </div>
          <Controller
            control={control}
            name="visa_sponsorship"
            render={({ field }) => (
              <Toggle checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>

        {/* Couples welcome toggle */}
        <div className="flex items-center justify-between p-4 rounded-[10px] border-[1.5px] border-border bg-surface-2">
          <div>
            <p className="font-body text-[13px] font-semibold text-text">Couples welcome</p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Is this role suitable for working couples?
            </p>
          </div>
          <Controller
            control={control}
            name="couples_welcome"
            render={({ field }) => (
              <Toggle checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>

        {/* Accommodation */}
        <div>
          <div className="flex items-center justify-between p-4 rounded-[10px] border-[1.5px] border-border bg-surface-2">
            <div>
              <p className="font-body text-[13px] font-semibold text-text">
                Accommodation available
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                On-site or nearby housing for the worker
              </p>
            </div>
            <Controller
              control={control}
              name="accommodation.available"
              render={({ field }) => (
                <Toggle checked={field.value ?? false} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          {accommodationAvailable && (
            <div className="mt-4 space-y-4 pl-1">
              <Controller
                control={control}
                name="accommodation.type"
                render={({ field }) => (
                  <Select
                    label="Accommodation type"
                    placeholder="Select type"
                    options={ACCOMMODATION_TYPE_OPTIONS}
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
              />

              <div>
                <p className="font-body text-[13px] font-medium text-text mb-3">
                  Accommodation details
                </p>
                <div className="space-y-2.5">
                  <Controller
                    control={control}
                    name="accommodation.pets"
                    render={({ field }) => (
                      <Checkbox
                        label="Pets allowed"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="accommodation.couples"
                    render={({ field }) => (
                      <Checkbox
                        label="Suitable for couples"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="accommodation.family"
                    render={({ field }) => (
                      <Checkbox
                        label="Suitable for families"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="accommodation.utilities_included"
                    render={({ field }) => (
                      <Checkbox
                        label="Utilities included"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-2">
        {onBack && (
          <Button type="button" variant="ghost" size="md" onClick={onBack}>
            Back
          </Button>
        )}
        <Button type="submit" variant="primary" size="md" className={onBack ? '' : 'ml-auto'}>
          Save &amp; Continue
        </Button>
      </div>
    </form>
  )
}
