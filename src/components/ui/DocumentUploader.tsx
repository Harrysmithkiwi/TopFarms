import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, FileText, X, Loader2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Select } from '@/components/ui/Select'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { DocumentType, SeekerDocument } from '@/types/domain'
import { DOCUMENT_TYPE_LABELS } from '@/types/domain'

type StagedStatus = 'pending' | 'uploading' | 'done' | 'error'

interface StagedFile {
  id: string
  file: File
  type: DocumentType | null
  status: StagedStatus
  error?: string
}

interface DocumentUploaderProps {
  /** seeker_profiles.id — required for the seeker_documents.seeker_id FK */
  seekerProfileId: string
  /** Supabase Storage bucket name (e.g. 'seeker-documents') */
  bucket: string
  /** Storage path prefix, e.g. `${userId}/documents` */
  path: string
  /** MIME types accepted, e.g. `{ 'application/pdf': ['.pdf'] }` */
  accept: Record<string, string[]>
  /** Max file size in bytes. Defaults to 10MB. */
  maxSize?: number
  /** Max staged + uploaded files in one batch. Defaults to 5. */
  maxFiles?: number
  /** Fires once per successful seeker_documents row insert */
  onDocumentInserted?: (doc: SeekerDocument) => void
  className?: string
}

const TYPE_OPTIONS = (Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]).map((value) => ({
  value,
  label: DOCUMENT_TYPE_LABELS[value],
}))

/**
 * Multi-file uploader for seeker_documents that captures a per-file
 * document_type BEFORE upload commits to Storage. Built for the BFIX-03
 * categorization flow where FileDropzone's auto-upload-on-drop is the
 * wrong UX shape (we need stage → pick type → commit, not drop → upload).
 *
 * Per-file commit semantics (Phase 14-02 decision):
 *   - Each staged file uploads + inserts independently.
 *   - On success: row clears from the staged list, onDocumentInserted fires.
 *   - On failure: row stays with status='error', a retry button, and the
 *     last error message visible. Storage upload that succeeded but had
 *     a downstream insert failure gets a best-effort delete to avoid
 *     orphaning the file in the bucket.
 */
