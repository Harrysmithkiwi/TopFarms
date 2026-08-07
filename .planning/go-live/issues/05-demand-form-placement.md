# Where does the training-demand form live?

Type: grilling
Status: open

## Question

The form itself is built (branch `feat/training-demand-form`): schema, RLS, admin summary
RPC, component with the four §5 states, tests. **Not wired into any user-facing flow** — the
brief requires operator sign-off on placement first, because a form in the wrong place costs
completions on the funnels that matter for launch.

Options, with the recommendation first:

- **A (recommended): dismissible card on both dashboards.** Seeker dashboard below the
  profile-strength card; employer dashboard below the KPI row. Post-signup surfaces, zero
  interference with browse/apply/post flows, natural "for yourself" vs "for your staff"
  split by portal. Dismiss persists per device.
- **B: profile/settings section.** Zero interruption, but discovery ≈ 0 — likely too quiet
  to validate demand.
- **C: post-action moment** (after an application submits / a job posts). Highest attention,
  but it taxes the two funnels launch depends on. Not recommended for launch week.

Also to confirm: does it ship inside launch week at all, or the week after? It is separable
by construction (own branch, own migration, no coupling) — nothing about go-live changes
either way.
