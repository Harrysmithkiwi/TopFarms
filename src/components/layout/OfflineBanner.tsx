import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

// Phase 5.7 — offline.
//
// "Works on a rural connection" is this product's stated audience condition, not
// a hypothetical. Before this, losing connectivity produced the same silence as
// any other failure: requests failed, screens rendered empty, and nothing told
// the user their phone had dropped off the network rather than the farm having
// no jobs.
//
// Deliberately global and deliberately dumb. It reports connectivity; it does
// not retry anything itself — per-screen retry belongs to ErrorState (5.6),
// which is the affordance a user reaches for once this banner explains why.
//
// navigator.onLine is a weak signal: true means "has a network interface", not
// "can reach Supabase". It gives no false negatives though — offline is always
// really offline — so it is sound for telling someone their connection dropped,
// and unsound for claiming it came back. Hence the banner announces the loss and
// leaves recovery to a real request.

export function OfflineBanner() {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine)

  useEffect(() => {
    const goOffline = () => setOffline(true)
    const goOnline = () => setOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="offline-banner"
      className="bg-warn-bg text-warn-text-on-bg fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 px-4 py-2"
    >
      <WifiOff className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <p className="font-body text-label font-medium">
        You&rsquo;re offline. We&rsquo;ll keep trying — anything you were reading is still here.
      </p>
    </div>
  )
}
