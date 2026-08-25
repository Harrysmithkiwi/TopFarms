# Phase 21: v2.0 Close + Post-Launch Ops - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Two concurrent tracks:

**Track A — v2.0 milestone closeout (operator actions, no new code):**
- PEND-01: Stripe live-mode key swap (follow checklist in `.planning/DECISIONS-PENDING.md` §PEND-01)
- Five visual smoke tests from Phases 18.2/20.1 human-verification gates
- After both pass: flip 18.1 SC-2 from PARTIAL → PASS, run `/gsd:complete-milestone v2.0`

**Track B — first post-launch ops features (new code):**
- `is_active` login-blocking: suspended users hit a gate page instead of a broken dashboard
- Doc verification queue: admin reviews and approves/rejects seeker-uploaded documents

Phase 21 does NOT include: broadcast comms, moderation queue, advanced analytics, JWT migration, employer document review (employer docs auto-verify on upload — no queue needed for now).

</domain>

<decisions>
## Implementation Decisions

### is_active blocking

- **Enforcement layer:** `ProtectedRoute` — AuthContext's `loadRole` fetches `is_active` alongside `role` from `user_roles`. If `is_active = false`, `ProtectedRoute` redirects to `/suspended` instead of the dashboard.
- **Gate page route:** `/suspended` — new unauthenticated-accessible route (user has a session but is blocked from dashboards).
- **Gate page message:** "Your account has been suspended. If you think this is an error, contact hello@topfarms.co.nz." Simple, no links into the app.
- **Full gate:** No access to any authenticated content while suspended. No partial views.
- **Re-activation:** Manual only — admin flips `is_active` back to `true` via the existing ProfileDrawer toggle in the Super Admin panel. No self-service path.
- **Existing infrastructure:** `admin_set_user_active` RPC and ProfileDrawer toggle already exist and work. Only the client-side enforcement is missing.

### Doc verification queue

