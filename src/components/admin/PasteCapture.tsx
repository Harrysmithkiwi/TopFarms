import { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { UploadCloud, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DrawerSection } from '@/components/admin/DrawerShell'
import { supabase } from '@/lib/supabase'

/**
 * Paste-batch capture — the primary capture path, shared by the employer and seeker
 * staging queues.
 *
 * Extracted from AdminLeadsStaging when the seeker queue arrived: `lead-intake` asks
 * Claude to classify each post as employer or seeker, so ONE capture surface feeds both
 * screens and neither needs to declare which lane it is. Duplicating the component per
 * screen would have meant two dropzones, two intake calls and two things to keep in
 * step with the Edge Function's contract.
 */

export const inputCls =
  'border-border bg-surface w-full rounded-[8px] border px-3 py-2 text-sm focus:border-brand'

const MAX_IMAGES = 10 // lead-intake caps items at 50; keep vision-batch cost sane.

export interface CapturedImage {
  data: string // base64, no data: prefix
  mediaType: string
  name: string
}

/** Read a File into a base64 CapturedImage (strips the data: URL prefix). */
function readImage(file: File): Promise<CapturedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result)
      resolve({
        data: result.slice(result.indexOf(',') + 1),
        mediaType: file.type || 'image/png',
        name: file.name || 'pasted-image.png',
      })
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function PasteCapture({
  onCaptured,
  /** Copy above the controls. Differs per queue; the mechanics do not. */
  blurb = 'Paste one or many posts, or drop / paste screenshots of listings — structuring, dedupe and suppression run automatically; results land in the queue for your approval.',
  placeholder = 'Paste post text here — multiple posts in one paste is fine. You can also paste a screenshot straight in (Cmd/Ctrl+V).',
}: {
  onCaptured: () => void
  blurb?: string
  placeholder?: string
}) {
  // Default to manual-capture: most pastes are other people's groups (NZ Dairy
  // Jobs etc.), not our own group. fb_own_group is the exception, selectable below.
  const [source, setSource] = useState('fb_manual_capture')
  const [text, setText] = useState('')
  const [images, setImages] = useState<CapturedImage[]>([])
  const [busy, setBusy] = useState(false)

  // Kept in a ref as well as state so overflow can be measured without reading `images`
  // inside the updater — React runs updaters twice in StrictMode and would double-toast.
  const countRef = useRef(0)

  const addFiles = useCallback(async (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith('image/'))
    if (imgs.length === 0) return
    const read = await Promise.all(imgs.map(readImage))
    const dropped = Math.max(0, countRef.current + read.length - MAX_IMAGES)
    setImages((prev) => [...prev, ...read].slice(0, MAX_IMAGES))
    countRef.current = Math.min(countRef.current + read.length, MAX_IMAGES)
    // The cap used to drop the overflow in silence, so pasting a 12th image looked
    // identical to pasting nothing.
    if (dropped > 0) toast.warning(`Kept ${MAX_IMAGES} images — ${dropped} dropped.`)
    // A screenshot is rarely from your own FB group → default the source label.
    setSource((s) => (s === 'fb_own_group' ? s : 'manual_paste'))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    multiple: true,
    maxFiles: MAX_IMAGES,
    noKeyboard: true,
    onDrop: (accepted) => void addFiles(accepted),
  })

  // Clipboard-paste an image anywhere in the drawer, not just the textarea.
  //
  // This used to be an onPaste on the <textarea> alone, while the dropzone below it
  // advertised "Drag, click, or paste". Clicking the dropzone is the obvious move when you
  // want to add a picture, and it blurs the textarea — so the one element that listened for
  // a paste was the one you had just left. The label promised something the element did not
  // do. Scoped by mount, not by an open flag: the drawer renders under `{capturing && …}`,
  // so the listener exists exactly as long as the panel does.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = Array.from(e.clipboardData?.items ?? [])
      const files = items
        .filter((it) => it.kind === 'file' && it.type.startsWith('image/'))
        .map((it) => it.getAsFile())
        .filter((f): f is File => f !== null)
      if (files.length) {
        void addFiles(files)
        return
      }
      // Only complain when the clipboard carried a FILE we could not read. Pasting text is
      // the normal case and lands in the textarea by itself; saying anything there would be
      // noise. Copying a post out of Facebook puts text and an image URL on the clipboard —
      // never the image bytes — which is why that particular paste can never work.
      if (items.some((it) => it.kind === 'file')) {
        toast.error('That clipboard item is not an image. Use ⌃⌘⇧4 to copy a screenshot.')
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addFiles])

  // L1 batch lane (§9.2): one item per screenshot (vision) + one for the text;
  // lead-intake structures them all with Claude server-side.
  async function submit() {
    if (!text.trim() && images.length === 0) return
    setBusy(true)
    const items: Record<string, unknown>[] = images.map((img) => ({
      image: img.data,
      image_media_type: img.mediaType,
    }))
    if (text.trim()) items.push({ raw_text: text })
    const { data, error } = await supabase.functions.invoke('lead-intake', {
      body: { source, items },
    })
    setBusy(false)
    if (error) {
      toast.error(`Intake failed: ${error.message}`)
      return
    }
    const r =
      (data as {
        results?: Record<string, number>
        staged?: { employer?: number; seeker?: number }
        structuring?: string
      }) ?? {}
    const employer = r.staged?.employer ?? 0
    const seeker = r.staged?.seeker ?? 0
    // Name the lanes, because the two queues are sibling routes filtered by type and
    // lead-intake — not this screen — decides which one a post lands in. A bare "Staged 10"
    // on the seeker queue reads as ten seekers even when one was forked to the employer
    // side and is no longer anywhere you are looking. Only split when there is a split;
    // a single-lane batch stays a plain count.
    const where =
      employer && seeker
        ? `${seeker} to seekers, ${employer} to employers`
        : `${employer + seeker}`
    toast.success(
      `Staged ${where} (dupes ${r.results?.exact_duplicate ?? 0}, suppressed ${r.results?.suppressed ?? 0}) — ${r.structuring ?? ''}`,
    )
    setText('')
    setImages([])
    onCaptured()
  }

  return (
    <DrawerSection label="Paste posts or drop screenshots">
      <p className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
        {blurb}
      </p>
      <select className={inputCls} value={source} onChange={(e) => setSource(e.target.value)}>
        <option value="fb_own_group">FB (own group)</option>
        <option value="fb_manual_capture">FB (manual capture)</option>
        <option value="manual_paste">Manual / screenshot</option>
      </select>
      <textarea
        className={`${inputCls} h-40`}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {/* Screenshot dropzone — drag, click, or paste. Each image is its own lead. */}
      <div
        {...getRootProps()}
        className="cursor-pointer rounded-[8px] border-2 border-dashed p-4 text-center text-[13px] transition-colors"
        style={{
          borderColor: isDragActive ? 'var(--color-brand)' : 'var(--color-border)',
          backgroundColor: isDragActive ? 'rgba(74,124,47,0.06)' : 'var(--color-surface-2)',
          color: 'var(--color-text-muted)',
        }}
      >
        <input {...getInputProps()} />
        <span className="inline-flex items-center gap-1.5">
          <UploadCloud size={15} />
          {isDragActive
            ? 'Drop screenshots here…'
            : `Drag, click, or paste screenshots — up to ${MAX_IMAGES}`}
        </span>
      </div>
      {images.length > 0 && (
        <ul className="space-y-1.5">
          {images.map((img, i) => (
            <li key={`${img.name}-${i}`} className="flex items-center gap-2 text-[12px]">
              <span className="max-w-[220px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                {img.name}
              </span>
              <button
                type="button"
                aria-label={`Remove ${img.name}`}
                className="ml-auto"
                style={{ color: 'var(--color-text-subtle)' }}
                onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button
        variant="primary"
        size="sm"
        disabled={busy || (!text.trim() && images.length === 0)}
        onClick={submit}
      >
        {busy
          ? 'Structuring…'
          : `Stage batch${images.length ? ` (${images.length} image${images.length > 1 ? 's' : ''})` : ''}`}
      </Button>
    </DrawerSection>
  )
}