export function DocumentUploader({
  seekerProfileId,
  bucket,
  path,
  accept,
  maxSize = 10 * 1024 * 1024,
  maxFiles = 5,
  onDocumentInserted,
  className,
}: DocumentUploaderProps) {
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([])

  const activeRowCount = stagedFiles.filter((f) => f.status !== 'done').length
  const isAtMax = activeRowCount >= maxFiles
  const anyUploading = stagedFiles.some((f) => f.status === 'uploading')
  const anyPendingNeedsType = stagedFiles.some(
    (f) => f.status === 'pending' && f.type === null,
  )
  const anyPendingReady = stagedFiles.some(
    (f) => f.status === 'pending' && f.type !== null,
  )

  const uploadDisabled = anyUploading || anyPendingNeedsType || !anyPendingReady

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    maxSize,
    multiple: true,
    maxFiles,
    disabled: isAtMax || anyUploading,
    onDrop: (acceptedFiles) => {
      const slotsAvailable = maxFiles - activeRowCount
      const filesToStage = acceptedFiles.slice(0, slotsAvailable)
      setStagedFiles((prev) => [
        ...prev,
        ...filesToStage.map<StagedFile>((file) => ({
          id: crypto.randomUUID(),
          file,
          type: null,
          status: 'pending',
        })),
      ])
    },
    onDropRejected: (rejections) => {
      const firstError = rejections[0]?.errors[0]
      if (firstError?.code === 'file-too-large') {
        const maxMb = Math.round(maxSize / 1024 / 1024)
        toast.error(`File is too large. Maximum size is ${maxMb}MB.`)
      } else if (firstError?.code === 'file-invalid-type') {
        toast.error('File type not accepted. Please check the allowed formats.')
      } else {
        toast.error(firstError?.message ?? 'File rejected.')
      }
    },
  })

  function setRowType(rowId: string, type: DocumentType) {
    setStagedFiles((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, type } : row)),
    )
  }

  function removeRow(rowId: string) {
    setStagedFiles((prev) => prev.filter((row) => row.id !== rowId))
  }

  async function uploadRow(rowId: string) {
    const row = stagedFiles.find((r) => r.id === rowId)
    if (!row || row.type === null) return

    setStagedFiles((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, status: 'uploading', error: undefined } : r)),
    )

    const storagePath = `${path}/${Date.now()}-${row.file.name}`

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, row.file, { upsert: false })

    if (uploadError) {
      setStagedFiles((prev) =>
        prev.map((r) =>
          r.id === rowId ? { ...r, status: 'error', error: uploadError.message } : r,
        ),
      )
      toast.error(`Upload failed for ${row.file.name}: ${uploadError.message}`)
      return
    }

    const { data: insertedRow, error: insertError } = await supabase
      .from('seeker_documents')
      .insert({
        seeker_id: seekerProfileId,
        storage_path: storagePath,
        document_type: row.type,
        filename: row.file.name,
        file_size_bytes: row.file.size,
      })
      .select()
      .single()

    if (insertError) {
      try {
        await supabase.storage.from(bucket).remove([storagePath])
      } catch (cleanupErr) {
        console.warn('DocumentUploader: orphan storage cleanup failed', cleanupErr)
      }
      setStagedFiles((prev) =>
        prev.map((r) =>
          r.id === rowId ? { ...r, status: 'error', error: insertError.message } : r,
        ),
      )
      toast.error(
        `Saved ${row.file.name} to storage but row insert failed: ${insertError.message}`,
      )
      return
    }

    toast.success(`Uploaded ${row.file.name}`)
    onDocumentInserted?.(insertedRow as SeekerDocument)
    setStagedFiles((prev) => prev.filter((r) => r.id !== rowId))
  }

  async function uploadAllPending() {
    const ready = stagedFiles.filter((r) => r.status === 'pending' && r.type !== null)
    for (const row of ready) {
      await uploadRow(row.id)
    }
  }

  return (
    <div className={cn('w-full', className)}>
      {isAtMax ? (
        <div
          className={cn(
            'border-2 border-dashed rounded-[10px] p-4 text-center',
            'border-border bg-surface-2 opacity-60 cursor-not-allowed',
          )}
        >
          <p className="text-[13px] font-body text-text-muted">
            Maximum {maxFiles} files reached. Remove a file to upload more.
          </p>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-[10px] p-6 text-center cursor-pointer transition-all duration-200',
            'flex flex-col items-center justify-center gap-3 min-h-[120px]',
            isDragActive
              ? 'border-brand-hover bg-[rgba(74,124,47,0.06)]'
              : 'border-border bg-surface-2 hover:border-mid',
            anyUploading && 'pointer-events-none opacity-60',
          )}
        >
          <input {...getInputProps()} />
          <UploadCloud
            className={cn('w-8 h-8', isDragActive ? 'text-brand-hover' : 'text-text-muted')}
          />
          <p className={cn('text-[13px] font-body', isDragActive ? 'text-brand-hover' : 'text-text-muted')}>
            {isDragActive ? 'Drop files here...' : 'Drag and drop, or click to select'}
          </p>
          <p className="text-[11px] font-body text-text-subtle">
            Max {Math.round(maxSize / 1024 / 1024)}MB per file · up to {maxFiles} files
          </p>
        </div>
      )}

      {stagedFiles.length > 0 && (
        <ul className="mt-3 space-y-2">
          {stagedFiles.map((row) => (
            <li
              key={row.id}
              className={cn(
                'flex items-center gap-3 p-2 rounded-[8px] bg-surface border',
                row.status === 'error' ? 'border-danger' : 'border-border',
              )}
            >
              {row.status === 'uploading' ? (
                <Loader2 className="w-4 h-4 text-brand-hover animate-spin flex-shrink-0" />
              ) : (
                <FileText className="w-4 h-4 text-brand-hover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-body text-text truncate">{row.file.name}</p>
                <p
                  className={cn(
                    'text-[11px] font-body',
                    row.status === 'error' ? 'text-danger' : 'text-text-subtle',
                  )}
                >
                  {Math.round(row.file.size / 1024)} KB
                  {row.error && ` · ${row.error}`}
                </p>
              </div>
              <div className="w-[160px] flex-shrink-0">
                <Select
                  options={TYPE_OPTIONS}
                  value={row.type ?? undefined}
                  onValueChange={(val) => setRowType(row.id, val as DocumentType)}
                  placeholder="Document type"
                  disabled={row.status === 'uploading'}
                />
              </div>
              {row.status === 'error' && row.type !== null && (
                <button
                  type="button"
                  onClick={() => uploadRow(row.id)}
                  className="text-text-subtle hover:text-text p-1"
                  aria-label={`Retry upload of ${row.file.name}`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              {row.status !== 'uploading' && (
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="text-text-subtle hover:text-text p-1"
                  aria-label={`Remove ${row.file.name}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {stagedFiles.length > 0 && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[12px] font-body text-text-subtle">
            Identity documents are kept private — employers will never see them.
          </p>
          <button
            type="button"
            onClick={uploadAllPending}
            disabled={uploadDisabled}
            className={cn(
              'px-4 py-2 rounded-[8px] text-[13px] font-body font-medium flex-shrink-0',
              'bg-brand-hover text-white',
              'hover:bg-brand-hover/90 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-hover',
            )}
          >
            {anyUploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      )}
    </div>
  )
}
