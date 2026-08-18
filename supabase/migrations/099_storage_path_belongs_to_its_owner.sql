-- 099 — storage_path must belong to the seeker who owns the row (audit F-24, Phase E)
--
-- `seeker_documents.storage_path` is SEEKER-SUPPLIED FREE TEXT. `DocumentUploader.tsx:126`
-- builds it client-side as `${path}/${Date.now()}-${filename}` and `:146` inserts it. The
-- table had 2 CHECK constraints and ZERO triggers, and nothing anywhere tied the path to the
-- person the row belongs to.
--
-- Storage RLS does key on the owner — both `seekers view own documents` and `seekers delete
-- own documents` require `(storage.foldername(name))[1] = auth.uid()::text`. But TWO SERVICE-
-- ROLE paths read `storage_path` OUT OF THIS ROW and act on it, and service role does not go
-- through storage RLS:
--
--   get-applicant-document-url:330   .createSignedUrl(docRow.storage_path, ...)
--   admin-purge:115                  .remove([doc.storage_path])
--
-- So a seeker could point their own document row at ANOTHER seeker's file and then either
-- (a) have an employer they applied to handed a signed URL to that person's document, or
-- (b) have admin-purge delete it. Read and destroy, both through a column the client writes.
--
-- The first path segment must be the owner's USER id, not their seeker_profiles id — that is
-- what the storage policies compare against, and a trigger that agreed with the table instead
-- of with storage would pass rows that storage then refuses.
--
-- Verified before applying: 0 rows in seeker_documents, so nothing to grandfather and the
-- 019 backfill the audit warns about has left nothing behind.

BEGIN;

CREATE OR REPLACE FUNCTION public._assert_storage_path_owned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid;
BEGIN
  IF NEW.storage_path IS NULL THEN
    RETURN NEW;   -- nothing to point anywhere
  END IF;

  SELECT sp.user_id INTO v_owner
  FROM public.seeker_profiles sp WHERE sp.id = NEW.seeker_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'seeker_documents.seeker_id % has no profile', NEW.seeker_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Compared against the USER id because that is what the storage policies compare against.
  IF split_part(NEW.storage_path, '/', 1) <> v_owner::text THEN
    RAISE EXCEPTION
      'storage_path must start with the owning user id (%), got %',
      v_owner, split_part(NEW.storage_path, '/', 1)
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public._assert_storage_path_owned() IS
  'Audit F-24: storage_path is client-written free text, and two service-role paths (get-applicant-document-url signing, admin-purge removing) act on it WITHOUT going through storage RLS. Without this a seeker could point their row at another seeker file and have it served to an employer or deleted. Compares the first segment against seeker_profiles.user_id because that is what the storage policies compare against.';

DROP TRIGGER IF EXISTS seeker_documents_storage_path_owned ON public.seeker_documents;
CREATE TRIGGER seeker_documents_storage_path_owned
  BEFORE INSERT OR UPDATE OF storage_path ON public.seeker_documents
  FOR EACH ROW EXECUTE FUNCTION public._assert_storage_path_owned();

COMMIT;
