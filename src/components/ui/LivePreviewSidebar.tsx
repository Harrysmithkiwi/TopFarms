import { cn } from '@/lib/utils'
import { ProgressBar } from '@/components/ui/ProgressBar'

interface MiniCardData {
  title: string
  farmName: string
  location: string
  salaryRange?: string
  tags?: string[]
}

interface LivePreviewSidebarProps {
  completenessPercent: number
  miniCard?: MiniCardData
  className?: string
}

function CompletenessMeter({ percent }: { percent: number }) {
  return (
    <div className="px-4 pt-4 pb-3">
      <h3 className="text-[13px] font-semibold text-light uppercase tracking-wide">
        Listing Preview
      </h3>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[13px] font-body text-moss">{percent}%</span>
      </div>
      <ProgressBar progress={percent} className="mt-2" />
    </div>
  )
}

function MiniJobCard({ title, farmName, location, salaryRange, tags }: MiniCardData) {
  return (
    <div className="px-4 py-3">
      <p className="text-[16px] font-semibold font-body text-ink">{title}</p>
      <p className="text-[13px] text-mid font-body mt-1">{farmName}</p>
      <p className="text-[13px] text-light font-body mt-0.5">
        {location}
        {salaryRange && ` \u00B7 ${salaryRange}`}
      </p>
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="bg-fog text-ink text-[13px] rounded-full px-2 py-0.5 font-body"
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
      <p className="text-[13px] text-light font-body italic">Complete fields to see preview</p>
    </div>
  )
}

function MatchPoolEstimate() {
  return (
    <div className="px-4 py-3">
      <h3 className="text-[13px] font-semibold text-light uppercase tracking-wide pb-2">
        Match Pool Estimate
      </h3>
      <ul className="space-y-1">
        <li className="text-[14px] text-ink font-body">47 seekers in region</li>
        <li className="text-[14px] text-ink font-body">12 with shed experience</li>
        <li className="text-[14px] text-ink font-body">8 actively looking</li>
      </ul>
      <p className="text-[13px] text-light italic font-body mt-2">Estimates available soon</p>
    </div>
  )
}

function AITipBox() {
  return (
    <div className="p-4">
      <div className="bg-purple-lt rounded-[8px] p-3">
        <p className="text-[13px] text-ink font-body">
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
  className,
}: LivePreviewSidebarProps) {
  return (
    <aside
      className={cn(
        'sticky top-6 w-[320px] bg-white rounded-[14px] border border-fog overflow-hidden',
        className,
      )}
    >
      <CompletenessMeter percent={completenessPercent} />

      <div className="border-t border-fog" />

      {miniCard ? <MiniJobCard {...miniCard} /> : <MiniCardPlaceholder />}

      <div className="border-t border-fog" />

      <MatchPoolEstimate />

      <div className="border-t border-fog" />

      <AITipBox />
    </aside>
  )
}
