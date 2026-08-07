# Put the a11y gate's credentials in CI

Type: task
Status: open

## Question

Graduated from [08](08-is-wcag-part-of-the-gate.md), which ruled that closing the coverage hole
is in scope. Mostly mechanical, but it needs two operator decisions before the mechanical part
can run — which is why it is a ticket and not a footnote.

**The state.** `.github/workflows/ci.yml` and `e2e-preview.yml` both already wire six `E2E_*`
secrets into the Playwright step. `gh secret list` returns only `SUPABASE_ACCESS_TOKEN` and
`SUPABASE_DB_PASSWORD`. So every role-gated spec — a11y, admin-gate, error-states,
saved-search, seeker-browse-jobs — calls `test.skip` in CI, and the suite has been reporting
green over work it never exercised. The admin a11y sweep added in `08` inherits this: it passes
locally and will skip in CI until this is closed.

**Decision 1 — which accounts.** Three UAT accounts are flagged for purging on the launch
readiness list. Enshrining those in CI and then deleting them gives a suite that skips again
without anyone noticing. Are the CI accounts the existing UAT ones, or purpose-made permanent
test accounts that survive the purge?

**Decision 2 — the employer pair does not exist.** `.env` holds `E2E_ADMIN_*` and
`E2E_SEEKER_*` only. There is no employer credential anywhere, which is why the employer
applicant-dashboard a11y test has never run in any environment, local included. An employer
test account has to be created before four of the six secrets become six.

**Then the mechanical part** (agent can drive, once the two decisions land):

```
gh secret set E2E_ADMIN_EMAIL     --body '<...>'
gh secret set E2E_ADMIN_PASSWORD  --body '<...>'
gh secret set E2E_SEEKER_EMAIL    --body '<...>'
gh secret set E2E_SEEKER_PASSWORD --body '<...>'
gh secret set E2E_EMPLOYER_EMAIL    --body '<...>'   # account must exist first
gh secret set E2E_EMPLOYER_PASSWORD --body '<...>'
```

`CLAUDE.md` §6 applies: confirm `gh repo set-default --view` first. Without a default set,
`gh secret set` without `--repo` lands nowhere silently — that exact failure has already cost
this project three rotation cycles.

**Done when** a CI run shows the role-gated a11y tests executing rather than skipping. A green
run that still skips them has not closed this ticket — that is the false green the whole ticket
exists to remove.
