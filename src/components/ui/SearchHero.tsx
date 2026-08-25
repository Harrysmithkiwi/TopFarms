'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Select } from '@/components/ui/Select'
import { NZ_REGIONS, type RoleType } from '@/lib/constants'

/**
 * Same family as audit F-17, and the same fix: a control that renders and does nothing.
 *
 * This hero was mounted with NO `onSearch` and NO `onPillClick`, so the search box, the region
 * dropdown and all five pills — the most prominent controls on `/jobs` — were inert. A seeker
 * who types a role and presses the button sees an unchanged list and reads it as "no jobs
 * match". Both callbacks are now passed by JobSearch and write registered filter keys, so each
 * produces an ActiveFilterPill and clears with everything else.
 *
 * The region list was a THIRD region vocabulary — nine hand-written slugs (`manawatu`,
 * `hawkes-bay`) matching neither `NZ_REGIONS` nor anything in the database. `jobs.region` is
 * compared by exact string equality, so every one of them would have returned zero jobs even
 * once the callback existed. Migration `100` unified the other four lists after the same
 * defect split one region across two buckets in prod; this is the fifth. Value === label from
 * the canonical list, exactly as FilterSidebar and the employer wizard do it.
 *
 * The pills were likewise mixed vocabulary — `Dairy` and `Sheep & Beef` are sectors, and
 * `sector` is not a registered filter key, so those two could not have produced a pill or been
 * cleared. All five are now `role_type` values taken from the canonical list.
 *
 * Region is CONTROLLED by the caller and applies on change; only the text box waits for the
 * button. Held locally it desynced from the URL the moment the sidebar touched `region`, and
 * pressing Search would then have silently overwritten a sidebar selection the seeker never
 * revisited. There is one region filter, and this dropdown is a second view of it.
 */
const DEFAULT_PILLS: RoleType[] = [
  'Farm Manager',
  'Herd Manager',
  'Farm Hand',
  'Relief Milker',
  'Calf Rearer',
]

const REGION_OPTIONS = [
  { value: 'all', label: 'All Regions' },
  ...NZ_REGIONS.map((r) => ({ value: r, label: r })),
]

interface SearchHeroProps {
  pills?: string[]
  onPillClick?: (pill: string) => void
  onSearch?: (query: string) => void
  /** Current region filter, or `''` for no region. Controlled — see the note above. */
  region?: string
  onRegionChange?: (region: string) => void
  className?: string
}

export function SearchHero({
  pills = DEFAULT_PILLS,
  onPillClick,
  onSearch,
  region = '',
  onRegionChange,
  className,
}: SearchHeroProps) {
  const [query, setQuery] = useState('')

  const handleSearch = () => {
    onSearch?.(query.trim())
  }

  return (
    <div
      className={cn('relative overflow-hidden px-4 py-12', className)}
      // ponytail: flat, not a gradient. The v13 original ran #123324 -> #0c2419, a
      // luminance delta of 0.012 — below what anyone sees on a hero panel — and those were
      // the last two references to the retired v13 green tokens anywhere in the product.
      // Deriving a second stop to preserve an invisible gradient would have cost a
      // color-mix() and bought nothing. If a real gradient is wanted here, add a
      // --color-brand-950 to the token file first; do not reach for a literal.
      style={{ background: 'var(--color-brand-900)' }}
    >
      {/* Radial glow overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          // The glow was a 25%-alpha fill of the retired v13 fern, a colour in no token
          // set. color-mix keeps the token as the source rather than re-spelling it as a
          // literal with an alpha baked in.
          background:
            'radial-gradient(ellipse at 30% 50%, color-mix(in srgb, var(--color-brand) 25%, transparent) 0%, transparent 60%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        <h1 className="mb-8 text-center text-[28px] leading-[1.2] font-normal text-white">
          Find your next farming opportunity
        </h1>

        {/* Search bar */}
        <div className="bg-surface mx-auto flex max-w-[680px] items-center gap-2 rounded-12 p-2 shadow-lg">
          <input
            type="search"
            aria-label="Search jobs, roles and farms"
            placeholder="Search jobs, roles, farms..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            // Enter submits. The button is not the only way in: typing a query and pressing
            // Return is what a search box teaches people to expect, and a box that swallows it
            // is the same silent no-op this component was fixed for.
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSearch()
              }
            }}
            className={cn(
              'text-text placeholder:text-text-muted min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-[14px]',
            )}
          />
          <Select
            placeholder="All Regions"
            ariaLabel="Filter by region"
            options={REGION_OPTIONS}
            value={region || 'all'}
            onValueChange={(v) => onRegionChange?.(v === 'all' ? '' : v)}
            className="w-[160px] shrink-0"
          />
          <button
            type="button"
            onClick={handleSearch}
            className="bg-brand-hover hover:bg-brand-900 rounded-8 px-4 py-2 text-[14px] font-semibold whitespace-nowrap text-white transition-colors"
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
              className="bg-white/15 hover:bg-white/25 cursor-pointer rounded-full border border-white/30 px-3 py-1 text-[13px] text-white transition-colors"
            >
              {pill}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
