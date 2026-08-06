# One shared-component gate pass, or one per portal?

Type: grilling
Status: open
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
