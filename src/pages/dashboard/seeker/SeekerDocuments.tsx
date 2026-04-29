import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { FileText, Trash2 } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Select } from '@/components/ui/Select'
import { supabase } from '@/lib/supabase'
import { useSeekerProfileId } from '@/hooks/useSeekerProfileId'
import { DOCUMENT_TYPE_LABELS } from '@/types/domain'
import type { DocumentType, SeekerDocument } from '@/types/domain'

const TYPE_OPTIONS = (Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]).map((value) => ({
  value,
  label: DOCUMENT_TYPE_LABELS[value],
}))

const BUCKET = 'seeker-documents'

// useSeekerProfileId conflates "still resolving" and "resolved to no profile"
// (both return null). After this timeout, treat a still-null result as
// "no profile" and show the onboarding CTA. ProtectedRoute already gates on
// role='seeker', so the realistic path here is a seeker who somehow lacks a
// seeker_profiles row (edge case — onboarding hasn't created one yet).
const HOOK_TIMEOUT_MS = 5000

function formatBytes(bytes: number | null): string {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function SkeletonRow() {
  return (
    <div className="bg-white border-[1.5px] border-fog rounded-[12px] p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded bg-fog flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-fog rounded w-2/3" />
          <div className="h-3 bg-fog rounded w-1/3" />
        </div>
        <div className="w-[160px] h-9 bg-fog rounded" />
        <div className="w-9 h-9 bg-fog rounded" />
      </div>
    </div>
  )
}

export function SeekerDocuments() {
  const seekerProfileId = useSeekerProfileId()
  const [docs, setDocs] = useState<SeekerDocument[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorState, setErrorState] = useState<string | null>(null)
  const [hookTimedOut, setHookTimedOut] = useState(false)

  // Fallback timer: if useSeekerProfileId stays null for 5s, surface the
  // "complete onboarding" CTA instead of an infinite skeleton.
  useEffect(() => {
    if (seekerProfileId !== null) {
      setHookTimedOut(false)
      return
    }
    const t = setTimeout(() => setHookTimedOut(true), HOOK_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [seekerProfileId])

  // Fetch documents once seekerProfileId resolves to a real id.
  useEffect(() => {
    async function load() {
      if (seekerProfileId === null) return
      setLoading(true)
      setErrorState(null)
      const { data, error } = await supabase
        .from('seeker_documents')
        .select('*')
        .eq('seeker_id', seekerProfileId)
        .order('uploaded_at', { ascending: false })
      if (error) {
        console.error('SeekerDocuments: load failed', error)
        setErrorState('Failed to load your documents. Try refreshing.')
        setDocs(null)
        setLoading(false)
        return
      }
      setDocs((data ?? []) as SeekerDocument[])
      setLoading(false)
    }
    load()
  }, [seekerProfileId])

  async function handleTypeChange(docId: string, newType: DocumentType) {
    const before = docs
    setDocs((prev) =>
      prev?.map((d) => (d.id === docId ? { ...d, document_type: newType } : d)) ?? null,
    )
    const { error } = await supabase
      .from('seeker_documents')
      .update({ document_type: newType })
      .eq('id', docId)
    if (error) {
      setDocs(before)
      console.error('SeekerDocuments: type update failed', error)
      toast.error('Failed to update document type')
      return
    }
    toast.success('Document type updated')
  }

  async function handleDelete(doc: SeekerDocument) {
    if (!window.confirm(`Delete ${doc.filename}? This cannot be undone.`)) return
    const before = docs
    setDocs((prev) => prev?.filter((d) => d.id !== doc.id) ?? null)
    // Row delete first — if it succeeds, user sees the row vanish; storage
    // cleanup is best-effort. Same orphan-cleanup philosophy as
    // DocumentUploader's post-insert rollback path.
    const { error: rowError } = await supabase
      .from('seeker_documents')
      .delete()
      .eq('id', doc.id)
    if (rowError) {
      setDocs(before)
      console.error('SeekerDocuments: row delete failed', rowError)
      toast.error('Failed to delete document')
      return
    }
    try {
      await supabase.storage.from(BUCKET).remove([doc.storage_path])
    } catch (cleanupErr) {
      console.warn('SeekerDocuments: orphan storage cleanup failed', cleanupErr)
    }
    toast.success('Document deleted')
  }

  const isHookResolving = seekerProfileId === null && !hookTimedOut
  const isFetchingDocs = seekerProfileId !== null && loading
  const showLoading = isHookResolving || isFetchingDocs
  const showHookFallback = seekerProfileId === null && hookTimedOut
  const showError = !showLoading && !showHookFallback && errorState !== null
  const showEmpty =
    !showLoading && !showHookFallback && !showError && docs !== null && docs.length === 0
  const showList =
    !showLoading && !showHookFallback && !showError && docs !== null && docs.length > 0

  return (
    <DashboardLayout hideSidebar>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <h1
            className="font-display text-3xl font-semibold"
            style={{ color: 'var(--color-soil)' }}
          >
            My Documents
          </h1>
          {showList && (
            <span
              className="px-2.5 py-1 rounded-full text-[12px] font-body font-semibold"
              style={{ backgroundColor: 'var(--color-fog)', color: 'var(--color-mid)' }}
            >
              {docs!.length}
            </span>
          )}
        </div>

        <p className="text-sm" style={{ color: 'var(--color-mid)' }}>
          Manage your uploaded documents. Identity documents are kept private and are never
          shown to employers.
        </p>

        {/* Loading */}
        {showLoading && (
          <div className="space-y-3">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        )}

        {/* Hook-stuck-at-null fallback (no seeker_profiles row resolved in 5s) */}
        {showHookFallback && (
          <div
            className="rounded-[12px] p-12 text-center"
            style={{ backgroundColor: 'var(--color-mist)' }}
          >
            <p
              className="text-base font-body font-semibold mb-2"
              style={{ color: 'var(--color-ink)' }}
            >
              Set up your seeker profile first.
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--color-mid)' }}>
              You need to complete onboarding before you can manage documents.
            </p>
            <Link
              to="/onboarding/seeker"
              className="text-sm font-body font-semibold text-moss hover:underline"
            >
              Complete onboarding
            </Link>
          </div>
        )}

        {/* Error */}
        {showError && (
          <div
            className="rounded-[12px] p-8 text-center"
            style={{ backgroundColor: 'var(--color-mist)' }}
          >
            <p className="text-sm font-body text-mid">{errorState}</p>
          </div>
        )}

        {/* Empty */}
        {showEmpty && (
          <div
            className="rounded-[12px] p-12 text-center"
            style={{ backgroundColor: 'var(--color-mist)' }}
          >
            <p
              className="text-base font-body font-semibold mb-2"
              style={{ color: 'var(--color-ink)' }}
            >
              No documents uploaded yet.
            </p>
            <p className="text-sm" style={{ color: 'var(--color-mid)' }}>
              Add some during onboarding or from your profile.
            </p>
          </div>
        )}

        {/* List */}
        {showList && (
          <ul className="space-y-3">
            {docs!.map((doc) => (
              <li
                key={doc.id}
                className="bg-white border-[1.5px] border-fog rounded-[12px] p-4 flex items-center gap-3"
              >
                <FileText className="w-5 h-5 text-fern flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-body font-semibold text-ink truncate">
                    {doc.filename}
                  </p>
                  <p className="text-[11px] font-body text-light">
                    {formatBytes(doc.file_size_bytes)} · Uploaded {formatDate(doc.uploaded_at)}
                  </p>
                </div>
                <div className="w-[160px] flex-shrink-0">
                  <Select
                    options={TYPE_OPTIONS}
                    value={doc.document_type}
                    onValueChange={(val) => handleTypeChange(doc.id, val as DocumentType)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(doc)}
                  className="text-light hover:text-red p-1 transition-colors"
                  aria-label={`Delete ${doc.filename}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  )
}
