import { useState } from 'react'
import * as Slider from '@radix-ui/react-slider'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/Checkbox'
import { Toggle } from '@/components/ui/Toggle'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import {
  SHED_TYPES,
  HERD_SIZE_BUCKETS,
  DAIRYNZ_LEVELS,
} from '@/types/domain'
import { NZ_REGIONS } from '@/lib/constants'

interface FilterSidebarProps {
  searchParams: URLSearchParams
  onFilterChange: (key: string, value: string | string[] | null) => void
  onClearAll: () => void
  resultCount?: number
  onClose?: () => void
  isMobile?: boolean
}

const ROLE_TYPES = [
  { value: 'farm_manager', label: 'Farm Manager' },
  { value: 'head_stockman', label: 'Head Stockman' },
  { value: '2ic', label: '2IC' },
  { value: 'herd_manager', label: 'Herd Manager' },
  { value: 'dairy_assistant', label: 'Dairy Assistant' },
  { value: 'trainee', label: 'Trainee' },
  { value: 'relief_milker', label: 'Relief Milker' },
  { value: 'couple', label: 'Couple Position' },
]

const EXTRAS_FILTERS = [
  { key: 'mentorship', label: 'Mentorship available' },
  { key: 'vehicle', label: 'Vehicle provided' },
  { key: 'dairynz_pathway', label: 'DairyNZ pathway' },
  { key: 'posted_recent', label: 'Posted in last 7 days' },
]

const ACCOMMODATION_OPTIONS = [
  { value: 'house', label: 'House' },
  { value: 'cottage', label: 'Cottage' },
  { value: 'pet_friendly', label: 'Pet-friendly' },
  { value: 'couples', label: 'Couples welcome' },
  { value: 'family', label: 'Family-friendly' },
]

const CONTRACT_TYPES = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'contract', label: 'Contract' },
  { value: 'casual', label: 'Casual' },
]

const SALARY_MIN = 30000
const SALARY_MAX = 120000
const SALARY_STEP = 5000

function formatSalaryLabel(value: number): string {
  return `$${(value / 1000).toFixed(0)}k`
}

function SectionHeader({ title }: { title: string }) {
  return (
    <span className="text-[13px] font-body font-semibold" style={{ color: 'var(--color-ink)' }}>
      {title}
    </span>
  )
}

