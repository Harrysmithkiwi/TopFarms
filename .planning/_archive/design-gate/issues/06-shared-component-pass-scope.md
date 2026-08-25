# One shared-component gate pass, or one per portal?

Type: grilling
Status: resolved
Blocked by: 04

## Question

The admin leg's Phase B works shared components before screens, because "fixing a defect in
`AdminTable` fixes it nine times." Several components span **all three** portals — the fix to
`ProtectedRoute` already reached 24 routes, and `Skeleton`, `Button`, `Input`, `Card` and
`Pagination` are portal-agnostic.

Decide the unit of work:

- **One shared-component pass**, portal-agnostic, done once and inherited by all three. Then
  each portal's own pass covers only its screens.
- **Per-portal passes**, accepting that shared components get looked at up to three times.

The first is obviously cheaper and is probably right — but it changes what "Gate B" means for
the admin leg, which is **currently in progress and already has `AdminTable` done**. So the
real question is whether the admin Phase B in flight should be re-scoped mid-stream into a
portal-agnostic shared pass, or finished as-is with a separate shared pass after.

Read `04`'s inventory before answering — the shared surface list is item 4 on it.

## Answer

Resolved 2026-08-07, on the inventory from `04` plus one check run for this ticket.

**Ruling: one portal-agnostic shared pass, run once. Admin Phase B is not re-scoped.**

### Why the shared pass is right

`04` established that **0 of the 12 employer/seeker components inherit their states from a
shared data component** — there is no `AdminTable` equivalent to fix nine times. The shared
surface on those portals is *layout and primitives*, not screens. So:

- **The screen work cannot be shared, because it never was.** Each of the 12 hand-rolls, so
  each must be visited. A "per-portal pass" and "the only possible pass" are the same thing
  for screens.
- **The primitive work must not be repeated.** Doing it per portal would put `Button`,
  `Input`, `Card`, `Skeleton` and `ErrorState` in front of a reviewer up to three times.

This is not theory — the leverage showed up three times in one session. `ProtectedRoute` fixed
once reached **24 routes across all three portals**. `TableSkeleton`'s live region reached every
table. The §1.4 ruling reached **six** worker-facing surfaces spanning marketing routes, the
portal and onboarding. Every one of those was a single edit in a shared file.

### Why admin Phase B stays as it is

Checked rather than assumed. Every component left on the Phase B list is consumed **only** by
`pages/admin/*` or `components/admin/*`:

| Component | Consumers |
|---|---|
| `KpiCard` | DailyBriefing, AdminRevenue, PlacementPipeline |
| `AdminPageHeader` | 11 admin screens |
| `DrawerShell` | ProfileDrawer, 3 admin lead screens |
| `tremor/Card` | KpiCard, AdminTable, 3 admin pages |
| `tremor/AreaChart`, `BarChart` | DailyBriefing, AdminAnalytics |

Nothing to gain by re-scoping mid-stream, and a real cost to churning a phase already in
flight with `AdminTable` closed.

### The order

1. **Finish admin Phase B** on the admin-only components above. Unchanged.
2. **The shared pass** — portal-agnostic, once, before either screen leg.
3. **Per-portal screen passes** — employer, then seeker.

### The shared surface, for whoever runs step 2

| Component | Spans | State |
|---|---|---|
| `ProtectedRoute` | all 3 | ✅ `606af9e` |
| `Skeleton` | all 3 | ⚠️ Table/Route/Section announce; **`DetailSkeleton` + `PanelSkeleton` still silent** |
| `MatchBand` / `MatchCircle` / `MatchBreakdown` | worker + employer | ✅ `0aba6b7` |
| `ErrorState` | employer + seeker | ❌ — the best state primitive in the codebase; use it as the model |
| `DashboardLayout` → `Nav`, `Sidebar` | employer + seeker | ❌ |
| `Button`, `Input`, `Tag`, `Pagination`, `Checkbox` | all 3 | ❌ |
| `ApplicationCard`, `VerificationBadge`, `StepIndicator`, `ProgressBar`, `LivePreviewSidebar` | employer + seeker | ❌ |

**Finding for that pass:** there are **two `Card` components** — `@/components/tremor/Card`
(admin) and `@/components/ui/Card` (employer/seeker). Two implementations of the most basic
container in the product, one per world. Whether that is deliberate or drift is a question for
the shared pass; `04`'s answer to "what is shared" is what surfaced it.
