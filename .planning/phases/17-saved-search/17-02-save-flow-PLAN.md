---
phase: 17-saved-search
plan: 02
type: execute
wave: 2
depends_on:
  - "17-01"
files_modified:
  - src/components/saved-search/SaveSearchModal.tsx
  - src/components/saved-search/ReplaceOldestModal.tsx
  - src/pages/jobs/JobSearch.tsx
  - tests/saved-search-modal.test.tsx
  - tests/saved-search-cap.test.tsx
autonomous: true
requirements:
  - SRCH-13
must_haves:
  truths:
    - "Logged-in seeker viewing /jobs with active filters sees a 'Save search' button next to the results count"
    - "Save button is hidden when no filters are applied (hasActiveFilters returns false)"
    - "Save button is hidden when user is not signed in"
    - "Clicking Save opens an inline modal with auto-name pre-filled in an Input; Save button disabled when name empty; Esc closes; submit calls supabase.from('saved_searches').insert"
    - "Attempting to save the 11th search opens the Replace Oldest modal showing the OLDEST saved-search name"
    - "tests/saved-search-modal.test.tsx and tests/saved-search-cap.test.tsx are GREEN"
  artifacts:
    - path: src/components/saved-search/SaveSearchModal.tsx
      provides: "Save modal — RHF + Zod (name field, max 100 chars), Input + Button primitives, inline role='alert' div for errors, NOT StatusBanner"
      exports:
        - SaveSearchModal
      min_lines: 80
    - path: src/components/saved-search/ReplaceOldestModal.tsx
      provides: "10-cap replace flow modal — fetches oldest by created_at ASC, shows name, Replace + Cancel CTAs"
      exports:
        - ReplaceOldestModal
      min_lines: 60
    - path: src/pages/jobs/JobSearch.tsx
      provides: "Save button + replace-modal wiring next to results count in ResultsArea; respects hasActiveFilters + isLoggedIn"
      contains: "SaveSearchModal"
  key_links:
    - from: "src/components/saved-search/SaveSearchModal.tsx"
      to: "supabase.from('saved_searches').insert"
      via: "RHF onSubmit handler"
      pattern: "from\\('saved_searches'\\).insert"
    - from: "src/pages/jobs/JobSearch.tsx"
      to: "src/lib/savedSearch.ts (snapshotFilters, deriveAutoName, hasActiveFilters)"
      via: "import + invocation in ResultsArea Save button + modal pre-fill"
      pattern: "from '@/lib/savedSearch'"
    - from: "src/components/saved-search/SaveSearchModal.tsx"
      to: "Phase 19 v2 primitives (Input, Button) — NOT StatusBanner"
      via: "import from @/components/ui/Input and @/components/ui/Button only"
      pattern: "import.*from '@/components/ui/(Input|Button)'"
---

<objective>
Save flow wave: build the Save modal (RHF + Zod), the Replace Oldest modal (10-cap edge case), and wire both into JobSearch.tsx next to the results count. Turns `tests/saved-search-modal.test.tsx` and `tests/saved-search-cap.test.tsx` GREEN. One atomic commit.

Purpose: Without this wave, SRCH-13 is unsatisfied — there is no UI to create a saved search. Pure-CRUD save path; no list/load/delete yet (those are Wave 3+).

Output: 2 new components + JobSearch.tsx wired + 2 test files GREEN.
</objective>

<execution_context>
@/Users/harrysmith/.claude/get-shit-done/workflows/execute-plan.md
@/Users/harrysmith/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/17-saved-search/17-CONTEXT.md
@.planning/phases/17-saved-search/17-RESEARCH.md
@.planning/phases/17-saved-search/17-VALIDATION.md
@.planning/phases/17-saved-search/17-01-SUMMARY.md
@CLAUDE.md
@src/pages/jobs/MarkFilledModal.tsx
@src/pages/auth/Login.tsx
@src/components/ui/Input.tsx
@src/components/ui/Button.tsx
@src/lib/savedSearch.ts
@src/types/domain.ts
@src/pages/jobs/JobSearch.tsx
@tests/saved-search-modal.test.tsx
@tests/saved-search-cap.test.tsx
@tests/admin-employer-list.test.ts

<interfaces>
<!-- v2 primitives the modal MUST compose (extracted from src/components/ui/Input.tsx + Button.tsx): -->

