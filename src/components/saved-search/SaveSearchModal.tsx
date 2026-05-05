import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { snapshotFilters, deriveAutoName } from '@/lib/savedSearch'

const schema = z.object({
  name: z
    .string()
    .min(1, 'Name required')
    .max(100, 'Name too long (max 100 characters)'),
})
type FormValues = z.infer<typeof schema>

export interface SaveSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: (id: string) => void
  /** From useSearchParams() — full URL state at time of open */
  searchParams: URLSearchParams
  /** Authenticated user id (saver). Save button hidden by parent when null. */
  userId: string
}

/**
 * Phase 17 SRCH-13 — save current /jobs filter state as a named saved search.
 *
 * Mirrors MarkFilledModal.tsx pattern: backdrop + centred card + `if (!isOpen) return null`
 * for clean unmount-on-close (Pitfall 3 in 17-RESEARCH.md — prevents stale RHF defaultValues
 * on re-open).
 *
 * StatusBanner is NOT used (variant enum is FIXED, no 'error' member).
 * Inline role="alert" div pattern from Phase 20.1 AdminLoginPage / Phase 20-05 ProfileDrawer.
 */
export function SaveSearchModal({
  isOpen,
  onClose,
  onSaved,
  searchParams,
  userId,
}: SaveSearchModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: deriveAutoName(searchParams) },
  })

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

  const nameValue = watch('name') ?? ''
  const submitDisabled = isSubmitting || nameValue.trim().length === 0

  async function onSubmit(values: FormValues) {
    const params = snapshotFilters(searchParams)
    const { data, error } = await supabase
      .from('saved_searches')
      .insert({
        user_id: userId,
        name: values.name.trim(),
        search_params: params,
      })
      .select('id')
      .single()

    if (error) {
      // Surface persistence error inline (mirrors RHF errors styling — Phase 20.1
      // AdminLoginPage precedent. StatusBanner has FIXED variant union with no
      // 'error' member, so we use an inline role="alert" div with --color-danger
      // tokens. Pitfall 3 from 17-RESEARCH.md.)
      setError('root', { message: 'Could not save — please try again.' })
      return
    }

    toast.success(`Saved "${values.name.trim()}"`)
    onSaved((data as { id: string }).id)
    onClose()
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
        data-testid="save-search-backdrop"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-search-heading"
        className={cn('fixed inset-0 z-50 flex items-center justify-center p-4')}
      >
        <div
          className="bg-surface rounded-[16px] shadow-xl w-full max-w-md border-[1.5px] border-border"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
            <h2
              id="save-search-heading"
              className="text-[16px] font-body font-bold"
              style={{ color: 'var(--color-text)' }}
            >
              Save search
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

          <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
            <Input
              label="Name"
              autoFocus
              {...register('name')}
              error={errors.name?.message}
              maxLength={100}
              placeholder="My saved search"
            />

            {/* Persistence error — inline role="alert" div with --color-danger
                tokens (Pitfall 3 — StatusBanner has fixed variant enum, no 'error'). */}
            {errors.root?.message && (
              <div
                role="alert"
                className="rounded-[8px] px-3 py-2 text-[13px] font-body"
                style={{
                  backgroundColor: 'var(--color-danger-bg)',
                  color: 'var(--color-danger)',
                }}
              >
                {errors.root.message}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={onClose}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="flex-1"
                disabled={submitDisabled}
              >
                {isSubmitting ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
