# Which canon governs the session-branching public routes?

Type: grilling
Status: open

## Question

Surfaced by [the surface inventory](04-employer-seeker-surface-inventory.md). It breaks the
brief's scoping rule, so it needs ruling before either the seeker leg or `03` can proceed.

`src/pages/jobs/JobDetail.tsx` is **1,057 lines** and is two things at once:

- **A public route.** `/jobs/:id` carries no `ProtectedRoute`. The v13 port treated `/jobs` and
  `/jobs/:id` as public surfaces under `docs/design/v11-DIRECTIVE.md`. `CLAUDE.md` §10 says a
  design finding on that world is **discarded, not filed**, and that it is settled.
- **Session-dependent, role-branching product UI.** It reads `useAuth` and forks three ways —
  `isVisitor`, `isSeeker`, employer (`:419-420`, `:274`, `:395`) — fetches per-seeker match
  data, and renders a fabricated `VISITOR_TEASER_SCORE` to visitors (`:900`, `:910`). By
  `docs/DESIGN.md` §5 that makes it a component that "fetches, submits, or depends on a
  session", so all four required states apply and it is in this gate's scope.

The brief says **scope by route, not path**. That rule cannot settle this, because the same
route is both. `/jobs` (`SearchJobs`) has the same dual nature in milder form.

Decide:

- **Does the gate cover `JobDetail` and `SearchJobs`?** All of them, only their signed-in
  branches, or neither?
- **Which canon renders them** — `v11-DIRECTIVE.md` (cream, Archivo/Bricolage) or
  `docs/DESIGN.md` (near-white, Inter)? Today the answer is the marketing one, and a signed-in
  seeker crosses from portal chrome into marketing chrome mid-journey without a boundary.
- **Does §10 need amending?** As written it licenses discarding a legitimate states or
  authorisation finding on a route that is functionally product UI. Compare the ruling in `08`,
  where accessibility was made explicitly exempt from the canon split for the same reason.

**Coupled to [03](03-match-score-display.md)** — the match-score ruling cannot land without
this, because the component it governs lives on exactly this boundary. Rule this first, or rule
them together.
