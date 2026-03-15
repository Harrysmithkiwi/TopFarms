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
  /** Called with the public URL after a successful upload */
  onUploadComplete: (url: string) => void
  /** Label shown inside the dropzone */
  label?: string
  /** Pre-existing file URL to show on initial render */
  existingUrl?: string
  className?: string
}

type UploadState = 'idle' | 'uploading' | 'done' | 'error'

/**
 * Drag-and-drop file upload component backed by Supabase Storage.
 * Shows thumbnail preview for images, file icon for PDFs.
 * Drag-active state highlights with fern border and light green background.
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
}: FileDropzoneProps) {
  const [preview, setPreview] = useState<string | null>(existingUrl ?? null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  function clearFile() {
    setPreview(null)
    setFileName(null)
    setUploadState('idle')
    setErrorMessage(null)
  }

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    accept,
    maxSize,
    multiple: false,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return

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
    },
    onDropRejected: (rejections) => {
      const firstError = rejections[0]?.errors[0]
      if (firstError?.code === 'file-too-large') {
        const maxMb = Math.round(maxSize / 1024 / 1024)
        setErrorMessage(`File is too large. Maximum size is ${maxMb}MB.`)
      } else if (firstError?.code === 'file-invalid-type') {
        setErrorMessage('File type not accepted. Please check the allowed formats.')
      } else {
        setErrorMessage(firstError?.message ?? 'File rejected.')
      }
    },
  })

  // Sync file rejection errors from fileRejections (synchronous path)
  const hasRejections = fileRejections.length > 0

  const isUploading = uploadState === 'uploading'
  const hasFile = preview || fileName

  return (
    <div className={cn('w-full', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-[10px] p-6 text-center cursor-pointer transition-all duration-200',
          'flex flex-col items-center justify-center gap-3 min-h-[120px]',
          isDragActive
            ? 'border-fern bg-[rgba(74,124,47,0.06)]'
            : 'border-fog bg-mist hover:border-mid',
          isUploading && 'pointer-events-none opacity-70',
          (errorMessage || hasRejections) && 'border-red',
        )}
      >
        <input {...getInputProps()} />

        {/* Preview / uploading / idle state */}
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-fern animate-spin" />
            <p className="text-[13px] font-body text-mid">Uploading {fileName}...</p>
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
              <div className="flex items-center gap-2 text-mid">
                <FileText className="w-6 h-6 text-fern" />
                <span className="text-[13px] font-body text-ink truncate max-w-[200px]">
                  {fileName}
                </span>
              </div>
            )}
            <p className="text-[11px] font-body text-mid">
              {isDragActive ? 'Drop to replace file' : 'Click or drag to replace'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <UploadCloud
              className={cn('w-8 h-8', isDragActive ? 'text-fern' : 'text-mid')}
            />
            <p className={cn('text-[13px] font-body', isDragActive ? 'text-fern' : 'text-mid')}>
              {isDragActive ? 'Drop file here...' : label}
            </p>
            <p className="text-[11px] font-body text-light">
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
          className="mt-1.5 flex items-center gap-1 text-[11px] font-body text-mid hover:text-ink transition-colors"
        >
          <X className="w-3 h-3" />
          Remove file
        </button>
      )}

      {/* Error message */}
      {errorMessage && (
        <p className="mt-1 text-[12px] font-body text-red">{errorMessage}</p>
      )}
    </div>
  )
}
