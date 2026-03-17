import { useEffect, useRef, useState } from 'react'

/**
 * Intersection Observer scroll trigger hook.
 * One-shot: disconnects after first intersection.
 */
export function useInView(threshold = 0.2): {
  ref: React.RefObject<HTMLDivElement>
  inView: boolean
} {
  const ref = useRef<HTMLDivElement>(null!)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting) {
          setInView(true)
          // One-shot: disconnect after first intersection
          observer.disconnect()
        }
      },
      { threshold }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [threshold])

  return { ref, inView }
}
