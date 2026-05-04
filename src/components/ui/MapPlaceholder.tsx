import { MapPin } from 'lucide-react'

interface MapPlaceholderProps {
  region?: string
  distance?: string
}

export function MapPlaceholder({ region, distance }: MapPlaceholderProps) {
  return (
    <div className="relative h-[160px] bg-surface-2 rounded-[12px] flex flex-col items-center justify-center">
      <MapPin className="w-6 h-6 text-text-subtle mb-1" />
      <span className="text-[12px] font-body text-text-subtle">Map coming soon</span>
      {(distance || region) && (
        <div className="absolute bottom-2 right-2 bg-surface border border-border rounded-full px-2 py-1 text-[12px] font-body text-text-muted">
          {distance ?? region}
        </div>
      )}
    </div>
  )
}
