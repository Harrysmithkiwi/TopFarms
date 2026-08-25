# Phase 11: Backend-Dependent Features - Research

**Researched:** 2026-03-23
**Domain:** Supabase RPC, Supabase Storage (private bucket + RLS), React debounced async calls, polling hooks
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Match pool RPC**
- Create a Supabase RPC function (`estimate_match_pool`) that accepts partial job criteria (shed_type, region, accommodation) and returns a three-line breakdown: seekers in region, seekers with shed experience, seekers actively looking
- RPC accepts partial input — returns available estimates based on whatever fields are filled so far; missing fields are treated as "any"
- LivePreviewSidebar `MatchPoolEstimate` section wired to call the RPC with debounced 500ms delay as wizard fields change
- Shows "Calculating..." with spinner while RPC is in flight
- When no matching seekers exist, show 0 counts with encouraging copy ("Post your listing to attract seekers in this area")
- Replace the current hardcoded placeholder values (47/12/8) with live data

**Seeker document upload**
- Single multi-file FileDropzone in SeekerStep3Qualifications for CV, certificates, and references
- Reuse existing `FileDropzone` component — extend to support `multiple: true` (currently `multiple: false`)
- Private `seeker-documents` Storage bucket with RLS — only the owning seeker can read/write their own files; employers cannot access this bucket
- Accepted file types: PDF, DOC, DOCX, JPG, PNG
- Max 10MB per file, max 5 files total
- Storage path: `{seeker_id}/documents/{timestamp}-{filename}`
- File URLs stored in `seeker_profiles.document_urls` (text[] column) — new DB column needed
- Files persist across wizard re-opens — show existing uploads with remove option

**Completion screen matched jobs**
- SeekerStep7Complete `Your matches` section shows top 3 matched jobs from `match_scores` table
- Compact job cards: title, farm name, location, salary range, match score circle (reuse MatchCircle component)
- Poll every 3 seconds for up to 30 seconds after onboarding completes — match score triggers fire on seeker profile insert/update, but computation may take a few seconds
- If scores arrive within 30 seconds, display the top 3 by `total_score` descending
- If no scores after 30 seconds, keep the "We're calculating your matches" message with a "Browse Jobs" CTA
- If fewer than 3 matches exist, show however many there are with a "Browse all jobs" link below

### Claude's Discretion
- Exact SQL implementation of `estimate_match_pool` RPC (query strategy, indexing)
- FileDropzone `multiple` prop implementation details
- Polling hook implementation (useEffect vs custom hook)
- Migration numbering and column ordering
- RLS policy specifics for seeker-documents bucket

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SONB-02 | Step 3 includes document upload zone for CV/certificates/references (reuse FileDropzone) | FileDropzone needs `multiple: true` extension; private `seeker-documents` bucket with seeker-scoped RLS; `document_urls text[]` column on `seeker_profiles`; migration 016 covers all three DB concerns |
</phase_requirements>

---

## Summary

Phase 11 wires three backend-driven features that were intentionally deferred: a match pool estimate RPC for the LivePreviewSidebar, private document upload storage for seeker onboarding step 3, and live match score display on the seeker completion screen. No new UI components are introduced — all three features connect existing UI placeholders to real Supabase data.

The codebase is in excellent shape for this phase. The `estimate_match_pool` RPC will be a lightweight SQL function that aggregate-queries `seeker_profiles` using the same column set the trigger already guards (`shed_types_experienced`, `region`). The `FileDropzone` component already handles single-file Supabase Storage uploads; extending it to `multiple: true` requires splitting its internal state from one item to an array and adjusting the `useDropzone` options. The completion screen polling follows a straightforward `useEffect` with `setInterval` and a 30-second timeout.

The highest-risk item is the Storage bucket migration: the `seeker-documents` bucket must be private (not public), and RLS policies must use `auth.uid()` path-prefix matching — the exact same pattern established in migration 007 for `employer-documents`. The key constraint is that `FileDropzone` currently calls `getPublicUrl()` to obtain the URL after upload; for a private bucket, the correct API is `createSignedUrl()` or storing only the storage path and retrieving signed URLs on demand. The component must be extended to support both modes.

