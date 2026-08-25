import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { optionalNumber } from '@/lib/zodHelpers'
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
  shed_type: z.array(z.string()),
  herd_size_min: optionalNumber(z.coerce.number().min(0)),
  herd_size_max: optionalNumber(z.coerce.number().min(0)),
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
  farm_area_ha: optionalNumber(),
  nearest_town: z.string().optional(),
  distance_from_town_km: z.string().optional(),
})

type FormData = z.infer<typeof schema>

/**
 * Shed type is a dairy concept. Requiring it unconditionally made a Sheep & Beef (or cropping,
 * or deer) listing impossible to submit — the wizard blocked on a field the farm does not have.
 * The matcher was already ready for this: `compute_match_score` sets `v_shed_applicable = false`
 * on an empty `shed_type` and drops the dimension out of the denominator, so a non-dairy job
 * scores on its remaining dimensions rather than losing 25 points.
 */
const makeSchema = (shedRequired: boolean) =>
  shedRequired
    ? schema.refine((d) => d.shed_type.length > 0, {
        message: 'Select shed type',
        path: ['shed_type'],
      })
    : schema

interface Step2Props {
  onComplete: (data: FormData) => void
  onBack?: () => void
  defaultValues?: Partial<FormData>
  /** The job's farm type, chosen at step 1 (`jobs.sector`). Decides which fields apply. */
  sector?: string
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

export function JobStep2FarmDetails({ onComplete, onBack, defaultValues, sector }: Step2Props) {
  // An unknown sector shows the block: hiding it on a resumed draft could silently drop a
  // shed type the employer already saved. Only a positively non-dairy sector hides it.
  const showsDairyFields = !sector || sector === 'dairy' || sector === 'mixed'
  const shedRequired = sector === 'dairy'

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(makeSchema(shedRequired)),
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

  // Clear the dairy-only answers when they are hidden, so a prefill from the employer's own
  // dairy profile cannot ride along onto a Sheep & Beef job the employer never saw them on.
  function submit(data: FormData) {
    onComplete(showsDairyFields ? data : { ...data, shed_type: [], milking_frequency: '' })
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          Farm details
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Help candidates understand the farm operation
        </p>
      </div>

      <div className="space-y-5">
        {/* Shed type — ChipSelector (5 options, inline, multi). Dairy only. */}
        {showsDairyFields && (
          <div>
            <Controller
              control={control}
              name="shed_type"
              render={({ field }) => (
                <ChipSelector
                  label="Shed type"
                  required={shedRequired}
                  options={SHED_TYPES}
                  value={field.value ?? []}
                  onChange={field.onChange}
                  mode="multi"
                  columns="inline"
                  error={errors.shed_type?.message}
                />
              )}
            />
          </div>
        )}

        {/* Breed */}
        <Input
          label="Breed"
          placeholder="e.g., Jersey, Friesian, Crossbred"
          {...register('breed')}
        />

        {/* Milking frequency — dairy only. */}
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

        {/* ponytail: only the two unambiguously-dairy fields are gated. Breed, calving system and
            herd size stay visible for every sector — they read fine for beef and deer, are all
            optional, and none of them blocks submit. The ceiling: they are still odd on a cropping
            listing. Upgrade to a per-sector field set if cropping employers actually show up. */}
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
          <p className="mt-0.5 text-[12px]" style={{ color: 'var(--color-text-subtle)' }}>
            hectares
          </p>
        </div>

        {/* Nearest town */}
        <Input label="Nearest town" placeholder="e.g., Matamata" {...register('nearest_town')} />

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
                Remote locations may receive fewer applicants. Consider highlighting accommodation
                and transport options.
              </InfoBox>
            </div>
          )}
        </div>

        {/* Herd size range */}
        <div>
          <p className="font-body text-text mb-2 text-[13px] font-medium">Herd size</p>
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
        <div className="border-border bg-surface-2 flex items-center justify-between rounded-12 border-[1.5px] p-4">
          <div>
            <p className="font-body text-text text-[13px] font-semibold">
              Visa sponsorship available
            </p>
            <p className="mt-0.5 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
              Can you sponsor work visas for international candidates?
            </p>
          </div>
          <Controller
            control={control}
            name="visa_sponsorship"
            render={({ field }) => (
              <Toggle ariaLabel="Visa sponsorship available" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>

        {/* Couples welcome toggle */}
        <div className="border-border bg-surface-2 flex items-center justify-between rounded-12 border-[1.5px] p-4">
          <div>
            <p className="font-body text-text text-[13px] font-semibold">Couples welcome</p>
            <p className="mt-0.5 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
              Is this role suitable for working couples?
            </p>
          </div>
          <Controller
            control={control}
            name="couples_welcome"
            render={({ field }) => (
              <Toggle ariaLabel="Couples welcome" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>

        {/* Accommodation */}
        <div>
          <div className="border-border bg-surface-2 flex items-center justify-between rounded-12 border-[1.5px] p-4">
            <div>
              <p className="font-body text-text text-[13px] font-semibold">
                Accommodation available
              </p>
              <p className="mt-0.5 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                On-site or nearby housing for the worker
              </p>
            </div>
            <Controller
              control={control}
              name="accommodation.available"
              render={({ field }) => (
                <Toggle ariaLabel="Accommodation available" checked={field.value ?? false} onCheckedChange={field.onChange} />
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
                <p className="font-body text-text mb-3 text-[13px] font-medium">
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