- **Admin page:** New route at `/admin/documents` in the existing Super Admin panel.
- **Queue displays per document:** seeker name, document type (CV / Certificate / Reference / Identity / Other — from `DocumentType`), upload date, current status (pending / approved / rejected).
- **Document preview:** Link to document using the existing `get-applicant-document-url` Edge Function — needs an admin bypass path (admin calls it without the seeker's JWT, or via a new admin RPC that returns a signed URL).
- **Three actions:**
  1. **Approve** — sets `status = 'approved'` on `seeker_documents` row; triggers email to seeker ("Your document has been approved")
  2. **Reject** — sets `status = 'rejected'`; requires admin to enter a reason; triggers email to seeker with reason
  3. **Request More Info** — sends email to seeker asking them to re-upload; does NOT change status (or sets to a `needs_resubmission` state — downstream to decide)
- **Seeker-visible outcome:** When a document is approved, seeker profile shows a "Documents Verified" badge visible to employers on applicant cards/panels.
- **DB change required:** `seeker_documents` table currently has NO `status` column — migration needed to add `status: 'pending' | 'approved' | 'rejected'` (and optionally `rejection_reason: text`). New uploads default to `'pending'`.
- **Existing docs:** Only `seeker_documents` are queued for admin review. Employer documents continue to auto-verify on upload (no change to existing employer verification flow).

### Smoke tests + PEND-01 (operator checklist — no code)

Five smoke tests (browser UAT):
- (a) My Documents link visible in seeker nav/sidebar
- (b) MarkFilledModal shows applicant names + status + points, not UUIDs
- (c) Salary preset chips render in seeker onboarding step 5 (not number input)
- (d) AUTH-FIX-02 console.time output appears in DevTools when loading dashboard
- (e) Phase 20.1 admin fresh-session login: sign out → clear cache → sign in → `/admin` → no AccessDenied

PEND-01: follow the 9-item checklist in `.planning/DECISIONS-PENDING.md` §PEND-01 exactly.

**"Done" definition for v2.0 close:** all 5 smoke tests pass + SC-2 in 18.1-VERIFICATION.md flips to PASS. Then run `/gsd:complete-milestone v2.0`.

### Claude's Discretion

- Exact shape of `loadRole` return type extension (add `is_active` to existing outcome type vs separate fetch)
- Whether "Request More Info" sets a `needs_resubmission` status or leaves status as `pending`
- Styling and layout of the `/suspended` gate page (simple, consistent with existing auth pages)
- Admin document queue pagination and sort order (newest pending first recommended)
- Whether "Documents Verified" badge on seeker profile is a new component or reuses `VerificationBadge`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auth enforcement
- `src/components/layout/ProtectedRoute.tsx` — current enforcement layer; is_active check added here
- `src/contexts/AuthContext.tsx` — `loadRole` function (lines 30–44) fetches from `user_roles`; extend to also return `is_active`

### Admin panel (integration point)
- `src/components/admin/ProfileDrawer.tsx` — existing suspend/reactivate toggle via `admin_set_user_active` RPC
- `src/pages/admin/EmployerList.tsx` — pattern for admin list pages (AdminTable + ProfileDrawer composition)
- `src/pages/admin/SeekerList.tsx` — same pattern for seeker-side

### Document types and storage
- `src/types/domain.ts` — `SeekerDocument` interface (no `status` field currently), `DocumentType`, `EMPLOYER_VISIBLE_DOCUMENT_TYPES`, `DOCUMENT_TYPE_LABELS`
- `src/components/ui/DocumentUploader.tsx` — existing seeker upload component; shows how `seeker_documents` rows are created
- `supabase/functions/get-applicant-document-url/index.ts` — Edge Function for signed URL generation; needs admin bypass

### v2.0 closeout
- `.planning/DECISIONS-PENDING.md` §PEND-01 — 9-item Stripe live-mode checklist
- `.planning/phases/18.1-pre-launch-hardening/18.1-VERIFICATION.md` — SC-2 PARTIAL verdict to flip after PEND-01
- `.planning/v2.0-MILESTONE-AUDIT.md` — milestone audit to update after Phase 21 ships

### DB schema
- `supabase/migrations/` — check latest migration number before adding new one; `seeker_documents` table defined in migration 019

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AdminTable` component (`src/components/admin/AdminTable.tsx`) — searchable/paginated table used in all admin list pages; the doc queue will use this pattern
- `ProfileDrawer` (`src/components/admin/ProfileDrawer.tsx`) — slide-in drawer pattern; could be reused for doc detail/action view
- `Tag` component — `variant="warn"` for pending, `variant="green"` for approved, `variant="red"` for rejected
- `get-applicant-document-url` Edge Function — signed URL generation; employer-facing currently but needs admin path
- `admin_set_user_active` RPC — model for the admin approval RPCs to follow (SECURITY DEFINER pattern)

### Established Patterns
- Auth enforcement: session → role → route guard in ProtectedRoute (all in `src/components/layout/ProtectedRoute.tsx`)
- Admin RPCs: `SECURITY DEFINER` functions in `supabase/migrations/023_admin_rpcs.sql` — doc queue actions should follow this pattern
- Email notifications: Resend via `send-followup-emails` Edge Function — existing email infra for approve/reject/request-more-info emails

### Integration Points
- `src/main.tsx` — route registration for `/suspended` (new) and `/admin/documents` (new)
- `src/contexts/AuthContext.tsx` — `loadRole` return type needs `is_active` field
- Admin sidebar — needs "Documents" nav link added (existing `AdminSidebar` component)

</code_context>

<specifics>
## Specific Ideas

- The `/suspended` page should be simple and consistent with the existing auth page shell (same background, centered card layout matching `/login`)
- "Documents Verified" badge on seeker profile should be visible on employer-facing applicant cards so employers can see verified seekers at a glance
- Admin doc queue: newest pending documents first; approved/rejected below (or separate tabs — planner to decide)

</specifics>

<deferred>
## Deferred Ideas

- Employer document review queue — employer docs currently auto-verify on upload; flagged for a future phase if fraud risk materialises
- Broadcast comms (bulk messaging to employers/seekers) — deferred from MVP, v2.1 candidate
- Moderation queue — deferred from MVP
- Advanced analytics — deferred from MVP
- JWT HS256→ES256 migration — flagged in milestone audit as "deserves own phase"; recommend Phase 22

</deferred>

---

*Phase: 21-v20-close-post-launch-ops*
*Context gathered: 2026-05-16*
