# Phase 11: Backend-Dependent Features - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire three backend features that were deferred from earlier phases: (1) match pool RPC for LivePreviewSidebar live estimates during post job wizard, (2) seeker document upload against a private Storage bucket in seeker onboarding step 3, and (3) completion screen matched-jobs query showing top 3 jobs after seeker onboarding finishes. No new UI components — this phase connects existing UI placeholders to real backend data.

</domain>

<decisions>
## Implementation Decisions

### Match pool RPC
- Create a Supabase RPC function (`estimate_match_pool`) that accepts partial job criteria (shed_type, region, accommodation) and returns a three-line breakdown: seekers in region, seekers with shed experience, seekers actively looking
- RPC accepts partial input — returns available estimates based on whatever fields are filled so far; missing fields are treated as "any"
- LivePreviewSidebar `MatchPoolEstimate` section wired to call the RPC with debounced 500ms delay as wizard fields change
- Shows "Calculating..." with spinner while RPC is in flight
- When no matching seekers exist, show 0 counts with encouraging copy ("Post your listing to attract seekers in this area")
- Replace the current hardcoded placeholder values (47/12/8) with live data

### Seeker document upload
- Single multi-file FileDropzone in SeekerStep3Qualifications for CV, certificates, and references
- Reuse existing `FileDropzone` component — extend to support `multiple: true` (currently `multiple: false`)
- Private `seeker-documents` Storage bucket with RLS — only the owning seeker can read/write their own files; employers cannot access this bucket
- Accepted file types: PDF, DOC, DOCX, JPG, PNG
- Max 10MB per file, max 5 files total
- Storage path: `{seeker_id}/documents/{timestamp}-{filename}`
- File URLs stored in `seeker_profiles.document_urls` (text[] column) — new DB column needed
- Files persist across wizard re-opens — show existing uploads with remove option

### Completion screen matched jobs
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Match scoring system
- `supabase/migrations/010_match_scores_precompute.sql` — Match score triggers, compute_match_score() function, trigger columns (shed_type, region, accommodation, etc.)
- `supabase/migrations/009_seeker_onboarding.sql` — Seeker profile schema, sector_pref column shape

### LivePreviewSidebar
- `src/components/ui/LivePreviewSidebar.tsx` — Current static MatchPoolEstimate section (lines 65-79), component prop interface
- `src/pages/jobs/PostJob.tsx` — Where LivePreviewSidebar is mounted, how wizard step data flows

### Document upload
- `src/components/ui/FileDropzone.tsx` — Existing single-file upload component (react-dropzone, Supabase Storage integration)
- `src/pages/onboarding/steps/SeekerStep3Qualifications.tsx` — Where document upload zone will be added
- `src/pages/verification/DocumentUpload.tsx` — Reference for employer document upload pattern (separate bucket)

### Completion screen
- `src/pages/onboarding/steps/SeekerStep7Complete.tsx` — Current placeholder "We're calculating your matches" section (lines 81-95), two-column layout
- `src/components/ui/MatchCircle.tsx` — Match score circle component for job cards

### Design tokens
- `src/index.css` — Color tokens (moss, hay, fog, cream, meadow, soil, fern), typography (Fraunces, DM Sans)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FileDropzone`: Fully built with Supabase Storage integration, drag-and-drop, preview, error handling — needs `multiple: true` support
- `MatchCircle`: Score circle component already used in job search cards
- `LivePreviewSidebar`: Mounted in PostJob wizard steps 2-5, has static MatchPoolEstimate section ready to wire
- `SeekerStep7Complete`: Two-column layout with "Your matches" placeholder section ready to wire
- `compute_match_score()`: SQL function already handles all 7 scoring dimensions — new RPC wraps this for aggregate estimates

### Established Patterns
- Supabase RPC calls via `supabase.rpc('function_name', { params })` — used in platform stats
- Storage uploads via `supabase.storage.from(bucket).upload()` — pattern in FileDropzone and FarmPhotoUpload
- Match scores table: `(job_id, seeker_id, total_score, breakdown, calculated_at)` with unique constraint on `(job_id, seeker_id)`
- Triggers fire synchronously on INSERT/UPDATE of seeker_profiles and jobs — scores available after trigger completes, but may take seconds for many pairs

### Integration Points
- PostJob wizard: `PostJob.tsx` passes step data to LivePreviewSidebar — need to debounce and call RPC with current field values
- SeekerOnboarding: `SeekerOnboarding.tsx` orchestrates steps — step 3 needs document upload zone added below qualifications
- SeekerStep7Complete: receives `profileData` prop — needs additional query for matched jobs from match_scores table
- New migration needed: `seeker_profiles.document_urls text[]` column, `seeker-documents` Storage bucket, RLS policies

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. All behavior specifications come from the success criteria in ROADMAP.md and decisions captured above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-backend-dependent-features*
*Context gathered: 2026-03-23*
