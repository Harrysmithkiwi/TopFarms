# What are the employer and seeker surfaces, by route?

Type: task
Status: resolved

## Question

Not a decision — the fact-gathering two decisions wait on. AFK; the agent can do this alone.

The brief warns that employer and seeker **have no directory boundary**: `src/pages/dashboard/`
and `src/pages/onboarding/` each hold both, split only by a `Seeker*` filename prefix.
**Scope by route, not by path.**

Produce, from `src/main.tsx` (the single place all 24 `requiredRole` routes are declared):

1. Every route per portal — employer, seeker — with its component and file path.
2. Which of them fetch, submit, or depend on a session (i.e. which owe all four §5 states).
3. Which route through a **shared** component versus hand-rolling their own states — the
   admin equivalent of "9 of 13 route through `AdminTable`".
4. The shared components that span portals (`ProtectedRoute`, `Button`, `Input`, `Skeleton`,
   `Card`, `Pagination`…), noting which already passed a gate pass on the admin leg.
5. Any surface that is genuinely marketing wearing a portal route — out of scope, but name it
   so it is not re-litigated.

Record the inventory as the answer on this ticket; `05` and `06` both read it.

## Answer

Resolved 2026-08-07. Source of truth is `src/main.tsx`; every claim below is from the route
table or from opening the component. Where a grep produced a number, it is marked.

**Correction first.** I previously reported the split as 13 admin / 7 employer / 4 seeker. That
was wrong — it came from a `sed` over grep output that counted three *comment* mentions of
`requiredRole="admin"` as routes. Verified count:

**11 admin + 8 employer + 5 seeker = 24 `<ProtectedRoute>` wrappers.**

### 1. The routes

**Employer — 8 routes, 7 components** (`PostJob` serves two):

| Route | Component | LOC |
|---|---|---|
| `/jobs/new`, `/jobs/:id/edit` | `pages/jobs/PostJob.tsx` | 569 |
| `/dashboard/employer` | `pages/dashboard/EmployerDashboard.tsx` | 671 |
| `/dashboard/employer/jobs/:id/applicants` | `pages/dashboard/employer/ApplicantDashboard.tsx` | 844 |
| `/dashboard/employer/verification` | `pages/verification/EmployerVerification.tsx` | 452 |
| `/dashboard/employer/verification/documents` | `pages/verification/DocumentUpload.tsx` | 196 |
| `/dashboard/employer/verification/photos` | `pages/verification/FarmPhotoUpload.tsx` | 255 |
| `/onboarding/employer` | `pages/onboarding/EmployerOnboarding.tsx` | 355 |

**Seeker — 5 routes, 5 components:**

| Route | Component | LOC |
|---|---|---|
| `/dashboard/seeker` | `pages/dashboard/SeekerDashboard.tsx` | 413 |
| `/dashboard/seeker/applications` | `pages/dashboard/seeker/MyApplications.tsx` | 374 |
| `/dashboard/seeker/saved-searches` | `pages/dashboard/seeker/SavedSearches.tsx` | 318 |
| `/dashboard/seeker/documents` | `pages/dashboard/seeker/SeekerDocuments.tsx` | 268 |
| `/onboarding/seeker` | `pages/onboarding/SeekerOnboarding.tsx` | 318 |

**5,033 LOC across 12 components.** The brief's warning holds and is worse than stated: the
split is not merely "no directory boundary" — the convention is *inconsistent*.
`EmployerDashboard.tsx` and `SeekerDashboard.tsx` sit loose in `pages/dashboard/`, while
`ApplicantDashboard` lives in `pages/dashboard/employer/` and three seeker pages in
`pages/dashboard/seeker/`. Two employer pages are in `pages/verification/` and one in
`pages/jobs/`. **Path tells you nothing. Scope by route.**

### 2. Which owe all four states

**All 12.** Every one fetches, submits, or depends on the session — verified by opening them,
not by grep. My first sweep reported five with zero fetches; that was an artefact, because
Prettier breaks the chains (`await supabase\n  .from(...)`) so `supabase.` never appears on one
line. Do not trust that grep shape.

### 3. Shared versus hand-rolled — the headline

**There is no `AdminTable` equivalent on either portal. Zero of the 12 inherit their states
from a shared data component; all 12 hand-roll.**

This is the single most important number in the inventory. On admin, 9 of 13 screens got
loading, empty and error for free because one component supplied them as *required* props. On
employer and seeker, every state is written per page, so every state is a place to differ —
and they do.

| | ErrorState | Skeleton | Unauthorised |
|---|---|---|---|
| Employer (7) | 6 | 2 | **0** |
| Seeker (5) | 3 | 4 | **0** |

