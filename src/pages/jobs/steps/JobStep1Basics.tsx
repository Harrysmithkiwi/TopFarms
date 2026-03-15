import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title too long'),
  sector: z.enum(['dairy', 'sheep_beef'], {
    required_error: 'Please select a sector',
  }),
  role_type: z.string().min(1, 'Select a role type'),
  contract_type: z.enum(['permanent', 'contract', 'casual'], {
    required_error: 'Select a contract type',
  }),
  start_date: z.string().optional(),
  region: z.string().min(1, 'Select a region'),
})

type FormData = z.infer<typeof schema>

interface Step1Props {
  onComplete: (data: FormData) => void
  defaultValues?: Partial<FormData>
}

const SECTORS = [
  {
    value: 'dairy' as const,
    label: 'Dairy',
    description: 'Dairy farming, milking operations, herd management',
  },
  {
    value: 'sheep_beef' as const,
    label: 'Sheep & Beef',
    description: 'Sheep and beef cattle farming, pastoral operations',
  },
]

const ROLE_TYPE_OPTIONS = [
  { value: 'Farm Manager', label: 'Farm Manager' },
  { value: 'Assistant Manager', label: 'Assistant Manager' },
  { value: 'Farm Hand', label: 'Farm Hand' },
  { value: 'General', label: 'General' },
  { value: 'Herd Manager', label: 'Herd Manager' },
  { value: '2IC', label: '2IC' },
  { value: 'Relief Milker', label: 'Relief Milker' },
  { value: 'Other', label: 'Other' },
]

const CONTRACT_TYPE_OPTIONS = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'contract', label: 'Contract' },
  { value: 'casual', label: 'Casual' },
]

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

export function JobStep1Basics({ onComplete, defaultValues }: Step1Props) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: defaultValues?.title ?? '',
      sector: defaultValues?.sector,
      role_type: defaultValues?.role_type ?? '',
      contract_type: defaultValues?.contract_type,
      start_date: defaultValues?.start_date ?? '',
      region: defaultValues?.region ?? '',
    },
  })

  const selectedSector = watch('sector')

  return (
    <form onSubmit={handleSubmit(onComplete)} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>
          Job basics
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-mid)' }}>
          Start with the essential details about this role
        </p>
      </div>

      <div className="space-y-4">
        <Input
          label="Job title *"
          placeholder="e.g. Farm Manager — Dairy"
          error={errors.title?.message}
          {...register('title')}
        />

        {/* Sector radio cards */}
        <div>
          <p className="font-body text-[13px] font-medium text-ink mb-2">Sector *</p>
          <div className="grid grid-cols-2 gap-3">
            {SECTORS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setValue('sector', s.value, { shouldValidate: true })}
                className={cn(
                  'w-full text-left rounded-[10px] border-[2px] p-4 transition-all duration-200',
                  selectedSector === s.value
                    ? 'border-fern bg-[rgba(74,124,47,0.06)]'
                    : 'border-fog bg-white hover:border-mid',
                )}
              >
                <p
                  className="font-body font-semibold text-[13px]"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {s.label}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-mid)' }}>
                  {s.description}
                </p>
              </button>
            ))}
          </div>
          {errors.sector && (
            <p className="text-red text-[12px] mt-1">{errors.sector.message}</p>
          )}
        </div>

        <Controller
          control={control}
          name="role_type"
          render={({ field }) => (
            <Select
              label="Role type *"
              placeholder="Select a role type"
              options={ROLE_TYPE_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
              error={errors.role_type?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="contract_type"
          render={({ field }) => (
            <Select
              label="Contract type *"
              placeholder="Select contract type"
              options={CONTRACT_TYPE_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
              error={errors.contract_type?.message}
            />
          )}
        />

        <Input
          label="Start date"
          type="date"
          {...register('start_date')}
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
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" variant="primary" size="md">
          Save &amp; Continue
        </Button>
      </div>
    </form>
  )
}
