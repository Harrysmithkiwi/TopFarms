import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Toggle } from '@/components/ui/Toggle'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ChipSelector } from '@/components/ui/ChipSelector'
import { InfoBox } from '@/components/ui/InfoBox'
import { HOUSING_SUB_OPTIONS, PREFERRED_REGION_OPTIONS } from '@/types/domain'
import type { SeekerProfileData } from '@/types/domain'

const schema = z.object({
  couples_seeking: z.boolean().optional(),
  partner_name: z.string().optional(),
  accommodation_needed: z.boolean().optional(),
  housing_sub_options: z.array(z.string()).optional(),
  preferred_regions: z.array(z.string()).optional(),
  min_salary: z.coerce.number().optional(),
  availability_date: z.string().optional(),
  notice_period_text: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface SeekerStep5Props {
  onComplete: (data: Partial<SeekerProfileData>) => void
  onBack?: () => void
  defaultValues?: {
    couples_seeking?: boolean
    accommodation_needed?: boolean
    housing_sub_options?: string[]
    preferred_regions?: string[]
    min_salary?: number
    availability_date?: string
    notice_period_text?: string
  }
}

export function SeekerStep5LifeSituation({ onComplete, onBack, defaultValues }: SeekerStep5Props) {
  const { handleSubmit, control, watch, register } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      couples_seeking: defaultValues?.couples_seeking ?? false,
      partner_name: '',
      accommodation_needed: defaultValues?.accommodation_needed ?? false,
      housing_sub_options: defaultValues?.housing_sub_options ?? [],
      preferred_regions: defaultValues?.preferred_regions ?? [],
      min_salary: defaultValues?.min_salary ?? undefined,
      availability_date: defaultValues?.availability_date ?? '',
      notice_period_text: defaultValues?.notice_period_text ?? '',
    },
  })

  const couplesOn = watch('couples_seeking')
  const accommodationOn = watch('accommodation_needed')

  function onSubmit(data: FormData) {
    onComplete({
      couples_seeking: data.couples_seeking,
      accommodation_needed: data.accommodation_needed,
      housing_sub_options: data.housing_sub_options,
      preferred_regions: data.preferred_regions,
      min_salary: data.min_salary || undefined,
      availability_date: data.availability_date || undefined,
      notice_period_text: data.notice_period_text || undefined,
      // Keep region as first preferred region for backward compatibility
      region: data.preferred_regions?.[0] || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>
          Life situation
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-mid)' }}>
          Help us find jobs that are the right fit for your lifestyle
        </p>
      </div>

      <div className="space-y-4">
        {/* Couples section */}
        <div className="rounded-[10px] border-[1.5px] border-fog bg-mist p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body text-[13px] font-semibold text-ink">
                Seeking work as a couple?
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-mid)' }}>
                We'll match you with jobs that welcome couples
              </p>
            </div>
            <Controller
              control={control}
              name="couples_seeking"
              render={({ field }) => (
                <Toggle checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          {couplesOn && (
            <Input
              label="Partner's name (optional)"
              placeholder="Enter partner's name"
              {...register('partner_name')}
            />
          )}
        </div>

        {/* Accommodation section */}
        <div className="rounded-[10px] border-[1.5px] border-fog bg-mist p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body text-[13px] font-semibold text-ink">
                Need on-farm accommodation?
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-mid)' }}>
                Filter to jobs that offer housing
              </p>
            </div>
            <Controller
              control={control}
              name="accommodation_needed"
              render={({ field }) => (
                <Toggle checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          {accommodationOn && (
            <div className="space-y-3 pl-1">
              <p className="font-body text-[13px] font-semibold text-ink mb-2">
                Housing requirements
              </p>
              <Controller
                control={control}
                name="housing_sub_options"
                render={({ field }) => (
                  <ChipSelector
                    options={HOUSING_SUB_OPTIONS}
                    value={field.value ?? []}
                    onChange={field.onChange}
                    mode="multi"
                    columns={2}
                  />
                )}
              />
            </div>
          )}
        </div>

        {/* Preferred regions */}
        <div>
          <p className="font-body text-[13px] font-semibold text-ink mb-2">Preferred regions</p>
          <p className="text-[12px] mb-2" style={{ color: 'var(--color-mid)' }}>
            Select all regions you'd work in
          </p>
          <Controller
            control={control}
            name="preferred_regions"
            render={({ field }) => (
              <ChipSelector
                options={PREFERRED_REGION_OPTIONS}
                value={field.value ?? []}
                onChange={field.onChange}
                mode="multi"
                columns={2}
              />
            )}
          />
        </div>

        {/* Salary, availability, notice period */}
        <div className="space-y-4">
          <Input
            label="Minimum salary expectation (NZD per annum)"
            type="number"
            placeholder="e.g. 55000"
            {...register('min_salary')}
          />

          <Input
            label="Available from"
            type="date"
            {...register('availability_date')}
          />

          <Controller
            control={control}
            name="notice_period_text"
            render={({ field }) => (
              <Select
                label="Notice period"
                placeholder="Select notice period"
                options={[
                  { value: 'immediately', label: 'Available immediately' },
                  { value: '1_week', label: '1 week' },
                  { value: '2_weeks', label: '2 weeks' },
                  { value: '1_month', label: '1 month' },
                  { value: '2_months', label: '2+ months' },
                ]}
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />

          <InfoBox variant="blue">
            Adding your availability helps employers plan — listings with dates get 30% more views
          </InfoBox>
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
