/**
 * Return-to plumbing for the auth funnel (§25 of the candidate UX brief).
 *
 * Intent: "Apply → sign in → back at the job", never "sign in → generic
 * dashboard → find the job again". Two transports, because the funnel has two
 * shapes:
 *
 * 1. Same-tab navigation (ProtectedRoute bounce, login link with `?next=`):
 *    the target rides along as router state / query param and is consumed by
 *    Login directly.
 * 2. Round trips that destroy the tab's JS context (OAuth redirect, email
 *    verification opened from an inbox): the target is parked in localStorage
 *    and consumed by whichever auth page the user lands back on (ConfirmEmail,
 *    SelectRole). Same-browser only — a verify link opened on another device
 *    falls back to the dashboard, which is correct.
 *
 * Only same-origin path targets are honoured; anything else (absolute URLs,
 * protocol-relative `//`) is dropped so a crafted link cannot bounce a fresh
 * session off-site.
 */

const KEY = 'tf_return_to'
const MAX_AGE_MS = 60 * 60 * 1000 // 1h — stale intent is worse than no intent

export function sanitizeReturnTo(path: string | null | undefined): string | null {
  if (!path) return null
  // '/\\' guards a future consumer that assigns location.href directly:
  // browsers normalise backslashes, turning '/\\evil.com' protocol-relative.
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return null
  return path
}

export function storeReturnTo(path: string | null | undefined): void {
  const clean = sanitizeReturnTo(path)
  if (!clean) return
  try {
    localStorage.setItem(KEY, JSON.stringify({ path: clean, ts: Date.now() }))
  } catch {
    // Storage unavailable (private mode etc.) — the fallback is the dashboard.
  }
}

/** Read AND clear. Returns null when absent, expired, or unparseable. */
export function consumeReturnTo(): string | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    localStorage.removeItem(KEY)
    const { path, ts } = JSON.parse(raw) as { path?: string; ts?: number }
    if (typeof ts !== 'number' || Date.now() - ts > MAX_AGE_MS) return null
    return sanitizeReturnTo(path)
  } catch {
    return null
  }
}
