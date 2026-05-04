import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { ArrowLeft, ImageIcon, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useVerifications } from '@/hooks/useVerifications'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { FileDropzone } from '@/components/ui/FileDropzone'
import type { StorageError } from '@supabase/storage-js'

interface StorageObject {
  name: string
  updated_at?: string | null
  created_at?: string | null
  last_accessed_at?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Farm photo upload page for employer verification.
 * Accepts images (JPG, PNG, WEBP) up to 10MB.
 * Uses the public 'employer-photos' bucket.
 * On upload complete: upserts employer_verifications with method='farm_photo', status='verified'.
 * Renders a grid of all previously uploaded photos by listing the storage bucket path.
 */
export function FarmPhotoUpload() {
  const { session } = useAuth()
  const [employerId, setEmployerId] = useState<string | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [photos, setPhotos] = useState<string[]>([])
  const [loadingPhotos, setLoadingPhotos] = useState(false)

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
        if (error) {
          console.error('FarmPhotoUpload: failed to load employer profile', error)
        } else {
          setEmployerId(data?.id ?? null)
        }
        setLoadingProfile(false)
      })
  }, [session?.user?.id])

  // Load existing photos from storage
  useEffect(() => {
    if (!session?.user?.id) return

    const userId = session.user.id
    setLoadingPhotos(true)

    supabase.storage
      .from('employer-photos')
      .list(`${userId}/farm`, { sortBy: { column: 'created_at', order: 'desc' } })
      .then(({ data, error }: { data: StorageObject[] | null; error: StorageError | null }) => {
        if (error || !data) {
          setLoadingPhotos(false)
          return
        }

        // Get public URLs for all photos
        const urls = data
          .filter((file) => file.name !== '.emptyFolderPlaceholder')
          .map((file) => {
            const { data: urlData } = supabase.storage
              .from('employer-photos')
              .getPublicUrl(`${userId}/farm/${file.name}`)
            return urlData.publicUrl
          })

        setPhotos(urls)
        setLoadingPhotos(false)
      })
  }, [session?.user?.id])

  async function handleUploadComplete(url: string) {
    if (!employerId) return

    // Add the new photo to the local list immediately
    setPhotos((prev) => [url, ...prev])

    const { error } = await supabase.from('employer_verifications').upsert(
      {
        employer_id: employerId,
        method: 'farm_photo',
        status: 'verified',
        document_url: url,
        verified_at: new Date().toISOString(),
      },
      { onConflict: 'employer_id,method' },
    )

    if (error) {
      console.error('FarmPhotoUpload: failed to upsert verification record', error)
      toast.error('Photo uploaded but verification record failed to save')
      return
    }

    toast.success('Farm photo uploaded successfully')
    await refresh()
  }

  const farmPhotoVerification = verifications.find((v) => v.method === 'farm_photo')

  if (loadingProfile && !employerId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-brand animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        {/* Back navigation */}
        <Link
          to="/dashboard/employer/verification"
          className="inline-flex items-center gap-1.5 text-[13px] font-body text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Verification
        </Link>

        {/* Page header */}
        <div>
          <h1 className="font-display text-3xl font-semibold" style={{ color: 'var(--color-brand-900)' }}>
            Upload Farm Photos
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Show seekers what your farm looks like — photos help build trust and attract better
            candidates
          </p>
        </div>

        {/* Upload card */}
        <Card className="p-6">
          <h2 className="text-[14px] font-body font-semibold text-text mb-1">Add Farm Photo</h2>
          <p className="text-[12px] font-body text-text-muted mb-4">
            Accepted formats: JPG, PNG, WEBP. Maximum file size: 10MB.
          </p>

          {session?.user?.id ? (
            <FileDropzone
              bucket="employer-photos"
              path={`${session.user.id}/farm`}
              accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] }}
              maxSize={10 * 1024 * 1024}
              label="Drag and drop farm photos, or click to browse"
              onUploadComplete={handleUploadComplete}
            />
          ) : (
            <p className="text-[13px] font-body text-text-muted">Please log in to upload photos.</p>
          )}
        </Card>

        {/* Photo gallery */}
        {(loadingPhotos || photos.length > 0) && (
          <Card className="p-5">
            <h3 className="text-[13px] font-body font-semibold text-text mb-3">
              Uploaded Photos
              {farmPhotoVerification?.status === 'verified' && (
                <span className="ml-2 text-[11px] font-body font-normal text-brand">
                  (verified)
                </span>
              )}
            </h3>

            {loadingPhotos ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-brand animate-spin" />
              </div>
            ) : photos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((url, index) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-square rounded-[8px] overflow-hidden bg-surface-2 hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={url}
                      alt={`Farm photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 rounded-[8px] bg-surface-2">
                <ImageIcon className="w-8 h-8 text-text-subtle mb-2" />
                <p className="text-[12px] font-body text-text-subtle">No photos uploaded yet</p>
              </div>
            )}
          </Card>
        )}

        {/* Help text */}
        <p className="text-[12px] font-body text-text-subtle">
          Great farm photos include: milking shed, paddocks, accommodation, farm equipment, and
          scenic views. Authentic photos help seekers make informed decisions.
        </p>
      </div>
    </DashboardLayout>
  )
}
