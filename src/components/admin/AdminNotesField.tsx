import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface SavedNote {
  id: string
  admin_id: string
  content: string
  created_at: string
}

interface AdminNotesFieldProps {
  targetUserId: string
  /** Pre-loaded notes from admin_get_user_audit; component appends new ones optimistically. */
  initialNotes: SavedNote[]
}

/**
 * AdminNotesField — additive-only notes input pinned in the profile drawer.
 *
 * Renders saved notes (most recent first) above a textarea. On Save calls
 * admin_add_note RPC and prepends the returned row to local state — the drawer's
 * audit RPC fetches the full list on next open.
 *
 * Heights, classes, and placeholder copy are exact UI-SPEC §"Admin notes UX".
 */
export function AdminNotesField({ targetUserId, initialNotes }: AdminNotesFieldProps) {
  const [notes, setNotes] = useState<SavedNote[]>(initialNotes)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setNotes(initialNotes)
  }, [initialNotes])

  async function handleSave() {
    const content = draft.trim()
    if (!content) return
    setSaving(true)
    try {
      const { data, error } = await supabase.rpc('admin_add_note' as never, {
        p_target_user_id: targetUserId,
        p_content: content,
      } as never)
      if (error) {
        console.error('admin_add_note failed', error)
        toast.error('Failed to save note. Try again.')
        return
      }
      const note = data as SavedNote
      setNotes((prev) => [note, ...prev])
      setDraft('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Saved notes list (most recent first), additive-only — no delete */}
      {notes.length > 0 && (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li
              key={n.id}
              className="rounded-md p-3"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="text-[13px]" style={{ color: 'var(--color-text-subtle)' }}>
                {new Date(n.created_at).toLocaleString()}
              </div>
              <div className="mt-1 text-[15px]" style={{ color: 'var(--color-text)' }}>
                {n.content}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Textarea — exact Tailwind classes per UI-SPEC §"Admin notes UX" */}
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Add a note… (visible to admins only)"
        className="bg-surface-2 rounded-md border-[1.5px] border-border focus:border-2 focus:border-brand focus:outline-none px-[14px] py-3 text-[15px] leading-6 w-full resize-none min-h-[44px] max-h-[160px]"
        rows={2}
      />

      {/* Save button only when dirty */}
      {draft.trim() !== '' && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save note'}
          </Button>
        </div>
      )}
    </div>
  )
}
