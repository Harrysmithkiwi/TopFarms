import { useEffect, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * useFocusTrap — accessibility contract shared by every admin overlay (the lead
 * drawers, ProfileDrawer, the mobile nav). When `active`:
 *  - moves focus into the container on open (first focusable, else the container),
 *  - traps Tab / Shift+Tab so focus can't escape to the background,
 *  - restores focus to the element that was focused before opening (the trigger).
 *
 * Presentational shells stay dumb — they pass a ref and a boolean; this owns the
 * keyboard contract in one place so all overlays inherit it identically.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active = true) {
  useEffect(() => {
    if (!active) return
    const node = ref.current
    if (!node) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    // Move focus in. Prefer the first focusable child; fall back to the container
    // itself (needs a tabindex, set by the caller or forced here).
    const focusables = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )
    const first = focusables()[0]
    if (first) first.focus()
    else {
      node.setAttribute('tabindex', '-1')
      node.focus()
    }

    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const list = focusables()
      if (list.length === 0) {
        e.preventDefault()
        return
      }
      const firstEl = list[0]
      const lastEl = list[list.length - 1]
      // Shift+Tab off the first element wraps to the last; Tab off the last wraps
      // to the first. Keeps the ring closed inside the overlay.
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    node.addEventListener('keydown', onKey)
    return () => {
      node.removeEventListener('keydown', onKey)
      // Restore focus to the trigger so keyboard users land where they left off.
      previouslyFocused?.focus?.()
    }
  }, [ref, active])
}
