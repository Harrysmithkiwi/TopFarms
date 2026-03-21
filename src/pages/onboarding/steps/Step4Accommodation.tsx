import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Toggle } from '@/components/ui/Toggle'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ChipSelector } from '@/components/ui/ChipSelector'
import { InfoBox } from '@/components/ui/InfoBox'
import {
  CAREER_DEV_OPTIONS,
  ACCOMMODATION_EXTRAS_OPTIONS,
  HIRING_FREQUENCY_OPTIONS,
} from '@/types/domain'

const schema = z.object({
  // Career development section (EONB-04)
  career_development: z.array(z.string()).optional(),
  hiring_frequency: z.string().optional(),
  couples_welcome: z.boolean().optional(),
  partner_role: z.string().optional(),
  // Accommodation section (EONB-06)
  accommodation_available: z.boolean(),
  accommodation_type: z.string().optional(),
  accommodation_extras: z.array(z.string()).optional(),
  vehicle_provided: z.boolean().optional(),
  vehicle_types: z.array(z.string()).optional(),
  broadband_available: z.boolean().optional(),
  // Salary section (EONB-07)
  salary_min: z.coerce.number().optional(),
  salary_max: z.coerce.number().optional(),
}).refine(
  (d) => !d.salary_min || !d.salary_max || d.salary_min < d.salary_max,
  { message: 'Maximum must be greater than minimum', path: ['salary_max'] }
)

type FormData = z.infer<typeof schema>