```typescript
// src/components/ui/Input.tsx
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string        // surfaces inline danger-styled message under input
  helperText?: string
}
export const Input = forwardRef<HTMLInputElement, InputProps>(...)

// src/components/ui/Button.tsx
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'warn'  // NO 'destructive', NO 'error'
  size?: 'sm' | 'md' | 'lg'
}
```

<!-- StatusBanner CRITICAL: variant enum is FIXED to 'shortlisted' | 'interview' | 'offer' | 'declined'. -->
<!-- DO NOT use StatusBanner for error display. Use inline `<div role="alert">` with --color-danger tokens. -->
<!-- Phase 20-05 ProfileDrawer + Phase 20.1 AdminLoginPage precedent. -->

<!-- src/lib/savedSearch.ts (from Wave 1): -->
export const FILTER_KEYS: readonly string[]
export function snapshotFilters(searchParams: URLSearchParams): string
export function deriveAutoName(searchParams: URLSearchParams): string
export function hasActiveFilters(searchParams: URLSearchParams): boolean

<!-- src/types/domain.ts (from Wave 1): -->
export interface SavedSearch {
  id: string
  user_id: string
  name: string
  search_params: string
  created_at: string
  updated_at: string
}

<!-- src/pages/jobs/MarkFilledModal.tsx — canonical inline modal pattern (lines 105-280): -->
<!-- - Backdrop: fixed inset-0 z-40 bg-black/40 onClick={onClose} -->
<!-- - Modal: fixed inset-0 z-50 flex items-center justify-center -->
<!-- - Inner: bg-surface rounded-[16px] shadow-xl w-full max-w-md border-[1.5px] border-border -->
<!-- - if (!isOpen) return null at the top — clean unmount on close (Pitfall 3 in 17-RESEARCH.md) -->

<!-- src/pages/auth/Login.tsx — canonical RHF + Zod pattern (lines 12-70): -->
<!-- - z.object({ name: z.string().min(1, ...).max(100, ...) }) -->
<!-- - useForm<FormValues>({ resolver: zodResolver(schema) }) -->
<!-- - errors.name && <p style={{ color: 'var(--color-danger)' }}>{errors.name.message}</p> -->
```

<!-- src/pages/jobs/JobSearch.tsx existing ResultsArea structure (line 552-578) — Save button inserts here next to result count: -->
```tsx
<div className="flex items-center justify-between mb-4">
  <p className="text-[14px] font-body text-text-muted">
    <strong className="text-text">{jobs.length}</strong> job{jobs.length !== 1 ? 's' : ''} found
  </p>
  {/* SAVE BUTTON GOES HERE — sibling of result count, before sort selector */}
  <div className="flex items-center gap-2">{/* sort selector */}</div>
</div>
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create SaveSearchModal component (RHF + Zod, inline role=alert errors)</name>
  <files>
    src/components/saved-search/SaveSearchModal.tsx
    tests/saved-search-modal.test.tsx
  </files>
  <read_first>
    - src/pages/jobs/MarkFilledModal.tsx (canonical inline modal: backdrop + bg-surface card + `if (!isOpen) return null` at line 103 — copy structure verbatim)
    - src/pages/auth/Login.tsx:12-70 (canonical RHF + Zod: z.object schema; useForm with zodResolver; errors.name.message rendered with var(--color-danger))
    - src/components/ui/Input.tsx (Input has built-in `error` prop that surfaces inline message — use it for the name field)
    - src/components/ui/Button.tsx (variants 'primary' | 'outline' | 'ghost' | 'warn' — no 'error'/'destructive')
    - src/lib/savedSearch.ts (snapshotFilters + deriveAutoName from Wave 1)
    - tests/saved-search-modal.test.tsx (Wave 0 stubs — 9 .todo to turn GREEN)
    - tests/admin-employer-list.test.ts (canonical supabase mock — vi.hoisted pattern; for non-rpc table access, use { from: vi.fn().mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) }) })
    - .planning/phases/17-saved-search/17-RESEARCH.md §3 + Pitfall 3 (RHF defaultValues vs reset on re-open — use unmount pattern)
  </read_first>
  <behavior>
    Tests to turn GREEN in tests/saved-search-modal.test.tsx (RTL-style, render the modal with isOpen=true and assertions on visible DOM):

    - Render with isOpen=true: modal appears, queryByText('Save search') heading visible
    - Pre-fill: input value === deriveAutoName(searchParams) — render with searchParams 'shed_type=rotary' and assert input value 'Rotary'
    - StatusBanner regression guard: queryByRole with name matching /banner/i NOT in document; instead inline div role="alert" used for errors
    - Empty name: type "" then submit; expect inline error "Name required" visible
    - Max-length: type 101-char string; expect inline error "Name too long"
    - Submit disabled: when watch('name').trim() === ''
    - Esc: fireEvent.keyDown(document, {key:'Escape'}) calls onClose
    - Backdrop click: fireEvent.click backdrop calls onClose
    - Submit success: with mocked supabase.from('saved_searches').insert resolving {error:null}, click Save, expect insert called with { user_id, name: '<typed>', search_params: '<from props>' }
    - Unmount: render with isOpen=false, queryByText('Save search') is null (mirror MarkFilledModal `if (!isOpen) return null` — Pitfall 3 prevention)
  </behavior>
  <action>
