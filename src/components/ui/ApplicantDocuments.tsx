import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useApplicantDocumentUrl } from '@/hooks/useApplicantDocumentUrl'
import { EMPLOYER_VISIBLE_DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from '@/types/domain'
import type { DocumentType, SeekerDocument } from '@/types/domain'
import { cn } from '@/lib/utils'

interface ApplicantDocumentsProps {
  applicationId: string
  seekerId: string
}

// Inline rather than extracting to a util — formatBytes/formatDate already
// exist in SeekerDocuments.tsx (Phase 14-02). Sharing across components is
// post-launch hygiene, not a 14-03 scope item.
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

const SECTIONS: Array<{ type: DocumentType; title: string }> = [
  { type: 'cv',          title: DOCUMENT_TYPE_LABELS.cv },          // 'CV'
  { type: 'certificate', title: 'Certificates' },
  { type: 'reference',   title: 'References' },
]

/**
 * Inline Documents section for the ApplicantPanel CV tab. Lists the
 * applicant's documents grouped by type (CV / Certificates / References)
 * with a per-row "View" action that mints a fresh signed URL via the
 * get-applicant-document-url Edge Function.
 *
 * Defence-in-depth on identity exclusion (third layer alongside RLS
 * default-deny + Edge Function whitelist):
 *   - Listing query filters .in('document_type', EMPLOYER_VISIBLE_DOCUMENT_TYPES)
 *     so identity rows never reach the client payload.
 *   - The bucketing loop ALSO checks EMPLOYER_VISIBLE_DOCUMENT_TYPES.includes
 *     in case a future code change drops the query filter.
 */
export function ApplicantDocuments({ applicationId, seekerId }: ApplicantDocumentsProps) {
  const [docs, setDocs] = useState<SeekerDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [errorState, setErrorState] = useState<string | null>(null)
  const getDocumentUrl = useApplicantDocumentUrl()

  useEffect(() => {
    if (!seekerId) return
    let cancelled = false
    setLoading(true)
    setErrorState(null)
    supabase
      .from('seeker_documents')
      .select('*')
      .eq('seeker_id', seekerId)
      .in('document_type', EMPLOYER_VISIBLE_DOCUMENT_TYPES)
      .order('document_type', { ascending: true })
      .order('uploaded_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('ApplicantDocuments: query failed', error)
          setErrorState('Failed to load documents')
          setDocs([])
        } else {
          setDocs((data ?? []) as SeekerDocument[])
        }
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [seekerId])

  async function handleView(doc: SeekerDocument) {
    try {
      const url = await getDocumentUrl(applicationId, doc.id)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to open document'
      console.error('ApplicantDocuments: view failed', err)
      toast.error(msg)
    }
  }

  // Bucket by document_type — third defence-in-depth layer below RLS + Edge Function whitelist.
  // identity + other are declared here for `Record<DocumentType>` type completeness only;
  // they never receive pushes because the EMPLOYER_VISIBLE_DOCUMENT_TYPES.includes check
  // below excludes them (and the listing query already filters them out upstream).
  const buckets: Record<DocumentType, SeekerDocument[]> = {
    cv: [], certificate: [], reference: [], identity: [], other: [],
  }
  for (const doc of docs) {
    if (EMPLOYER_VISIBLE_DOCUMENT_TYPES.includes(doc.document_type)) {
      buckets[doc.document_type].push(doc)
    }
  }

  if (loading) {
    return (
      <div>
        <p
          className="text-[11px] font-body font-semibold uppercase tracking-wide mb-2"
          style={{ color: 'var(--color-light)' }}
        >
          Documents
        </p>
        <div className="space-y-1.5">
          <div className="h-9 bg-fog rounded-md animate-pulse" />
          <div className="h-9 bg-fog rounded-md animate-pulse" />
        </div>
      </div>
    )
  }

  if (errorState) {
    return (
      <div>
        <p
          className="text-[11px] font-body font-semibold uppercase tracking-wide mb-2"
          style={{ color: 'var(--color-light)' }}
        >
          Documents
        </p>
        <p className="text-[12px] font-body italic" style={{ color: 'var(--color-red)' }}>
          {errorState}
        </p>
      </div>
    )
  }

  const totalVisibleDocs = SECTIONS.reduce((sum, s) => sum + buckets[s.type].length, 0)

  if (totalVisibleDocs === 0) {
    return (
      <div>
        <p
          className="text-[11px] font-body font-semibold uppercase tracking-wide mb-2"
          style={{ color: 'var(--color-light)' }}
        >
          Documents
        </p>
        <p className="text-[12px] font-body italic" style={{ color: 'var(--color-mid)' }}>
          No documents uploaded by this applicant
        </p>
      </div>
    )
  }

  return (
    <div>
      <p
        className="text-[11px] font-body font-semibold uppercase tracking-wide mb-2"
        style={{ color: 'var(--color-light)' }}
      >
        Documents
      </p>
      <div className="space-y-3">
        {SECTIONS.map(({ type, title }) => {
          const sectionDocs = buckets[type]
          if (sectionDocs.length === 0) return null
          return (
            <div key={type}>
              <p
                className="text-[12px] font-body font-semibold mb-1.5"
                style={{ color: 'var(--color-mid)' }}
              >
                {title}
              </p>
              <ul className="space-y-1.5">
                {sectionDocs.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center gap-3 p-2 rounded-md border border-fog bg-white"
                  >
                    <FileText className="w-4 h-4 text-fern flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-body text-ink truncate">
                        {doc.filename}
                      </p>
                      <p className="text-[11px] font-body text-light">
                        {formatBytes(doc.file_size_bytes)} · Uploaded {formatDate(doc.uploaded_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleView(doc)}
                      className={cn(
                        'text-[12px] font-body font-semibold flex-shrink-0',
                        'text-moss hover:underline',
                      )}
                    >
                      View
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
