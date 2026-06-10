import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, FileText, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface FileDropzoneProps {
  /** Supabase Storage bucket name */
  bucket: string
  /** Storage path prefix, e.g. `${userId}/documents` */
  path: string
  /** MIME types accepted, e.g. `{ 'image/*': ['.jpg', '.png'], 'application/pdf': ['.pdf'] }` */
  accept: Record<string, string[]>
  /** Max file size in bytes. Defaults to 5MB. */
  maxSize?: number
  /** Called with the public URL after a successful upload (single-file mode) */
  onUploadComplete: (url: string) => void
  /** Label shown inside the dropzone */
  label?: string
  /** Pre-existing file URL to show on initial render (single-file mode) */
  existingUrl?: string
  className?: string

  /** Enable multi-file upload. Defaults to false for backward compat. */
  multiple?: boolean
  /** Max number of files when multiple=true. Defaults to 5. */
  maxFiles?: number
  /** Called with storage paths after all uploads complete (multi-file mode) */
  onUploadsComplete?: (paths: string[]) => void
  /** Pre-existing file paths to show on initial render (multi-file mode) */
  existingPaths?: string[]
  /** If true, stores storage path instead of public URL. For private buckets. */
  privateMode?: boolean
}

type UploadState = 'idle' | 'uploading' | 'done' | 'error'

interface UploadedFile {
  name: string
  path: string
  status: 'uploading' | 'done' | 'error'
}

/**
 * Drag-and-drop file upload component backed by Supabase Storage.
 * Shows thumbnail preview for images, file icon for PDFs.
 * Drag-active state highlights with fern border and light green background.
 *
 * Supports two modes:
 * - Single-file (default): backward-compatible, calls onUploadComplete with public URL
 * - Multi-file (multiple=true): tracks list of files, calls onUploadsComplete with storage paths
 */