**Primary recommendation:** Create migration 016 first (bucket + column), extend `FileDropzone` for multi-file + private-bucket mode, then implement the RPC and wire each UI feature independently.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | Already installed | RPC calls, Storage upload, DB queries | Project-wide Supabase client |
| react-dropzone | Already installed (via FileDropzone) | Drag-and-drop file selection | Powers existing FileDropzone |
| React `useEffect` + `setInterval` | Built-in | Polling for match scores | No extra dependency needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | Already installed | Spinner, file icons in upload UI | Consistent with rest of codebase |
| sonner | Already installed | Toast on upload success/error | Consistent with rest of codebase |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `useEffect` polling | `@supabase/realtime` subscriptions | Realtime is overkill for a 30-second one-shot wait; polling is simpler and has no subscription cleanup issues |
| Signed URLs for private bucket | Public URL fallback | Private bucket MUST NOT use `getPublicUrl()` — it generates a URL that Supabase will reject with 400 because the bucket is not public |

**Installation:** No new packages required. All needed libraries are already in the project.

---

## Architecture Patterns

### Recommended Project Structure
```
supabase/migrations/
└── 016_phase11_seeker_documents.sql   # bucket + RLS + document_urls column

src/components/ui/
└── FileDropzone.tsx                    # extend multiple: true, private bucket mode

src/pages/jobs/PostJob.tsx             # add matchCriteria prop passthrough to LivePreviewSidebar
src/components/ui/LivePreviewSidebar.tsx  # wire MatchPoolEstimate to RPC call
src/pages/onboarding/steps/
├── SeekerStep3Qualifications.tsx      # add FileDropzone below certifications
└── SeekerStep7Complete.tsx            # replace spinner with poll + job cards
```

### Pattern 1: Supabase RPC Call
**What:** Call a SQL function via the Supabase client — receives structured input, returns jsonb
**When to use:** Aggregate queries that need SECURITY DEFINER to cross RLS boundaries, or any server-side computation

```typescript
// Established pattern in the project (see usages in landing page stats)
const { data, error } = await supabase.rpc('estimate_match_pool', {
  p_region: region ?? null,
  p_shed_types: shedTypes ?? null,
  p_accommodation: hasAccommodation ?? null,
})
// data shape: { seekers_in_region: number, seekers_with_shed: number, seekers_active: number }
```

### Pattern 2: Debounced RPC in React
**What:** Call RPC on every field change, but wait 500ms after the last change before firing
**When to use:** Any expensive async call triggered by user typing/selecting in a form

```typescript
// No useDebounce hook exists in project — implement inline with useEffect cleanup
useEffect(() => {
  const timer = setTimeout(async () => {
    setEstimateState('loading')
    const { data, error } = await supabase.rpc('estimate_match_pool', params)
    if (!error && data) setEstimate(data)
    setEstimateState('done')
  }, 500)
  return () => clearTimeout(timer)
}, [region, shedTypes, hasAccommodation])
```

### Pattern 3: Polling with Timeout
**What:** Retry a query every N seconds for up to M seconds, then give up gracefully
**When to use:** Waiting for an async backend process (trigger, edge function) to complete

```typescript
// Custom hook approach — clean separation from SeekerStep7Complete JSX
function useMatchScoresPoll(seekerId: string | null, enabled: boolean) {
  const [matches, setMatches] = useState<MatchedJob[]>([])
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (!seekerId || !enabled) return
    let attempts = 0
    const MAX_ATTEMPTS = 10 // 10 × 3s = 30s

    const interval = setInterval(async () => {
      attempts++
      const { data } = await supabase
        .from('match_scores')
        .select('total_score, jobs(id, title, region, salary_min, salary_max, employer_profiles(farm_name))')
        .eq('seeker_id', seekerId)
        .order('total_score', { ascending: false })
        .limit(3)

      if (data && data.length > 0) {
        setMatches(data)
        clearInterval(interval)
        return
      }
      if (attempts >= MAX_ATTEMPTS) {
        setTimedOut(true)
        clearInterval(interval)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [seekerId, enabled])

  return { matches, timedOut }
}
```

### Pattern 4: Private Storage Bucket Upload
**What:** Upload to a private bucket and store the storage path (not a public URL)
**When to use:** Files that must only be readable by the owning user

