# What does the automated gate actually fail the build on?

Type: grilling
Status: resolved
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

## Answer

Resolved 2026-08-07. **The briefed approach could not work, and finding that out is most of
the answer.**

### The blocker

Phase D says "add `detect.mjs` to CI". `detect.mjs` ships inside the impeccable **plugin**, in
`~/.claude/plugins/cache/`. It is not a repo dependency, and the vendored copy was deliberately
deleted in `5fe3de8` to stop two versions loading at once. **CI has no plugin, so there is
nothing to run.** Wiring it would have required either re-vendoring the copy that was just
removed, or installing a personal plugin in CI where its version drifts silently.

### Ruling: a small repo-owned gate, scoped to what is actually enforceable

`scripts/design-gate.mjs`, ~90 lines, no dependencies. Checks two things and says so out loud:

1. **Arbitrary font-size literals** — `text-[19px]`, `fontSize: '19px'` — against the ramp.
2. **Hex colour literals** against the palette.

**Source of truth is `src/index.css`, not `docs/DESIGN.md`.** Canon already says the stylesheet
wins on any hex, and it has now been right **three** times — the doc's YAML declared 5 type
steps against the prose's 8; it omitted `--text-micro` and `--text-label` entirely; and its
palette **still publishes `text-subtle: #8A968D`**, the value that failed contrast at 3.08:1
and was replaced by `#647268`. A gate reading the doc would have enforced a WCAG failure.

### The decisions the ticket asked for

| Question | Ruling |
|---|---|
| **Scope** | Gated portals only. Marketing excluded by path — `10` makes visual findings there discarded, and they were **28 of 118**, i.e. 24% noise by policy on day one. `src/index.css` excluded: it cannot violate itself. |
| **Blocking or advisory** | **Blocking.** Exit 2 fails the build. |
| **Ratchet or zero** | **Ratchet, pinned at the true count of 17.** Same discipline as the lint pin the operator already accepted. Down only, never up. |
| **Honesty in CI** | A comment block in `ci.yml` states what the gate does not cover, so a green run is never mistaken for coverage. |

### Two exemption classes, both narrow and named

- **Third-party brand marks** — Google's four and Facebook's blue on the OAuth buttons. You
  cannot recolour someone else's logo; pinning them as debt would be a lie. 10 findings.
- **Comment lines.** The first run flagged `#d1d5db` twice — inside the comments recording the
  value a fix had just replaced. A gate that charges you a finding for documenting a change
  teaches people to stop documenting.

29 → 17 once both were handled. Neither is a blanket suppression: anything off those two lists
is still a finding.

### What it deliberately does not do

- **Tailwind size utilities are invisible to it.** `text-sm` is 14px and off-ramp. That group is
  ~49 findings and is an **open ruling** — pinning before it lands would pin the wrong number,
  which is precisely the mistake Gate A already caught once.
- **No judgement.** Hierarchy, states, copy, whether an empty state reads as good news — none of
  it. That is the critique's job and the CI comment says so.

### Verified

Green at the pin (exit 0). Introduced a deliberate `text-[19px]` regression: **exit 2**, the
offending file and line named, message telling the reader to ratchet down and never up. Removed
it: green again. `tsc -b` 0, vitest 640, lint 0 errors / 54 warnings.

Not yet observed in a real CI run — this branch is unpushed.
