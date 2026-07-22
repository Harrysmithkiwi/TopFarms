import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { FARM_TYPE_OPTIONS } from '@/types/domain'

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title too long'),
  sector: z.string().min(1, 'Please select a sector'),
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
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: defaultValues?.title ?? '',
      sector: defaultValues?.sector ?? '',
      role_type: defaultValues?.role_type ?? '',
      contract_type: defaultValues?.contract_type,
      start_date: defaultValues?.start_date ?? '',
      region: defaultValues?.region ?? '',
    },
  })

  return (
    <div className="grid min-h-[400px] grid-cols-1 md:grid-cols-[280px_1fr]">
      {/* Left panel — soil background with stats */}
      <div
        className="hidden flex-col justify-center rounded-l-[16px] p-6 md:flex"
        style={{ backgroundColor: 'var(--color-brand-900)' }}
      >
        {/* Honest value points — replaced fabricated 85%/500+/92% stats (TF-003 truth pass). */}
        <h3 className="font-display mb-4 text-lg font-semibold text-white">Why TopFarms?</h3>
        <div className="space-y-4">
          <div>
            <p className="text-2xl font-semibold text-white">Free</p>
            <p className="font-body text-[13px] text-white/70">your first listing costs nothing</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-white">Matched</p>
            <p className="font-body text-[13px] text-white/70">
              candidates scored against your requirements
            </p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-white">30 days</p>
            <p className="font-body text-[13px] text-white/70">every listing runs a full month</p>
          </div>
        </div>
      </div>

      {/* Right panel — cream form */}
      <div className="p-6" style={{ backgroundColor: 'var(--color-bg)' }}>
        <form onSubmit={handleSubmit(onComplete)} className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
              Job basics
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
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

            {/* Sector select */}
            <Controller
              control={control}
              name="sector"
              render={({ field }) => (
                <Select
                  label="Sector *"
                  placeholder="Select a sector"
                  options={FARM_TYPE_OPTIONS}
                  value={field.value}
                  onValueChange={field.onChange}
                  error={errors.sector?.message}
                />
              )}
            />

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

            <Input label="Start date" type="date" {...register('start_date')} />

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
      </div>
    </div>
  )
}