```typescript
// IMPORTANT: Do NOT use getPublicUrl() for private buckets
// Store the storage path; retrieve signed URL when displaying
const filePath = `${seekerId}/documents/${Date.now()}-${file.name}`
const { error } = await supabase.storage
  .from('seeker-documents')
  .upload(filePath, file, { upsert: false })

// To display later (short-lived signed URL):
const { data: signedData } = await supabase.storage
  .from('seeker-documents')
  .createSignedUrl(filePath, 3600) // 1 hour expiry
```

### Pattern 5: Multi-file FileDropzone Extension
**What:** Extend existing FileDropzone to support `multiple: true` by converting internal state from single-item to array-based
**When to use:** Document upload zones where users attach multiple files

The extension adds:
- `multiple?: boolean` prop (defaults to `false` for backward compatibility)
- `maxFiles?: number` prop (defaults to 1 when `multiple: false`)
- `onUploadComplete` changes signature to `(urls: string[]) => void` when `multiple: true` — OR — add a separate `onUploadsComplete?: (urls: string[]) => void` prop to preserve backward compat
- Internal state: `uploadedFiles: { name: string; path: string; status: 'uploading' | 'done' | 'error' }[]`
- `existingUrls?: string[]` prop alongside existing `existingUrl?: string`

**Backward compatibility approach:** Keep the original `onUploadComplete(url: string)` signature unchanged. Add `onUploadsComplete(urls: string[])` for multi-file mode. This avoids breaking the employer document upload at `/verification/document-upload`.

### Pattern 6: estimate_match_pool SQL Function
**What:** New SQL function that counts seekers matching partial job criteria
**When to use:** Called from LivePreviewSidebar whenever wizard fields change

```sql
CREATE OR REPLACE FUNCTION public.estimate_match_pool(
  p_region         text    DEFAULT NULL,
  p_shed_types     text[]  DEFAULT NULL,
  p_accommodation  boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_in_region    int;
  v_with_shed    int;
  v_active       int;
BEGIN
  -- Seekers in region (or all if no region specified)
  SELECT COUNT(*) INTO v_in_region
  FROM public.seeker_profiles
  WHERE (p_region IS NULL OR region = p_region);

  -- Seekers with shed type overlap
  SELECT COUNT(*) INTO v_with_shed
  FROM public.seeker_profiles
  WHERE (p_region IS NULL OR region = p_region)
    AND (p_shed_types IS NULL OR shed_types_experienced && p_shed_types);

  -- Seekers actively looking (using open_to_relocate as proxy — onboarding_complete as active signal)
  SELECT COUNT(*) INTO v_active
  FROM public.seeker_profiles
  WHERE (p_region IS NULL OR region = p_region)
    AND (p_shed_types IS NULL OR shed_types_experienced && p_shed_types)
    AND onboarding_complete = true;

  RETURN jsonb_build_object(
    'seekers_in_region', v_in_region,
    'seekers_with_shed',  v_with_shed,
    'seekers_active',     v_active
  );
END;
$$;

GRANT EXECUTE ON FUNCTION estimate_match_pool(text, text[], boolean) TO authenticated;
```

### Pattern 7: Storage RLS for Private Seeker Documents
**What:** Bucket policy that scopes reads/writes to the owning seeker's user ID prefix
**When to use:** Any private Storage bucket tied to a specific user

