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
  HOUSING_SUB_OPTIONS,
  PREFERRED_REGION_OPTIONS,
  SALARY_BAND_OPTIONS,
  NOTICE_PERIOD_OPTIONS,
} from '@/types/domain'
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
  /** Overrides the submit label. The profile editor reuses this form to edit one
   *  section, where "Continue" would imply a next step that does not exist. */
  submitLabel?: string
}

export function SeekerStep5LifeSituation({
  onComplete, onBack, defaultValues,
  submitLabel = 'Continue',
}: SeekerStep5Props) {
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
      // Audit F-23: this used to write `region: preferred_regions?.[0]`, described as
      // "backward compatibility". It was data loss. `region` is captured in Step 1 from the
      // full 16-region list and drives the 20-point location dimension in
      // compute_match_score; `preferred_regions` is a multi-select captured in TAP ORDER, so
      // the "first" one is an artefact of which chip the seeker happened to press first. On
      // the profile editor, which reuses this form per section, saving "Life situation"
      // silently rewrote the Region shown in the section above it.
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text">
          Life situation
        </h2>
      </div>

      <div className="space-y-4">
        {/* Couples section */}
        <div className="border-border bg-surface-2 space-y-3 rounded-[10px] border-[1.5px] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body text-text text-label font-semibold">
                Seeking work as a couple?
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                We'll match you with jobs that welcome couples
              </p>
            </div>
            <Controller
              control={control}
              name="couples_seeking"
              render={({ field }) => (
                <Toggle ariaLabel="Looking for a couples role" checked={field.value} onCheckedChange={field.onChange} />
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
        <div className="border-border bg-surface-2 space-y-3 rounded-[10px] border-[1.5px] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body text-text text-label font-semibold">
                Need on-farm accommodation?
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                Filter to jobs that offer housing
              </p>
            </div>
            <Controller
              control={control}
              name="accommodation_needed"
              render={({ field }) => (
                <Toggle ariaLabel="Accommodation needed" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          {accommodationOn && (
            <div className="space-y-3 pl-1">
              <Controller
                control={control}
                name="housing_sub_options"
                render={({ field }) => (
                  <ChipSelector
                    label="Housing requirements"
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
          <p className="font-body text-text text-label mb-2 font-semibold">Preferred regions</p>
          {/* Kept under the No-Subtitle Rule: a constraint on how to answer, not a restatement.
              It sits between the label and the chips, so the label stays out here and the group
              is named with ariaLabel rather than ChipSelector's own rendered label. */}
          <p className="mb-2 text-xs text-text-muted">
            Select all regions you'd work in
          </p>
          <Controller
            control={control}
            name="preferred_regions"
            render={({ field }) => (
              <ChipSelector
                ariaLabel="Preferred regions"
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
          <div>
            <Controller
              control={control}
              name="min_salary"
              render={({ field }) => (
                <ChipSelector
                  label="Minimum salary"
                  options={SALARY_BAND_OPTIONS}
                  value={field.value != null ? [String(field.value)] : []}
                  onChange={(vals) => field.onChange(vals[0] ? Number(vals[0]) : undefined)}
                  mode="single"
                  columns="inline"
                />
              )}
            />
          </div>

          <Input label="Available from" type="date" {...register('availability_date')} />

          <Controller
            control={control}
            name="notice_period_text"
            render={({ field }) => (
              <Select
                label="Notice period"
                placeholder="Select notice period"
                options={NOTICE_PERIOD_OPTIONS}
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />

          <InfoBox variant="blue">
            Adding your availability helps employers plan around your start date
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
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
