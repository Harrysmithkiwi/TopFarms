# Where does the training-demand form live?

Type: grilling
Status: resolved

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

## Answer

Operator ruled 2026-08-07: **Option A.** Wired same day.

- `SeekerDashboard.tsx` — between the header and the profile card (the exact spot the
  approval screenshot showed), `role="seeker"`, `context="seeker-dashboard"`.
- `EmployerDashboard.tsx` — below the Quick Stats row, above Job Listings,
  `role="employer"`, `context="employer-dashboard"`. Both sit in the onboarding-complete
  branch, so a user mid-onboarding never sees them.

Proven live before commit, not assumed: a real browser session on the wired seeker dashboard
clicked two chips, submitted, and the thanks state rendered; the prod row was then read back
carrying exactly those two skills **resolved to names via the taxonomy join** (the
partner-signal query working on its first datum), then purged so the dataset starts empty.
The employer variant is unit-tested (toggle defaults to staff) and code-identical in mount;
it has no visual pass yet because no onboarded employer account exists — noted, not hidden.

Ships inside launch week as S1, still incapable of blocking go-live: if the merge train
stalls, this branch simply waits.
