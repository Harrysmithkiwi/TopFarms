# What does the automated gate actually fail the build on?

Type: grilling
Status: open
Blocked by: 01

## Question

Phase D of the brief: add `detect.mjs` to CI over the admin tree, exit 2 fails the build. The
shape needs deciding before it is wired, because a gate that fails on noise gets routed
around — and this repo has the precedent (`npm run lint` sat red on `main` with CI running
it, which is why the lint pin had to be ratcheted).

Decide:
- **Scope.** Admin only, all gated portals, or all of `src/` minus the marketing paths? The
  marketing surface has a different canon, so it must be excluded — by path, and that path
  list has to be maintained.
- **Blocking or advisory.** Exit 2 fails the build, or reports and passes? Note every current
  finding is severity `advisory`.
- **A ratchet, or zero.** The lint gate is pinned at its true count and ratchets down. The
  detector currently has **27** findings on the admin tree. Pin at 27 and ratchet, or drive to
  0 first and fail on any?
- **Honesty in the CI output.** The brief requires noting that this catches mechanical slop
  only and does not replace critique. Where does that note live so it is actually read?

Blocked by `01`: the KPI numeral ruling changes the surviving finding count, and pinning a
number before that ruling pins the wrong one.