```sql
-- INSERT: seekers can upload to their own seeker_profile ID subfolder
-- NOTE: path prefix is seeker_profiles.id (UUID), not auth.uid()
-- because seekerProfileId (from seeker_profiles table) is used in the path.
-- However for simplicity and alignment with employer-documents pattern,
-- use auth.uid() as the first path segment.
CREATE POLICY "seekers upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'seeker-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.get_user_role(auth.uid()) = 'seeker'
);

CREATE POLICY "seekers view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'seeker-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "seekers delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'seeker-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Storage path clarification:** CONTEXT.md specifies `{seeker_id}/documents/{timestamp}-{filename}` where `seeker_id` is the `seeker_profiles.id` UUID. But RLS policy must match `auth.uid()` (the `auth.users.id`). These are different UUIDs. Two options:
1. Use `auth.uid()` as the path prefix (aligns with employer-documents pattern) — simpler RLS
2. Use `seeker_profiles.id` as prefix but RLS must join to look up seeker_id from auth.uid()

**Recommendation (Claude's discretion):** Use `auth.uid()` as the path prefix. Store paths as `{auth.uid()}/documents/{timestamp}-{filename}`. This keeps RLS simple and consistent with `employer-documents` pattern. Update CONTEXT.md's stated path format accordingly in the plan.

### Anti-Patterns to Avoid
- **`getPublicUrl()` on private bucket:** Will return a URL that works in Supabase dashboard preview but returns 400 for actual users. Always use `createSignedUrl()` for private buckets.
- **Calling RPC on every keystroke:** Debounce is mandatory. Without 500ms debounce, the wizard's typing triggers RPC on every character.
- **Polling without cleanup:** `setInterval` without `return () => clearInterval()` causes memory leaks and stale state updates on unmounted components.
- **Passing `seekerId` (seeker_profiles.id) vs `auth.uid()`:** The match_scores table uses `seeker_profiles.id` as the FK. The polling query must use `seekerProfileId` (the UUID from `seeker_profiles`, tracked in `SeekerOnboarding` as `seekerProfileId` state) — not `session.user.id`.
- **Breaking existing FileDropzone callers:** `DocumentUpload.tsx` uses single-file mode. The `multiple` extension must be additive, not changing the existing prop interface.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File drag-and-drop | Custom drag event handlers | `react-dropzone` (already in FileDropzone) | Handles browser compat, accessibility, rejection callbacks |
| Debounce timing | Manual setTimeout in every component | Reuse `useEffect` + `clearTimeout` pattern | No additional hook library needed; project has no `useDebounce` hook |
| Match score computation | New SQL function | `compute_match_score()` already exists — `estimate_match_pool` wraps aggregate counts, not per-seeker scores | Prevents duplication of scoring logic |
| Storage signed URLs | Manual fetch + signing headers | `supabase.storage.from(bucket).createSignedUrl()` | Supabase SDK handles JWT signing and expiry |

**Key insight:** The `compute_match_score()` function scores one seeker against one job. The new `estimate_match_pool` function is a different operation — aggregate COUNT queries against `seeker_profiles`. It does NOT call `compute_match_score()`. This is intentional: pool estimates are approximate counts, not exact match scores.

---

## Common Pitfalls

### Pitfall 1: Private Bucket URL Strategy
**What goes wrong:** Developer calls `getPublicUrl()` after upload to a private bucket. The Supabase client returns a URL without error, but loading the URL in the browser returns HTTP 400.
**Why it happens:** `getPublicUrl()` works regardless of bucket visibility — it generates the URL pattern without checking bucket policy.
**How to avoid:** For the `seeker-documents` bucket (private: true), always use `createSignedUrl(path, expirySeconds)` to retrieve URLs. Store the storage path (not the URL) in `document_urls`.
**Warning signs:** Uploaded file appears to succeed, but `<a href={url}>` or `<img src={url}>` shows broken link.

### Pitfall 2: match_scores Trigger Timing
**What goes wrong:** SeekerStep7Complete immediately queries `match_scores` on mount and finds 0 rows. Developer assumes polling works but trigger hasn't fired yet.
**Why it happens:** The trigger `seeker_profile_match_rescore` fires AFTER the `seeker_profiles` upsert — but the `SeekerOnboarding` renders step 7 before the DB upsert completes (it calls `wizard.nextStep()` before `setSaving(false)` actually reflects the upsert result).
**How to avoid:** Start polling only after `SeekerOnboarding`'s `handleStepComplete` for step 6 has completed its upsert. The component receives `profileData` as a prop — polling should start when the component mounts (step 7 renders), trusting that the trigger fired during the step 6 save.
**Warning signs:** First poll always returns 0; scores appear on second or third poll.

### Pitfall 3: seekerProfileId vs auth.uid() in Polling
**What goes wrong:** Polling query uses `session.user.id` as the `seeker_id` parameter. The `match_scores` table uses `seeker_profiles.id` as FK, which is a different UUID than `auth.users.id`.
**Why it happens:** Confusion between authentication ID and application record ID.
**How to avoid:** `SeekerOnboarding.tsx` already tracks `seekerProfileId` state (the `seeker_profiles.id` UUID from the upsert result). Pass this as a prop to `SeekerStep7Complete` alongside `profileData`.
**Warning signs:** Poll returns 0 rows forever even after trigger should have fired.

### Pitfall 4: FileDropzone Multiple-File Backward Compatibility
**What goes wrong:** Adding `multiple: true` support changes the `onUploadComplete` callback signature, breaking `DocumentUpload.tsx` and `FarmPhotoUpload` callers.
**Why it happens:** Developer modifies the single prop instead of adding new optional props.
**How to avoid:** Keep `onUploadComplete: (url: string) => void` unchanged for single-file mode. Add `onUploadsComplete?: (urls: string[]) => void` for multi-file mode. Gate behavior on the `multiple` prop.
**Warning signs:** TypeScript compilation errors in existing callers after the extension.

### Pitfall 5: LivePreviewSidebar Props Interface
**What goes wrong:** `MatchPoolEstimate` currently has no props — it's a standalone component with hardcoded values. Developer adds props to `MatchPoolEstimate` but forgets to thread match criteria from `PostJob.tsx` through `LivePreviewSidebar`.
**Why it happens:** `LivePreviewSidebar` renders `MatchPoolEstimate` internally; `PostJob.tsx` is the component that has the wizard field data.
**How to avoid:** Add a `matchCriteria?: { region?: string; shedTypes?: string[]; hasAccommodation?: boolean }` prop to `LivePreviewSidebar`. `PostJob.tsx` passes current `jobData` fields as this prop. `MatchPoolEstimate` becomes an inner component that receives those criteria and owns the debounced RPC call.
**Warning signs:** RPC is never called; sidebar continues showing hardcoded values.

### Pitfall 6: Migration Number Collision
**What goes wrong:** Using migration 016 conflicts with an already-applied migration.
**Why it happens:** Developer doesn't check the existing migrations list.
**How to avoid:** Current highest is `015_phase9_schema.sql` — next migration is `016_phase11_seeker_documents.sql`. Verified from filesystem.
**Warning signs:** `supabase db push` fails with "already exists" errors.

---

## Code Examples

Verified patterns from project source code:

### Supabase RPC Call (from platform stats usage)
```typescript
// Pattern: supabase.rpc(function_name, params) — returns { data, error }
// SECURITY DEFINER functions work for both anon and authenticated callers
const { data, error } = await supabase.rpc('estimate_match_pool', {
  p_region: jobData.region ?? null,
  p_shed_types: jobData.shed_type ?? null,
  p_accommodation: jobData.accommodation?.available ?? null,
})
```

### Storage Upload to Private Bucket
```typescript
// Upload (same as public bucket)
const filePath = `${session.user.id}/documents/${Date.now()}-${file.name}`
const { error } = await supabase.storage
  .from('seeker-documents')
  .upload(filePath, file, { upsert: false })

