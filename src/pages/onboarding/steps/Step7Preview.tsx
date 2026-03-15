import { Button } from '@/components/ui/Button'
import type { EmployerProfileData } from '../EmployerOnboarding'

interface Step7Props {
  onComplete: (data: Record<string, never>) => void
  onBack?: () => void
  onGoToStep: (step: number) => void
  profileData: EmployerProfileData
}

interface SectionProps {
  title: string
  stepIndex: number
  onGoToStep: (step: number) => void
  children: React.ReactNode
}

function PreviewSection({ title, stepIndex, onGoToStep, children }: SectionProps) {
  return (
    <div className="border-b border-fog pb-4 last:border-0 last:pb-0">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-body font-semibold text-[13px] text-ink">{title}</h3>
        <button
          type="button"
          onClick={() => onGoToStep(stepIndex)}
          className="text-[12px] font-body text-fern hover:text-moss transition-colors"
        >
          Edit
        </button>
      </div>
      {children}
    </div>
  )
}

interface DataRowProps {
  label: string
  value?: string | number | boolean | string[] | null
}

function DataRow({ label, value }: DataRowProps) {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
    return null
  }

  let displayValue: string
  if (typeof value === 'boolean') {
    displayValue = value ? 'Yes' : 'No'
  } else if (Array.isArray(value)) {
    displayValue = value.join(', ')
  } else {
    displayValue = String(value)
  }

  return (
    <div className="flex gap-2 text-[12px]">
      <span style={{ color: 'var(--color-mid)' }} className="min-w-[140px]">
        {label}
      </span>
      <span className="text-ink font-body">{displayValue}</span>
    </div>
  )
}

const FARM_TYPE_LABELS: Record<string, string> = {
  dairy: 'Dairy Cattle',
  sheep_beef: 'Sheep & Beef',
}

const MILKING_FREQ_LABELS: Record<string, string> = {
  once_a_day: 'Once-a-day',
  twice_a_day: 'Twice-a-day',
  three_a_day: 'Three-a-day',
}

const OWNERSHIP_LABELS: Record<string, string> = {
  owner_operator: 'Owner-operator',
  corporate: 'Corporate',
  sharemilker: 'Sharemilker',
  contract_milker: 'Contract milker',
}

export function Step7Preview({ onComplete, onBack, onGoToStep, profileData }: Step7Props) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onComplete({})
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>
          Review your profile
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-mid)' }}>
          Check your details before completing your profile
        </p>
      </div>

      <div className="space-y-4">
        <PreviewSection title="Farm Type" stepIndex={0} onGoToStep={onGoToStep}>
          <DataRow
            label="Type"
            value={profileData.farm_type ? FARM_TYPE_LABELS[profileData.farm_type] ?? profileData.farm_type : undefined}
          />
        </PreviewSection>

        <PreviewSection title="Farm Details" stepIndex={1} onGoToStep={onGoToStep}>
          <div className="space-y-1">
            <DataRow label="Farm name" value={profileData.farm_name} />
            <DataRow label="Region" value={profileData.region} />
            <DataRow label="Herd size" value={profileData.herd_size} />
            <DataRow label="Shed type" value={profileData.shed_type} />
            <DataRow
              label="Milking frequency"
              value={profileData.milking_frequency ? MILKING_FREQ_LABELS[profileData.milking_frequency] ?? profileData.milking_frequency : undefined}
            />
            <DataRow label="Breed" value={profileData.breed} />
            <DataRow
              label="Property size"
              value={profileData.property_size_ha ? `${profileData.property_size_ha} ha` : undefined}
            />
            <DataRow
              label="Ownership type"
              value={profileData.ownership_type ? OWNERSHIP_LABELS[profileData.ownership_type] ?? profileData.ownership_type : undefined}
            />
          </div>
        </PreviewSection>

        <PreviewSection title="Culture & Team" stepIndex={2} onGoToStep={onGoToStep}>
          <div className="space-y-1">
            {profileData.culture_description && (
              <p className="text-[12px] text-ink font-body line-clamp-3">
                {profileData.culture_description}
              </p>
            )}
            <DataRow label="Team size" value={profileData.team_size} />
            {profileData.about_farm && !profileData.culture_description && (
              <p className="text-[12px] text-ink font-body line-clamp-3">
                {profileData.about_farm}
              </p>
            )}
            {!profileData.culture_description && !profileData.about_farm && !profileData.team_size && (
              <p className="text-[12px]" style={{ color: 'var(--color-light)' }}>
                Not provided
              </p>
            )}
          </div>
        </PreviewSection>

        <PreviewSection title="Accommodation" stepIndex={3} onGoToStep={onGoToStep}>
          <div className="space-y-1">
            <DataRow label="Available" value={profileData.accommodation_available} />
            {profileData.accommodation_available && (
              <>
                <DataRow label="Type" value={profileData.accommodation_type} />
                <DataRow label="Pets allowed" value={profileData.accommodation_pets} />
                <DataRow label="Couples" value={profileData.accommodation_couples} />
                <DataRow label="Families" value={profileData.accommodation_family} />
                <DataRow label="Utilities included" value={profileData.accommodation_utilities_included} />
              </>
            )}
          </div>
        </PreviewSection>
      </div>

      <div className="flex justify-between pt-2">
        {onBack && (
          <Button type="button" variant="ghost" size="md" onClick={onBack}>
            Back
          </Button>
        )}
        <Button type="submit" variant="primary" size="md" className={onBack ? '' : 'ml-auto'}>
          Complete Profile
        </Button>
      </div>
    </form>
  )
}
