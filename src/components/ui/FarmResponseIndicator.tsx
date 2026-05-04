import { Eye } from 'lucide-react'

interface FarmResponseIndicatorProps {
  viewedAt: string | null
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'less than an hour ago'
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

export function FarmResponseIndicator({ viewedAt }: FarmResponseIndicatorProps) {
  if (viewedAt) {
    return (
      <p className="flex items-center gap-1.5 text-[12px] font-body text-text-subtle mt-1">
        <Eye className="w-3.5 h-3.5 inline-block" />
        Viewed by employer {formatTimeAgo(viewedAt)}
      </p>
    )
  }

  return (
    <p className="text-[12px] font-body text-text-subtle italic mt-1">
      Not yet viewed
    </p>
  )
}
