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
  resultCount?: number
  onClose?: () => void
  isMobile?: boolean
}

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
  resultCount,
  onClose,
  isMobile = false,
}: FilterSidebarProps) {
  const [showAllRegions, setShowAllRegions] = useState(false)

  // Read current filter values from URL params
  const selectedShedTypes = searchParams.getAll('shed_type')
  const selectedRegions = searchParams.getAll('region')
  const selectedContractTypes = searchParams.getAll('contract_type')
  const selectedHerdSizes = searchParams.getAll('herd_size')
  const salaryMin = searchParams.get('salary_min')
  const salaryMax = searchParams.get('salary_max')
  const accommodation = searchParams.get('accommodation')
  const couples = searchParams.get('couples')
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
    const keys = [
      'shed_type', 'region', 'contract_type', 'herd_size',
      'salary_min', 'salary_max', 'accommodation', 'couples',
      'visa', 'dairynz_level', 'pets', 'family_friendly',
    ]
    keys.forEach((key) => onFilterChange(key, null))
  }

  const hasActiveFilters =
    selectedShedTypes.length > 0 ||
    selectedRegions.length > 0 ||
    selectedContractTypes.length > 0 ||
    selectedHerdSizes.length > 0 ||
    salaryMin !== null ||
    salaryMax !== null ||
    accommodation !== null ||
    couples !== null ||
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

        {/* 1. Shed Type */}
        <details open className="border-t border-fog first:border-t-0 py-4">
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

        {/* 2. Region */}
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

        {/* 3. Contract Type */}
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

        {/* 4. Salary Range */}
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

        {/* 5. Herd Size */}
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

        {/* 6. Accommodation */}
        <details open className="border-t border-fog py-4">
          <summary className="cursor-pointer list-none flex items-center justify-between mb-3">
            <SectionHeader title="Accommodation" />
          </summary>
          <div className="flex flex-col gap-3">
            <Toggle
              label="On-farm accommodation available"
              checked={accommodation === 'true'}
              onCheckedChange={(val) =>
                onFilterChange('accommodation', val ? 'true' : null)
              }
            />
            {accommodation === 'true' && (
              <div className="pl-4 flex flex-col gap-2 border-l-2 border-moss/20">
                <Toggle
                  label="Couples welcome"
                  checked={couples === 'true'}
                  onCheckedChange={(val) =>
                    onFilterChange('couples', val ? 'true' : null)
                  }
                />
                <Toggle
                  label="Pets welcome"
                  checked={searchParams.get('pets') === 'true'}
                  onCheckedChange={(val) =>
                    onFilterChange('pets', val ? 'true' : null)
                  }
                />
                <Toggle
                  label="Family friendly"
                  checked={searchParams.get('family_friendly') === 'true'}
                  onCheckedChange={(val) =>
                    onFilterChange('family_friendly', val ? 'true' : null)
                  }
                />
              </div>
            )}
          </div>
        </details>

        {/* 7. Visa Sponsorship */}
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

        {/* 8. DairyNZ Level */}
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
              { value: '', label: 'Any level' },
              ...DAIRYNZ_LEVELS.map((l) => ({ value: l.value, label: l.label })),
            ]}
            value={dairynzLevel ?? ''}
            onValueChange={(val) =>
              onFilterChange('dairynz_level', val || null)
            }
          />
        </details>

        {/* 9. Couples Welcome (standalone) */}
        {accommodation !== 'true' && (
          <details open className="border-t border-fog py-4">
            <summary className="cursor-pointer list-none flex items-center justify-between mb-3">
              <SectionHeader title="Couples Welcome" />
            </summary>
            <Toggle
              label="Couples welcome"
              checked={couples === 'true'}
              onCheckedChange={(val) =>
                onFilterChange('couples', val ? 'true' : null)
              }
            />
          </details>
        )}

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