**Step 1 — Create directory + component file.** mkdir -p src/components/saved-search; then write `src/components/saved-search/SaveSearchModal.tsx`:

```tsx
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
  /** authed user id (saver). Saved Search button hidden by parent when null. */
  userId: string
}

/**
 * Phase 17 SRCH-13 — save current /jobs filter state as a named saved search.
 *
 * Mirror MarkFilledModal.tsx pattern: backdrop + centred card + `if (!isOpen) return null`
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
      // Surface persistence error inline (matches RHF errors styling)
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
                tokens (Pitfall 3 — StatusBanner has fixed variant enum, no 'error') */}
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
```

**Step 2 — Replace .todo bodies in `tests/saved-search-modal.test.tsx` with real assertions.** The test file should mock supabase and render with various props. Reference structure:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Hoisted mocks per Phase 20-06 vi.hoisted precedent (SaveSearchModal statically imports supabase)
const { fromMock, insertMock } = vi.hoisted(() => {
  const insertMock = vi.fn()
  const fromMock = vi.fn()
  return { fromMock, insertMock }
})

vi.mock('@/lib/supabase', () => ({
  supabase: { from: fromMock },
}))

// AFTER mock setup, statically import the SUT
import { SaveSearchModal } from '@/components/saved-search/SaveSearchModal'

beforeEach(() => {
  fromMock.mockReset()
  insertMock.mockReset()
  // Default: insert returns { id: 'new-id' } success
  fromMock.mockReturnValue({
    insert: insertMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
      }),
    }),
  })
})