interface Step4Props {
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

export function Step4Accommodation({ onComplete, onBack, defaultValues }: Step4Props) {
  const { handleSubmit, control, watch, register, trigger, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      career_development: defaultValues?.career_development ?? [],
      hiring_frequency: defaultValues?.hiring_frequency ?? '',
      couples_welcome: defaultValues?.couples_welcome ?? false,
      partner_role: defaultValues?.partner_role ?? '',
      accommodation_available: defaultValues?.accommodation_available ?? false,
      accommodation_type: defaultValues?.accommodation_type ?? '',
      accommodation_extras: defaultValues?.accommodation_extras ?? [],
      vehicle_provided: defaultValues?.vehicle_provided ?? false,
      vehicle_types: defaultValues?.vehicle_types ?? [],
      broadband_available: defaultValues?.broadband_available ?? false,
      salary_min: defaultValues?.salary_min,
      salary_max: defaultValues?.salary_max,
    },
  })

  const couplesOn = watch('couples_welcome')
  const vehicleOn = watch('vehicle_provided')
  const accommodationAvailable = watch('accommodation_available')

  return (
    <form onSubmit={handleSubmit(onComplete)} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>
          Work & Accommodation
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-mid)' }}>
          Help candidates understand career opportunities and what you offer
        </p>
      </div>

      <div className="space-y-5">
        {/* Section A: Career development (EONB-04) */}
        <div>
          <p className="font-body text-[13px] font-semibold text-ink mb-2">
            Career development opportunities
          </p>
          <Controller
            control={control}
            name="career_development"
            render={({ field }) => (
              <ChipSelector
                options={CAREER_DEV_OPTIONS}
                value={field.value ?? []}
                onChange={field.onChange}
                mode="multi"
                columns={2}
              />
            )}
          />
        </div>

        {/* Hiring frequency */}
        <Controller
          control={control}
          name="hiring_frequency"
          render={({ field }) => (
            <Select
              label="How often do you hire?"
              options={HIRING_FREQUENCY_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />

        {/* Couples toggle with partner sub-select */}
        <div className="flex items-center justify-between p-4 rounded-[10px] border-[1.5px] border-fog bg-mist">
          <div>
            <p className="font-body text-[13px] font-semibold text-ink">Couples welcome?</p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-mid)' }}>
              We'll match you with couples-ready seekers
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
        {couplesOn && (
          <div className="space-y-3 pl-1">
            <Controller
              control={control}
              name="partner_role"
              render={({ field }) => (
                <Select
                  label="Partner's role"
                  options={[
                    { value: 'farm_worker', label: 'Farm worker' },
                    { value: 'domestic', label: 'Domestic / household' },
                    { value: 'admin', label: 'Farm admin' },
                    { value: 'other', label: 'Other' },
                  ]}
                  value={field.value}
                  onValueChange={field.onChange}
                />
              )}
            />
          </div>
        )}

        {/* Section B: Accommodation (EONB-06) */}
        <InfoBox variant="blue">
          76% of seekers need accommodation — listings with it get 2x more applications
        </InfoBox>

        {/* Main accommodation toggle */}
        <div className="flex items-center justify-between p-4 rounded-[10px] border-[1.5px] border-fog bg-mist">
          <div>
            <p className="font-body text-[13px] font-semibold text-ink">
              Do you offer accommodation?
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-mid)' }}>
              On-site or nearby housing provided to workers
            </p>
          </div>
          <Controller
            control={control}
            name="accommodation_available"
            render={({ field }) => (
              <Toggle checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>

        {/* Conditional accommodation fields */}
        {accommodationAvailable && (
          <div className="space-y-4 pl-1">
            <Controller
              control={control}
              name="accommodation_type"
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

            {/* Accommodation extras ChipSelector */}
            <div>
              <p className="font-body text-[13px] font-medium text-ink mb-3">
                Accommodation extras
              </p>
              <Controller
                control={control}
                name="accommodation_extras"
                render={({ field }) => (
                  <ChipSelector
                    options={ACCOMMODATION_EXTRAS_OPTIONS}
                    value={field.value ?? []}
                    onChange={field.onChange}
                    mode="multi"
                    columns={2}
                  />
                )}
              />
            </div>
          </div>
        )}

        {/* Vehicle toggle with conditional chips */}
        <div className="flex items-center justify-between p-4 rounded-[10px] border-[1.5px] border-fog bg-mist">
          <div>
            <p className="font-body text-[13px] font-semibold text-ink">Vehicle provided?</p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-mid)' }}>
              Farm vehicle or transport assistance
            </p>
          </div>
          <Controller
            control={control}
            name="vehicle_provided"
            render={({ field }) => (
              <Toggle checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
        {vehicleOn && (
          <div className="pl-1">
            <Controller
              control={control}
              name="vehicle_types"
              render={({ field }) => (
                <ChipSelector
                  options={[
                    { value: 'farm_vehicle', label: 'Farm vehicle' },
                    { value: 'car', label: 'Car' },
                    { value: 'motorbike', label: 'Motorbike' },
                    { value: 'atv', label: 'ATV/Quad bike' },
                  ]}
                  value={field.value ?? []}
                  onChange={field.onChange}
                  mode="multi"
                  columns="inline"
                />
              )}
            />
          </div>
        )}

        {/* Broadband toggle */}
        <div className="flex items-center justify-between p-4 rounded-[10px] border-[1.5px] border-fog bg-mist">
          <div>
            <p className="font-body text-[13px] font-semibold text-ink">Broadband available?</p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-mid)' }}>
              Internet connectivity on-farm or in accommodation
            </p>
          </div>
          <Controller
            control={control}
            name="broadband_available"
            render={({ field }) => (
              <Toggle checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>

        {/* Section C: Salary range (EONB-07) */}
        <div>
          <p className="font-body text-[13px] font-semibold text-ink mb-2">
            Salary range (NZD per annum)
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min salary (NZD)"
              type="number"
              placeholder="e.g. 55000"
              error={errors.salary_min?.message}
              {...register('salary_min')}
            />
            <Input
              label="Max salary (NZD)"
              type="number"
              placeholder="e.g. 75000"
              error={errors.salary_max?.message}
              {...register('salary_max', { onBlur: () => trigger('salary_max') })}
            />
          </div>
          <div className="mt-2">
            <InfoBox variant="blue">Market rate for Farm Manager: $55k-$75k NZD</InfoBox>
          </div>
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
