import { supabase } from '@/lib/supabase'

interface DocUrlResult {
  url: string
  expires_in: number
}

/**
 * Returns a function that fetches a fresh signed URL for an applicant's
 * document via the get-applicant-document-url Edge Function.
 *
 * - No caching: every call mints a fresh URL. The 15-minute server-side
 *   TTL is the only constraint; clients never persist URLs.
 * - Throws on error rather than returning null. Callers wrap in try/catch
 *   and surface their own toast — keeps this hook pure (no UI dependency).
 * - The Edge Function is the privacy gate (5-layer authorization).
 *   This hook is just the wire.
 */
export function useApplicantDocumentUrl() {
  return async function getDocumentUrl(
    applicationId: string,
    documentId: string,
  ): Promise<string> {
    const { data, error } = await supabase.functions.invoke<DocUrlResult>(
      'get-applicant-document-url',
      { body: { application_id: applicationId, document_id: documentId } },
    )
    if (error) {
      console.error('useApplicantDocumentUrl: invoke failed', error)
      throw new Error(error.message ?? 'Failed to load document')
    }
    if (!data?.url) {
      throw new Error('Failed to load document')
    }
    return data.url
  }
}