export function FilterSidebar({
  searchParams,
  onFilterChange,
  onClearAll,
  resultCount,
  onClose,
  isMobile = false,
}: FilterSidebarProps) {
  const [showAllRegions, setShowAllRegions] = useState(false)

  // Read current filter values from URL params
  const selectedRoleTypes = searchParams.getAll('role_type')
  const selectedShedTypes = searchParams.getAll('shed_type')
  const selectedRegions = searchParams.getAll('region')
  const selectedContractTypes = searchParams.getAll('contract_type')
  const selectedHerdSizes = searchParams.getAll('herd_size')
  const selectedAccommodationTypes = searchParams.getAll('accommodation_type')
  const salaryMin = searchParams.get('salary_min')
  const salaryMax = searchParams.get('salary_max')
  const visa = searchParams.get('visa')
  const dairynzLevel = searchParams.get('dairynz_level')

  const currentSalaryMin = salaryMin ? Number(salaryMin) : SALARY_MIN
  const currentSalaryMax = salaryMax ? Number(salaryMax) : SALARY_MAX

  function toggleMultiValue(key: string, current: string[], value: string) {
    if (current.includes(value)) {
      const next = current.filter((v) => v !== value)
      onFilterChange(key, next.length ? next : null)
    } else {
      onFilterChange(key, [...current, value])
    }
  }

  function handleSalaryChange(values: number[]) {
    const [min, max] = values
    // Use a special '__salary__' key to signal atomic update of both salary params
    onFilterChange('__salary__', [String(min), String(max)])
  }

  function handleClearAll() {
    onClearAll()
  }

  const hasActiveFilters =
    selectedRoleTypes.length > 0 ||
    selectedAccommodationTypes.length > 0 ||
    searchParams.get('mentorship') !== null ||
    searchParams.get('vehicle') !== null ||
    searchParams.get('dairynz_pathway') !== null ||
    searchParams.get('posted_recent') !== null ||
    selectedShedTypes.length > 0 ||
    selectedRegions.length > 0 ||
    selectedContractTypes.length > 0 ||
    selectedHerdSizes.length > 0 ||
    salaryMin !== null ||
    salaryMax !== null ||
    visa !== null ||
    dairynzLevel !== null

  const visibleRegions = showAllRegions ? NZ_REGIONS : NZ_REGIONS.slice(0, 6)

  return (
    <div
      className={cn(
        'flex flex-col bg-white',
        isMobile ? 'h-full' : 'h-fit sticky top-4',
      )}
    >
      {/* Mobile header */}
      {isMobile && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-fog">
          <span className="text-[15px] font-body font-semibold text-ink">Filters</span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-mist transition-colors"
            aria-label="Close filters"
          >
            <X className="w-4 h-4 text-mid" />
          </button>
        </div>
      )}

      {/* Scrollable filter sections */}
      <div className={cn('flex-1 overflow-y-auto', isMobile ? 'px-4' : '')}>

        {/* 1. Role Type */}
        <details open className="border-t border-fog first:border-t-0 py-4">
          <summary className="cursor-pointer list-none flex items-center justify-between mb-3">
            <SectionHeader title="Role Type" />
          </summary>
          <div className="flex flex-col gap-2">
            {ROLE_TYPES.map((type) => (
              <Checkbox
                key={type.value}
                label={type.label}
                checked={selectedRoleTypes.includes(type.value)}
                onCheckedChange={() =>
                  toggleMultiValue('role_type', selectedRoleTypes, type.value)
                }
              />
            ))}
          </div>
        </details>

        {/* 2. Extras */}
        <details open className="border-t border-fog py-4">
          <summary className="cursor-pointer list-none flex items-center justify-between mb-3">
            <SectionHeader title="Extras" />
          </summary>
          <div className="flex flex-col gap-3">
            {EXTRAS_FILTERS.map((filter) => (
              <Toggle
                key={filter.key}
                label={filter.label}
                checked={searchParams.get(filter.key) === 'true'}
                onCheckedChange={(val) =>
                  onFilterChange(filter.key, val ? 'true' : null)
                }
              />
            ))}
          </div>
        </details>

        {/* 3. Shed Type */}
        <details open className="border-t border-fog py-4">
          <summary className="cursor-pointer list-none flex items-center justify-between mb-3">
            <SectionHeader title="Shed Type" />
          </summary>
          <div className="flex flex-col gap-2">
            {SHED_TYPES.map((type) => (
              <Checkbox
                key={type.value}
                label={type.label}
                checked={selectedShedTypes.includes(type.value)}
                onCheckedChange={() =>
                  toggleMultiValue('shed_type', selectedShedTypes, type.value)
                }
              />
            ))}
          </div>
        </details>

        {/* 4. Region */}
        <details open className="border-t border-fog py-4">
          <summary className="cursor-pointer list-none flex items-center justify-between mb-3">
            <SectionHeader title="Region" />
          </summary>
          <div className="flex flex-col gap-2">
            {visibleRegions.map((region) => (
              <Checkbox
                key={region}
                label={region}
                checked={selectedRegions.includes(region)}
                onCheckedChange={() =>
                  toggleMultiValue('region', selectedRegions, region)
                }
              />
            ))}
          </div>
          {NZ_REGIONS.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAllRegions((prev) => !prev)}
              className="mt-2 text-[12px] font-body text-moss hover:underline"
            >
              {showAllRegions ? 'Show fewer' : `Show all ${NZ_REGIONS.length} regions`}
            </button>
          )}
        </details>

        {/* 5. Contract Type */}
        <details open className="border-t border-fog py-4">
          <summary className="cursor-pointer list-none flex items-center justify-between mb-3">
            <SectionHeader title="Contract Type" />
          </summary>
          <div className="flex flex-col gap-2">
            {CONTRACT_TYPES.map((type) => (
              <Checkbox
                key={type.value}
                label={type.label}
                checked={selectedContractTypes.includes(type.value)}
                onCheckedChange={() =>
                  toggleMultiValue('contract_type', selectedContractTypes, type.value)
                }
              />
            ))}
          </div>
        </details>

        {/* 6. Salary Range */}
        <details open className="border-t border-fog py-4">
          <summary className="cursor-pointer list-none flex items-center justify-between mb-3">
            <SectionHeader title="Salary Range" />
          </summary>
          <div className="px-1">
            <div className="text-[13px] font-body text-mid mb-3">
              {formatSalaryLabel(currentSalaryMin)} – {formatSalaryLabel(currentSalaryMax)} /year
            </div>
            <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-5"
              min={SALARY_MIN}
              max={SALARY_MAX}
              step={SALARY_STEP}
              value={[currentSalaryMin, currentSalaryMax]}
              onValueChange={handleSalaryChange}
              minStepsBetweenThumbs={1}
            >
              <Slider.Track className="bg-fog relative grow rounded-full h-[4px]">
                <Slider.Range className="absolute bg-moss rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb
                className="block w-[16px] h-[16px] bg-white border-[2px] border-moss rounded-full shadow-sm hover:bg-mist focus:outline-none focus:ring-[3px] focus:ring-[rgba(74,124,47,0.2)] cursor-pointer"
                aria-label="Salary minimum"
              />
              <Slider.Thumb
                className="block w-[16px] h-[16px] bg-white border-[2px] border-moss rounded-full shadow-sm hover:bg-mist focus:outline-none focus:ring-[3px] focus:ring-[rgba(74,124,47,0.2)] cursor-pointer"
                aria-label="Salary maximum"
              />
            </Slider.Root>
          </div>
        </details>

        {/* 7. Herd Size */}
        {/* herd_size: multi-select with OR semantics. See KNOWN_QUIRKS.md QUIRK-01. */}
        <details open className="border-t border-fog py-4">
          <summary className="cursor-pointer list-none flex items-center justify-between mb-3">
            <SectionHeader title="Herd Size" />
          </summary>
          <div className="flex flex-col gap-2">
            {HERD_SIZE_BUCKETS.map((bucket) => (
              <Checkbox
                key={bucket.value}
                label={bucket.label}
                checked={selectedHerdSizes.includes(bucket.value)}
                onCheckedChange={() =>
                  toggleMultiValue('herd_size', selectedHerdSizes, bucket.value)
                }
              />
            ))}
          </div>
        </details>

        {/* 8. Accommodation */}
        <details open className="border-t border-fog py-4">
          <summary className="cursor-pointer list-none flex items-center justify-between mb-3">
            <SectionHeader title="Accommodation" />
          </summary>
          <div className="flex flex-col gap-2">
            {ACCOMMODATION_OPTIONS.map((option) => (
              <Checkbox
                key={option.value}
                label={option.label}
                checked={selectedAccommodationTypes.includes(option.value)}
                onCheckedChange={() =>
                  toggleMultiValue('accommodation_type', selectedAccommodationTypes, option.value)
                }
              />
            ))}
          </div>
        </details>

        {/* 9. Visa Sponsorship */}
        <details open className="border-t border-fog py-4">
          <summary className="cursor-pointer list-none flex items-center justify-between mb-3">
            <SectionHeader title="Visa Sponsorship" />
          </summary>
          <Toggle
            label="Visa sponsorship offered"
            checked={visa === 'true'}
            onCheckedChange={(val) => onFilterChange('visa', val ? 'true' : null)}
          />
        </details>

        {/* 10. DairyNZ Level */}
        <details open className="border-t border-fog py-4">
          <summary className="cursor-pointer list-none flex items-center justify-between mb-3">
            <SectionHeader title="DairyNZ Level" />
          </summary>
          <p className="text-[11px] font-body text-light mb-2">
            Show jobs you qualify for
          </p>
          <Select
            placeholder="Any level"
            options={[
              { value: 'all', label: 'Any level' },
              ...DAIRYNZ_LEVELS.map((l) => ({ value: l.value, label: l.label })),
            ]}
            value={dairynzLevel ?? 'all'}
            onValueChange={(val) =>
              onFilterChange('dairynz_level', val === 'all' ? null : val)
            }
          />
        </details>

        {/* Clear All */}
        {hasActiveFilters && (
          <div className="border-t border-fog py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="w-full text-mid hover:text-ink"
            >
              Clear all filters
            </Button>
          </div>
        )}
      </div>

      {/* Mobile footer — sticky "Show results" button */}
      {isMobile && onClose && (
        <div className="border-t border-fog px-4 py-3 bg-white">
          <Button variant="primary" size="md" onClick={onClose} className="w-full">
            {resultCount !== undefined ? `Show ${resultCount} results` : 'Show results'}
          </Button>
        </div>
      )}
    </div>
  )
}
