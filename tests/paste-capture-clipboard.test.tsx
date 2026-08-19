import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// The dropzone advertised "Drag, click, or paste screenshots" while the paste handler was
// bound to the <textarea> alone. Clicking the dropzone — the obvious move when you want to
// add a picture — blurs the textarea, so the one element listening for a paste was the one
// you had just left, and Cmd-V did nothing. The listener now lives on window for as long as
// the drawer is mounted.
//
// Mock strategy follows tests/admin-doc-queue.test.tsx: vi.hoisted, because PasteCapture
// statically imports @/lib/supabase.
const { invokeMock, toastError } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: invokeMock } },
}))
vi.mock('sonner', () => ({
  toast: { error: toastError, success: vi.fn(), warning: vi.fn() },
}))

import { PasteCapture } from '@/components/admin/PasteCapture'

/** A paste event carrying one clipboard item, shaped as the browser delivers it. */
function pasteEvent(item: { kind: string; type: string; file?: File }) {
  const ev = new Event('paste', { bubbles: true }) as ClipboardEvent
  Object.defineProperty(ev, 'clipboardData', {
    value: {
      items: [{ kind: item.kind, type: item.type, getAsFile: () => item.file ?? null }],
    },
  })
  return ev
}

describe('PasteCapture clipboard', () => {
  it('accepts an image pasted while nothing in the drawer has focus', async () => {
    render(<PasteCapture onCaptured={vi.fn()} />)
    // Deliberately do NOT focus the textarea — that is the regression.
    window.dispatchEvent(
      pasteEvent({
        kind: 'file',
        type: 'image/png',
        file: new File(['x'], 'clipped.png', { type: 'image/png' }),
      }),
    )
    await waitFor(() => expect(screen.getByText('clipped.png')).toBeInTheDocument())
  })

  it('says so when the clipboard holds a file it cannot read', async () => {
    render(<PasteCapture onCaptured={vi.fn()} />)
    window.dispatchEvent(
      pasteEvent({
        kind: 'file',
        type: 'application/pdf',
        file: new File(['x'], 'listing.pdf', { type: 'application/pdf' }),
      }),
    )
    await waitFor(() => expect(toastError).toHaveBeenCalled())
  })

  it('stays quiet on an ordinary text paste, which the textarea handles itself', () => {
    render(<PasteCapture onCaptured={vi.fn()} />)
    toastError.mockClear()
    window.dispatchEvent(pasteEvent({ kind: 'string', type: 'text/plain' }))
    expect(toastError).not.toHaveBeenCalled()
  })
})
