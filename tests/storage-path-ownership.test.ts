import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Test intent — audit F-24 (Tier 2, but a read-and-destroy vector).
//
// `seeker_documents.storage_path` is SEEKER-SUPPLIED FREE TEXT: DocumentUploader builds it
// client-side and inserts it. The table had 2 CHECKs and ZERO triggers.
//
// Storage RLS does key on the owner — `(storage.foldername(name))[1] = auth.uid()::text` on
// both the view and delete policies. But two SERVICE-ROLE paths read storage_path OUT OF THE
// ROW and act on it, and service role does not pass through storage RLS:
//
//   get-applicant-document-url:330   .createSignedUrl(docRow.storage_path, ...)
//   admin-purge:115                  .remove([doc.storage_path])
//
// So a seeker could point their own row at another seeker's file and have it (a) served to an
// employer they applied to, or (b) deleted. Read and destroy, through a column the client writes.
//
// Proven on prod inside a rolled-back transaction:
//   own path                       ACCEPTED
//   another seeker's path (INSERT) REJECTED
//   repointed by UPDATE            REJECTED
//   seeker_profiles id as prefix   REJECTED   (storage would refuse that path too)

const SQL = readFileSync(
  join(process.cwd(), 'supabase/migrations/099_storage_path_belongs_to_its_owner.sql'),
  'utf-8',
)

describe('F-24 — a document row cannot point at someone else file', () => {
  it('guards UPDATE as well as INSERT', () => {
    // An INSERT-only guard is bypassed by writing a valid row and then repointing it, which
    // is the easier attack because the row already exists and looks legitimate.
    expect(SQL).toMatch(
      /BEFORE INSERT OR UPDATE OF storage_path ON public\.seeker_documents/,
    )
  })

  it('compares against the USER id, not the seeker_profiles id', () => {
    // The storage policies compare `(storage.foldername(name))[1]` against auth.uid(). A
    // trigger that agreed with the TABLE instead of with STORAGE would happily accept rows
    // that storage then refuses — a guard that passes and a product that breaks.
    expect(SQL).toMatch(/SELECT sp\.user_id INTO v_owner/)
    expect(SQL).toMatch(/split_part\(NEW\.storage_path, '\/', 1\) <> v_owner::text/)
  })

  it('names the service-role paths that make this exploitable', () => {
    // Without them this reads like tidiness. With them it is read-and-destroy.
    expect(SQL).toMatch(/createSignedUrl/)
    expect(SQL).toMatch(/admin-purge/)
  })

  it('lets a null path through', () => {
    // A row with no path points nowhere; rejecting it would break the purge flow, which nulls
    // the path after removing the object.
    expect(SQL).toMatch(/IF NEW\.storage_path IS NULL THEN\s*\n\s*RETURN NEW;/)
  })

  it('refuses a row whose seeker has no profile', () => {
    // Otherwise v_owner is NULL, the comparison is NULL, the IF does not fire and the row
    // sails through unchecked — the same NULL-comparison trap as F-01's `!= 'admin'`.
    expect(SQL).toMatch(/IF v_owner IS NULL THEN\s*\n\s*RAISE EXCEPTION/)
  })
})