// Retrieve — private bucket: use createSignedUrl, NOT getPublicUrl
const { data: signedData } = await supabase.storage
  .from('seeker-documents')
  .createSignedUrl(filePath, 3600)
const displayUrl = signedData?.signedUrl
```

### Polling match_scores (adapted from hook pattern)
```typescript
// SeekerOnboarding must pass seekerProfileId to SeekerStep7Complete
// match_scores FK is seeker_profiles.id — not auth.uid()
const { data } = await supabase
  .from('match_scores')
  .select(`
    total_score,
    jobs (
      id, title, region, salary_min, salary_max,
      employer_profiles ( farm_name )
    )
  `)
  .eq('seeker_id', seekerProfileId)
  .order('total_score', { ascending: false })
  .limit(3)
```

### FileDropzone multiple=true extension
```typescript
// Add to FileDropzoneProps:
multiple?: boolean        // default false
maxFiles?: number         // default 1
onUploadsComplete?: (urls: string[]) => void  // multi-file callback

// In useDropzone options:
const { getRootProps, getInputProps } = useDropzone({
  accept,
  maxSize,
  multiple: multiple ?? false,
  maxFiles: multiple ? (maxFiles ?? 5) : 1,
  onDrop: async (acceptedFiles) => {
    if (!multiple) {
      // existing single-file path unchanged
    } else {
      // upload each file, collect paths, call onUploadsComplete
    }
  },
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getPublicUrl()` for all buckets | `createSignedUrl()` for private, `getPublicUrl()` for public | Since Supabase Storage launched private buckets | Phase must use correct API per bucket visibility |
| Realtime subscriptions for live data | Polling with timeout for short-lived waits | N/A — project choice | Simpler, no cleanup complexity for one-time 30s wait |

**Deprecated/outdated:**
- Hardcoded match pool numbers (47/12/8) in `LivePreviewSidebar.tsx` line 72-74: replaced by live RPC call

---

## Open Questions

1. **Storage path: `auth.uid()` vs `seeker_profiles.id` as prefix**
   - What we know: CONTEXT.md says `{seeker_id}/documents/...`; employer-documents uses `auth.uid()` as prefix
   - What's unclear: Is `seeker_id` in the path spec the `seeker_profiles.id` UUID or the `auth.uid()`?
   - Recommendation: Use `auth.uid()` as path prefix (simpler RLS, consistent with employer-documents pattern). Plan should document this deviation from CONTEXT.md's stated path format.

2. **seekerProfileId prop threading to SeekerStep7Complete**
   - What we know: `SeekerOnboarding.tsx` has `seekerProfileId` state; `SeekerStep7Complete` currently only receives `profileData`
   - What's unclear: Whether to add `seekerProfileId` prop to `SeekerStep7Complete` or perform a separate lookup inside the component
   - Recommendation: Add `seekerProfileId?: string` prop to `SeekerStep7Complete` — the parent already has this value, no extra query needed.

3. **match_scores join to jobs and employer_profiles**
   - What we know: `match_scores` has `job_id` FK; `jobs` has `employer_id` FK to `employer_profiles`
   - What's unclear: Whether Supabase's PostgREST handles two-level join in one select or requires a custom RPC
   - Recommendation: Test the two-level Supabase select first (PostgREST supports nested joins). If it fails, fall back to a thin RPC.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + React Testing Library (existing) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SONB-02 | FileDropzone renders multi-file upload zone in SeekerStep3 | unit | `npx vitest run src/pages/onboarding/steps/SeekerStep3Qualifications.test.tsx -x` | Wave 0 |
| SONB-02 | FileDropzone accepts multiple files and calls onUploadsComplete | unit | `npx vitest run src/components/ui/FileDropzone.test.tsx -x` | Partial (existing test may exist) |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/pages/onboarding/steps/SeekerStep3Qualifications.test.tsx` — covers SONB-02 upload zone render
- [ ] `src/components/ui/FileDropzone.test.tsx` — covers multiple mode behavior (check if exists first)

---

## Sources

### Primary (HIGH confidence)
- Project source files read directly: `LivePreviewSidebar.tsx`, `FileDropzone.tsx`, `PostJob.tsx`, `SeekerOnboarding.tsx`, `SeekerStep3Qualifications.tsx`, `SeekerStep7Complete.tsx`, `MatchCircle.tsx`, `DocumentUpload.tsx`
- Migration files read directly: `007_storage_buckets.sql`, `009_seeker_onboarding.sql`, `010_match_scores_precompute.sql`, `012_platform_stats_rpc.sql`
- Migration 015 is the current highest — next is 016 (confirmed via `ls supabase/migrations/`)

### Secondary (MEDIUM confidence)
- Supabase Storage private bucket behaviour (getPublicUrl vs createSignedUrl): consistent with Supabase documentation and known SDK behaviour as of 2025; project's existing employer-documents bucket (private: false vs private: true) establishes the pattern
- react-dropzone `multiple` and `maxFiles` props: well-documented, stable API

### Tertiary (LOW confidence)
- Two-level PostgREST join (`match_scores → jobs → employer_profiles`): known to work with Supabase, not directly verified against project's specific schema topology

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, all patterns already in use in project
- Architecture: HIGH — reading actual source files; patterns are established in existing code
- Pitfalls: HIGH — derived from direct code inspection of edge cases (getPublicUrl private bucket, seekerProfileId vs auth.uid())
- SQL RPC: MEDIUM-HIGH — `estimate_match_pool` logic is straightforward aggregate SQL; exact implementation is Claude's discretion per CONTEXT.md

**Research date:** 2026-03-23
**Valid until:** 2026-06-23 (stable stack; Supabase JS client API very unlikely to change)