**Unauthorised is 0 of 12** — the same systemic gap `AdminTable` had before `2749e1b`, and the
same one `ProtectedRoute` had before `606af9e`. Nothing on either portal distinguishes "the
server refused you" from "it broke".

### 4. Shared components spanning portals

| Component | Spans | Gate status |
|---|---|---|
| `ProtectedRoute` | all 3 | ✅ fixed `606af9e` |
| `Skeleton` (`RouteSkeleton`/`SectionSkeleton`/`TableSkeleton`) | all 3 | ✅ table variant announced `8d9cef6`; **`DetailSkeleton` + `PanelSkeleton` still silent** |
| `ErrorState` | employer + seeker only | ⚠️ good, see below |
| `DashboardLayout` (→ `Nav`, `Sidebar`) | employer + seeker | ❌ not audited |
| `Card`, `Button`, `Input`, `Tag`, `Pagination`, `Checkbox` | all 3 | ❌ not audited |
| `ApplicationCard`, `VerificationBadge`, `StepIndicator`, `ProgressBar`, `LivePreviewSidebar` | employer/seeker only | ❌ not audited |
| `AdminTable`, `KpiCard`, `AdminPageHeader`, `AdminSidebar` | admin only | ✅ / partial |

**`ErrorState` is the best state primitive in the codebase and should be the model for the
others.** `role="alert"`, a **required** `onRetry` ("an error the user cannot act on is a dead
end"), and a header comment that names the exact bug class it exists to kill — error collapsing
into empty, "an employer who paid to list a job was told *No applicants yet* when the request
had actually failed."

### 5. Boundary cases — where "scope by route" breaks

**`pages/jobs/JobDetail.tsx`, 1,057 LOC, is the problem.** It is a *public* route
(`/jobs/:id`, no `ProtectedRoute`) that branches three ways on session and role — `isVisitor`,
`isSeeker`, employer (`:419-420`, `:274`, `:395`) — and renders the fabricated
`VISITOR_TEASER_SCORE` to visitors (`:900`, `:910`).

- By route it is public, so the v13 port treated it under the **marketing** canon, and
  `CLAUDE.md` §10 says a design finding there is **discarded**.
- By behaviour it is session-dependent, role-branching product UI, so **§5's four states
  apply** and it is squarely in this gate's scope.

The brief's rule "scope by route, not path" cannot resolve this, because the *same route* is
both. Raised as [Which canon governs the session-branching public routes?](10-dual-canon-public-routes.md).
`/jobs` (`SearchJobs`) has the same dual nature in milder form.

Also session-dependent and outside `ProtectedRoute`: `/auth/select-role` (self-guards by
design) and `/suspended` (deliberately unguarded so a suspended session can land there).

### 6. Defects found while inventorying

Not fixed — this is a task ticket, and these are execution. Recorded so the employer/seeker
legs start with evidence rather than a blank page.

1. **`useVerifications` still does the thing `ErrorState` was built to stop.** On a failed
   fetch it `console.error`s and returns (`:59-61`), leaving `verifications` as `[]`, and
   `UseVerificationsReturn` (`:5-10`) has **no error field at all** — so
   `EmployerVerification.tsx` *cannot* distinguish "not verified yet" from "we could not find
   out", whatever it renders. Phase 5.6 fixed 22 call sites; this hook was missed because the
   fix was applied at call sites rather than to the hook.
2. **`SavedSearches` reports a load failure with `toast.error('Could not load saved searches')`
   (`:182`)** and no `ErrorState`. The toast vanishes; the page underneath shows the empty
   state. Same collapse, plus §5's one-signal rule.
3. **`SeekerDocuments` hand-rolls an error string** (`:61`, `:88`) — "Failed to load your
   documents. Try refreshing." — instead of using the shared `ErrorState`. "Try refreshing" is
   ⌘R, the dead end `AdminTable`'s error state was just fixed to remove.

### What this changes for the blocked tickets

- **`06` (one shared pass or per-portal)** is now nearly answered by fact: there is no shared
  data component to fix once on employer/seeker. The shared surface is layout and primitives
  (`DashboardLayout`, `ErrorState`, `Skeleton`, `Card`, `Button`, `Input`), not screens. A
  shared pass is cheap and narrow; the screen work cannot be shared because it was never
  shared to begin with.
- **`05` (calibration per portal)** now has its inventory. Note both portals are
  customer-facing, unlike admin.
- **`03` (match score)** is coupled to the new `10` — it cannot be ruled without deciding which
  canon governs `JobDetail`.
