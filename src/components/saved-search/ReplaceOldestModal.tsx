import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

export interface ReplaceOldestModalProps {
  isOpen: boolean
  onClose: () => void
  onReplaced: () => void
  /** User who hit the cap. */
  userId: string
  /** Pending save: name + URLSearchParams snapshot waiting to insert after delete. */
  pending: { name: string; searchParams: string } | null
}

/**
 * Phase 17 SRCH-13 — 10-cap replace-oldest modal.
 *
 * Triggered when the user hits the soft cap (count >= 10). Shows the OLDEST
 * saved-search name + Cancel + Replace CTAs. Replace deletes the oldest then
 * inserts the pending search. Cancel closes the modal without DB writes.
 *
 * Race tradeoff: two tabs hitting cap simultaneously can drift to count=11
 * (acceptable per 17-RESEARCH §6 / Pitfall 5).
 *
 * Mirror MarkFilledModal.tsx structural language: backdrop + bg-surface card
 * + `if (!isOpen) return null` for clean unmount-on-close.
 */
export function ReplaceOldestModal({
  isOpen,
  onClose,
  onReplaced,
  userId,
  pending,
}: ReplaceOldestModalProps) {
  const [oldest, setOldest] = useState<{ id: string; name: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen || !userId) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('saved_searches')
        .select('id, name')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()
      if (cancelled) return
      setOldest((data as { id: string; name: string } | null) ?? null)
    })()
    return () => {
      cancelled = true
    }
  }, [isOpen, userId])

  // Esc to close
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  async function handleReplace() {
    if (!oldest || !pending) return
    setSubmitting(true)
    try {
      // Delete oldest first
      const { error: delError } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', oldest.id)
      if (delError) {
        toast.error('Could not replace — please try again.')
        return
      }
      // Insert new
      const { error: insError } = await supabase.from('saved_searches').insert({
        user_id: userId,
        name: pending.name,
        search_params: pending.searchParams,
      })
      if (insError) {
        toast.error('Could not save replacement — please try again.')
        return
      }
      toast.success(`Replaced "${oldest.name}" with "${pending.name}"`)
      onReplaced()
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
        data-testid="replace-oldest-backdrop"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="replace-oldest-heading"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          className="bg-surface rounded-[16px] shadow-xl w-full max-w-md border-[1.5px] border-border"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
            <h2
              id="replace-oldest-heading"
              className="text-[16px] font-body font-bold"
              style={{ color: 'var(--color-text)' }}
            >
              Replace oldest saved search?
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-2 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 text-text-muted" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-3">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              You've reached 10 saved searches. Replace the oldest one
              {oldest ? (
                <>
                  {' '}
                  (<strong style={{ color: 'var(--color-text)' }}>"{oldest.name}"</strong>)
                </>
              ) : null}{' '}
              or delete one first?
            </p>
          </div>

          <div className="flex gap-3 px-6 pb-5">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              className="flex-1"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleReplace}
              className="flex-1"
              disabled={submitting || !oldest || !pending}
            >
              {submitting ? 'Replacing…' : 'Replace oldest'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
