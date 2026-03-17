import { useEffect, useRef, useState } from 'react'

/**
 * Count-up animation hook using requestAnimationFrame.
 * Respects prefers-reduced-motion: immediately returns target when active.
 */
export function useCountUp(target: number, duration = 1800, active = false): number {
  const [count, setCount] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active) return

    // Respect prefers-reduced-motion
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced) {
      setCount(target)
      return
    }

    const animate = (timestamp: number) => {
      if (startRef.current === null) {
        startRef.current = timestamp
      }

      const elapsed = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)

      // Ease-out cubic: 1 - (1 - progress)^3
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
      startRef.current = null
    }
  }, [target, duration, active])

  return count
}
