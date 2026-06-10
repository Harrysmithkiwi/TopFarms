import { MapPin } from 'lucide-react'

interface MapPlaceholderProps {
  region?: string
  distance?: string
}

export function MapPlaceholder({ region, distance }: MapPlaceholderProps) {
  return (
    <div className="bg-surface-2 relative flex h-[160px] flex-col items-center justify-center rounded-[12px]">
      <MapPin className="text-text-subtle mb-1 h-6 w-6" />
      <span className="font-body text-text-subtle text-[12px]">Map coming soon</span>
      {(distance || region) && (
        <div className="bg-surface border-border font-body text-text-muted absolute right-2 bottom-2 rounded-full border px-2 py-1 text-[12px]">
          {distance ?? region}
        </div>
      )}
    </div>
  )
}
