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
      <h3 className="text-text-subtle text-[13px] font-semibold tracking-wide uppercase">
        Listing Preview
      </h3>
      <div className="mt-2 flex items-center justify-between">
        <span className="font-body text-brand text-[13px]">{percent}%</span>
      </div>
      <ProgressBar progress={percent} className="mt-2" />
    </div>
  )
}

function MiniJobCard({ title, farmName, location, salaryRange, tags }: MiniCardData) {
  return (
    <div className="px-4 py-3">
      <p className="font-body text-text text-[16px] font-semibold">{title}</p>
      <p className="text-text-muted font-body mt-1 text-[13px]">{farmName}</p>
      <p className="text-text-subtle font-body mt-0.5 text-[13px]">
        {location}
        {salaryRange && ` \u00B7 ${salaryRange}`}
      </p>
      {tags && tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="bg-surface-2 text-text font-body rounded-full px-2 py-0.5 text-[13px]"
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
      <p className="text-text-subtle font-body text-[13px] italic">
        Complete fields to see preview
      </p>
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
      <h3 className="text-text-subtle pb-2 text-[13px] font-semibold tracking-wide uppercase">
        Match Pool Estimate
      </h3>
      {state === 'loading' ? (
        <div className="flex items-center gap-2">
          <Loader2 className="text-brand-hover h-4 w-4 animate-spin" />
          <p className="font-body text-text-muted text-[13px]">Calculating...</p>
        </div>
      ) : estimate ? (
        <>
          <ul className="space-y-1">
            <li className="text-text font-body text-[14px]">
              {estimate.seekers_in_region} seekers in region
            </li>
            <li className="text-text font-body text-[14px]">
              {estimate.seekers_with_shed} with shed experience
            </li>
            <li className="text-text font-body text-[14px]">
              {estimate.seekers_active} actively looking
            </li>
          </ul>
          {noMatches && (
            <p className="text-text-muted font-body mt-2 text-[13px] italic">
              Post your listing to attract seekers in this area
            </p>
          )}
        </>
      ) : (
        <p className="text-text-subtle font-body text-[13px] italic">
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
        <p className="text-text font-body text-[13px]">
          Tip: accommodation details are one of the first things seekers look for
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
        'bg-surface border-border sticky top-6 w-[320px] overflow-hidden rounded-[14px] border',
        className,
      )}
    >
      <CompletenessMeter percent={completenessPercent} />

      <div className="border-border border-t" />

      {miniCard ? <MiniJobCard {...miniCard} /> : <MiniCardPlaceholder />}

      <div className="border-border border-t" />

      <MatchPoolEstimate criteria={matchCriteria} />

      <div className="border-border border-t" />

      <AITipBox />
    </aside>
  )
}
