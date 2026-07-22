import { useEffect } from 'react'

const DEFAULT_TITLE = 'TopFarms — NZ Agricultural Jobs'

/**
 * Per-route document title + meta description for the SPA (TF-005).
 * Restores the defaults on unmount so routes without the hook fall back cleanly.
 */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const prevDescription = meta?.content
    if (meta && description) meta.content = description
    return () => {
      document.title = DEFAULT_TITLE
      if (meta && prevDescription !== undefined) meta.content = prevDescription
    }
  }, [title, description])
}
