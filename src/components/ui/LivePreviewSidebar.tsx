import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { supabase } from '@/lib/supabase'

interface MiniCardData {
  title: string
  farmName: string
  location: string
  salaryRange?: string
  tags?: string[]
}

interface MatchCriteria {
  region?: string
  shedTypes?: string[]
  hasAccommodation?: boolean
}

interface LivePreviewSidebarProps {
  completenessPercent: number
  miniCard?: MiniCardData
  matchCriteria?: MatchCriteria
  className?: string
}

function CompletenessMeter({ percent }: { percent: number }) {
  return (
    <div className="px-4 pt-4 pb-3">
      <h3 className="text-[13px] font-semibold text-text-subtle uppercase tracking-wide">
        Listing Preview
      </h3>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[13px] font-body text-brand">{percent}%</span>
      </div>
      <ProgressBar progress={percent} className="mt-2" />
    </div>
  )
}

function MiniJobCard({ title, farmName, location, salaryRange, tags }: MiniCardData) {
  return (
    <div className="px-4 py-3">
      <p className="text-[16px] font-semibold font-body text-text">{title}</p>
      <p className="text-[13px] text-text-muted font-body mt-1">{farmName}</p>
      <p className="text-[13px] text-text-subtle font-body mt-0.5">
        {location}
        {salaryRange && ` \u00B7 ${salaryRange}`}
      </p>
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="bg-surface-2 text-text text-[13px] rounded-full px-2 py-0.5 font-body"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function MiniCardPlaceholder() {
  return (
    <div className="px-4 py-3">
      <p className="text-[13px] text-text-subtle font-body italic">Complete fields to see preview</p>
    </div>
  )
}

interface EstimateData {
  seekers_in_region: number
  seekers_with_shed: number
  seekers_active: number
}

type EstimateState = 'idle' | 'loading' | 'done' | 'error'

function MatchPoolEstimate({ criteria }: { criteria?: MatchCriteria }) {
  const [estimate, setEstimate] = useState<EstimateData | null>(null)
  const [state, setState] = useState<EstimateState>('idle')

  useEffect(() => {
    const timer = setTimeout(async () => {
      setState('loading')
      const { data, error } = await supabase.rpc('estimate_match_pool', {
        p_region: criteria?.region ?? null,
        p_shed_types: criteria?.shedTypes ?? null,
        p_accommodation: criteria?.hasAccommodation ?? null,
      })
      if (!error && data) {
        setEstimate(data as EstimateData)
        setState('done')
      } else {
        setState('error')
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [criteria?.region, criteria?.shedTypes?.join(','), criteria?.hasAccommodation])

  const noMatches =
    estimate &&
    estimate.seekers_in_region === 0 &&
    estimate.seekers_with_shed === 0 &&
    estimate.seekers_active === 0

  return (
    <div className="px-4 py-3">
      <h3 className="text-[13px] font-semibold text-text-subtle uppercase tracking-wide pb-2">
        Match Pool Estimate
      </h3>
      {state === 'loading' ? (
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-brand-hover animate-spin" />
          <p className="text-[13px] font-body text-text-muted">Calculating...</p>
        </div>
      ) : estimate ? (
        <>
          <ul className="space-y-1">
            <li className="text-[14px] text-text font-body">{estimate.seekers_in_region} seekers in region</li>
            <li className="text-[14px] text-text font-body">{estimate.seekers_with_shed} with shed experience</li>
            <li className="text-[14px] text-text font-body">{estimate.seekers_active} actively looking</li>
          </ul>
          {noMatches && (
            <p className="text-[13px] text-text-muted italic font-body mt-2">
              Post your listing to attract seekers in this area
            </p>
          )}
        </>
      ) : (
        <p className="text-[13px] text-text-subtle italic font-body">
          Fill in fields to see estimates
        </p>
      )}
    </div>
  )
}

function AITipBox() {
  return (
    <div className="p-4">
      <div className="bg-ai-bg rounded-[8px] p-3">
        <p className="text-[13px] text-text font-body">
          Tip: Listings with accommodation details get 40% more applications
        </p>
      </div>
    </div>
  )
}

/**
 * LivePreviewSidebar - Sticky sidebar for the Post Job wizard (steps 2-5).
 *
 * IMPORTANT: The parent container must NOT have `overflow: hidden` or `overflow: auto`,
 * as this will break the `position: sticky` behaviour. The sidebar needs the scroll
 * container to be a direct ancestor without overflow clipping.
 */
export function LivePreviewSidebar({
  completenessPercent,
  miniCard,
  matchCriteria,
  className,
}: LivePreviewSidebarProps) {
  return (
    <aside
      className={cn(
        'sticky top-6 w-[320px] bg-surface rounded-[14px] border border-border overflow-hidden',
        className,
      )}
    >
      <CompletenessMeter percent={completenessPercent} />

      <div className="border-t border-border" />

      {miniCard ? <MiniJobCard {...miniCard} /> : <MiniCardPlaceholder />}

      <div className="border-t border-border" />

      <MatchPoolEstimate criteria={matchCriteria} />

      <div className="border-t border-border" />

      <AITipBox />
    </aside>
  )
}
