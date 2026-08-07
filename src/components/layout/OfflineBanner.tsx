import { useSyncExternalStore } from 'react'
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

// v13 stage 3b: read through useSyncExternalStore rather than useState +
// useEffect. The server has no navigator, so it always renders "online"; a
// cached page opened offline would otherwise hydrate the banner against server
// HTML without it. getServerSnapshot makes that agreement explicit instead of
// accidental, and the subscription replaces the effect rather than adding one.
function subscribe(fn: () => void) {
  window.addEventListener('offline', fn)
  window.addEventListener('online', fn)
  return () => {
    window.removeEventListener('offline', fn)
    window.removeEventListener('online', fn)
  }
}

const isOffline = () => !navigator.onLine
const isOnlineOnServer = () => false

export function OfflineBanner() {
  const offline = useSyncExternalStore(subscribe, isOffline, isOnlineOnServer)

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
