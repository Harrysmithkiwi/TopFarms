# Which canon governs the session-branching public routes?

Type: grilling
Status: resolved

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

## Answer

Resolved 2026-08-07. **The ticket assumed the two canons compete for territory. They do not —
they operate on different axes, and reading `v11-DIRECTIVE` §1 closely settles it.**

`v11-DIRECTIVE` §1 is a *decision record*, not a marketing stylesheet. Most of it is
marketing-page visual decisions. Three entries are **product principles that describe the
portals**:

- **§1.3** — "The scoring mechanic is underplayed **here** and prominent **in the portal**…
  That split is intentional." It explicitly contemplates portal behaviour.
- **§1.4** — "**Employers see numeric match scores.** The worker-facing profile panel shows a
  word, **Strong**, against a named job. It never shows the worker a score for themselves."
  This names an employer view and a worker-facing panel. Neither is the landing page.
- **§1.5** — "Every applicant stays on the list, ordered by fit. You decide who to ring." A
  statement about what the product does, load-bearing enough that the directive says it must
  survive any future copy cut.

### Ruling

**Canon splits by dimension, not only by route.**

| Dimension | Authority |
|---|---|
| Visual language, gated portals | `docs/DESIGN.md` |
| Visual language, public marketing | `docs/design/v11-DIRECTIVE.md` — settled, out of scope |
| Accessibility | Both. Filed wherever found (ruled in `08`) |
| States and authorisation | Both. Anything that fetches, submits or depends on a session |
| Product principles `§1.3`/`§1.4`/`§1.5` | Both. They describe the product, not a page |

**`/jobs` and `/jobs/:id` are in the gate** for states, authorisation, accessibility and
product-principle compliance. Their **visual** treatment stays under the marketing canon and
out of scope — the v13 port settled it and this ruling does not reopen it.

`CLAUDE.md` §10 amended: "a design finding" → "a **visual** finding", plus the dimension list
and the reason it exists. This is the same carve-out shape as `08`'s accessibility ruling.

### The structural fact that made this obvious

`MatchCircle` and `MatchBreakdown` are **shared between worker-facing and employer-facing
surfaces**. §1.4 permits the number for one audience and forbids it for the other, on the same
component. No route-based rule can express that — which is the clearest possible evidence that
route was the wrong axis.

### Consequence for `03`

`03`'s premise — "nothing arbitrates it" — is **false**. §1.4 arbitrates it explicitly and has
been committed canon since v11. `03` is therefore not "should workers see a number"; it is
"the code violates a standing decision, what exactly replaces the number, and what does a
visitor see". Recorded on that ticket.
