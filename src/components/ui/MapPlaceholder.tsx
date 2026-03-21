import { MapPin } from 'lucide-react'

interface MapPlaceholderProps {
  region?: string
  distance?: string
}

export function MapPlaceholder({ region, distance }: MapPlaceholderProps) {
  return (
    <div className="relative h-[160px] bg-mist rounded-[12px] flex flex-col items-center justify-center">
      <MapPin className="w-6 h-6 text-light mb-1" />
      <span className="text-[12px] font-body text-light">Map coming soon</span>
      {(distance || region) && (
        <div className="absolute bottom-2 right-2 bg-white border border-fog rounded-full px-2 py-1 text-[12px] font-body text-mid">
          {distance ?? region}
        </div>
      )}
    </div>
  )
}