export function FileDropzone({
  bucket,
  path,
  accept,
  maxSize = 5 * 1024 * 1024,
  onUploadComplete,
  label = 'Drag and drop, or click to select',
  existingUrl,
  className,
  multiple = false,
  maxFiles = 5,
  onUploadsComplete,
  existingPaths,
  privateMode = false,
}: FileDropzoneProps) {
  // ---- Single-file mode state ----
  const [preview, setPreview] = useState<string | null>(existingUrl ?? null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // ---- Multi-file mode state ----
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(() => {
    if (!existingPaths) return []
    return existingPaths.map((p) => ({
      name: p.split('/').pop() ?? p,
      path: p,
      status: 'done' as const,
    }))
  })
  const [multiErrorMessage, setMultiErrorMessage] = useState<string | null>(null)

  function clearFile() {
    setPreview(null)
    setFileName(null)
    setUploadState('idle')
    setErrorMessage(null)
  }

  async function removeFile(filePath: string) {
    await supabase.storage.from(bucket).remove([filePath])
    const remaining = uploadedFiles.filter((f) => f.path !== filePath)
    setUploadedFiles(remaining)
    onUploadsComplete?.(remaining.map((f) => f.path))
  }

  const isAtMaxFiles = multiple && uploadedFiles.length >= maxFiles

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    accept,
    maxSize,
    multiple,
    maxFiles: multiple ? maxFiles : 1,
    disabled: isAtMaxFiles,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return

      if (!multiple) {
        // ---- Single-file upload path (unchanged behavior) ----
        const file = acceptedFiles[0]
        setErrorMessage(null)
        setUploadState('uploading')
        setFileName(file.name)

        // Show image preview immediately
        if (file.type.startsWith('image/')) {
          const objectUrl = URL.createObjectURL(file)
          setPreview(objectUrl)
        } else {
          setPreview(null)
        }

        // Upload to Supabase Storage
        const filePath = `${path}/${Date.now()}-${file.name}`
        const { error } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, { upsert: true })

        if (error) {
          setUploadState('error')
          setErrorMessage(`Upload failed: ${error.message}`)
          return
        }

        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath)

        setUploadState('done')
        onUploadComplete(urlData.publicUrl)
      } else {
        // ---- Multi-file upload path ----
        setMultiErrorMessage(null)

        // Filter out files that would exceed maxFiles
        const slotsAvailable = maxFiles - uploadedFiles.length
        const filesToUpload = acceptedFiles.slice(0, slotsAvailable)

        // Add uploading placeholders
        const newEntries: UploadedFile[] = filesToUpload.map((f) => ({
          name: f.name,
          path: '',
          status: 'uploading' as const,
        }))
        const updatedFiles = [...uploadedFiles, ...newEntries]
        setUploadedFiles(updatedFiles)

        const finalFiles = [...uploadedFiles]

        for (let i = 0; i < filesToUpload.length; i++) {
          const file = filesToUpload[i]
          const filePath = `${path}/${Date.now()}-${file.name}`

          const { error } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, { upsert: false })

          if (error) {
            // Mark this entry as error
            setUploadedFiles((prev) => {
              const copy = [...prev]
              const idx = copy.findIndex((f) => f.name === file.name && f.status === 'uploading')
              if (idx !== -1) {
                copy[idx] = { ...copy[idx], status: 'error' }
              }
              return copy
            })
            setMultiErrorMessage(`Upload failed for ${file.name}: ${error.message}`)
          } else {
            const storedPath = privateMode
              ? filePath
              : supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl

            finalFiles.push({ name: file.name, path: storedPath, status: 'done' })

            setUploadedFiles((prev) => {
              const copy = [...prev]
              const idx = copy.findIndex((f) => f.name === file.name && f.status === 'uploading')
              if (idx !== -1) {
                copy[idx] = { name: file.name, path: storedPath, status: 'done' }
              }
              return copy
            })
          }
        }

        // Call callback with all done paths (existing + newly uploaded)
        setUploadedFiles((prev) => {
          const donePaths = prev.filter((f) => f.status === 'done').map((f) => f.path)
          onUploadsComplete?.(donePaths)
          return prev
        })
      }
    },
    onDropRejected: (rejections) => {
      const firstError = rejections[0]?.errors[0]
      const setMsg = multiple ? setMultiErrorMessage : setErrorMessage
      if (firstError?.code === 'file-too-large') {
        const maxMb = Math.round(maxSize / 1024 / 1024)
        setMsg(`File is too large. Maximum size is ${maxMb}MB.`)
      } else if (firstError?.code === 'file-invalid-type') {
        setMsg('File type not accepted. Please check the allowed formats.')
      } else {
        setMsg(firstError?.message ?? 'File rejected.')
      }
    },
  })

  // Sync file rejection errors from fileRejections (synchronous path)
  const hasRejections = fileRejections.length > 0

  const isUploading = uploadState === 'uploading'
  const hasFile = preview || fileName

  // ---- Multi-file render ----
  if (multiple) {
    return (
      <div className={cn('w-full', className)}>
        {isAtMaxFiles ? (
          <div
            className={cn(
              'rounded-[10px] border-2 border-dashed p-4 text-center',
              'border-border bg-surface-2 cursor-not-allowed opacity-60',
            )}
          >
            <p className="font-body text-text-muted text-[13px]">
              Maximum {maxFiles} files reached. Remove a file to upload more.
            </p>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={cn(
              'cursor-pointer rounded-[10px] border-2 border-dashed p-6 text-center transition-all duration-200',
              'flex min-h-[120px] flex-col items-center justify-center gap-3',
              isDragActive
                ? 'border-brand-hover bg-[rgba(74,124,47,0.06)]'
                : 'border-border bg-surface-2 hover:border-border-strong',
              (multiErrorMessage || hasRejections) && 'border-danger',
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-2">
              <UploadCloud
                className={cn('h-8 w-8', isDragActive ? 'text-brand-hover' : 'text-text-muted')}
              />
              <p
                className={cn(
                  'font-body text-[13px]',
                  isDragActive ? 'text-brand-hover' : 'text-text-muted',
                )}
              >
                {isDragActive ? 'Drop files here...' : label}
              </p>
              <p className="font-body text-text-subtle text-[11px]">
                Max {Math.round(maxSize / 1024 / 1024)}MB per file · up to {maxFiles} files
              </p>
            </div>
          </div>
        )}

        {/* Uploaded files list */}
        {uploadedFiles.length > 0 && (
          <ul className="mt-3 space-y-2">
            {uploadedFiles.map((f) => (
              <li key={f.path || f.name} className="font-body flex items-center gap-2 text-[13px]">
                {f.status === 'uploading' ? (
                  <Loader2 className="text-brand-hover h-4 w-4 flex-shrink-0 animate-spin" />
                ) : (
                  <FileText className="text-brand-hover h-4 w-4 flex-shrink-0" />
                )}
                <span className="text-text max-w-[200px] truncate">{f.name}</span>
                {f.status === 'done' && (
                  <button
                    type="button"
                    onClick={() => removeFile(f.path)}
                    className="text-text-subtle hover:text-text ml-auto"
                    aria-label={`Remove ${f.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {f.status === 'error' && (
                  <span className="text-danger ml-auto text-[11px]">Failed</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Error message */}
        {multiErrorMessage && (
          <p className="font-body text-danger mt-1 text-[12px]">{multiErrorMessage}</p>
        )}
      </div>
    )
  }

  // ---- Single-file render (unchanged behavior) ----
  return (
    <div className={cn('w-full', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'cursor-pointer rounded-[10px] border-2 border-dashed p-6 text-center transition-all duration-200',
          'flex min-h-[120px] flex-col items-center justify-center gap-3',
          isDragActive
            ? 'border-brand-hover bg-[rgba(74,124,47,0.06)]'
            : 'border-border bg-surface-2 hover:border-border-strong',
          isUploading && 'pointer-events-none opacity-70',
          (errorMessage || hasRejections) && 'border-danger',
        )}
      >
        <input {...getInputProps()} />

        {/* Preview / uploading / idle state */}
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="text-brand-hover h-8 w-8 animate-spin" />
            <p className="font-body text-text-muted text-[13px]">Uploading {fileName}...</p>
          </div>
        ) : hasFile ? (
          <div className="flex flex-col items-center gap-2">
            {preview && (
              <img
                src={preview}
                alt="Preview"
                className="max-h-40 max-w-full rounded-[6px] object-contain"
              />
            )}
            {!preview && fileName && (
              <div className="text-text-muted flex items-center gap-2">
                <FileText className="text-brand-hover h-6 w-6" />
                <span className="font-body text-text max-w-[200px] truncate text-[13px]">
                  {fileName}
                </span>
              </div>
            )}
            <p className="font-body text-text-muted text-[11px]">
              {isDragActive ? 'Drop to replace file' : 'Click or drag to replace'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <UploadCloud
              className={cn('h-8 w-8', isDragActive ? 'text-brand-hover' : 'text-text-muted')}
            />
            <p
              className={cn(
                'font-body text-[13px]',
                isDragActive ? 'text-brand-hover' : 'text-text-muted',
              )}
            >
              {isDragActive ? 'Drop file here...' : label}
            </p>
            <p className="font-body text-text-subtle text-[11px]">
              Max {Math.round(maxSize / 1024 / 1024)}MB
            </p>
          </div>
        )}
      </div>

      {/* Remove button when file present */}
      {hasFile && uploadState !== 'uploading' && (
        <button
          type="button"
          onClick={clearFile}
          className="font-body text-text-muted hover:text-text mt-1.5 flex items-center gap-1 text-[11px] transition-colors"
        >
          <X className="h-3 w-3" />
          Remove file
        </button>
      )}

      {/* Error message */}
      {errorMessage && <p className="font-body text-danger mt-1 text-[12px]">{errorMessage}</p>}
    </div>
  )
}