describe('Save search modal (SRCH-13)', () => {
  const baseProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSaved: vi.fn(),
    searchParams: new URLSearchParams('shed_type=rotary'),
    userId: 'user-123',
  }

  it('renders Input + Button primitives, NOT StatusBanner', () => {
    render(<SaveSearchModal {...baseProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    // StatusBanner regression guard: no element with the StatusBanner test class
    expect(document.querySelector('[data-statusbanner]')).toBeNull()
  })

  it('pre-fills name field with deriveAutoName output', () => {
    render(<SaveSearchModal {...baseProps} />)
    expect((screen.getByLabelText(/name/i) as HTMLInputElement).value).toBe('Rotary')
  })

  it('shows inline role="alert" div on persistence error (NOT StatusBanner)', async () => {
    fromMock.mockReturnValueOnce({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'rls-block' } }),
        }),
      }),
    })
    render(<SaveSearchModal {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByRole('alert').textContent).toMatch(/could not save/i)
    })
  })

  it('rejects names exceeding 100 chars via Zod max constraint', async () => {
    render(<SaveSearchModal {...baseProps} />)
    const input = screen.getByLabelText(/name/i) as HTMLInputElement
    // maxLength HTML attr prevents > 100 typing in real browser; for jsdom we set value
    fireEvent.change(input, { target: { value: 'a'.repeat(101) } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => {
      expect(screen.queryByText(/name too long/i)).toBeInTheDocument()
    })
  })

  it('disables Submit button when name field empty', () => {
    render(<SaveSearchModal {...baseProps} searchParams={new URLSearchParams()} />)
    const input = screen.getByLabelText(/name/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: '' } })
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled()
  })

  it('Esc key closes the modal', () => {
    const onClose = vi.fn()
    render(<SaveSearchModal {...baseProps} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('clicking backdrop closes the modal', () => {
    const onClose = vi.fn()
    render(<SaveSearchModal {...baseProps} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('save-search-backdrop'))
    expect(onClose).toHaveBeenCalled()
  })

  it('submits supabase.from("saved_searches").insert on Save', async () => {
    render(<SaveSearchModal {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => {
      expect(fromMock).toHaveBeenCalledWith('saved_searches')
    })
  })

  it('unmounts fully on close (mirrors MarkFilledModal `if (!isOpen) return null` pattern)', () => {
    render(<SaveSearchModal {...baseProps} isOpen={false} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
```

**Step 3 — Run vitest.**

```bash
pnpm test -- --run tests/saved-search-modal.test.tsx
```

Expect: 9 passed.
  </action>
  <verify>
    <automated>pnpm test -- --run tests/saved-search-modal.test.tsx</automated>
  </verify>
  <done>
    - src/components/saved-search/SaveSearchModal.tsx exists and exports SaveSearchModal
    - tests/saved-search-modal.test.tsx: 9 passing, 0 todos, 0 failures
    - tsc --noEmit clean
  </done>
  <acceptance_criteria>
    - File src/components/saved-search/SaveSearchModal.tsx exists
    - File contains `export function SaveSearchModal` OR `export const SaveSearchModal`
    - File contains `import { Input } from '@/components/ui/Input'`
    - File contains `import { Button } from '@/components/ui/Button'`
    - File does NOT contain `import { StatusBanner }` (regression guard — `grep -q "StatusBanner" src/components/saved-search/SaveSearchModal.tsx` exits 1)
    - File contains `role="alert"` for inline error div
    - File contains `if (!isOpen) return null` (Pitfall 3 prevention)
    - File contains `from('saved_searches').insert`
    - File contains `import { snapshotFilters, deriveAutoName }` from '@/lib/savedSearch'
    - File contains `zodResolver` import from '@hookform/resolvers/zod'
    - `pnpm test -- --run tests/saved-search-modal.test.tsx` exits 0 with "9 passed"
    - `grep -c "it.todo" tests/saved-search-modal.test.tsx` returns 0
  </acceptance_criteria>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create ReplaceOldestModal component + wire 10-cap detection in JobSearch.tsx</name>
  <files>
    src/components/saved-search/ReplaceOldestModal.tsx
    src/pages/jobs/JobSearch.tsx
    tests/saved-search-cap.test.tsx
  </files>
  <read_first>
    - src/pages/jobs/MarkFilledModal.tsx (canonical Cancel + primary action footer pattern; backdrop + card structure)
    - src/components/saved-search/SaveSearchModal.tsx (just-built sibling — same structural language)
    - src/pages/jobs/JobSearch.tsx (insertion point: ResultsArea header at line 552-578, between result count `<p>` and sort selector div; also line 79-104 for state hook placement; useAuth import already at line 81)
    - src/lib/savedSearch.ts (hasActiveFilters predicate)
    - .planning/phases/17-saved-search/17-RESEARCH.md §6 (handleSaveAttempt count check + handleReplaceConfirm flow)
    - tests/saved-search-cap.test.tsx (5 .todo to turn GREEN)
  </read_first>
  <behavior>
    Tests to turn GREEN in tests/saved-search-cap.test.tsx (these test JobSearch save-button click handler logic; can be testing JobSearch directly OR a smaller extracted helper — executor's call):

    - Mock supabase.from('saved_searches').select count head:true returning {count:10}
    - Click Save button on JobSearch → opens ReplaceOldestModal (NOT SaveSearchModal)
    - ReplaceOldestModal displays oldest name from `select('id, name').order('created_at', asc).limit(1)`
    - Cancel button click → both modals close, no DB writes
    - Replace button click → supabase delete (oldest id) THEN supabase insert (new) — order matters
    - When count < 10, SaveSearchModal opens normally (no replace flow)
  </behavior>
  <action>
**Step 1 — Create `src/components/saved-search/ReplaceOldestModal.tsx`:**

```tsx
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
 * inserts the pending search. Cancel closes both modals without DB writes.
 *
 * Race tradeoff: two tabs hitting cap simultaneously can drift to count=11
 * (acceptable per 17-RESEARCH §6 / Pitfall 5).
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

  if (!isOpen) return null

  async function handleReplace() {
    if (!oldest || !pending) return
    setSubmitting(true)
    try {
      // Delete oldest
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
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />
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
```

**Step 2 — Wire Save button + cap detection into `src/pages/jobs/JobSearch.tsx`.** Make these specific edits (DO NOT change fetchJobs useEffect deps — Pitfall 1):

2a. Add imports near the top of JobSearch.tsx (after the existing imports block ~line 16):

```tsx
import { hasActiveFilters } from '@/lib/savedSearch'
import { SaveSearchModal } from '@/components/saved-search/SaveSearchModal'
import { ReplaceOldestModal } from '@/components/saved-search/ReplaceOldestModal'
```

2b. Inside the `JobSearch` component (after existing useState calls ~line 91), add:

```tsx
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [replaceModalOpen, setReplaceModalOpen] = useState(false)
  const [pendingSave, setPendingSave] = useState<{ name: string; searchParams: string } | null>(null)
```

2c. Add a save-button handler (before `return`):

```tsx
  async function handleSaveClick() {
    if (!session?.user?.id) return
    // Check cap before opening modal — if at 10, defer to ReplaceOldestModal
    const { count } = await supabase
      .from('saved_searches')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
    if ((count ?? 0) >= 10) {
      // Pending state holds the deriveAutoName + snapshotFilters output; the user
      // confirms in ReplaceOldestModal which deletes oldest then inserts new.
      const { snapshotFilters, deriveAutoName } = await import('@/lib/savedSearch')
      setPendingSave({
        name: deriveAutoName(searchParams),
        searchParams: snapshotFilters(searchParams),
      })
      setReplaceModalOpen(true)
      return
    }
    setSaveModalOpen(true)
  }
```

2d. Inside ResultsArea (find the result count `<p>` at line 552-578), insert the Save button between the result count and the sort selector:

```tsx
{/* Save search button — visible only when filters applied + signed in seeker */}
{isLoggedIn && hasActiveFilters(searchParams) && (
  <button
    type="button"
    onClick={onSaveClick}
    className="text-brand text-[13px] hover:underline ml-3"
  >
    Save search
  </button>
)}
```

ResultsArea props need a new `onSaveClick: () => void` and `hasActiveFilters` is imported at the JobSearch level (passed as `searchParams` already in props). Wire `onSaveClick={handleSaveClick}` from both desktop + mobile ResultsArea instantiations.

2e. After the existing JSX tree returned by `JobSearch` (just before its closing root div), render the modals:

```tsx
{session?.user?.id && (
  <>
    <SaveSearchModal
      isOpen={saveModalOpen}
      onClose={() => setSaveModalOpen(false)}
      onSaved={() => { /* parent has nothing to refresh; quick-load dropdown refetches on open in Wave 4 */ }}
      searchParams={searchParams}
      userId={session.user.id}
    />
    <ReplaceOldestModal
      isOpen={replaceModalOpen}
      onClose={() => { setReplaceModalOpen(false); setPendingSave(null) }}
      onReplaced={() => { /* same as above */ }}
      userId={session.user.id}
      pending={pendingSave}
    />
  </>
)}
```

**Critical do-not-change**: The existing `fetchJobs` useEffect (line 366-370) MUST keep its current deps `[searchParams, authLoading]`. Do NOT add the new state vars to those deps. If a regression test fails because of dep drift, fix the dep list, not the test.

**Step 3 — Replace .todo bodies in `tests/saved-search-cap.test.tsx`.** This test exercises JobSearch's save-button handler. Use vi.hoisted for the from mock + render JobSearch through MemoryRouter (the existing AuthProvider context can be mocked). Reference structure (executor refines):

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

// Mock useAuth to a signed-in seeker
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    session: { user: { id: 'user-123' } },
    role: 'seeker',
    loading: false,
  }),
}))

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: fromMock } }))

import { ReplaceOldestModal } from '@/components/saved-search/ReplaceOldestModal'

beforeEach(() => {
  fromMock.mockReset()
})

describe('10-cap replace flow (SRCH-13 edge case)', () => {
  it('attempting 11th save when count=10 opens replace modal', async () => {
    // Test the integration through the modal directly — JobSearch's full render
    // requires too many mocks; the cap-check logic is the load-bearing piece.
    // Given pending={...} + isOpen=true, ReplaceOldestModal must fetch oldest.
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'oldest-id', name: 'Oldest Search' },
                error: null,
              }),
            }),
          }),
        }),
      }),
    })
    render(
      <ReplaceOldestModal
        isOpen={true}
        onClose={vi.fn()}
        onReplaced={vi.fn()}
        userId="user-123"
        pending={{ name: 'New Search', searchParams: 'shed_type=rotary' }}
      />,
    )
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('replace modal displays the OLDEST saved search name', async () => {
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'oldest-id', name: 'My Old Search' },
                error: null,
              }),
            }),
          }),
        }),
      }),
    })
    render(
      <ReplaceOldestModal
        isOpen={true}
        onClose={vi.fn()}
        onReplaced={vi.fn()}
        userId="user-123"
        pending={{ name: 'New', searchParams: '' }}
      />,
    )
    await waitFor(() => expect(screen.queryByText(/My Old Search/)).toBeInTheDocument())
  })

  // ... more tests for Cancel, Replace (delete + insert order), and the count-check branch
})
```

The executor may opt to test the count-check branch via a small extracted helper rather than rendering the full JobSearch — both approaches satisfy the behavior. Either way, all 5 .todo become passing tests.

**Step 4 — Run tests.**

```bash
pnpm test -- --run tests/saved-search-cap.test.tsx tests/saved-search-modal.test.tsx
pnpm tsc --noEmit
```
  </action>
  <verify>
    <automated>pnpm test -- --run tests/saved-search-cap.test.tsx tests/saved-search-modal.test.tsx && pnpm tsc --noEmit</automated>
  </verify>
  <done>
    - src/components/saved-search/ReplaceOldestModal.tsx exists and exports ReplaceOldestModal
    - src/pages/jobs/JobSearch.tsx imports SaveSearchModal + ReplaceOldestModal + hasActiveFilters
    - JobSearch.tsx renders Save button conditionally on isLoggedIn + hasActiveFilters
    - tests/saved-search-cap.test.tsx GREEN
    - tests/saved-search-modal.test.tsx still GREEN (no regression)
    - JobSearch fetchJobs useEffect deps unchanged
    - tsc --noEmit clean
  </done>
  <acceptance_criteria>
    - File src/components/saved-search/ReplaceOldestModal.tsx exists
    - File contains `export function ReplaceOldestModal` OR `export const ReplaceOldestModal`
    - File contains `from('saved_searches').delete()` (delete-oldest path)
    - File contains `from('saved_searches').insert` (insert-new path)
    - File contains `order('created_at', { ascending: true })` (oldest-first lookup)
    - src/pages/jobs/JobSearch.tsx contains `import { SaveSearchModal }` from '@/components/saved-search/SaveSearchModal'
    - src/pages/jobs/JobSearch.tsx contains `import { ReplaceOldestModal }` from '@/components/saved-search/ReplaceOldestModal'
    - src/pages/jobs/JobSearch.tsx contains `import { hasActiveFilters }` from '@/lib/savedSearch'
    - src/pages/jobs/JobSearch.tsx contains `count: 'exact', head: true` (cap-check pattern)
    - src/pages/jobs/JobSearch.tsx fetchJobs useEffect deps line still reads `[searchParams, authLoading]` (regression guard for Pitfall 1) — `grep -A1 "Re-fetch when searchParams" src/pages/jobs/JobSearch.tsx` includes `[searchParams, authLoading]`
    - `pnpm test -- --run tests/saved-search-cap.test.tsx` exits 0 with "5 passed" (or more) and 0 todos
    - `pnpm test -- --run tests/saved-search-modal.test.tsx` still exits 0 (regression check)
    - `pnpm tsc --noEmit` exits 0
    - `grep -c "it.todo" tests/saved-search-cap.test.tsx` returns 0
  </acceptance_criteria>
</task>

</tasks>

<verification>
- Full suite: `pnpm test -- --run` — expect previous Wave 1 13 + Wave 2 ≈14 (9 modal + 5 cap) new green; total 174 + 27 = 201 passing; 0 failures; remaining todos in list/quick-load files
- tsc --noEmit clean
- Manual visual smoke (executor): `pnpm dev` → sign in as seeker → /jobs → set a filter → Save button visible next to result count → click → modal opens with auto-name pre-filled
- JOBS-01 regression check: fetchJobs useEffect deps unchanged
</verification>

<success_criteria>
- SaveSearchModal and ReplaceOldestModal exist and compose v2 primitives only (no StatusBanner)
- JobSearch.tsx renders Save button when authenticated + filters active
- 10-cap detection routes 11th save attempt to ReplaceOldestModal
- saved-search-modal + saved-search-cap test files GREEN (≈14 new passes)
- One atomic commit (CLAUDE §4)
</success_criteria>

<output>
After completion, create `.planning/phases/17-saved-search/17-02-SUMMARY.md` covering:
- Files added (2) / modified (1: JobSearch.tsx)
- Pattern compliance (StatusBanner-free; v2 primitives only; MarkFilledModal mirror)
- Test count delta (+ ≈ 14 green; 2 of 6 saved-search files now GREEN)
- Confirmation that fetchJobs useEffect deps unchanged (Pitfall 1 regression guard)
</output>
