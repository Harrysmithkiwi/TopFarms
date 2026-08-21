import { NZ_REGIONS } from '@/lib/constants'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { z } from 'zod'
import { optionalNumber } from '@/lib/zodHelpers'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { ChipSelector } from '@/components/ui/ChipSelector'
import { Toggle } from '@/components/ui/Toggle'
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
    herd_size: optionalNumber(),
    milking_frequency: z.string().optional(),
    breed: z.string().optional(),
    property_size_ha: optionalNumber(),
    // Seeker gap G-13. Mirrors the DB CHECK in 091: claiming accreditation requires saying
    // until when, because a lapsed claim is worse than none — a migrant who relies on it has
    // wasted an application fee and possibly a season.
    inz_accredited: z.boolean().optional(),
    inz_accreditation_expires: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.inz_accredited && !d.inz_accreditation_expires) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['inz_accreditation_expires'],
        message: 'Enter the date your accreditation expires',
      })
    }
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

// Region list DELETED here: it was a hand-written copy of NZ_REGIONS, and this component
// writes the column compute_match_score compares by exact string equality. Two copies is how
// the Manawatū macron diverged in the first place.

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
  const isAccredited = useWatch({ control, name: 'inz_accredited' }) ?? false
  const showsDairyFields =
    farmTypes.length === 0 || farmTypes.includes('dairy') || farmTypes.includes('mixed')

  // Clear the dairy-only answers when they are hidden, so a value picked before the farm type
  // was narrowed cannot be saved against a farm that never showed the question.
  function submit(data: FormData) {
    const cleaned = showsDairyFields ? data : { ...data, shed_type: [], milking_frequency: '' }
    onComplete({
      // `''` must never reach `inz_accreditation_expires`: it is a DATE column and Postgres
      // rejects an empty string with 22007, which fails the WHOLE step-2 upsert — every
      // field on the form, not just this one. Reachable without ever typing a date, because
      // react-hook-form keeps the value of a field that was mounted and then hidden (v7
      // `shouldUnregister` defaults to false), so toggling INZ accreditation ON and then OFF
      // leaves `''` here and `.optional()` accepts it. Cost a live signup 2026-08-21.
      // Same guard the seeker form already had on its own date field
      // (SeekerStep5LifeSituation: `data.availability_date || undefined`); this form never
      // got it. Not a schema `.transform()` — that changes zod's output type away from its
      // input type and react-hook-form's resolver requires the two to match.
      ...cleaned,
      inz_accreditation_expires: data.inz_accreditation_expires || undefined,
    })
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

        {/* Seeker gap G-13. Across 23 real seeker posts, 30% are visa-touched and the question
            they keep asking in comments is not "will you sponsor" — it is "are you accredited",
            because without INZ accreditation a migrant cannot apply at all. Answering it here
            makes those seekers findable instead of them going farm by farm asking. */}
        <div className="space-y-3">
          <Controller
            control={control}
            name="inz_accredited"
            render={({ field }) => (
              <Toggle
                label="INZ accredited employer"
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
              />
            )}
          />

          <p className="font-body text-[12px]" style={{ color: 'var(--color-text-subtle)' }}>
            Lets you hire migrant workers on an Accredited Employer Work Visa. Job seekers
            search for this.
          </p>

          {isAccredited && (
            <>
              <Input
                label="Accreditation expires"
                type="date"
                error={errors.inz_accreditation_expires?.message}
                {...register('inz_accreditation_expires')}
              />
              <p className="font-body text-[12px]" style={{ color: 'var(--color-text-subtle)' }}>
                We show this to job seekers as your own statement. We check it against the
                Immigration New Zealand accredited-employer register when we review your NZBN,
                and clear it if we cannot confirm it. It stops showing once the date passes.
              </p>
            </>
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
          Continue
        </Button>
      </div>
    </form>
  )
}
