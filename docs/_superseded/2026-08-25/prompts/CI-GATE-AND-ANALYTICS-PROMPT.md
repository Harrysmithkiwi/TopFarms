# CI Gate + Measurement — the two convergent pre-launch items

**Mission.** The pre-launch audit and the GTM roadmap converge on the same two items. Close both:
(1) green CI on `main` + branch protection, (2) product analytics (pageviews + funnel events).
Plan → execute → verify. Two atomic PRs, one workstream each.

## Diagnosed state (2026-07-29 — don't re-discover)
- `feat/admin-portal-v2` **is merged**; prod is current. The 2026-07-29 handoff doc is stale on this.
- On `main`, the CI workflow's **`e2e` job is GREEN**; only `quality` fails, at the **Lint** step.
- Lint: 45 errors / 46 warnings (`--max-warnings 41`). Errors by rule: 28 `@typescript-eslint/no-explicit-any`,
  13 `react-refresh/only-export-components`, 2 `react-hooks/set-state-in-effect`, 1 `no-unused-vars`,
  1 `no-empty-object-type`.
- 3 red vitest tests (lint fails first in CI, so these are the next wall):
  1. `tests/landing-page.test.tsx` — `getByText('Example')` now matches multiple badges (hero has
     several Example chips). The guard's intent (demo data labelled Example) is MET — update to
     `getAllByText` + non-empty assertion.
  2. `tests/search-preview.test.tsx` — asserts copy "40% more applications", a **fabricated stat the
     truth-pass removed**. Current copy is the accommodation tip. Update the assertion to current copy;
     the test now guards the right thing.
  3. `tests/admin-staging-source-filter.test.ts` — drift-guard reads migration 054's RPC (4 sources) but
     live is 061/062 (5, incl. `manual_paste`). Point it at the latest migration defining the RPC.
- Zero analytics anywhere (no Vercel Analytics/GA/PostHog; `/admin/analytics` is first-party DB only).

## PR 1 — green the `quality` job
1. Fix the 3 tests as above (each preserves the test's original intent).
2. Fix the 4 small lint errors (2 set-state-in-effect, unused var, empty-object-type).
3. **Ratchet, don't boil the ocean**: demote `no-explicit-any` and `react-refresh/only-export-components`
   to `warn` in the ESLint config (both are warn-by-default in standard configs), then pin
   `--max-warnings` to the EXACT new total. Pre-existing debt stays visible as the ratchet backlog —
   the repo's own stated convention ("warnings are the ratchet backlog") — and any NEW violation fails CI.
4. Gate locally: `tsc -b` && `npx vitest run` && `npm run lint` && `npm run build`. PR, merge, confirm
   the CI run on `main` goes green.

## Then — branch protection on `main` (sequence from `.planning/gtm/eng-issues-to-create.md`; CI green FIRST)
- `gh api -X PUT repos/{owner}/{repo}/branches/main/protection` with:
  required status checks = `quality` + `e2e` (strict), required_pull_request_reviews (1),
  `enforce_admins: false` — the operator is solo, so admin (`gh pr merge --admin`) can still merge
  own PRs; the gate stops unreviewed/red merges by default without hard-blocking a solo founder.
- Verify: GET the protection endpoint; confirm it no longer 404s and lists both checks.

## PR 2 — measurement (audit dim 17 / GTM H0.1)
1. `npm i @vercel/analytics`; mount `<Analytics />` once at the app root.
2. `track()` at exactly the 5 funnel points, no more: `signup_start` {role}, `signup_complete` {role},
   `job_view` {jobId}, `apply_submit` {jobId}, `job_publish`. No PII in event props.
3. **Caveat to verify, not assume:** custom events require Vercel Pro — on Hobby they're silently
   dropped (pageviews still work). Check the plan; if Hobby, pageview funnels (route-level) are the
   launch baseline and the `track()` calls are pre-wired for the upgrade.
4. Gate + PR + merge. Verify live: `/_vercel/insights/script.js` loads on www.topfarms.co.nz and
   events appear in the Vercel dashboard (or pageviews, per plan).

## House rules
Atomic commits, one workstream per PR. Diagnose before fix — show diffs. `tsc -b` gate. No
history-rewriting. No fabricated stats — the search-preview fix REMOVES a fabricated-stat assertion,
never reintroduce one.

## Definition of done
CI green on `main` (evidence: run URL) → protection enabled (evidence: API response) → analytics live
(evidence: script loads + event/pageview visible). Scorecard, not a promise.
