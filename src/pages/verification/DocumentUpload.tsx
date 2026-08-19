import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { ArrowLeft, FileText, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { reportError } from '@/lib/observability'
import { useAuth } from '@/hooks/useAuth'
import { useVerifications } from '@/hooks/useVerifications'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { FileDropzone } from '@/components/ui/FileDropzone'
import { ErrorState } from '@/components/ui/ErrorState'

/**
 * Document upload page for employer verification.
 * Accepts images and PDFs up to 10MB.
 * On upload complete: upserts employer_verifications with method='document'. Status is left to
 * the column DEFAULT ('pending') — an admin approves via the verification queue (Phase 3 Task 3.2).
 * Shows list of previously uploaded documents.
 */
export function DocumentUpload() {
  const { session } = useAuth()
  const [employerId, setEmployerId] = useState<string | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  // Phase 5.6 — a failed profile fetch left employerId null, which rendered
  // the form but silently blocked every submit. A dead UI, not an error.
  const [profileError, setProfileError] = useState(false)
  const [reloadNonce, setReloadNonce] = useState(0)

  const { verifications, refresh } = useVerifications(employerId)

  // Load employer profile ID
  useEffect(() => {
    if (!session?.user?.id) return

    supabase
      .from('employer_profiles')
      .select('id')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (error && error.code !== 'PGRST116') {
          reportError('document upload: load employer profile', error)
          setProfileError(true)
        } else {
          setEmployerId(data?.id ?? null)
        }
        setLoadingProfile(false)
      })
  }, [session?.user?.id, reloadNonce])

  async function handleUploadComplete(url: string) {
    if (!employerId) return

    // Phase 3 Task 3.2 (audit P0-9): the browser must NOT set status. Uploading a
    // file is a SUBMISSION, not a verification — an admin decides via the
    // /admin/documents verification queue.
    //
    // Audit F-11 (reopened 2026-08-17, migration 086). This writer was recorded as the one
    // that "already worked"; it never did. Omitting `status` was correct, but the UPSERT
    // FORM was denied regardless: PostgREST puts the conflict keys in `DO UPDATE SET` and
    // Postgres checks UPDATE privilege at PLAN time, while `authenticated` holds INSERT
    // only on employer_id/method. Verified on live prod — 42501 on the first upload, with
    // the file already in storage and nothing recording it.
    //
    // The definer RPC hard-codes status='pending', so the review step is intact.
    const { error } = await supabase.rpc('employer_submit_verification', {
      p_method: 'document',
      p_document_url: url,
    })

    if (error) {
      reportError('document upload: record submission', error)
      toast.error('Upload recorded but verification record failed to save')
      return
    }

    toast.success('Document submitted — we’ll review it and update your badge')
    await refresh()
  }

  const documentVerification = verifications.find((v) => v.method === 'document')
  const existingDocumentUrl = documentVerification?.document_url

  if (profileError) {
    return (
      <DashboardLayout>
        <ErrorState
          message="We could not load your farm profile"
          onRetry={() => {
            setProfileError(false)
            setReloadNonce((n) => n + 1)
          }}
        />
      </DashboardLayout>
    )
  }

  if (loadingProfile && !employerId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="text-brand h-6 w-6 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        {/* Back navigation */}
        <Link
          to="/dashboard/employer/verification"
          className="font-body text-text-muted hover:text-text inline-flex items-center gap-1.5 text-[13px] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Verification
        </Link>

        {/* Page header */}
        <div>
          <h1
            className="font-display text-[36px] leading-[44px] font-semibold"
            style={{ color: 'var(--color-brand-900)' }}
          >
            Upload Verification Documents
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Upload business registration, farm ownership, or other verification documents
          </p>
        </div>

        {/* Upload card */}
        <Card className="p-6">
          <h2 className="font-body text-text mb-1 text-[14px] font-semibold">
            Verification Document
          </h2>
          <p className="font-body text-text-muted mb-4 text-[12px]">
            Accepted formats: JPG, PNG, PDF. Maximum file size: 10MB.
          </p>

          {session?.user?.id ? (
            <FileDropzone
              bucket="employer-documents"
              path={`${session.user.id}/documents`}
              accept={{
                'image/*': ['.png', '.jpg', '.jpeg'],
                'application/pdf': ['.pdf'],
              }}
              maxSize={10 * 1024 * 1024}
              label="Drag and drop your document, or click to browse"
              existingUrl={existingDocumentUrl}
              onUploadComplete={handleUploadComplete}
            />
          ) : (
            <p className="font-body text-text-muted text-[13px]">
              Please log in to upload documents.
            </p>
          )}
        </Card>

        {/* Currently uploaded document */}
        {existingDocumentUrl && (
          <Card className="p-5">
            <h3 className="font-body text-text mb-3 text-[13px] font-semibold">
              Uploaded Document
            </h3>
            <div className="bg-surface-2 flex items-center gap-3 rounded-[8px] p-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[rgba(74,124,47,0.10)]">
                <FileText className="text-brand h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-body text-text truncate text-[13px]">Verification document</p>
                {/* Audit F-11: this said "Verified". A document sits at status='pending'
                    until an admin rules on it, so the upload surface must not award the
                    badge the queue has not granted. */}
                <p className="font-body text-text-subtle text-[11px]">
                  Uploaded to secure storage — awaiting review
                </p>
              </div>
              <a
                href={existingDocumentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-body text-brand-hover hover:text-brand-900 flex-shrink-0 text-[11px] transition-colors"
              >
                View
              </a>
            </div>
          </Card>
        )}

        {/* Help text */}
        <p className="font-body text-text-subtle text-[12px]">
          Acceptable documents include: business registration certificate, farm lease or ownership
          deed, RMA consent, or similar official business documents.
        </p>
      </div>
    </DashboardLayout>
  )
}
