'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Select } from '@/components/ui/Select'

const DEFAULT_PILLS = ['Dairy', 'Sheep & Beef', 'Farm Manager', 'Herd Manager', 'Relief Milker']

const NZ_REGIONS = [
  { value: 'all', label: 'All Regions' },
  { value: 'northland', label: 'Northland' },
  { value: 'auckland', label: 'Auckland' },
  { value: 'waikato', label: 'Waikato' },
  { value: 'bay-of-plenty', label: 'Bay of Plenty' },
  { value: 'hawkes-bay', label: "Hawke's Bay" },
  { value: 'manawatu', label: 'Manawatu' },
  { value: 'canterbury', label: 'Canterbury' },
  { value: 'otago', label: 'Otago' },
]

interface SearchHeroProps {
  pills?: string[]
  onPillClick?: (pill: string) => void
  onSearch?: (query: string, region: string) => void
  className?: string
}

export function SearchHero({
  pills = DEFAULT_PILLS,
  onPillClick,
  onSearch,
  className,
}: SearchHeroProps) {
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('all')

  const handleSearch = () => {
    onSearch?.(query, region === 'all' ? '' : region)
  }

  return (
    <div
      className={cn('relative overflow-hidden px-4 py-12', className)}
      style={{
        background: 'linear-gradient(135deg, var(--color-brand-900) 0%, #1a3a10 100%)',
      }}
    >
      {/* Radial glow overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 30% 50%, rgba(74,124,47,0.25) 0%, transparent 60%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        <h1 className="font-display mb-8 text-center text-[28px] leading-[1.2] font-normal text-white">
          Find your next farming opportunity
        </h1>

        {/* Search bar */}
        <div className="bg-surface mx-auto flex max-w-[680px] items-center gap-2 rounded-[12px] p-2 shadow-lg">
          <input
            type="text"
            placeholder="Search jobs, roles, farms..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={cn(
              'font-body text-text placeholder:text-text-subtle min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-[14px]',
              'focus:outline-none',
            )}
          />
          <Select
            placeholder="All Regions"
            options={NZ_REGIONS}
            value={region}
            onValueChange={setRegion}
            className="w-[160px] shrink-0"
          />
          <button
            type="button"
            onClick={handleSearch}
            className="bg-brand font-body hover:bg-brand/90 rounded-[8px] px-4 py-2 text-[14px] font-semibold whitespace-nowrap text-white transition-colors"
          >
            Search Jobs
          </button>
        </div>

        {/* Quick-filter pills */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {pills.map((pill) => (
            <button
              key={pill}
              type="button"
              onClick={() => onPillClick?.(pill)}
              className="bg-surface/15 font-body hover:bg-surface/25 cursor-pointer rounded-full border border-white/30 px-3 py-1 text-[13px] text-white transition-colors"
            >
              {pill}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
